-- ============================================================================
-- GPU Trades — Storefront schema (Phase 2)
-- Run this AFTER supabase-schema.sql (it relies on staff_profiles / helper
-- functions defined there: current_staff_role(), is_super_admin()).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Categories / Brands
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.brands (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. Products
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  barcode       text unique,
  name_ar       text not null,
  name_en       text not null,
  category_en   text,
  category_ar   text,
  brand         text,
  price         numeric(12,2) not null default 0,
  cost          numeric(12,2) not null default 0,
  discount      numeric(5,2),
  stock         int not null default 0,
  warranty_en   text,
  warranty_ar   text,
  description_en text,
  description_ar text,
  specs         jsonb default '{}'::jsonb,
  image         text,
  gallery       jsonb default '[]'::jsonb,
  is_featured   boolean not null default false,
  is_visible    boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Coupons
-- ----------------------------------------------------------------------------
create table if not exists public.coupons (
  id                  bigint generated always as identity primary key,
  code                text not null unique,
  discount_percentage numeric(5,2) not null,
  expiry              date,
  min_order           numeric(12,2) default 0,
  usage_limit         int,
  usage_count         int not null default 0,
  created_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. Orders / Order items
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id              text primary key,
  customer_id     uuid references auth.users(id) on delete set null,
  customer_name   text not null,
  customer_email  text,
  customer_phone  text,
  customer_address text,
  subtotal        numeric(12,2) not null default 0,
  discount        numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  coupon_code     text,
  status          text not null default 'Pending'
                  check (status in ('Pending','Confirmed','Shipped','Delivered','Cancelled')),
  created_at      timestamptz not null default now()
);

create table if not exists public.order_items (
  id          bigint generated always as identity primary key,
  order_id    text not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  name_ar     text,
  name_en     text,
  price       numeric(12,2) not null default 0,
  quantity    int not null default 1
);

-- ----------------------------------------------------------------------------
-- 5. Reviews
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id            bigint generated always as identity primary key,
  customer_name text not null,
  product_id    uuid references public.products(id) on delete set null,
  product_name  text,
  rating        int not null check (rating between 1 and 5),
  review_text   text,
  status        text not null default 'Pending'
                check (status in ('Pending','Approved','Rejected')),
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. Contact messages
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id          text primary key,
  name        text not null,
  email       text,
  phone       text,
  subject     text,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 7. Defensive column repair
--    In case any of the tables above already existed (from an earlier,
--    partial migration attempt) with a different/older set of columns, make
--    sure every column referenced by supabase-sync.js and the RLS policies
--    below actually exists. Running this is always safe, even on freshly
--    created tables.
-- ----------------------------------------------------------------------------
alter table public.categories  add column if not exists sort_order int not null default 0;

alter table public.brands      add column if not exists sort_order int not null default 0;

alter table public.products    add column if not exists barcode        text;
alter table public.products    add column if not exists name_ar        text;
alter table public.products    add column if not exists name_en        text;
alter table public.products    add column if not exists category_en    text;
alter table public.products    add column if not exists category_ar    text;
alter table public.products    add column if not exists brand          text;
alter table public.products    add column if not exists price          numeric(12,2) not null default 0;
alter table public.products    add column if not exists cost           numeric(12,2) not null default 0;
alter table public.products    add column if not exists discount       numeric(5,2);
alter table public.products    add column if not exists stock          int not null default 0;
alter table public.products    add column if not exists warranty_en    text;
alter table public.products    add column if not exists warranty_ar    text;
alter table public.products    add column if not exists description_en text;
alter table public.products    add column if not exists description_ar text;
alter table public.products    add column if not exists specs          jsonb default '{}'::jsonb;
alter table public.products    add column if not exists image          text;
alter table public.products    add column if not exists gallery        jsonb default '[]'::jsonb;
alter table public.products    add column if not exists is_featured    boolean not null default false;
alter table public.products    add column if not exists is_visible     boolean not null default true;

alter table public.coupons     add column if not exists discount_percentage numeric(5,2);
alter table public.coupons     add column if not exists expiry              date;
alter table public.coupons     add column if not exists min_order           numeric(12,2) default 0;
alter table public.coupons     add column if not exists usage_limit         int;
alter table public.coupons     add column if not exists usage_count         int not null default 0;

alter table public.orders      add column if not exists customer_id      uuid references auth.users(id) on delete set null;
alter table public.orders      add column if not exists customer_name    text;
alter table public.orders      add column if not exists customer_email   text;
alter table public.orders      add column if not exists customer_phone   text;
alter table public.orders      add column if not exists customer_address text;
alter table public.orders      add column if not exists subtotal         numeric(12,2) not null default 0;
alter table public.orders      add column if not exists discount         numeric(12,2) not null default 0;
alter table public.orders      add column if not exists total            numeric(12,2) not null default 0;
alter table public.orders      add column if not exists coupon_code      text;
alter table public.orders      add column if not exists status           text not null default 'Pending';

alter table public.order_items add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.order_items add column if not exists name_ar    text;
alter table public.order_items add column if not exists name_en    text;
alter table public.order_items add column if not exists price      numeric(12,2) not null default 0;
alter table public.order_items add column if not exists quantity   int not null default 1;

alter table public.reviews     add column if not exists customer_name text;
alter table public.reviews     add column if not exists product_id    uuid references public.products(id) on delete set null;
alter table public.reviews     add column if not exists product_name  text;
alter table public.reviews     add column if not exists rating        int;
alter table public.reviews     add column if not exists review_text   text;
alter table public.reviews     add column if not exists status        text not null default 'Pending';

alter table public.messages    add column if not exists name    text;
alter table public.messages    add column if not exists email   text;
alter table public.messages    add column if not exists phone   text;
alter table public.messages    add column if not exists subject text;
alter table public.messages    add column if not exists message text;
alter table public.messages    add column if not exists is_read boolean not null default false;

-- ----------------------------------------------------------------------------
-- 8. Helper function: confirm_order (used by admin.js via rpc('confirm_order'))
--    Runs as SECURITY DEFINER, restricted to staff, decrements stock and
--    increments coupon usage atomically.
-- ----------------------------------------------------------------------------
create or replace function public.confirm_order(p_order_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_coupon text;
begin
  if public.current_staff_role() is null then
    raise exception 'NOT_STAFF';
  end if;

  for v_item in select product_id, quantity from public.order_items where order_id = p_order_id loop
    if v_item.product_id is not null then
      update public.products
        set stock = greatest(stock - v_item.quantity, 0)
        where id = v_item.product_id;
    end if;
  end loop;

  select coupon_code into v_coupon from public.orders where id = p_order_id;
  if v_coupon is not null then
    update public.coupons set usage_count = usage_count + 1 where code = v_coupon;
  end if;

  update public.orders set status = 'Confirmed' where id = p_order_id;

  perform public.log_activity('Confirmed order ' || p_order_id);
end;
$$;

-- ----------------------------------------------------------------------------
-- 9. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.categories  enable row level security;
alter table public.brands      enable row level security;
alter table public.products    enable row level security;
alter table public.coupons     enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews     enable row level security;
alter table public.messages    enable row level security;

-- categories / brands: public read, staff write
drop policy if exists "public can read categories" on public.categories;
create policy "public can read categories" on public.categories for select using (true);
drop policy if exists "staff can manage categories" on public.categories;
create policy "staff can manage categories" on public.categories
  for all using (public.current_staff_role() is not null) with check (public.current_staff_role() is not null);

drop policy if exists "public can read brands" on public.brands;
create policy "public can read brands" on public.brands for select using (true);
drop policy if exists "staff can manage brands" on public.brands;
create policy "staff can manage brands" on public.brands
  for all using (public.current_staff_role() is not null) with check (public.current_staff_role() is not null);

-- products: public read of visible products, staff read/write everything
drop policy if exists "public can read visible products" on public.products;
create policy "public can read visible products" on public.products
  for select using (is_visible = true or public.current_staff_role() is not null);
drop policy if exists "staff can manage products" on public.products;
create policy "staff can manage products" on public.products
  for all using (public.current_staff_role() is not null) with check (public.current_staff_role() is not null);

-- coupons: only staff can read/write (validation of a code should go through
-- an RPC in a later phase; for now storefront checks client-side against a
-- staff-readable cache is out of scope for this schema)
drop policy if exists "staff can manage coupons" on public.coupons;
create policy "staff can manage coupons" on public.coupons
  for all using (public.current_staff_role() is not null) with check (public.current_staff_role() is not null);
drop policy if exists "public can read active coupons" on public.coupons;
create policy "public can read active coupons" on public.coupons
  for select using (true);

-- orders: guests can insert (customer_id null), staff can read/manage all,
-- a logged-in customer can read their own orders
drop policy if exists "guests and customers can create orders" on public.orders;
create policy "guests and customers can create orders" on public.orders
  for insert with check (customer_id is null or customer_id = auth.uid());
drop policy if exists "staff can read all orders" on public.orders;
create policy "staff can read all orders" on public.orders
  for select using (public.current_staff_role() is not null or customer_id = auth.uid());
drop policy if exists "staff can update orders" on public.orders;
create policy "staff can update orders" on public.orders
  for update using (public.current_staff_role() is not null) with check (public.current_staff_role() is not null);
drop policy if exists "staff can delete orders" on public.orders;
create policy "staff can delete orders" on public.orders
  for delete using (public.current_staff_role() is not null);

-- order_items: follow the parent order's visibility; guests can insert items
-- for an order they just created
drop policy if exists "insert items for own new order" on public.order_items;
create policy "insert items for own new order" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.customer_id is null or o.customer_id = auth.uid())
    )
  );
drop policy if exists "read items of visible orders" on public.order_items;
create policy "read items of visible orders" on public.order_items
  for select using (
    public.current_staff_role() is not null
    or exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );

-- reviews: public can read approved reviews, anyone can submit (goes to
-- Pending), staff can manage all
drop policy if exists "public can read approved reviews" on public.reviews;
create policy "public can read approved reviews" on public.reviews
  for select using (status = 'Approved' or public.current_staff_role() is not null);
drop policy if exists "anyone can submit a review" on public.reviews;
create policy "anyone can submit a review" on public.reviews
  for insert with check (status = 'Pending' or status is null);
drop policy if exists "staff can manage reviews" on public.reviews;
create policy "staff can manage reviews" on public.reviews
  for update using (public.current_staff_role() is not null) with check (public.current_staff_role() is not null);
drop policy if exists "staff can delete reviews" on public.reviews;
create policy "staff can delete reviews" on public.reviews
  for delete using (public.current_staff_role() is not null);

-- messages (contact form): anyone can insert, only staff can read/manage
drop policy if exists "anyone can send a message" on public.messages;
create policy "anyone can send a message" on public.messages
  for insert with check (true);
drop policy if exists "staff can read messages" on public.messages;
create policy "staff can read messages" on public.messages
  for select using (public.current_staff_role() is not null);
drop policy if exists "staff can update messages" on public.messages;
create policy "staff can update messages" on public.messages
  for update using (public.current_staff_role() is not null) with check (public.current_staff_role() is not null);
drop policy if exists "staff can delete messages" on public.messages;
create policy "staff can delete messages" on public.messages
  for delete using (public.current_staff_role() is not null);

-- ============================================================================
-- Done. After running this, admin.html / products.html / cart.html etc. will
-- have real tables to read from and write to via assets/js/supabase-sync.js.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 10. Customer profiles (one row per registered user account, synced from Auth)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Staff can view all profiles" on public.profiles;
create policy "Staff can view all profiles" on public.profiles
  for select using (public.current_staff_role() is not null);

drop policy if exists "Staff can update all profiles" on public.profiles;
create policy "Staff can update all profiles" on public.profiles
  for update using (public.current_staff_role() is not null) with check (public.current_staff_role() is not null);

-- Trigger function to copy new users from auth.users to public.profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.staff_profiles where id = new.id) then
    insert into public.profiles (id, full_name, email, phone)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      new.email,
      new.raw_user_meta_data->>'phone'
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed featured products (Odyssey OLED G8 and Corsair Vengeance LPX RAM)
insert into public.products (id, barcode, name_ar, name_en, category_en, category_ar, brand, price, cost, stock, warranty_en, warranty_ar, description_en, description_ar, image, is_featured, is_visible)
values 
  ('80000000-0000-0000-0000-000000000001', '8806098000001', 'شاشة سامسونج أوديسي Samsung Odyssey OLED G80SD 32 بوصة 4K UHD 240Hz', 'Samsung Odyssey OLED G80SD 32 Inch 4K UHD 240Hz Monitor', 'Monitor', 'الشاشات', 'Samsung', 44999, 38000, 15, '3 Years Warranty', 'ضمان 3 سنوات', 'Experience ultimate gaming with Samsung Odyssey OLED G8. 4K UHD, 240Hz refresh rate, 0.03ms response time.', 'عش تجربة اللعب الفائقة مع شاشة سامسونج أوديسي OLED G8 بدقة 4K UHD ومعدل تحديث 240 هرتز وزمن استجابة 0.03 مللي ثانية.', 'assets/img/banner-monitor.jpg', true, true)
on conflict (id) do update set price = excluded.price, name_ar = excluded.name_ar, name_en = excluded.name_en;

insert into public.products (id, barcode, name_ar, name_en, category_en, category_ar, brand, price, cost, stock, warranty_en, warranty_ar, description_en, description_ar, image, is_featured, is_visible)
values 
  ('80000000-0000-0000-0000-000000000002', '8400066000002', 'ذاكرة رام Corsair Vengeance LPX 32GB (2x16GB) DDR4 3200MHz CL16', 'Corsair Vengeance LPX 32GB (2x16GB) DDR4 3200MHz CL16 RAM', 'RAM', 'ذاكرة RAM', 'Corsair', 9000, 7500, 50, 'Lifetime Warranty', 'ضمان مدى الحياة', 'High-performance Corsair Vengeance LPX DDR4 memory for heavy multitasking and gaming.', 'ذاكرة رام عالية الأداء كورسير فينجينس DDR4 للمهام المتعددة الثقيلة والألعاب.', 'assets/img/banner-ram.jpg', true, true)
on conflict (id) do update set price = excluded.price, name_ar = excluded.name_ar, name_en = excluded.name_en;

