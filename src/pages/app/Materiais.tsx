import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Material } from '../../types'
import { Plus, Search, AlertTriangle, X, TrendingDown } from 'lucide-react'

function useMaterials() {
  const qc = useQueryClient()

  const materialsQuery = useQuery({
    queryKey: ['tja7_materials'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tja7_materials').select('*').order('name')
      if (error) throw error
      return data as Material[]
    },
  })

  const createMaterial = useMutation({
    mutationFn: async (m: Partial<Material>) => {
      const { data, error } = await supabase.from('tja7_materials').insert(m).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_materials'] }),
  })

  const updateMaterial = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Material> & { id: string }) => {
      const { error } = await supabase.from('tja7_materials').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tja7_materials'] }),
  })

  return { materials: materialsQuery.data ?? [], isLoading: materialsQuery.isLoading, createMaterial, updateMaterial }
}

export default function Materiais() {
  const { materials, isLoading, createMaterial } = useMaterials()
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')

  const lowStock = materials.filter(m => m.stock_qty <= m.min_stock)
  const filtered = materials.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.category?.toLowerCase().includes(search.toLowerCase()))

  if (isLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Materiais</h1>
          <p className="text-white/40 text-sm">{materials.length} itens no estoque</p>
        </div>
        <button onClick={() => setShowNew(true)} className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2">
          <Plus size={16} /> Novo Material
        </button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm font-medium text-red-400">Estoque Baixo ({lowStock.length} itens)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(m => (
              <span key={m.id} className="text-xs px-2 py-1 bg-red-400/10 text-red-300 rounded">
                {m.name} ({m.stock_qty}/{m.min_stock})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold gradient-text">{materials.length}</p>
          <p className="text-xs text-white/40">Total Itens</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            R$ {materials.reduce((s, m) => s + m.stock_qty * m.price, 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-white/40">Valor em Estoque</p>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{lowStock.length}</p>
          <p className="text-xs text-white/40">Estoque Baixo</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar material..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-gold-400/40 focus:outline-none" />
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Material</th>
              <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Categoria</th>
              <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Preco</th>
              <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Estoque</th>
              <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Min.</th>
              <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Fornecedor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {m.stock_qty <= m.min_stock && <TrendingDown size={14} className="text-red-400" />}
                    <span className="text-sm font-medium">{m.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-white/40">{m.category}</td>
                <td className="px-4 py-3 text-sm">R$ {m.price.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${m.stock_qty <= m.min_stock ? 'text-red-400' : 'text-emerald-400'}`}>
                    {m.stock_qty} {m.unit}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-white/40">{m.min_stock} {m.unit}</td>
                <td className="px-4 py-3 text-xs text-white/40">{m.supplier ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-white/20 text-sm py-12">Nenhum material encontrado</p>
        )}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo Material</h2>
              <button onClick={() => setShowNew(false)} className="text-white/40"><X size={20} /></button>
            </div>
            <NewMaterialForm onSave={d => { createMaterial.mutate(d); setShowNew(false) }} />
          </div>
        </div>
      )}
    </div>
  )
}

function NewMaterialForm({ onSave }: { onSave: (d: Partial<Material>) => void }) {
  const [form, setForm] = useState({ name: '', category: '', price: '', stock_qty: '', min_stock: '', unit: 'un', supplier: '' })

  return (
    <div className="space-y-3">
      <input placeholder="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
      <input placeholder="Categoria" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Preco" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
        <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none">
          <option value="un">Unidade</option>
          <option value="kg">Kg</option>
          <option value="m">Metro</option>
          <option value="m2">m2</option>
          <option value="saco">Saco</option>
          <option value="lata">Lata</option>
        </select>
        <input placeholder="Qtd. estoque" type="number" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
        <input placeholder="Estoque min." type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
      </div>
      <input placeholder="Fornecedor" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
      <button onClick={() => form.name && onSave({
        ...form, price: Number(form.price), stock_qty: Number(form.stock_qty), min_stock: Number(form.min_stock),
      })} className="glow-button w-full py-3 rounded-xl text-sm">
        Salvar Material
      </button>
    </div>
  )
}
