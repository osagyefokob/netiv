ALTER TABLE suppliers ADD COLUMN company_id UUID;

UPDATE suppliers SET company_id = 'e0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

ALTER TABLE suppliers ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX idx_suppliers_company ON suppliers(company_id);

ALTER TABLE purchase_orders ADD COLUMN company_id UUID;

UPDATE purchase_orders SET company_id = 'e0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

ALTER TABLE purchase_orders ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX idx_po_company ON purchase_orders(company_id);
