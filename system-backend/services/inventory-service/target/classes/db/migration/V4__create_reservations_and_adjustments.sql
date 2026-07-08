CREATE TABLE stock_reservations (
    reservation_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL UNIQUE,
    status          VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','CONFIRMED','RELEASED','EXPIRED')),
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version         BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE stock_reservation_items (
    reservation_item_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id       UUID NOT NULL,
    product_id           UUID NOT NULL,
    location_id          UUID NOT NULL,
    quantity             INTEGER NOT NULL CHECK (quantity > 0),
    CONSTRAINT fk_resv_item_reservation FOREIGN KEY (reservation_id) REFERENCES stock_reservations(reservation_id),
    CONSTRAINT fk_resv_item_product     FOREIGN KEY (product_id)     REFERENCES products(product_id)
);

CREATE TABLE stock_adjustments (
    adjustment_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id       UUID NOT NULL,
    location_id      UUID NOT NULL,
    previous_qty     INTEGER NOT NULL,
    new_qty          INTEGER NOT NULL,
    delta            INTEGER NOT NULL,
    adjustment_type  VARCHAR(30) NOT NULL
                         CHECK (adjustment_type IN ('MANUAL','DAMAGE','RECONCILIATION','DISPATCH','RECEIPT')),
    performed_by     UUID NOT NULL,
    notes            TEXT,
    idempotency_key  VARCHAR(255) UNIQUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_adj_product FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE outbox_events (
    outbox_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id  UUID NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    topic           VARCHAR(200) NOT NULL,
    payload         JSONB NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','PUBLISHED','FAILED')),
    retry_count     INTEGER NOT NULL DEFAULT 0,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservation_order   ON stock_reservations(order_id);
CREATE INDEX idx_reservation_status  ON stock_reservations(status);
CREATE INDEX idx_reservation_expires ON stock_reservations(expires_at) WHERE status = 'PENDING';
CREATE INDEX idx_resv_item_res       ON stock_reservation_items(reservation_id);
CREATE INDEX idx_resv_item_product   ON stock_reservation_items(product_id);
CREATE INDEX idx_adjustment_product  ON stock_adjustments(product_id);
CREATE INDEX idx_adjustment_created  ON stock_adjustments(created_at DESC);
CREATE INDEX idx_outbox_status       ON outbox_events(status) WHERE status = 'PENDING';
