CREATE SCHEMA IF NOT EXISTS user_identity;

CREATE TABLE IF NOT EXISTS user_identity.users (
    user_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name     VARCHAR(100) NOT NULL,
    last_name      VARCHAR(100) NOT NULL,
    role_id       UUID NOT NULL,
    warehouse_id   UUID,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    last_login    TIMESTAMPTZ,
    version      BIGINT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES user_identity.roles(role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_email ON user_identity.users(email);
CREATE INDEX IF NOT EXISTS idx_user_role ON user_identity.users(role_id);
CREATE INDEX IF NOT EXISTS idx_user_active ON user_identity.users(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_warehouse ON user_identity.users(warehouse_id) WHERE warehouse_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_identity.sessions (
    session_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES user_identity.users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_user ON user_identity.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_token ON user_identity.sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_session_active ON user_identity.sessions(is_revoked, expires_at) WHERE is_revoked = FALSE;