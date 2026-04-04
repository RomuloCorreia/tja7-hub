import { useState, useMemo } from 'react'
import {
  Plus, Search, Minus, X, Check, TrendingDown, Filter,
  ArrowDownCircle, ArrowUpCircle, RefreshCw, Undo2
} from 'lucide-react'
import { useMaterials } from '../../../hooks/useMaterials'
import { useStockMovements } from '../../../hooks/useStockMovements'
import type { Material, StockMovementType } from '../../../types'

const movementLabels: Record<StockMovementType, string> = {
  entrada: 'Entrada',
  saida: 'Saida',
  ajuste: 'Ajuste',
  devolucao: 'Devolucao',
}

const movementColors: Record<StockMovementType, string> = {
  entrada: 'text-emerald-400',
  saida: 'text-red-400',
  ajuste: 'text-blue-400',
  devolucao: 'text-amber-400',
}

const movementIcons: Record<StockMovementType, typeof ArrowDownCircle> = {
  entrada: ArrowDownCircle,
  saida: ArrowUpCircle,
  ajuste: RefreshCw,
  devolucao: Undo2,
}

export default function MateriaisEstoque() {
  const { materials, isLoading, createMaterial, updateMaterial } = useMaterials()
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [supplierFilter, setSupplierFilter] = useState('todos')
  const [onlyLowStock, setOnlyLowStock] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)

  const categories = useMemo(() => {
    return [...new Set(materials.map(m => m.category).filter(Boolean))].sort()
  }, [materials])

  const suppliers = useMemo(() => {
    return [...new Set(materials.map(m => m.supplier).filter(Boolean))].sort() as string[]
  }, [materials])

  const filtered = materials.filter(m => {
    const matchSearch = !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.sku?.toLowerCase().includes(search.toLowerCase()) ||
      m.category?.toLowerCase().includes(search.toLowerCase())
    const matchCategory = categoryFilter === 'todas' || m.category === categoryFilter
    const matchSupplier = supplierFilter === 'todos' || m.supplier === supplierFilter
    const matchLow = !onlyLowStock || m.stock_qty <= m.min_stock
    return matchSearch && matchCategory && matchSupplier && matchLow
  })

  const handleQuickStockChange = async (e: React.MouseEvent, material: Material, delta: number) => {
    e.stopPropagation()
    const newQty = Math.max(0, material.stock_qty + delta)
    await updateMaterial.mutateAsync({ id: material.id, stock_qty: newQty })
  }

  const calcMargin = (price: number, cost: number | null) => {
    if (!cost || cost <= 0 || price <= 0) return null
    return ((price - cost) / price) * 100
  }

  const marginColor = (margin: number | null) => {
    if (margin === null) return 'text-white/20'
    if (margin >= 30) return 'text-emerald-400'
    if (margin >= 15) return 'text-amber-400'
    return 'text-red-400'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou SKU..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none text-white/60"
          >
            <option value="todas">Todas categorias</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none text-white/60"
          >
            <option value="todos">Todos fornecedores</option>
            {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={e => setOnlyLowStock(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-gold-400 focus:ring-gold-400/30"
            />
            <Filter size={14} />
            Baixo estoque
          </label>
        </div>
        <button onClick={() => setShowNew(true)} className="glow-button px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
          <Plus size={16} /> Novo Material
        </button>
      </div>

      {/* Results count */}
      <p className="text-xs text-white/30">{filtered.length} de {materials.length} materiais</p>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Material</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">SKU</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Categoria</th>
                <th className="text-right text-xs text-white/40 font-medium px-4 py-3">Venda</th>
                <th className="text-right text-xs text-white/40 font-medium px-4 py-3">Custo</th>
                <th className="text-right text-xs text-white/40 font-medium px-4 py-3">Margem</th>
                <th className="text-center text-xs text-white/40 font-medium px-4 py-3">Estoque</th>
                <th className="text-center text-xs text-white/40 font-medium px-4 py-3">Min.</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Fornecedor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const isLow = m.stock_qty <= m.min_stock
                const margin = calcMargin(m.price, m.cost)
                return (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedMaterial(m)}
                    className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer ${
                      isLow ? 'bg-red-400/[0.03]' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isLow && <TrendingDown size={14} className="text-red-400 flex-shrink-0" />}
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/30 font-mono">{m.sku || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-white/50">{m.category || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">R$ {m.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-sm text-right text-white/40">
                      {m.cost ? `R$ ${m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${marginColor(margin)}`}>
                      {margin !== null ? `${margin.toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => handleQuickStockChange(e, m, -1)}
                          className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-400/30 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className={`text-sm font-medium min-w-[3rem] text-center ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                          {m.stock_qty} {m.unit}
                        </span>
                        <button
                          onClick={e => handleQuickStockChange(e, m, 1)}
                          className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center text-white/40 hover:text-emerald-400 hover:border-emerald-400/30 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-center text-white/30">{m.min_stock} {m.unit}</td>
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
      </div>

      {/* New Material Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Novo Material</h2>
              <button onClick={() => setShowNew(false)} className="text-white/40 hover:text-white/80"><X size={20} /></button>
            </div>
            <NewMaterialForm onSave={d => { createMaterial.mutate(d); setShowNew(false) }} />
          </div>
        </div>
      )}

      {/* Detail / Edit Modal */}
      {selectedMaterial && (
        <MaterialDetailModal
          material={selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
          onSave={async (id, fields) => {
            await updateMaterial.mutateAsync({ id, ...fields })
            // Refresh selected material with updated fields
            setSelectedMaterial(prev => prev ? { ...prev, ...fields } as Material : null)
          }}
        />
      )}
    </div>
  )
}

/* ============ MATERIAL DETAIL MODAL ============ */
function MaterialDetailModal({
  material,
  onClose,
  onSave,
}: {
  material: Material
  onClose: () => void
  onSave: (id: string, fields: Partial<Material>) => Promise<void>
}) {
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'info' | 'movimentacoes'>('info')
  const { movements, isLoading: loadingMovements, createMovement } = useStockMovements(material.id)
  const { updateMaterial } = useMaterials()
  const [newMovement, setNewMovement] = useState({ type: 'entrada' as StockMovementType, quantity: '', reason: '' })
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
    setTimeout(() => setSaved(false), 1500)
  }

  const handleCreateMovement = async () => {
    const qty = Number(newMovement.quantity)
    if (!qty || qty <= 0) return

    await createMovement.mutateAsync({
      material_id: material.id,
      type: newMovement.type,
      quantity: qty,
      reason: newMovement.reason || null,
    })

    // Update stock based on movement type
    const currentStock = Number(form.stock_qty)
    let newStock = currentStock
    if (newMovement.type === 'entrada' || newMovement.type === 'devolucao') {
      newStock = currentStock + qty
    } else if (newMovement.type === 'saida') {
      newStock = Math.max(0, currentStock - qty)
    } else if (newMovement.type === 'ajuste') {
      newStock = qty // For adjustment, set the exact quantity
    }

    await updateMaterial.mutateAsync({ id: material.id, stock_qty: newStock })
    setForm(prev => ({ ...prev, stock_qty: String(newStock) }))
    setNewMovement({ type: 'entrada', quantity: '', reason: '' })
  }

  const margin = form.cost && Number(form.cost) > 0 && Number(form.price) > 0
    ? ((Number(form.price) - Number(form.cost)) / Number(form.price)) * 100
    : null

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none'
  const labelClass = 'text-xs text-white/40 mb-1 block'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">{material.name}</h2>
            {saved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check size={14} /> Salvo!</span>}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>

        {/* Margin banner */}
        {margin !== null && (
          <div className={`text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${
            margin >= 30 ? 'bg-emerald-400/10 text-emerald-400' :
            margin >= 15 ? 'bg-amber-400/10 text-amber-400' :
            'bg-red-400/10 text-red-400'
          }`}>
            Margem: {margin.toFixed(1)}%
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5">
          <button
            onClick={() => setTab('info')}
            className={`flex-1 text-sm py-2 rounded-md transition-colors ${tab === 'info' ? 'bg-gold-400/15 text-gold-400' : 'text-white/40'}`}
          >
            Informacoes
          </button>
          <button
            onClick={() => setTab('movimentacoes')}
            className={`flex-1 text-sm py-2 rounded-md transition-colors ${tab === 'movimentacoes' ? 'bg-gold-400/15 text-gold-400' : 'text-white/40'}`}
          >
            Movimentacoes
          </button>
        </div>

        {tab === 'info' ? (
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
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} className="glow-button flex-1 py-2.5 rounded-xl text-sm">Salvar</button>
              <button onClick={onClose} className="border border-white/10 text-white/40 hover:text-white/70 px-4 py-2.5 rounded-xl text-sm">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* New Movement Form */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium">Nova Movimentacao</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Tipo</label>
                  <select
                    value={newMovement.type}
                    onChange={e => setNewMovement({ ...newMovement, type: e.target.value as StockMovementType })}
                    className={inputClass}
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saida</option>
                    <option value="ajuste">Ajuste</option>
                    <option value="devolucao">Devolucao</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    value={newMovement.quantity}
                    onChange={e => setNewMovement({ ...newMovement, quantity: e.target.value })}
                    placeholder="0"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Motivo</label>
                  <input
                    value={newMovement.reason}
                    onChange={e => setNewMovement({ ...newMovement, reason: e.target.value })}
                    placeholder="Opcional"
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                onClick={handleCreateMovement}
                disabled={!newMovement.quantity || Number(newMovement.quantity) <= 0}
                className="glow-button px-4 py-2 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Registrar Movimentacao
              </button>
            </div>

            {/* Movement Timeline */}
            <div className="space-y-1">
              <h4 className="text-sm font-medium mb-2">Historico</h4>
              {loadingMovements ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !movements || movements.length === 0 ? (
                <p className="text-center text-white/20 text-sm py-8">Nenhuma movimentacao registrada</p>
              ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {[...movements].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(mv => {
                    const Icon = movementIcons[mv.type] || RefreshCw
                    const color = movementColors[mv.type] || 'text-white/40'
                    const label = movementLabels[mv.type] || mv.type
                    const date = new Date(mv.created_at)
                    return (
                      <div key={mv.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 ${color}`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className={`font-medium ${color}`}>{label}</span>
                            {mv.reason && <span className="text-white/30"> — {mv.reason}</span>}
                          </p>
                          <p className="text-[10px] text-white/20">
                            {date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`text-sm font-bold ${mv.type === 'saida' ? 'text-red-400' : 'text-emerald-400'}`}>
                          {mv.type === 'saida' ? '-' : '+'}{mv.quantity}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============ NEW MATERIAL FORM ============ */
function NewMaterialForm({ onSave }: { onSave: (d: Partial<Material>) => void }) {
  const [form, setForm] = useState({
    name: '', category: '', price: '', cost: '', stock_qty: '', min_stock: '', unit: 'un', supplier: '', sku: ''
  })

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none'
  const labelClass = 'text-xs text-white/40 mb-1 block'

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Nome *</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Ex: Cimento CP II 50kg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Categoria</label>
          <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass} placeholder="Ex: Cimento" />
        </div>
        <div>
          <label className={labelClass}>SKU</label>
          <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className={inputClass} placeholder="Ex: CIM-001" />
        </div>
        <div>
          <label className={labelClass}>Preco venda (R$)</label>
          <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputClass} placeholder="0.00" />
        </div>
        <div>
          <label className={labelClass}>Custo (R$)</label>
          <input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} className={inputClass} placeholder="0.00" />
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
          <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className={inputClass} placeholder="Ex: Votorantim" />
        </div>
        <div>
          <label className={labelClass}>Qtd. estoque</label>
          <input type="number" value={form.stock_qty} onChange={e => setForm({ ...form, stock_qty: e.target.value })} className={inputClass} placeholder="0" />
        </div>
        <div>
          <label className={labelClass}>Estoque minimo</label>
          <input type="number" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} className={inputClass} placeholder="0" />
        </div>
      </div>
      <button
        onClick={() => form.name && onSave({
          name: form.name,
          category: form.category || 'Geral',
          sku: form.sku || null,
          price: Number(form.price) || 0,
          cost: form.cost ? Number(form.cost) : null,
          unit: form.unit,
          stock_qty: Number(form.stock_qty) || 0,
          min_stock: Number(form.min_stock) || 0,
          supplier: form.supplier || null,
        })}
        disabled={!form.name}
        className="glow-button w-full py-3 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Salvar Material
      </button>
    </div>
  )
}
