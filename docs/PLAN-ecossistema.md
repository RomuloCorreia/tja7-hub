# TJA7 Hub — Plano de Reestruturação para Ecossistema Robusto

## Contexto
Transformar o TJA7 Hub de protótipo visual para ecossistema funcional robusto.
Entrega: demo para o cliente Jenucíê amanhã (02/04/2026).

---

## Fase 1: Hooks e Infraestrutura (base para tudo)

### 1.1 Criar useInteractions hook
- **Arquivo**: `src/hooks/useInteractions.ts`
- **Operações**: READ (por client_id), CREATE
- **Padrão**: copiar de useSimulations.ts (mesmo padrão de query filtrada)
- **Query key**: `['tja7_interactions', clientId]`

### 1.2 Extrair useLots para src/hooks/
- **De**: inline em `src/pages/app/Lotes.tsx` (linhas 7-29)
- **Para**: `src/hooks/useLots.ts`
- **Adicionar**: `updateLot` mutation (update status + fields)

### 1.3 Extrair useMaterials para src/hooks/
- **De**: inline em `src/pages/app/Materiais.tsx` (linhas 7-37)
- **Para**: `src/hooks/useMaterials.ts`
- **Adicionar**: já tem `updateMaterial`, manter

### 1.4 Adicionar mutations faltantes
- `useProperties.ts`: já tem `updateProperty` - OK
- `useLots.ts`: adicionar `updateLot`
- `useConstructions.ts`: adicionar `deleteConstruction`

**Verificação**: Todos os hooks em `src/hooks/`, todos com CREATE + READ + UPDATE mínimo.

---

## Fase 2: Página de Detalhe do Cliente (/app/cliente/:id)

### 2.1 Criar ClientePage.tsx
- **Arquivo**: `src/pages/app/ClientePage.tsx`
- **Rota**: adicionar em App.tsx: `<Route path="cliente/:id" element={<ClientePage />} />`

### 2.2 Estrutura da página
**Header**:
- Nome grande, stage badge (cor do PIPELINE_STAGES), source badge
- Botões: WhatsApp (link wa.me), Editar (toggle mode), Voltar (navigate -1)

**Abas** (state local, sem lib de tabs):
- `dados` | `simulacoes` | `obras` | `interacoes`

### 2.3 Aba Dados
- Formulário editável: name, phone, email, cpf, birth_date, marital_status, notes
- Interesses como toggle buttons (igual NewLeadModal)
- Tags como chips editáveis
- Botão Salvar chama `updateClient.mutateAsync`
- Informações: created_at, updated_at, last_contact_at (read-only)

### 2.4 Aba Simulações
- Lista de simulações do cliente via `useSimulations(clientId)`
- Cada item: renda, valor imóvel, faixa, subsídio, parcela, status badge
- Botão "Nova Simulação" abre calculadora inline (mesma lógica do Simulacoes.tsx)
- Calculadora já salva com client_id pré-preenchido

### 2.5 Aba Obras
- Lista de obras do cliente via `useConstructions()` filtrado por client_id
- Card: título, fase, progresso, endereço
- Botão "Ver Portal" abre `/obra/:id` em nova aba
- Se sem obras: mensagem vazia

### 2.6 Aba Interações
- Timeline de interações via `useInteractions(clientId)`
- Cada item: ícone por tipo (whatsapp/ligação/visita/email/nota), conteúdo, data
- Formulário no topo: select tipo + textarea conteúdo + botão Adicionar
- Badge "IA" se `ai_generated === true`

### 2.7 Navegação
- Pipeline.tsx: ao clicar card → `navigate(/app/cliente/${client.id})`
- Dashboard.tsx: leads recentes → link pro detalhe
- Remover ClientDetailModal do Pipeline (substituído pela página)

**Verificação**: Navegar de Pipeline → Cliente → ver abas → editar → salvar → voltar.

---

## Fase 3: Imóveis, Lotes e Materiais Robustos

### 3.1 Imóveis — Detalhe + Edição + Status
- **Edição**: Modal com campos preenchidos, botão Salvar chama `updateProperty`
- **Status**: Dropdown ou botões de status no card (disponível/reservado/vendido/construção)
- **Detalhe expandido**: ao clicar no card, abre modal com: imagem placeholder, todas as features, descrição completa, MCMV badge, preço, área, quartos, banheiros
- **Delete**: botão no modal de edição com confirm()

### 3.2 Lotes — Status Inline + Edição
- **Mudança de status**: 3 botões no card (disponível/reservado/vendido), click chama `updateLot`
- **Visual**: card muda cor conforme status (verde/amarelo/vermelho)
- **Filtro por loteamento**: select no header filtra por `loteamento_name`
- **Edição**: modal com campos preenchidos
- **Stats**: manter summary cards existentes

### 3.3 Materiais — Estoque Funcional
- **Ajuste de estoque**: botões +/- ao lado do stock_qty, chama `updateMaterial({ id, stock_qty: current ± 1 })`
- **Edição**: clicar na linha abre modal com todos os campos editáveis
- **Alerta visual**: linhas com estoque abaixo do mínimo ficam com borda vermelha
- **Filtro por categoria**: select no header
- **Valor em estoque**: já existe no summary, manter

**Verificação**: Editar imóvel, mudar status de lote, ajustar estoque de material.

---

## Fase 4: Obras Robustas

### 4.1 Modal expandido de obra
- Ao clicar na obra, abrir modal grande (max-w-2xl) com:
  - Header: título, cliente (link pro /app/cliente/:id), endereço
  - Progresso: barra + porcentagem + fase atual
  - Timeline de fases: 7 fases com check/current/pending (reuso do PortalCliente)
  - Botões de mudança de fase (já existe, polir)

### 4.2 Formulário de ConstructionUpdate
- Dentro do modal da obra: seção "Adicionar Atualização"
- Campos: fase (select), descrição (textarea)
- Chama `addUpdate` do useConstructionUpdates
- Lista de updates abaixo do formulário (timeline, igual PortalCliente)

### 4.3 Link "Ver como Cliente"
- Botão no modal que abre `/obra/${id}` em nova aba
- Visual: ícone Eye + "Portal do Cliente"

### 4.4 Progresso automático
- Ao mudar fase, calcular progress = `Math.round(((phaseIndex + 1) / 7) * 100)`
- Já existe parcialmente, garantir que funciona

**Verificação**: Abrir obra → ver timeline → adicionar update → ver no portal público.

---

## Fase 5: Página Ecossistema + Conexões + Polish

### 5.1 Página /app/ecossistema
- **Arquivo**: `src/pages/app/Ecossistema.tsx`
- **Rota**: adicionar em App.tsx
- **Sidebar**: adicionar como primeiro item (ícone Layers)

**Layout**: grid de 7 cards representando as frentes do negócio

**Frentes ativas** (com stats reais):
1. Construção MCMV — stats: X obras ativas, X entregues → link /app/obras
2. Correspondente Caixa — stats: X simulações, X aprovadas → link /app/simulacoes
3. Loja de Materiais — stats: X produtos, R$ X em estoque → link /app/materiais
4. Corretagem — stats: X imóveis, X vendidos → link /app/imoveis

**Frentes em desenvolvimento** (cards premium com lock):
5. Loteamento — "Iniciando" badge, stats de lotes → link /app/lotes
6. Caçambas de Entulho — "Em breve" badge, descrição do que vai ter
7. Franquia de Blocos — "Planejado" badge, descrição do novo sistema construtivo

**Visual**: cards grandes com ícone, título, descrição, stats, badge de status, gradient-border nos ativos, opacity reduzida nos futuros com ícone de lock

### 5.2 Sidebar atualizada
- Adicionar "Ecossistema" como primeiro item (ícone Layers, rota /app/ecossistema)
- Manter todos os outros itens

### 5.3 Conexões entre módulos
- Pipeline cards: clicar vai pra `/app/cliente/:id` (não mais modal)
- Dashboard leads: clicar vai pra `/app/cliente/:id`
- Dashboard obras: clicar vai pra portal (já implementado)
- Obras modal: nome do cliente é link pra `/app/cliente/:id`
- Simulações histórico: nome do cliente é link clicável

### 5.4 Breadcrumbs
- ClientePage: "Pipeline > Nome do Cliente"
- Padrão: texto clicável + `>` + título atual

### 5.5 Build e Deploy
- `npm run build` — corrigir erros de TS se houver
- `vercel --prod --yes`

**Verificação**: Navegar por todo o sistema sem becos sem saída. Cada entidade leva a outra.
