import { useState, useMemo } from 'react'
import {
  Plus, X, FileText, Send, Check, Clock, Trash2, Package,
  MessageCircle, Copy
} from 'lucide-react'
import { useQuotes } from '../../../hooks/useQuotes'
import { useQuoteItems } from '../../../hooks/useQuoteItems'
import { useMaterials } from '../../../hooks/useMaterials'
import type { Quote, QuoteStatus } from '../../../types'

const statusConfig: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-white/50', bg: 'bg-white/10' },
  enviado: { label: 'Enviado', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  aprovado: { label: 'Aprovado', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  expirado: { label: 'Expirado', color: 'text-red-400', bg: 'bg-red-400/10' },
}

export default function MateriaisOrcamentos() {
  const { quotes, isLoading, createQuote, updateQuote } = useQuotes()
  const [showNew, setShowNew] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'todos'>('todos')

  const filtered = useMemo(() => {
    if (statusFilter === 'todos') return quotes
    return quotes.filter(q => q.status === statusFilter)
  }, [quotes, statusFilter])

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
            onChange={e => setStatusFilter(e.target.value as QuoteStatus | 'todos')}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none text-white/60"
          >
            <option value="todos">Todos status</option>
            <option value="rascunho">Rascunho</option>
            <option value="enviado">Enviado</option>
            <option value="aprovado">Aprovado</option>
            <option value="expirado">Expirado</option>
          </select>
          <span className="text-xs text-white/30">{filtered.length} orcamentos</span>
        </div>
        <button onClick={() => setShowNew(true)} className="glow-button px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
          <Plus size={16} /> Novo Orcamento
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['rascunho', 'enviado', 'aprovado', 'expirado'] as QuoteStatus[]).map(s => {
          const cfg = statusConfig[s]
          const count = quotes.filter(q => q.status === s).length
          const total = quotes.filter(q => q.status === s).reduce((sum, q) => sum + q.total, 0)
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'todos' : s)}
              className={`glass rounded-xl p-3 text-center transition-all ${statusFilter === s ? 'ring-1 ring-gold-400/30' : ''}`}
            >
              <p className={`text-lg font-bold ${cfg.color}`}>{count}</p>
              <p className="text-[10px] text-white/30">{cfg.label}</p>
              <p className="text-[10px] text-white/20 mt-0.5">R$ {total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
            </button>
          )
        })}
      </div>

      {/* Quotes List */}
      {filtered.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <FileText size={40} className="mx-auto text-white/10 mb-3" />
          <p className="text-white/30 text-sm">Nenhum orcamento encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(quote => {
            const cfg = statusConfig[quote.status]
            const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date() && quote.status !== 'aprovado'
            return (
              <div
                key={quote.id}
                onClick={() => setSelectedQuote(quote)}
                className={`glass rounded-xl p-4 hover:bg-white/[0.03] transition-colors cursor-pointer gradient-border ${
                  isExpired ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                      <FileText size={18} className={cfg.color} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{quote.client_name}</p>
                      <p className="text-xs text-white/30">
                        {quote.client_phone || 'Sem telefone'}
                        {quote.notes && ` — ${quote.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold gradient-text">
                        R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {quote.valid_until && (
                        <p className={`text-[10px] ${isExpired ? 'text-red-400' : 'text-white/30'}`}>
                          {isExpired ? 'Expirado' : `Valido ate ${new Date(quote.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}`}
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

      {/* New Quote Modal */}
      {showNew && (
        <NewQuoteModal
          onClose={() => setShowNew(false)}
          onCreate={async data => {
            await createQuote.mutateAsync(data)
            setShowNew(false)
          }}
        />
      )}

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <QuoteDetailModal
          quote={selectedQuote}
          onClose={() => setSelectedQuote(null)}
          onUpdateStatus={async (status) => {
            await updateQuote.mutateAsync({ id: selectedQuote.id, status })
            setSelectedQuote(prev => prev ? { ...prev, status } : null)
          }}
        />
      )}
    </div>
  )
}

/* ============ NEW QUOTE MODAL ============ */
function NewQuoteModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (data: Partial<Quote>) => Promise<void>
}) {
  const [form, setForm] = useState({ client_name: '', client_phone: '', valid_until: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none'
  const labelClass = 'text-xs text-white/40 mb-1 block'

  const handleCreate = async () => {
    if (!form.client_name) return
    setSaving(true)
    await onCreate({
      client_name: form.client_name,
      client_phone: form.client_phone || null,
      valid_until: form.valid_until || null,
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
          <h2 className="text-lg font-bold">Novo Orcamento</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Nome do cliente *</label>
            <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} className={inputClass} placeholder="Nome completo" />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })} className={inputClass} placeholder="(88) 99999-9999" />
          </div>
          <div>
            <label className={labelClass}>Valido ate</label>
            <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notas</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputClass} rows={3} placeholder="Observacoes..." />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={!form.client_name || saving}
          className="glow-button w-full py-3 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {saving ? 'Criando...' : 'Criar Orcamento'}
        </button>
      </div>
    </div>
  )
}

/* ============ QUOTE DETAIL MODAL ============ */
function QuoteDetailModal({ quote, onClose, onUpdateStatus }: {
  quote: Quote
  onClose: () => void
  onUpdateStatus: (status: QuoteStatus) => Promise<void>
}) {
  const { items, isLoading, createItem, deleteItem } = useQuoteItems(quote.id)
  const { materials } = useMaterials()
  const { updateQuote } = useQuotes()
  const [newItem, setNewItem] = useState({ material_id: '', quantity: '', unit_price: '' })
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [copied, setCopied] = useState(false)

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none'

  const total = useMemo(() => {
    return items.reduce((s, item) => s + item.quantity * item.unit_price, 0)
  }, [items])

  const handleAddItem = async () => {
    const qty = Number(newItem.quantity)
    const price = Number(newItem.unit_price)
    if (!newItem.material_id || !qty || !price) return

    const mat = materials.find(m => m.id === newItem.material_id)
    await createItem.mutateAsync({
      quote_id: quote.id,
      material_id: newItem.material_id,
      material_name: mat?.name || 'Material',
      quantity: qty,
      unit_price: price,
    })

    const newTotal = total + qty * price
    await updateQuote.mutateAsync({ id: quote.id, total: newTotal })
    setNewItem({ material_id: '', quantity: '', unit_price: '' })
  }

  const handleRemoveItem = async (itemId: string, itemTotal: number) => {
    await deleteItem.mutateAsync(itemId)
    const newTotal = Math.max(0, total - itemTotal)
    await updateQuote.mutateAsync({ id: quote.id, total: newTotal })
  }

  const handleMaterialSelect = (materialId: string) => {
    const mat = materials.find(m => m.id === materialId)
    setNewItem({
      ...newItem,
      material_id: materialId,
      unit_price: mat?.price ? String(mat.price) : newItem.unit_price,
    })
  }

  const handleStatusChange = async (status: QuoteStatus) => {
    setUpdatingStatus(true)
    try {
      await onUpdateStatus(status)
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Generate WhatsApp message
  const generateWhatsAppText = () => {
    let text = `*ORCAMENTO - TJA7 Materiais*\n`
    text += `Cliente: ${quote.client_name}\n`
    text += `Data: ${new Date().toLocaleDateString('pt-BR')}\n`
    if (quote.valid_until) text += `Valido ate: ${new Date(quote.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}\n`
    text += `\n---\n`
    items.forEach((item, i) => {
      text += `${i + 1}. ${item.material_name}\n`
      text += `   ${item.quantity}x R$ ${item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ ${(item.quantity * item.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`
    })
    text += `---\n`
    text += `*TOTAL: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n`
    text += `\nTJA7 Empreendimentos`
    return text
  }

  const handleWhatsApp = () => {
    const text = generateWhatsAppText()
    const phone = quote.client_phone?.replace(/\D/g, '') || ''
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const handleCopyText = () => {
    const text = generateWhatsAppText()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cfg = statusConfig[quote.status]
  const canEdit = quote.status === 'rascunho'
  const canSend = quote.status === 'rascunho' && items.length > 0

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{quote.client_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2.5 py-1 rounded-lg ${cfg.bg} ${cfg.color} font-medium`}>{cfg.label}</span>
              {quote.client_phone && (
                <span className="text-xs text-white/30">{quote.client_phone}</span>
              )}
              {quote.valid_until && (
                <span className="text-xs text-white/30 flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(quote.valid_until + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>

        {quote.notes && (
          <p className="text-xs text-white/40 bg-white/[0.03] p-3 rounded-lg">{quote.notes}</p>
        )}

        {/* Items Table */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Itens do Orcamento</h3>
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
                      <td className="px-3 py-2.5 text-sm text-right text-white/60">
                        R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
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
                  <option key={m.id} value={m.id}>{m.name} — R$ {m.price.toLocaleString('pt-BR')}</option>
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
              <Send size={14} /> Marcar Enviado
            </button>
          )}
          {quote.status === 'enviado' && (
            <button
              onClick={() => handleStatusChange('aprovado')}
              disabled={updatingStatus}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-30"
            >
              <Check size={14} /> Aprovar
            </button>
          )}

          {/* WhatsApp + Copy buttons */}
          {items.length > 0 && (
            <>
              <button
                onClick={handleWhatsApp}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-green-500/10 text-green-400 border border-green-400/20 hover:bg-green-500/20 transition-colors"
              >
                <MessageCircle size={14} /> Enviar por WhatsApp
              </button>
              <button
                onClick={handleCopyText}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <Copy size={14} /> {copied ? 'Copiado!' : 'Copiar texto'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
