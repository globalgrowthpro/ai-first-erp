import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveAuthUser } from "@/lib/auth-store";
import { toast } from "sonner";

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

export interface TicketAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
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
  attachments?: TicketAttachment[];
  resolutionNotes?: string;
}

const STORAGE_KEY = "wazeer_helpdesk_tickets_v2";

function readCachedTickets(): HelpdeskTicket[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = null as string | null;
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
    void ((tickets));
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

  // Helper to check user permission
  const checkPermission = useCallback((actionId: string): boolean => {
    const user = getActiveAuthUser();
    if (user.role === "admin" || user.helpdeskScope === "all_tickets") return true;
    const actions = user.allowedActions || [];
    if (actions.includes("*")) return true;
    return actions.includes(actionId);
  }, []);

  // Fetch tickets with database-query level scoping
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const user = getActiveAuthUser();
    const isAdmin = user.role === "admin" || user.helpdeskScope === "all_tickets";

    // Enforce VIEW permission: if user lacks helpdesk.view, return empty tickets
    const canView = checkPermission("helpdesk.view");
    if (!canView) {
      setTickets([]);
      setLoading(false);
      return;
    }

    try {
      // Build query at database level
      let query = (supabase as any)
        .from("helpdesk_tickets")
        .select(
          `
          *,
          helpdesk_ticket_responses (*)
        `
        )
        .order("created_at", { ascending: false });

      // Enforce Data Scope at the database query level
      if (!isAdmin) {
        const scope = user.helpdeskScope || "own_created_only";
        const userId = user.id;
        const userEmail = (user.email || "").trim().toLowerCase();
        const userName = user.name?.ar || user.name?.en || "";

        if (scope === "assigned_to_me_only") {
          // Technicians are NOT bound to a branch; they only see tickets assigned to them from ANY branch
          query = query.or(
            `assigned_to.eq.${userId},assigned_to.eq.${userEmail},assigned_to.ilike.%${userName}%`
          );
        } else if (scope === "own_created_only") {
          // Only tickets created by this user
          query = query.or(
            `created_by.eq.${userId},submitter_name.eq.${userName},submitter_name.ilike.%${userEmail}%`
          );
        } else if (scope === "branch_only") {
          // Bound strictly to a single branch
          const branch = user.helpdeskBranch || user.branchName?.ar || user.branchCode || "";
          if (branch) {
            query = query.ilike("branch_or_location", `%${branch}%`);
          } else {
            // Branch required but missing: enforce empty result
            setTickets([]);
            setLoading(false);
            return;
          }
        }
      }

      const { data, error } = await query;

      if (error) {
        console.warn("[Helpdesk Store] Supabase fetch warning:", error.message || error);
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
          attachments: Array.isArray(row.attachments) ? row.attachments : [],
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
  }, [checkPermission]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // 1. ADD TICKET (requires helpdesk.create)
  const addTicket = useCallback(
    async (
      ticket: Omit<HelpdeskTicket, "id" | "ticketNumber" | "createdAt" | "updatedAt" | "responses">
    ) => {
      if (!checkPermission("helpdesk.create")) {
        toast.error("ليس لديك صلاحية إنشاء تذاكر الدعم الفني (helpdesk.create)");
        return null;
      }

      const user = getActiveAuthUser();
      const tempId = `temp-${Date.now()}`;
      const tempTicketNumber = `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // If user is restricted to a branch, enforce branch at query/insert level
      const finalLocation =
        user.helpdeskScope === "branch_only" && user.helpdeskBranch
          ? user.helpdeskBranch
          : ticket.branchOrLocation || "";

      const finalSubmitter = ticket.submitterName || user.name?.ar || user.name?.en || "مستخدم النظام";

      // 1. Optimistic UI & local storage update
      const newTicket: HelpdeskTicket = {
        ...ticket,
        id: tempId,
        ticketNumber: tempTicketNumber,
        branchOrLocation: finalLocation,
        submitterName: finalSubmitter,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        responses: [],
        attachments: ticket.attachments || [],
      };

      setTickets((prev) => {
        const next = [newTicket, ...prev.filter((t) => t.id !== tempId)];
        writeCachedTickets(next);
        return next;
      });

      // 2. Prepare payload for Supabase database
      const dbCategory = mapToDbCategory(ticket.category);

      let currentUserId: string | null = user.id || null;
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
        branch_or_location: finalLocation,
        submitter_name: finalSubmitter,
        submitter_role: ticket.submitterRole || user.position?.ar || "موظف",
        submitter_phone: ticket.submitterPhone || null,
        assigned_to: ticket.assignedTo || null,
        sla_due_hours: ticket.slaDueHours || 24,
      };

      if (ticket.attachments && ticket.attachments.length > 0) {
        payload["attachments"] = ticket.attachments;
      }

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
    [checkPermission]
  );

  // 2. EDIT TICKET DETAILS (requires helpdesk.edit)
  const editTicket = useCallback(
    async (id: string, updates: Partial<HelpdeskTicket>) => {
      if (!checkPermission("helpdesk.edit")) {
        toast.error("ليس لديك صلاحية تعديل بيانات التذاكر (helpdesk.edit)");
        return false;
      }

      setTickets((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        );
        writeCachedTickets(next);
        return next;
      });

      try {
        const dbUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
        if (updates.category !== undefined) dbUpdates.category = mapToDbCategory(updates.category);
        if (updates.branchOrLocation !== undefined) dbUpdates.branch_or_location = updates.branchOrLocation;
        if (updates.slaDueHours !== undefined) dbUpdates.sla_due_hours = updates.slaDueHours;

        await (supabase as any).from("helpdesk_tickets").update(dbUpdates).eq("id", id);
        return true;
      } catch (err) {
        console.warn("[Helpdesk Store] DB edit error:", err);
        return false;
      }
    },
    [checkPermission]
  );

  // 3. UPDATE TICKET STATUS (Resolve requires helpdesk.resolve; Close requires helpdesk.close or admin)
  const updateTicketStatus = useCallback(
    async (id: string, status: TicketStatus, resolutionNotes?: string) => {
      const user = getActiveAuthUser();
      const isAdmin = user.role === "admin" || user.helpdeskScope === "all_tickets";

      if (status === "resolved" && !checkPermission("helpdesk.resolve")) {
        toast.error("ليس لديك صلاحية وضع التذكرة في حالة الحل (helpdesk.resolve)");
        return false;
      }

      if (status === "closed" && !isAdmin && !checkPermission("helpdesk.close")) {
        toast.error("ليس لديك صلاحية إغلاق التذاكر (helpdesk.close)");
        return false;
      }

      setTickets((prev) => {
        const next = prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                updatedAt: new Date().toISOString(),
                ...(resolutionNotes !== undefined ? { resolutionNotes } : {}),
              }
            : t
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
        return true;
      } catch (err) {
        console.warn("[Helpdesk Store] DB update error:", err);
        return false;
      }
    },
    [checkPermission]
  );

  // 4. ASSIGN TICKET (requires helpdesk.assign or admin; Admin can assign to anyone or self)
  const assignTicket = useCallback(
    async (id: string, assignee: string) => {
      const user = getActiveAuthUser();
      const isAdmin = user.role === "admin" || user.helpdeskScope === "all_tickets";

      if (!isAdmin && !checkPermission("helpdesk.assign")) {
        toast.error("ليس لديك صلاحية إسناد التذاكر (helpdesk.assign)");
        return false;
      }

      setTickets((prev) => {
        const next = prev.map((t) =>
          t.id === id
            ? {
                ...t,
                assignedTo: assignee,
                updatedAt: new Date().toISOString(),
              }
            : t
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
        return true;
      } catch (err) {
        console.warn("[Helpdesk Store] DB assign error:", err);
        return false;
      }
    },
    [checkPermission]
  );

  // 5. ADD RESPONSE / REPLY (requires helpdesk.reply)
  const addResponse = useCallback(
    async (ticketId: string, response: Omit<TicketResponse, "id" | "timestamp">) => {
      if (!checkPermission("helpdesk.reply")) {
        toast.error("ليس لديك صلاحية الرد على التذاكر (helpdesk.reply)");
        return false;
      }

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
            : t
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
                      r.id === tempRespId ? { ...r, id: insertedResp.id } : r
                    ),
                  }
                : t
            );
            writeCachedTickets(next);
            return next;
          });
        }
        return true;
      } catch (err) {
        console.warn("[Helpdesk Store] Response insert error:", err);
        return false;
      }
    },
    [checkPermission]
  );

  // 6. ADD ATTACHMENT (requires helpdesk.attachments)
  const addAttachment = useCallback(
    async (ticketId: string, attachment: Omit<TicketAttachment, "id" | "uploadedAt">) => {
      if (!checkPermission("helpdesk.attachments")) {
        toast.error("ليس لديك صلاحية رفع أو إدارة المرفقات (helpdesk.attachments)");
        return false;
      }

      const newAttachment: TicketAttachment = {
        ...attachment,
        id: `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        uploadedAt: new Date().toISOString(),
      };

      setTickets((prev) => {
        const next = prev.map((t) => {
          if (t.id === ticketId) {
            const currentAtts = t.attachments || [];
            return {
              ...t,
              attachments: [...currentAtts, newAttachment],
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        });
        writeCachedTickets(next);
        return next;
      });

      // Update in Supabase
      try {
        const targetTicket = tickets.find((t) => t.id === ticketId);
        const allAttachments = [...(targetTicket?.attachments || []), newAttachment];
        await (supabase as any)
          .from("helpdesk_tickets")
          .update({
            attachments: allAttachments,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticketId);
        return true;
      } catch (e) {
        console.warn("[Helpdesk Store] Failed to persist attachment to DB:", e);
        return true;
      }
    },
    [checkPermission, tickets]
  );

  // 7. DELETE TICKET (requires helpdesk.delete or admin)
  const deleteTicket = useCallback(
    async (id: string) => {
      const user = getActiveAuthUser();
      const isAdmin = user.role === "admin" || user.helpdeskScope === "all_tickets";

      if (!isAdmin && !checkPermission("helpdesk.delete")) {
        toast.error("ليس لديك صلاحية حذف التذاكر (helpdesk.delete)");
        return false;
      }

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
        return true;
      } catch (err) {
        console.warn("[Helpdesk Store] Delete ticket error:", err);
        return false;
      }
    },
    [checkPermission]
  );

  const resetToSeed = useCallback(() => {
    
    fetchTickets();
  }, [fetchTickets]);

  const activeUser = useMemo(() => getActiveAuthUser(), []);

  return {
    tickets,
    loading,
    addTicket,
    editTicket,
    updateTicketStatus,
    assignTicket,
    addResponse,
    addAttachment,
    deleteTicket,
    resetToSeed,
    refreshTickets: fetchTickets,
    checkPermission,
    userScope: activeUser.helpdeskScope || (activeUser.role === "admin" ? "all_tickets" : "own_created_only"),
    userBranch: activeUser.helpdeskBranch,
  };
}
