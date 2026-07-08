CREATE TABLE products (
    product_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku               VARCHAR(100) NOT NULL UNIQUE,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    category          VARCHAR(100) NOT NULL,
    unit_of_measure   VARCHAR(50)  NOT NULL DEFAULT 'UNIT'
                          CHECK (unit_of_measure IN ('UNIT','KG','LITRE','PALLET','BOX','METRE')),
    unit_cost         NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    reorder_threshold INTEGER NOT NULL DEFAULT 0 CHECK (reorder_threshold >= 0),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    version           BIGINT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_products_sku      ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active   ON products(is_active) WHERE is_active = TRUE;
