-- Enum types
CREATE TYPE territory_status AS ENUM ('available', 'in_use', 'completed');
CREATE TYPE address_status AS ENUM ('not_visited', 'visited', 'no_contact');

-- Territories table
CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  coordinates JSONB NOT NULL,
  status territory_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Addresses table
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  lat FLOAT8 NOT NULL,
  lng FLOAT8 NOT NULL,
  status address_status NOT NULL DEFAULT 'not_visited',
  notes TEXT,
  visited_at TIMESTAMPTZ,
  visited_by UUID REFERENCES auth.users(id)
);

-- Row Level Security
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read all territories and addresses
CREATE POLICY "Authenticated users can read territories"
  ON territories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read addresses"
  ON addresses FOR SELECT
  TO authenticated
  USING (true);

-- Policies: authenticated users can update address status
CREATE POLICY "Authenticated users can update addresses"
  ON addresses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Realtime for addresses
ALTER PUBLICATION supabase_realtime ADD TABLE addresses;
