import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { useClients } from '../../hooks/useClients'
import { PIPELINE_STAGES, type ClientStage, type Client } from '../../types'
import {
  Search, Plus, Phone,
  Trash2, GripVertical, LayoutGrid, List, X
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type View = 'kanban' | 'list'

const PIPELINE_COLUMNS: ClientStage[] = ['novo', 'simulado', 'documentacao', 'aprovado', 'construindo', 'entregue', 'perdido']

export default function Pipeline() {
  const { clients, isLoading, updateStage, deleteClient, createClient } = useClients()
  const [view, setView] = useState<View>('kanban')
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const navigate = useNavigate()

  const filtered = useMemo(() => {
    if (!search) return clients
    const q = search.toLowerCase()
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [clients, search])

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const stage = result.destination.droppableId as ClientStage
    updateStage.mutate({ id: result.draggableId, stage })
  }

  const handleCreateClient = (data: Partial<Client>) => {
    createClient.mutate(data)
    setShowNewModal(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pipeline CRM</h1>
          <p className="text-white/40 text-sm">{clients.length} clientes no funil</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-gold-400/40 focus:outline-none w-48"
            />
          </div>
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setView('kanban')}
              className={`p-2 rounded-md transition-colors ${view === 'kanban' ? 'bg-gold-400/20 text-gold-400' : 'text-white/40'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-gold-400/20 text-gold-400' : 'text-white/40'}`}
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2"
          >
            <Plus size={16} />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {PIPELINE_COLUMNS.map(stage => {
              const config = PIPELINE_STAGES[stage]
              const stageClients = filtered.filter(c => c.stage === stage)

              return (
                <Droppable key={stage} droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-shrink-0 w-72 rounded-xl transition-colors ${
                        snapshot.isDraggingOver ? 'bg-gold-400/5' : 'bg-white/[0.02]'
                      }`}
                    >
                      {/* Column header */}
                      <div className="flex items-center gap-2 px-3 py-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
                        <span className="text-sm font-medium">{config.label}</span>
                        <span className="text-xs text-white/30 ml-auto">{stageClients.length}</span>
                      </div>

                      {/* Cards */}
                      <div className="px-2 pb-2 space-y-2 min-h-[100px]">
                        {stageClients.map((client, index) => (
                          <Draggable key={client.id} draggableId={client.id} index={index}>
                            {(dragProvided) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className="glass rounded-xl p-3 cursor-pointer hover:border-gold-400/20 transition-colors group"
                                onClick={() => navigate(`/app/cliente/${client.id}`)}
                              >
                                <div className="flex items-start gap-2">
                                  <div {...dragProvided.dragHandleProps} className="mt-1 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <GripVertical size={14} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{client.name}</p>
                                    {client.phone && (
                                      <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
                                        <Phone size={10} /> {client.phone}
                                      </p>
                                    )}
                                    {client.interests?.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {client.interests.map(i => (
                                          <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gold-400/10 text-gold-400 rounded">
                                            {i}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {client.source && (
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                    <span className="text-[10px] text-white/30">{client.source}</span>
                                    <span className="text-[10px] text-white/30">
                                      {format(new Date(client.created_at), 'dd/MM', { locale: ptBR })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              )
            })}
          </div>
        </DragDropContext>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Nome</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Telefone</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Origem</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Etapa</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Interesses</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3">Data</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(client => (
                <tr
                  key={client.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer transition-colors"
                  onClick={() => navigate(`/app/cliente/${client.id}`)}
                >
                  <td className="px-4 py-3 text-sm font-medium">{client.name}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{client.phone}</td>
                  <td className="px-4 py-3 text-xs text-white/40">{client.source}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: `${PIPELINE_STAGES[client.stage]?.color}15`,
                        color: PIPELINE_STAGES[client.stage]?.color,
                      }}
                    >
                      {PIPELINE_STAGES[client.stage]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {client.interests?.map(i => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gold-400/10 text-gold-400 rounded">{i}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/30">
                    {format(new Date(client.created_at), 'dd/MM/yy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        if (confirm(`Remover ${client.name} do pipeline?`)) {
                          deleteClient.mutate(client.id)
                        }
                      }}
                      className="text-white/20 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-white/20 text-sm py-12">Nenhum cliente encontrado</p>
          )}
        </div>
      )}

      {/* New Lead Modal */}
      {showNewModal && <NewLeadModal onClose={() => setShowNewModal(false)} onSave={handleCreateClient} />}

    </div>
  )
}

// === New Lead Modal ===
function NewLeadModal({ onClose, onSave }: { onClose: () => void; onSave: (data: Partial<Client>) => void }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', source: 'manual' as Client['source'],
    interests: [] as Client['interests'], notes: '',
  })

  const interests: Client['interests'][number][] = ['financiamento', 'lote', 'imovel_pronto', 'construcao', 'material', 'consorcio']

  const toggleInterest = (i: Client['interests'][number]) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(i) ? f.interests.filter(x => x !== i) : [...f.interests, i],
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Novo Lead</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>

        <div className="space-y-3">
          <input
            placeholder="Nome completo *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
          />
          <input
            placeholder="Telefone *"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
          />
          <select
            value={form.source}
            onChange={e => setForm({ ...form, source: e.target.value as Client['source'] })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
          >
            <option value="manual">Manual</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="indicacao">Indicacao</option>
            <option value="site">Site</option>
            <option value="evento">Evento</option>
          </select>

          <div>
            <p className="text-xs text-white/40 mb-2">Interesses</p>
            <div className="flex flex-wrap gap-2">
              {interests.map(i => (
                <button
                  key={i}
                  onClick={() => toggleInterest(i)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    form.interests.includes(i)
                      ? 'bg-gold-400/20 border-gold-400/30 text-gold-400'
                      : 'border-white/10 text-white/40 hover:border-white/20'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <textarea
            placeholder="Notas..."
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none resize-none h-20"
          />
        </div>

        <button
          onClick={() => form.name && form.phone && onSave({ ...form, stage: 'novo', tags: [] })}
          className="glow-button w-full py-3 rounded-xl text-sm"
        >
          Salvar Lead
        </button>
      </div>
    </div>
  )
}

