import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import confetti from 'canvas-confetti'
import {
  Calculator, TrendingDown, Banknote, Shield, Calendar,
  CheckCircle, XCircle, Phone, Percent, Share2,
  ArrowDown, Star, Download, FileText, Users, Award,
  Building2, Clock, Check, Sparkles,
} from 'lucide-react'

// ============================================
// Types
// ============================================

interface SimulationData {
  id: string
  gross_income: number
  income_type: string | null
  property_value: number
  property_type: string | null
  city: string
  faixa: string
  subsidy: number
  interest_rate: number
  max_installment: number
  financing_amount: number
  max_term_months: number
  status: string
  created_at: string
  client: {
    name: string
    phone: string
  } | null
}

// ============================================
// MCMV Calculator
// ============================================

// Tabela de referência (valores médios NE não-cotista) — usada pra exibição
const MCMV_TABLE: Record<string, { maxIncome: number; maxSubsidy: number; interestRate: number; maxValue: number }> = {
  '1': { maxIncome: 2850, maxSubsidy: 55000, interestRate: 4.5, maxValue: 210000 },
  '2': { maxIncome: 4700, maxSubsidy: 40000, interestRate: 5.25, maxValue: 210000 },
  '3': { maxIncome: 8600, maxSubsidy: 0, interestRate: 8.16, maxValue: 350000 },
  '4': { maxIncome: 12000, maxSubsidy: 0, interestRate: 10.50, maxValue: 500000 },
}

function calculateInstallments(financingAmount: number, interestRate: number, termMonths: number) {
  const monthlyRate = interestRate / 100 / 12
  const amortSac = financingAmount / termMonths
  const firstInterestSac = financingAmount * monthlyRate
  const firstInstallmentSac = amortSac + firstInterestSac
  const lastInstallmentSac = amortSac + (amortSac * monthlyRate)
  const coefficient = monthlyRate > 0
    ? (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1)
    : 1 / termMonths
  const installmentPrice = financingAmount * coefficient
  const totalSac = ((firstInstallmentSac + lastInstallmentSac) / 2) * termMonths
  const totalPrice = installmentPrice * termMonths

  return {
    sac: { first: Math.round(firstInstallmentSac * 100) / 100, last: Math.round(lastInstallmentSac * 100) / 100, total: Math.round(totalSac) },
    price: { installment: Math.round(installmentPrice * 100) / 100, total: Math.round(totalPrice) },
  }
}

// ============================================
// Helpers
// ============================================

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtDecimal = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

const faixaInfo: Record<string, { label: string; color: string; bg: string; border: string }> = {
  '1': { label: 'Faixa 1', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  '2': { label: 'Faixa 2', color: '#F5C518', bg: 'rgba(245,197,24,0.08)', border: 'rgba(245,197,24,0.2)' },
  '3': { label: 'Faixa 3', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  '4': { label: 'Faixa 4', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
}

// Aluguéis médios por cidade (referência)
const ALUGUEL_MEDIO: Record<string, number> = {
  'Ico': 800, 'Juazeiro do Norte': 1100, 'Crato': 900, 'Barbalha': 850,
  'Fortaleza': 1500, 'Sobral': 950, 'default': 900,
}

// ============================================
// FadeIn on scroll
// ============================================

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ============================================
// Confetti Cannon (canvas-confetti)
// ============================================

function fireConfettiCannon() {
  try {
    const colors = ['#1e90ff', '#00bfff', '#4169e1', '#87ceeb', '#F5C518', '#FFD700', '#29b6f6']
    confetti({ particleCount: 80, spread: 70, startVelocity: 55, colors, origin: { x: 0, y: 0.6 }, angle: 60, gravity: 0.8, ticks: 400 })
    confetti({ particleCount: 80, spread: 70, startVelocity: 55, colors, origin: { x: 1, y: 0.6 }, angle: 120, gravity: 0.8, ticks: 400 })
    setTimeout(() => confetti({ particleCount: 100, spread: 120, startVelocity: 45, colors, origin: { x: 0.5, y: 0.3 }, gravity: 1, ticks: 400 }), 250)
    const interval = setInterval(() => {
      confetti({ particleCount: 3, angle: 60, spread: 55, startVelocity: 50, colors, origin: { x: 0, y: 0.6 }, gravity: 0.8, ticks: 300 })
      confetti({ particleCount: 3, angle: 120, spread: 55, startVelocity: 50, colors, origin: { x: 1, y: 0.6 }, gravity: 0.8, ticks: 300 })
    }, 100)
    setTimeout(() => confetti({ particleCount: 50, spread: 160, startVelocity: 30, colors: ['#F5C518', '#FFD700', '#FFA500'], origin: { x: 0.5, y: 0 }, gravity: 0.5, ticks: 350, shapes: ['star'], scalar: 1.3 }), 1500)
    setTimeout(() => clearInterval(interval), 5000)
  } catch (e) {
    console.warn('Confetti error:', e)
  }
}


// ============================================
// Component
// ============================================

export default function SimulacaoReport() {
  const { id } = useParams<{ id: string }>()
  const [sim, setSim] = useState<SimulationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({})
  const confettiFired = useRef(false)

  useEffect(() => {
    if (!id) return
    loadSimulation(id)
  }, [id])

  // OG tags via document.title
  useEffect(() => {
    if (!sim) return
    const calc = calculateInstallments(sim.financing_amount, sim.interest_rate, sim.max_term_months || 420)
    document.title = `Simulação MCMV — Parcela a partir de ${fmtDecimal(calc.price.installment)}/mês | TJA7`
  }, [sim])

  async function loadSimulation(simId: string) {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('tja7_simulations')
        .select('*, client:tja7_clients(name, phone)')
        .eq('id', simId)
        .single()

      if (err || !data) { setError('Simulação não encontrada'); return }
      setSim({ ...data, client: Array.isArray(data.client) ? data.client[0] : data.client } as SimulationData)
      if (!confettiFired.current) { confettiFired.current = true; fireConfettiCannon() }
    } catch { setError('Erro ao carregar') }
    finally { setLoading(false) }
  }

  function toggleDoc(key: string) {
    setCheckedDocs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function handleShare() {
    const url = window.location.href
    const text = sim?.client?.name
      ? `${sim.client.name}, olha a simulação do nosso financiamento MCMV!`
      : 'Olha a simulação do financiamento MCMV!'
    if (navigator.share) {
      navigator.share({ title: 'Simulação MCMV — TJA7', text, url }).catch(() => {})
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`
      window.open(waUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06060a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#F5C518]/30 border-t-[#F5C518] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Carregando sua simulação...</p>
        </div>
      </div>
    )
  }

  if (error || !sim) {
    return (
      <div className="min-h-screen bg-[#06060a] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <XCircle size={48} className="mx-auto text-red-400/50 mb-4" />
          <h1 className="text-lg font-bold text-white mb-2">Simulação não encontrada</h1>
          <p className="text-sm text-white/40">O link pode estar expirado ou incorreto.</p>
          <a href="https://wa.me/5588997454861" className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[#25D366]/10 text-[#25D366] rounded-xl text-sm font-medium hover:bg-[#25D366]/20 transition-all">
            <Phone size={16} /> Falar com a TJA7
          </a>
        </div>
      </div>
    )
  }

  const faixa = faixaInfo[sim.faixa] || faixaInfo['1']
  const config = MCMV_TABLE[sim.faixa] || MCMV_TABLE['1']
  const termMonths = sim.max_term_months || 420
  const eligible = sim.property_value <= config.maxValue
  const economia = sim.subsidy > 0 ? sim.subsidy : 0
  const percentSubsidy = sim.property_value > 0 ? Math.round((sim.subsidy / sim.property_value) * 100) : 0

  // Cota máxima de financiamento: 80% do valor do imóvel (novo NE)
  const cotaMaxima = 0.80
  const maxFinanciavel = Math.round(sim.property_value * cotaMaxima)
  const valorDisponivel = Math.max(0, sim.property_value - economia) // valor após subsídio
  const valorFinanciado = Math.min(maxFinanciavel, valorDisponivel) // o menor entre cota e disponível
  const entrada = Math.max(0, sim.property_value - valorFinanciado - economia)

  const calc = calculateInstallments(valorFinanciado, sim.interest_rate, termMonths)
  const aluguelRef = ALUGUEL_MEDIO[sim.city] || ALUGUEL_MEDIO['default']
  const economiaAluguel = aluguelRef - calc.price.installment
  const firstName = sim.client?.name?.split(' ')[0] || 'Você'

  // Barra visual SAC vs PRICE
  const maxParcela = Math.max(calc.sac.first, calc.price.installment)
  const sacBarWidth = Math.round((calc.sac.first / maxParcela) * 100)
  const priceBarWidth = Math.round((calc.price.installment / maxParcela) * 100)

  // Progresso: etapa atual
  const steps = [
    { label: 'Simulação', done: true },
    { label: 'Documentação', done: false },
    { label: 'Aprovação Caixa', done: false },
    { label: 'Chaves', done: false },
  ]

  // Documentos necessários
  const docs = [
    { key: 'rg', label: 'RG ou CNH (cópia)' },
    { key: 'cpf', label: 'CPF' },
    { key: 'renda', label: 'Comprovante de renda (3 últimos meses)' },
    { key: 'residencia', label: 'Comprovante de residência' },
    { key: 'fgts', label: 'Extrato do FGTS (se tiver)' },
    { key: 'casamento', label: 'Certidão de casamento ou nascimento' },
    { key: 'irpf', label: 'Declaração IRPF (se declarar)' },
  ]

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      {/* confetti disparado via canvas-confetti — sem componente */}
      {/* ============ HEADER ============ */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#F5C518]/10 via-[#F5C518]/3 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5C518]/5 rounded-full blur-[100px]" />

        <div className="relative max-w-lg mx-auto px-5 pt-8 pb-6">
          <div className="flex items-center justify-between mb-8">
            <img src="/img/tja7-logo.png" alt="TJA7" className="h-10" />
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[11px] hover:bg-white/10 transition-all"
            >
              <Share2 size={13} /> Compartilhar
            </button>
          </div>

          {/* 1. HEADLINE EMOCIONAL */}
          <FadeIn>
            <div className="mb-2">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold mb-4"
                style={{ background: faixa.bg, border: `1px solid ${faixa.border}`, color: faixa.color }}
              >
                <Shield size={11} /> MCMV 2026 — {faixa.label}
              </div>

              <h1 className="text-2xl font-black leading-tight">
                {economia > 0 ? (
                  <>{firstName}, ótima notícia! Você pode ter até{' '}
                    <span className="text-emerald-400">{fmt(economia)} de subsídio</span>{' '}
                    e uma parcela que cabe no bolso!
                  </>
                ) : (
                  <>{firstName}, sua casa própria{' '}
                    <span style={{ color: faixa.color }}>está mais perto do que você imagina!</span>
                  </>
                )}
              </h1>

              {/* 2. COMPARAÇÃO COM ALUGUEL */}
              {economiaAluguel > 0 && (
                <p className="text-sm text-white/50 mt-2">
                  Parcela estimada menor que o aluguel médio em {sim.city || 'Icó'} — <span className="text-emerald-400 font-semibold">o imóvel será seu!</span>
                </p>
              )}
              {economiaAluguel <= 0 && (
                <p className="text-sm text-white/50 mt-2">
                  Valor similar a um aluguel em {sim.city || 'Icó'}, mas o imóvel será <span className="text-emerald-400 font-semibold">seu!</span>
                </p>
              )}
            </div>
          </FadeIn>

          {/* 5. BARRA DE PROGRESSO */}
          <FadeIn delay={100}>
            <div className="mt-6 flex items-center gap-1">
              {steps.map((step, i) => (
                <div key={step.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                        step.done
                          ? 'bg-emerald-400 text-black'
                          : 'bg-white/[0.06] text-white/20'
                      }`}
                    >
                      {step.done ? <Check size={12} /> : i + 1}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`flex-1 h-[2px] mx-1 ${step.done ? 'bg-emerald-400/40' : 'bg-white/[0.06]'}`} />
                    )}
                  </div>
                  <span className={`text-[9px] ${step.done ? 'text-emerald-400/80' : 'text-white/20'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 pb-10 space-y-5">

        {/* ============ ECONOMIA / SUBSÍDIO ============ */}
        {economia > 0 && (
          <FadeIn delay={150}>
            <div className="relative rounded-2xl p-5 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))' }}>
              <div className="absolute top-3 right-3"><Star size={32} className="text-emerald-400/10" /></div>
              <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest mb-1">O governo paga por você</p>
              <p className="text-3xl font-black text-emerald-400">{fmt(economia)}</p>
              <p className="text-xs text-white/40 mt-1">
                Subsídio de {percentSubsidy}% do valor do imóvel — você financiou {fmt(sim.financing_amount)} ao invés de {fmt(sim.property_value)}
              </p>
            </div>
          </FadeIn>
        )}

        {/* ============ DADOS DA SIMULAÇÃO ============ */}
        <FadeIn delay={200}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Banknote, label: 'Valor Financiado', value: fmt(valorFinanciado), sub: `até ${Math.round(cotaMaxima * 100)}% do imóvel` },
              { icon: Percent, label: 'Taxa de Juros', value: `${sim.interest_rate}% a.a.`, sub: `${(sim.interest_rate / 12).toFixed(2)}% ao mês` },
              { icon: Calendar, label: 'Prazo', value: `${termMonths} meses`, sub: `${Math.round(termMonths / 12)} anos` },
            ].map(card => (
              <div key={card.label} className="rounded-xl p-4 bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 mb-2">
                  <card.icon size={13} className="text-white/30" />
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">{card.label}</span>
                </div>
                <p className="text-lg font-bold">{card.value}</p>
                <p className="text-[10px] text-white/20">{card.sub}</p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* ============ COMPOSIÇÃO ============ */}
        {/* ============ COMPOSIÇÃO COMPLETA ============ */}
        <FadeIn delay={250}>
          <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.06]">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calculator size={14} /> Composição do Financiamento
            </h3>
            <div className="space-y-2.5">
              {economia > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-400/80 flex items-center gap-1"><ArrowDown size={12} /> Subsídio MCMV estimado</span>
                  <span className="text-sm font-medium text-emerald-400">- {fmt(economia)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">Financiamento Caixa (até {Math.round(cotaMaxima * 100)}%)</span>
                <span className="text-sm font-medium" style={{ color: faixa.color }}>{fmt(valorFinanciado)}</span>
              </div>
              {entrada > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Entrada estimada</span>
                  <span className="text-sm font-medium text-white/70">{fmt(entrada)}</span>
                </div>
              )}
              <div className="border-t border-white/[0.06] pt-2.5 text-[10px] text-white/25 text-center">
                Caixa financia até {Math.round(cotaMaxima * 100)}% do valor do imóvel para imóveis novos na região Nordeste
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ============ 3. GRÁFICO VISUAL SAC vs PRICE ============ */}
        <FadeIn delay={300}>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <TrendingDown size={14} /> Suas Parcelas
            </h3>

            {/* PRICE - destaque */}
            <div className="rounded-2xl p-5 border-2 relative overflow-hidden" style={{ borderColor: faixa.border, background: `linear-gradient(135deg, ${faixa.bg}, transparent)` }}>
              <div className="absolute top-3 right-3">
                <span className="text-[9px] px-2 py-1 rounded-full font-bold" style={{ background: faixa.bg, color: faixa.color, border: `1px solid ${faixa.border}` }}>
                  Mais popular
                </span>
              </div>
              <p className="text-sm font-semibold text-white mb-1">Tabela PRICE</p>
              <p className="text-[10px] text-white/30 mb-3">Parcela fixa do início ao fim</p>

              <p className="text-3xl font-black" style={{ color: faixa.color }}>{fmtDecimal(calc.price.installment)}<span className="text-sm font-normal text-white/30">/mês</span></p>

              {/* Barra visual */}
              <div className="mt-3 w-full h-3 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${priceBarWidth}%`, background: faixa.color }} />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-white/25">
                <span>Compromete {Math.round((calc.price.installment / sim.gross_income) * 100)}% da renda</span>
                <span>Total: {fmt(calc.price.total)}</span>
              </div>
            </div>

            {/* SAC */}
            <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-white">Tabela SAC</p>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20">Parcela decresce</span>
              </div>
              <p className="text-[10px] text-white/30 mb-3">Começa maior mas diminui todo mês</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-white/30 mb-0.5">Primeira parcela</p>
                  <p className="text-xl font-bold text-blue-400">{fmtDecimal(calc.sac.first)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 mb-0.5">Última parcela</p>
                  <p className="text-xl font-bold text-white/40">{fmtDecimal(calc.sac.last)}</p>
                </div>
              </div>

              {/* Barra visual com gradiente */}
              <div className="mt-3 w-full h-3 bg-white/[0.04] rounded-full overflow-hidden relative">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${sacBarWidth}%`, background: 'linear-gradient(90deg, #3b82f6, rgba(59,130,246,0.3))' }} />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-white/25">
                <span>Compromete {Math.round((calc.sac.first / sim.gross_income) * 100)}% no início</span>
                <span>Total: {fmt(calc.sac.total)}</span>
              </div>
            </div>

            {/* Diferença */}
            {calc.sac.total < calc.price.total && (
              <div className="text-center py-2">
                <p className="text-[11px] text-emerald-400/60">
                  Na tabela SAC você economiza <span className="font-bold text-emerald-400">{fmt(calc.price.total - calc.sac.total)}</span> no total do financiamento
                </p>
              </div>
            )}
          </div>
        </FadeIn>

        {/* ============ ELEGIBILIDADE ============ */}
        <FadeIn delay={350}>
          <div className={`rounded-2xl p-5 border ${eligible ? 'bg-emerald-400/[0.03] border-emerald-400/20' : 'bg-red-400/[0.03] border-red-400/20'}`}>
            <div className="flex items-start gap-3">
              {eligible ? <CheckCircle size={24} className="text-emerald-400 flex-shrink-0 mt-0.5" /> : <XCircle size={24} className="text-red-400 flex-shrink-0 mt-0.5" />}
              <div>
                <p className={`text-sm font-semibold ${eligible ? 'text-emerald-400' : 'text-red-400'}`}>
                  {eligible ? 'Você está elegível ao MCMV 2026!' : 'Valor acima do limite da faixa'}
                </p>
                <p className="text-xs text-white/40 mt-1">
                  {eligible
                    ? `Imóvel dentro do limite de ${fmt(config.maxValue)} da ${faixa.label}. Próximo passo: reunir documentação.`
                    : `O limite para a ${faixa.label} é de ${fmt(config.maxValue)}. Considere um imóvel de menor valor.`
                  }
                </p>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ============ 10. SELOS DE CONFIANÇA ============ */}
        <FadeIn delay={400}>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Building2, value: '80+', label: 'Casas construídas' },
              { icon: Clock, value: '7 anos', label: 'De experiência' },
              { icon: Award, value: 'CRECI-CE', label: '17.398-F' },
            ].map(s => (
              <div key={s.label} className="text-center py-3 px-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <s.icon size={18} className="mx-auto text-[#F5C518]/40 mb-1.5" />
                <p className="text-sm font-bold text-white/80">{s.value}</p>
                <p className="text-[9px] text-white/25">{s.label}</p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* ============ 4. PROVA SOCIAL ============ */}
        <FadeIn delay={450}>
          <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.06]">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users size={14} /> Quem já realizou o sonho
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Ana Paula', city: 'Icó', text: 'Achei que nunca ia conseguir comprar minha casa. A TJA7 facilitou tudo, do financiamento à entrega das chaves!' },
                { name: 'Francisco José', city: 'Orós', text: 'O subsídio do MCMV fez toda a diferença. Pago menos que o aluguel que eu pagava antes.' },
                { name: 'Márcia e João', city: 'Icó', text: 'Em 6 meses saímos do aluguel. O Thyago acompanhou cada etapa. Super recomendo!' },
              ].map(dep => (
                <div key={dep.name} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F5C518]/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={12} className="text-[#F5C518]/50" />
                  </div>
                  <div>
                    <p className="text-[11px] text-white/60 leading-relaxed">"{dep.text}"</p>
                    <p className="text-[10px] text-white/25 mt-1 font-medium">{dep.name} — {dep.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* ============ 6. CHECKLIST DE DOCUMENTOS ============ */}
        <FadeIn delay={500}>
          <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.06]">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1 flex items-center gap-2">
              <FileText size={14} /> Documentos Necessários
            </h3>
            <p className="text-[10px] text-white/20 mb-4">Marque os que você já tem em mãos</p>
            <div className="space-y-2">
              {docs.map(doc => (
                <button
                  key={doc.key}
                  onClick={() => toggleDoc(doc.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    checkedDocs[doc.key]
                      ? 'bg-emerald-400/[0.06] border border-emerald-400/20'
                      : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                    checkedDocs[doc.key] ? 'bg-emerald-400 text-black' : 'bg-white/[0.06]'
                  }`}>
                    {checkedDocs[doc.key] && <Check size={12} />}
                  </div>
                  <span className={`text-sm ${checkedDocs[doc.key] ? 'text-white/60 line-through' : 'text-white/50'}`}>
                    {doc.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/15 mt-3 text-center">
              {Object.values(checkedDocs).filter(Boolean).length}/{docs.length} documentos prontos
            </p>
          </div>
        </FadeIn>

        {/* ============ TABELA MCMV ============ */}
        <FadeIn delay={550}>
          <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.06]">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Tabela MCMV 2026</h3>
            <div className="space-y-2">
              {Object.entries(MCMV_TABLE).map(([f, cfg]) => {
                const isActive = f === sim.faixa
                const fi = faixaInfo[f]
                return (
                  <div
                    key={f}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                    style={{ background: isActive ? fi.bg : 'transparent', border: isActive ? `1px solid ${fi.border}` : '1px solid transparent' }}
                  >
                    <span className="text-xs font-bold w-14" style={{ color: isActive ? fi.color : 'rgba(255,255,255,0.3)' }}>Faixa {f}</span>
                    <div className="flex-1 grid grid-cols-3 gap-2 text-[10px]">
                      <span className="text-white/40">até {fmt(cfg.maxIncome)}</span>
                      <span className={cfg.maxSubsidy > 0 ? 'text-emerald-400/60' : 'text-white/20'}>{cfg.maxSubsidy > 0 ? `Sub. ${fmt(cfg.maxSubsidy)}` : 'Sem sub.'}</span>
                      <span className="text-white/40">{cfg.interestRate}% a.a.</span>
                    </div>
                    {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: fi.bg, color: fi.color, border: `1px solid ${fi.border}` }}>Você</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </FadeIn>

        {/* ============ CTA PRINCIPAL ============ */}
        <FadeIn delay={600}>
          <div className="space-y-3">
            <a
              href="https://wa.me/5588997454861?text=Oi%20Jenuc%C3%ADe%2C%20fiz%20uma%20simula%C3%A7%C3%A3o%20MCMV%20e%20quero%20dar%20continuidade!"
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #F5C518, #d4a410)', color: '#06060a' }}
            >
              <Phone size={18} /> Falar com Jenucíê — Agendar Visita
            </a>

            {/* 8. BOTÃO COMPARTILHAR */}
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-medium text-white/40 border border-white/[0.06] hover:bg-white/[0.03] transition-all active:scale-[0.98]"
            >
              <Share2 size={14} /> Enviar para cônjuge ou familiar
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-medium text-white/20 hover:text-white/30 transition-all"
            >
              <Download size={14} /> Salvar como PDF
            </button>
          </div>
        </FadeIn>

        {/* ============ FOOTER ============ */}
        <footer className="text-center pt-6 pb-4 border-t border-white/[0.04]">
          <img src="/img/tja7-logo.png" alt="TJA7" className="h-8 mx-auto mb-3 opacity-40" />
          <p className="text-[10px] text-white/20 max-w-sm mx-auto leading-relaxed">
            Simulação ilustrativa com base nas regras MCMV 2026. Valores estimados sujeitos a análise de crédito da Caixa Econômica Federal.
          </p>
          <p className="text-[10px] text-white/15 mt-2">TJA7 Empreendimentos — Icó/CE — Correspondente Caixa</p>
          <p className="text-[10px] text-white/10 mt-1">Gerado em {fmtDate(sim.created_at)}</p>
        </footer>
      </div>

      <style>{`
        @media print {
          body { background: #06060a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          * { color-adjust: exact !important; }
        }
      `}</style>
    </div>
  )
}
