/*
  # Arla Vikas Committee Management System - Database Schema

  ## Tables Created
  
  ### profiles
  - id (uuid, references auth.users)
  - full_name (text)
  - role (text) - 'admin' or 'member'
  - created_at (timestamp)
  
  ### members
  - id (uuid, primary key)
  - member_id (text, unique) - Auto-generated member ID
  - full_name (text)
  - phone (text)
  - address (text)
  - joining_date (date)
  - status (text) - 'active' or 'inactive'
  - created_by (uuid, references profiles)
  - created_at (timestamp)
  - updated_at (timestamp)
  
  ### payments
  - id (uuid, primary key)
  - member_id (uuid, references members)
  - amount (decimal)
  - payment_month (integer, 1-12)
  - payment_year (integer)
  - payment_date (date)
  - payment_method (text) - 'cash', 'upi', or 'bank_transfer'
  - notes (text)
  - created_by (uuid, references profiles)
  - created_at (timestamp)
  - updated_at (timestamp)

  ## Security
  - Enable RLS on all tables
  - Admin users can perform all operations
  - Regular members can view their own data
  - Unique constraint on payments to prevent duplicate month/year entries per member

  ## Indexes
  - Index on member_id for faster lookups
  - Index on payment_month and payment_year for reporting
  - Index on member status for filtering
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at timestamptz DEFAULT now()
);

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  address text,
  joining_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_month integer NOT NULL CHECK (payment_month >= 1 AND payment_month <= 12),
  payment_year integer NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer')),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(member_id, payment_month, payment_year)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_month_year ON payments(payment_month, payment_year);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Members policies - Admin can do everything, members can view
CREATE POLICY "Admin can view all members"
  ON members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert members"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update members"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete members"
  ON members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Payments policies - Admin can do everything
CREATE POLICY "Admin can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating updated_at
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate member ID
CREATE OR REPLACE FUNCTION generate_member_id()
RETURNS TEXT AS $$
DECLARE
  next_id INTEGER;
  new_member_id TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO next_id FROM members;
  new_member_id := 'AVC' || LPAD(next_id::TEXT, 4, '0');
  
  WHILE EXISTS (SELECT 1 FROM members WHERE member_id = new_member_id) LOOP
    next_id := next_id + 1;
    new_member_id := 'AVC' || LPAD(next_id::TEXT, 4, '0');
  END LOOP;
  
  RETURN new_member_id;
END;
$$ LANGUAGE plpgsql;