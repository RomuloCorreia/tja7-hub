import { useState, useMemo } from 'react'
import type { Lot, LotStatus } from '../../types'
import { MapPin, Plus, Search, X, Maximize, Pencil, Check } from 'lucide-react'
import { useLots } from '../../hooks/useLots'

const statusColors: Record<string, string> = { disponivel: '#34d399', reservado: '#F5C518', vendido: '#ef4444' }
const statusLabels: Record<string, string> = { disponivel: 'Disponivel', reservado: 'Reservado', vendido: 'Vendido' }

export default function Lotes() {
  const { lots, isLoading, createLot, updateLot } = useLots()
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')
  const [loteamentoFilter, setLoteamentoFilter] = useState('todos')
  const [editingLot, setEditingLot] = useState<Lot | null>(null)

  // Extract unique loteamento names
  const loteamentos = useMemo(() => {
    const names = [...new Set(lots.map(l => l.loteamento_name))].sort()
    return names
  }, [lots])

  const filtered = lots.filter(l => {
    const matchSearch = !search || l.loteamento_name.toLowerCase().includes(search.toLowerCase()) || l.lot_number.includes(search)
    const matchFilter = filter === 'todos' || l.status === filter
    const matchLoteamento = loteamentoFilter === 'todos' || l.loteamento_name === loteamentoFilter
    return matchSearch && matchFilter && matchLoteamento
  })

  const handleStatusChange = async (id: string, status: LotStatus) => {
    await updateLot.mutateAsync({ id, status })
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Loteamentos</h1>
          <p className="text-white/40 text-sm">{lots.length} lotes cadastrados</p>
        </div>
        <button onClick={() => setShowNew(true)} className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2">
          <Plus size={16} /> Novo Lote
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar lote..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-gold-400/40 focus:outline-none" />
        </div>

        {/* Filtro por loteamento */}
        <select
          value={loteamentoFilter}
          onChange={e => setLoteamentoFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-gold-400/40 focus:outline-none text-white/60"
        >
          <option value="todos">Todos loteamentos</option>
          {loteamentos.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {['todos', 'disponivel', 'reservado', 'vendido'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              filter === s ? 'bg-gold-400/20 border-gold-400/30 text-gold-400' : 'border-white/10 text-white/40'
            }`}>
            {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{lots.filter(l => l.status === 'disponivel').length}</p>
          <p className="text-xs text-white/40">Disponiveis</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gold-400">{lots.filter(l => l.status === 'reservado').length}</p>
          <p className="text-xs text-white/40">Reservados</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{lots.filter(l => l.status === 'vendido').length}</p>
          <p className="text-xs text-white/40">Vendidos</p>
        </div>
      </div>

      {/* Lots Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filtered.map(lot => (
          <div key={lot.id} className="glass rounded-xl p-4 gradient-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/40">{lot.loteamento_name}</span>
              <button
                onClick={() => setEditingLot(lot)}
                className="text-white/20 hover:text-white/60 transition-colors"
              >
                <Pencil size={12} />
              </button>
            </div>
            <p className="text-sm font-medium">Quadra {lot.block} - Lote {lot.lot_number}</p>
            <p className="text-lg font-bold gradient-text mt-1">R$ {lot.price.toLocaleString('pt-BR')}</p>
            <div className="flex items-center gap-3 text-xs text-white/40 mt-2 pt-2 border-t border-white/5">
              <span className="flex items-center gap-1"><Maximize size={10} />{lot.area_m2}m2</span>
              {lot.address && <span className="flex items-center gap-1"><MapPin size={10} />{lot.address}</span>}
            </div>

            {/* Inline status buttons */}
            <div className="flex gap-1.5 mt-3 pt-2 border-t border-white/5">
              {(['disponivel', 'reservado', 'vendido'] as LotStatus[]).map(s => {
                const isActive = lot.status === s
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(lot.id, s)}
                    className="text-[10px] px-2 py-1 rounded-full border transition-all flex-1"
                    style={{
                      background: isActive ? `${statusColors[s]}20` : 'transparent',
                      borderColor: isActive ? statusColors[s] : 'rgba(255,255,255,0.08)',
                      color: isActive ? statusColors[s] : 'rgba(255,255,255,0.2)',
                      opacity: isActive ? 1 : 0.6,
                    }}
                  >
                    {statusLabels[s]}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-white/20 text-sm py-12">Nenhum lote encontrado</p>
      )}

      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo Lote</h2>
              <button onClick={() => setShowNew(false)} className="text-white/40"><X size={20} /></button>
            </div>
            <NewLotForm onSave={d => { createLot.mutate(d); setShowNew(false) }} />
          </div>
        </div>
      )}

      {editingLot && (
        <EditLotModal
          lot={editingLot}
          onClose={() => setEditingLot(null)}
          onSave={async (id, fields) => {
            await updateLot.mutateAsync({ id, ...fields })
            setEditingLot(null)
          }}
        />
      )}
    </div>
  )
}

/* ============ EDIT LOT MODAL ============ */
function EditLotModal({
  lot,
  onClose,
  onSave,
}: {
  lot: Lot
  onClose: () => void
  onSave: (id: string, fields: Partial<Lot>) => Promise<void>
}) {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    loteamento_name: lot.loteamento_name,
    block: lot.block,
    lot_number: lot.lot_number,
    area_m2: String(lot.area_m2),
    price: String(lot.price),
    address: lot.address ?? '',
  })

  const handleSave = async () => {
    await onSave(lot.id, {
      loteamento_name: form.loteamento_name,
      block: form.block,
      lot_number: form.lot_number,
      area_m2: Number(form.area_m2),
      price: Number(form.price),
      address: form.address || null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1000)
  }

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none'
  const labelClass = 'text-xs text-white/40 mb-1 block'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">Editar Lote</h2>
            {saved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check size={14} /> Salvo!</span>}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Loteamento</label>
            <input value={form.loteamento_name} onChange={e => setForm({ ...form, loteamento_name: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quadra</label>
              <input value={form.block} onChange={e => setForm({ ...form, block: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Lote</label>
              <input value={form.lot_number} onChange={e => setForm({ ...form, lot_number: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Area m2</label>
              <input type="number" value={form.area_m2} onChange={e => setForm({ ...form, area_m2: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Preco (R$)</label>
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Endereco</label>
            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className={inputClass} />
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} className="glow-button flex-1 py-2.5 rounded-xl text-sm">Salvar</button>
          <button onClick={onClose} className="border border-white/10 text-white/40 hover:text-white/70 px-4 py-2.5 rounded-xl text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

/* ============ NEW LOT FORM ============ */
function NewLotForm({ onSave }: { onSave: (d: Partial<Lot>) => void }) {
  const [form, setForm] = useState({ loteamento_name: '', block: '', lot_number: '', area_m2: '', price: '', address: '' })

  return (
    <div className="space-y-3">
      <input placeholder="Nome do loteamento *" value={form.loteamento_name} onChange={e => setForm({ ...form, loteamento_name: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Quadra" value={form.block} onChange={e => setForm({ ...form, block: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
        <input placeholder="Lote" value={form.lot_number} onChange={e => setForm({ ...form, lot_number: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
        <input placeholder="Area m2" type="number" value={form.area_m2} onChange={e => setForm({ ...form, area_m2: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
        <input placeholder="Preco" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
      </div>
      <input placeholder="Endereco" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
      <button onClick={() => form.loteamento_name && onSave({
        ...form, area_m2: Number(form.area_m2), price: Number(form.price), status: 'disponivel', features: [],
      })} className="glow-button w-full py-3 rounded-xl text-sm">
        Salvar Lote
      </button>
    </div>
  )
}
