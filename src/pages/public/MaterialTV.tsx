import { useState, useEffect, useMemo } from 'react'
import { Package, Truck, Clock, Calendar, TrendingUp, Star } from 'lucide-react'
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders'
import { useMaterials } from '../../hooks/useMaterials'

const motivationalPhrases = [
  'Construindo o futuro, tijolo por tijolo.',
  'Qualidade que voce confia, precos que cabem no bolso.',
  'TJA7 — Seu parceiro na construcao.',
  'Tudo pra sua obra, tudo num so lugar.',
  'Construa seus sonhos com a gente.',
  'Material de primeira, atendimento nota 10.',
]

export default function MaterialTV() {
  const { orders } = usePurchaseOrders()
  const { materials } = useMaterials()
  const [clock, setClock] = useState(new Date())
  const [phraseIndex, setPhraseIndex] = useState(0)

  // Clock update every second
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Rotate motivational phrase every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % motivationalPhrases.length)
    }, 15000)
    return () => clearInterval(timer)
  }, [])

  // Auto-refresh via React Query refetchInterval is handled by the hooks
  // But we need to configure it — the hooks use 30s staleTime already
  // We'll force a page reload every 5 minutes as a safety net
  useEffect(() => {
    const timer = setInterval(() => window.location.reload(), 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const pendingDeliveries = useMemo(() => {
    return orders
      .filter(o => o.status === 'confirmado' && o.expected_delivery)
      .sort((a, b) => (a.expected_delivery ?? '').localeCompare(b.expected_delivery ?? ''))
  }, [orders])

  const todayDeliveries = pendingDeliveries.filter(o => o.expected_delivery === today)
  const futureDeliveries = pendingDeliveries.filter(o => o.expected_delivery !== today)

  // Stats
  const totalProducts = materials.length
  const totalStockValue = materials.reduce((s, m) => s + m.stock_qty * m.price, 0)
  const lowStockCount = materials.filter(m => m.stock_qty <= m.min_stock).length

  const hasDeliveries = pendingDeliveries.length > 0

  return (
    <div className="min-h-screen bg-[#06060a] text-white overflow-hidden relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold-400/[0.03] via-transparent to-gold-400/[0.02]" />

      {/* Content */}
      <div className="relative z-10 h-screen flex flex-col p-8">
        {/* Top bar: Logo + Clock */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src="/img/tja7-logo.png" alt="TJA7" className="h-16" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <div>
              <h1 className="text-3xl font-bold text-shimmer">TJA7 MATERIAIS</h1>
              <p className="text-white/30 text-lg">Loja de Material de Construcao</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-5xl font-bold font-mono gradient-text tracking-wider">
              {clock.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
            <p className="text-lg text-white/40 mt-1">
              {clock.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-8">
          {hasDeliveries ? (
            <>
              {/* Left: Deliveries */}
              <div className="flex-1 flex flex-col">
                {/* Today's deliveries - highlighted */}
                {todayDeliveries.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gold-400 flex items-center gap-3 mb-4">
                      <Truck size={28} />
                      ENTREGAS HOJE
                    </h2>
                    <div className="space-y-3">
                      {todayDeliveries.map(order => (
                        <TodayDeliveryCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Future deliveries */}
                {futureDeliveries.length > 0 && (
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white/60 flex items-center gap-3 mb-4">
                      <Calendar size={22} />
                      PROXIMAS ENTREGAS
                    </h2>
                    <div className="space-y-2">
                      {futureDeliveries.slice(0, 6).map(order => (
                        <FutureDeliveryCard key={order.id} order={order} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Stats panel */}
              <div className="w-80 flex flex-col gap-4">
                <StatCard icon={Package} label="Produtos" value={String(totalProducts)} color="text-gold-400" />
                <StatCard
                  icon={TrendingUp}
                  label="Valor em Estoque"
                  value={`R$ ${(totalStockValue / 1000).toFixed(0)}k`}
                  color="text-emerald-400"
                />
                <StatCard
                  icon={Clock}
                  label="Entregas Pendentes"
                  value={String(pendingDeliveries.length)}
                  color="text-blue-400"
                />
                {lowStockCount > 0 && (
                  <StatCard
                    icon={Star}
                    label="Reposicao Necessaria"
                    value={String(lowStockCount)}
                    color="text-red-400"
                  />
                )}

                {/* Motivational */}
                <div className="mt-auto glass rounded-2xl p-6 text-center">
                  <Star size={24} className="mx-auto text-gold-400 mb-3" />
                  <p className="text-lg text-white/60 italic leading-relaxed transition-opacity duration-1000">
                    "{motivationalPhrases[phraseIndex]}"
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* No deliveries: full-screen motivational + stats */
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="mb-12">
                <div className="w-24 h-24 rounded-full bg-gold-400/10 flex items-center justify-center mx-auto mb-6 glow-pulse">
                  <Package size={48} className="text-gold-400" />
                </div>
                <p className="text-3xl text-white/50 italic mb-2 max-w-2xl leading-relaxed">
                  "{motivationalPhrases[phraseIndex]}"
                </p>
              </div>

              {/* Stats row */}
              <div className="flex gap-8">
                <div className="glass rounded-2xl p-8 text-center min-w-[200px] gradient-border">
                  <Package size={28} className="mx-auto text-gold-400 mb-3" />
                  <p className="text-4xl font-bold gradient-text">{totalProducts}</p>
                  <p className="text-sm text-white/30 mt-1">Produtos</p>
                </div>
                <div className="glass rounded-2xl p-8 text-center min-w-[200px] gradient-border">
                  <TrendingUp size={28} className="mx-auto text-emerald-400 mb-3" />
                  <p className="text-4xl font-bold text-emerald-400">
                    R$ {(totalStockValue / 1000).toFixed(0)}k
                  </p>
                  <p className="text-sm text-white/30 mt-1">Em Estoque</p>
                </div>
                {lowStockCount > 0 && (
                  <div className="glass rounded-2xl p-8 text-center min-w-[200px] gradient-border">
                    <Star size={28} className="mx-auto text-amber-400 mb-3" />
                    <p className="text-4xl font-bold text-amber-400">{lowStockCount}</p>
                    <p className="text-sm text-white/30 mt-1">Reposicao</p>
                  </div>
                )}
              </div>

              <p className="text-white/10 text-sm mt-12">Sem entregas pendentes no momento</p>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="mt-6 flex items-center justify-between text-white/10 text-xs">
          <span>TJA7 Empreendimentos — Ico, Ceara</span>
          <span>Atualizado a cada 30 segundos</span>
        </div>
      </div>
    </div>
  )
}

/* ============ TODAY DELIVERY CARD ============ */
function TodayDeliveryCard({ order }: { order: { id: string; supplier: string; total: number; expected_delivery: string | null; notes: string | null } }) {
  return (
    <div className="rounded-2xl p-6 glow-pulse relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, rgba(245, 197, 24, 0.08), rgba(245, 197, 24, 0.02))',
      border: '2px solid rgba(245, 197, 24, 0.25)',
      boxShadow: '0 0 40px rgba(245, 197, 24, 0.1)',
    }}>
      {/* Glow corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gold-400/5 rounded-full blur-3xl" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gold-400/15 flex items-center justify-center">
            <Truck size={28} className="text-gold-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gold-400">{order.supplier}</p>
            <p className="text-white/40">{order.notes || 'Pedido confirmado'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold gradient-text">
            R$ {order.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-gold-400 font-bold text-sm mt-1">CHEGANDO HOJE</p>
        </div>
      </div>
    </div>
  )
}

/* ============ FUTURE DELIVERY CARD ============ */
function FutureDeliveryCard({ order }: { order: { id: string; supplier: string; total: number; expected_delivery: string | null } }) {
  const dateStr = order.expected_delivery
    ? new Date(order.expected_delivery + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : '-'

  return (
    <div className="glass rounded-xl px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
          <Truck size={18} className="text-white/30" />
        </div>
        <div>
          <p className="text-lg font-medium">{order.supplier}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <p className="text-lg font-semibold text-white/60">
          R$ {order.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
        </p>
        <div className="bg-white/5 px-4 py-2 rounded-lg">
          <p className="text-lg font-bold text-white/70">{dateStr}</p>
        </div>
      </div>
    </div>
  )
}

/* ============ STAT CARD ============ */
function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Package
  label: string
  value: string
  color: string
}) {
  return (
    <div className="glass rounded-xl p-5 gradient-border">
      <div className="flex items-center gap-3 mb-2">
        <Icon size={18} className={color} />
        <span className="text-xs text-white/30 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
