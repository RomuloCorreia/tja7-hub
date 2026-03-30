import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Construction, ConstructionUpdate } from '../../types'
import { HardHat, Calendar, MapPin, CheckCircle, Clock, Camera } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PHASES = [
  { key: 'fundacao', label: 'Fundacao', icon: '1' },
  { key: 'alvenaria', label: 'Alvenaria', icon: '2' },
  { key: 'cobertura', label: 'Cobertura', icon: '3' },
  { key: 'instalacoes', label: 'Instalacoes', icon: '4' },
  { key: 'acabamento', label: 'Acabamento', icon: '5' },
  { key: 'pintura', label: 'Pintura', icon: '6' },
  { key: 'entrega', label: 'Entrega', icon: '7' },
]

export default function PortalCliente() {
  const { id } = useParams<{ id: string }>()
  const [construction, setConstruction] = useState<Construction | null>(null)
  const [updates, setUpdates] = useState<ConstructionUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [clientName, setClientName] = useState('')

  useEffect(() => {
    if (!id) return
    async function load() {
      const { data: c } = await supabase.from('tja7_constructions').select('*').eq('id', id).single()
      if (c) {
        setConstruction(c as Construction)
        const { data: client } = await supabase.from('tja7_clients').select('name').eq('id', c.client_id).single()
        if (client) setClientName(client.name)
        const { data: u } = await supabase.from('tja7_construction_updates').select('*').eq('construction_id', id).order('created_at', { ascending: false })
        if (u) setUpdates(u as ConstructionUpdate[])
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!construction) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <img src="/img/tja7-logo.png" alt="TJA7" className="h-16 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Obra nao encontrada</h1>
          <p className="text-white/40 text-sm">Verifique o link enviado pela TJA7</p>
        </div>
      </div>
    )
  }

  const currentPhaseIdx = PHASES.findIndex(p => p.key === construction.phase)

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="bg-[var(--color-surface)] border-b border-white/5 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src="/img/tja7-logo.png" alt="TJA7" className="h-10" />
          <div>
            <h1 className="font-bold text-sm gradient-text">Portal do Cliente</h1>
            <p className="text-[10px] text-white/40">TJA7 Empreendimentos</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Construction Info */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{construction.title}</h2>
              <p className="text-sm text-white/50 mt-1">Cliente: {clientName}</p>
            </div>
            <HardHat size={24} className="text-gold-400" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-white/60">
              <MapPin size={14} className="text-gold-400" /> {construction.address}
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Calendar size={14} className="text-gold-400" />
              Inicio: {format(new Date(construction.start_date), 'dd/MM/yyyy', { locale: ptBR })}
            </div>
            {construction.estimated_end && (
              <div className="flex items-center gap-2 text-white/60">
                <Clock size={14} className="text-gold-400" />
                Previsao: {format(new Date(construction.estimated_end), 'dd/MM/yyyy', { locale: ptBR })}
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Progresso da Obra</h3>
            <span className="text-2xl font-bold gradient-text">{construction.progress}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-white/5 rounded-full overflow-hidden mb-6">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500 transition-all duration-1000"
              style={{ width: `${construction.progress}%` }}
            />
          </div>

          {/* Phase timeline */}
          <div className="space-y-3">
            {PHASES.map((phase, idx) => {
              const isDone = idx < currentPhaseIdx
              const isCurrent = idx === currentPhaseIdx

              return (
                <div key={phase.key} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isCurrent ? 'bg-gold-400/10 border border-gold-400/20' : ''
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDone ? 'bg-emerald-400/20 text-emerald-400'
                      : isCurrent ? 'bg-gold-400/20 text-gold-400 glow-pulse'
                      : 'bg-white/5 text-white/20'
                  }`}>
                    {isDone ? <CheckCircle size={16} /> : phase.icon}
                  </div>
                  <span className={`text-sm ${
                    isDone ? 'text-emerald-400 line-through' : isCurrent ? 'font-medium text-gold-400' : 'text-white/30'
                  }`}>
                    {phase.label}
                  </span>
                  {isCurrent && (
                    <span className="ml-auto text-[10px] text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded-full">
                      Em andamento
                    </span>
                  )}
                  {isDone && (
                    <span className="ml-auto text-[10px] text-emerald-400">Concluido</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Updates */}
        <div className="glass rounded-xl p-5">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Camera size={16} className="text-gold-400" />
            Atualizacoes da Obra
          </h3>

          {updates.length > 0 ? (
            <div className="space-y-4">
              {updates.map(u => (
                <div key={u.id} className="border-l-2 border-gold-400/30 pl-4 pb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gold-400 font-medium">
                      {PHASES.find(p => p.key === u.phase)?.label}
                    </span>
                    <span className="text-xs text-white/30">
                      {format(new Date(u.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-white/70">{u.description}</p>
                  {u.images?.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {u.images.map((img, i) => (
                        <img key={i} src={img} alt="" className="w-20 h-20 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-white/20 text-sm py-6">Nenhuma atualizacao ainda</p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <img src="/img/tja7-logo.png" alt="TJA7" className="h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs text-white/20">TJA7 Empreendimentos &copy; {new Date().getFullYear()}</p>
          <p className="text-xs text-white/20">Ico, Ceara</p>
        </div>
      </main>
    </div>
  )
}
