-- Advanced Inventory Enums
create type public.transfer_status as enum ('draft', 'pending', 'in_transit', 'received', 'cancelled');
create type public.lot_status as enum ('active', 'expired', 'quarantined');
create type public.serial_status as enum ('in_stock', 'sold', 'returned', 'defective');

-- Lots
create table public.lot_numbers (
    id uuid default gen_random_uuid() primary key,
    product_id uuid references public.products(id) on delete cascade not null,
    lot_number varchar(100) not null,
    expiry_date date,
    status public.lot_status not null default 'active',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(product_id, lot_number)
);

-- Serials
create table public.serial_numbers (
    id uuid default gen_random_uuid() primary key,
    product_id uuid references public.products(id) on delete cascade not null,
    serial_number varchar(100) not null unique,
    status public.serial_status not null default 'in_stock',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Warehouse Transfers
create table public.warehouse_transfers (
    id uuid default gen_random_uuid() primary key,
    transfer_number varchar(50) not null unique,
    from_warehouse_id uuid references public.warehouses(id) on delete restrict not null,
    to_warehouse_id uuid references public.warehouses(id) on delete restrict not null,
    status public.transfer_status not null default 'draft',
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    check (from_warehouse_id != to_warehouse_id)
);

create table public.warehouse_transfer_lines (
    id uuid default gen_random_uuid() primary key,
    transfer_id uuid references public.warehouse_transfers(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete restrict not null,
    quantity numeric(10,2) not null check (quantity > 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.lot_numbers enable row level security;
alter table public.serial_numbers enable row level security;
alter table public.warehouse_transfers enable row level security;
alter table public.warehouse_transfer_lines enable row level security;

DO $$
DECLARE
    t text;
    tables text[] := array['lot_numbers', 'serial_numbers', 'warehouse_transfers', 'warehouse_transfer_lines'];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('create policy "read for authenticated" on public.%I for select to authenticated using (true)', t);
        EXECUTE format('create policy "insert for authenticated" on public.%I for insert to authenticated with check (auth.uid() is not null)', t);
        EXECUTE format('create policy "update for authenticated" on public.%I for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)', t);
        EXECUTE format('create policy "delete for admin" on public.%I for delete to authenticated using (public.is_admin())', t);
    END LOOP;
END $$;

-- Enable Realtime
DO $$
DECLARE
    rec record;
BEGIN
    FOR rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('lot_numbers', 'serial_numbers', 'warehouse_transfers', 'warehouse_transfer_lines')
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
