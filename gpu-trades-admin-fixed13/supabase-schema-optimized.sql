-- ============================================================
-- GPU Trades - Optimized Supabase Database Schema
-- Performance & Security Enhanced
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create indexes for users table
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sku VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  cost_price DECIMAL(10, 2),
  discount_percent DECIMAL(5, 2) DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  image_url TEXT,
  images_urls TEXT[],
  is_featured BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3, 2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create indexes for products table
CREATE INDEX idx_products_category ON products(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_sku ON products(sku) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_is_active ON products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_rating ON products(rating DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
  discount_amount DECIMAL(12, 2) DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_cost DECIMAL(10, 2) DEFAULT 0 CHECK (shipping_cost >= 0),
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  final_amount DECIMAL(12, 2) NOT NULL CHECK (final_amount >= 0),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status VARCHAR(50) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid', 'refunded')),
  payment_method VARCHAR(50),
  shipping_address TEXT NOT NULL,
  billing_address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create indexes for orders table
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- ============================================================
-- ORDER ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  total_price DECIMAL(12, 2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ============================================================
-- INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id),
  user_id UUID NOT NULL REFERENCES users(id),
  subtotal DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled')),
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for invoices
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  user_id UUID NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  helpful_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for reviews
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- ============================================================
-- WISHLIST TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- Create indexes for wishlist
CREATE INDEX idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX idx_wishlist_product_id ON wishlist(product_id);

-- ============================================================
-- STAFF PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'warehouse', 'sales', 'support', 'accountant')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for staff
CREATE INDEX idx_staff_user_id ON staff_profiles(user_id);
CREATE INDEX idx_staff_role ON staff_profiles(role);

-- ============================================================
-- ACTIVITY LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(50),
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for activity logs
CREATE INDEX idx_activity_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_created_at ON activity_logs(created_at DESC);

-- ============================================================
-- USEFUL VIEWS & FUNCTIONS
-- ============================================================

-- View: Revenue Summary
CREATE OR REPLACE VIEW revenue_summary AS
SELECT
  COUNT(DISTINCT o.id) as total_orders,
  COUNT(DISTINCT o.user_id) as unique_customers,
  SUM(o.final_amount) as total_revenue,
  AVG(o.final_amount) as avg_order_value,
  MAX(o.final_amount) as max_order_value,
  MIN(o.final_amount) as min_order_value,
  DATE_TRUNC('month', o.created_at) as month
FROM orders o
WHERE o.status != 'cancelled'
GROUP BY DATE_TRUNC('month', o.created_at);

-- Function: Get Revenue Summary
CREATE OR REPLACE FUNCTION get_revenue_summary()
RETURNS TABLE(
  total_orders BIGINT,
  unique_customers BIGINT,
  total_revenue NUMERIC,
  avg_order_value NUMERIC,
  pending_orders BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT o.id)::BIGINT,
    COUNT(DISTINCT o.user_id)::BIGINT,
    COALESCE(SUM(o.final_amount), 0),
    COALESCE(AVG(o.final_amount), 0),
    COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN o.id END)::BIGINT
  FROM orders o
  WHERE o.created_at >= CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function: Update product rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET rating = (SELECT AVG(rating) FROM reviews WHERE product_id = NEW.product_id),
      reviews_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update rating when review is added
CREATE TRIGGER trg_update_rating_on_review
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY users_own_data ON users
  FOR SELECT USING (auth.uid() = id OR EXISTS(
    SELECT 1 FROM staff_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY users_insert_own ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY orders_user_access ON orders
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS(SELECT 1 FROM staff_profiles WHERE user_id = auth.uid())
  );

-- Auto-update timestamps
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION moddatetime (updated_at);

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION moddatetime (updated_at);

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION moddatetime (updated_at);

CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION moddatetime (updated_at);
