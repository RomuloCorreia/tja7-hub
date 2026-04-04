// ============================================
// TJA7 HUB — Types
// ============================================

// === CLIENTES (base única cross-business) ===
export type ClientSource = 'whatsapp' | 'instagram' | 'indicacao' | 'site' | 'evento' | 'manual'
export type ClientStage =
  | 'novo'
  | 'simulado'
  | 'documentacao'
  | 'aprovado'
  | 'construindo'
  | 'entregue'
  | 'perdido'

export type ClientInterest = 'financiamento' | 'lote' | 'imovel_pronto' | 'construcao' | 'material' | 'consorcio'

export interface Client {
  id: string
  name: string
  phone: string
  email: string | null
  cpf: string | null
  birth_date: string | null
  marital_status: string | null
  dependents: boolean
  source: ClientSource
  stage: ClientStage
  interests: ClientInterest[]
  score: number | null
  assigned_to: string | null
  notes: string | null
  tags: string[]
  created_at: string
  updated_at: string
  last_contact_at: string | null
}

// === SIMULAÇÕES MCMV ===
export type MCMVFaixa = '1' | '2' | '3' | '4'

export interface Simulation {
  id: string
  client_id: string
  gross_income: number
  income_type: string
  years_fgts: number | null
  property_value: number | null
  property_type: 'novo' | 'usado'
  city: string
  neighborhood: string | null
  faixa: MCMVFaixa
  subsidy: number
  interest_rate: number
  max_installment: number
  max_term_months: number
  financing_amount: number
  status: 'pendente' | 'simulado' | 'aprovado' | 'reprovado'
  ai_summary: string | null
  created_at: string
}

// === IMÓVEIS / CATÁLOGO ===
export type PropertyType = 'casa' | 'apartamento' | 'terreno' | 'comercial'
export type PropertyStatus = 'disponivel' | 'reservado' | 'vendido' | 'construcao'

export interface Property {
  id: string
  title: string
  type: PropertyType
  status: PropertyStatus
  price: number
  area_m2: number
  bedrooms: number | null
  bathrooms: number | null
  address: string
  neighborhood: string
  city: string
  description: string | null
  images: string[]
  features: string[]
  mcmv_eligible: boolean
  created_at: string
}

// === LOTES ===
export type LotStatus = 'disponivel' | 'reservado' | 'vendido'

export interface Lot {
  id: string
  loteamento_name: string
  block: string
  lot_number: string
  area_m2: number
  price: number
  status: LotStatus
  address: string | null
  map_url: string | null
  features: string[]
  created_at: string
}

// === OBRAS / CONSTRUÇÕES ===
export type ConstructionPhase =
  | 'fundacao'
  | 'alvenaria'
  | 'cobertura'
  | 'instalacoes'
  | 'acabamento'
  | 'pintura'
  | 'entrega'

export interface Construction {
  id: string
  client_id: string
  property_id: string | null
  title: string
  address: string
  phase: ConstructionPhase
  progress: number // 0-100
  start_date: string
  estimated_end: string | null
  actual_end: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ConstructionUpdate {
  id: string
  construction_id: string
  phase: ConstructionPhase
  progress: number
  description: string
  images: string[]
  created_at: string
}

// === LOJA DE MATERIAIS ===
export interface Material {
  id: string
  name: string
  category: string
  sku: string | null
  price: number
  cost: number | null
  stock_qty: number
  min_stock: number
  unit: string
  supplier: string | null
  created_at: string
  updated_at: string
}

// === EQUIPE ===
export type TeamRole = 'admin' | 'vendedor' | 'engenheiro' | 'correspondente'

export interface TeamMember {
  id: string
  user_id: string
  name: string
  role: TeamRole
  phone: string | null
  email: string | null
  active: boolean
  created_at: string
}

// === INTERAÇÕES / HISTÓRICO ===
export type InteractionType = 'whatsapp' | 'ligacao' | 'visita' | 'email' | 'nota'

export interface Interaction {
  id: string
  client_id: string
  team_member_id: string | null
  type: InteractionType
  content: string
  ai_generated: boolean
  created_at: string
}

// === PIPELINE STAGES CONFIG ===
export const PIPELINE_STAGES: Record<ClientStage, { label: string; color: string; icon: string }> = {
  novo: { label: 'Novos Leads', color: '#9ca3af', icon: 'UserPlus' },
  simulado: { label: 'Simulação', color: '#F5C518', icon: 'Calculator' },
  documentacao: { label: 'Documentação', color: '#a78bfa', icon: 'FileText' },
  aprovado: { label: 'Aprovado', color: '#34d399', icon: 'CheckCircle' },
  construindo: { label: 'Em Construção', color: '#60a5fa', icon: 'HardHat' },
  entregue: { label: 'Entregue', color: '#10b981', icon: 'Home' },
  perdido: { label: 'Perdidos', color: '#ef4444', icon: 'XCircle' },
}

// === MCMV 2026 TABELA ===
export const MCMV_TABLE = {
  '1': { maxIncome: 2850, maxSubsidy: 55000, interestRate: 4.0, maxValue: 190000 },
  '2': { maxIncome: 4700, maxSubsidy: 40000, interestRate: 4.75, maxValue: 264000 },
  '3': { maxIncome: 8600, maxSubsidy: 0, interestRate: 7.66, maxValue: 350000 },
  '4': { maxIncome: 12000, maxSubsidy: 0, interestRate: 8.16, maxValue: 500000 },
} as const

export function calculateMCMV(grossIncome: number, propertyValue: number, _fgtsYears: number = 0) {
  // Determinar faixa
  let faixa: MCMVFaixa = '4'
  if (grossIncome <= 2850) faixa = '1'
  else if (grossIncome <= 4700) faixa = '2'
  else if (grossIncome <= 8600) faixa = '3'

  const config = MCMV_TABLE[faixa]
  const subsidy = config.maxSubsidy > 0
    ? Math.min(config.maxSubsidy, propertyValue * 0.3)
    : 0

  const financingAmount = propertyValue - subsidy
  const maxInstallment = grossIncome * 0.3
  const monthlyRate = config.interestRate / 100 / 12
  const maxTermMonths = 420 // 35 anos

  // Cálculo Price
  const coefficient = monthlyRate > 0
    ? (monthlyRate * Math.pow(1 + monthlyRate, maxTermMonths)) / (Math.pow(1 + monthlyRate, maxTermMonths) - 1)
    : 1 / maxTermMonths
  const installment = Math.min(financingAmount * coefficient, maxInstallment)

  return {
    faixa,
    subsidy: Math.round(subsidy),
    interestRate: config.interestRate,
    financingAmount: Math.round(financingAmount),
    maxInstallment: Math.round(maxInstallment),
    installment: Math.round(installment * 100) / 100,
    maxTermMonths,
    eligible: propertyValue <= config.maxValue,
  }
}

// === DIÁRIO DE OBRA ===
export interface DiaryEntry {
  id: string
  construction_id: string
  date: string
  weather: string | null
  workers_present: number
  activities: string
  incidents: string | null
  images: string[]
  created_at: string
}

// === EQUIPE DE OBRA ===
export type CrewRole = 'pedreiro' | 'servente' | 'eletricista' | 'encanador' | 'pintor' | 'mestre' | 'engenheiro' | 'outros'

export interface CrewMember {
  id: string
  construction_id: string
  name: string
  role: string
  daily_rate: number
  days_worked: number
  active: boolean
  created_at: string
}

// === MATERIAIS POR OBRA ===
export type ConstructionMaterialStatus = 'solicitado' | 'aprovado' | 'entregue' | 'usado'

export interface ConstructionMaterial {
  id: string
  construction_id: string
  material_id: string | null
  material_name: string
  quantity: number
  unit_price: number
  status: ConstructionMaterialStatus
  requested_at: string
  delivered_at: string | null
}

// === CENTRO DE CUSTOS ===
export type CostCategory = 'mao_de_obra' | 'materiais' | 'equipamentos' | 'servicos' | 'outros'

export interface ConstructionCost {
  id: string
  construction_id: string
  category: CostCategory
  description: string
  planned_value: number
  actual_value: number
  date: string | null
  created_at: string
}

// === MOVIMENTAÇÃO DE ESTOQUE ===
export type StockMovementType = 'entrada' | 'saida' | 'ajuste' | 'devolucao'

export interface StockMovement {
  id: string
  material_id: string
  type: StockMovementType
  quantity: number
  reason: string | null
  reference_id: string | null
  created_at: string
}

// === PEDIDOS DE COMPRA ===
export type PurchaseOrderStatus = 'rascunho' | 'enviado' | 'confirmado' | 'entregue' | 'cancelado'

export interface PurchaseOrder {
  id: string
  supplier: string
  status: PurchaseOrderStatus
  total: number
  expected_delivery: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: string
  order_id: string
  material_id: string | null
  material_name: string
  quantity: number
  unit_price: number
  created_at: string
}

// === ORÇAMENTOS ===
export type QuoteStatus = 'rascunho' | 'enviado' | 'aprovado' | 'expirado'

export interface Quote {
  id: string
  client_name: string
  client_phone: string | null
  status: QuoteStatus
  total: number
  valid_until: string | null
  notes: string | null
  created_at: string
}

export interface QuoteItem {
  id: string
  quote_id: string
  material_id: string | null
  material_name: string
  quantity: number
  unit_price: number
  created_at: string
}

// === COST CATEGORIES CONFIG ===
export const COST_CATEGORIES: Record<CostCategory, { label: string; color: string }> = {
  mao_de_obra: { label: 'Mão de Obra', color: '#60a5fa' },
  materiais: { label: 'Materiais', color: '#F5C518' },
  equipamentos: { label: 'Equipamentos', color: '#a78bfa' },
  servicos: { label: 'Serviços', color: '#34d399' },
  outros: { label: 'Outros', color: '#9ca3af' },
}

export const CREW_ROLES: Record<string, string> = {
  pedreiro: 'Pedreiro',
  servente: 'Servente',
  eletricista: 'Eletricista',
  encanador: 'Encanador',
  pintor: 'Pintor',
  mestre: 'Mestre de Obras',
  engenheiro: 'Engenheiro',
  outros: 'Outros',
}
