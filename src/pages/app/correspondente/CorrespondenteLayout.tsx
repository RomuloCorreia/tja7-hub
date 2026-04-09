import { NavLink, Outlet } from 'react-router-dom'
import { Calculator, MessageCircle, Users, BarChart3 } from 'lucide-react'

const tabs = [
  { to: '/app/correspondente', icon: BarChart3, label: 'Visao Geral', end: true },
  { to: '/app/correspondente/simulador', icon: Calculator, label: 'Simulador MCMV' },
  { to: '/app/correspondente/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { to: '/app/correspondente/leads', icon: Users, label: 'Leads' },
]

export default function CorrespondenteLayout() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Correspondente Bancario</h1>
        <p className="text-xs text-white/40 mt-0.5">MCMV 2026 — Simulacoes, atendimentos e leads</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl w-fit">
        {tabs.map(({ to, icon: Icon, label, ...rest }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in rest}
            className={({ isActive }) => `
              flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all
              ${isActive
                ? 'bg-gold-400/15 text-gold-400'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'}
            `}
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Content */}
      <Outlet />
    </div>
  )
}
