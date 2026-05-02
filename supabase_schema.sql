-- -- ========================================================
-- SRI RAM FASHIONS - FULL SYSTEM MASTER SCHEMA
-- ========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CATEGORIES & PRODUCTS
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    cost_price DECIMAL(12,2) DEFAULT 0,
    mrp DECIMAL(12,2) DEFAULT 0,
    selling_price DECIMAL(12,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'pcs',
    size TEXT,
    hsn TEXT,
    gst_rate DECIMAL(5,2) DEFAULT 12,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMERS & SUPPLIERS
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    mobile TEXT,
    alternate_no TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    state TEXT DEFAULT 'Tamilnadu',
    place_of_supply TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    gstin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BILLING (SALES)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number TEXT UNIQUE NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    customer_data JSONB DEFAULT '{}',
    transport TEXT,
    from_text TEXT,
    to_text TEXT,
    total_packs INTEGER DEFAULT 0,
    num_of_bundles INTEGER DEFAULT 1,
    subtotal DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    taxable_amount DECIMAL(12,2) DEFAULT 0,
    cgst DECIMAL(12,2) DEFAULT 0,
    sgst DECIMAL(12,2) DEFAULT 0,
    igst DECIMAL(12,2) DEFAULT 0,
    total_tax DECIMAL(12,2) DEFAULT 0,
    round_off DECIMAL(5,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT 'cash',
    bill_type TEXT DEFAULT 'SALES',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT,
    sku TEXT,
    hsn_code TEXT,
    sizes_or_pieces TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    rate_per_piece DECIMAL(12,2) NOT NULL DEFAULT 0,
    pcs_in_pack INTEGER DEFAULT 1,
    rate_per_pack DECIMAL(12,2),
    no_of_packs INTEGER,
    mrp DECIMAL(12,2),
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    gst_rate DECIMAL(5,2) DEFAULT 5,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Purchase Entries
CREATE TABLE IF NOT EXISTS purchase_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_data JSONB NOT NULL, -- Stores snapshot
    subtotal DECIMAL(12,2) DEFAULT 0,
    total_tax DECIMAL(12,2) DEFAULT 0,
    grand_total DECIMAL(12,2) DEFAULT 0,
    total_weight DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchase_entries(id) ON DELETE CASCADE,
    particular TEXT NOT NULL,
    hsn_code TEXT,
    design_color TEXT,
    weight_kg DECIMAL(12,2) DEFAULT 0,
    rate_per_kg DECIMAL(12,2) DEFAULT 0,
    gst_rate DECIMAL(5,2) DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Stock Movements (Inventory Log)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT'
    quantity INTEGER NOT NULL,
    reference_id UUID, -- Link to bill_id or purchase_id
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Settings (Singleton)
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    company_name TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    gstin TEXT,
    bank_details JSONB,
    tax_details JSONB,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT singleton_check CHECK (id = '00000000-0000-0000-0000-000000000001')
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(date);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_purchase_inv ON purchase_entries(invoice_number);
CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_movements(product_id);

-- ENABLE ROW LEVEL SECURITY (RLS)
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') 
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON %I', t);
        EXECUTE format('CREATE POLICY "Allow all for authenticated" ON %I ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- ENABLE REALTIME
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    bills, products, stock_movements, categories, purchase_entries, purchase_items, suppliers, customers;
COMMIT;
