import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSimulations } from '../../hooks/useSimulations'
import { useClients } from '../../hooks/useClients'
import { calculateMCMV, MCMV_TABLE, type MCMVFaixa } from '../../types'
import { Calculator, CheckCircle, XCircle, TrendingUp, Save, UserPlus } from 'lucide-react'

function formatCurrency(value: string): string {
  const num = value.replace(/\D/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('pt-BR')
}

function parseCurrency(formatted: string): string {
  return formatted.replace(/\./g, '')
}

export default function Simulacoes() {
  const navigate = useNavigate()
  const { simulations, createSimulation } = useSimulations()
  const { clients, createClient } = useClients()
  const [showCalc, setShowCalc] = useState(false)
  const [income, setIncome] = useState('')
  const [propValue, setPropValue] = useState('')
  const [fgts, setFgts] = useState('')
  const [clientId, setClientId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [result, setResult] = useState<ReturnType<typeof calculateMCMV> | null>(null)
  const [saved, setSaved] = useState(false)

  const handleCalc = () => {
    if (!income || !propValue) return
    const r = calculateMCMV(Number(parseCurrency(income)), Number(parseCurrency(propValue)), Number(fgts) || 0)
    setResult(r)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!result) return

    let finalClientId = clientId

    // Criar novo cliente se necessário
    if (showNewClient && newClientName && newClientPhone) {
      try {
        const newClient = await createClient.mutateAsync({
          name: newClientName,
          phone: newClientPhone,
          source: 'manual',
          stage: 'simulado',
          interests: ['financiamento'],
          tags: ['mcmv'],
        })
        finalClientId = newClient.id
      } catch {
        return
      }
    }

    if (!finalClientId) return

    try {
      await createSimulation.mutateAsync({
        client_id: finalClientId,
        gross_income: Number(parseCurrency(income)),
        property_value: Number(parseCurrency(propValue)),
        years_fgts: Number(fgts) || null,
        property_type: 'novo',
        city: 'Ico',
        faixa: result.faixa,
        subsidy: result.subsidy,
        interest_rate: result.interestRate,
        max_installment: result.maxInstallment,
        max_term_months: result.maxTermMonths,
        financing_amount: result.financingAmount,
        status: result.eligible ? 'simulado' : 'reprovado',
      })
      setSaved(true)
      setShowNewClient(false)
      setNewClientName('')
      setNewClientPhone('')
    } catch {
      // erro tratado pelo React Query
    }
  }

  const getClientName = (clientId: string) =>
    clients.find(c => c.id === clientId)?.name ?? 'Desconhecido'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Simulacoes MCMV</h1>
          <p className="text-white/40 text-sm">{simulations.length} simulacoes realizadas</p>
        </div>
        <button onClick={() => setShowCalc(!showCalc)} className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2">
          <Calculator size={16} />
          Simular Agora
        </button>
      </div>

      {/* Quick Calculator */}
      {showCalc && (
        <div className="glass rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-medium gradient-text">Calculadora Rapida MCMV 2026</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Renda Bruta Familiar</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={income}
                  onChange={e => setIncome(formatCurrency(e.target.value))}
                  placeholder="4.000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Valor do Imovel</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={propValue}
                  onChange={e => setPropValue(formatCurrency(e.target.value))}
                  placeholder="200.000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Anos de FGTS</label>
              <input
                type="number"
                value={fgts}
                onChange={e => setFgts(e.target.value)}
                placeholder="3"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none"
              />
            </div>
          </div>
          <button onClick={handleCalc} className="glow-button px-6 py-2.5 rounded-xl text-sm">
            Calcular
          </button>

          {result && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/5">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-white/40">Faixa MCMV</p>
                  <p className="text-2xl font-bold gradient-text">Faixa {result.faixa}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-white/40">Subsidio</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    R$ {result.subsidy.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-white/40">Taxa de Juros</p>
                  <p className="text-2xl font-bold text-blue-400">{result.interestRate}% a.a.</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-white/40">Parcela Estimada</p>
                  <p className="text-2xl font-bold text-gold-400">
                    R$ {result.installment.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-white/40">Financiamento</p>
                  <p className="text-lg font-bold">R$ {result.financingAmount.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-white/40">Parcela Maxima (30%)</p>
                  <p className="text-lg font-bold">R$ {result.maxInstallment.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-xs text-white/40">Prazo</p>
                  <p className="text-lg font-bold">{result.maxTermMonths / 12} anos</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 flex items-center gap-2">
                  {result.eligible ? (
                    <><CheckCircle size={20} className="text-emerald-400" /><span className="text-emerald-400 font-medium">Elegivel</span></>
                  ) : (
                    <><XCircle size={20} className="text-red-400" /><span className="text-red-400 font-medium">Valor acima do limite</span></>
                  )}
                </div>
              </div>

              {/* Salvar simulação */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <p className="text-xs text-white/40">Vincular a um cliente para salvar</p>
                <div className="flex gap-3 flex-wrap">
                  <select
                    value={clientId}
                    onChange={e => {
                      setClientId(e.target.value)
                      setShowNewClient(false)
                    }}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none flex-1 min-w-[200px]"
                  >
                    <option value="">Selecionar cliente...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => { setShowNewClient(!showNewClient); setClientId('') }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <UserPlus size={14} />
                    Novo Cliente
                  </button>
                </div>

                {showNewClient && (
                  <div className="grid md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newClientName}
                      onChange={e => setNewClientName(e.target.value)}
                      placeholder="Nome completo"
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newClientPhone}
                      onChange={e => setNewClientPhone(e.target.value)}
                      placeholder="Telefone (88999...)"
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
                    />
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saved || createSimulation.isPending || (!clientId && !(showNewClient && newClientName && newClientPhone))}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    saved
                      ? 'bg-emerald-400/20 text-emerald-400 cursor-default'
                      : 'glow-button disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                >
                  {saved ? <><CheckCircle size={16} /> Salvo no CRM</> :
                   createSimulation.isPending ? 'Salvando...' :
                   <><Save size={16} /> Salvar Simulacao</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* MCMV Table */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-gold-400" />
          Tabela MCMV 2026
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs text-white/40 font-medium px-4 py-2">Faixa</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-2">Renda Max.</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-2">Subsidio Max.</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-2">Taxa Juros</th>
                <th className="text-left text-xs text-white/40 font-medium px-4 py-2">Valor Max. Imovel</th>
              </tr>
            </thead>
            <tbody>
              {(Object.entries(MCMV_TABLE) as [MCMVFaixa, typeof MCMV_TABLE[MCMVFaixa]][]).map(([faixa, config]) => (
                <tr key={faixa} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium gradient-text">Faixa {faixa}</td>
                  <td className="px-4 py-3 text-sm">R$ {config.maxIncome.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-sm text-emerald-400">R$ {config.maxSubsidy.toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-3 text-sm text-blue-400">{config.interestRate}% a.a.</td>
                  <td className="px-4 py-3 text-sm">R$ {config.maxValue.toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulations History */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-medium mb-4">Historico de Simulacoes</h3>
        {simulations.length > 0 ? (
          <div className="space-y-2">
            {simulations.map(sim => (
              <div key={sim.id} className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-white/5 transition-colors">
                <Calculator size={16} className="text-gold-400" />
                <div className="flex-1">
                  <p
                    className="text-sm font-medium cursor-pointer hover:text-gold-400 transition-colors"
                    onClick={() => navigate(`/app/cliente/${sim.client_id}`)}
                  >
                    {getClientName(sim.client_id)}
                  </p>
                  <p className="text-xs text-white/40">
                    Renda: R$ {sim.gross_income?.toLocaleString('pt-BR')} | Faixa {sim.faixa}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  sim.status === 'aprovado' ? 'bg-emerald-400/10 text-emerald-400'
                    : sim.status === 'reprovado' ? 'bg-red-400/10 text-red-400'
                    : 'bg-gold-400/10 text-gold-400'
                }`}>
                  {sim.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-white/20 text-sm py-8">Nenhuma simulacao ainda</p>
        )}
      </div>
    </div>
  )
}
