alter table public.helpdesk_tickets
    add column branch_or_location text,
    add column submitter_name text,
    add column submitter_role text,
    add column submitter_phone text,
    add column sla_due_hours integer;

alter table public.dispatch_shipments
    add column branch jsonb,
    add column linked_doc jsonb,
    add column total_items integer default 0,
    add column items jsonb default '[]'::jsonb;
