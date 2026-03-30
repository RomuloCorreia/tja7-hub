import { useMemo } from 'react'
import { useClients } from '../../hooks/useClients'
import { useSimulations } from '../../hooks/useSimulations'
import { useConstructions } from '../../hooks/useConstructions'
import { useProperties } from '../../hooks/useProperties'
import {
  Users, Calculator, Building2, HardHat, TrendingUp,
  UserPlus, CheckCircle, DollarSign, Clock, ArrowUpRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import { format, subDays, isAfter } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { PIPELINE_STAGES } from '../../types'

const COLORS = ['#F5C518', '#a78bfa', '#34d399', '#60a5fa', '#f472b6', '#ef4444', '#9ca3af']

export default function Dashboard() {
  const { clients, isLoading: loadingClients } = useClients()
  const { simulations } = useSimulations()
  const { constructions } = useConstructions()
  const { properties } = useProperties()

  const stats = useMemo(() => {
    const now = new Date()
    const last30 = subDays(now, 30)
    const newClients30d = clients.filter(c => isAfter(new Date(c.created_at), last30)).length
    const totalSimulations = simulations.length
    const approvedSims = simulations.filter(s => s.status === 'aprovado').length
    const activeConstructions = constructions.filter(c => !c.actual_end).length
    const availableProps = properties.filter(p => p.status === 'disponivel').length
    const delivered = constructions.filter(c => c.actual_end).length

    // Pipeline distribution
    const pipelineDist = Object.entries(PIPELINE_STAGES).map(([stage, config]) => ({
      name: config.label,
      value: clients.filter(c => c.stage === stage).length,
      color: config.color,
    })).filter(d => d.value > 0)

    // Leads por dia (últimos 14 dias)
    const leadsPerDay = Array.from({ length: 14 }, (_, i) => {
      const day = subDays(now, 13 - i)
      const dayStr = format(day, 'yyyy-MM-dd')
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        leads: clients.filter(c => c.created_at.startsWith(dayStr)).length,
      }
    })

    return {
      totalClients: clients.length,
      newClients30d,
      totalSimulations,
      approvedSims,
      activeConstructions,
      availableProps,
      delivered,
      pipelineDist,
      leadsPerDay,
      conversionRate: totalSimulations > 0
        ? Math.round((approvedSims / totalSimulations) * 100)
        : 0,
    }
  }, [clients, simulations, constructions, properties])

  if (loadingClients) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const kpis = [
    { label: 'Total Clientes', value: stats.totalClients, icon: Users, color: 'text-gold-400' },
    { label: 'Novos (30d)', value: stats.newClients30d, icon: UserPlus, color: 'text-emerald-400' },
    { label: 'Simulacoes', value: stats.totalSimulations, icon: Calculator, color: 'text-amber-400' },
    { label: 'Aprovados', value: stats.approvedSims, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Obras Ativas', value: stats.activeConstructions, icon: HardHat, color: 'text-blue-400' },
    { label: 'Imoveis Disp.', value: stats.availableProps, icon: Building2, color: 'text-purple-400' },
    { label: 'Entregues', value: stats.delivered, icon: DollarSign, color: 'text-emerald-400' },
    { label: 'Conversao', value: `${stats.conversionRate}%`, icon: TrendingUp, color: 'text-gold-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-white/40 text-sm">Visao geral do ecossistema TJA7</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4 gradient-border">
            <div className="flex items-center justify-between mb-2">
              <Icon size={18} className={color} />
              <ArrowUpRight size={14} className="text-white/20" />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-white/40 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Leads últimos 14 dias */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-gold-400" />
            <h3 className="text-sm font-medium">Leads - Ultimos 14 dias</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.leadsPerDay}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5C518" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F5C518" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                labelStyle={{ color: '#F5C518' }}
              />
              <Area type="monotone" dataKey="leads" stroke="#F5C518" fill="url(#goldGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Distribution */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-gold-400" />
            <h3 className="text-sm font-medium">Distribuicao no Pipeline</h3>
          </div>
          {stats.pipelineDist.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.pipelineDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.pipelineDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {stats.pipelineDist.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-white/60">{d.name}</span>
                    <span className="ml-auto font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-white/20 text-sm">
              Sem dados ainda
            </div>
          )}
        </div>
      </div>

      {/* Recent leads */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">Leads Recentes</h3>
        {clients.length > 0 ? (
          <div className="space-y-2">
            {clients.slice(0, 8).map(client => (
              <div key={client.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gold-400/10 flex items-center justify-center text-gold-400 text-xs font-bold">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{client.name}</p>
                  <p className="text-xs text-white/40">{client.phone}</p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    background: `${PIPELINE_STAGES[client.stage]?.color}15`,
                    color: PIPELINE_STAGES[client.stage]?.color,
                  }}
                >
                  {PIPELINE_STAGES[client.stage]?.label}
                </span>
                <span className="text-xs text-white/30">
                  {format(new Date(client.created_at), 'dd/MM', { locale: ptBR })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/20 text-sm text-center py-8">Nenhum lead ainda. Os agentes IA vao popular aqui!</p>
        )}
      </div>
    </div>
  )
}
