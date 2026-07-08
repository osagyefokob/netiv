-- Insert base roles
INSERT INTO roles (role_id, name, description) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'ADMIN',           'Full system access'),
    ('a0000000-0000-0000-0000-000000000002', 'WAREHOUSE_STAFF', 'Operational access scoped to assigned warehouse'),
    ('a0000000-0000-0000-0000-000000000003', 'VIEWER',          'Read-only access');

-- Insert permissions
INSERT INTO permissions (permission_id, resource, action, description) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'inventory',   'READ',   'Read inventory data'),
    ('b0000000-0000-0000-0000-000000000002', 'inventory',   'WRITE',  'Create and update inventory'),
    ('b0000000-0000-0000-0000-000000000003', 'inventory',   'DELETE', 'Delete inventory records'),
    ('b0000000-0000-0000-0000-000000000004', 'inventory',   'ADMIN',  'Admin-level inventory operations'),
    ('b0000000-0000-0000-0000-000000000005', 'warehouse',   'READ',   'Read warehouse data'),
    ('b0000000-0000-0000-0000-000000000006', 'warehouse',   'WRITE',  'Create and update warehouse records'),
    ('b0000000-0000-0000-0000-000000000007', 'warehouse',   'ADMIN',  'Admin-level warehouse operations'),
    ('b0000000-0000-0000-0000-000000000008', 'orders',      'READ',   'Read order data'),
    ('b0000000-0000-0000-0000-000000000009', 'orders',      'WRITE',  'Create and update orders'),
    ('b0000000-0000-0000-0000-000000000010', 'orders',      'ADMIN',  'Admin-level order operations'),
    ('b0000000-0000-0000-0000-000000000011', 'procurement', 'READ',   'Read procurement data'),
    ('b0000000-0000-0000-0000-000000000012', 'procurement', 'WRITE',  'Create and submit purchase orders'),
    ('b0000000-0000-0000-0000-000000000013', 'procurement', 'ADMIN',  'Admin-level procurement operations'),
    ('b0000000-0000-0000-0000-000000000014', 'users',       'READ',   'Read user data'),
    ('b0000000-0000-0000-0000-000000000015', 'users',       'ADMIN',  'Full user management'),
    ('b0000000-0000-0000-0000-000000000016', 'reports',     'READ',   'Access reports'),
    ('b0000000-0000-0000-0000-000000000017', 'reports',     'ADMIN',  'Access financial and export reports');

-- VIEWER: read-only everywhere
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000003', permission_id
FROM permissions WHERE action = 'READ';

-- WAREHOUSE_STAFF: read + write on operational services
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000002', permission_id
FROM permissions
WHERE (resource IN ('inventory','warehouse','orders') AND action IN ('READ','WRITE'))
   OR (resource = 'procurement' AND action = 'READ')
   OR (resource = 'users' AND action = 'READ')
   OR (resource = 'reports' AND action = 'READ');

-- ADMIN: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0000000-0000-0000-0000-000000000001', permission_id
FROM permissions;
