import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yqwrhopleaonkrszvbsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxd3Job3BsZWFvbmtyc3p2YnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDk1NDMsImV4cCI6MjA4MjUyNTU0M30.6CBNO41BnrUth3Tn10CwpOoo6nk6id4sOn_8TDqkJgc'
)

async function migrate() {
  console.log('🔄 Migrando banco TJA7 v2...\n')

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'romulo@rc.digital',
    password: 'Destrava2026!',
  })
  if (authError) { console.error('❌ Auth:', authError.message); return }
  console.log('✅ Autenticado\n')

  // Criar tabelas via insert test (as tabelas precisam ser criadas via SQL Editor do Supabase)
  // Vamos testar se as tabelas existem primeiro
  const tables = [
    'tja7_construction_diary',
    'tja7_construction_crew',
    'tja7_construction_materials',
    'tja7_construction_costs',
    'tja7_stock_movements',
    'tja7_purchase_orders',
    'tja7_purchase_order_items',
    'tja7_quotes',
    'tja7_quote_items',
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1)
    if (error) {
      console.log(`❌ ${table} — NÃO EXISTE (precisa criar via SQL Editor)`)
    } else {
      console.log(`✅ ${table} — OK`)
    }
  }

  console.log('\n📋 Se houver tabelas faltando, rode o SQL abaixo no Supabase SQL Editor:\n')
  console.log(SQL)
}

const SQL = `
-- ============================================
-- TJA7 HUB v2 — Novas Tabelas
-- ============================================

-- Diário de obra
CREATE TABLE IF NOT EXISTS tja7_construction_diary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id uuid REFERENCES tja7_constructions(id) ON DELETE CASCADE,
  date date NOT NULL,
  weather text,
  workers_present integer DEFAULT 0,
  activities text NOT NULL,
  incidents text,
  images text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Equipe de obra
CREATE TABLE IF NOT EXISTS tja7_construction_crew (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id uuid REFERENCES tja7_constructions(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  daily_rate numeric(8,2) DEFAULT 0,
  days_worked integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Materiais por obra (requisições)
CREATE TABLE IF NOT EXISTS tja7_construction_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id uuid REFERENCES tja7_constructions(id) ON DELETE CASCADE,
  material_id uuid REFERENCES tja7_materials(id) ON DELETE SET NULL,
  material_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(10,2) DEFAULT 0,
  status text DEFAULT 'solicitado' CHECK (status IN ('solicitado','aprovado','entregue','usado')),
  requested_at timestamptz DEFAULT now(),
  delivered_at timestamptz
);

-- Centro de custos da obra
CREATE TABLE IF NOT EXISTS tja7_construction_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id uuid REFERENCES tja7_constructions(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('mao_de_obra','materiais','equipamentos','servicos','outros')),
  description text NOT NULL,
  planned_value numeric(12,2) DEFAULT 0,
  actual_value numeric(12,2) DEFAULT 0,
  date date,
  created_at timestamptz DEFAULT now()
);

-- Movimentação de estoque
CREATE TABLE IF NOT EXISTS tja7_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES tja7_materials(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('entrada','saida','ajuste','devolucao')),
  quantity numeric(10,2) NOT NULL,
  reason text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Pedidos de compra
CREATE TABLE IF NOT EXISTS tja7_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier text NOT NULL,
  status text DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviado','confirmado','entregue','cancelado')),
  total numeric(12,2) DEFAULT 0,
  expected_delivery date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Itens do pedido de compra
CREATE TABLE IF NOT EXISTS tja7_purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES tja7_purchase_orders(id) ON DELETE CASCADE,
  material_id uuid REFERENCES tja7_materials(id) ON DELETE SET NULL,
  material_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Orçamentos para clientes
CREATE TABLE IF NOT EXISTS tja7_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_phone text,
  status text DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviado','aprovado','expirado')),
  total numeric(12,2) DEFAULT 0,
  valid_until date,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Itens do orçamento
CREATE TABLE IF NOT EXISTS tja7_quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES tja7_quotes(id) ON DELETE CASCADE,
  material_id uuid REFERENCES tja7_materials(id) ON DELETE SET NULL,
  material_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_diary_construction ON tja7_construction_diary(construction_id);
CREATE INDEX IF NOT EXISTS idx_crew_construction ON tja7_construction_crew(construction_id);
CREATE INDEX IF NOT EXISTS idx_const_materials_construction ON tja7_construction_materials(construction_id);
CREATE INDEX IF NOT EXISTS idx_costs_construction ON tja7_construction_costs(construction_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_material ON tja7_stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_po_items_order ON tja7_purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON tja7_quote_items(quote_id);

-- RLS
ALTER TABLE tja7_construction_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_construction_crew ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_construction_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_construction_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_quote_items ENABLE ROW LEVEL SECURITY;

-- Policies (authenticated full access)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tja7_construction_diary','tja7_construction_crew','tja7_construction_materials',
    'tja7_construction_costs','tja7_stock_movements','tja7_purchase_orders',
    'tja7_purchase_order_items','tja7_quotes','tja7_quote_items'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON %I', t, t);
    EXECUTE format('CREATE POLICY "auth_all_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
`;

migrate().catch(console.error)
