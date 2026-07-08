-- Test users for local development
-- Passwords are bcrypt-hashed (cost 12):
--   admin@logistics.com     -> password: Admin1234!
--   staff@logistics.com     -> password: Staff1234!
--   viewer@logistics.com    -> password: Viewer1234!

-- Fixed warehouse UUID for scoping staff user
-- (will be replaced when warehouse-service creates real warehouses)
INSERT INTO users (user_id, email, password_hash, first_name, last_name, role_id, warehouse_id, is_active) VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'admin@logistics.com',
    '$2a$12$YdFrz5hb13Nznbt674k8q.mbwOl6zBNvTZVi3WyUxWEYVqHAvuENa',
    'System',
    'Admin',
    'a0000000-0000-0000-0000-000000000001',
    NULL,
    TRUE
),
(
    'c0000000-0000-0000-0000-000000000002',
    'staff@logistics.com',
    '$2a$12$p2YPM4DUCdyct.iPeXYBG.XvRwmPLAYUvnvgIwCInO0gPuGV6huYW',
    'Warehouse',
    'Staff',
    'a0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    TRUE
),
(
    'c0000000-0000-0000-0000-000000000003',
    'viewer@logistics.com',
    '$2a$12$lGEY3QOp.B.6Q9dGN5VwVuGgW0NklwkP1YJ7G0TT4ZtWmkS63Li7K',
    'Read',
    'Only',
    'a0000000-0000-0000-0000-000000000003',
    NULL,
    TRUE
);
