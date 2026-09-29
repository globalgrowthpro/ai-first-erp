-- Dispatch Types
create type public.vehicle_status as enum ('available', 'maintenance', 'in_transit', 'out_of_service');
create type public.driver_status as enum ('available', 'on_leave', 'in_transit');
create type public.shipment_status as enum ('pending', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled', 'delayed');

-- Vehicles Table
create table public.dispatch_vehicles (
    id uuid default gen_random_uuid() primary key,
    plate_number varchar(20) not null unique,
    make_model varchar(100),
    vehicle_type varchar(50) not null,
    capacity_kg numeric(10,2),
    status public.vehicle_status not null default 'available',
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Drivers Table
create table public.dispatch_drivers (
    id uuid default gen_random_uuid() primary key,
    profile_id uuid references public.profiles(id) on delete cascade not null,
    license_number varchar(50) not null,
    license_expiry date not null,
    status public.driver_status not null default 'available',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Shipments Table
create table public.dispatch_shipments (
    id uuid default gen_random_uuid() primary key,
    tracking_number varchar(50) not null unique,
    origin_address text not null,
    destination_address text not null,
    status public.shipment_status not null default 'pending',
    assigned_vehicle uuid references public.dispatch_vehicles(id) on delete set null,
    assigned_driver uuid references public.dispatch_drivers(id) on delete set null,
    sales_invoice_id uuid references public.sales_invoices(id) on delete set null,
    purchase_bill_id uuid references public.purchase_bills(id) on delete set null,
    estimated_delivery timestamp with time zone,
    actual_delivery timestamp with time zone,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Enable
alter table public.dispatch_vehicles enable row level security;
alter table public.dispatch_drivers enable row level security;
alter table public.dispatch_shipments enable row level security;

-- Temporary Policies
create policy "read for authenticated" on public.dispatch_vehicles for select to authenticated using (true);
create policy "insert for authenticated" on public.dispatch_vehicles for insert to authenticated with check (auth.uid() is not null);
create policy "update for authenticated" on public.dispatch_vehicles for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "delete for admin" on public.dispatch_vehicles for delete to authenticated using (public.is_admin());

create policy "read for authenticated" on public.dispatch_drivers for select to authenticated using (true);
create policy "insert for authenticated" on public.dispatch_drivers for insert to authenticated with check (auth.uid() is not null);
create policy "update for authenticated" on public.dispatch_drivers for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "delete for admin" on public.dispatch_drivers for delete to authenticated using (public.is_admin());

create policy "read for authenticated" on public.dispatch_shipments for select to authenticated using (true);
create policy "insert for authenticated" on public.dispatch_shipments for insert to authenticated with check (auth.uid() is not null);
create policy "update for authenticated" on public.dispatch_shipments for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "delete for admin" on public.dispatch_shipments for delete to authenticated using (public.is_admin());
