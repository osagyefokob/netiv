ALTER TABLE orders ADD COLUMN company_id UUID;

UPDATE orders SET company_id = 'e0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

ALTER TABLE orders ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX idx_orders_company ON orders(company_id);
