import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLots } from '../../../hooks/useLots'
import type { Lot, LotStatus } from '../../../types'

const statusColors: Record<LotStatus, string> = {
  disponivel: '#34d399',
  reservado: '#F5C518',
  vendido: '#ef4444',
}

interface LoteamentoGroup {
  name: string
  lots: Lot[]
  total: number
  disponivel: number
  reservado: number
  vendido: number
  receita: number
  receitaVendido: number
  blocks: Record<string, Lot[]>
}

export default function LoteamentosLista() {
  const { lots, isLoading } = useLots()
  const navigate = useNavigate()
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')

  const loteamentos = useMemo(() => {
    const groups: Record<string, Lot[]> = {}
    lots.forEach(l => {
      if (!groups[l.loteamento_name]) groups[l.loteamento_name] = []
      groups[l.loteamento_name].push(l)
    })

    return Object.entries(groups)
      .map(([name, groupLots]): LoteamentoGroup => {
        const blocks: Record<string, Lot[]> = {}
        groupLots.forEach(l => {
          if (!blocks[l.block]) blocks[l.block] = []
          blocks[l.block].push(l)
        })
        // Sort lots in each block by lot_number
        Object.values(blocks).forEach(arr => arr.sort((a, b) => a.lot_number.localeCompare(b.lot_number, undefined, { numeric: true })))

        return {
          name,
          lots: groupLots,
          total: groupLots.length,
          disponivel: groupLots.filter(l => l.status === 'disponivel').length,
          reservado: groupLots.filter(l => l.status === 'reservado').length,
          vendido: groupLots.filter(l => l.status === 'vendido').length,
          receita: groupLots.reduce((s, l) => s + l.price, 0),
          receitaVendido: groupLots.filter(l => l.status === 'vendido').reduce((s, l) => s + l.price, 0),
          blocks,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [lots])

  const handleCreateLoteamento = () => {
    if (!newName.trim()) return
    navigate(`/app/lotes/${encodeURIComponent(newName.trim())}`)
    setShowNewModal(false)
    setNewName('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">{loteamentos.length} loteamento{loteamentos.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowNewModal(true)} className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2">
          <Plus size={16} /> Novo Loteamento
        </button>
      </div>

      {/* Loteamento cards */}
      <div className={`grid gap-6 ${loteamentos.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {loteamentos.map((lot, i) => {
          const pctVendido = lot.total > 0 ? Math.round((lot.vendido / lot.total) * 100) : 0
          return (
            <motion.div
              key={lot.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 gradient-border hover:border-gold-400/20 transition-all cursor-pointer group"
              onClick={() => navigate(`/app/lotes/${encodeURIComponent(lot.name)}`)}
            >
              {/* Name */}
              <h2 className="text-xl font-bold gradient-text mb-4">{lot.name}</h2>

              {/* Stats row */}
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-white/80">{lot.total}</p>
                  <p className="text-[10px] text-white/30 uppercase">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{lot.disponivel}</p>
                  <p className="text-[10px] text-white/30 uppercase">Disponíveis</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gold-400">{lot.reservado}</p>
                  <p className="text-[10px] text-white/30 uppercase">Reservados</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-400">{lot.vendido}</p>
                  <p className="text-[10px] text-white/30 uppercase">Vendidos</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-white/40 flex items-center gap-1"><TrendingUp size={12} /> Progresso de vendas</span>
                  <span className="text-gold-400 font-medium">{pctVendido}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctVendido}%` }}
                    transition={{ duration: 1, delay: i * 0.1 + 0.3 }}
                    className="h-full rounded-full"
                    style={{
                      background: pctVendido >= 80
                        ? 'linear-gradient(90deg, #34d399, #10b981)'
                        : pctVendido >= 40
                        ? 'linear-gradient(90deg, #F5C518, #d4a017)'
                        : 'linear-gradient(90deg, #60a5fa, #3b82f6)',
                    }}
                  />
                </div>
              </div>

              {/* Receita */}
              <div className="flex items-center justify-between text-xs mb-4 pb-4 border-b border-white/5">
                <span className="text-white/40">Receita vendida</span>
                <span className="text-emerald-400 font-medium">R$ {lot.receitaVendido.toLocaleString('pt-BR')}</span>
              </div>

              {/* Mini-map */}
              <div className="space-y-3 mb-4">
                {Object.entries(lot.blocks).sort(([a], [b]) => a.localeCompare(b)).map(([block, blockLots]) => (
                  <div key={block}>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Quadra {block}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {blockLots.map(l => (
                        <div
                          key={l.id}
                          className="w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold"
                          style={{
                            background: `${statusColors[l.status]}15`,
                            borderWidth: 1,
                            borderColor: `${statusColors[l.status]}40`,
                            color: statusColors[l.status],
                          }}
                          title={`Lote ${l.lot_number} — ${l.area_m2}m² — R$ ${l.price.toLocaleString('pt-BR')} — ${l.status}`}
                        >
                          {l.lot_number}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex items-center justify-end text-sm text-gold-400 group-hover:text-gold-300 transition-colors">
                Ver Loteamento <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          )
        })}
      </div>

      {loteamentos.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white/20 text-sm mb-4">Nenhum loteamento cadastrado</p>
          <button onClick={() => setShowNewModal(true)} className="glow-button px-6 py-3 rounded-xl text-sm">
            <Plus size={16} className="inline mr-2" /> Criar primeiro loteamento
          </button>
        </div>
      )}

      {/* Modal novo loteamento */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowNewModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl w-full max-w-sm p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Novo Loteamento</h2>
            <input
              autoFocus
              placeholder="Nome do loteamento"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateLoteamento()}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
            />
            <div className="flex gap-3">
              <button onClick={handleCreateLoteamento} className="glow-button flex-1 py-2.5 rounded-xl text-sm">
                Criar e Abrir
              </button>
              <button onClick={() => setShowNewModal(false)} className="border border-white/10 text-white/40 hover:text-white/70 px-4 py-2.5 rounded-xl text-sm">
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
