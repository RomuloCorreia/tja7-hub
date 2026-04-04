import { useState, useMemo } from 'react'
import type { Material } from '../../types'
import { Plus, Search, AlertTriangle, X, TrendingDown, Minus, Check } from 'lucide-react'
import { useMaterials } from '../../hooks/useMaterials'

export default function Materiais() {
  const { materials, isLoading, createMaterial, updateMaterial } = useMaterials()
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  const lowStock = materials.filter(m => m.stock_qty <= m.min_stock)

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(materials.map(m => m.category).filter(Boolean))].sort()
    return cats
  }, [materials])

  const filtered = materials.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.category?.toLowerCase().includes(search.toLowerCase())
    const matchCategory = categoryFilter === 'todas' || m.category === categoryFilter
    return matchSearch && matchCategory
  })

  const handleStockChange = async (material: Material, delta: number) => {
    const newQty = Math.max(0, material.stock_qty + delta)
    await updateMaterial.mutateAsync({ id: material.id, stock_qty: newQty })
  }

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

      {/* Search + Category filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar material..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-gold-400/40 focus:outline-none" />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-gold-400/40 focus:outline-none text-white/60"
        >
          <option value="todas">Todas categorias</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
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
            {filtered.map(m => {
              const isLow = m.stock_qty <= m.min_stock
              return (
                <tr
                  key={m.id}
                  className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer ${
                    isLow ? 'bg-red-400/5 border-l-2 border-l-red-400' : ''
                  }`}
                  onClick={() => setEditingMaterial(m)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isLow && <TrendingDown size={14} className="text-red-400" />}
                      <span className="text-sm font-medium">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">{m.category}</td>
                  <td className="px-4 py-3 text-sm">R$ {m.price.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleStockChange(m, -1)}
                        className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className={`text-sm font-medium min-w-[3rem] text-center ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                        {m.stock_qty} {m.unit}
                      </span>
                      <button
                        onClick={() => handleStockChange(m, 1)}
                        className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">{m.min_stock} {m.unit}</td>
                  <td className="px-4 py-3 text-xs text-white/40">{m.supplier ?? '-'}</td>
                </tr>
              )
            })}
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

      {editingMaterial && (
        <EditMaterialModal
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
          onSave={async (id, fields) => {
            await updateMaterial.mutateAsync({ id, ...fields })
            setEditingMaterial(null)
          }}
        />
      )}
    </div>
  )
}

/* ============ EDIT MATERIAL MODAL ============ */
function EditMaterialModal({
  material,
  onClose,
  onSave,
}: {
  material: Material
  onClose: () => void
  onSave: (id: string, fields: Partial<Material>) => Promise<void>
}) {
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: material.name,
    category: material.category,
    price: String(material.price),
    cost: material.cost != null ? String(material.cost) : '',
    unit: material.unit,
    stock_qty: String(material.stock_qty),
    min_stock: String(material.min_stock),
    supplier: material.supplier ?? '',
    sku: material.sku ?? '',
  })

  const handleSave = async () => {
    await onSave(material.id, {
      name: form.name,
      category: form.category,
      price: Number(form.price),
      cost: form.cost ? Number(form.cost) : null,
      unit: form.unit,
      stock_qty: Number(form.stock_qty),
      min_stock: Number(form.min_stock),
      supplier: form.supplier || null,
      sku: form.sku || null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1000)
  }

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none'
  const labelClass = 'text-xs text-white/40 mb-1 block'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">Editar Material</h2>
            {saved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check size={14} /> Salvo!</span>}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Nome</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Categoria</label>
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>SKU</label>
              <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Preco venda (R$)</label>
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Custo (R$)</label>
              <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Unidade</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className={inputClass}>
                <option value="un">Unidade</option>
                <option value="kg">Kg</option>
                <option value="m">Metro</option>
                <option value="m2">m2</option>
                <option value="saco">Saco</option>
                <option value="lata">Lata</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Fornecedor</label>
              <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Qtd. estoque</label>
              <input type="number" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Estoque minimo</label>
              <input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} className={inputClass} />
            </div>
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

/* ============ NEW MATERIAL FORM ============ */
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
