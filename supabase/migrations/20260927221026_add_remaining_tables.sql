create table public.documents (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null default 'invoice',
  partner_id uuid references public.partners(id),
  date date default CURRENT_DATE,
  due_date date,
  amount numeric(15, 2) not null default 0,
  balance numeric(15, 2) not null default 0,
  status text not null default 'draft',
  notes text,
  items jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.gateway_settings (
  id uuid primary key default gen_random_uuid(),
  type text not null unique, -- 'sms' or 'smtp'
  settings jsonb not null default '{}'::jsonb,
  is_active boolean default true,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.documents enable row level security;
alter table public.gateway_settings enable row level security;

create policy "Enable all for authenticated users on documents" on public.documents for all using (auth.role() = 'authenticated');
create policy "Enable all for authenticated users on gateway_settings" on public.gateway_settings for all using (auth.role() = 'authenticated');
