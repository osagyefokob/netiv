CREATE SCHEMA IF NOT EXISTS user_identity;

CREATE TABLE roles (
    role_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(50) NOT NULL UNIQUE
                     CHECK (name IN ('ADMIN','WAREHOUSE_STAFF','VIEWER')),
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    permission_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource       VARCHAR(100) NOT NULL,
    action         VARCHAR(20) NOT NULL
                       CHECK (action IN ('READ','WRITE','DELETE','ADMIN')),
    description    TEXT,
    CONSTRAINT uq_permission_resource_action UNIQUE (resource, action)
);

CREATE TABLE role_permissions (
    role_id        UUID NOT NULL,
    permission_id  UUID NOT NULL,
    assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role       FOREIGN KEY (role_id)       REFERENCES roles(role_id),
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
);
