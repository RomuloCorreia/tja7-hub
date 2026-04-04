import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { MapPin, Map, CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react'
import { useLots } from '../../../hooks/useLots'
import { motion } from 'framer-motion'

export default function LotesLayout() {
  const { lots, isLoading } = useLots()

  const stats = useMemo(() => {
    const total = lots.length
    const disponivel = lots.filter(l => l.status === 'disponivel').length
    const reservado = lots.filter(l => l.status === 'reservado').length
    const vendido = lots.filter(l => l.status === 'vendido').length
    const receita = lots.reduce((sum, l) => sum + l.price, 0)
    return { total, disponivel, reservado, vendido, receita }
  }, [lots])

  const statItems = [
    { label: 'Total', value: stats.total, icon: Map, color: 'text-white/80' },
    { label: 'Disponíveis', value: stats.disponivel, icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Reservados', value: stats.reservado, icon: Clock, color: 'text-gold-400' },
    { label: 'Vendidos', value: stats.vendido, icon: XCircle, color: 'text-red-400' },
    { label: 'Receita Potencial', value: `R$ ${stats.receita.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-gold-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <MapPin size={24} className="text-gold-400" />
          <h1 className="text-2xl font-bold gradient-text">Gestão de Loteamentos</h1>
        </div>
        <p className="text-white/40 text-sm ml-9">Visualize e gerencie todos os loteamentos da TJA7</p>
      </div>

      {/* Stats inline */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-3"
        >
          {statItems.map(item => (
            <div key={item.label} className="glass rounded-xl px-4 py-3 flex items-center gap-3 min-w-[140px]">
              <item.icon size={18} className={item.color} />
              <div>
                <p className={`text-lg font-bold ${item.color}`}>
                  {typeof item.value === 'number' ? item.value : item.value}
                </p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">{item.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Sub-pages */}
      <Outlet />
    </div>
  )
}
