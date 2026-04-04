import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConstructions } from '../../hooks/useConstructions'
import { useClients } from '../../hooks/useClients'
import type { Construction, ConstructionPhase } from '../../types'
import { HardHat, Plus, Calendar, User, MapPin, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PHASES: { key: ConstructionPhase; label: string; color: string }[] = [
  { key: 'fundacao', label: 'Fundacao', color: '#9ca3af' },
  { key: 'alvenaria', label: 'Alvenaria', color: '#F5C518' },
  { key: 'cobertura', label: 'Cobertura', color: '#a78bfa' },
  { key: 'instalacoes', label: 'Instalacoes', color: '#60a5fa' },
  { key: 'acabamento', label: 'Acabamento', color: '#f472b6' },
  { key: 'pintura', label: 'Pintura', color: '#34d399' },
  { key: 'entrega', label: 'Entrega', color: '#10b981' },
]

export default function Obras() {
  const navigate = useNavigate()
  const { constructions, isLoading, createConstruction } = useConstructions()
  const { clients } = useClients()
  const [showNew, setShowNew] = useState(false)

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name ?? 'Cliente'
  const getPhaseInfo = (phase: ConstructionPhase) => PHASES.find(p => p.key === phase) ?? PHASES[0]

  if (isLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Obras</h1>
          <p className="text-white/40 text-sm">{constructions.length} obras registradas</p>
        </div>
        <button onClick={() => setShowNew(true)} className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2">
          <Plus size={16} /> Nova Obra
        </button>
      </div>

      {/* Construction Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {constructions.map(c => {
          const phaseInfo = getPhaseInfo(c.phase)
          return (
            <div key={c.id} className="glass rounded-xl p-5 gradient-border cursor-pointer hover:bg-white/[0.03] transition-colors"
              onClick={() => navigate(`/app/obras/${c.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium">{c.title}</h3>
                  <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
                    <User size={10} />
                    <span
                      className="cursor-pointer hover:text-gold-400 transition-colors"
                      onClick={e => { e.stopPropagation(); navigate(`/app/cliente/${c.client_id}`) }}
                    >
                      {getClientName(c.client_id)}
                    </span>
                  </p>
                </div>
                <HardHat size={18} style={{ color: phaseInfo.color }} />
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: phaseInfo.color }}>{phaseInfo.label}</span>
                  <span className="text-white/40">{c.progress}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${c.progress}%`, background: phaseInfo.color }}
                  />
                </div>
              </div>

              {/* Phase dots */}
              <div className="flex items-center gap-1 mb-3">
                {PHASES.map((p, i) => {
                  const currentIdx = PHASES.findIndex(ph => ph.key === c.phase)
                  return (
                    <div key={p.key} className="flex items-center">
                      <div
                        className={`w-2.5 h-2.5 rounded-full transition-colors ${i <= currentIdx ? '' : 'opacity-20'}`}
                        style={{ background: p.color }}
                        title={p.label}
                      />
                      {i < PHASES.length - 1 && (
                        <div className={`w-3 h-0.5 ${i < currentIdx ? 'bg-white/20' : 'bg-white/5'}`} />
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-white/30 pt-2 border-t border-white/5">
                <span className="flex items-center gap-1"><MapPin size={10} /> {c.address}</span>
                <span className="flex items-center gap-1">
                  <Calendar size={10} /> {format(new Date(c.start_date), 'MM/yy', { locale: ptBR })}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {constructions.length === 0 && (
        <p className="text-center text-white/20 text-sm py-12">Nenhuma obra registrada ainda</p>
      )}

      {/* New Construction Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Nova Obra</h2>
              <button onClick={() => setShowNew(false)} className="text-white/40"><X size={20} /></button>
            </div>
            <NewConstructionForm
              clients={clients}
              onSave={data => { createConstruction.mutate(data); setShowNew(false) }}
            />
          </div>
        </div>
      )}

    </div>
  )
}

function NewConstructionForm({ clients, onSave }: { clients: { id: string; name: string }[]; onSave: (d: Partial<Construction>) => void }) {
  const [form, setForm] = useState({ title: '', client_id: '', address: '', start_date: '' })

  return (
    <div className="space-y-3">
      <input placeholder="Titulo da obra *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
      <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none">
        <option value="">Selecione o cliente</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input placeholder="Endereco" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
      <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
      <button onClick={() => form.title && form.client_id && onSave({
        ...form, phase: 'fundacao', progress: 0,
      })} className="glow-button w-full py-3 rounded-xl text-sm">
        Criar Obra
      </button>
    </div>
  )
}
