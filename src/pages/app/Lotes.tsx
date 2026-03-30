import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Lot } from '../../types'
import { MapPin, Plus, Search, X, Maximize } from 'lucide-react'

function useLots() {
  const qc = useQueryClient()

  const lotsQuery = useQuery({
    queryKey: ['tja7_lots'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tja7_lots').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Lot[]
    },
  })

  const createLot = useMutation({
    mutationFn: async (lot: Partial<Lot>) => {
      const { data, error } = await supabase.from('tja7_lots').insert(lot).select().single()
      if (error) throw error
      return data as Lot
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_lots'] }),
  })

  return { lots: lotsQuery.data ?? [], isLoading: lotsQuery.isLoading, createLot }
}

export default function Lotes() {
  const { lots, isLoading, createLot } = useLots()
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todos')

  const filtered = lots.filter(l => {
    const matchSearch = !search || l.loteamento_name.toLowerCase().includes(search.toLowerCase()) || l.lot_number.includes(search)
    const matchFilter = filter === 'todos' || l.status === filter
    return matchSearch && matchFilter
  })

  const statusColors: Record<string, string> = { disponivel: '#34d399', reservado: '#F5C518', vendido: '#ef4444' }

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
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: `${statusColors[lot.status]}15`, color: statusColors[lot.status] }}>
                {lot.status}
              </span>
            </div>
            <p className="text-sm font-medium">Quadra {lot.block} - Lote {lot.lot_number}</p>
            <p className="text-lg font-bold gradient-text mt-1">R$ {lot.price.toLocaleString('pt-BR')}</p>
            <div className="flex items-center gap-3 text-xs text-white/40 mt-2 pt-2 border-t border-white/5">
              <span className="flex items-center gap-1"><Maximize size={10} />{lot.area_m2}m2</span>
              {lot.address && <span className="flex items-center gap-1"><MapPin size={10} />{lot.address}</span>}
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
    </div>
  )
}

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
