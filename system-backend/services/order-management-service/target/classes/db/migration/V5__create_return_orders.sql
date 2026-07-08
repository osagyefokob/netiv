CREATE TABLE return_orders (
    return_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_order_id UUID NOT NULL,
    warehouse_id      UUID NOT NULL,
    initiated_by      UUID NOT NULL,
    status            VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','RECEIVED','INSPECTED','RESTOCKED','WRITTEN_OFF')),
    reason            TEXT NOT NULL,
    notes             TEXT,
    restock_location_id UUID,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_return_original_order FOREIGN KEY (original_order_id) REFERENCES orders(order_id)
);

CREATE TABLE return_items (
    return_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id      UUID NOT NULL,
    product_id     UUID NOT NULL,
    quantity       INTEGER NOT NULL CHECK (quantity > 0),
    item_condition VARCHAR(20) CHECK (item_condition IS NULL OR item_condition IN ('GOOD','DAMAGED','UNUSABLE')),
    disposition    VARCHAR(20) CHECK (disposition IS NULL OR disposition IN ('RESTOCK','WRITE_OFF','QUARANTINE')),
    CONSTRAINT fk_return_item_return FOREIGN KEY (return_id) REFERENCES return_orders(return_id) ON DELETE CASCADE
);

CREATE INDEX idx_return_orders_original ON return_orders(original_order_id);
CREATE INDEX idx_return_orders_status ON return_orders(status);
CREATE INDEX idx_return_items_return ON return_items(return_id);
