import { NavLink, Outlet } from 'react-router-dom'
import { Package, LayoutDashboard, Warehouse, ShoppingCart, FileText } from 'lucide-react'
import { useMaterials } from '../../../hooks/useMaterials'

const tabs = [
  { to: '/app/materiais', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/materiais/estoque', icon: Warehouse, label: 'Estoque' },
  { to: '/app/materiais/pedidos', icon: ShoppingCart, label: 'Pedidos' },
  { to: '/app/materiais/orcamentos', icon: FileText, label: 'Orcamentos' },
]

export default function MateriaisLayout() {
  const { materials } = useMaterials()
  const totalValue = materials.reduce((s, m) => s + m.stock_qty * m.price, 0)
  const lowStock = materials.filter(m => m.stock_qty <= m.min_stock).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-400/10 flex items-center justify-center">
            <Package size={20} className="text-gold-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Loja de Materiais</h1>
            <p className="text-white/40 text-sm">
              {materials.length} produtos
              <span className="mx-2 text-white/10">|</span>
              R$ {totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} em estoque
              {lowStock > 0 && (
                <>
                  <span className="mx-2 text-white/10">|</span>
                  <span className="text-red-400">{lowStock} baixo estoque</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white/[0.03] rounded-xl p-1 border border-white/5">
        {tabs.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `
              flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
              ${isActive
                ? 'bg-gold-400/15 text-gold-400 shadow-sm'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'}
            `}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Sub-page */}
      <Outlet />
    </div>
  )
}
