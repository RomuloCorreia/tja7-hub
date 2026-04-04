import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, X, Check, MapPin, Maximize, Grid3X3, List,
  DollarSign, Filter, Pencil
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useLots } from '../../../hooks/useLots'
import type { Lot, LotStatus } from '../../../types'

const statusColors: Record<LotStatus, string> = {
  disponivel: '#34d399',
  reservado: '#F5C518',
  vendido: '#ef4444',
}

const statusLabels: Record<LotStatus, string> = {
  disponivel: 'Disponível',
  reservado: 'Reservado',
  vendido: 'Vendido',
}

const statusShort: Record<LotStatus, string> = {
  disponivel: 'DISP',
  reservado: 'RESV',
  vendido: 'VEND',
}

export default function LoteamentoPage() {
  const { loteamento } = useParams<{ loteamento: string }>()
  const loteamentoName = decodeURIComponent(loteamento || '')
  const navigate = useNavigate()
  const { lots, isLoading, createLot, updateLot } = useLots()

  const [view, setView] = useState<'mapa' | 'lista'>('mapa')
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null)
  const [showNewLot, setShowNewLot] = useState(false)
  const [statusFilter, setStatusFilter] = useState<LotStatus | 'todos'>('todos')
  const [blockFilter, setBlockFilter] = useState<string>('todos')
  const [editingLot, setEditingLot] = useState<Lot | null>(null)

  // Filter lots for this loteamento
  const allLots = useMemo(() =>
    lots.filter(l => l.loteamento_name === loteamentoName),
    [lots, loteamentoName]
  )

  const filteredLots = useMemo(() =>
    allLots.filter(l => {
      if (statusFilter !== 'todos' && l.status !== statusFilter) return false
      if (blockFilter !== 'todos' && l.block !== blockFilter) return false
      return true
    }),
    [allLots, statusFilter, blockFilter]
  )

  const blocks = useMemo(() => {
    const b: Record<string, Lot[]> = {}
    allLots.forEach(l => {
      if (!b[l.block]) b[l.block] = []
      b[l.block].push(l)
    })
    Object.values(b).forEach(arr =>
      arr.sort((a, b) => a.lot_number.localeCompare(b.lot_number, undefined, { numeric: true }))
    )
    return b
  }, [allLots])

  const filteredBlocks = useMemo(() => {
    const b: Record<string, Lot[]> = {}
    filteredLots.forEach(l => {
      if (!b[l.block]) b[l.block] = []
      b[l.block].push(l)
    })
    Object.values(b).forEach(arr =>
      arr.sort((a, b) => a.lot_number.localeCompare(b.lot_number, undefined, { numeric: true }))
    )
    return b
  }, [filteredLots])

  const blockNames = useMemo(() => Object.keys(blocks).sort(), [blocks])

  const stats = useMemo(() => ({
    total: allLots.length,
    disponivel: allLots.filter(l => l.status === 'disponivel').length,
    reservado: allLots.filter(l => l.status === 'reservado').length,
    vendido: allLots.filter(l => l.status === 'vendido').length,
    valorTotal: allLots.reduce((s, l) => s + l.price, 0),
    valorVendido: allLots.filter(l => l.status === 'vendido').reduce((s, l) => s + l.price, 0),
  }), [allLots])

  const pieData = [
    { name: 'Disponíveis', value: stats.disponivel, color: '#34d399' },
    { name: 'Reservados', value: stats.reservado, color: '#F5C518' },
    { name: 'Vendidos', value: stats.vendido, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const handleStatusChange = async (id: string, status: LotStatus) => {
    await updateLot.mutateAsync({ id, status })
    if (selectedLot?.id === id) {
      setSelectedLot(prev => prev ? { ...prev, status } : null)
    }
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/lotes')}
            className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1 text-sm"
          >
            <ArrowLeft size={16} /> Loteamentos
          </button>
          <span className="text-white/10">|</span>
          <h2 className="text-xl font-bold gradient-text">{loteamentoName}</h2>
        </div>
        <button onClick={() => setShowNewLot(true)} className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2">
          <Plus size={16} /> Novo Lote
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white/80' },
          { label: 'Disponíveis', value: stats.disponivel, color: 'text-emerald-400' },
          { label: 'Reservados', value: stats.reservado, color: 'text-gold-400' },
          { label: 'Vendidos', value: stats.vendido, color: 'text-red-400' },
          { label: 'Valor Total', value: `R$ ${stats.valorTotal.toLocaleString('pt-BR')}`, color: 'text-white/80' },
          { label: 'Valor Vendido', value: `R$ ${stats.valorVendido.toLocaleString('pt-BR')}`, color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="glass rounded-xl flex overflow-hidden">
            <button
              onClick={() => setView('mapa')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${
                view === 'mapa' ? 'bg-gold-400/20 text-gold-400' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Grid3X3 size={14} /> Mapa
            </button>
            <button
              onClick={() => setView('lista')}
              className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${
                view === 'lista' ? 'bg-gold-400/20 text-gold-400' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <List size={14} /> Lista
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-white/20" />
            {(['todos', 'disponivel', 'reservado', 'vendido'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                  statusFilter === s
                    ? 'bg-gold-400/20 border-gold-400/30 text-gold-400'
                    : 'border-white/10 text-white/40 hover:text-white/60'
                }`}
              >
                {s === 'todos' ? 'Todos' : statusLabels[s]}
              </button>
            ))}
          </div>

          {/* Block filter */}
          {blockNames.length > 1 && (
            <select
              value={blockFilter}
              onChange={e => setBlockFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs focus:border-gold-400/40 focus:outline-none text-white/60"
            >
              <option value="todos">Todas quadras</option>
              {blockNames.map(b => (
                <option key={b} value={b}>Quadra {b}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        {/* Main */}
        <div>
          {view === 'mapa' ? (
            <MapView
              blocks={filteredBlocks}
              onSelectLot={setSelectedLot}
              selectedLotId={selectedLot?.id}
            />
          ) : (
            <ListView
              lots={filteredLots}
              onSelectLot={setSelectedLot}
              onStatusChange={handleStatusChange}
            />
          )}

          {allLots.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/20 text-sm mb-4">Nenhum lote neste loteamento</p>
              <button onClick={() => setShowNewLot(true)} className="glow-button px-6 py-3 rounded-xl text-sm">
                <Plus size={16} className="inline mr-2" /> Adicionar primeiro lote
              </button>
            </div>
          )}
        </div>

        {/* Sidebar - pie chart */}
        {allLots.length > 0 && (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4">
              <h3 className="text-sm font-medium text-white/60 mb-3">Distribuição por Status</h3>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#0e0e14',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-white/50">{d.name}</span>
                    </div>
                    <span className="font-medium" style={{ color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Receita breakdown */}
            <div className="glass rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-white/60">Receita</h3>
              {[
                { label: 'Vendido', value: stats.valorVendido, color: '#ef4444' },
                { label: 'Reservado', value: allLots.filter(l => l.status === 'reservado').reduce((s, l) => s + l.price, 0), color: '#F5C518' },
                { label: 'Disponível', value: allLots.filter(l => l.status === 'disponivel').reduce((s, l) => s + l.price, 0), color: '#34d399' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-xs">
                  <span className="text-white/40">{r.label}</span>
                  <span className="font-medium" style={{ color: r.color }}>
                    R$ {r.value.toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="glass rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-medium text-white/60 mb-2">Legenda do Mapa</h3>
              {([
                { status: 'disponivel' as LotStatus, desc: 'Pronto para venda' },
                { status: 'reservado' as LotStatus, desc: 'Reservado por cliente' },
                { status: 'vendido' as LotStatus, desc: 'Vendido e pago' },
              ]).map(item => (
                <div key={item.status} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-[8px] font-bold"
                    style={{
                      background: `${statusColors[item.status]}15`,
                      borderWidth: 1,
                      borderColor: `${statusColors[item.status]}40`,
                      color: statusColors[item.status],
                    }}
                  >
                    {statusShort[item.status].substring(0, 2)}
                  </div>
                  <div>
                    <span style={{ color: statusColors[item.status] }}>{statusLabels[item.status]}</span>
                    <span className="text-white/30 ml-1">— {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLot && !editingLot && (
          <LotDetailModal
            lot={selectedLot}
            onClose={() => setSelectedLot(null)}
            onStatusChange={handleStatusChange}
            onEdit={() => setEditingLot(selectedLot)}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingLot && (
          <EditLotModal
            lot={editingLot}
            onClose={() => { setEditingLot(null) }}
            onSave={async (id, fields) => {
              await updateLot.mutateAsync({ id, ...fields })
              setEditingLot(null)
              // Update selectedLot if same
              if (selectedLot?.id === id) {
                setSelectedLot(prev => prev ? { ...prev, ...fields } : null)
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* New Lot Modal */}
      <AnimatePresence>
        {showNewLot && (
          <NewLotModal
            loteamentoName={loteamentoName}
            onClose={() => setShowNewLot(false)}
            onCreate={async (data) => {
              await createLot.mutateAsync(data)
              setShowNewLot(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ========================================================
   MAP VIEW — Visual lot map by block
   ======================================================== */
function MapView({
  blocks,
  onSelectLot,
  selectedLotId,
}: {
  blocks: Record<string, Lot[]>
  onSelectLot: (lot: Lot) => void
  selectedLotId?: string
}) {
  const sortedBlocks = Object.entries(blocks).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      {sortedBlocks.map(([block, blockLots]) => (
        <motion.div
          key={block}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-5"
        >
          <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">
            Quadra {block}
          </h3>
          <div className="flex flex-wrap gap-3">
            {blockLots.map(lot => {
              const isSelected = lot.id === selectedLotId
              const color = statusColors[lot.status]
              return (
                <motion.div
                  key={lot.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectLot(lot)}
                  className={`
                    min-w-[110px] min-h-[110px] rounded-xl flex flex-col items-center justify-center gap-1
                    cursor-pointer transition-all relative group
                    ${lot.status === 'reservado' ? 'glow-pulse' : ''}
                    ${isSelected ? 'ring-2 ring-gold-400' : ''}
                  `}
                  style={{
                    background: `${color}12`,
                    borderWidth: 2,
                    borderColor: `${color}40`,
                  }}
                >
                  {/* Lot number */}
                  <span className="text-xl font-bold" style={{ color }}>{lot.lot_number}</span>
                  {/* Area */}
                  <span className="text-[11px] text-white/40">{lot.area_m2}m²</span>
                  {/* Price */}
                  <span className="text-[10px] font-medium" style={{ color: `${color}cc` }}>
                    R$ {(lot.price / 1000).toFixed(0)}k
                  </span>

                  {/* Tooltip on hover */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full
                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10
                    glass rounded-lg px-3 py-2 text-[11px] whitespace-nowrap"
                  >
                    <p className="font-medium" style={{ color }}>Lote {lot.lot_number} — Quadra {lot.block}</p>
                    <p className="text-white/50">{lot.area_m2}m² — R$ {lot.price.toLocaleString('pt-BR')}</p>
                    {lot.features.length > 0 && (
                      <p className="text-white/30 mt-0.5">{lot.features.join(', ')}</p>
                    )}
                    <p className="mt-0.5" style={{ color }}>{statusLabels[lot.status]}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      ))}

      {sortedBlocks.length === 0 && (
        <p className="text-center text-white/20 text-sm py-8">Nenhum lote encontrado com os filtros selecionados</p>
      )}
    </div>
  )
}

/* ========================================================
   LIST VIEW
   ======================================================== */
function ListView({
  lots,
  onSelectLot,
}: {
  lots: Lot[]
  onSelectLot: (lot: Lot) => void
  onStatusChange?: (id: string, status: LotStatus) => Promise<void>
}) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Quadra</th>
              <th className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Lote</th>
              <th className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Área</th>
              <th className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Preço</th>
              <th className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs text-white/30 font-medium uppercase tracking-wider">Features</th>
            </tr>
          </thead>
          <tbody>
            {lots.map(lot => (
              <tr
                key={lot.id}
                onClick={() => onSelectLot(lot)}
                className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-white/60">Quadra {lot.block}</td>
                <td className="px-4 py-3 font-medium">{lot.lot_number}</td>
                <td className="px-4 py-3 text-white/60">{lot.area_m2}m²</td>
                <td className="px-4 py-3 font-medium gradient-text">R$ {lot.price.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: `${statusColors[lot.status]}15`,
                      color: statusColors[lot.status],
                    }}
                  >
                    {statusLabels[lot.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/40 text-xs">
                  {lot.features.length > 0 ? lot.features.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lots.length === 0 && (
        <p className="text-center text-white/20 text-sm py-8">Nenhum lote encontrado</p>
      )}
    </div>
  )
}

/* ========================================================
   LOT DETAIL MODAL
   ======================================================== */
function LotDetailModal({
  lot,
  onClose,
  onStatusChange,
  onEdit,
}: {
  lot: Lot
  onClose: () => void
  onStatusChange: (id: string, status: LotStatus) => Promise<void>
  onEdit: () => void
}) {
  const [changingStatus, setChangingStatus] = useState(false)

  const handleStatus = async (status: LotStatus) => {
    if (status === lot.status) return
    setChangingStatus(true)
    await onStatusChange(lot.id, status)
    setChangingStatus(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass rounded-2xl w-full max-w-md p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/30 uppercase tracking-wider">{lot.loteamento_name}</p>
            <h2 className="text-xl font-bold">
              Quadra {lot.block} — Lote {lot.lot_number}
            </h2>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">
            <X size={20} />
          </button>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span
            className="text-sm px-4 py-2 rounded-xl font-bold"
            style={{
              background: `${statusColors[lot.status]}20`,
              color: statusColors[lot.status],
              borderWidth: 1,
              borderColor: `${statusColors[lot.status]}40`,
            }}
          >
            {statusLabels[lot.status]}
          </span>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          <InfoItem icon={<Maximize size={14} />} label="Área" value={`${lot.area_m2}m²`} />
          <InfoItem icon={<DollarSign size={14} />} label="Preço" value={`R$ ${lot.price.toLocaleString('pt-BR')}`} />
          {lot.address && (
            <div className="col-span-2">
              <InfoItem icon={<MapPin size={14} />} label="Endereço" value={lot.address} />
            </div>
          )}
        </div>

        {/* Features */}
        {lot.features.length > 0 && (
          <div>
            <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Características</p>
            <div className="flex flex-wrap gap-1.5">
              {lot.features.map((f, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status change buttons */}
        <div>
          <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Alterar Status</p>
          <div className="flex gap-2">
            {(['disponivel', 'reservado', 'vendido'] as LotStatus[]).map(s => {
              const isActive = lot.status === s
              return (
                <button
                  key={s}
                  onClick={() => handleStatus(s)}
                  disabled={changingStatus}
                  className={`flex-1 text-sm py-2.5 rounded-xl border transition-all font-medium ${
                    changingStatus ? 'opacity-50' : ''
                  }`}
                  style={{
                    background: isActive ? `${statusColors[s]}20` : 'transparent',
                    borderColor: isActive ? statusColors[s] : 'rgba(255,255,255,0.08)',
                    color: isActive ? statusColors[s] : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {isActive && <Check size={14} className="inline mr-1" />}
                  {statusLabels[s]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-white/5">
          <button onClick={onEdit} className="flex-1 border border-white/10 text-white/50 hover:text-white/80 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
            <Pencil size={14} /> Editar Lote
          </button>
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 transition-colors">
            Fechar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-white/30 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

/* ========================================================
   EDIT LOT MODAL
   ======================================================== */
function EditLotModal({
  lot,
  onClose,
  onSave,
}: {
  lot: Lot
  onClose: () => void
  onSave: (id: string, fields: Partial<Lot>) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    block: lot.block,
    lot_number: lot.lot_number,
    area_m2: String(lot.area_m2),
    price: String(lot.price),
    address: lot.address ?? '',
    features: lot.features.join(', '),
  })

  const handleSave = async () => {
    setSaving(true)
    await onSave(lot.id, {
      block: form.block,
      lot_number: form.lot_number,
      area_m2: Number(form.area_m2),
      price: Number(form.price),
      address: form.address || null,
      features: form.features.split(',').map(f => f.trim()).filter(Boolean),
    })
    setSaving(false)
  }

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none'
  const labelClass = 'text-xs text-white/40 mb-1 block'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass rounded-2xl w-full max-w-lg p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Editar Lote</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quadra</label>
              <input value={form.block} onChange={e => setForm({ ...form, block: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Número do Lote</label>
              <input value={form.lot_number} onChange={e => setForm({ ...form, lot_number: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Área m²</label>
              <input type="number" value={form.area_m2} onChange={e => setForm({ ...form, area_m2: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Preço (R$)</label>
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Endereço</label>
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Características (separadas por vírgula)</label>
            <input
              value={form.features}
              onChange={e => setForm({ ...form, features: e.target.value })}
              placeholder="esquina, frente norte, próximo à praça"
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="glow-button flex-1 py-2.5 rounded-xl text-sm">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button onClick={onClose} className="border border-white/10 text-white/40 hover:text-white/70 px-4 py-2.5 rounded-xl text-sm">
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ========================================================
   NEW LOT MODAL
   ======================================================== */
function NewLotModal({
  loteamentoName,
  onClose,
  onCreate,
}: {
  loteamentoName: string
  onClose: () => void
  onCreate: (data: Partial<Lot>) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    block: '',
    lot_number: '',
    area_m2: '',
    price: '',
    address: '',
    features: '',
  })

  const handleSave = async () => {
    if (!form.block || !form.lot_number) return
    setSaving(true)
    await onCreate({
      loteamento_name: loteamentoName,
      block: form.block,
      lot_number: form.lot_number,
      area_m2: Number(form.area_m2) || 0,
      price: Number(form.price) || 0,
      status: 'disponivel',
      address: form.address || null,
      features: form.features.split(',').map(f => f.trim()).filter(Boolean),
    })
    setSaving(false)
  }

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none'
  const labelClass = 'text-xs text-white/40 mb-1 block'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass rounded-2xl w-full max-w-lg p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Novo Lote</h2>
            <p className="text-xs text-white/30">{loteamentoName}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quadra *</label>
              <input
                autoFocus
                placeholder="A, B, C..."
                value={form.block}
                onChange={e => setForm({ ...form, block: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Número do Lote *</label>
              <input
                placeholder="01, 02..."
                value={form.lot_number}
                onChange={e => setForm({ ...form, lot_number: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Área m²</label>
              <input type="number" placeholder="200" value={form.area_m2} onChange={e => setForm({ ...form, area_m2: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Preço (R$)</label>
              <input type="number" placeholder="45000" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Endereço</label>
            <input placeholder="Rua, número..." value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Características (separadas por vírgula)</label>
            <input
              placeholder="esquina, frente norte, próximo à praça"
              value={form.features}
              onChange={e => setForm({ ...form, features: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving || !form.block || !form.lot_number} className="glow-button flex-1 py-2.5 rounded-xl text-sm disabled:opacity-50">
            {saving ? 'Salvando...' : 'Criar Lote'}
          </button>
          <button onClick={onClose} className="border border-white/10 text-white/40 hover:text-white/70 px-4 py-2.5 rounded-xl text-sm">
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
