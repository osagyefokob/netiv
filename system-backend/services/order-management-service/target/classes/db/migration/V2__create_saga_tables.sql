CREATE TABLE saga_instances (
    saga_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id   UUID NOT NULL UNIQUE,
    saga_type        VARCHAR(50) NOT NULL CHECK (saga_type IN ('ORDER_FULFILLMENT','GOODS_RECEIVING','ORDER_CANCELLATION','STOCK_RECONCILIATION')),
    current_step     INTEGER NOT NULL DEFAULT 1,
    status           VARCHAR(20) NOT NULL DEFAULT 'STARTED' CHECK (status IN ('STARTED','IN_PROGRESS','COMPLETED','COMPENSATING','FAILED')),
    payload          JSONB NOT NULL,
    failure_reason   TEXT,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE saga_dead_letter (
    dead_letter_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_id          UUID NOT NULL,
    correlation_id   UUID NOT NULL,
    failed_step      INTEGER NOT NULL,
    failure_reason   TEXT NOT NULL,
    payload          JSONB NOT NULL,
    requires_manual  BOOLEAN NOT NULL DEFAULT TRUE,
    resolved_by      UUID,
    resolved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
CREATE INDEX idx_saga_correlation ON saga_instances(correlation_id);
CREATE INDEX idx_saga_status      ON saga_instances(status) WHERE status NOT IN ('COMPLETED','FAILED');
CREATE INDEX idx_outbox_status    ON outbox_events(status) WHERE status = 'PENDING';
