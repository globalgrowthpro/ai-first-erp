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
  | "billing";

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

export function useHelpdeskStore() {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('helpdesk_tickets')
      .select(`
        *,
        helpdesk_ticket_responses (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching helpdesk tickets:", error);
      setLoading(false);
      return;
    }

    if (data) {
      const mapped: HelpdeskTicket[] = data.map((row: any) => ({
        id: row.id,
        ticketNumber: row.ticket_number,
        title: row.title,
        description: row.description,
        category: row.category,
        priority: row.priority,
        status: row.status,
        branchOrLocation: row.branch_or_location || "",
        submitterName: row.submitter_name || "",
        submitterRole: row.submitter_role || "",
        submitterPhone: row.submitter_phone || "",
        assignedTo: row.assigned_to || "",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        slaDueHours: row.sla_due_hours || 24,
        resolutionNotes: row.resolution_notes || "",
        responses: (row.helpdesk_ticket_responses || []).map((resp: any) => ({
          id: resp.id,
          sender: resp.author_id || "User",
          senderRole: "Role", // In real app, join with profiles
          message: resp.message,
          timestamp: resp.created_at,
          isInternal: resp.is_internal
        }))
      }));
      setTickets(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const addTicket = useCallback(async (ticket: Omit<HelpdeskTicket, "id" | "ticketNumber" | "createdAt" | "updatedAt" | "responses">) => {
    const tempTicketNumber = `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Optimistic UI update
    const newTicket: HelpdeskTicket = {
      ...ticket,
      id: `temp-${Date.now()}`,
      ticketNumber: tempTicketNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [],
    };
    setTickets((prev) => [newTicket, ...prev]);

    // DB Insert
    await (supabase as any).from('helpdesk_tickets').insert({
      ticket_number: tempTicketNumber,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category as any,
      priority: ticket.priority as any,
      status: ticket.status as any,
      branch_or_location: ticket.branchOrLocation,
      submitter_name: ticket.submitterName,
      submitter_role: ticket.submitterRole,
      submitter_phone: ticket.submitterPhone || null,
      sla_due_hours: ticket.slaDueHours
    });
    
    // Refresh to get actual DB ID
    fetchTickets();
    
    return newTicket;
  }, [fetchTickets]);

  const updateTicketStatus = useCallback(async (id: string, status: TicketStatus, resolutionNotes?: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              updatedAt: new Date().toISOString(),
              ...(resolutionNotes !== undefined ? { resolutionNotes } : {}),
            }
          : t
      )
    );

    const updateData: any = { status: status as any };
    if (resolutionNotes !== undefined) updateData.resolution_notes = resolutionNotes;
    
    await (supabase as any).from('helpdesk_tickets').update(updateData).eq('id', id);
  }, []);

  const assignTicket = useCallback(async (id: string, assignee: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              assignedTo: assignee,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
    
    // NOTE: assignee should be a UUID in DB, if it's just a name we might need a different column or logic
  }, []);

  const addResponse = useCallback(async (ticketId: string, response: Omit<TicketResponse, "id" | "timestamp">) => {
    const newResponse: TicketResponse = {
      ...response,
      id: `temp-resp-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              updatedAt: new Date().toISOString(),
              responses: [...t.responses, newResponse],
            }
          : t
      )
    );

    await (supabase as any).from('helpdesk_ticket_responses').insert({
      ticket_id: ticketId,
      message: response.message,
      is_internal: response.isInternal || false,
    });
    
    fetchTickets();
  }, [fetchTickets]);

  const deleteTicket = useCallback(async (id: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
    await (supabase as any).from('helpdesk_tickets').delete().eq('id', id);
  }, []);

  const resetToSeed = useCallback(() => {
    // Left empty for now, or implement a bulk delete
  }, []);

  return {
    tickets,
    loading,
    addTicket,
    updateTicketStatus,
    assignTicket,
    addResponse,
    deleteTicket,
    resetToSeed,
  };
}
