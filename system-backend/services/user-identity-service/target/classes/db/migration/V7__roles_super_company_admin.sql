-- Allow new role names (V1 check only listed ADMIN, WAREHOUSE_STAFF, VIEWER)
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;

UPDATE roles SET name = 'SUPER_ADMIN', description = 'Platform-wide access' WHERE role_id = 'a0000000-0000-0000-0000-000000000001';

INSERT INTO roles (role_id, name, description) VALUES
    ('a0000000-0000-0000-0000-000000000004', 'COMPANY_ADMIN', 'Company-scoped administration');

ALTER TABLE roles ADD CONSTRAINT roles_name_check
    CHECK (name IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'WAREHOUSE_STAFF', 'VIEWER'));

INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000004', permission_id
FROM permissions;

-- Core admin: no company binding (full platform scope)
UPDATE users SET company_id = NULL WHERE email = 'admin@logistics.com';

CREATE UNIQUE INDEX uq_one_active_company_admin_per_company
ON users (company_id)
WHERE role_id = 'a0000000-0000-0000-0000-000000000004' AND is_active = TRUE AND deleted_at IS NULL;
