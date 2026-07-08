ALTER TABLE warehouses ADD COLUMN company_id UUID;

UPDATE warehouses SET company_id = 'e0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

ALTER TABLE warehouses ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX idx_warehouses_company ON warehouses(company_id);
