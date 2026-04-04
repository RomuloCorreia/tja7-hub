# TJA7 Hub v2 — Arquitetura de Ecossistema Robusto

## Visão
Sistema completo de gestão para construtora que opera em 7 frentes.
Não é um protótipo. É o sistema que roda o negócio.

---

## Módulo 1: Gestão de Obras (core)

### Páginas
- `/app/obras` — Lista de todas as obras com filtros e stats
- `/app/obras/:id` — Página completa da obra (não modal)

### Página da Obra (/app/obras/:id)
**Header**: título, cliente (link), endereço, status, datas

**Abas**:
1. **Visão Geral** — progresso, fase atual, timeline visual das 7 fases, previsão vs realizado
2. **Diário de Obra** — registro diário: data, clima, equipe presente, atividades realizadas, ocorrências, fotos. Formulário + timeline cronológica
3. **Equipe** — pessoal alocado na obra: nome, função (pedreiro, eletricista, mestre), dias trabalhados, custo/dia. Adicionar/remover pessoas
4. **Materiais** — materiais requisitados pra obra: item, qtd, valor, status (solicitado/entregue/usado). Link com estoque da loja. Custo total de materiais
5. **Custos** — centro de custos: orçado vs realizado por categoria (mão de obra, materiais, equipamentos, outros). Gráfico de barras comparativo. % de desvio
6. **Fotos** — galeria organizada por fase. URLs de imagens (sem upload por agora, mas estrutura pronta)
7. **Portal** — preview do que o cliente vê + link público

### Novas tabelas Supabase
```sql
-- Diário de obra
CREATE TABLE IF NOT EXISTS tja7_construction_diary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  construction_id uuid REFERENCES tja7_constructions(id) ON DELETE CASCADE,
  date date NOT NULL,
  weather text, -- ensolarado, nublado, chuvoso
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
  role text NOT NULL, -- pedreiro, servente, eletricista, encanador, pintor, mestre
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
```

---

## Módulo 2: Loja de Materiais (completa)

### Páginas
- `/app/materiais` — Dashboard da loja (stats, alertas, entregas pendentes)
- `/app/materiais/estoque` — Catálogo completo com filtros
- `/app/materiais/pedidos` — Pedidos de compra a fornecedores
- `/app/materiais/orcamentos` — Orçamentos para clientes
- `/app/materiais/tv` — Tela de TV para entregas pendentes (fullscreen, auto-refresh)

### Dashboard da Loja (/app/materiais)
- KPIs: total produtos, valor em estoque, pedidos pendentes, entregas hoje, margem média
- Gráfico: top 10 mais vendidos
- Alertas de estoque baixo (lista com ação rápida de pedido)
- Entregas pendentes do dia (destaque)

### Catálogo/Estoque (/app/materiais/estoque)
- Tabela completa: nome, SKU, categoria, preço venda, preço custo, margem %, estoque atual, mín, fornecedor
- Filtros: categoria, fornecedor, só baixo estoque
- Busca por nome/SKU
- Edição inline ou modal
- Entrada/saída com motivo (venda, obra, ajuste, devolução)
- Histórico de movimentação por item

### Pedidos de Compra (/app/materiais/pedidos)
- Lista de pedidos a fornecedores
- Status: rascunho → enviado → confirmado → entregue
- Itens do pedido com qtd e valor
- Totalizador
- Ao marcar como entregue: atualiza estoque automaticamente

### Tela TV (/app/materiais/tv)
- Rota pública (sem sidebar, fullscreen)
- Lista de entregas pendentes: fornecedor, itens, previsão
- Auto-refresh a cada 30 segundos
- Visual grande, legível de longe
- Logo TJA7 + data/hora

### Novas tabelas
```sql
-- Movimentação de estoque
CREATE TABLE IF NOT EXISTS tja7_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES tja7_materials(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('entrada','saida','ajuste','devolucao')),
  quantity numeric(10,2) NOT NULL,
  reason text, -- venda, obra X, pedido #Y, ajuste inventário
  reference_id uuid, -- ID do pedido ou obra
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

-- Itens do pedido
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
```

---

## Módulo 3: Gestão de Loteamentos (visual)

### Páginas
- `/app/lotes` — Lista de loteamentos com cards visuais
- `/app/lotes/:loteamento` — Página do loteamento específico com mapa de lotes

### Lista de Loteamentos (/app/lotes)
- Cards grandes por loteamento: nome, localização, total de lotes, disponíveis, reservados, vendidos
- Barra de progresso de vendas (% vendido)
- Valor total do loteamento vs valor vendido
- Clicar abre a página do loteamento

### Página do Loteamento (/app/lotes/:loteamento)
- Header: nome, endereço, stats (total lotes, disponíveis, reservados, vendidos, receita)
- **Mapa visual de quadras**: grid visual mostrando os lotes por quadra
  - Cada lote é um quadrado colorido (verde=disponível, amarelo=reservado, vermelho=vendido)
  - Hover mostra: número, área, preço
  - Clicar abre detalhe do lote (modal)
- **Lista de lotes**: tabela alternativa com todos os dados
- **Modal do lote**: quadra, número, área, preço, status, features
  - Botões de mudança de status
  - Campo de observações
  - Se vendido: nome do comprador (link pro cliente)

### Sem tabelas novas — usa tja7_lots existente, apenas agrupa por loteamento_name

---

## Módulo 4: CRM + Imóveis (melhorias)

### Imóveis — adicionar centro de custos
- Na página do imóvel (modal ou página):
  - Custos de construção: terreno, mão de obra, materiais, documentação
  - Preço de venda vs custo total = margem
  - Status detalhado do processo de venda

### CRM melhorias
- Score automático baseado em: tem simulação (+20), documentação entregue (+30), simulação aprovada (+40), etc
- Timeline unificada: todas as interações + simulações + mudanças de status em ordem cronológica

---

## Prioridade de Implementação
1. Gestão de Obras (maior impacto, core do negócio)
2. Loja de Materiais (dia-a-dia, TV é diferencial)
3. Loteamentos Visual (projeto novo, impressiona)
4. CRM/Imóveis melhorias (já funciona razoável)
