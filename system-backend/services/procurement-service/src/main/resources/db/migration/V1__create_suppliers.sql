CREATE TABLE suppliers (
    supplier_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    contact_email   VARCHAR(255) NOT NULL,
    contact_phone   VARCHAR(50),
    street          VARCHAR(255),
    city            VARCHAR(100),
    country         VARCHAR(100),
    lead_time_days  INTEGER NOT NULL DEFAULT 7 CHECK (lead_time_days > 0),
    payment_terms   VARCHAR(30) NOT NULL DEFAULT 'NET_30' CHECK (payment_terms IN ('NET_15','NET_30','NET_60','PREPAID','COD')),
    rating          NUMERIC(3,2) CHECK (rating BETWEEN 0 AND 5),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE purchase_orders (
    purchase_order_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id        UUID NOT NULL,
    warehouse_id       UUID NOT NULL,
    status             VARCHAR(30) NOT NULL DEFAULT 'DRAFTED' CHECK (status IN ('DRAFTED','SUBMITTED','ACKNOWLEDGED','PARTIALLY_RECEIVED','COMPLETED','CANCELLED')),
    total_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_by         UUID NOT NULL,
    expected_delivery  DATE,
    notes              TEXT,
    version            BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);
CREATE TABLE purchase_order_items (
    po_item_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id   UUID NOT NULL,
    product_id          UUID NOT NULL,
    quantity_ordered    INTEGER NOT NULL CHECK (quantity_ordered > 0),
    quantity_received   INTEGER NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
    unit_cost           NUMERIC(12,2) NOT NULL CHECK (unit_cost >= 0),
    line_total          NUMERIC(14,2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_po_item_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(purchase_order_id),
    CONSTRAINT chk_received_lte_ordered CHECK (quantity_received <= quantity_ordered)
);
CREATE TABLE outbox_events (
    outbox_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), correlation_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL, topic VARCHAR(200) NOT NULL, payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', retry_count INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_supplier_active ON suppliers(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_po_supplier     ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status       ON purchase_orders(status);
CREATE INDEX idx_outbox_status   ON outbox_events(status) WHERE status = 'PENDING';
