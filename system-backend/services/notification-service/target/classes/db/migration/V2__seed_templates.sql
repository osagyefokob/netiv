INSERT INTO notification_templates (event_type, channel, subject, body_template) VALUES
('inventory.stock.low_stock_alert',       'IN_APP', 'Low Stock Alert',           'Product {{sku}} is below reorder threshold. Current: {{currentQuantity}}, Threshold: {{reorderThreshold}}'),
('order.status.changed',                  'IN_APP', 'Order Status Updated',      'Order {{orderId}} status changed from {{previousStatus}} to {{newStatus}}'),
('order.assigned',                        'IN_APP', 'Order Assigned to You',     'Order {{orderId}} has been assigned to you. Priority: {{priority}}'),
('order.delayed',                         'IN_APP', 'Order Delayed',             'Order {{orderId}} has been delayed. New expected delivery: {{newExpectedDelivery}}'),
('procurement.delivery.delayed',          'IN_APP', 'PO Delivery Delayed',       'Purchase order {{purchaseOrderId}} from supplier {{supplierId}} is overdue by {{daysOverdue}} days'),
('warehouse.location.capacity_exceeded',  'IN_APP', 'Location Capacity Exceeded','Location at warehouse {{warehouseId}} has reached maximum capacity'),
('identity.user.deactivated',             'IN_APP', 'Account Deactivated',       'User account {{userId}} has been deactivated');
