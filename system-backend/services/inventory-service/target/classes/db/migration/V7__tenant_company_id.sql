-- Align with identity service default tenant (see user-identity V6)
ALTER TABLE products ADD COLUMN company_id UUID;

UPDATE products SET company_id = 'e0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

ALTER TABLE products ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;

CREATE UNIQUE INDEX uq_products_company_sku ON products (company_id, sku);

CREATE INDEX idx_products_company ON products(company_id);
