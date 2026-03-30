-- ============================================
-- TJA7 HUB — Schema Completo
-- Supabase: yqwrhopleaonkrszvbsy
-- ============================================

-- Clientes (base unica cross-business)
CREATE TABLE IF NOT EXISTS tja7_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  cpf text,
  birth_date date,
  marital_status text,
  dependents boolean DEFAULT false,
  source text DEFAULT 'manual' CHECK (source IN ('whatsapp','instagram','indicacao','site','evento','manual')),
  stage text DEFAULT 'novo' CHECK (stage IN ('novo','simulado','documentacao','aprovado','construindo','entregue','perdido')),
  interests text[] DEFAULT '{}',
  score integer,
  assigned_to text,
  notes text,
  tags text[] DEFAULT '{}',
  last_contact_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Simulacoes MCMV
CREATE TABLE IF NOT EXISTS tja7_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES tja7_clients(id) ON DELETE CASCADE,
  gross_income numeric(10,2) NOT NULL,
  income_type text,
  years_fgts integer,
  property_value numeric(12,2),
  property_type text DEFAULT 'novo' CHECK (property_type IN ('novo','usado')),
  city text DEFAULT 'Ico',
  neighborhood text,
  faixa text CHECK (faixa IN ('1','2','3','4')),
  subsidy numeric(10,2) DEFAULT 0,
  interest_rate numeric(4,2),
  max_installment numeric(10,2),
  max_term_months integer DEFAULT 420,
  financing_amount numeric(12,2),
  status text DEFAULT 'pendente' CHECK (status IN ('pendente','simulado','aprovado','reprovado')),
  ai_summary text,
  created_at timestamptz DEFAULT now()
);

-- Imoveis / Catalogo
CREATE TABLE IF NOT EXISTS tja7_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text DEFAULT 'casa' CHECK (type IN ('casa','apartamento','terreno','comercial')),
  status text DEFAULT 'disponivel' CHECK (status IN ('disponivel','reservado','vendido','construcao')),
  price numeric(12,2) NOT NULL,
  area_m2 numeric(8,2),
  bedrooms integer,
  bathrooms integer,
  address text,
  neighborhood text,
  city text DEFAULT 'Ico',
  description text,
  images text[] DEFAULT '{}',
  features text[] DEFAULT '{}',
  mcmv_eligible boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Lotes
CREATE TABLE IF NOT EXISTS tja7_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loteamento_name text NOT NULL,
  block text NOT NULL,
  lot_number text NOT NULL,
  area_m2 numeric(8,2) NOT NULL,
  price numeric(12,2) NOT NULL,
  status text DEFAULT 'disponivel' CHECK (status IN ('disponivel','reservado','vendido')),
  address text,
  map_url text,
  features text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Construcoes / Obras
CREATE TABLE IF NOT EXISTS tja7_constructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES tja7_clients(id) ON DELETE SET NULL,
  property_id uuid REFERENCES tja7_properties(id) ON DELETE SET NULL,
  title text NOT NULL,
  address text,
  phase text DEFAULT 'fundacao' CHECK (phase IN ('fundacao','alvenaria','cobertura','instalacoes','acabamento','pintura','entrega')),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date date NOT NULL,
  estimated_end date,
  actual_end date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Atualizacoes de obra (fotos, descricoes)
CREATE TABLE IF NOT EXISTS tja7_construction_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id uuid REFERENCES tja7_constructions(id) ON DELETE CASCADE,
  phase text NOT NULL,
  progress integer DEFAULT 0,
  description text NOT NULL,
  images text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Materiais (loja)
CREATE TABLE IF NOT EXISTS tja7_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  sku text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  cost numeric(10,2),
  stock_qty integer NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  unit text DEFAULT 'un',
  supplier text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Equipe
CREATE TABLE IF NOT EXISTS tja7_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  role text DEFAULT 'vendedor' CHECK (role IN ('admin','vendedor','engenheiro','correspondente')),
  phone text,
  email text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Interacoes / Historico
CREATE TABLE IF NOT EXISTS tja7_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES tja7_clients(id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES tja7_team(id) ON DELETE SET NULL,
  type text DEFAULT 'nota' CHECK (type IN ('whatsapp','ligacao','visita','email','nota')),
  content text NOT NULL,
  ai_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_clients_stage ON tja7_clients(stage);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON tja7_clients(phone);
CREATE INDEX IF NOT EXISTS idx_simulations_client ON tja7_simulations(client_id);
CREATE INDEX IF NOT EXISTS idx_constructions_client ON tja7_constructions(client_id);
CREATE INDEX IF NOT EXISTS idx_construction_updates_cid ON tja7_construction_updates(construction_id);
CREATE INDEX IF NOT EXISTS idx_interactions_client ON tja7_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_materials_stock ON tja7_materials(stock_qty);

-- RLS (Row Level Security)
ALTER TABLE tja7_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_constructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_construction_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_interactions ENABLE ROW LEVEL SECURITY;

-- Policies (authenticated users have full access)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tja7_clients','tja7_simulations','tja7_properties','tja7_lots',
    'tja7_constructions','tja7_construction_updates','tja7_materials',
    'tja7_team','tja7_interactions'
  ])
  LOOP
    EXECUTE format('CREATE POLICY IF NOT EXISTS "auth_all_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Public read for construction updates (portal do cliente)
CREATE POLICY IF NOT EXISTS "public_read_constructions" ON tja7_constructions FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "public_read_construction_updates" ON tja7_construction_updates FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "public_read_clients_name" ON tja7_clients FOR SELECT TO anon USING (true);
