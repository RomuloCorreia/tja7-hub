import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulations } from '../../hooks/useSimulations'
import { useClients } from '../../hooks/useClients'
import type { MCMVFaixa } from '../../types'
import {
  Calculator, ChevronRight, ChevronLeft, Building2, Hammer, Home,
  CheckCircle, XCircle, Save, UserPlus, Send, Printer, RotateCcw,
  MapPin, Banknote, Calendar, Users, Landmark, Shield, Copy, TrendingUp,
} from 'lucide-react'
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts'

// ============================================
// TYPES
// ============================================

type PropertyTypeOption = 'construcao' | 'novo' | 'usado'

interface SimulationInput {
  propertyType: PropertyTypeOption
  propertyValue: number
  city: string
  ownsPropertyInCity: boolean
  loteAlienado: boolean
  grossIncome: number
  birthDate: string
  hasFGTS3Years: boolean
  hadSubsidy: boolean
  hasMultipleBuyers: boolean
  caixaRelationship: boolean
  termMonths: number
}

interface AmortizationResult {
  nominalRate: number
  effectiveRate: number
  firstInstallment: number
  lastInstallment: number
  totalPaid: number
  monthlyInsurance: number
  monthlyAmortization: number
  monthlyInterest: number
}

interface SimulationResult {
  eligible: boolean
  ineligibleReason?: string
  faixa: MCMVFaixa
  program: string
  modality: string
  propertyValue: number
  maxFinancingRate: number
  subsidy: number
  downPayment: number
  financingAmount: number
  termMonths: number
  sac: AmortizationResult
  price: AmortizationResult
}

// ============================================
// MCMV 2026 CONFIG
// ============================================

const MCMV_CONFIG: Record<MCMVFaixa, {
  maxIncome: number; maxSubsidy: number; baseRate: number; maxRate: number; maxValue: number
}> = {
  '1': { maxIncome: 2850, maxSubsidy: 55000, baseRate: 4.00, maxRate: 4.75, maxValue: 210000 },
  '2': { maxIncome: 4700, maxSubsidy: 40000, baseRate: 4.75, maxRate: 7.00, maxValue: 210000 },
  '3': { maxIncome: 8600, maxSubsidy: 0, baseRate: 7.66, maxRate: 8.16, maxValue: 350000 },
  '4': { maxIncome: 12000, maxSubsidy: 0, baseRate: 10.50, maxRate: 10.50, maxValue: 500000 },
}

// ============================================
// SIMULATION ENGINE
// ============================================

function determineFaixa(grossIncome: number): MCMVFaixa {
  if (grossIncome <= 2850) return '1'
  if (grossIncome <= 4700) return '2'
  if (grossIncome <= 8600) return '3'
  return '4'
}

// ============================================
// SUBSIDIO MCMV 2026 — Formula calibrada com Simulador Caixa
// Usa faixas de renda proprias (2640/4400), separadas das faixas de juros (2850/4700)
// Baseado em: Resolucao CCFGTS, Portaria MCID, Grupo IV (municipios < 100k hab)
// Calibrado com dados reais do simulador Caixa para ICO-CE (06/04/2026):
//   - R$1.911 Faixa1 → R$33.030  |  R$3.000 Faixa2 → R$5.653
// ============================================

// Tetos de subsidio por grupo de municipio (Icó = Grupo IV)
const SUBSIDY_CONFIG = {
  // Faixa Subsidio 1: renda ate R$2.640
  faixa1: {
    rendaMin: 1500,    // piso para interpolacao
    rendaMax: 2640,    // teto da faixa subsidio 1
    tetoGrupoIV: 47000, // subsidio maximo base (interior <100k hab)
    bonusFGTS: 3000,    // bonus por 3+ anos FGTS
    bonusDependentes: 1500, // bonus por multiplos compradores/dependentes
  },
  // Faixa Subsidio 2: renda R$2.640,01 a R$4.400
  faixa2: {
    rendaMin: 2640,
    rendaMax: 4400,    // acima disso, sem subsidio
    tetoGrupoIV: 7100,  // subsidio maximo base (interior <100k hab)
    bonusFGTS: 0,       // sem bonus FGTS na faixa 2
    bonusDependentes: 0,
  },
}

function calculateSubsidy(
  _faixa: MCMVFaixa,
  grossIncome: number,
  propertyValue: number,
  hadSubsidy: boolean,
  hasMultipleBuyers: boolean,
  hasFGTS3Years: boolean,
): number {
  if (hadSubsidy) return 0

  let subsidioBase = 0
  let bonus = 0

  if (grossIncome <= SUBSIDY_CONFIG.faixa1.rendaMax) {
    // Faixa Subsidio 1
    const { rendaMin, rendaMax, tetoGrupoIV, bonusFGTS, bonusDependentes } = SUBSIDY_CONFIG.faixa1
    const fator = Math.max(0, Math.min(1, (rendaMax - grossIncome) / (rendaMax - rendaMin)))
    subsidioBase = tetoGrupoIV * fator
    if (hasFGTS3Years) bonus += bonusFGTS
    if (hasMultipleBuyers) bonus += bonusDependentes
  } else if (grossIncome <= SUBSIDY_CONFIG.faixa2.rendaMax) {
    // Faixa Subsidio 2
    const { rendaMin, rendaMax, tetoGrupoIV } = SUBSIDY_CONFIG.faixa2
    const fator = Math.max(0, (rendaMax - grossIncome) / (rendaMax - rendaMin))
    subsidioBase = tetoGrupoIV * fator
  } else {
    // Faixa 3+: sem subsidio
    return 0
  }

  const subsidy = Math.round(subsidioBase + bonus)
  // Nao pode ultrapassar 30% do valor do imovel
  return Math.min(subsidy, Math.round(propertyValue * 0.30))
}

// Taxas reais Caixa 2026 — Nordeste (Icó/CE)
// Subfaixas de renda com taxas diferenciadas
function getNominalRate(faixa: MCMVFaixa, hasFGTS: boolean, _caixaRelationship: boolean, grossIncome?: number): number {
  const cotDiscount = hasFGTS ? 0.50 : 0

  // Subfaixas reais da Caixa
  if (faixa === '1') {
    if (grossIncome && grossIncome <= 2000) {
      return 4.50 - cotDiscount  // NE não-cotista: 4.50%
    }
    return 4.75 - cotDiscount    // NE não-cotista: 4.75%
  }

  if (faixa === '2') {
    if (grossIncome && grossIncome <= 3500) {
      return 5.25 - cotDiscount  // NE não-cotista: 5.25%
    }
    return 7.00 - cotDiscount    // NE não-cotista: 7.00% (SALTO acima de R$3.500)
  }

  if (faixa === '3') {
    return hasFGTS ? 7.66 : 8.16
  }

  // Faixa 4: 10.50% fixo
  return 10.50
}

function nominalToEffective(nominalAnnual: number): number {
  const monthlyNominal = nominalAnnual / 12 / 100
  return ((Math.pow(1 + monthlyNominal, 12) - 1) * 100)
}

// MIP (Morte/Invalidez) varia por idade + DFI (Danos Fisicos) fixo
// Taxas mensais aproximadas calibradas com Simulador Caixa 2026
const MIP_TABLE: [number, number][] = [
  [20, 0.00015], [25, 0.00018], [30, 0.00022], [35, 0.00028],
  [40, 0.00038], [45, 0.00048], [50, 0.00065], [55, 0.00090],
  [60, 0.00130], [65, 0.00180], [70, 0.00250], [80, 0.00350],
]
const DFI_MONTHLY = 0.000145 // ~0.0145% a.m. sobre saldo devedor

function calculateInsuranceRate(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
    age--
  }
  // Interpolar MIP por idade
  let mip = MIP_TABLE[MIP_TABLE.length - 1][1]
  for (let i = 0; i < MIP_TABLE.length - 1; i++) {
    const [ageA, rateA] = MIP_TABLE[i]
    const [ageB, rateB] = MIP_TABLE[i + 1]
    if (age >= ageA && age < ageB) {
      const ratio = (age - ageA) / (ageB - ageA)
      mip = rateA + (rateB - rateA) * ratio
      break
    }
  }
  return mip + DFI_MONTHLY
}

// Taxa de administração mensal Caixa
const TAXA_ADMIN_MENSAL = 25

// Calcula financiamento maximo pela capacidade de pagamento (parcela SAC <= 30% renda)
function maxFinancingByCapacity(
  grossIncome: number, monthlyRate: number, term: number, insuranceRate: number,
): number {
  const maxPayment = grossIncome * 0.30 - TAXA_ADMIN_MENSAL // descontar taxa admin
  // SAC 1a parcela = F/n + F*r + F*ins = F * (1/n + r + ins)
  const factor = (1 / term) + monthlyRate + insuranceRate
  return Math.floor(Math.max(0, maxPayment) / factor * 100) / 100
}

function calculateSAC(financing: number, monthlyRate: number, term: number, insuranceRate: number) {
  const amortization = financing / term
  const firstInterest = financing * monthlyRate
  const firstInsurance = financing * insuranceRate
  const firstInstallment = amortization + firstInterest + firstInsurance + TAXA_ADMIN_MENSAL

  const lastBalance = financing - amortization * (term - 1)
  const lastInterest = lastBalance * monthlyRate
  const lastInsurance = lastBalance * insuranceRate
  const lastInstallment = amortization + lastInterest + lastInsurance + TAXA_ADMIN_MENSAL

  // Total pago (soma de todas as parcelas)
  let totalPaid = 0
  for (let i = 0; i < term; i++) {
    const balance = financing - amortization * i
    totalPaid += amortization + (balance * monthlyRate) + (balance * insuranceRate) + TAXA_ADMIN_MENSAL
  }

  return {
    firstInstallment: Math.round(firstInstallment * 100) / 100,
    lastInstallment: Math.round(lastInstallment * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    monthlyInsurance: Math.round(firstInsurance * 100) / 100,
    monthlyAmortization: Math.round(amortization * 100) / 100,
    monthlyInterest: Math.round(firstInterest * 100) / 100,
  }
}

function calculatePRICE(financing: number, monthlyRate: number, term: number, insuranceRate: number) {
  // Parcela fixa (sem seguro)
  const coefficient = monthlyRate > 0
    ? (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1)
    : 1 / term
  const baseInstallment = financing * coefficient

  const firstInsurance = financing * insuranceRate
  const firstInstallment = baseInstallment + firstInsurance + TAXA_ADMIN_MENSAL

  // Ultima parcela: seguro sobre saldo final
  const lastBalance = financing * (Math.pow(1 + monthlyRate, term) - Math.pow(1 + monthlyRate, term - 1)) /
    (Math.pow(1 + monthlyRate, term) - 1)
  const lastInsurance = Math.abs(lastBalance) * insuranceRate
  const lastInstallment = baseInstallment + lastInsurance + TAXA_ADMIN_MENSAL

  // Total pago
  let totalPaid = 0
  let balance = financing
  for (let i = 0; i < term; i++) {
    const interest = balance * monthlyRate
    const amort = baseInstallment - interest
    const insurance = balance * insuranceRate
    totalPaid += baseInstallment + insurance + TAXA_ADMIN_MENSAL
    balance -= amort
  }

  const firstInterest = financing * monthlyRate
  const firstAmortization = baseInstallment - firstInterest

  return {
    firstInstallment: Math.round(firstInstallment * 100) / 100,
    lastInstallment: Math.round(lastInstallment * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    monthlyInsurance: Math.round(firstInsurance * 100) / 100,
    monthlyAmortization: Math.round(firstAmortization * 100) / 100,
    monthlyInterest: Math.round(firstInterest * 100) / 100,
  }
}

function simulateMCMV(input: SimulationInput): SimulationResult {
  const faixa = determineFaixa(input.grossIncome)
  const config = MCMV_CONFIG[faixa]

  // Verificar elegibilidade
  let eligible = true
  let ineligibleReason: string | undefined

  if (input.ownsPropertyInCity) {
    eligible = false
    ineligibleReason = 'Possui imóvel residencial na mesma cidade. Não elegível para MCMV.'
  } else if (input.grossIncome > 12000) {
    eligible = false
    ineligibleReason = 'Renda bruta familiar acima de R$ 12.000. Não enquadra no MCMV.'
  } else if (input.propertyValue > config.maxValue) {
    eligible = false
    ineligibleReason = `Valor do imóvel (R$ ${input.propertyValue.toLocaleString('pt-BR')}) acima do limite da Faixa ${faixa} (R$ ${config.maxValue.toLocaleString('pt-BR')}).`
  }

  const subsidy = eligible
    ? calculateSubsidy(faixa, input.grossIncome, input.propertyValue, input.hadSubsidy, input.hasMultipleBuyers, input.hasFGTS3Years)
    : 0

  // Taxas
  const nominalRate = getNominalRate(faixa, input.hasFGTS3Years, input.caixaRelationship, input.grossIncome)
  const effectiveRate = nominalToEffective(nominalRate)
  const monthlyRate = nominalRate / 12 / 100
  const insuranceRate = calculateInsuranceRate(input.birthDate)

  // Cota maxima (80% construcao/novo, 70% usado)
  const maxFinancingRate = (input.propertyType === 'usado') ? 0.70 : 0.80
  const maxByCota = input.propertyValue * maxFinancingRate

  // Limite por capacidade de pagamento (1a parcela SAC <= 30% da renda)
  const maxByCapacity = maxFinancingByCapacity(input.grossIncome, monthlyRate, input.termMonths, insuranceRate)

  // Financiamento = menor entre: cota maxima, capacidade de pagamento, valor-subsidio
  const maxAvailable = input.propertyValue - subsidy
  const financingAmount = Math.min(maxByCota, maxByCapacity, maxAvailable)
  const downPayment = Math.max(0, input.propertyValue - financingAmount - subsidy)

  // Modality
  const modality = input.propertyType === 'construcao'
    ? 'Aquisição de Terreno e Construção'
    : input.propertyType === 'novo'
      ? 'Aquisição de Imóvel Novo'
      : 'Aquisição de Imóvel Usado'

  const sac = calculateSAC(financingAmount, monthlyRate, input.termMonths, insuranceRate)
  const price = calculatePRICE(financingAmount, monthlyRate, input.termMonths, insuranceRate)

  return {
    eligible,
    ineligibleReason,
    faixa,
    program: 'Minha Casa, Minha Vida — Recursos FGTS',
    modality,
    propertyValue: input.propertyValue,
    maxFinancingRate: maxFinancingRate * 100,
    subsidy,
    downPayment,
    financingAmount,
    termMonths: input.termMonths,
    sac: { nominalRate, effectiveRate, ...sac },
    price: { nominalRate, effectiveRate, ...price },
  }
}

// ============================================
// HELPERS
// ============================================

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtInputCurrency(value: string): string {
  const num = value.replace(/\D/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('pt-BR')
}

function parseInputCurrency(formatted: string): number {
  return Number(formatted.replace(/\./g, '')) || 0
}

function generateEvolutionData(result: SimulationResult, insuranceRate: number) {
  const data: { month: number; sac: number; price: number }[] = []
  const monthlyRate = result.sac.nominalRate / 12 / 100
  const amortSAC = result.financingAmount / result.termMonths

  // PRICE base
  const coeff = monthlyRate > 0
    ? (monthlyRate * Math.pow(1 + monthlyRate, result.termMonths)) / (Math.pow(1 + monthlyRate, result.termMonths) - 1)
    : 1 / result.termMonths
  const priceBase = result.financingAmount * coeff

  const step = Math.max(1, Math.floor(result.termMonths / 60))
  for (let m = 0; m < result.termMonths; m += step) {
    // SAC
    const sacBalance = result.financingAmount - amortSAC * m
    const sacPayment = amortSAC + sacBalance * monthlyRate + sacBalance * insuranceRate

    // PRICE
    let pBal = result.financingAmount
    for (let j = 0; j < m; j++) {
      const interest = pBal * monthlyRate
      pBal -= (priceBase - interest)
    }
    const pricePayment = priceBase + Math.max(0, pBal) * insuranceRate

    data.push({
      month: m + 1,
      sac: Math.round(sacPayment * 100) / 100,
      price: Math.round(pricePayment * 100) / 100,
    })
  }

  return data
}

// ============================================
// COMPONENTS
// ============================================

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1
        const isActive = step === current
        const isDone = step < current
        return (
          <div key={step} className="flex items-center gap-2">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500
              ${isActive ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-black scale-110 shadow-lg shadow-gold-400/30' :
                isDone ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40' :
                'bg-white/5 text-white/30 border border-white/10'}
            `}>
              {isDone ? <CheckCircle size={18} /> : step}
            </div>
            {i < total - 1 && (
              <div className={`w-12 h-0.5 transition-all duration-500 ${
                isDone ? 'bg-gold-400/40' : 'bg-white/10'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-white/70">{label}</span>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            value ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
          }`}
        >
          Sim
        </button>
        <button
          onClick={() => onChange(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            !value ? 'bg-white/10 text-white/80 border border-white/20' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
          }`}
        >
          Não
        </button>
      </div>
    </div>
  )
}

const PROPERTY_TYPES: { value: PropertyTypeOption; label: string; icon: typeof Building2; desc: string }[] = [
  { value: 'construcao', label: 'Construção', icon: Hammer, desc: 'Terreno + construção' },
  { value: 'novo', label: 'Imóvel Novo', icon: Home, desc: 'Primeiro proprietário' },
  { value: 'usado', label: 'Imóvel Usado', icon: Building2, desc: 'Imóvel de revenda' },
]

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
}

// ============================================
// PRINTABLE REPORT COMPONENT
// ============================================

interface PrintableReportProps {
  input: {
    propertyType: PropertyTypeOption
    propertyValue: number
    city: string
    loteAlienado: boolean
    grossIncome: number
    birthDate: string
    hasFGTS3Years: boolean
    hadSubsidy: boolean
    hasMultipleBuyers: boolean
    caixaRelationship: boolean
  }
  result: SimulationResult
  termMonths: number
}

function PrintableReport({ input, result, termMonths }: PrintableReportProps) {
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const propertyTypeLabel = input.propertyType === 'construcao'
    ? 'Construção (Terreno + Construção)'
    : input.propertyType === 'novo'
      ? 'Imóvel Novo'
      : 'Imóvel Usado'

  const sacMoreEconomic = result.sac.totalPaid < result.price.totalPaid
  const economy = Math.abs(result.sac.totalPaid - result.price.totalPaid)

  return (
    <div className="print-report" style={{ display: 'none' }}>
      {/* Cabeçalho */}
      <div className="report-header">
        <div className="logo-text">TJA7</div>
        <div className="company-name">TJA7 EMPREENDIMENTOS</div>
        <h1>Simulação de Financiamento MCMV</h1>
        <div className="report-meta">
          {today} — Icó, CE
        </div>
      </div>

      {/* Seção 1 — Dados do Imóvel */}
      <h2>1. Dados do Imóvel</h2>
      <table>
        <tbody>
          <tr>
            <td className="td-label">Tipo de Imóvel</td>
            <td className="td-value">{propertyTypeLabel}</td>
          </tr>
          <tr>
            <td className="td-label">Valor do Imóvel</td>
            <td className="td-value">{fmtCurrency(input.propertyValue)}</td>
          </tr>
          <tr>
            <td className="td-label">Localização</td>
            <td className="td-value">{input.city}</td>
          </tr>
          <tr>
            <td className="td-label">Lote Alienado/Hipotecado</td>
            <td className="td-value">{input.loteAlienado ? 'Sim' : 'Não'}</td>
          </tr>
        </tbody>
      </table>

      {/* Seção 2 — Dados do Proponente */}
      <h2>2. Dados do Proponente</h2>
      <table>
        <tbody>
          <tr>
            <td className="td-label">Renda Bruta Familiar</td>
            <td className="td-value">{fmtCurrency(input.grossIncome)}</td>
          </tr>
          <tr>
            <td className="td-label">Data de Nascimento</td>
            <td className="td-value">
              {input.birthDate ? new Date(input.birthDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
            </td>
          </tr>
          <tr>
            <td className="td-label">FGTS 3+ anos</td>
            <td className="td-value">{input.hasFGTS3Years ? 'Sim' : 'Não'}</td>
          </tr>
          <tr>
            <td className="td-label">Subsídio anterior</td>
            <td className="td-value">{input.hadSubsidy ? 'Sim' : 'Não'}</td>
          </tr>
          <tr>
            <td className="td-label">Mais de um comprador/dependente</td>
            <td className="td-value">{input.hasMultipleBuyers ? 'Sim' : 'Não'}</td>
          </tr>
          <tr>
            <td className="td-label">Relacionamento com a Caixa</td>
            <td className="td-value">{input.caixaRelationship ? 'Sim' : 'Não'}</td>
          </tr>
        </tbody>
      </table>

      {/* Seção 3 — Enquadramento */}
      <h2>3. Enquadramento</h2>
      <table>
        <tbody>
          <tr>
            <td className="td-label">Programa</td>
            <td className="td-value">Minha Casa, Minha Vida — Recursos FGTS</td>
          </tr>
          <tr>
            <td className="td-label">Modalidade</td>
            <td className="td-value">{result.modality}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ textAlign: 'center', margin: '12px 0' }}>
        <span className="faixa-badge">FAIXA {result.faixa}</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <span className={`eligible-badge ${result.eligible ? 'eligible-yes' : 'eligible-no'}`}>
          {result.eligible ? 'ELEGIVEL AO PROGRAMA' : 'NAO ELEGIVEL'}
        </span>
        {!result.eligible && result.ineligibleReason && (
          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '6px' }}>
            {result.ineligibleReason}
          </div>
        )}
      </div>

      {/* Seção 4 — Resultado da Simulação */}
      <h2>4. Resultado da Simulação</h2>
      <table>
        <tbody>
          <tr>
            <td className="td-label">Valor do Imóvel</td>
            <td className="td-value">{fmtCurrency(result.propertyValue)}</td>
          </tr>
          <tr>
            <td className="td-label">Subsídio MCMV</td>
            <td className="td-value green-text">{fmtCurrency(result.subsidy)}</td>
          </tr>
          <tr>
            <td className="td-label">Entrada</td>
            <td className="td-value gold-text">{fmtCurrency(result.downPayment)}</td>
          </tr>
          <tr>
            <td className="td-label">Valor do Financiamento</td>
            <td className="td-value highlight-value">{fmtCurrency(result.financingAmount)}</td>
          </tr>
          <tr>
            <td className="td-label">Cota Máxima de Financiamento</td>
            <td className="td-value">{result.maxFinancingRate}%</td>
          </tr>
          <tr>
            <td className="td-label">Prazo</td>
            <td className="td-value">{termMonths} meses ({Math.floor(termMonths / 12)} anos)</td>
          </tr>
        </tbody>
      </table>

      {/* Seção 5 — Comparativo SAC vs PRICE */}
      <h2>5. Comparativo SAC vs PRICE</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th style={{ textAlign: 'center' }}>SAC</th>
            <th style={{ textAlign: 'center' }}>PRICE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="td-label">Taxa Nominal (a.a.)</td>
            <td style={{ textAlign: 'center' }}>{result.sac.nominalRate.toFixed(2)}%</td>
            <td style={{ textAlign: 'center' }}>{result.price.nominalRate.toFixed(2)}%</td>
          </tr>
          <tr>
            <td className="td-label">Taxa Efetiva (a.a.)</td>
            <td style={{ textAlign: 'center' }}>{result.sac.effectiveRate.toFixed(2)}%</td>
            <td style={{ textAlign: 'center' }}>{result.price.effectiveRate.toFixed(2)}%</td>
          </tr>
          <tr>
            <td className="td-label">1ª Prestação</td>
            <td style={{ textAlign: 'center', fontWeight: 700 }}>{fmtCurrency(result.sac.firstInstallment)}</td>
            <td style={{ textAlign: 'center', fontWeight: 700 }}>{fmtCurrency(result.price.firstInstallment)}</td>
          </tr>
          <tr>
            <td className="td-label">Última Prestação</td>
            <td style={{ textAlign: 'center', fontWeight: 700 }}>{fmtCurrency(result.sac.lastInstallment)}</td>
            <td style={{ textAlign: 'center', fontWeight: 700 }}>{fmtCurrency(result.price.lastInstallment)}</td>
          </tr>
          <tr className="highlight-row">
            <td className="td-label">Total Pago</td>
            <td style={{ textAlign: 'center', fontWeight: 700 }}>{fmtCurrency(result.sac.totalPaid)}</td>
            <td style={{ textAlign: 'center', fontWeight: 700 }}>{fmtCurrency(result.price.totalPaid)}</td>
          </tr>
        </tbody>
      </table>
      {sacMoreEconomic && (
        <div className="economy-note">
          No sistema SAC voce economiza {fmtCurrency(economy)} em relação ao PRICE
        </div>
      )}

      {/* Seção 6 — Composição da 1ª Prestação */}
      <h2>6. Composição da 1ª Prestação</h2>
      <div className="section-grid">
        <div>
          <table>
            <thead>
              <tr>
                <th colSpan={2} style={{ textAlign: 'center' }}>SAC</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="td-label">Amortização</td>
                <td className="td-value">{fmtCurrency(result.sac.monthlyAmortization)}</td>
              </tr>
              <tr>
                <td className="td-label">Juros</td>
                <td className="td-value">{fmtCurrency(result.sac.monthlyInterest)}</td>
              </tr>
              <tr>
                <td className="td-label">Seguros (MIP + DFI)</td>
                <td className="td-value">{fmtCurrency(result.sac.monthlyInsurance)}</td>
              </tr>
              <tr style={{ fontWeight: 700 }}>
                <td className="td-label" style={{ fontWeight: 700 }}>Total 1ª Prestação</td>
                <td className="td-value">{fmtCurrency(result.sac.firstInstallment)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <table>
            <thead>
              <tr>
                <th colSpan={2} style={{ textAlign: 'center' }}>PRICE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="td-label">Amortização</td>
                <td className="td-value">{fmtCurrency(result.price.monthlyAmortization)}</td>
              </tr>
              <tr>
                <td className="td-label">Juros</td>
                <td className="td-value">{fmtCurrency(result.price.monthlyInterest)}</td>
              </tr>
              <tr>
                <td className="td-label">Seguros (MIP + DFI)</td>
                <td className="td-value">{fmtCurrency(result.price.monthlyInsurance)}</td>
              </tr>
              <tr style={{ fontWeight: 700 }}>
                <td className="td-label" style={{ fontWeight: 700 }}>Total 1ª Prestação</td>
                <td className="td-value">{fmtCurrency(result.price.firstInstallment)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Rodapé */}
      <div className="footer">
        <p>Esta simulação é apenas ilustrativa e não representa proposta de financiamento.</p>
        <p>Valores sujeitos à análise de crédito e aprovação pela CAIXA.</p>
        <br />
        <p><strong>TJA7 Empreendimentos — Correspondente Bancário CAIXA</strong></p>
        <p>Icó, Ceará | (88) 99903-3208</p>
        <br />
        <p style={{ fontSize: '9px', color: '#bbb' }}>Simulação gerada pelo TJA7 Hub — Powered by RC Digital</p>
      </div>
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SimuladorMCMV() {
  // State
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(0)
  const resultRef = useRef<HTMLDivElement>(null)

  // Step 1 — Dados do Imóvel
  const [propertyType, setPropertyType] = useState<PropertyTypeOption>('novo')
  const [propertyValueStr, setPropertyValueStr] = useState('')
  const [city, setCity] = useState('Icó - CE')
  const [ownsPropertyInCity, setOwnsPropertyInCity] = useState(false)
  const [loteAlienado, setLoteAlienado] = useState(false)

  // Step 2 — Dados Pessoais
  const [grossIncomeStr, setGrossIncomeStr] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [hasFGTS3Years, setHasFGTS3Years] = useState(false)
  const [hadSubsidy, setHadSubsidy] = useState(false)
  const [hasMultipleBuyers, setHasMultipleBuyers] = useState(false)
  const [caixaRelationship, setCaixaRelationship] = useState(false)

  // Step 3 — Result
  const [termMonths, setTermMonths] = useState(420)
  const [result, setResult] = useState<SimulationResult | null>(null)

  // Save
  const [clientId, setClientId] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  // Hooks
  const { simulations, createSimulation } = useSimulations()
  const { clients, createClient } = useClients()

  // Navigation
  const goNext = () => { setDirection(1); setStep(s => s + 1) }
  const goBack = () => { setDirection(-1); setStep(s => s - 1) }

  const canProceedStep1 = propertyValueStr && parseInputCurrency(propertyValueStr) > 0
  const canProceedStep2 = grossIncomeStr && parseInputCurrency(grossIncomeStr) > 0 && birthDate

  // Run simulation
  const runSimulation = () => {
    const input: SimulationInput = {
      propertyType,
      propertyValue: parseInputCurrency(propertyValueStr),
      city,
      ownsPropertyInCity,
      loteAlienado,
      grossIncome: parseInputCurrency(grossIncomeStr),
      birthDate,
      hasFGTS3Years,
      hadSubsidy,
      hasMultipleBuyers,
      caixaRelationship,
      termMonths,
    }
    const res = simulateMCMV(input)
    setResult(res)
    setSaved(false)
    goNext()
  }

  // Recalculate when term changes
  const currentResult = useMemo(() => {
    if (!result) return null
    const input: SimulationInput = {
      propertyType,
      propertyValue: parseInputCurrency(propertyValueStr),
      city,
      ownsPropertyInCity,
      loteAlienado,
      grossIncome: parseInputCurrency(grossIncomeStr),
      birthDate,
      hasFGTS3Years,
      hadSubsidy,
      hasMultipleBuyers,
      caixaRelationship,
      termMonths,
    }
    return simulateMCMV(input)
  }, [result, termMonths, propertyType, propertyValueStr, city, ownsPropertyInCity, loteAlienado, grossIncomeStr, birthDate, hasFGTS3Years, hadSubsidy, hasMultipleBuyers, caixaRelationship])

  const evolutionData = useMemo(() => {
    if (!currentResult) return []
    const insRate = calculateInsuranceRate(birthDate)
    return generateEvolutionData(currentResult, insRate)
  }, [currentResult, birthDate])

  const pieData = useMemo(() => {
    if (!currentResult) return []
    return [
      { name: 'Amortização', value: currentResult.sac.monthlyAmortization },
      { name: 'Juros', value: currentResult.sac.monthlyInterest },
      { name: 'Seguros', value: currentResult.sac.monthlyInsurance },
    ]
  }, [currentResult])

  const PIE_COLORS = ['#F5C518', '#60a5fa', '#a78bfa']

  // Save to CRM
  const handleSave = async () => {
    if (!currentResult) return
    let finalClientId = clientId

    if (showNewClient && newClientName && newClientPhone) {
      try {
        const nc = await createClient.mutateAsync({
          name: newClientName,
          phone: newClientPhone,
          source: 'manual',
          stage: 'simulado',
          interests: ['financiamento'],
          tags: ['mcmv'],
        })
        finalClientId = nc.id
      } catch { return }
    }

    if (!finalClientId) return

    try {
      await createSimulation.mutateAsync({
        client_id: finalClientId,
        gross_income: parseInputCurrency(grossIncomeStr),
        property_value: parseInputCurrency(propertyValueStr),
        property_type: propertyType === 'construcao' ? 'novo' : propertyType,
        city: city,
        faixa: currentResult.faixa,
        subsidy: currentResult.subsidy,
        interest_rate: currentResult.sac.nominalRate,
        max_installment: Math.round(parseInputCurrency(grossIncomeStr) * 0.3),
        max_term_months: termMonths,
        financing_amount: currentResult.financingAmount,
        status: currentResult.eligible ? 'simulado' : 'reprovado',
      })
      setSaved(true)
    } catch { /* handled by React Query */ }
  }

  // WhatsApp
  const generateWhatsAppText = () => {
    if (!currentResult) return ''
    return `🏠 *SIMULAÇÃO MCMV — TJA7 Empreendimentos*

📌 *${currentResult.program}*
📋 Modalidade: ${currentResult.modality}
🏷️ Faixa: *${currentResult.faixa}*

💰 Valor do Imóvel: *${fmtCurrency(currentResult.propertyValue)}*
🎁 Subsídio MCMV: *${fmtCurrency(currentResult.subsidy)}*
💵 Entrada: *${fmtCurrency(currentResult.downPayment)}*
🏦 Financiamento: *${fmtCurrency(currentResult.financingAmount)}*
📅 Prazo: *${termMonths} meses (${Math.floor(termMonths / 12)} anos)*

📊 *SAC*
• Taxa: ${currentResult.sac.nominalRate.toFixed(2)}% a.a.
• 1ª Parcela: ${fmtCurrency(currentResult.sac.firstInstallment)}
• Última Parcela: ${fmtCurrency(currentResult.sac.lastInstallment)}

📊 *PRICE*
• Taxa: ${currentResult.price.nominalRate.toFixed(2)}% a.a.
• Parcela Fixa: ${fmtCurrency(currentResult.price.firstInstallment)}

_Simulação ilustrativa. Valores sujeitos a análise de crédito._
_TJA7 Empreendimentos — Icó/CE_

📄 Relatório completo: https://tja7-hub.vercel.app/case`
  }

  const sendWhatsApp = () => {
    const text = encodeURIComponent(generateWhatsAppText())
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const copyResult = () => {
    navigator.clipboard.writeText(generateWhatsAppText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetAll = () => {
    setStep(1)
    setDirection(-1)
    setPropertyType('novo')
    setPropertyValueStr('')
    setCity('Icó - CE')
    setOwnsPropertyInCity(false)
    setLoteAlienado(false)
    setGrossIncomeStr('')
    setBirthDate('')
    setHasFGTS3Years(false)
    setHadSubsidy(false)
    setHasMultipleBuyers(false)
    setCaixaRelationship(false)
    setTermMonths(420)
    setResult(null)
    setSaved(false)
    setClientId('')
    setShowNewClient(false)
    setNewClientName('')
    setNewClientPhone('')
  }

  const getClientName = (cId: string) => clients.find(c => c.id === cId)?.name ?? 'Desconhecido'

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
    <div className="space-y-6 pb-12 no-print">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Calculator className="text-gold-400" size={28} />
            <span className="gradient-text">Simulador MCMV</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Simulação profissional Minha Casa, Minha Vida 2026 — {simulations.length} simulações realizadas
          </p>
        </div>
        {step === 3 && (
          <button onClick={resetAll} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
            <RotateCcw size={14} />
            Nova Simulação
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <StepIndicator current={step} total={3} />

      {/* Wizard Steps */}
      <div className="relative min-h-[500px]">
        <AnimatePresence mode="wait" custom={direction}>
          {/* ===================== STEP 1 ===================== */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full"
            >
              <div className="glass rounded-2xl p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
                <div className="text-center mb-2">
                  <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                    <Building2 size={22} className="text-gold-400" />
                    Dados do Imóvel
                  </h2>
                  <p className="text-white/40 text-sm mt-1">Informe as características do imóvel desejado</p>
                </div>

                {/* Tipo de Imóvel — Cards */}
                <div>
                  <label className="text-xs text-white/50 mb-3 block font-medium uppercase tracking-wider">Tipo de Imóvel</label>
                  <div className="grid grid-cols-3 gap-3">
                    {PROPERTY_TYPES.map(pt => {
                      const Icon = pt.icon
                      const selected = propertyType === pt.value
                      return (
                        <button
                          key={pt.value}
                          onClick={() => setPropertyType(pt.value)}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-center group ${
                            selected
                              ? 'border-gold-400/60 bg-gold-400/10 shadow-lg shadow-gold-400/10'
                              : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                          }`}
                        >
                          <Icon size={28} className={`mx-auto mb-2 transition-colors ${selected ? 'text-gold-400' : 'text-white/40 group-hover:text-white/60'}`} />
                          <p className={`text-sm font-semibold ${selected ? 'text-gold-400' : 'text-white/70'}`}>{pt.label}</p>
                          <p className="text-[11px] text-white/30 mt-1">{pt.desc}</p>
                          {selected && (
                            <motion.div
                              layoutId="property-selected"
                              className="absolute -top-1 -right-1 w-5 h-5 bg-gold-400 rounded-full flex items-center justify-center"
                            >
                              <CheckCircle size={12} className="text-black" />
                            </motion.div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Valor do Imóvel */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block font-medium uppercase tracking-wider">
                    <Banknote size={14} className="inline mr-1 -mt-0.5" />
                    Valor Aproximado do Imóvel
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={propertyValueStr}
                      onChange={e => setPropertyValueStr(fmtInputCurrency(e.target.value))}
                      placeholder="200.000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-lg font-medium focus:border-gold-400/40 focus:outline-none focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                </div>

                {/* Localização */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block font-medium uppercase tracking-wider">
                    <MapPin size={14} className="inline mr-1 -mt-0.5" />
                    Localização do Imóvel
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Icó - CE"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-gold-400/40 focus:outline-none focus:bg-white/[0.08] transition-all"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-4 pt-2">
                  <Toggle
                    value={ownsPropertyInCity}
                    onChange={setOwnsPropertyInCity}
                    label="Possui imóvel residencial nesta cidade?"
                  />
                  {propertyType === 'construcao' && (
                    <Toggle
                      value={loteAlienado}
                      onChange={setLoteAlienado}
                      label="Lote alienado/hipotecado?"
                    />
                  )}
                </div>

                {/* Botão Próximo */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={goNext}
                    disabled={!canProceedStep1}
                    className="glow-button px-8 py-3 rounded-xl text-sm flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                  >
                    Próximo
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== STEP 2 ===================== */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full"
            >
              <div className="glass rounded-2xl p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
                <div className="text-center mb-2">
                  <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                    <Users size={22} className="text-gold-400" />
                    Dados Pessoais
                  </h2>
                  <p className="text-white/40 text-sm mt-1">Informações do comprador e composição de renda</p>
                </div>

                {/* Renda */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block font-medium uppercase tracking-wider">
                    <Banknote size={14} className="inline mr-1 -mt-0.5" />
                    Renda Bruta Familiar Mensal
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={grossIncomeStr}
                      onChange={e => setGrossIncomeStr(fmtInputCurrency(e.target.value))}
                      placeholder="4.000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-lg font-medium focus:border-gold-400/40 focus:outline-none focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                  {grossIncomeStr && (
                    <p className="text-xs text-gold-400/60 mt-1.5">
                      Faixa estimada: <strong>Faixa {determineFaixa(parseInputCurrency(grossIncomeStr))}</strong>
                    </p>
                  )}
                </div>

                {/* Data de Nascimento */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block font-medium uppercase tracking-wider">
                    <Calendar size={14} className="inline mr-1 -mt-0.5" />
                    Data de Nascimento (participante mais velho)
                  </label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-gold-400/40 focus:outline-none focus:bg-white/[0.08] transition-all"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-4 pt-2">
                  <Toggle
                    value={hasFGTS3Years}
                    onChange={setHasFGTS3Years}
                    label="Possui 3 ou mais anos de FGTS?"
                  />
                  <Toggle
                    value={hadSubsidy}
                    onChange={setHadSubsidy}
                    label="Já recebeu subsídio FGTS/União?"
                  />
                  <Toggle
                    value={hasMultipleBuyers}
                    onChange={setHasMultipleBuyers}
                    label="Mais de um comprador/dependente na proposta?"
                  />
                  <Toggle
                    value={caixaRelationship}
                    onChange={setCaixaRelationship}
                    label="Possui relacionamento com a Caixa?"
                  />
                </div>

                {/* Botões */}
                <div className="flex justify-between pt-4">
                  <button
                    onClick={goBack}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Voltar
                  </button>
                  <button
                    onClick={runSimulation}
                    disabled={!canProceedStep2}
                    className="glow-button px-8 py-3 rounded-xl text-sm flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                  >
                    <Calculator size={16} />
                    Simular
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== STEP 3 — RESULTADO ===================== */}
          {step === 3 && currentResult && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="w-full space-y-6"
              ref={resultRef}
            >
              {/* Header do Resultado */}
              <div className="glass rounded-2xl p-6 md:p-8 text-center relative overflow-hidden">
                {/* Glow background */}
                <div className="absolute inset-0 bg-gradient-to-br from-gold-400/5 via-transparent to-gold-400/5 pointer-events-none" />

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/20 text-gold-400 text-xs font-medium mb-4">
                    <Landmark size={14} />
                    {currentResult.program}
                  </div>

                  <div className="mb-4">
                    <p className="text-white/40 text-sm mb-1">{currentResult.modality}</p>
                    <h2 className="text-5xl md:text-6xl font-black gradient-text tracking-tight">
                      Faixa {currentResult.faixa}
                    </h2>
                  </div>

                  <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold ${
                    currentResult.eligible
                      ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                      : 'bg-red-400/15 text-red-400 border border-red-400/30'
                  }`}>
                    {currentResult.eligible ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {currentResult.eligible ? 'Elegível ao MCMV' : 'Não Elegível'}
                  </div>

                  {!currentResult.eligible && currentResult.ineligibleReason && (
                    <p className="text-red-400/70 text-sm mt-3 max-w-md mx-auto">{currentResult.ineligibleReason}</p>
                  )}
                </div>
              </div>

              {/* Cards de Resultado */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="glass rounded-xl p-5 text-center">
                  <p className="text-xs text-white/40 mb-1">Valor do Imóvel</p>
                  <p className="text-xl font-bold">{fmtCurrency(currentResult.propertyValue)}</p>
                </div>
                <div className="glass rounded-xl p-5 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-transparent pointer-events-none" />
                  <p className="text-xs text-emerald-400/70 mb-1 relative z-10">Subsídio MCMV</p>
                  <p className="text-xl font-bold text-emerald-400 relative z-10">{fmtCurrency(currentResult.subsidy)}</p>
                </div>
                <div className="glass rounded-xl p-5 text-center">
                  <p className="text-xs text-white/40 mb-1">Valor da Entrada</p>
                  <p className="text-xl font-bold text-gold-400">{fmtCurrency(currentResult.downPayment)}</p>
                </div>
                <div className="glass rounded-xl p-5 text-center">
                  <p className="text-xs text-white/40 mb-1">Valor do Financiamento</p>
                  <p className="text-xl font-bold">{fmtCurrency(currentResult.financingAmount)}</p>
                </div>
                <div className="glass rounded-xl p-5 text-center">
                  <p className="text-xs text-white/40 mb-1">Cota de Financiamento</p>
                  <p className="text-xl font-bold">{currentResult.maxFinancingRate}%</p>
                </div>
                <div className="glass rounded-xl p-5 text-center">
                  <p className="text-xs text-white/40 mb-1">Prazo</p>
                  <p className="text-xl font-bold">{termMonths} meses</p>
                  <p className="text-xs text-white/30">{Math.floor(termMonths / 12)} anos</p>
                </div>
              </div>

              {/* Slider de Prazo */}
              <div className="glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Calendar size={16} className="text-gold-400" />
                    Ajustar Prazo do Financiamento
                  </h3>
                  <span className="text-gold-400 font-bold">
                    {termMonths} meses ({Math.floor(termMonths / 12)} anos)
                  </span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={420}
                  step={12}
                  value={termMonths}
                  onChange={e => setTermMonths(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-gold-400
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold-400 [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-gold-400/30 [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-xs text-white/30 mt-2">
                  <span>5 anos</span>
                  <span>15 anos</span>
                  <span>25 anos</span>
                  <span>35 anos</span>
                </div>
              </div>

              {/* Comparação SAC vs PRICE */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-gold-400" />
                  Comparação SAC vs PRICE
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-xs text-white/40 font-medium px-4 py-3 uppercase tracking-wider"></th>
                        <th className="text-center text-xs font-semibold px-4 py-3 uppercase tracking-wider">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-400/10 text-gold-400 border border-gold-400/20">
                            SAC
                          </span>
                        </th>
                        <th className="text-center text-xs font-semibold px-4 py-3 uppercase tracking-wider">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20">
                            PRICE
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5 text-sm text-white/60">Taxa Nominal (a.a.)</td>
                        <td className="px-4 py-3.5 text-center text-sm font-medium">{currentResult.sac.nominalRate.toFixed(2)}%</td>
                        <td className="px-4 py-3.5 text-center text-sm font-medium">{currentResult.price.nominalRate.toFixed(2)}%</td>
                      </tr>
                      <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5 text-sm text-white/60">Taxa Efetiva (a.a.)</td>
                        <td className="px-4 py-3.5 text-center text-sm font-medium">{currentResult.sac.effectiveRate.toFixed(2)}%</td>
                        <td className="px-4 py-3.5 text-center text-sm font-medium">{currentResult.price.effectiveRate.toFixed(2)}%</td>
                      </tr>
                      <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5 text-sm text-white/60">1ª Prestação</td>
                        <td className="px-4 py-3.5 text-center text-sm font-bold text-gold-400">{fmtCurrency(currentResult.sac.firstInstallment)}</td>
                        <td className="px-4 py-3.5 text-center text-sm font-bold text-blue-400">{fmtCurrency(currentResult.price.firstInstallment)}</td>
                      </tr>
                      <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5 text-sm text-white/60">Última Prestação</td>
                        <td className="px-4 py-3.5 text-center text-sm font-bold text-gold-400">{fmtCurrency(currentResult.sac.lastInstallment)}</td>
                        <td className="px-4 py-3.5 text-center text-sm font-bold text-blue-400">{fmtCurrency(currentResult.price.lastInstallment)}</td>
                      </tr>
                      <tr className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3.5 text-sm text-white/60">Total Pago</td>
                        <td className="px-4 py-3.5 text-center text-sm font-bold">{fmtCurrency(currentResult.sac.totalPaid)}</td>
                        <td className="px-4 py-3.5 text-center text-sm font-bold">{fmtCurrency(currentResult.price.totalPaid)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {currentResult.sac.totalPaid < currentResult.price.totalPaid && (
                  <div className="mt-4 p-3 rounded-lg bg-gold-400/5 border border-gold-400/10 text-center">
                    <p className="text-xs text-gold-400">
                      💡 No sistema SAC você economiza <strong>{fmtCurrency(currentResult.price.totalPaid - currentResult.sac.totalPaid)}</strong> em relação ao PRICE
                    </p>
                  </div>
                )}
              </div>

              {/* Gráfico Evolução das Parcelas */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                  <TrendingUp size={20} className="text-gold-400" />
                  Evolução das Parcelas
                </h3>
                <p className="text-xs text-white/30 mb-6">Comparativo mensal entre SAC (decrescente) e PRICE (constante)</p>
                <div className="h-72 md:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="sacGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F5C518" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#F5C518" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="month"
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                        tickFormatter={(v: number) => `${Math.floor(v / 12)}a`}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.2)"
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                        tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0e0e14',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          fontSize: '12px',
                        }}
                        formatter={(value: any, name: any) => [fmtCurrency(Number(value)), name === 'sac' ? 'SAC' : 'PRICE']}
                        labelFormatter={(label: any) => `Mês ${label}`}
                      />
                      <Area type="monotone" dataKey="sac" stroke="#F5C518" strokeWidth={2.5} fill="url(#sacGrad)" name="sac" dot={false} />
                      <Area type="monotone" dataKey="price" stroke="#60a5fa" strokeWidth={2.5} fill="url(#priceGrad)" name="price" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gold-400" />
                    <span className="text-xs text-white/50">SAC (decrescente)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                    <span className="text-xs text-white/50">PRICE (constante)</span>
                  </div>
                </div>
              </div>

              {/* Composição da 1ª Prestação */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Shield size={16} className="text-gold-400" />
                    Composição da 1ª Prestação (SAC)
                  </h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0e0e14',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontSize: '12px',
                          }}
                          formatter={(value: any) => fmtCurrency(Number(value))}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {pieData.map((item, i) => (
                      <div key={item.name} className="flex justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                          <span className="text-white/50">{item.name}</span>
                        </span>
                        <span className="font-medium">{fmtCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumo rápido */}
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Landmark size={16} className="text-gold-400" />
                    Resumo da Simulação
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-white/40">Programa</span>
                      <span className="text-xs font-medium text-right max-w-[200px]">{currentResult.program}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-white/40">Modalidade</span>
                      <span className="text-xs font-medium">{currentResult.modality}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-white/40">Faixa MCMV</span>
                      <span className="text-xs font-bold gradient-text">Faixa {currentResult.faixa}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-white/40">Renda Familiar</span>
                      <span className="text-xs font-medium">{fmtCurrency(parseInputCurrency(grossIncomeStr))}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-white/40">Imóvel</span>
                      <span className="text-xs font-medium">{fmtCurrency(currentResult.propertyValue)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-white/40">Subsídio</span>
                      <span className="text-xs font-medium text-emerald-400">{fmtCurrency(currentResult.subsidy)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-white/40">Entrada</span>
                      <span className="text-xs font-medium text-gold-400">{fmtCurrency(currentResult.downPayment)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-xs text-white/40">Financiamento</span>
                      <span className="text-xs font-medium">{fmtCurrency(currentResult.financingAmount)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-white/40">Localização</span>
                      <span className="text-xs font-medium">{city}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="glass rounded-2xl p-6 space-y-5">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Save size={16} className="text-gold-400" />
                  Salvar e Compartilhar
                </h3>

                {/* Vincular cliente */}
                <div className="space-y-3">
                  <p className="text-xs text-white/40">Vincular simulação a um cliente</p>
                  <div className="flex gap-3 flex-wrap">
                    <select
                      value={clientId}
                      onChange={e => { setClientId(e.target.value); setShowNewClient(false) }}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none flex-1 min-w-[200px]"
                    >
                      <option value="">Selecionar cliente...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => { setShowNewClient(!showNewClient); setClientId('') }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <UserPlus size={14} />
                      Novo Cliente
                    </button>
                  </div>

                  {showNewClient && (
                    <div className="grid md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={newClientName}
                        onChange={e => setNewClientName(e.target.value)}
                        placeholder="Nome completo"
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newClientPhone}
                        onChange={e => setNewClientPhone(e.target.value)}
                        placeholder="Telefone (88999...)"
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saved || createSimulation.isPending || (!clientId && !(showNewClient && newClientName && newClientPhone))}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      saved
                        ? 'bg-emerald-400/20 text-emerald-400 cursor-default border border-emerald-400/30'
                        : 'glow-button disabled:opacity-30 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none'
                    }`}
                  >
                    {saved ? <><CheckCircle size={16} /> Salvo no CRM</> :
                     createSimulation.isPending ? 'Salvando...' :
                     <><Save size={16} /> Salvar no CRM</>}
                  </button>

                  <button
                    onClick={sendWhatsApp}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/20 transition-all"
                  >
                    <Send size={16} />
                    Enviar por WhatsApp
                  </button>

                  <button
                    onClick={copyResult}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <Copy size={16} />
                    {copied ? 'Copiado!' : 'Copiar Texto'}
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <Printer size={16} />
                    Salvar PDF / Imprimir
                  </button>
                </div>
              </div>

              {/* Tabela MCMV Referência */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-gold-400" />
                  Tabela de Referência MCMV 2026
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-[11px] text-white/40 font-medium px-4 py-2 uppercase tracking-wider">Faixa</th>
                        <th className="text-left text-[11px] text-white/40 font-medium px-4 py-2 uppercase tracking-wider">Renda Máx.</th>
                        <th className="text-left text-[11px] text-white/40 font-medium px-4 py-2 uppercase tracking-wider">Subsídio Máx.</th>
                        <th className="text-left text-[11px] text-white/40 font-medium px-4 py-2 uppercase tracking-wider">Taxa Juros</th>
                        <th className="text-left text-[11px] text-white/40 font-medium px-4 py-2 uppercase tracking-wider">Imóvel Máx.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Object.entries(MCMV_CONFIG) as [MCMVFaixa, (typeof MCMV_CONFIG)[MCMVFaixa]][]).map(([f, cfg]) => (
                        <tr
                          key={f}
                          className={`border-b border-white/5 transition-colors ${
                            currentResult.faixa === f ? 'bg-gold-400/5' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="px-4 py-3 text-sm">
                            <span className={currentResult.faixa === f ? 'gradient-text font-bold' : 'text-white/70'}>
                              Faixa {f}
                            </span>
                            {currentResult.faixa === f && (
                              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-400 border border-gold-400/20">
                                Sua faixa
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-white/70">{fmtCurrency(cfg.maxIncome)}</td>
                          <td className="px-4 py-3 text-sm text-emerald-400">{fmtCurrency(cfg.maxSubsidy)}</td>
                          <td className="px-4 py-3 text-sm text-blue-400">{cfg.baseRate === cfg.maxRate ? `${cfg.baseRate}%` : `${cfg.baseRate}% - ${cfg.maxRate}%`} a.a.</td>
                          <td className="px-4 py-3 text-sm text-white/70">{fmtCurrency(cfg.maxValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Histórico */}
              {simulations.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Calculator size={16} className="text-gold-400" />
                    Últimas Simulações
                  </h3>
                  <div className="space-y-2">
                    {simulations.slice(0, 5).map(sim => (
                      <div key={sim.id} className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                        <Calculator size={16} className="text-gold-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{getClientName(sim.client_id)}</p>
                          <p className="text-xs text-white/40">
                            Renda: {fmtCurrency(sim.gross_income)} | Faixa {sim.faixa} | {sim.city}
                          </p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          sim.status === 'aprovado' ? 'bg-emerald-400/10 text-emerald-400' :
                          sim.status === 'reprovado' ? 'bg-red-400/10 text-red-400' :
                          'bg-gold-400/10 text-gold-400'
                        }`}>
                          {sim.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="text-center py-4">
                <p className="text-[11px] text-white/20 max-w-2xl mx-auto leading-relaxed">
                  Simulação ilustrativa com base nas regras do programa Minha Casa, Minha Vida 2026.
                  Os valores apresentados são estimativas e podem variar conforme análise de crédito da Caixa Econômica Federal.
                  Taxas, subsídios e limites sujeitos a alterações sem aviso prévio.
                  TJA7 Empreendimentos — Icó/CE
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

    {currentResult && (
      <PrintableReport
        input={{
          propertyType,
          propertyValue: parseInputCurrency(propertyValueStr),
          city,
          loteAlienado,
          grossIncome: parseInputCurrency(grossIncomeStr),
          birthDate,
          hasFGTS3Years,
          hadSubsidy,
          hasMultipleBuyers,
          caixaRelationship,
        }}
        result={currentResult}
        termMonths={termMonths}
      />
    )}
    </>
  )
}
