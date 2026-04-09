import { useState, useRef, useEffect, useMemo } from 'react'
// import { motion, AnimatePresence } from 'framer-motion'
import {
  useConversations, useMessages, useSendMessage, useToggleAI,
  type Conversation, type WhatsAppMessage,
} from '../../../hooks/useWhatsApp'
import { useClients } from '../../../hooks/useClients'
import { useSimulations } from '../../../hooks/useSimulations'
import {
  MessageCircle, Send, Search, Bot, BotOff, Phone, User, Clock,
  ArrowLeft, Calculator, CheckCheck,
  Check, AlertCircle, Loader2, Sparkles, X,
} from 'lucide-react'

// ============================================
// Helpers
// ============================================

function timeAgo(date: string): string {
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date: string): string {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Hoje'
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'read': return <CheckCheck size={12} className="text-blue-400" />
    case 'delivered': return <CheckCheck size={12} className="text-white/30" />
    case 'sent': return <Check size={12} className="text-white/30" />
    case 'failed': return <AlertCircle size={12} className="text-red-400" />
    default: return <Clock size={12} className="text-white/20" />
  }
}

const senderLabel = (type: string) => {
  switch (type) {
    case 'ai_agent': return { label: 'Carol IA', color: 'text-gold-400' }
    case 'human': return { label: 'Atendente', color: 'text-emerald-400' }
    case 'system': return { label: 'Sistema', color: 'text-blue-400' }
    default: return null
  }
}

const stageLabels: Record<string, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-blue-400/10 text-blue-400' },
  simulado: { label: 'Simulado', color: 'bg-gold-400/10 text-gold-400' },
  documentacao: { label: 'Documentacao', color: 'bg-purple-400/10 text-purple-400' },
  aprovado: { label: 'Aprovado', color: 'bg-emerald-400/10 text-emerald-400' },
  construindo: { label: 'Construindo', color: 'bg-orange-400/10 text-orange-400' },
  entregue: { label: 'Entregue', color: 'bg-green-400/10 text-green-400' },
  perdido: { label: 'Perdido', color: 'bg-red-400/10 text-red-400' },
}

// ============================================
// ConversationList
// ============================================

function ConversationList({
  conversations,
  selected,
  onSelect,
  search,
  onSearch,
  filter,
  onFilter,
  loading,
}: {
  conversations: Conversation[]
  selected: string | null
  onSelect: (id: string) => void
  search: string
  onSearch: (v: string) => void
  filter: string
  onFilter: (v: string) => void
  loading: boolean
}) {
  const filtered = useMemo(() => {
    let list = conversations
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.contact_name?.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.client?.name?.toLowerCase().includes(q)
      )
    }
    if (filter === 'active') list = list.filter(c => !c.ai_paused && c.status === 'active')
    if (filter === 'paused') list = list.filter(c => c.ai_paused)
    if (filter === 'transferred') list = list.filter(c => c.status === 'transferred')
    return list
  }, [conversations, search, filter])

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-white/5 space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 rounded-lg text-xs text-white placeholder-white/30 border border-white/5 focus:border-gold-400/30 focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'Todas' },
            { key: 'active', label: 'Ativas' },
            { key: 'paused', label: 'Pausadas' },
            { key: 'transferred', label: 'Transferidas' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => onFilter(f.key)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                filter === f.key ? 'bg-gold-400/15 text-gold-400' : 'text-white/30 hover:text-white/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-white/20" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageCircle size={32} className="mx-auto text-white/10 mb-2" />
            <p className="text-xs text-white/30">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filtered.map(conv => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full px-3 py-3 flex items-start gap-3 border-b border-white/5 transition-all text-left ${
                selected === conv.id
                  ? 'bg-gold-400/5 border-l-2 border-l-gold-400'
                  : 'hover:bg-white/3 border-l-2 border-l-transparent'
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white/30" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white truncate">
                    {conv.client?.name || conv.contact_name || conv.phone}
                  </span>
                  <span className="text-[10px] text-white/30 flex-shrink-0">
                    {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
                  </span>
                </div>

                <p className="text-[11px] text-white/40 truncate mt-0.5">
                  {conv.last_message || 'Sem mensagens'}
                </p>

                <div className="flex items-center gap-1.5 mt-1">
                  {conv.ai_paused ? (
                    <span className="flex items-center gap-0.5 text-[9px] text-red-400/60">
                      <BotOff size={10} /> IA off
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[9px] text-gold-400/60">
                      <Bot size={10} /> Carol
                    </span>
                  )}
                  {conv.client?.stage && stageLabels[conv.client.stage] && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${stageLabels[conv.client.stage].color}`}>
                      {stageLabels[conv.client.stage].label}
                    </span>
                  )}
                </div>
              </div>

              {(conv.unread_count || 0) > 0 && (
                <span className="w-5 h-5 rounded-full bg-gold-400 text-[10px] font-bold text-black flex items-center justify-center flex-shrink-0">
                  {conv.unread_count}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="px-3 py-2 border-t border-white/5 text-center">
        <span className="text-[10px] text-white/20">{filtered.length} conversa{filtered.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

// ============================================
// ChatPanel
// ============================================

function ChatPanel({
  conversation,
  messages,
  loading,
  onSend,
  onToggleAI,
  onBack,
  sending,
}: {
  conversation: Conversation | null
  messages: WhatsAppMessage[]
  loading: boolean
  onSend: (text: string) => void
  onToggleAI: () => void
  onBack: () => void
  sending: boolean
}) {
  const [text, setText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle size={48} className="mx-auto text-white/10 mb-3" />
          <p className="text-sm text-white/30">Selecione uma conversa</p>
          <p className="text-xs text-white/15 mt-1">As mensagens aparecerao aqui</p>
        </div>
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    onSend(text.trim())
    setText('')
  }

  // Agrupar mensagens por data
  const grouped: { date: string; msgs: WhatsAppMessage[] }[] = []
  for (const msg of messages) {
    const dateStr = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.date === dateStr) {
      last.msgs.push(msg)
    } else {
      grouped.push({ date: dateStr, msgs: [msg] })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-[var(--color-surface)]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="lg:hidden text-white/40 hover:text-white/70">
            <ArrowLeft size={18} />
          </button>
          <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
            <User size={14} className="text-white/30" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {conversation.client?.name || conversation.contact_name || conversation.phone}
            </p>
            <p className="text-[10px] text-white/30">{conversation.phone}</p>
          </div>
        </div>

        <button
          onClick={onToggleAI}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            conversation.ai_paused
              ? 'bg-white/5 text-white/40 hover:bg-gold-400/10 hover:text-gold-400'
              : 'bg-gold-400/10 text-gold-400 hover:bg-red-400/10 hover:text-red-400'
          }`}
        >
          {conversation.ai_paused ? <BotOff size={14} /> : <Bot size={14} />}
          {conversation.ai_paused ? 'Ativar Carol' : 'Pausar Carol'}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-white/20" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles size={32} className="mx-auto text-gold-400/20 mb-2" />
            <p className="text-xs text-white/30">Conversa iniciada</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-3">
                <span className="px-3 py-1 rounded-full bg-white/5 text-[10px] text-white/30">
                  {group.date}
                </span>
              </div>

              {group.msgs.map(msg => {
                const isOutbound = msg.direction === 'outbound'
                const sender = isOutbound ? senderLabel(msg.sender_type) : null

                return (
                  <div
                    key={msg.id}
                    className={`flex mb-1.5 ${isOutbound ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                        isOutbound
                          ? msg.sender_type === 'ai_agent'
                            ? 'bg-gold-400/10 border border-gold-400/10'
                            : 'bg-emerald-400/10 border border-emerald-400/10'
                          : 'bg-white/5 border border-white/5'
                      }`}
                    >
                      {/* Sender label */}
                      {sender && (
                        <p className={`text-[9px] font-medium mb-0.5 ${sender.color}`}>
                          {sender.label}
                        </p>
                      )}

                      {/* Content */}
                      <p className="text-[13px] text-white/85 leading-relaxed whitespace-pre-wrap">
                        {msg.content || `[${msg.message_type}]`}
                      </p>

                      {/* Footer */}
                      <div className={`flex items-center gap-1 mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[9px] text-white/20">
                          {formatTime(msg.created_at)}
                        </span>
                        {isOutbound && statusIcon(msg.status)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-white/5 flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={conversation.ai_paused ? 'Enviar como atendente...' : 'Carol esta respondendo. Digite para enviar manual...'}
          className="flex-1 px-4 py-2.5 bg-white/5 rounded-xl text-sm text-white placeholder-white/25 border border-white/5 focus:border-gold-400/30 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-xl bg-gold-400/15 text-gold-400 flex items-center justify-center hover:bg-gold-400/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  )
}

// ============================================
// LeadDetail (painel lateral direito)
// ============================================

function LeadDetail({
  conversation,
  onClose,
}: {
  conversation: Conversation | null
  onClose: () => void
}) {
  const { clients: allClients } = useClients()
  const { simulations: allSimulations } = useSimulations()

  if (!conversation?.client) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-white/20">Sem dados do cliente</p>
      </div>
    )
  }

  const client = allClients?.find((c: any) => c.id === conversation.client?.id) || conversation.client
  const simulations = allSimulations?.filter((s: any) => s.client_id === conversation.client?.id) || []

  const stage = stageLabels[(client as any).stage] || stageLabels['novo']

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Dados do Lead</h3>
        <button onClick={onClose} className="lg:hidden text-white/30 hover:text-white/60">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Info basica */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gold-400/10 flex items-center justify-center">
              <User size={20} className="text-gold-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{(client as any).name}</p>
              <p className="text-[11px] text-white/40">{(client as any).phone}</p>
            </div>
          </div>

          <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${stage.color}`}>
            {stage.label}
          </span>
        </div>

        {/* Detalhes */}
        <div className="space-y-2">
          <h4 className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Informacoes</h4>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { icon: Phone, label: 'Telefone', value: (client as any).phone },
              { icon: User, label: 'Origem', value: (client as any).source || 'whatsapp' },
              { icon: Clock, label: 'Desde', value: (client as any).created_at ? new Date((client as any).created_at).toLocaleDateString('pt-BR') : '-' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 px-2.5 py-1.5 bg-white/3 rounded-lg">
                <item.icon size={12} className="text-white/20" />
                <span className="text-[10px] text-white/30">{item.label}:</span>
                <span className="text-[11px] text-white/60">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Simulacoes */}
        {simulations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] text-white/30 uppercase tracking-wider font-medium flex items-center gap-1">
              <Calculator size={10} /> Simulacoes ({simulations.length})
            </h4>
            <div className="space-y-1.5">
              {simulations.slice(0, 5).map((sim: any) => (
                <div key={sim.id} className="p-2.5 bg-white/3 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gold-400 font-medium">Faixa {sim.faixa}</span>
                    <span className="text-[9px] text-white/20">
                      {new Date(sim.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-[10px]">
                    <span className="text-white/30">Renda: <span className="text-white/60">R$ {Number(sim.gross_income).toLocaleString('pt-BR')}</span></span>
                    <span className="text-white/30">Imovel: <span className="text-white/60">R$ {Number(sim.property_value).toLocaleString('pt-BR')}</span></span>
                    <span className="text-white/30">Subsidio: <span className="text-emerald-400/70">R$ {Number(sim.subsidy).toLocaleString('pt-BR')}</span></span>
                    <span className="text-white/30">Financ: <span className="text-white/60">R$ {Number(sim.financing_amount).toLocaleString('pt-BR')}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Carol Status */}
        <div className="space-y-2">
          <h4 className="text-[10px] text-white/30 uppercase tracking-wider font-medium flex items-center gap-1">
            <Bot size={10} /> Carol IA
          </h4>
          <div className={`p-2.5 rounded-lg border ${
            conversation.ai_paused
              ? 'bg-red-400/5 border-red-400/10'
              : 'bg-gold-400/5 border-gold-400/10'
          }`}>
            <p className={`text-[11px] font-medium ${conversation.ai_paused ? 'text-red-400' : 'text-gold-400'}`}>
              {conversation.ai_paused ? 'IA Pausada' : 'IA Ativa'}
            </p>
            <p className="text-[10px] text-white/30 mt-0.5">
              {conversation.ai_paused
                ? 'Mensagens nao serao respondidas automaticamente'
                : 'Carol esta respondendo automaticamente'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Main Page
// ============================================

export default function CorrespondenteWhatsApp() {
  const { data: conversations, isLoading: loadingConvs } = useConversations()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const selected = useMemo(
    () => conversations?.find(c => c.id === selectedId) || null,
    [conversations, selectedId]
  )

  const { data: messages, isLoading: loadingMsgs } = useMessages(selectedId)
  const sendMutation = useSendMessage()
  const toggleAI = useToggleAI()

  const handleSend = (text: string) => {
    if (!selected) return
    sendMutation.mutate({
      conversationId: selected.id,
      phone: selected.phone,
      text,
      clientId: selected.client?.id,
    })
  }

  const handleToggleAI = () => {
    if (!selected) return
    toggleAI.mutate({ conversationId: selected.id, paused: !selected.ai_paused })
  }

  return (
    <div className="flex h-[calc(100vh-180px)] bg-[var(--color-surface)] rounded-xl border border-white/5 overflow-hidden">
      {/* Col 1: Conversations */}
      <div className={`w-80 border-r border-white/5 flex-shrink-0 ${
        selectedId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col w-full lg:w-80'
      }`}>
        <ConversationList
          conversations={conversations || []}
          selected={selectedId}
          onSelect={setSelectedId}
          search={search}
          onSearch={setSearch}
          filter={filter}
          onFilter={setFilter}
          loading={loadingConvs}
        />
      </div>

      {/* Col 2: Chat */}
      <div className={`flex-1 flex flex-col min-w-0 ${
        !selectedId ? 'hidden lg:flex' : 'flex'
      }`}>
        <ChatPanel
          conversation={selected}
          messages={messages || []}
          loading={loadingMsgs}
          onSend={handleSend}
          onToggleAI={handleToggleAI}
          onBack={() => setSelectedId(null)}
          sending={sendMutation.isPending}
        />
      </div>

      {/* Col 3: Lead Detail */}
      {selectedId && showDetail && (
        <div className="w-72 border-l border-white/5 flex-shrink-0 hidden xl:flex xl:flex-col">
          <LeadDetail
            conversation={selected}
            onClose={() => setShowDetail(false)}
          />
        </div>
      )}
    </div>
  )
}
