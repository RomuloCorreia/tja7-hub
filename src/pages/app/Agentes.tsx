import { useState } from 'react'
import { Bot, Zap, Calculator, Building2, MapPin, Package, Phone, Settings, CheckCircle } from 'lucide-react'

interface AgentConfig {
  id: string
  name: string
  description: string
  icon: typeof Bot
  color: string
  active: boolean
  status: string
  whatsappNumber: string
  features: string[]
}

const AGENTS: AgentConfig[] = [
  {
    id: 'simulador',
    name: 'Agente Simulador MCMV',
    description: 'Simula financiamento MCMV automaticamente via WhatsApp. Coleta renda, calcula faixa, subsidio e parcela. Salva lead no CRM.',
    icon: Calculator,
    color: '#F5C518',
    active: true,
    status: 'Pronto para ativar',
    whatsappNumber: '5588999033208',
    features: ['Simulacao instantanea 24/7', 'Calculo MCMV 2026', 'Qualificacao automatica', 'Salva lead no CRM', 'Notifica vendedores'],
  },
  {
    id: 'corretor',
    name: 'Agente Corretor Digital',
    description: 'Apresenta imoveis disponiveis, filtra por preferencias, agenda visitas e qualifica leads automaticamente.',
    icon: Building2,
    color: '#a78bfa',
    active: false,
    status: 'Em desenvolvimento',
    whatsappNumber: '5588999033208',
    features: ['Catalogo de imoveis', 'Filtro por preco/bairro', 'Agendamento de visitas', 'Follow-up automatico', 'Qualificacao de lead'],
  },
  {
    id: 'loteamento',
    name: 'Agente Loteamento',
    description: 'Apresenta lotes disponiveis, simula condicoes de pagamento e reserva lotes temporariamente.',
    icon: MapPin,
    color: '#34d399',
    active: false,
    status: 'Em desenvolvimento',
    whatsappNumber: '5588999033208',
    features: ['Mapa de lotes', 'Simulacao de pagamento', 'Reserva temporaria', 'Envio de proposta', 'Integracao CRM'],
  },
  {
    id: 'materiais',
    name: 'Agente Loja de Materiais',
    description: 'Consulta estoque, sugere materiais para obras e gera orcamentos automaticos.',
    icon: Package,
    color: '#60a5fa',
    active: false,
    status: 'Em desenvolvimento',
    whatsappNumber: '5588999033208',
    features: ['Consulta estoque', 'Orcamento automatico', 'Kit MCMV', 'Alerta reposicao', 'Historico compras'],
  },
]

export default function Agentes() {
  const [selected, setSelected] = useState<AgentConfig | null>(null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agentes IA</h1>
        <p className="text-white/40 text-sm">Agentes especializados conectados ao ecossistema TJA7</p>
      </div>

      {/* Agent Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {AGENTS.map(agent => (
          <div
            key={agent.id}
            onClick={() => setSelected(agent)}
            className="glass rounded-xl p-5 gradient-border cursor-pointer hover:bg-white/[0.03] transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${agent.color}15` }}>
                  <agent.icon size={20} style={{ color: agent.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-medium">{agent.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {agent.active ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-emerald-400">{agent.status}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-gold-400/50 animate-pulse" />
                        <span className="text-[10px] text-gold-400/70">{agent.status}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Bot size={16} className="text-white/10 group-hover:text-white/20 transition-colors" />
            </div>

            <p className="text-xs text-white/50 mb-3">{agent.description}</p>

            <div className="flex items-center gap-4 text-xs text-white/30 pt-3 border-t border-white/5">
              <span className="flex items-center gap-1">
                <Zap size={10} />
                {agent.active ? 'WhatsApp conectado' : 'Ativacao na proxima fase'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Architecture Diagram */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-medium mb-4 gradient-text">Arquitetura dos Agentes</h3>
        <div className="text-xs text-white/40 font-mono space-y-1">
          <p>WhatsApp (UazAPI) → Webhook → Agente IA (Claude Sonnet)</p>
          <p>{'                              ↓'}</p>
          <p>{'                     Supabase (base unica)'}</p>
          <p>{'                              ↓'}</p>
          <p>{'                  TJA7 Hub (Dashboard + CRM)'}</p>
          <p>{'                              ↓'}</p>
          <p>{'                 Notificacao → Vendedores (WhatsApp)'}</p>
        </div>
      </div>

      {/* Selected Agent Detail */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="glass rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${selected.color}15` }}>
                  <selected.icon size={24} style={{ color: selected.color }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{selected.name}</h2>
                  <p className="text-xs text-white/40">{selected.status}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white/80">
                <Settings size={20} />
              </button>
            </div>

            <p className="text-sm text-white/60">{selected.description}</p>

            <div>
              <p className="text-xs text-white/40 mb-2">Funcionalidades</p>
              <div className="space-y-1.5">
                {selected.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle size={14} style={{ color: selected.color }} />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-white/40 mb-2">WhatsApp Conectado</p>
              <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3">
                <Phone size={14} className="text-emerald-400" />
                <span className="text-sm">{selected.whatsappNumber}</span>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-xs text-white/40 mb-1">Status</p>
              <div className="flex items-center gap-2">
                {selected.active ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm text-emerald-400 font-medium">{selected.status}</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-gold-400/60 animate-pulse" />
                    <span className="text-sm text-gold-400/80 font-medium">{selected.status}</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-white/30 mt-1">
                {selected.active ? 'Logica pronta, aguardando ativacao do webhook' : 'Sera desenvolvido nas proximas fases da consultoria'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
