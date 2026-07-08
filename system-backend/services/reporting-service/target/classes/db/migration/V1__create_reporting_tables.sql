CREATE TABLE inventory_snapshots (
    snapshot_id         UUID NOT NULL DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL,
    warehouse_id        UUID NOT NULL,
    location_id         UUID NOT NULL,
    total_quantity      INTEGER NOT NULL,
    reserved_quantity   INTEGER NOT NULL,
    available_quantity  INTEGER NOT NULL,
    snapshot_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (snapshot_id)
);

CREATE TABLE movement_aggregates (
    agg_id         UUID NOT NULL DEFAULT gen_random_uuid(),
    product_id     UUID NOT NULL,
    warehouse_id   UUID NOT NULL,
    period_start   TIMESTAMPTZ NOT NULL,
    period_end     TIMESTAMPTZ NOT NULL,
    total_inbound  INTEGER NOT NULL DEFAULT 0,
    total_outbound INTEGER NOT NULL DEFAULT 0,
    net_change     INTEGER GENERATED ALWAYS AS (total_inbound - total_outbound) STORED,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (agg_id)
);

CREATE TABLE order_summaries (
    summary_id      UUID NOT NULL DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL UNIQUE,
    warehouse_id    UUID NOT NULL,
    status          VARCHAR(30) NOT NULL,
    priority        VARCHAR(20) NOT NULL,
    total_amount    NUMERIC(14,2) NOT NULL,
    item_count      INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    PRIMARY KEY (summary_id)
);

CREATE INDEX idx_snap_product   ON inventory_snapshots(product_id, snapshot_at DESC);
CREATE INDEX idx_snap_warehouse ON inventory_snapshots(warehouse_id, snapshot_at DESC);
CREATE INDEX idx_move_product   ON movement_aggregates(product_id, period_start DESC);
CREATE INDEX idx_order_sum_wh   ON order_summaries(warehouse_id, created_at DESC);
