import { useState, useMemo } from 'react'
import { useClients } from '../../../hooks/useClients'
import { useSimulations } from '../../../hooks/useSimulations'
import { Link } from 'react-router-dom'
import {
  User, Phone, Calculator, Search, ChevronRight, Clock,
} from 'lucide-react'

const stageLabels: Record<string, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'bg-blue-400/10 text-blue-400' },
  simulado: { label: 'Simulado', color: 'bg-gold-400/10 text-gold-400' },
  documentacao: { label: 'Documentacao', color: 'bg-purple-400/10 text-purple-400' },
  aprovado: { label: 'Aprovado', color: 'bg-emerald-400/10 text-emerald-400' },
  construindo: { label: 'Construindo', color: 'bg-orange-400/10 text-orange-400' },
  entregue: { label: 'Entregue', color: 'bg-green-400/10 text-green-400' },
  perdido: { label: 'Perdido', color: 'bg-red-400/10 text-red-400' },
}

export default function CorrespondenteLeads() {
  const { clients, isLoading } = useClients()
  const { simulations } = useSimulations()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')

  const whatsappLeads = useMemo(() => {
    let leads = (clients || []).filter(c => c.source === 'whatsapp')
    if (search) {
      const q = search.toLowerCase()
      leads = leads.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      )
    }
    if (stageFilter !== 'all') {
      leads = leads.filter(c => c.stage === stageFilter)
    }
    return leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [clients, search, stageFilter])

  const getSimCount = (clientId: string) =>
    simulations?.filter(s => s.client_id === clientId).length || 0

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lead..."
            className="w-full pl-9 pr-3 py-2.5 bg-white/5 rounded-xl text-xs text-white placeholder-white/30 border border-white/5 focus:border-gold-400/30 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setStageFilter('all')}
            className={`px-3 py-2 rounded-lg text-[10px] font-medium transition-all ${
              stageFilter === 'all' ? 'bg-gold-400/15 text-gold-400' : 'bg-white/5 text-white/30 hover:text-white/50'
            }`}
          >
            Todos ({(clients || []).filter(c => c.source === 'whatsapp').length})
          </button>
          {Object.entries(stageLabels).map(([key, val]) => {
            const count = (clients || []).filter(c => c.source === 'whatsapp' && c.stage === key).length
            if (count === 0) return null
            return (
              <button
                key={key}
                onClick={() => setStageFilter(key)}
                className={`px-3 py-2 rounded-lg text-[10px] font-medium transition-all ${
                  stageFilter === key ? val.color : 'bg-white/5 text-white/30 hover:text-white/50'
                }`}
              >
                {val.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-xs text-white/20">Carregando...</p>
          </div>
        ) : whatsappLeads.length === 0 ? (
          <div className="text-center py-12">
            <User size={32} className="mx-auto text-white/10 mb-2" />
            <p className="text-xs text-white/30">Nenhum lead encontrado</p>
          </div>
        ) : (
          whatsappLeads.map(lead => {
            const stage = stageLabels[lead.stage] || stageLabels.novo
            const simCount = getSimCount(lead.id)

            return (
              <Link
                key={lead.id}
                to={`/app/cliente/${lead.id}`}
                className="flex items-center justify-between p-3 bg-white/3 rounded-xl border border-white/5 hover:border-gold-400/20 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <User size={16} className="text-white/30" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-gold-400 transition-all">
                      {lead.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/30 flex items-center gap-0.5">
                        <Phone size={9} /> {lead.phone}
                      </span>
                      {simCount > 0 && (
                        <span className="text-[10px] text-gold-400/60 flex items-center gap-0.5">
                          <Calculator size={9} /> {simCount} sim.
                        </span>
                      )}
                      <span className="text-[10px] text-white/20 flex items-center gap-0.5">
                        <Clock size={9} /> {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${stage.color}`}>
                    {stage.label}
                  </span>
                  <ChevronRight size={14} className="text-white/15 group-hover:text-gold-400/50" />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
