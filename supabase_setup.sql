-- ========================================================
-- SRI RAM FASHIONS - COMPLETE DATABASE SETUP
-- ========================================================
-- Run this ONCE in Supabase SQL Editor to set up everything.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ========================================================

-- 0) EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) HELPER FUNCTION
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) PROFILES (for Google Login)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) MASTER TABLES
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hsn_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    hsn_code TEXT,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 5,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    mrp NUMERIC(12,2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock NUMERIC(12,3) NOT NULL DEFAULT 0,
    low_stock_threshold NUMERIC(12,3) NOT NULL DEFAULT 5,
    unit TEXT NOT NULL DEFAULT 'pcs',
    size TEXT,
    hsn TEXT,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 12,
    image TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_low_stock_alert_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    company_name TEXT,
    phone TEXT,
    mobile TEXT,
    alternate_no TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    state TEXT NOT NULL DEFAULT 'Tamilnadu',
    state_code TEXT DEFAULT '33',
    place_of_supply TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    company_name TEXT,
    phone TEXT,
    mobile TEXT,
    alternate_no TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    state TEXT NOT NULL DEFAULT 'Tamilnadu',
    state_code TEXT DEFAULT '33',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) BILLING TABLES
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bill_type TEXT NOT NULL DEFAULT 'sales',
    party_name TEXT,
    party_gstin TEXT,
    party_phone TEXT,
    party_address TEXT,
    party_state TEXT DEFAULT 'Tamilnadu',
    party_state_code TEXT DEFAULT '33',
    place_of_supply TEXT DEFAULT 'Tamilnadu',
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_type TEXT DEFAULT 'percentage',
    discount_value NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    cgst_total NUMERIC(12,2) DEFAULT 0,
    sgst_total NUMERIC(12,2) DEFAULT 0,
    igst_total NUMERIC(12,2) DEFAULT 0,
    tax_total NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    round_off NUMERIC(6,2) DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    payment_method TEXT,
    payment_details JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    transport_name TEXT,
    transport_mode TEXT,
    vehicle_number TEXT,
    lr_number TEXT,
    eway_bill TEXT,
    reverse_charge BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    hsn_code TEXT,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'pcs',
    rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    taxable_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(12,2) DEFAULT 0,
    sgst_amount NUMERIC(12,2) DEFAULT 0,
    igst_amount NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5) PURCHASE TABLES
CREATE TABLE IF NOT EXISTS purchase_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    supplier JSONB DEFAULT '{}'::jsonb,
    supplier_name TEXT,
    subtotal NUMERIC(14,2) DEFAULT 0,
    tax_total NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(14,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchase_entries(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    hsn_code TEXT,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
    rate NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount NUMERIC(14,2) DEFAULT 0,
    gst_rate NUMERIC(5,2) DEFAULT 0,
    cgst NUMERIC(12,2) DEFAULT 0,
    sgst NUMERIC(12,2) DEFAULT 0,
    igst NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(14,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6) STOCK & FINANCE TABLES
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    quantity NUMERIC(12,3) NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL DEFAULT 'received',
    amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    method TEXT,
    transaction_id TEXT,
    party_name TEXT,
    reference_type TEXT,
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    customer_name TEXT,
    subtotal NUMERIC(14,2) DEFAULT 0,
    tax_total NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(14,2) DEFAULT 0,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7) SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name TEXT DEFAULT 'Sri Ram Fashions',
    business_address TEXT,
    business_phone TEXT,
    business_email TEXT,
    business_gstin TEXT,
    business_state TEXT DEFAULT 'Tamilnadu',
    business_state_code TEXT DEFAULT '33',
    business_logo TEXT,
    invoice_prefix TEXT DEFAULT 'SRF',
    invoice_start_number INTEGER DEFAULT 1,
    tax_type TEXT DEFAULT 'gst',
    default_tax_rate NUMERIC(5,2) DEFAULT 12,
    currency TEXT DEFAULT 'INR',
    low_stock_alert_enabled BOOLEAN DEFAULT TRUE,
    email_notifications_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8) DEFAULT SETTINGS ROW
INSERT INTO settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 9) DISABLE RLS ON ALL TABLES (critical for app to work)
DO $$
DECLARE
    t TEXT;
    p TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'profiles','categories','hsn_codes','products','customers','suppliers',
        'bills','bill_items','purchase_entries','purchase_items',
        'stock_movements','payments','sales_entries','settings'
    ]
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t);
            FOR p IN
                SELECT pol.polname FROM pg_policy pol
                JOIN pg_class cls ON cls.oid = pol.polrelid
                WHERE cls.relname = t
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- 10) GRANT ACCESS TO ALL ROLES
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
