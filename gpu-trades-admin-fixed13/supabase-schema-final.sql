-- ============================================================================
-- GPU Trades — FINAL consolidated Supabase schema
-- Merges: supabase-schema.sql + supabase-schema-optimized.sql +
--         supabase-schema-storefront.sql + the new `purchases` table
--         (needed by the admin "Purchases & Profit" tab).
-- Run this once on a fresh Supabase project. Safe to re-run (IF NOT EXISTS).
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================ CORE USER TABLES ============================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  phone text,
  address text,
  created_at timestamptz default now()
);

create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role text not null check (role in ('Super Admin','Admin','Warehouse','Sales','Customer Support','Accountant')),
  created_at timestamptz default now()
);

create table if not exists public.staff_invites (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text unique not null,
  role text not null,
  invited_by uuid references auth.users(id),
  accepted boolean default false,
  created_at timestamptz default now()
);

-- ============================ CATALOG ============================
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name_ar text not null,
  name_en text,
  slug text unique,
  created_at timestamptz default now()
);

create table if not exists public.brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  logo_url text,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name_ar text not null,
  name_en text,
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  price numeric(12,2) not null default 0,
  stock int not null default 0,
  image_url text,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================ ORDERS / INVOICES ============================
create table if not exists public.orders (
  id text primary key,                 -- human-readable invoice number, e.g. INV-2026-0001
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_address text,
  total numeric(12,2) not null default 0,
  status text not null default 'Pending'
    check (status in ('Pending','Confirmed','Preparing','Shipping','Delivered','Rejected','Cancelled','Refunded')),
  created_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id text references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text,
  quantity int not null default 1,
  unit_price numeric(12,2) not null default 0,
  created_at timestamptz default now()
);

-- Invoices are 1:1 with confirmed orders. Kept as its own table (rather than
-- just reusing `orders`) so accounting records stay separate from order
-- fulfillment status and can be exported/audited independently.
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  order_id text references public.orders(id) on delete cascade,
  invoice_number text unique not null,
  amount numeric(12,2) not null default 0,
  issued_at timestamptz default now()
);

-- ============================ PURCHASES (cost side, for real profit) =======
create table if not exists public.purchases (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete set null,
  quantity int not null default 1,
  unit_cost numeric(12,2) not null default 0,
  total_cost numeric(12,2) generated always as (quantity * unit_cost) stored,
  supplier text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- ============================ MARKETING / SUPPORT ============================
create table if not exists public.coupons (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  discount_percent numeric(5,2) not null default 0,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  name text,
  email text,
  subject text,
  body text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references auth.users(id),
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- These are exactly the columns the app filters/sorts/joins on
-- (see assets/js/admin.js, supabase-sync.js, supabase-optimized.js) so
-- queries stay fast as the tables grow instead of doing sequential scans.
-- ============================================================================
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_brand on public.products(brand_id);
create index if not exists idx_products_active on public.products(is_active);

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);

create index if not exists idx_invoices_order on public.invoices(order_id);
create index if not exists idx_invoices_issued_at on public.invoices(issued_at desc);

create index if not exists idx_purchases_product on public.purchases(product_id);
create index if not exists idx_purchases_created_at on public.purchases(created_at desc);

create index if not exists idx_reviews_product on public.reviews(product_id);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY
-- Public storefront: anyone can read active products/categories/brands.
-- Everything else (orders, purchases, invoices, staff data) is locked to
-- authenticated staff only — this is what keeps the store admin-safe.
-- ============================================================================
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.invoices enable row level security;
alter table public.purchases enable row level security;
alter table public.reviews enable row level security;
alter table public.messages enable row level security;
alter table public.profiles enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.staff_invites enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products
  for select using (is_active = true);

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);

drop policy if exists "public read brands" on public.brands;
create policy "public read brands" on public.brands for select using (true);

drop policy if exists "public read reviews" on public.reviews;
create policy "public read reviews" on public.reviews for select using (true);

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "users read own orders" on public.orders;
create policy "users read own orders" on public.orders
  for select using (auth.uid() = user_id);

drop policy if exists "staff full access orders" on public.orders;
create policy "staff full access orders" on public.orders
  for all using (exists (select 1 from public.staff_profiles sp where sp.id = auth.uid()));

drop policy if exists "staff full access purchases" on public.purchases;
create policy "staff full access purchases" on public.purchases
  for all using (exists (select 1 from public.staff_profiles sp where sp.id = auth.uid()));

drop policy if exists "staff full access invoices" on public.invoices;
create policy "staff full access invoices" on public.invoices
  for all using (exists (select 1 from public.staff_profiles sp where sp.id = auth.uid()));

drop policy if exists "staff full access products" on public.products;
create policy "staff full access products" on public.products
  for all using (exists (select 1 from public.staff_profiles sp where sp.id = auth.uid()));

drop policy if exists "staff full access messages" on public.messages;
create policy "staff full access messages" on public.messages
  for all using (exists (select 1 from public.staff_profiles sp where sp.id = auth.uid()));

-- ============================================================================
-- REAL PROFIT VIEW — revenue (confirmed+ orders) minus cost (purchases),
-- computed in the database instead of client-side, so the admin dashboard
-- stays fast and accurate no matter how much data accumulates.
-- ============================================================================
create or replace view public.profit_summary as
select
  (select coalesce(sum(total), 0) from public.orders where status not in ('Pending','Rejected','Cancelled')) as total_revenue,
  (select coalesce(sum(total_cost), 0) from public.purchases) as total_cost,
  (select coalesce(sum(total), 0) from public.orders where status not in ('Pending','Rejected','Cancelled'))
    - (select coalesce(sum(total_cost), 0) from public.purchases) as net_profit;
