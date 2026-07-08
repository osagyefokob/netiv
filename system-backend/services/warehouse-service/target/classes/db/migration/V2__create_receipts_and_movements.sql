CREATE TABLE inbound_receipts (
    receipt_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id  UUID NOT NULL,
    warehouse_id       UUID NOT NULL,
    received_by        UUID NOT NULL,
    status             VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','REJECTED','PARTIAL')),
    received_at        TIMESTAMPTZ,
    notes              TEXT,
    version            BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_receipt_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)
);

CREATE TABLE receipt_lines (
    receipt_line_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id        UUID NOT NULL,
    product_id        UUID NOT NULL,
    batch_id          UUID,
    location_id       UUID,
    qty_expected      INTEGER NOT NULL CHECK (qty_expected > 0),
    qty_received      INTEGER NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_line_receipt   FOREIGN KEY (receipt_id)   REFERENCES inbound_receipts(receipt_id),
    CONSTRAINT fk_line_location  FOREIGN KEY (location_id)  REFERENCES storage_locations(location_id)
);

CREATE TABLE stock_movements (
    movement_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id        UUID NOT NULL,
    from_location_id  UUID,
    to_location_id    UUID,
    quantity          INTEGER NOT NULL CHECK (quantity > 0),
    movement_type     VARCHAR(20) NOT NULL CHECK (movement_type IN ('PUTAWAY','TRANSFER','PICK','RETURN','DISPATCH','RECEIPT')),
    reference_id      UUID,
    reference_type    VARCHAR(30),
    performed_by      UUID NOT NULL,
    notes             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_move_from FOREIGN KEY (from_location_id) REFERENCES storage_locations(location_id),
    CONSTRAINT fk_move_to   FOREIGN KEY (to_location_id)   REFERENCES storage_locations(location_id),
    CONSTRAINT chk_movement_has_location CHECK (from_location_id IS NOT NULL OR to_location_id IS NOT NULL)
);

CREATE TABLE outbox_events (
    outbox_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id  UUID NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    topic           VARCHAR(200) NOT NULL,
    payload         JSONB NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count     INTEGER NOT NULL DEFAULT 0,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_receipt_po       ON inbound_receipts(purchase_order_id);
CREATE INDEX idx_receipt_status   ON inbound_receipts(status);
CREATE INDEX idx_movement_product ON stock_movements(product_id);
CREATE INDEX idx_movement_created ON stock_movements(created_at DESC);
CREATE INDEX idx_outbox_status    ON outbox_events(status) WHERE status = 'PENDING';
