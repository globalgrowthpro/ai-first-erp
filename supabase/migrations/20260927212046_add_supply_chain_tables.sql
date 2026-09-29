-- Supply Chain Enums
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
create type public.order_status as enum ('draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
create type public.rfq_status as enum ('draft', 'published', 'closed', 'awarded', 'cancelled');

-- Quotations
create table public.quotations (
    id uuid default gen_random_uuid() primary key,
    quote_number varchar(50) not null unique,
    partner_id uuid references public.partners(id) on delete restrict not null,
    status public.quote_status not null default 'draft',
    valid_until date,
    subtotal numeric(15,2) not null default 0,
    tax_total numeric(15,2) not null default 0,
    total numeric(15,2) not null default 0,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.quotation_lines (
    id uuid default gen_random_uuid() primary key,
    quotation_id uuid references public.quotations(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete restrict not null,
    quantity numeric(10,2) not null,
    unit_price numeric(15,2) not null,
    tax_rate numeric(5,2) not null default 0,
    line_total numeric(15,2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sales Orders
create table public.sales_orders (
    id uuid default gen_random_uuid() primary key,
    order_number varchar(50) not null unique,
    quotation_id uuid references public.quotations(id) on delete set null,
    partner_id uuid references public.partners(id) on delete restrict not null,
    status public.order_status not null default 'draft',
    expected_delivery date,
    subtotal numeric(15,2) not null default 0,
    tax_total numeric(15,2) not null default 0,
    total numeric(15,2) not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.sales_order_lines (
    id uuid default gen_random_uuid() primary key,
    order_id uuid references public.sales_orders(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete restrict not null,
    quantity numeric(10,2) not null,
    unit_price numeric(15,2) not null,
    tax_rate numeric(5,2) not null default 0,
    line_total numeric(15,2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Purchase Orders
create table public.purchase_orders (
    id uuid default gen_random_uuid() primary key,
    order_number varchar(50) not null unique,
    partner_id uuid references public.partners(id) on delete restrict not null,
    status public.order_status not null default 'draft',
    expected_delivery date,
    subtotal numeric(15,2) not null default 0,
    tax_total numeric(15,2) not null default 0,
    total numeric(15,2) not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.purchase_order_lines (
    id uuid default gen_random_uuid() primary key,
    order_id uuid references public.purchase_orders(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete restrict not null,
    quantity numeric(10,2) not null,
    unit_price numeric(15,2) not null,
    tax_rate numeric(5,2) not null default 0,
    line_total numeric(15,2) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Request For Quotation (RFQ)
create table public.rfqs (
    id uuid default gen_random_uuid() primary key,
    rfq_number varchar(50) not null unique,
    status public.rfq_status not null default 'draft',
    deadline date not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Basic Policies
alter table public.quotations enable row level security;
alter table public.quotation_lines enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_lines enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.rfqs enable row level security;

-- We assign standard insert/update/delete/select policies for now, which will be tightened in step 8
DO $$
DECLARE
    t text;
    tables text[] := array['quotations', 'quotation_lines', 'sales_orders', 'sales_order_lines', 'purchase_orders', 'purchase_order_lines', 'rfqs'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('create policy "read for authenticated" on public.%I for select to authenticated using (true)', t);
        EXECUTE format('create policy "insert for authenticated" on public.%I for insert to authenticated with check (auth.uid() is not null)', t);
        EXECUTE format('create policy "update for authenticated" on public.%I for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)', t);
        EXECUTE format('create policy "delete for admin" on public.%I for delete to authenticated using (public.is_admin())', t);
    END LOOP;
END $$;

-- Enable Realtime for all tables in the public schema
DO $$
DECLARE
    rec record;
BEGIN
    -- Create the publication if it doesn't exist (Supabase already has it, but just in case)
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOR rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = rec.tablename
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', rec.tablename);
        END IF;
    END LOOP;
END $$;
