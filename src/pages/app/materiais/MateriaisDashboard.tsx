import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, DollarSign, AlertTriangle, ShoppingCart, FileText, TrendingUp,
  ArrowRight, Clock, ArrowDownCircle, ArrowUpCircle, RefreshCw, Undo2
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useMaterials } from '../../../hooks/useMaterials'
import { usePurchaseOrders } from '../../../hooks/usePurchaseOrders'
import { useQuotes } from '../../../hooks/useQuotes'
import { useStockMovements } from '../../../hooks/useStockMovements'
import type { StockMovementType } from '../../../types'

const movementIcons: Record<StockMovementType, typeof ArrowDownCircle> = {
  entrada: ArrowDownCircle,
  saida: ArrowUpCircle,
  ajuste: RefreshCw,
  devolucao: Undo2,
}

const movementColors: Record<StockMovementType, string> = {
  entrada: 'text-emerald-400',
  saida: 'text-red-400',
  ajuste: 'text-blue-400',
  devolucao: 'text-amber-400',
}

const movementLabels: Record<StockMovementType, string> = {
  entrada: 'Entrada',
  saida: 'Saida',
  ajuste: 'Ajuste',
  devolucao: 'Devolucao',
}

export default function MateriaisDashboard() {
  const navigate = useNavigate()
  const { materials, isLoading: loadingMaterials } = useMaterials()
  const { orders, isLoading: loadingOrders } = usePurchaseOrders()
  const { quotes, isLoading: loadingQuotes } = useQuotes()
  // Fetch all movements (null = all materials)
  const { movements, isLoading: loadingMovements } = useStockMovements(null as unknown as string)

  const isLoading = loadingMaterials || loadingOrders || loadingQuotes || loadingMovements

  // KPIs
  const totalProducts = materials.length
  const totalStockValue = materials.reduce((s, m) => s + m.stock_qty * m.price, 0)
  const lowStockItems = materials.filter(m => m.stock_qty <= m.min_stock)
  const pendingOrders = orders.filter(o => o.status === 'enviado' || o.status === 'confirmado')
  const openQuotes = quotes.filter(q => q.status === 'rascunho' || q.status === 'enviado')
  const avgMargin = useMemo(() => {
    const withCost = materials.filter(m => m.cost && m.cost > 0 && m.price > 0)
    if (withCost.length === 0) return 0
    const totalMargin = withCost.reduce((s, m) => {
      return s + ((m.price - (m.cost || 0)) / m.price) * 100
    }, 0)
    return totalMargin / withCost.length
  }, [materials])

  // Top 10 by stock value
  const top10 = useMemo(() => {
    return [...materials]
      .map(m => ({ name: m.name.length > 20 ? m.name.slice(0, 18) + '...' : m.name, value: m.stock_qty * m.price }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [materials])

  // Pending deliveries
  const pendingDeliveries = orders
    .filter(o => o.status === 'confirmado' && o.expected_delivery)
    .sort((a, b) => (a.expected_delivery ?? '').localeCompare(b.expected_delivery ?? ''))

  // Last 10 movements
  const recentMovements = useMemo(() => {
    if (!movements) return []
    return [...movements]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
  }, [movements])

  // Material name lookup
  const materialMap = useMemo(() => {
    const map: Record<string, string> = {}
    materials.forEach(m => { map[m.id] = m.name })
    return map
  }, [materials])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const kpis = [
    { label: 'Total Produtos', value: totalProducts, icon: Package, color: 'text-gold-400', gradient: true },
    { label: 'Valor em Estoque', value: `R$ ${totalStockValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Estoque Baixo', value: lowStockItems.length, icon: AlertTriangle, color: lowStockItems.length > 0 ? 'text-red-400' : 'text-emerald-400' },
    { label: 'Pedidos Pendentes', value: pendingOrders.length, icon: ShoppingCart, color: 'text-blue-400' },
    { label: 'Orcamentos Abertos', value: openQuotes.length, icon: FileText, color: 'text-purple-400' },
    { label: 'Margem Media', value: `${avgMargin.toFixed(1)}%`, icon: TrendingUp, color: avgMargin >= 30 ? 'text-emerald-400' : avgMargin >= 15 ? 'text-amber-400' : 'text-red-400' },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="glass rounded-xl p-4 gradient-border">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className={kpi.color} />
                <span className="text-xs text-white/40">{kpi.label}</span>
              </div>
              <p className={`text-xl font-bold ${kpi.gradient ? 'gradient-text' : kpi.color}`}>
                {kpi.value}
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top 10 Chart */}
        <div className="glass rounded-xl p-5 gradient-border">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-gold-400" />
            Top 10 — Valor em Estoque
          </h3>
          {top10.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top10} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                  tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                  axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#0e0e14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Valor']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {top10.map((_, i) => (
                    <Cell key={i} fill={`rgba(245, 197, 24, ${1 - i * 0.07})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-white/20 text-sm py-16">Sem dados</p>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="glass rounded-xl p-5 gradient-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              Alertas de Estoque Baixo
            </h3>
            {lowStockItems.length > 0 && (
              <button
                onClick={() => navigate('/app/materiais/estoque')}
                className="text-xs text-gold-400 hover:underline flex items-center gap-1"
              >
                Ver todos <ArrowRight size={12} />
              </button>
            )}
          </div>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-12">
              <Package size={32} className="mx-auto text-emerald-400/30 mb-3" />
              <p className="text-white/30 text-sm">Estoque em dia!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {lowStockItems.map(m => {
                const pct = m.min_stock > 0 ? (m.stock_qty / m.min_stock) * 100 : 0
                return (
                  <div key={m.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-red-400/5 border border-red-400/10 hover:bg-red-400/10 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-white/40">
                        {m.stock_qty} {m.unit} / min. {m.min_stock} {m.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <button
                        onClick={() => navigate('/app/materiais/pedidos')}
                        className="text-xs px-2.5 py-1 bg-gold-400/10 text-gold-400 rounded-lg hover:bg-gold-400/20 transition-colors"
                      >
                        Pedir
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending Deliveries */}
        <div className="glass rounded-xl p-5 gradient-border">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock size={16} className="text-amber-400" />
            Entregas Pendentes
          </h3>
          {pendingDeliveries.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={32} className="mx-auto text-white/10 mb-3" />
              <p className="text-white/30 text-sm">Sem entregas pendentes</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto">
              {pendingDeliveries.map(o => {
                const isToday = o.expected_delivery === new Date().toISOString().split('T')[0]
                return (
                  <div
                    key={o.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors cursor-pointer hover:bg-white/5 ${
                      isToday ? 'bg-gold-400/5 border border-gold-400/20 glow-pulse' : 'bg-white/[0.02] border border-white/5'
                    }`}
                    onClick={() => navigate('/app/materiais/pedidos')}
                  >
                    <div>
                      <p className="text-sm font-medium">{o.supplier}</p>
                      <p className="text-xs text-white/40">
                        R$ {o.total.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-medium ${isToday ? 'text-gold-400' : 'text-white/60'}`}>
                        {o.expected_delivery ? new Date(o.expected_delivery + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                      </p>
                      {isToday && <span className="text-[10px] text-gold-400 font-bold">HOJE</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Movements */}
        <div className="glass rounded-xl p-5 gradient-border">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <RefreshCw size={16} className="text-blue-400" />
            Ultimas Movimentacoes
          </h3>
          {recentMovements.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw size={32} className="mx-auto text-white/10 mb-3" />
              <p className="text-white/30 text-sm">Sem movimentacoes recentes</p>
            </div>
          ) : (
            <div className="space-y-0.5 max-h-[260px] overflow-y-auto">
              {recentMovements.map(mv => {
                const Icon = movementIcons[mv.type] || RefreshCw
                const color = movementColors[mv.type] || 'text-white/40'
                const label = movementLabels[mv.type] || mv.type
                const matName = materialMap[mv.material_id] || 'Material'
                const date = new Date(mv.created_at)
                const timeStr = `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

                return (
                  <div key={mv.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 ${color}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        <span className={`font-medium ${color}`}>{label}</span>
                        <span className="text-white/40"> — </span>
                        {matName}
                      </p>
                      <p className="text-xs text-white/30">{mv.reason || 'Sem motivo'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${mv.type === 'saida' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {mv.type === 'saida' ? '-' : '+'}{mv.quantity}
                      </p>
                      <p className="text-[10px] text-white/20">{timeStr}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
