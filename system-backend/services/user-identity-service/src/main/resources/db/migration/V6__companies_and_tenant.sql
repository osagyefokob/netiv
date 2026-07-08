CREATE TABLE companies (
    company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    code       VARCHAR(64) UNIQUE,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Canonical default tenant UUID (referenced by inventory/warehouse/order migrations)
INSERT INTO companies (company_id, name, code, is_active)
VALUES ('e0000000-0000-0000-0000-000000000001', 'Demo Logistics Co', 'DEMO', TRUE);

ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(company_id);

UPDATE users SET company_id = 'e0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

CREATE INDEX idx_users_company ON users(company_id);
