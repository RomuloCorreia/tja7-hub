import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.6 },
}

const SYSTEM_URL = 'https://tja7-hub.vercel.app'
const WHATSAPP_URL = 'https://wa.me/5588992050963?text=Vi%20o%20case%20TJA7%20e%20quero%20conversar%20sobre%20um%20sistema%20para%20meu%20neg%C3%B3cio'

function GlowCard({ children, className = '', highlight = false }: { children: React.ReactNode; className?: string; highlight?: boolean }) {
  return (
    <div className={`relative group ${className}`}>
      {highlight && (
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-orange-500/50 via-purple-500/30 to-orange-500/50 blur-sm opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
      )}
      <div className={`relative rounded-2xl border backdrop-blur-xl transition-all duration-300 overflow-hidden ${
        highlight
          ? 'bg-white/[0.06] border-white/10 hover:border-orange-500/30'
          : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05]'
      }`}>
        {children}
      </div>
    </div>
  )
}

function FloatingOrb({ className }: { className: string }) {
  return (
    <div className={`absolute rounded-full blur-3xl opacity-20 animate-pulse pointer-events-none ${className}`} />
  )
}

function OrangeButton({ children, href, large, secondary }: { children: React.ReactNode; href: string; large?: boolean; secondary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-xl font-bold cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
        secondary
          ? 'px-8 py-3.5 text-sm text-white border border-white/20 hover:border-orange-500/40 bg-white/[0.05] hover:bg-white/[0.08]'
          : `text-white hover:shadow-2xl hover:shadow-orange-500/20 ${large ? 'px-10 py-4 text-base sm:text-lg' : 'px-8 py-3.5 text-sm'}`
      }`}
    >
      {!secondary && (
        <>
          <span className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 bg-[length:200%_100%] animate-[shimmer_3s_ease-in-out_infinite]" />
          <span className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-white/20 to-orange-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </>
      )}
      <span className="relative">{children}</span>
    </a>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block mb-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-orange-300 border border-orange-500/20 bg-orange-500/5">
      {children}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{ fontFamily: 'Syne, sans-serif' }}
      className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-[0.95]"
    >
      {children}
    </h2>
  )
}

const frentes = [
  {
    icon: '🏗️',
    title: 'Construcao Civil MCMV',
    desc: 'Gestao completa de obras com diario, equipe, materiais, centro de custos e acompanhamento em tempo real.',
    active: true,
  },
  {
    icon: '🏦',
    title: 'Correspondente Caixa',
    desc: 'Simulador MCMV inteligente com calculo automatico de faixa, subsidio, entrada e parcela mensal.',
    active: true,
  },
  {
    icon: '🏪',
    title: 'Loja de Materiais',
    desc: 'Estoque, pedidos de compra, orcamentos, fornecedores e tela TV de entregas pendentes.',
    active: true,
  },
  {
    icon: '🏠',
    title: 'Corretagem de Imoveis',
    desc: 'Catalogo de imoveis, CRM de clientes, pipeline de vendas com 7 etapas e drag-and-drop.',
    active: true,
  },
  {
    icon: '🗺️',
    title: 'Loteamentos',
    desc: 'Mapa visual de quadras e lotes com status em tempo real — disponivel, reservado, vendido.',
    active: true,
  },
  {
    icon: '🚛',
    title: 'Cacambas de Entulho',
    desc: 'Gestao de cacambas, solicitacoes, entregas e retiradas. Modulo em desenvolvimento.',
    active: false,
  },
  {
    icon: '🧱',
    title: 'Franquia de Blocos',
    desc: 'Producao, estoque e vendas de blocos de concreto. Modulo em planejamento.',
    active: false,
  },
]

const stats = [
  { value: '10+', label: 'Modulos' },
  { value: '18', label: 'Tabelas no banco' },
  { value: '9', label: 'Hooks de dados' },
  { value: '7', label: 'Frentes de negocio' },
  { value: '4', label: 'Agentes IA planejados' },
  { value: 'TV', label: 'Tela para loja' },
  { value: 'Portal', label: 'Cliente acompanha obra' },
  { value: 'MCMV', label: 'Simulador 2026' },
]

const features = [
  { icon: '🔄', text: 'Pipeline CRM com drag-and-drop (7 etapas)' },
  { icon: '🧮', text: 'Simulador MCMV com calculo automatico de faixa, subsidio e parcela' },
  { icon: '📋', text: 'Gestao de obras: diario, equipe, materiais, centro de custos' },
  { icon: '🗺️', text: 'Mapa visual de loteamentos com lotes clicaveis' },
  { icon: '🏪', text: 'Loja completa: estoque, pedidos de compra, orcamentos' },
  { icon: '📺', text: 'Tela TV para entregas pendentes (diferencial)' },
  { icon: '👤', text: 'Portal do cliente para acompanhar obra' },
  { icon: '✨', text: 'Pagina de apresentacao animada' },
]

const previews = [
  { title: 'Dashboard', desc: 'Visao geral com KPIs, graficos e acoes rapidas', url: `${SYSTEM_URL}/app` },
  { title: 'Pipeline CRM', desc: 'Kanban de vendas com 7 etapas e drag-and-drop', url: `${SYSTEM_URL}/app/pipeline` },
  { title: 'Ecossistema', desc: 'Hub central com todas as frentes de negocio', url: `${SYSTEM_URL}/app/ecossistema` },
  { title: 'Portal do Cliente', desc: 'Acompanhamento de obra pelo proprio cliente', url: `${SYSTEM_URL}/obra/da5d9e63-fd57-442e-8216-3a3d244a3383` },
]

const stack = ['React 19', 'TypeScript', 'Vite 8', 'Tailwind 4', 'Supabase', 'React Query', 'Framer Motion', 'Recharts']

const DELIVERABLES = [
  { label: 'Pipeline CRM com drag-and-drop (7 etapas)', done: true, status: '' },
  { label: 'Dashboard com KPIs em tempo real', done: true, status: '' },
  { label: 'Simulador MCMV 2026 com calculo automatico', done: true, status: '' },
  { label: 'Catalogo de imoveis com filtros e status', done: true, status: '' },
  { label: 'Pagina de detalhe do cliente com 4 abas', done: true, status: '' },
  { label: 'Portal publico do cliente para acompanhar obra', done: true, status: '' },
  { label: 'Pagina de apresentacao animada', done: true, status: '' },
  { label: 'Gestao de obras: diario, equipe, materiais, custos (7 abas)', done: true, status: '' },
  { label: 'Mapa visual de loteamentos com quadras e lotes clicaveis', done: true, status: '' },
  { label: 'Loja de materiais: estoque, pedidos, orcamentos', done: true, status: '' },
  { label: 'Tela TV para entregas pendentes na loja', done: true, status: '' },
  { label: 'Pagina Ecossistema com 7 frentes de negocio', done: true, status: '' },
  { label: 'Registro de interacoes por cliente (timeline)', done: true, status: '' },
  { label: 'Centro de custos por obra (planejado vs realizado)', done: true, status: '' },
  { label: 'Agente Simulador MCMV no WhatsApp', done: false, status: 'Proxima fase' },
  { label: 'Agente Corretor Digital no WhatsApp', done: false, status: 'Em breve' },
  { label: 'Modulo de Cacambas de Entulho', done: false, status: 'Planejado' },
  { label: 'Modulo Franquia de Blocos', done: false, status: 'Planejado' },
]

const DONE_COUNT = DELIVERABLES.filter(d => d.done).length
const TOTAL_COUNT = DELIVERABLES.length
const PROGRESS_PERCENT = Math.round((DONE_COUNT / TOTAL_COUNT) * 100)

function ProgressRing() {
  const [count, setCount] = useState(0)
  const radius = 80
  const stroke = 6
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (count / 100) * circumference

  useEffect(() => {
    let current = 0
    const target = PROGRESS_PERCENT
    const duration = 2000
    const steps = 60
    const increment = target / steps
    const interval = duration / steps

    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        current = target
        clearInterval(timer)
      }
      setCount(Math.round(current))
    }, interval)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-[200px] h-[200px]">
        <svg width="200" height="200" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          {/* Progress circle */}
          <motion.circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F5C518" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#F5C518" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black tabular-nums" style={{ fontFamily: 'Syne, sans-serif', color: '#F5C518' }}>
            {count}%
          </span>
          <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mt-1">concluido</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-emerald-400 font-bold">{DONE_COUNT} prontos</span>
        <span className="text-white/20">|</span>
        <span className="text-white/40">{TOTAL_COUNT - DONE_COUNT} pendentes</span>
        <span className="text-white/20">|</span>
        <span className="text-white/30">{TOTAL_COUNT} total</span>
      </div>
    </div>
  )
}

export default function CaseTJA7() {
  return (
    <div className="relative min-h-screen overflow-hidden scroll-smooth" style={{ background: '#06060a' }}>
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(249,115,22,0.08), transparent 60%), radial-gradient(ellipse at bottom left, rgba(245,197,24,0.05), transparent 60%)' }} />

      <FloatingOrb className="w-96 h-96 bg-orange-500/30 -top-48 -right-48" />
      <FloatingOrb className="w-72 h-72 bg-yellow-500/20 top-1/3 -left-36" />
      <FloatingOrb className="w-80 h-80 bg-amber-500/20 bottom-1/4 -right-40" />

      <div className="relative z-10">

        {/* ═══════ HERO ═══════ */}
        <section id="topo" className="px-5 md:px-16 max-w-[900px] mx-auto pt-16 pb-8 md:pt-28 md:pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 mb-8 px-5 py-2 rounded-full border border-orange-500/30 bg-orange-500/10 backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-orange-300">
              Construido com IA por RC Digital
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4"
          >
            <span
              className="text-5xl sm:text-6xl font-extrabold"
              style={{ fontFamily: 'Syne, sans-serif', color: '#F5C518' }}
            >
              TJA7
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ fontFamily: 'Syne, sans-serif' }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[0.95] mb-5"
          >
            <span className="gradient-text">TJA7 Hub</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-white/50 text-base sm:text-lg leading-relaxed max-w-lg mx-auto mb-10"
          >
            Ecossistema Inteligente para Construcao Civil
          </motion.p>

          {/* Progress Ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8, type: 'spring' }}
            className="mb-10"
          >
            <ProgressRing />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <OrangeButton href={SYSTEM_URL} large>Acessar Sistema</OrangeButton>
            <OrangeButton href={`${SYSTEM_URL}/apresentacao`} secondary>Ver Apresentacao</OrangeButton>
          </motion.div>
        </section>

        {/* ═══════ O QUE JÁ ENTREGAMOS ═══════ */}
        <section className="px-5 md:px-16 max-w-[900px] mx-auto py-12 md:py-16">
          <motion.div {...fadeUp} className="text-center mb-8">
            <SectionLabel>Progresso em Tempo Real</SectionLabel>
            <SectionTitle>O que ja entregamos</SectionTitle>
          </motion.div>

          <div className="grid gap-3">
            {DELIVERABLES.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all ${
                  item.done
                    ? 'bg-white/[0.04] border-white/[0.08]'
                    : 'bg-white/[0.02] border-white/[0.04] opacity-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  item.done
                    ? 'bg-emerald-500/20 border border-emerald-500/40'
                    : 'bg-white/5 border border-white/10'
                }`}>
                  {item.done ? (
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  )}
                </div>
                <span className={`text-sm flex-1 ${item.done ? 'text-white/80' : 'text-white/30'}`}>{item.label}</span>
                {item.done ? (
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Pronto</span>
                ) : (
                  <span className="text-[10px] text-white/20 font-semibold uppercase tracking-wider">{item.status}</span>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════ O CLIENTE ═══════ */}
        <section className="px-5 md:px-16 max-w-[900px] mx-auto py-16 md:py-24">
          <motion.div {...fadeUp} className="text-center mb-10">
            <SectionLabel>O Cliente</SectionLabel>
            <SectionTitle>
              <span style={{ color: '#F5C518' }}>TJA7</span> Empreendimentos
            </SectionTitle>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.15, duration: 0.6 }}>
            <GlowCard highlight>
              <div className="p-6 sm:p-10">
                <div className="flex flex-col md:flex-row md:items-center md:gap-10">
                  <div className="mb-6 md:mb-0 md:shrink-0">
                    <div className="w-20 h-20 rounded-2xl bg-[#F5C518]/10 border border-[#F5C518]/30 flex items-center justify-center mx-auto md:mx-0">
                      <span className="text-4xl font-extrabold" style={{ color: '#F5C518', fontFamily: 'Syne, sans-serif' }}>7</span>
                    </div>
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <p className="text-white/90 text-sm mb-1 font-semibold">Ico, Ceara</p>
                    <p className="text-text-muted text-xs leading-relaxed mb-4">
                      <span style={{ color: '#F5C518' }} className="font-semibold">Jenucie Angelim</span> (eng. civil) + <span style={{ color: '#F5C518' }} className="font-semibold">Thyago Nunes</span> (corretor)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { value: '+80', label: 'casas construidas' },
                        { value: '+100', label: 'projetos' },
                        { value: '+700', label: 'lotes vendidos' },
                        { value: '7', label: 'frentes de negocio' },
                      ].map((s, i) => (
                        <div key={i} className="text-center">
                          <span className="text-xl font-extrabold gradient-text" style={{ fontFamily: 'Syne, sans-serif' }}>{s.value}</span>
                          <p className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </section>

        {/* ═══════ O ECOSSISTEMA ═══════ */}
        <section className="px-5 md:px-16 max-w-[1100px] mx-auto py-16 md:py-24">
          <motion.div {...fadeUp} className="text-center mb-14">
            <SectionLabel>O Ecossistema</SectionLabel>
            <SectionTitle>
              <span className="gradient-text">7 frentes</span> de negocio, 1 sistema
            </SectionTitle>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {frentes.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.08 }}
                className={!f.active ? 'opacity-50' : ''}
              >
                <GlowCard highlight={f.active}>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{f.icon}</span>
                      <h3 className="text-white font-bold text-sm">{f.title}</h3>
                    </div>
                    <p className="text-text-muted text-xs leading-relaxed">{f.desc}</p>
                    {!f.active && (
                      <span className="inline-block mt-3 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest text-yellow-400/80 border border-yellow-400/20 bg-yellow-400/5">
                        Em breve
                      </span>
                    )}
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════ NUMEROS ═══════ */}
        <section className="px-5 md:px-16 max-w-[1000px] mx-auto py-16 md:py-24">
          <motion.div {...fadeUp} className="text-center mb-14">
            <SectionLabel>Numeros do Sistema</SectionLabel>
            <SectionTitle>
              O que ja foi <span className="gradient-text">construido</span>
            </SectionTitle>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.06 }}
              >
                <GlowCard>
                  <div className="p-5 text-center">
                    <span
                      className="text-2xl sm:text-3xl font-extrabold gradient-text block mb-1"
                      style={{ fontFamily: 'Syne, sans-serif' }}
                    >
                      {s.value}
                    </span>
                    <span className="text-text-muted text-[10px] uppercase tracking-widest font-semibold">{s.label}</span>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════ FUNCIONALIDADES ═══════ */}
        <section className="px-5 md:px-16 max-w-[900px] mx-auto py-16 md:py-24">
          <motion.div {...fadeUp} className="text-center mb-14">
            <SectionLabel>Funcionalidades-chave</SectionLabel>
            <SectionTitle>
              O que o sistema <span className="gradient-text">faz</span>
            </SectionTitle>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.06 }}
              >
                <GlowCard>
                  <div className="p-4 flex items-start gap-3">
                    <span className="text-xl shrink-0">{f.icon}</span>
                    <p className="text-sm text-white/85 leading-relaxed">{f.text}</p>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════ PREVIEWS ═══════ */}
        <section className="px-5 md:px-16 max-w-[1000px] mx-auto py-16 md:py-24">
          <motion.div {...fadeUp} className="text-center mb-14">
            <SectionLabel>Preview das Telas</SectionLabel>
            <SectionTitle>
              Veja o sistema <span className="gradient-text">ao vivo</span>
            </SectionTitle>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {previews.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ delay: i * 0.1 }}
              >
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="block">
                  <GlowCard highlight>
                    <div className="p-6">
                      <div className="w-full h-32 rounded-xl bg-gradient-to-br from-orange-500/10 via-white/[0.03] to-purple-500/10 border border-white/[0.06] flex items-center justify-center mb-4">
                        <span className="text-text-muted text-xs font-mono">{p.url.replace('https://', '')}</span>
                      </div>
                      <h3 className="text-white font-bold text-sm mb-1">{p.title}</h3>
                      <p className="text-text-muted text-xs">{p.desc}</p>
                      <span className="inline-block mt-3 text-orange-400 text-xs font-semibold group-hover:underline">
                        Abrir tela →
                      </span>
                    </div>
                  </GlowCard>
                </a>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════ STACK TECNICA ═══════ */}
        <section className="px-5 md:px-16 max-w-[800px] mx-auto py-16 md:py-24">
          <motion.div {...fadeUp} className="text-center mb-10">
            <SectionLabel>Stack Tecnica</SectionLabel>
            <SectionTitle>
              Tecnologia de <span className="gradient-text">ponta</span>
            </SectionTitle>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.15, duration: 0.6 }}>
            <GlowCard>
              <div className="p-6 sm:p-8 text-center">
                <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
                  {stack.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-white/80 bg-white/[0.06] border border-white/[0.08]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/30 bg-orange-500/10">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-orange-300">
                    Powered by Claude Sonnet + RC Digital
                  </span>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        </section>

        {/* ═══════ CTA FINAL ═══════ */}
        <section className="px-5 md:px-16 max-w-[800px] mx-auto py-20 md:py-28 text-center">
          <motion.div {...fadeUp}>
            <GlowCard highlight className="max-w-lg mx-auto">
              <div className="p-8 sm:p-12">
                <h2
                  style={{ fontFamily: 'Syne, sans-serif' }}
                  className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight leading-tight mb-4"
                >
                  Quer um ecossistema assim{' '}
                  <span className="gradient-text">para o seu negocio?</span>
                </h2>
                <p className="text-text-muted text-sm leading-relaxed mb-8 max-w-md mx-auto">
                  Construo sistemas completos com IA para empresas que querem escalar com tecnologia.
                </p>
                <OrangeButton href={WHATSAPP_URL} large>
                  Conversar no WhatsApp
                </OrangeButton>
                <p className="text-text-muted text-xs mt-6">
                  Consultoria de IA — <span className="text-orange-400 font-semibold">Romulo Correia</span> @romulojca
                </p>
              </div>
            </GlowCard>
          </motion.div>
        </section>

        {/* ═══════ FOOTER ═══════ */}
        <footer className="px-5 md:px-16 max-w-[1100px] mx-auto py-8 text-text-muted text-xs border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>TJA7 Hub — Case Study</span>
          <a
            href="#topo"
            className="text-text-muted hover:text-orange-400 transition cursor-pointer order-first sm:order-none"
          >
            ↑ Voltar ao topo
          </a>
          <a
            href="https://instagram.com/romulojca"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-orange-400 transition cursor-pointer"
          >
            @romulojca
          </a>
        </footer>
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}
