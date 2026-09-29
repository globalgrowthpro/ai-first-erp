-- Helpdesk Types
create type public.ticket_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type public.ticket_category as enum ('technical', 'billing', 'feature_request', 'general_inquiry', 'bug');

-- Tickets Table
create table public.helpdesk_tickets (
    id uuid default gen_random_uuid() primary key,
    ticket_number varchar(20) not null unique,
    title text not null,
    description text not null,
    category public.ticket_category not null default 'general_inquiry',
    priority public.ticket_priority not null default 'low',
    status public.ticket_status not null default 'open',
    created_by uuid references public.profiles(id) on delete set null,
    assigned_to uuid references public.profiles(id) on delete set null,
    resolution_notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ticket Responses Table
create table public.helpdesk_ticket_responses (
    id uuid default gen_random_uuid() primary key,
    ticket_id uuid references public.helpdesk_tickets(id) on delete cascade not null,
    author_id uuid references public.profiles(id) on delete set null,
    message text not null,
    is_internal boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Enable
alter table public.helpdesk_tickets enable row level security;
alter table public.helpdesk_ticket_responses enable row level security;

-- Temporary Policies (using the pattern in this project so far)
create policy "read for authenticated" on public.helpdesk_tickets for select to authenticated using (true);
create policy "insert for authenticated" on public.helpdesk_tickets for insert to authenticated with check (auth.uid() is not null);
create policy "update for authenticated" on public.helpdesk_tickets for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "delete for admin" on public.helpdesk_tickets for delete to authenticated using (public.is_admin());

create policy "read for authenticated" on public.helpdesk_ticket_responses for select to authenticated using (true);
create policy "insert for authenticated" on public.helpdesk_ticket_responses for insert to authenticated with check (auth.uid() is not null);
create policy "update for authenticated" on public.helpdesk_ticket_responses for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "delete for admin" on public.helpdesk_ticket_responses for delete to authenticated using (public.is_admin());
