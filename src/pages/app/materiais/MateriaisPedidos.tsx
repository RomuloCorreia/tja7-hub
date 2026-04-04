import { useState, useMemo } from 'react'
import { Plus, X, ShoppingCart, Truck, Check, Send, Ban, Trash2, Package } from 'lucide-react'
import { usePurchaseOrders } from '../../../hooks/usePurchaseOrders'
import { usePurchaseOrderItems } from '../../../hooks/usePurchaseOrderItems'
import { useMaterials } from '../../../hooks/useMaterials'
import type { PurchaseOrder, PurchaseOrderStatus } from '../../../types'

const statusConfig: Record<PurchaseOrderStatus, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-white/50', bg: 'bg-white/10' },
  enviado: { label: 'Enviado', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  confirmado: { label: 'Confirmado', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  entregue: { label: 'Entregue', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  cancelado: { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-400/10' },
}

export default function MateriaisPedidos() {
  const { orders, isLoading, createOrder, updateOrder } = usePurchaseOrders()
  const [showNew, setShowNew] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'todos'>('todos')

  const filtered = useMemo(() => {
    if (statusFilter === 'todos') return orders
    return orders.filter(o => o.status === statusFilter)
  }, [orders, statusFilter])

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
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as PurchaseOrderStatus | 'todos')}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none text-white/60"
          >
            <option value="todos">Todos status</option>
            <option value="rascunho">Rascunho</option>
            <option value="enviado">Enviado</option>
            <option value="confirmado">Confirmado</option>
            <option value="entregue">Entregue</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <span className="text-xs text-white/30">{filtered.length} pedidos</span>
        </div>
        <button onClick={() => setShowNew(true)} className="glow-button px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
          <Plus size={16} /> Novo Pedido
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['rascunho', 'enviado', 'confirmado', 'entregue', 'cancelado'] as PurchaseOrderStatus[]).map(s => {
          const cfg = statusConfig[s]
          const count = orders.filter(o => o.status === s).length
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'todos' : s)}
              className={`glass rounded-xl p-3 text-center transition-all ${statusFilter === s ? 'ring-1 ring-gold-400/30' : ''}`}
            >
              <p className={`text-lg font-bold ${cfg.color}`}>{count}</p>
              <p className="text-[10px] text-white/30">{cfg.label}</p>
            </button>
          )
        })}
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <ShoppingCart size={40} className="mx-auto text-white/10 mb-3" />
          <p className="text-white/30 text-sm">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(order => {
            const cfg = statusConfig[order.status]
            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="glass rounded-xl p-4 hover:bg-white/[0.03] transition-colors cursor-pointer gradient-border"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                      <Truck size={18} className={cfg.color} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{order.supplier}</p>
                      <p className="text-xs text-white/30">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        {order.notes && ` — ${order.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold gradient-text">
                        R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {order.expected_delivery && (
                        <p className="text-[10px] text-white/30">
                          Previsto: {new Date(order.expected_delivery + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-lg ${cfg.bg} ${cfg.color} font-medium`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New Order Modal */}
      {showNew && (
        <NewOrderModal
          onClose={() => setShowNew(false)}
          onCreate={async data => {
            await createOrder.mutateAsync(data)
            setShowNew(false)
          }}
        />
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={async (status) => {
            await updateOrder.mutateAsync({ id: selectedOrder.id, status })
            setSelectedOrder(prev => prev ? { ...prev, status } : null)
          }}
        />
      )}
    </div>
  )
}

/* ============ NEW ORDER MODAL ============ */
function NewOrderModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (data: Partial<PurchaseOrder>) => Promise<void>
}) {
  const [form, setForm] = useState({ supplier: '', expected_delivery: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none'
  const labelClass = 'text-xs text-white/40 mb-1 block'

  const handleCreate = async () => {
    if (!form.supplier) return
    setSaving(true)
    await onCreate({
      supplier: form.supplier,
      expected_delivery: form.expected_delivery || null,
      notes: form.notes || null,
      status: 'rascunho',
      total: 0,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Novo Pedido de Compra</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Fornecedor *</label>
            <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className={inputClass} placeholder="Nome do fornecedor" />
          </div>
          <div>
            <label className={labelClass}>Data prevista de entrega</label>
            <input type="date" value={form.expected_delivery} onChange={e => setForm({ ...form, expected_delivery: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputClass} rows={3} placeholder="Observacoes..." />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={!form.supplier || saving}
          className="glow-button w-full py-3 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {saving ? 'Criando...' : 'Criar Pedido'}
        </button>
      </div>
    </div>
  )
}

/* ============ ORDER DETAIL MODAL ============ */
function OrderDetailModal({ order, onClose, onUpdateStatus }: {
  order: PurchaseOrder
  onClose: () => void
  onUpdateStatus: (status: PurchaseOrderStatus) => Promise<void>
}) {
  const { items, isLoading, createItem, deleteItem } = usePurchaseOrderItems(order.id)
  const { materials } = useMaterials()
  const { updateMaterial } = useMaterials()
  const { updateOrder } = usePurchaseOrders()
  const [newItem, setNewItem] = useState({ material_id: '', quantity: '', unit_price: '' })
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none'

  const total = useMemo(() => {
    return items.reduce((s, item) => s + item.quantity * item.unit_price, 0)
  }, [items])

  // Sync total when items change
  const handleAddItem = async () => {
    const qty = Number(newItem.quantity)
    const price = Number(newItem.unit_price)
    if (!newItem.material_id || !qty || !price) return

    const mat = materials.find(m => m.id === newItem.material_id)
    await createItem.mutateAsync({
      order_id: order.id,
      material_id: newItem.material_id,
      material_name: mat?.name || 'Material',
      quantity: qty,
      unit_price: price,
    })

    // Update order total
    const newTotal = total + qty * price
    await updateOrder.mutateAsync({ id: order.id, total: newTotal })

    setNewItem({ material_id: '', quantity: '', unit_price: '' })
  }

  const handleRemoveItem = async (itemId: string, itemTotal: number) => {
    await deleteItem.mutateAsync(itemId)
    const newTotal = Math.max(0, total - itemTotal)
    await updateOrder.mutateAsync({ id: order.id, total: newTotal })
  }

  const handleStatusChange = async (status: PurchaseOrderStatus) => {
    setUpdatingStatus(true)
    try {
      // If marking as delivered, update stock for all items
      if (status === 'entregue') {
        for (const item of items) {
          if (item.material_id) {
            const mat = materials.find(m => m.id === item.material_id)
            if (mat) {
              await updateMaterial.mutateAsync({
                id: mat.id,
                stock_qty: mat.stock_qty + item.quantity,
              })
            }
          }
        }
      }
      await onUpdateStatus(status)
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Auto-fill unit_price when material selected
  const handleMaterialSelect = (materialId: string) => {
    const mat = materials.find(m => m.id === materialId)
    setNewItem({
      ...newItem,
      material_id: materialId,
      unit_price: mat?.cost ? String(mat.cost) : mat?.price ? String(mat.price) : newItem.unit_price,
    })
  }

  const cfg = statusConfig[order.status]
  const canEdit = order.status === 'rascunho'
  const canSend = order.status === 'rascunho' && items.length > 0
  const canDeliver = order.status === 'confirmado'
  const canCancel = order.status !== 'entregue' && order.status !== 'cancelado'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{order.supplier}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2.5 py-1 rounded-lg ${cfg.bg} ${cfg.color} font-medium`}>{cfg.label}</span>
              {order.expected_delivery && (
                <span className="text-xs text-white/30">
                  Previsto: {new Date(order.expected_delivery + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>

        {order.notes && (
          <p className="text-xs text-white/40 bg-white/[0.03] p-3 rounded-lg">{order.notes}</p>
        )}

        {/* Items Table */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Itens do Pedido</h3>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-white/20 text-sm py-6">Nenhum item adicionado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs text-white/40 font-medium px-3 py-2">Material</th>
                    <th className="text-right text-xs text-white/40 font-medium px-3 py-2">Qtd</th>
                    <th className="text-right text-xs text-white/40 font-medium px-3 py-2">Valor Un.</th>
                    <th className="text-right text-xs text-white/40 font-medium px-3 py-2">Subtotal</th>
                    {canEdit && <th className="w-8"></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-white/5">
                      <td className="px-3 py-2.5 text-sm">{item.material_name}</td>
                      <td className="px-3 py-2.5 text-sm text-right">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-sm text-right text-white/60">R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2.5 text-sm text-right font-medium">
                        R$ {(item.quantity * item.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      {canEdit && (
                        <td className="px-2">
                          <button
                            onClick={() => handleRemoveItem(item.id, item.quantity * item.unit_price)}
                            className="text-white/20 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10">
                    <td colSpan={3} className="px-3 py-3 text-sm font-semibold text-right">Total:</td>
                    <td className="px-3 py-3 text-sm font-bold gradient-text text-right">
                      R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    {canEdit && <td></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Add Item (only when rascunho) */}
        {canEdit && (
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Package size={14} className="text-gold-400" />
              Adicionar Item
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <select
                value={newItem.material_id}
                onChange={e => handleMaterialSelect(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecionar material</option>
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                placeholder="Quantidade"
                className={inputClass}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={newItem.unit_price}
                onChange={e => setNewItem({ ...newItem, unit_price: e.target.value })}
                placeholder="Valor unitario"
                className={inputClass}
              />
            </div>
            <button
              onClick={handleAddItem}
              disabled={!newItem.material_id || !newItem.quantity || !newItem.unit_price}
              className="glow-button px-4 py-2 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Adicionar
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          {canSend && (
            <button
              onClick={() => handleStatusChange('enviado')}
              disabled={updatingStatus}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-blue-500/10 text-blue-400 border border-blue-400/20 hover:bg-blue-500/20 transition-colors disabled:opacity-30"
            >
              <Send size={14} /> Enviar ao Fornecedor
            </button>
          )}
          {order.status === 'enviado' && (
            <button
              onClick={() => handleStatusChange('confirmado')}
              disabled={updatingStatus}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-amber-500/10 text-amber-400 border border-amber-400/20 hover:bg-amber-500/20 transition-colors disabled:opacity-30"
            >
              <Check size={14} /> Confirmar Pedido
            </button>
          )}
          {canDeliver && (
            <button
              onClick={() => handleStatusChange('entregue')}
              disabled={updatingStatus}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-30"
            >
              <Truck size={14} /> Marcar Entregue
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => handleStatusChange('cancelado')}
              disabled={updatingStatus}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-400/20 hover:bg-red-500/20 transition-colors disabled:opacity-30"
            >
              <Ban size={14} /> Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
