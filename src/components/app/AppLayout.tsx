import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Users, Calculator, Building2, MapPin, HardHat,
  Package, MessageSquare, Layers, LogOut, Menu, X, ChevronRight
} from 'lucide-react'

const nav = [
  { to: '/app/ecossistema', icon: Layers, label: 'Ecossistema' },
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/pipeline', icon: Users, label: 'Pipeline CRM' },
  { to: '/app/simulacoes', icon: Calculator, label: 'Simulacoes' },
  { to: '/app/imoveis', icon: Building2, label: 'Imoveis' },
  { to: '/app/lotes', icon: MapPin, label: 'Loteamentos' },
  { to: '/app/obras', icon: HardHat, label: 'Obras' },
  { to: '/app/materiais', icon: Package, label: 'Materiais' },
  { to: '/app/agentes', icon: MessageSquare, label: 'Agentes IA' },
]

export function AppLayout() {
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 bg-[var(--color-surface)] border-r border-white/5
        transform transition-transform duration-200 lg:translate-x-0 lg:static
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <img src="/img/tja7-logo.png" alt="TJA7" className="h-9" />
          <div>
            <h1 className="font-bold text-sm gradient-text">TJA7 HUB</h1>
            <p className="text-[10px] text-white/40">Ecossistema Inteligente</p>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={'end' in rest}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                ${isActive
                  ? 'bg-gold-400/10 text-gold-400 font-medium'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'}
              `}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-white/5">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 hover:bg-white/5 transition-all w-full"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[var(--color-surface)] border-b border-white/5">
          <button onClick={() => setOpen(true)} className="text-white/60">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <img src="/img/tja7-logo.png" alt="TJA7" className="h-7" />
            <span className="font-bold text-sm gradient-text">TJA7 HUB</span>
          </div>
          <ChevronRight size={24} className="opacity-0" />
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
