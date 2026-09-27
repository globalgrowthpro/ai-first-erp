-- ============================================================
-- HAFEZ ERP — core schema
-- ============================================================

create type public.app_role as enum ('admin','cfo','kitchen','sales','warehouse','ai');
create type public.doc_status as enum ('draft','partial','paid','overdue','cancelled');
create type public.account_type as enum ('asset','liability','equity','revenue','expense');
create type public.partner_type as enum ('customer','supplier','both');
create type public.stock_move_type as enum ('in','out','transfer','adjustment');
create type public.work_order_status as enum ('planned','in_progress','quality_check','done','cancelled');
create type public.payment_direction as enum ('inbound','outbound');
create type public.leave_status as enum ('pending','approved','rejected');
create type public.ai_run_status as enum ('suggested','approved','rejected','executed');

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

-- ---------- identity ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name_ar text not null default '',
  full_name_en text not null default '',
  email text,
  phone text,
  department_id uuid,
  position_id uuid,
  avatar_url text,
  sidebar_visible boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(auth.uid(), 'admin') $$;

create table public.user_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_path text not null,
  created_at timestamptz not null default now(),
  unique (user_id, page_path)
);
grant select on public.user_pages to authenticated;
grant all on public.user_pages to service_role;
alter table public.user_pages enable row level security;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "admin insert profile" on public.profiles for insert to authenticated with check (id = auth.uid() or public.is_admin());
create policy "admin delete profile" on public.profiles for delete to authenticated using (public.is_admin());

create policy "roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "roles admin write" on public.user_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "pages read" on public.user_pages for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "pages admin write" on public.user_pages for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name_ar, full_name_en, email)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name_ar', ''),
          coalesce(new.raw_user_meta_data->>'full_name_en', ''),
          new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- company ----------
create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null default '',
  name_en text not null default '',
  logo_url text,
  tax_number text,
  commercial_register text,
  address_ar text,
  address_en text,
  phone text,
  email text,
  currency text not null default 'EGP',
  fiscal_year_start date not null default date_trunc('year', now())::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.company_settings to authenticated;
grant all on public.company_settings to service_role;
alter table public.company_settings enable row level security;
create policy "company read" on public.company_settings for select to authenticated using (true);
create policy "company admin write" on public.company_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.company_settings to authenticated;

-- ---------- org ----------
create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name_ar text not null,
  name_en text not null,
  manager_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.positions (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  title_ar text not null,
  title_en text not null,
  department_id uuid references public.departments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add constraint profiles_department_fk foreign key (department_id) references public.departments(id) on delete set null;
alter table public.profiles add constraint profiles_position_fk foreign key (position_id) references public.positions(id) on delete set null;

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  user_id uuid references auth.users(id) on delete set null,
  name_ar text not null,
  name_en text not null,
  national_id text,
  phone text,
  email text,
  department_id uuid references public.departments(id) on delete set null,
  position_id uuid references public.positions(id) on delete set null,
  hire_date date,
  base_salary numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  check_in time,
  check_out time,
  status text not null default 'present',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, work_date)
);
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type text not null default 'annual',
  start_date date not null,
  end_date date not null,
  status public.leave_status not null default 'pending',
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_dates_ck check (end_date >= start_date)
);
create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period_month date not null,
  total_gross numeric(14,2) not null default 0,
  total_deductions numeric(14,2) not null default 0,
  total_net numeric(14,2) not null default 0,
  is_posted boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_month)
);
create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  gross numeric(14,2) not null default 0,
  deductions numeric(14,2) not null default 0,
  net numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (payroll_run_id, employee_id)
);

-- ---------- partners ----------
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  type public.partner_type not null default 'customer',
  name_ar text not null,
  name_en text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  tax_number text,
  credit_limit numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- accounting ----------
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text not null,
  type public.account_type not null,
  parent_id uuid references public.accounts(id) on delete restrict,
  is_parent boolean not null default false,
  is_active boolean not null default true,
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_no text not null unique,
  entry_date date not null default current_date,
  description_ar text,
  description_en text,
  reference text,
  is_posted boolean not null default false,
  posted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  partner_id uuid references public.partners(id) on delete set null,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  memo text,
  line_no integer not null default 1,
  created_at timestamptz not null default now(),
  constraint journal_line_sides_ck check (debit >= 0 and credit >= 0 and (debit = 0 or credit = 0))
);
create index journal_lines_entry_idx on public.journal_lines(entry_id);
create index journal_lines_account_idx on public.journal_lines(account_id);

-- balanced-entry guard on posting
create or replace function public.enforce_balanced_entry()
returns trigger language plpgsql set search_path = public
as $$
declare d numeric; c numeric;
begin
  if new.is_posted and (old.is_posted is distinct from new.is_posted) then
    select coalesce(sum(debit),0), coalesce(sum(credit),0) into d, c
    from public.journal_lines where entry_id = new.id;
    if d <> c or d = 0 then
      raise exception 'Journal entry % is not balanced (debit % <> credit %)', new.entry_no, d, c;
    end if;
    new.posted_at = now();
  end if;
  return new;
end; $$;
create trigger journal_entries_balance_guard before update on public.journal_entries
for each row execute function public.enforce_balanced_entry();

create or replace function public.block_posted_line_changes()
returns trigger language plpgsql set search_path = public
as $$
declare posted boolean;
begin
  select is_posted into posted from public.journal_entries
  where id = coalesce(new.entry_id, old.entry_id);
  if posted then raise exception 'Cannot modify lines of a posted journal entry'; end if;
  return coalesce(new, old);
end; $$;
create trigger journal_lines_locked before insert or update or delete on public.journal_lines
for each row execute function public.block_posted_line_changes();

create or replace view public.trial_balance as
select a.id as account_id, a.code, a.name_ar, a.name_en, a.type,
       coalesce(sum(l.debit),0) as total_debit,
       coalesce(sum(l.credit),0) as total_credit,
       a.opening_balance + coalesce(sum(l.debit),0) - coalesce(sum(l.credit),0) as balance
from public.accounts a
left join public.journal_lines l on l.account_id = a.id
left join public.journal_entries e on e.id = l.entry_id and e.is_posted
group by a.id;
grant select on public.trial_balance to authenticated;

-- ---------- inventory ----------
create table public.units (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name_ar text not null,
  name_en text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name_ar text not null,
  name_en text not null,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name_ar text not null,
  name_en text not null,
  location text,
  manager_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name_ar text not null,
  name_en text not null,
  category_id uuid references public.categories(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  cost_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,
  reorder_level numeric(14,3) not null default 0,
  is_raw_material boolean not null default false,
  is_active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.stock_levels (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  unique (product_id, warehouse_id)
);
create table public.stock_moves (
  id uuid primary key default gen_random_uuid(),
  move_no text unique,
  move_type public.stock_move_type not null,
  product_id uuid not null references public.products(id) on delete restrict,
  from_warehouse_id uuid references public.warehouses(id) on delete set null,
  to_warehouse_id uuid references public.warehouses(id) on delete set null,
  quantity numeric(14,3) not null,
  unit_cost numeric(14,2) not null default 0,
  reference text,
  moved_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_move_qty_ck check (quantity > 0)
);
create index stock_moves_product_idx on public.stock_moves(product_id);

create or replace function public.apply_stock_move()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.from_warehouse_id is not null then
    insert into public.stock_levels (product_id, warehouse_id, quantity)
    values (new.product_id, new.from_warehouse_id, -new.quantity)
    on conflict (product_id, warehouse_id)
    do update set quantity = public.stock_levels.quantity - new.quantity, updated_at = now();
  end if;
  if new.to_warehouse_id is not null then
    insert into public.stock_levels (product_id, warehouse_id, quantity)
    values (new.product_id, new.to_warehouse_id, new.quantity)
    on conflict (product_id, warehouse_id)
    do update set quantity = public.stock_levels.quantity + new.quantity, updated_at = now();
  end if;
  return new;
end; $$;
create trigger stock_moves_apply after insert on public.stock_moves
for each row execute function public.apply_stock_move();

create table public.boms (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  product_id uuid not null references public.products(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  output_quantity numeric(14,3) not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.bom_lines (
  id uuid primary key default gen_random_uuid(),
  bom_id uuid not null references public.boms(id) on delete cascade,
  component_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null default 1,
  waste_percent numeric(6,3) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- manufacturing ----------
create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  product_id uuid not null references public.products(id) on delete restrict,
  bom_id uuid references public.boms(id) on delete set null,
  warehouse_id uuid references public.warehouses(id) on delete set null,
  quantity numeric(14,3) not null default 1,
  status public.work_order_status not null default 'planned',
  planned_date date,
  completed_at timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.work_order_stages (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  sequence integer not null default 1,
  is_done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- documents ----------
create table public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  partner_id uuid references public.partners(id) on delete set null,
  invoice_date date not null default current_date,
  due_date date,
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  status public.doc_status not null default 'draft',
  warehouse_id uuid references public.warehouses(id) on delete set null,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.sales_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text,
  quantity numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax_rate numeric(6,3) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create table public.purchase_bills (
  id uuid primary key default gen_random_uuid(),
  bill_no text not null unique,
  partner_id uuid references public.partners(id) on delete set null,
  bill_date date not null default current_date,
  due_date date,
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  status public.doc_status not null default 'draft',
  warehouse_id uuid references public.warehouses(id) on delete set null,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.purchase_bill_lines (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.purchase_bills(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  description text,
  quantity numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0,
  tax_rate numeric(6,3) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_no text not null unique,
  direction public.payment_direction not null,
  partner_id uuid references public.partners(id) on delete set null,
  sales_invoice_id uuid references public.sales_invoices(id) on delete set null,
  purchase_bill_id uuid references public.purchase_bills(id) on delete set null,
  amount numeric(14,2) not null,
  method text not null default 'cash',
  paid_at date not null default current_date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint payment_amount_ck check (amount > 0)
);

-- payment settles document balance
create or replace function public.apply_payment()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.sales_invoice_id is not null then
    update public.sales_invoices
    set balance = greatest(balance - new.amount, 0),
        status = case when balance - new.amount <= 0 then 'paid'::public.doc_status else 'partial'::public.doc_status end,
        updated_at = now()
    where id = new.sales_invoice_id;
  end if;
  if new.purchase_bill_id is not null then
    update public.purchase_bills
    set balance = greatest(balance - new.amount, 0),
        status = case when balance - new.amount <= 0 then 'paid'::public.doc_status else 'partial'::public.doc_status end,
        updated_at = now()
    where id = new.purchase_bill_id;
  end if;
  return new;
end; $$;
create trigger payments_apply after insert on public.payments
for each row execute function public.apply_payment();

-- document line totals roll up to header
create or replace function public.recalc_sales_invoice()
returns trigger language plpgsql set search_path = public
as $$
declare inv uuid; s numeric; t numeric;
begin
  inv := coalesce(new.invoice_id, old.invoice_id);
  select coalesce(sum(quantity*unit_price - discount),0),
         coalesce(sum((quantity*unit_price - discount) * tax_rate/100),0)
  into s, t from public.sales_invoice_lines where invoice_id = inv;
  update public.sales_invoices
  set subtotal = s, tax_amount = t, total = s + t,
      balance = case when status = 'paid' then 0 else s + t end, updated_at = now()
  where id = inv;
  return coalesce(new, old);
end; $$;
create trigger sales_lines_recalc after insert or update or delete on public.sales_invoice_lines
for each row execute function public.recalc_sales_invoice();

create or replace function public.recalc_purchase_bill()
returns trigger language plpgsql set search_path = public
as $$
declare b uuid; s numeric; t numeric;
begin
  b := coalesce(new.bill_id, old.bill_id);
  select coalesce(sum(quantity*unit_price - discount),0),
         coalesce(sum((quantity*unit_price - discount) * tax_rate/100),0)
  into s, t from public.purchase_bill_lines where bill_id = b;
  update public.purchase_bills
  set subtotal = s, tax_amount = t, total = s + t,
      balance = case when status = 'paid' then 0 else s + t end, updated_at = now()
  where id = b;
  return coalesce(new, old);
end; $$;
create trigger purchase_lines_recalc after insert or update or delete on public.purchase_bill_lines
for each row execute function public.recalc_purchase_bill();

-- ---------- AI layer ----------
create table public.ai_modules (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  scope text not null default 'general',
  is_enabled boolean not null default true,
  requires_approval boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.ai_modules(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  prompt text not null,
  suggestion jsonb,
  status public.ai_run_status not null default 'suggested',
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  action text not null,
  entity text not null,
  entity_id text,
  source text not null default 'user',
  payload jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log(created_at desc);
grant select, insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit read" on public.audit_log for select to authenticated using (true);
create policy "audit append" on public.audit_log for insert to authenticated with check (true);

-- ---------- shared grants / RLS / triggers for operational tables ----------
do $$
declare t text;
  tbls text[] := array[
    'departments','positions','employees','attendance','leave_requests','payroll_runs','payslips',
    'partners','accounts','journal_entries','journal_lines','units','categories','warehouses',
    'products','stock_levels','stock_moves','boms','bom_lines','work_orders','work_order_stages',
    'sales_invoices','sales_invoice_lines','purchase_bills','purchase_bill_lines','payments',
    'ai_modules','ai_runs'
  ];
begin
  foreach t in array tbls loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "read for authenticated" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "insert for authenticated" on public.%I for insert to authenticated with check (auth.uid() is not null)', t);
    execute format('create policy "update for authenticated" on public.%I for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)', t);
    execute format('create policy "delete for admin" on public.%I for delete to authenticated using (public.is_admin())', t);
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name=t and column_name='updated_at') then
      execute format('create trigger set_updated_at before update on public.%I for each row execute function public.update_updated_at_column()', t);
    end if;
  end loop;
end $$;

create trigger set_updated_at before update on public.profiles
for each row execute function public.update_updated_at_column();
create trigger set_updated_at_company before update on public.company_settings
for each row execute function public.update_updated_at_column();