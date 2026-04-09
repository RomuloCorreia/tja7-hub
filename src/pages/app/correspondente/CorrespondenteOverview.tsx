import { useConversations } from '../../../hooks/useWhatsApp'
import { useClients } from '../../../hooks/useClients'
import { useSimulations } from '../../../hooks/useSimulations'
import {
  MessageCircle, Users, Calculator, Bot, Phone,
} from 'lucide-react'

export default function CorrespondenteOverview() {
  const { data: conversations } = useConversations()
  const { clients } = useClients()
  const { simulations } = useSimulations()

  const totalConvs = conversations?.length || 0
  const activeConvs = conversations?.filter(c => !c.ai_paused && c.status === 'active').length || 0
  const totalSimulations = simulations?.length || 0
  const totalLeads = clients?.filter(c => c.source === 'whatsapp').length || 0

  const stats = [
    { icon: MessageCircle, label: 'Conversas', value: totalConvs, sub: `${activeConvs} ativas`, color: 'text-gold-400' },
    { icon: Users, label: 'Leads WhatsApp', value: totalLeads, sub: 'via Carol', color: 'text-blue-400' },
    { icon: Calculator, label: 'Simulacoes', value: totalSimulations, sub: 'realizadas', color: 'text-emerald-400' },
    { icon: Bot, label: 'Carol IA', value: activeConvs, sub: 'atendendo', color: 'text-purple-400' },
  ]

  // Leads por etapa
  const stages = ['novo', 'simulado', 'documentacao', 'aprovado', 'construindo', 'entregue', 'perdido']
  const stageColors: Record<string, string> = {
    novo: 'bg-blue-400', simulado: 'bg-gold-400', documentacao: 'bg-purple-400',
    aprovado: 'bg-emerald-400', construindo: 'bg-orange-400', entregue: 'bg-green-400', perdido: 'bg-red-400',
  }
  const leadsByStage = stages.map(s => ({
    stage: s,
    count: clients?.filter(c => c.stage === s && c.source === 'whatsapp').length || 0,
  }))

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="p-4 bg-white/3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} className={s.color} />
              <span className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-white/30 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="p-4 bg-white/3 rounded-xl border border-white/5">
        <h3 className="text-sm font-medium text-white mb-3">Pipeline Correspondente</h3>
        <div className="flex gap-2">
          {leadsByStage.map(item => (
            <div key={item.stage} className="flex-1 text-center">
              <div className={`h-2 rounded-full ${stageColors[item.stage]} mb-1.5`} style={{
                opacity: item.count > 0 ? 1 : 0.15,
              }} />
              <p className="text-lg font-bold text-white">{item.count}</p>
              <p className="text-[9px] text-white/30 capitalize">{item.stage}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ultimas conversas */}
      <div className="p-4 bg-white/3 rounded-xl border border-white/5">
        <h3 className="text-sm font-medium text-white mb-3">Ultimas Conversas</h3>
        <div className="space-y-2">
          {(conversations || []).slice(0, 8).map(conv => (
            <div key={conv.id} className="flex items-center justify-between px-3 py-2 bg-white/3 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                  <Phone size={12} className="text-white/30" />
                </div>
                <div>
                  <p className="text-xs text-white/70">{conv.client?.name || conv.contact_name || conv.phone}</p>
                  <p className="text-[10px] text-white/30 truncate max-w-[200px]">{conv.last_message || '-'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/30">
                  {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </p>
                {conv.ai_paused ? (
                  <span className="text-[9px] text-red-400/60">IA off</span>
                ) : (
                  <span className="text-[9px] text-gold-400/60">Carol</span>
                )}
              </div>
            </div>
          ))}
          {(conversations || []).length === 0 && (
            <p className="text-xs text-white/20 text-center py-6">Nenhuma conversa ainda. Mande uma mensagem pro numero da Carol!</p>
          )}
        </div>
      </div>
    </div>
  )
}
