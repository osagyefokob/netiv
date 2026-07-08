CREATE TABLE notification_templates (
    template_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type    VARCHAR(100) NOT NULL UNIQUE,
    channel       VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL','SMS','IN_APP','WEBHOOK')),
    subject       VARCHAR(255),
    body_template TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_logs (
    log_id       UUID NOT NULL DEFAULT gen_random_uuid(),
    template_id  UUID NOT NULL,
    recipient_id UUID NOT NULL,
    channel      VARCHAR(20) NOT NULL,
    payload      JSONB NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED','BOUNCED')),
    retry_count  INTEGER NOT NULL DEFAULT 0,
    sent_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (log_id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE notification_logs_2026_q2
    PARTITION OF notification_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

CREATE TABLE notification_logs_2026_q3
    PARTITION OF notification_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE INDEX idx_template_event ON notification_templates(event_type);
CREATE INDEX idx_notif_recipient ON notification_logs(recipient_id, created_at DESC);
