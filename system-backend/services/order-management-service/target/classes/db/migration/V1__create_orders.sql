CREATE TABLE orders (
    order_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id        UUID NOT NULL,
    warehouse_id       UUID NOT NULL,
    status             VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                           CHECK (status IN ('DRAFT','PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED','FAILED')),
    priority           VARCHAR(20) NOT NULL DEFAULT 'STANDARD'
                           CHECK (priority IN ('STANDARD','HIGH','URGENT')),
    total_amount       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    expected_delivery  DATE,
    notes              TEXT,
    version            BIGINT NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ
);
CREATE TABLE order_items (
    order_item_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL,
    product_id      UUID NOT NULL,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    line_total      NUMERIC(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    reservation_id  UUID,
    status          VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','RESERVED','PICKED','DISPATCHED','CANCELLED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_item_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
CREATE TABLE order_assignments (
    assignment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL UNIQUE,
    staff_user_id   UUID NOT NULL,
    assigned_by     UUID NOT NULL,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','COMPLETED','REASSIGNED')),
    notes           TEXT,
    CONSTRAINT fk_assignment_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
CREATE TABLE order_status_history (
    history_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL,
    from_status  VARCHAR(30),
    to_status    VARCHAR(30) NOT NULL,
    changed_by   UUID NOT NULL,
    reason       TEXT,
    changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_history_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
);
CREATE INDEX idx_order_customer  ON orders(customer_id);
CREATE INDEX idx_order_status    ON orders(status);
CREATE INDEX idx_order_priority  ON orders(priority, status) WHERE status NOT IN ('DELIVERED','CANCELLED','FAILED');
CREATE INDEX idx_history_order   ON order_status_history(order_id);
