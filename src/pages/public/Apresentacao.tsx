import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, Rocket, Users, Calculator, Building2, MapPin, HardHat,
  Package, MessageSquare, Bot, Shield, Zap, Clock, ArrowRight,
  Play, ChevronDown, Star, TrendingUp, Eye, Share2
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}

const DELIVERABLES = [
  {
    icon: Calculator,
    title: 'Simulador MCMV + Calculadora',
    desc: 'Calculadora completa de financiamento MCMV 2026 integrada ao CRM. Calcula faixa, subsídio, taxa, parcela e salva no histórico do cliente.',
    color: '#F5C518',
    status: 'pronto',
  },
  {
    icon: Users,
    title: 'Pipeline CRM Inteligente',
    desc: 'Kanban visual com 7 etapas: Novo Lead → Simulação → Documentação → Aprovado → Em Construção → Entregue. Drag-and-drop.',
    color: '#a78bfa',
    status: 'pronto',
  },
  {
    icon: TrendingUp,
    title: 'Dashboard com KPIs',
    desc: 'Visão geral do ecossistema: leads/mês, simulações, conversão, obras ativas, imóveis disponíveis. Tudo em tempo real.',
    color: '#34d399',
    status: 'pronto',
  },
  {
    icon: Building2,
    title: 'Catálogo de Imóveis',
    desc: 'Todos os imóveis cadastrados com preço, bairro, filtros e indicador MCMV. Integrado ao CRM.',
    color: '#60a5fa',
    status: 'pronto',
  },
  {
    icon: MapPin,
    title: 'Gestão de Loteamentos',
    desc: 'Controle visual de lotes: disponíveis, reservados, vendidos. Por quadra e loteamento.',
    color: '#f472b6',
    status: 'pronto',
  },
  {
    icon: HardHat,
    title: 'Acompanhamento de Obras',
    desc: '7 fases da obra com progresso visual. O cliente acompanha tudo por um link exclusivo.',
    color: '#fb923c',
    status: 'pronto',
  },
  {
    icon: Eye,
    title: 'Portal do Cliente',
    desc: 'Página pública onde o cliente vê o progresso da SUA obra, fotos e atualizações. Link único por obra.',
    color: '#22d3ee',
    status: 'pronto',
  },
  {
    icon: Package,
    title: 'Controle de Estoque',
    desc: 'Gestão da loja de materiais: estoque, alertas de reposição, valor em estoque, categorias.',
    color: '#c084fc',
    status: 'pronto',
  },
  {
    icon: Bot,
    title: 'Agentes IA no WhatsApp',
    desc: '4 agentes especializados planejados: Simulador, Corretor, Loteamento e Materiais. Lógica pronta, ativação na próxima fase.',
    color: '#F5C518',
    status: 'em_desenvolvimento',
  },
]

const NEXT_STEPS = [
  'Ativar agente simulador MCMV no WhatsApp da TJA7',
  'Cadastrar imóveis e lotes reais no sistema',
  'Configurar equipe de vendedores no CRM',
  'Treinar agentes com dados reais do negócio',
  'Conectar domínio personalizado',
]

const STATS = [
  { label: 'Páginas criadas', value: '10+' },
  { label: 'Tabelas no banco', value: '9' },
  { label: 'Agentes IA', value: '4' },
  { label: 'Fases de obra', value: '7' },
]

export default function Apresentacao() {
  const [showVideo, setShowVideo] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-white overflow-x-hidden">
      {/* Floating header */}
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[var(--color-surface)]/90 backdrop-blur-xl border-b border-white/5 py-3' : 'py-5'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/img/tja7-logo.png" alt="TJA7" className="h-8" />
            <div>
              <p className="text-xs font-bold gradient-text">TJA7 HUB</p>
              <p className="text-[9px] text-white/30">Ecossistema Inteligente</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-emerald-400">Operacional</span>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-20">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-400/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 text-center max-w-3xl">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center"
          >
            <img src="/img/tja7-logo.png" alt="TJA7" className="h-12" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-4"
          >
            Consultoria de IA — Relatório de Progresso
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold leading-tight mb-6"
          >
            Seu ecossistema
            <br />
            <span className="text-shimmer">está nascendo.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-white/50 text-lg max-w-xl mx-auto mb-8"
          >
            Em poucas horas, construímos a base completa do TJA7 Hub —
            um ecossistema inteligente que vai transformar a forma como
            você gerencia seus negócios.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-4 justify-center"
          >
            <button
              onClick={() => setShowVideo(true)}
              className="glow-button px-8 py-4 rounded-2xl text-base flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play size={18} fill="currentColor" />
              </div>
              Assistir Apresentação
            </button>
            <a
              href="#entregas"
              className="text-white/40 hover:text-gold-400 flex items-center gap-2 transition-colors text-sm"
            >
              Ver entregas <ArrowRight size={14} />
            </a>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <ChevronDown size={24} className="text-white/20 animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-8 border-y border-white/5 bg-[var(--color-surface)]/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="text-center"
              >
                <p className="text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-xs text-white/40 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section id="entregas" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <p className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-3">O que já entregamos</p>
            <h2 className="text-3xl md:text-4xl font-bold">
              Tudo isso em <span className="gradient-text">um único dia.</span>
            </h2>
          </motion.div>

          <div className="space-y-4">
            {DELIVERABLES.map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                variants={fadeUp}
                className="glass rounded-2xl p-5 flex items-start gap-4 group hover:border-gold-400/10 transition-all"
              >
                <div
                  className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: `${item.color}15` }}
                >
                  <item.icon size={22} style={{ color: item.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold">{item.title}</h3>
                    {item.status === 'pronto' ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                        <CheckCircle size={10} /> Pronto
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded-full">
                        <Rocket size={10} /> Proxima fase
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-20 px-4 bg-[var(--color-surface)]/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <p className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-3">Arquitetura</p>
            <h2 className="text-3xl font-bold">Como tudo se conecta</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            className="glass rounded-2xl p-8 font-mono text-sm text-center space-y-3"
          >
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="px-3 py-2 bg-emerald-400/10 text-emerald-400 rounded-xl">WhatsApp</span>
              <ArrowRight size={16} className="text-white/20" />
              <span className="px-3 py-2 bg-gold-400/10 text-gold-400 rounded-xl">Agentes IA</span>
              <ArrowRight size={16} className="text-white/20" />
              <span className="px-3 py-2 bg-blue-400/10 text-blue-400 rounded-xl">Claude Sonnet</span>
            </div>
            <ChevronDown size={20} className="mx-auto text-white/20" />
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="px-3 py-2 bg-purple-400/10 text-purple-400 rounded-xl">Supabase (Banco Único)</span>
            </div>
            <ChevronDown size={20} className="mx-auto text-white/20" />
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="px-3 py-2 bg-gold-400/10 text-gold-400 rounded-xl">TJA7 Hub</span>
              <span className="px-3 py-2 bg-cyan-400/10 text-cyan-400 rounded-xl">Portal Cliente</span>
              <span className="px-3 py-2 bg-pink-400/10 text-pink-400 rounded-xl">Notificações</span>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={2}
            className="grid grid-cols-3 gap-4 mt-6"
          >
            {[
              { icon: Shield, label: 'Dados seguros', desc: 'Criptografia e RLS' },
              { icon: Zap, label: 'Resposta instantânea', desc: 'IA responde em segundos' },
              { icon: Clock, label: '24/7 ativo', desc: 'Nunca perde um lead' },
            ].map((item) => (
              <div key={item.label} className="glass rounded-xl p-4 text-center">
                <item.icon size={20} className="mx-auto text-gold-400 mb-2" />
                <p className="text-xs font-medium">{item.label}</p>
                <p className="text-[10px] text-white/40">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <p className="text-gold-400 text-sm font-medium tracking-widest uppercase mb-3">Próximos passos</p>
            <h2 className="text-3xl font-bold">O que vem a seguir</h2>
          </motion.div>

          <div className="space-y-3">
            {NEXT_STEPS.map((step, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-8 h-8 rounded-full bg-gold-400/10 flex items-center justify-center text-gold-400 text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-white/70">{step}</p>
                <Rocket size={14} className="ml-auto text-white/10 flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Footer */}
      <section className="py-20 px-4 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="max-w-2xl mx-auto"
        >
          <Star size={32} className="mx-auto text-gold-400 mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Isso é só o <span className="gradient-text">começo.</span>
          </h2>
          <p className="text-white/50 mb-8">
            Vamos agendar nossa primeira call para eu te mostrar tudo funcionando
            ao vivo e alinhar os próximos passos.
          </p>
          <a
            href="https://wa.me/5588992050963?text=Oi%20R%C3%B4mulo%2C%20vi%20a%20apresenta%C3%A7%C3%A3o%20do%20TJA7%20Hub%20e%20quero%20agendar%20a%20call!"
            target="_blank"
            className="glow-button inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base"
          >
            <MessageSquare size={18} />
            Agendar Call
          </a>
        </motion.div>

        {/* Share on Instagram */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={1}
          className="mt-12 glass rounded-2xl p-8 max-w-xl mx-auto text-center"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-500/20 border border-pink-500/20 flex items-center justify-center">
            <Share2 size={24} className="text-pink-400" />
          </div>
          <h3 className="text-lg font-bold mb-2">Compartilha essa evolução!</h3>
          <p className="text-sm text-white/50 mb-4 leading-relaxed">
            Posta nos stories ou no feed mostrando que a TJA7 tá inovando com IA.
            Marca o <a href="https://instagram.com/romulojca" target="_blank" className="text-gold-400 hover:underline">@romulojca</a> pra eu repostar!
          </p>
          <a
            href="https://instagram.com/romulojca"
            target="_blank"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 border border-pink-500/20 text-pink-300 hover:text-pink-200 transition-colors text-sm font-medium"
          >
            <Share2 size={16} />
            @romulojca
          </a>
        </motion.div>

        <div className="mt-16 pt-8 border-t border-white/5">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src="/img/tja7-logo.png" alt="TJA7" className="h-6 opacity-40" />
            <span className="text-xs text-white/20">×</span>
            <span className="text-xs text-white/30 font-medium">RC Digital</span>
          </div>
          <p className="text-[10px] text-white/15">
            Consultoria de IA — Rômulo Correia &copy; {new Date().getFullYear()}
          </p>
        </div>
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowVideo(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-4xl"
              onClick={e => e.stopPropagation()}
            >
              <video
                src="/img/tja7-preview.mp4"
                controls
                autoPlay
                className="w-full rounded-2xl shadow-2xl shadow-gold-400/10"
                style={{ maxHeight: '80vh' }}
              />
              <p className="text-center text-white/30 text-xs mt-4">
                Clique fora do vídeo para fechar
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
