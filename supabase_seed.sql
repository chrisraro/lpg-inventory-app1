-- Seed data for the LPG Inventory Management System

-- Insert cylinder types
INSERT INTO cylinder_types (name, weight, capacity) VALUES 
  ('Standard 15kg', 15.00, 15.00),
  ('Standard 19kg', 19.00, 19.00),
  ('Standard 45kg', 45.00, 45.00),
  ('Composite 12kg', 12.00, 12.00);

-- Insert sample customers
INSERT INTO customers (name, address, contact_person, phone, email, is_business) VALUES 
  ('ABC Restaurant', '123 Main St, City', 'John Manager', '555-0101', 'john@abcrestaurant.com', true),
  ('XYZ Hotel', '456 Business Ave, City', 'Sarah Reception', '555-0102', 'reservations@xyzhotel.com', true),
  ('John Doe Residence', '789 Home St, City', 'John Doe', '555-0103', 'johndoe@email.com', false),
  ('Jane Smith Residence', '321 Apartment Rd, City', 'Jane Smith', '555-0104', 'janesmith@email.com', false);

-- Insert sample cylinders
INSERT INTO cylinders (serial_number, cylinder_type_id, status, notes) VALUES 
  ('CYL000001', 1, 'in_stock', 'New cylinder'),
  ('CYL000002', 1, 'in_stock', 'New cylinder'),
  ('CYL000003', 2, 'in_stock', 'New cylinder'),
  ('CYL000004', 2, 'in_stock', 'New cylinder'),
  ('CYL000005', 3, 'in_stock', 'New cylinder'),
  ('CYL000006', 4, 'in_stock', 'New composite cylinder');

-- Note: In a real application, we would also need to insert sample users,
-- but this is typically done through the application's registration process.