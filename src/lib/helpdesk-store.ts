import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TicketPriority = "urgent" | "high" | "medium" | "low";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketCategory =
  | "branch_pos"
  | "central_kitchen"
  | "inventory_supply"
  | "billing_accounting"
  | "system_bug"
  | "general_inquiry"
  | "bug"
  | "technical"
  | "billing"
  | (string & {});

export interface TicketResponse {
  id: string;
  sender: string;
  senderRole: string;
  message: string;
  timestamp: string;
  isInternal?: boolean;
}

export interface HelpdeskTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  branchOrLocation: string;
  submitterName: string;
  submitterRole: string;
  submitterPhone?: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  slaDueHours: number;
  responses: TicketResponse[];
  resolutionNotes?: string;
}

const STORAGE_KEY = "wazeer_helpdesk_tickets_v2";

function readCachedTickets(): HelpdeskTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("[Helpdesk Store] Failed to read cached tickets:", err);
  }
  return [];
}

function writeCachedTickets(tickets: HelpdeskTicket[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  } catch (err) {
    console.warn("[Helpdesk Store] Failed to write cached tickets:", err);
  }
}

// Map any app category to a valid PostgreSQL ticket_category enum
function mapToDbCategory(cat: string): string {
  const validDbEnums = ["technical", "billing", "feature_request", "general_inquiry", "bug"];
  if (validDbEnums.includes(cat)) return cat;
  if (cat.includes("billing") || cat.includes("accounting") || cat.includes("finance"))
    return "billing";
  if (cat.includes("bug") || cat.includes("error") || cat.includes("system")) return "bug";
  if (cat.includes("pos") || cat.includes("kitchen") || cat.includes("inventory"))
    return "technical";
  return "general_inquiry";
}

export function useHelpdeskStore() {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>(() => readCachedTickets());
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("helpdesk_tickets")
        .select(
          `
          *,
          helpdesk_ticket_responses (*)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("[Helpdesk Store] Supabase fetch warning:", error.message || error);
        // Retain cached tickets on fetch error
        setLoading(false);
        return;
      }

      if (data && Array.isArray(data)) {
        const mapped: HelpdeskTicket[] = data.map((row: any) => ({
          id: row.id,
          ticketNumber: row.ticket_number || `TKT-${row.id.slice(0, 8)}`,
          title: row.title,
          description: row.description || "",
          category: row.category,
          priority: row.priority || "low",
          status: row.status || "open",
          branchOrLocation: row.branch_or_location || "",
          submitterName: row.submitter_name || "",
          submitterRole: row.submitter_role || "",
          submitterPhone: row.submitter_phone || "",
          assignedTo: row.assigned_to || "",
          createdAt: row.created_at,
          updatedAt: row.updated_at || row.created_at,
          slaDueHours: row.sla_due_hours || 24,
          resolutionNotes: row.resolution_notes || "",
          responses: (row.helpdesk_ticket_responses || []).map((resp: any) => ({
            id: resp.id,
            sender: resp.sender_name || resp.author_id || "فريق الدعم",
            senderRole: resp.sender_role || "الدعم الفني",
            message: resp.message || "",
            timestamp: resp.created_at,
            isInternal: resp.is_internal || false,
          })),
        }));

        setTickets(mapped);
        writeCachedTickets(mapped);
      }
    } catch (err) {
      console.error("[Helpdesk Store] Unexpected fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const addTicket = useCallback(
    async (
      ticket: Omit<HelpdeskTicket, "id" | "ticketNumber" | "createdAt" | "updatedAt" | "responses">,
    ) => {
      const tempId = `temp-${Date.now()}`;
      const tempTicketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Optimistic UI & local storage update
      const newTicket: HelpdeskTicket = {
        ...ticket,
        id: tempId,
        ticketNumber: tempTicketNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        responses: [],
      };

      setTickets((prev) => {
        const next = [newTicket, ...prev.filter((t) => t.id !== tempId)];
        writeCachedTickets(next);
        return next;
      });

      // 2. Prepare payload for Supabase database
      const dbCategory = mapToDbCategory(ticket.category);

      let currentUserId: string | null = null;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id) {
          currentUserId = sessionData.session.user.id;
        }
      } catch (_) {}

      const payload: Record<string, any> = {
        ticket_number: tempTicketNumber,
        title: ticket.title,
        description: ticket.description,
        category: dbCategory,
        priority: ticket.priority,
        status: ticket.status,
        branch_or_location: ticket.branchOrLocation || "",
        submitter_name: ticket.submitterName || "",
        submitter_role: ticket.submitterRole || "",
        submitter_phone: ticket.submitterPhone || null,
        assigned_to: ticket.assignedTo || null,
        sla_due_hours: ticket.slaDueHours || 24,
      };

      if (currentUserId) {
        payload["created_by"] = currentUserId;
      }

      // 3. Database Insert
      try {
        const { data: inserted, error } = await (supabase as any)
          .from("helpdesk_tickets")
          .insert(payload)
          .select()
          .maybeSingle();

        if (error) {
          console.warn("[Helpdesk Store] DB insert warning:", error.message || error);
        } else if (inserted?.id) {
          const persistedTicket: HelpdeskTicket = {
            ...newTicket,
            id: inserted.id,
            ticketNumber: inserted.ticket_number || tempTicketNumber,
            createdAt: inserted.created_at || newTicket.createdAt,
            updatedAt: inserted.updated_at || newTicket.updatedAt,
          };

          setTickets((prev) => {
            const next = prev.map((t) => (t.id === tempId ? persistedTicket : t));
            writeCachedTickets(next);
            return next;
          });
          return persistedTicket;
        }
      } catch (e) {
        console.warn("[Helpdesk Store] Failed to insert ticket into DB:", e);
      }

      return newTicket;
    },
    [],
  );

  const updateTicketStatus = useCallback(
    async (id: string, status: TicketStatus, resolutionNotes?: string) => {
      setTickets((prev) => {
        const next = prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                updatedAt: new Date().toISOString(),
                ...(resolutionNotes !== undefined ? { resolutionNotes } : {}),
              }
            : t,
        );
        writeCachedTickets(next);
        return next;
      });

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (resolutionNotes !== undefined) updateData.resolution_notes = resolutionNotes;

      try {
        const { error } = await (supabase as any)
          .from("helpdesk_tickets")
          .update(updateData)
          .eq("id", id);
        if (error) {
          console.warn("[Helpdesk Store] Update status warning:", error.message || error);
        }
      } catch (err) {
        console.warn("[Helpdesk Store] DB update error:", err);
      }
    },
    [],
  );

  const assignTicket = useCallback(async (id: string, assignee: string) => {
    setTickets((prev) => {
      const next = prev.map((t) =>
        t.id === id
          ? {
              ...t,
              assignedTo: assignee,
              updatedAt: new Date().toISOString(),
            }
          : t,
      );
      writeCachedTickets(next);
      return next;
    });

    try {
      const { error } = await (supabase as any)
        .from("helpdesk_tickets")
        .update({
          assigned_to: assignee,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.warn("[Helpdesk Store] Assignee update warning:", error.message || error);
      }
    } catch (err) {
      console.warn("[Helpdesk Store] DB assign error:", err);
    }
  }, []);

  const addResponse = useCallback(
    async (ticketId: string, response: Omit<TicketResponse, "id" | "timestamp">) => {
      const tempRespId = `temp-resp-${Date.now()}`;
      const newResponse: TicketResponse = {
        ...response,
        id: tempRespId,
        timestamp: new Date().toISOString(),
      };

      setTickets((prev) => {
        const next = prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                updatedAt: new Date().toISOString(),
                responses: [...t.responses, newResponse],
              }
            : t,
        );
        writeCachedTickets(next);
        return next;
      });

      try {
        let currentAuthorId: string | null = null;
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user?.id) currentAuthorId = sessionData.session.user.id;
        } catch (_) {}

        const respPayload: Record<string, any> = {
          ticket_id: ticketId,
          message: response.message,
          is_internal: response.isInternal || false,
          sender_name: response.sender,
          sender_role: response.senderRole,
        };

        if (currentAuthorId) respPayload["author_id"] = currentAuthorId;

        const { data: insertedResp, error } = await (supabase as any)
          .from("helpdesk_ticket_responses")
          .insert(respPayload)
          .select()
          .maybeSingle();

        if (error) {
          console.warn("[Helpdesk Store] Add response warning:", error.message || error);
        } else if (insertedResp?.id) {
          setTickets((prev) => {
            const next = prev.map((t) =>
              t.id === ticketId
                ? {
                    ...t,
                    responses: t.responses.map((r) =>
                      r.id === tempRespId ? { ...r, id: insertedResp.id } : r,
                    ),
                  }
                : t,
            );
            writeCachedTickets(next);
            return next;
          });
        }
      } catch (err) {
        console.warn("[Helpdesk Store] Response insert error:", err);
      }
    },
    [],
  );

  const deleteTicket = useCallback(async (id: string) => {
    setTickets((prev) => {
      const next = prev.filter((t) => t.id !== id);
      writeCachedTickets(next);
      return next;
    });

    try {
      const { error } = await (supabase as any).from("helpdesk_tickets").delete().eq("id", id);
      if (error) {
        console.warn("[Helpdesk Store] Delete ticket warning:", error.message || error);
      }
    } catch (err) {
      console.warn("[Helpdesk Store] Delete ticket error:", err);
    }
  }, []);

  const resetToSeed = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    fetchTickets();
  }, [fetchTickets]);

  return {
    tickets,
    loading,
    addTicket,
    updateTicketStatus,
    assignTicket,
    addResponse,
    deleteTicket,
    resetToSeed,
    refreshTickets: fetchTickets,
  };
}
