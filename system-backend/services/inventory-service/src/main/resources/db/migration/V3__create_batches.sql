CREATE TABLE batches (
    batch_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id       UUID NOT NULL,
    batch_number     VARCHAR(100) NOT NULL,
    quantity         INTEGER NOT NULL CHECK (quantity >= 0),
    manufacture_date DATE,
    expiry_date      DATE,
    supplier_id      UUID,
    status           VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE','PARTIALLY_USED','CONSUMED','RECALLED','EXPIRED')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_batch_product   FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_batch_number    UNIQUE (product_id, batch_number)
);

CREATE INDEX idx_batch_product ON batches(product_id);
CREATE INDEX idx_batch_expiry  ON batches(expiry_date) WHERE status = 'ACTIVE';
CREATE INDEX idx_batch_status  ON batches(status);
