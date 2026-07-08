CREATE TABLE stock_levels (
    stock_level_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL,
    location_id         UUID NOT NULL,
    quantity_on_hand    INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved   INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_available  INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    version             BIGINT NOT NULL DEFAULT 0,
    last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_stock_product
        FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT uq_stock_product_location
        UNIQUE (product_id, location_id),
    CONSTRAINT chk_reserved_lte_onhand
        CHECK (quantity_reserved <= quantity_on_hand)
);

CREATE INDEX idx_stock_product  ON stock_levels(product_id);
CREATE INDEX idx_stock_location ON stock_levels(location_id);
CREATE INDEX idx_stock_low      ON stock_levels(product_id, quantity_available)
    WHERE quantity_available <= 0;
