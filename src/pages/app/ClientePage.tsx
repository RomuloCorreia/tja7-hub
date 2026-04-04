import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClients } from '../../hooks/useClients'
import { useSimulations } from '../../hooks/useSimulations'
import { useConstructions } from '../../hooks/useConstructions'
import { useInteractions } from '../../hooks/useInteractions'
import {
  PIPELINE_STAGES,
  type ClientInterest,
  type InteractionType,
  type ConstructionPhase,
} from '../../types'
import {
  ArrowLeft, Star, MessageSquare, Phone, MapPin, Mail, FileText,
  Edit3, Save, X, ExternalLink, Plus, Send,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type TabKey = 'dados' | 'simulacoes' | 'obras' | 'interacoes'

const INTEREST_OPTIONS: ClientInterest[] = ['financiamento', 'lote', 'imovel_pronto', 'construcao', 'material', 'consorcio']

const INTEREST_LABELS: Record<ClientInterest, string> = {
  financiamento: 'Financiamento',
  lote: 'Lote',
  imovel_pronto: 'Imóvel Pronto',
  construcao: 'Construção',
  material: 'Material',
  consorcio: 'Consórcio',
}

const MARITAL_OPTIONS = [
  { value: '', label: 'Não informado' },
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União Estável' },
]

const INTERACTION_TYPES: { value: InteractionType; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'ligacao', label: 'Ligação' },
  { value: 'visita', label: 'Visita' },
  { value: 'email', label: 'Email' },
  { value: 'nota', label: 'Nota' },
]

const INTERACTION_ICONS: Record<InteractionType, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  ligacao: Phone,
  visita: MapPin,
  email: Mail,
  nota: FileText,
}

const INTERACTION_COLORS: Record<InteractionType, string> = {
  whatsapp: 'text-emerald-400',
  ligacao: 'text-blue-400',
  visita: 'text-amber-400',
  email: 'text-purple-400',
  nota: 'text-white/40',
}

const PHASE_ORDER: ConstructionPhase[] = ['fundacao', 'alvenaria', 'cobertura', 'instalacoes', 'acabamento', 'pintura', 'entrega']

const PHASE_LABELS: Record<ConstructionPhase, string> = {
  fundacao: 'Fundação',
  alvenaria: 'Alvenaria',
  cobertura: 'Cobertura',
  instalacoes: 'Instalações',
  acabamento: 'Acabamento',
  pintura: 'Pintura',
  entrega: 'Entrega',
}

const FAIXA_COLORS: Record<string, string> = {
  '1': 'from-emerald-400 to-green-500',
  '2': 'from-gold-400 to-amber-500',
  '3': 'from-blue-400 to-indigo-500',
  '4': 'from-purple-400 to-violet-500',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: '#9ca3af' },
  simulado: { label: 'Simulado', color: '#F5C518' },
  aprovado: { label: 'Aprovado', color: '#34d399' },
  reprovado: { label: 'Reprovado', color: '#ef4444' },
}

export default function ClientePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { clients, updateClient } = useClients()
  const { simulations, isLoading: loadingSims } = useSimulations(id)
  const { constructions, isLoading: loadingObras } = useConstructions()
  const { interactions, isLoading: loadingInteractions, createInteraction } = useInteractions(id)

  const [activeTab, setActiveTab] = useState<TabKey>('dados')
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  // Interaction form
  const [intType, setIntType] = useState<InteractionType>('whatsapp')
  const [intContent, setIntContent] = useState('')

  const client = useMemo(() => clients.find(c => c.id === id), [clients, id])

  const clientConstructions = useMemo(
    () => constructions.filter(c => c.client_id === id),
    [constructions, id]
  )

  // Edit form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    birth_date: '',
    marital_status: '',
    notes: '',
    interests: [] as ClientInterest[],
  })

  const startEditing = () => {
    if (!client) return
    setForm({
      name: client.name,
      phone: client.phone || '',
      email: client.email || '',
      cpf: client.cpf || '',
      birth_date: client.birth_date || '',
      marital_status: client.marital_status || '',
      notes: client.notes || '',
      interests: [...(client.interests || [])],
    })
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const handleSave = async () => {
    if (!client) return
    await updateClient.mutateAsync({ id: client.id, ...form })
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setEditing(false)
    }, 1200)
  }

  const toggleInterest = (interest: ClientInterest) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(interest)
        ? f.interests.filter(i => i !== interest)
        : [...f.interests, interest],
    }))
  }

  const handleCreateInteraction = async () => {
    if (!intContent.trim() || !id) return
    await createInteraction.mutateAsync({
      client_id: id,
      type: intType,
      content: intContent.trim(),
      ai_generated: false,
    })
    setIntContent('')
  }

  // Loading
  if (!client) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const stageConfig = PIPELINE_STAGES[client.stage]

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'dados', label: 'Dados' },
    { key: 'simulacoes', label: 'Simulações', count: simulations.length },
    { key: 'obras', label: 'Obras', count: clientConstructions.length },
    { key: 'interacoes', label: 'Interações', count: interactions.length },
  ]

  return (
    <div className="space-y-6">
      {/* ==================== HEADER ==================== */}
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Left: Back + Info */}
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate('/app/pipeline')}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-3"
            >
              <ArrowLeft size={16} />
              Pipeline
            </button>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold truncate">{client.name}</h1>

              {/* Stage badge */}
              <span
                className="text-xs px-3 py-1 rounded-full font-medium"
                style={{
                  background: `${stageConfig.color}15`,
                  color: stageConfig.color,
                }}
              >
                {stageConfig.label}
              </span>

              {/* Source badge */}
              {client.source && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 uppercase tracking-wide">
                  {client.source}
                </span>
              )}

              {/* Score */}
              {client.score != null && client.score > 0 && (
                <span className="flex items-center gap-1 text-sm text-gold-400">
                  <Star size={14} className="fill-gold-400" />
                  {client.score}
                </span>
              )}
            </div>

            <p className="text-xs text-white/30 mt-2">
              Cadastro: {format(new Date(client.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {client.last_contact_at && (
                <> &middot; Último contato: {format(new Date(client.last_contact_at), "dd/MM/yyyy", { locale: ptBR })}</>
              )}
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {client.phone && (
              <a
                href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2"
              >
                <MessageSquare size={14} />
                WhatsApp
              </a>
            )}
            <button
              onClick={editing ? cancelEditing : startEditing}
              className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 border transition-colors ${
                editing
                  ? 'border-red-400/30 text-red-400 hover:bg-red-400/10'
                  : 'border-white/10 text-white/60 hover:border-gold-400/30 hover:text-gold-400'
              }`}
            >
              {editing ? <X size={14} /> : <Edit3 size={14} />}
              {editing ? 'Cancelar' : 'Editar'}
            </button>
          </div>
        </div>
      </div>

      {/* ==================== TABS ==================== */}
      <div className="border-b border-white/10">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-gold-400 text-gold-400'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-gold-400/70' : 'text-white/20'}`}>
                  ({tab.count})
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ==================== TAB CONTENT ==================== */}

      {/* === ABA DADOS === */}
      {activeTab === 'dados' && (
        <div className="space-y-6">
          {editing ? (
            /* ---- Modo Edição ---- */
            <div className="glass rounded-2xl p-6 space-y-5">
              <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide">Informações do Cliente</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Nome Completo</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Telefone</label>
                    <input
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Email</label>
                    <input
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">CPF</label>
                    <input
                      value={form.cpf}
                      onChange={e => setForm({ ...form, cpf: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Data de Nascimento</label>
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={e => setForm({ ...form, birth_date: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Estado Civil</label>
                    <select
                      value={form.marital_status}
                      onChange={e => setForm({ ...form, marital_status: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
                    >
                      {MARITAL_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-2 block">Interesses</label>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map(interest => (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          form.interests.includes(interest)
                            ? 'bg-gold-400/20 border-gold-400/30 text-gold-400'
                            : 'border-white/10 text-white/40 hover:border-white/20'
                        }`}
                      >
                        {INTEREST_LABELS[interest]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Notas</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={cancelEditing}
                  className="px-5 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 border border-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateClient.isPending}
                  className={`flex-1 px-5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
                    saved ? 'bg-emerald-400/20 text-emerald-400' : 'glow-button'
                  }`}
                >
                  <Save size={14} />
                  {saved ? 'Salvo!' : updateClient.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          ) : (
            /* ---- Modo Visualização ---- */
            <div className="space-y-4">
              {/* Info grid */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide mb-4">Informações Pessoais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  <InfoField label="Telefone" value={client.phone} />
                  <InfoField label="Email" value={client.email} />
                  <InfoField label="CPF" value={client.cpf} />
                  <InfoField
                    label="Data de Nascimento"
                    value={client.birth_date ? format(new Date(client.birth_date + 'T12:00:00'), 'dd/MM/yyyy') : null}
                  />
                  <InfoField
                    label="Estado Civil"
                    value={MARITAL_OPTIONS.find(o => o.value === client.marital_status)?.label || client.marital_status}
                  />
                  <InfoField label="Responsável" value={client.assigned_to} />
                </div>
              </div>

              {/* Interesses */}
              {client.interests?.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide mb-3">Interesses</h3>
                  <div className="flex flex-wrap gap-2">
                    {client.interests.map(i => (
                      <span key={i} className="text-xs px-3 py-1.5 bg-gold-400/10 text-gold-400 rounded-lg font-medium">
                        {INTEREST_LABELS[i] || i}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {client.tags?.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {client.tags.map(tag => (
                      <span key={tag} className="text-xs px-3 py-1.5 bg-white/5 text-white/60 rounded-lg border border-white/10">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas */}
              {client.notes && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide mb-3">Notas</h3>
                  <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{client.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* === ABA SIMULAÇÕES === */}
      {activeTab === 'simulacoes' && (
        <div className="space-y-4">
          {loadingSims ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : simulations.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-white/30 text-sm mb-4">Nenhuma simulação encontrada para este cliente.</p>
              <button
                onClick={() => navigate('/app/simulacoes')}
                className="glow-button px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-2"
              >
                <Plus size={14} />
                Fazer Simulação
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {simulations.map(sim => {
                const statusCfg = STATUS_CONFIG[sim.status] || STATUS_CONFIG.pendente
                const faixaGrad = FAIXA_COLORS[sim.faixa] || FAIXA_COLORS['4']

                return (
                  <div key={sim.id} className="glass rounded-2xl p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className={`text-lg font-bold bg-gradient-to-r ${faixaGrad} bg-clip-text text-transparent`}>
                        Faixa {sim.faixa}
                      </span>
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: `${statusCfg.color}15`,
                          color: statusCfg.color,
                        }}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Grid de dados */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase">Renda Bruta</p>
                        <p className="text-sm font-medium">R$ {sim.gross_income.toLocaleString('pt-BR')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase">Valor do Imóvel</p>
                        <p className="text-sm font-medium">
                          {sim.property_value ? `R$ ${sim.property_value.toLocaleString('pt-BR')}` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase">Subsídio</p>
                        <p className="text-sm font-medium text-emerald-400">
                          R$ {sim.subsidy.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase">Taxa de Juros</p>
                        <p className="text-sm font-medium">{sim.interest_rate}% a.a.</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase">Parcela Estimada</p>
                        <p className="text-sm font-medium text-gold-400">
                          R$ {sim.max_installment.toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase">Financiamento</p>
                        <p className="text-sm font-medium">R$ {sim.financing_amount.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>

                    {/* AI Summary */}
                    {sim.ai_summary && (
                      <div className="bg-white/5 rounded-xl p-3">
                        <p className="text-[10px] text-gold-400 uppercase mb-1">Resumo IA</p>
                        <p className="text-xs text-white/60 leading-relaxed">{sim.ai_summary}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <p className="text-[10px] text-white/30">
                      {format(new Date(sim.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {sim.city && <> &middot; {sim.city}{sim.neighborhood && `, ${sim.neighborhood}`}</>}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* === ABA OBRAS === */}
      {activeTab === 'obras' && (
        <div className="space-y-4">
          {loadingObras ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : clientConstructions.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-white/30 text-sm">Nenhuma obra vinculada a este cliente.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {clientConstructions.map(obra => {
                const phaseIndex = PHASE_ORDER.indexOf(obra.phase)

                return (
                  <div key={obra.id} className="glass rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-base font-bold">{obra.title}</h4>
                        {obra.address && (
                          <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
                            <MapPin size={10} /> {obra.address}
                          </p>
                        )}
                      </div>
                      <a
                        href={`/obra/${obra.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-white/60 hover:border-gold-400/30 hover:text-gold-400 transition-colors flex items-center gap-1.5"
                      >
                        <ExternalLink size={12} />
                        Ver Portal
                      </a>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-white/40">Progresso</span>
                        <span className="text-xs text-gold-400 font-bold">{obra.progress}%</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500 transition-all duration-500"
                          style={{ width: `${obra.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Phase timeline */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {PHASE_ORDER.map((phase, i) => {
                        const isActive = i === phaseIndex
                        const isDone = i < phaseIndex
                        return (
                          <div key={phase} className="flex items-center gap-1 shrink-0">
                            <div
                              className={`w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                                isDone
                                  ? 'bg-gold-400 border-gold-400'
                                  : isActive
                                  ? 'bg-gold-400/30 border-gold-400'
                                  : 'bg-transparent border-white/20'
                              }`}
                            />
                            <span
                              className={`text-[10px] ${
                                isActive ? 'text-gold-400 font-medium' : isDone ? 'text-white/50' : 'text-white/20'
                              }`}
                            >
                              {PHASE_LABELS[phase]}
                            </span>
                            {i < PHASE_ORDER.length - 1 && (
                              <div className={`w-4 h-0.5 ${isDone ? 'bg-gold-400/40' : 'bg-white/10'}`} />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Dates */}
                    <div className="flex gap-4 text-[10px] text-white/30">
                      <span>Início: {format(new Date(obra.start_date), 'dd/MM/yyyy')}</span>
                      {obra.estimated_end && (
                        <span>Previsão: {format(new Date(obra.estimated_end), 'dd/MM/yyyy')}</span>
                      )}
                      {obra.actual_end && (
                        <span className="text-emerald-400">
                          Entregue: {format(new Date(obra.actual_end), 'dd/MM/yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* === ABA INTERAÇÕES === */}
      {activeTab === 'interacoes' && (
        <div className="space-y-6">
          {/* Form nova interação */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-medium text-white/60 uppercase tracking-wide">Nova Interação</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={intType}
                onChange={e => setIntType(e.target.value as InteractionType)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none sm:w-40"
              >
                {INTERACTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <textarea
                value={intContent}
                onChange={e => setIntContent(e.target.value)}
                placeholder="Descreva a interação..."
                rows={2}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none resize-none"
              />
              <button
                onClick={handleCreateInteraction}
                disabled={!intContent.trim() || createInteraction.isPending}
                className="glow-button px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shrink-0 disabled:opacity-40"
              >
                <Send size={14} />
                Registrar
              </button>
            </div>
          </div>

          {/* Timeline */}
          {loadingInteractions ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : interactions.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-white/30 text-sm">Nenhuma interação registrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interactions.map(interaction => {
                const Icon = INTERACTION_ICONS[interaction.type] || FileText
                const iconColor = INTERACTION_COLORS[interaction.type] || 'text-white/40'
                const typeLabel = INTERACTION_TYPES.find(t => t.value === interaction.type)?.label || interaction.type

                return (
                  <div key={interaction.id} className="glass rounded-xl p-4 flex gap-4">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 ${iconColor}`}>
                      <Icon size={16} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-white/60">{typeLabel}</span>
                        {interaction.ai_generated && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-400/15 text-purple-400 font-medium">
                            IA
                          </span>
                        )}
                        <span className="text-[10px] text-white/30 ml-auto">
                          {format(new Date(interaction.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
                        {interaction.content}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// === Helper Component ===
function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[10px] text-white/40 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-white/80">{value || '—'}</p>
    </div>
  )
}
