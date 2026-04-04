import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HardHat, Calculator, Package, Building2, MapPin, Truck, Box,
  Lock, ArrowRight, Users, ClipboardList, Zap, CheckCircle, Home,
  TrendingUp
} from 'lucide-react'
import { useClients } from '../../hooks/useClients'
import { useSimulations } from '../../hooks/useSimulations'
import { useConstructions } from '../../hooks/useConstructions'
import { useProperties } from '../../hooks/useProperties'
import { useLots } from '../../hooks/useLots'
import { useMaterials } from '../../hooks/useMaterials'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: 'easeOut' as const },
  }),
}

type CardStatus = 'operacional' | 'iniciando' | 'em_breve' | 'planejado'

interface BusinessCard {
  id: string
  icon: typeof HardHat
  color: string
  title: string
  description: string
  status: CardStatus
  link?: string
  linkLabel?: string
  stats: { label: string; value: string | number }[]
}

function StatusBadge({ status }: { status: CardStatus }) {
  const config = {
    operacional: { label: 'Operacional', bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    iniciando: { label: 'Iniciando', bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: 'bg-yellow-400' },
    em_breve: { label: 'Em breve', bg: 'bg-purple-500/15', text: 'text-purple-400', dot: 'bg-purple-400' },
    planejado: { label: 'Planejado', bg: 'bg-gray-500/15', text: 'text-gray-500', dot: 'bg-gray-500' },
  }
  const c = config[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'operacional' ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  )
}

export default function Ecossistema() {
  const { clients } = useClients()
  const { simulations } = useSimulations()
  const { constructions } = useConstructions()
  const { properties } = useProperties()
  const { lots } = useLots()
  const { materials } = useMaterials()

  const obrasAtivas = constructions.filter(c => !c.actual_end).length
  const obrasEntregues = constructions.filter(c => c.actual_end).length
  const simTotal = simulations.length
  const simAprovadas = simulations.filter(s => s.status === 'aprovado').length
  const totalProdutos = materials.length
  const valorEstoque = materials.reduce((sum, m) => sum + (m.price * m.stock_qty), 0)
  const imoveisDisponiveis = properties.filter(p => p.status === 'disponivel').length
  const imoveisVendidos = properties.filter(p => p.status === 'vendido').length
  const lotesDisponiveis = lots.filter(l => l.status === 'disponivel').length
  const lotesVendidos = lots.filter(l => l.status === 'vendido').length

  const cards: BusinessCard[] = [
    {
      id: 'construcao',
      icon: HardHat,
      color: '#fb923c',
      title: 'Construcao Civil',
      description: 'Construcao de casas MCMV e alto padrao. +80 casas construidas, +100 projetos.',
      status: 'operacional',
      link: '/app/obras',
      linkLabel: 'Ver Obras',
      stats: [
        { label: 'Obras ativas', value: obrasAtivas },
        { label: 'Entregues', value: obrasEntregues },
      ],
    },
    {
      id: 'correspondente',
      icon: Calculator,
      color: '#F5C518',
      title: 'Correspondente Caixa',
      description: 'Simulacao e aprovacao de financiamento MCMV via correspondente bancario Caixa.',
      status: 'operacional',
      link: '/app/simulacoes',
      linkLabel: 'Ver Simulacoes',
      stats: [
        { label: 'Total simulacoes', value: simTotal },
        { label: 'Aprovadas', value: simAprovadas },
      ],
    },
    {
      id: 'loja',
      icon: Package,
      color: '#c084fc',
      title: 'Loja de Materiais',
      description: 'Loja de material de construcao acoplada ao escritorio. Estoque integrado.',
      status: 'operacional',
      link: '/app/materiais',
      linkLabel: 'Ver Estoque',
      stats: [
        { label: 'Produtos', value: totalProdutos },
        { label: 'Valor estoque', value: `R$ ${valorEstoque.toLocaleString('pt-BR')}` },
      ],
    },
    {
      id: 'corretagem',
      icon: Building2,
      color: '#60a5fa',
      title: 'Corretagem de Imoveis',
      description: 'Venda de imoveis prontos e em construcao. Thyago Nunes + 3 vendedores.',
      status: 'operacional',
      link: '/app/imoveis',
      linkLabel: 'Ver Imoveis',
      stats: [
        { label: 'Disponiveis', value: imoveisDisponiveis },
        { label: 'Vendidos', value: imoveisVendidos },
      ],
    },
    {
      id: 'loteamento',
      icon: MapPin,
      color: '#34d399',
      title: 'Loteamento',
      description: 'Venda de lotes em loteamentos proprios. Cidade Nova e Sol Nascente.',
      status: 'iniciando',
      link: '/app/lotes',
      linkLabel: 'Ver Lotes',
      stats: [
        { label: 'Disponiveis', value: lotesDisponiveis },
        { label: 'Vendidos', value: lotesVendidos },
      ],
    },
    {
      id: 'cacambas',
      icon: Truck,
      color: '#f472b6',
      title: 'Cacambas de Entulho',
      description: 'Servico de cacambas para remocao de entulho de obras. Integrado ao acompanhamento de construcoes.',
      status: 'em_breve',
      stats: [
        { label: 'Status', value: 'Em planejamento' },
      ],
    },
    {
      id: 'blocos',
      icon: Box,
      color: '#9ca3af',
      title: 'Franquia de Blocos',
      description: 'Novo sistema construtivo com blocos modulares. Franquia adquirida, implementacao futura.',
      status: 'planejado',
      stats: [
        { label: 'Status', value: 'Aguardando implementacao' },
      ],
    },
  ]

  const isLocked = (status: CardStatus) => status === 'em_breve' || status === 'planejado'

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl lg:text-4xl font-bold gradient-text mb-2">
          Ecossistema TJA7
        </h1>
        <p className="text-white/50 text-lg mb-6">
          7 frentes de negocio integradas em um unico sistema
        </p>

        {/* Stats resumidos */}
        <div className="flex flex-wrap gap-3">
          {[
            { icon: Users, label: 'Clientes', value: clients.length, color: '#F5C518' },
            { icon: ClipboardList, label: 'Simulacoes', value: simTotal, color: '#fb923c' },
            { icon: HardHat, label: 'Obras', value: constructions.length, color: '#60a5fa' },
            { icon: Building2, label: 'Imoveis', value: properties.length, color: '#c084fc' },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl px-4 py-2.5 flex items-center gap-3">
              <s.icon size={18} style={{ color: s.color }} />
              <div>
                <p className="text-[11px] text-white/40 uppercase tracking-wider">{s.label}</p>
                <p className="text-lg font-bold text-white">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const locked = isLocked(card.status)
          return (
            <motion.div
              key={card.id}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className={`
                relative rounded-2xl p-5 transition-all duration-300 group
                ${locked
                  ? 'glass border border-white/[0.03]'
                  : 'glass gradient-border hover:shadow-[0_0_40px_rgba(245,197,24,0.08)]'
                }
                ${card.status === 'planejado' ? 'opacity-60' : card.status === 'em_breve' ? 'opacity-70' : ''}
              `}
            >
              {/* Header do card */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: `${card.color}15` }}
                  >
                    <card.icon size={22} style={{ color: card.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-[15px] flex items-center gap-2">
                      {card.title}
                      {locked && <Lock size={13} className="text-white/20" />}
                    </h3>
                  </div>
                </div>
                <StatusBadge status={card.status} />
              </div>

              {/* Descricao */}
              <p className="text-white/40 text-sm leading-relaxed mb-4">
                {card.description}
              </p>

              {/* Stats */}
              <div className={`grid ${card.stats.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-4`}>
                {card.stats.map((stat) => (
                  <div key={stat.label} className="bg-white/[0.03] rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">{stat.label}</p>
                    <p className={`font-bold ${locked ? 'text-white/30 text-xs' : 'text-white text-lg'}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Botao */}
              {card.link && !locked && (
                <Link
                  to={card.link}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all
                    bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white group-hover:text-white/80"
                >
                  {card.linkLabel}
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </Link>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Diagrama de Fluxo */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="glass rounded-2xl p-6 gradient-border"
      >
        <h2 className="text-lg font-semibold text-white mb-1">Fluxo do Ecossistema</h2>
        <p className="text-white/40 text-sm mb-6">Como as frentes de negocio se conectam</p>

        {/* Desktop flow */}
        <div className="hidden md:flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {[
            { icon: Users, label: 'Cliente chega', sub: 'WhatsApp / Indicacao', color: '#9ca3af' },
            { icon: Calculator, label: 'Simulacao MCMV', sub: 'Correspondente Caixa', color: '#F5C518' },
            { icon: CheckCircle, label: 'Aprovacao', sub: 'Documentacao + Caixa', color: '#34d399' },
            { icon: HardHat, label: 'Construcao', sub: 'Obra + Materiais', color: '#fb923c' },
            { icon: Home, label: 'Entrega', sub: 'Chaves + Portal', color: '#60a5fa' },
          ].map((step, idx) => (
            <div key={step.label} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex flex-col items-center text-center min-w-[120px]">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
                  style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
                >
                  <step.icon size={22} style={{ color: step.color }} />
                </div>
                <p className="text-white text-xs font-medium">{step.label}</p>
                <p className="text-white/30 text-[10px]">{step.sub}</p>
              </div>
              {idx < 4 && (
                <div className="flex items-center gap-1 text-white/15 flex-shrink-0">
                  <div className="w-6 h-px bg-white/10" />
                  <ArrowRight size={14} />
                  <div className="w-6 h-px bg-white/10" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile flow - vertical */}
        <div className="md:hidden space-y-3">
          {[
            { icon: Users, label: 'Cliente chega', sub: 'WhatsApp / Indicacao', color: '#9ca3af' },
            { icon: Calculator, label: 'Simulacao MCMV', sub: 'Correspondente Caixa', color: '#F5C518' },
            { icon: CheckCircle, label: 'Aprovacao', sub: 'Documentacao + Caixa', color: '#34d399' },
            { icon: HardHat, label: 'Construcao', sub: 'Obra + Materiais', color: '#fb923c' },
            { icon: Home, label: 'Entrega', sub: 'Chaves + Portal', color: '#60a5fa' },
          ].map((step, idx) => (
            <div key={step.label}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
                >
                  <step.icon size={18} style={{ color: step.color }} />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{step.label}</p>
                  <p className="text-white/30 text-xs">{step.sub}</p>
                </div>
              </div>
              {idx < 4 && (
                <div className="flex justify-center py-1">
                  <div className="w-px h-4 bg-white/10" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modulos paralelos */}
        <div className="mt-6 pt-4 border-t border-white/5">
          <p className="text-white/30 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap size={12} className="text-gold-400" />
            Modulos paralelos integrados
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Loja de Materiais', color: '#c084fc' },
              { label: 'Corretagem de Imoveis', color: '#60a5fa' },
              { label: 'Loteamento', color: '#34d399' },
              { label: 'Cacambas', color: '#f472b6' },
              { label: 'Franquia Blocos', color: '#9ca3af' },
            ].map((mod) => (
              <span
                key={mod.label}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] border border-white/5"
                style={{ color: mod.color }}
              >
                {mod.label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Rodape inspiracional */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="text-center py-6"
      >
        <p className="text-white/20 text-sm flex items-center justify-center gap-2">
          <TrendingUp size={14} />
          TJA7 Empreendimentos — Ico, Ceara
        </p>
      </motion.div>
    </div>
  )
}
