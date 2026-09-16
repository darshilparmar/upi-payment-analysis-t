-- Catalogue for the shop. Categories and MCC codes match the generated history
-- (generator/generate_upi_data.py, the MCC table) so app data and file history
-- aggregate together in gold without a translation layer.

INSERT INTO products (sku, name, category, mcc_code, price_inr) VALUES
  ('GRC-001', 'Basmati Rice 5kg',            'Grocery',          '5411',  649.00),
  ('GRC-002', 'Cold Pressed Oil 1L',         'Grocery',          '5411',  380.00),
  ('GRC-003', 'Assorted Dry Fruits 500g',    'Grocery',          '5411',  899.00),
  ('FNB-001', 'Filter Coffee Beans 250g',    'Food & Beverage',  '5812',  445.00),
  ('FNB-002', 'Masala Chai Sampler',         'Food & Beverage',  '5812',  299.00),
  ('TEL-001', 'Prepaid Recharge ₹239',       'Telecom Recharge', '4814',  239.00),
  ('TEL-002', 'Prepaid Recharge ₹666',       'Telecom Recharge', '4814',  666.00),
  ('UTL-001', 'Electricity Bill Top-up',     'Utilities',        '4900', 1200.00),
  ('FUL-001', 'Fuel Voucher ₹500',           'Fuel',             '5541',  500.00),
  ('ECM-001', 'Wireless Earbuds',            'E-commerce',       '5399', 2499.00),
  ('ECM-002', 'Cotton Kurta',                'E-commerce',       '5399', 1150.00),
  ('ECM-003', 'Steel Water Bottle 1L',       'E-commerce',       '5399',  749.00),
  ('TRV-001', 'Bus Ticket — Bengaluru/Pune', 'Travel',           '4131', 1450.00),
  ('ENT-001', 'Movie Ticket ×2',             'Entertainment',    '7832',  560.00),
  ('HLT-001', 'Vitamin D3 Sachets',          'Healthcare',       '8011',  325.00),
  ('EDU-001', 'Online Course — SQL',         'Education',        '8299', 1999.00)
ON CONFLICT (sku) DO NOTHING;
