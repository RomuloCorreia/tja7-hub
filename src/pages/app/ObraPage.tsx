import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useConstructions, useConstructionUpdates } from '../../hooks/useConstructions'
import { useClients } from '../../hooks/useClients'
import { useConstructionDiary } from '../../hooks/useConstructionDiary'
import { useConstructionCrew } from '../../hooks/useConstructionCrew'
import { useConstructionMaterials } from '../../hooks/useConstructionMaterials'
import { useConstructionCosts } from '../../hooks/useConstructionCosts'
import type {
  ConstructionPhase, ConstructionMaterialStatus, CostCategory,
  DiaryEntry, CrewMember, ConstructionMaterial, ConstructionCost,
} from '../../types'
import { COST_CATEGORIES, CREW_ROLES } from '../../types'
import {
  ArrowLeft, Eye, Calendar, MapPin, User, HardHat,
  Sun, Cloud, CloudRain, CloudLightning,
  Plus, UserPlus, Package, DollarSign, FileText, Layout, ExternalLink,
  Copy, Check, Minus,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'

// ============================================
// CONSTANTS
// ============================================

const PHASES: { key: ConstructionPhase; label: string; color: string }[] = [
  { key: 'fundacao', label: 'Fundacao', color: '#9ca3af' },
  { key: 'alvenaria', label: 'Alvenaria', color: '#F5C518' },
  { key: 'cobertura', label: 'Cobertura', color: '#a78bfa' },
  { key: 'instalacoes', label: 'Instalacoes', color: '#60a5fa' },
  { key: 'acabamento', label: 'Acabamento', color: '#f472b6' },
  { key: 'pintura', label: 'Pintura', color: '#34d399' },
  { key: 'entrega', label: 'Entrega', color: '#10b981' },
]

const WEATHER_OPTIONS = [
  { value: 'ensolarado', label: 'Ensolarado', icon: Sun, color: '#F5C518' },
  { value: 'nublado', label: 'Nublado', icon: Cloud, color: '#9ca3af' },
  { value: 'chuvoso', label: 'Chuvoso', icon: CloudRain, color: '#60a5fa' },
  { value: 'chuva_forte', label: 'Chuva Forte', icon: CloudLightning, color: '#ef4444' },
]

const MATERIAL_STATUS_FLOW: ConstructionMaterialStatus[] = ['solicitado', 'aprovado', 'entregue', 'usado']
const MATERIAL_STATUS_COLORS: Record<ConstructionMaterialStatus, string> = {
  solicitado: '#F5C518',
  aprovado: '#60a5fa',
  entregue: '#34d399',
  usado: '#9ca3af',
}

type TabKey = 'visao' | 'diario' | 'equipe' | 'materiais' | 'custos' | 'atualizacoes' | 'portal'

const TABS: { key: TabKey; label: string; icon: typeof HardHat }[] = [
  { key: 'visao', label: 'Visao Geral', icon: Layout },
  { key: 'diario', label: 'Diario', icon: Calendar },
  { key: 'equipe', label: 'Equipe', icon: UserPlus },
  { key: 'materiais', label: 'Materiais', icon: Package },
  { key: 'custos', label: 'Custos', icon: DollarSign },
  { key: 'atualizacoes', label: 'Atualizacoes', icon: FileText },
  { key: 'portal', label: 'Portal', icon: ExternalLink },
]

// ============================================
// HELPERS
// ============================================

function currency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getPhaseInfo(phase: ConstructionPhase) {
  return PHASES.find(p => p.key === phase) ?? PHASES[0]
}

function getWeatherInfo(weather: string | null) {
  return WEATHER_OPTIONS.find(w => w.value === weather) ?? WEATHER_OPTIONS[0]
}

// ============================================
// MAIN PAGE
// ============================================

export default function ObraPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('visao')

  const { constructions, updateConstruction } = useConstructions()
  const { clients } = useClients()
  const { updates, addUpdate } = useConstructionUpdates(id)
  const { entries, isLoading: loadingDiary, createEntry } = useConstructionDiary(id)
  const { crew, isLoading: loadingCrew, createMember, updateMember } = useConstructionCrew(id)
  const { materials, isLoading: loadingMaterials, createMaterial, updateStatus } = useConstructionMaterials(id)
  const { costs, isLoading: loadingCosts, createCost } = useConstructionCosts(id)

  const construction = constructions.find(c => c.id === id)
  const client = clients.find(c => c.id === construction?.client_id)

  if (!construction) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/40 text-sm">Carregando obra...</p>
        </div>
      </div>
    )
  }

  const phaseInfo = getPhaseInfo(construction.phase)
  const currentPhaseIdx = PHASES.findIndex(p => p.key === construction.phase)
  const diasDeObra = differenceInDays(new Date(), new Date(construction.start_date))
  const portalUrl = `${window.location.origin}/obra/${construction.id}`

  // Tab counts
  const tabCounts: Partial<Record<TabKey, number>> = {
    diario: entries.length,
    equipe: crew.length,
    materiais: materials.length,
    custos: costs.length,
    atualizacoes: updates.length,
  }

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div className="space-y-4">
        <button
          onClick={() => navigate('/app/obras')}
          className="flex items-center gap-2 text-sm text-white/40 hover:text-gold-400 transition-colors"
        >
          <ArrowLeft size={16} /> Obras
        </button>

        <div className="glass rounded-xl p-6 gradient-border">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{construction.title}</h1>
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ background: phaseInfo.color + '20', color: phaseInfo.color }}
                >
                  {phaseInfo.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
                <span className="flex items-center gap-1">
                  <MapPin size={14} /> {construction.address}
                </span>
                <span
                  className="flex items-center gap-1 cursor-pointer hover:text-gold-400 transition-colors"
                  onClick={() => navigate(`/app/cliente/${construction.client_id}`)}
                >
                  <User size={14} /> {client?.name ?? 'Cliente'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-white/30">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> Inicio: {format(new Date(construction.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
                {construction.estimated_end && (
                  <span>Previsao: {format(new Date(construction.estimated_end), 'dd/MM/yyyy', { locale: ptBR })}</span>
                )}
                {construction.actual_end && (
                  <span className="text-emerald-400">Entregue: {format(new Date(construction.actual_end), 'dd/MM/yyyy', { locale: ptBR })}</span>
                )}
                <span>{diasDeObra} dias de obra</span>
              </div>
            </div>

            <button
              onClick={() => window.open(portalUrl, '_blank')}
              className="flex items-center gap-2 text-xs px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gold-400 whitespace-nowrap"
            >
              <Eye size={14} /> Portal do Cliente
            </button>
          </div>

          {/* Progress bar grande */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-white/40">Progresso geral</span>
              <span className="gradient-text font-bold">{construction.progress}%</span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${construction.progress}%`,
                  background: `linear-gradient(90deg, ${phaseInfo.color}, #F5C518)`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* TABS */}
      {/* ============================================ */}
      <div className="flex items-center gap-1 border-b border-white/10 overflow-x-auto pb-px">
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          const count = tabCounts[tab.key]
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-gold-400 text-gold-400'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <Icon size={14} />
              {tab.label}
              {count !== undefined && (
                <span className={`text-xs ${isActive ? 'text-gold-400/70' : 'text-white/20'}`}>({count})</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ============================================ */}
      {/* TAB CONTENT */}
      {/* ============================================ */}
      {activeTab === 'visao' && (
        <TabVisaoGeral
          construction={construction}
          currentPhaseIdx={currentPhaseIdx}
          updateConstruction={updateConstruction}
          updates={updates}
          crew={crew}
          costs={costs}
          materials={materials}
          diasDeObra={diasDeObra}
        />
      )}
      {activeTab === 'diario' && (
        <TabDiario
          constructionId={construction.id}
          entries={entries}
          isLoading={loadingDiary}
          createEntry={createEntry}
        />
      )}
      {activeTab === 'equipe' && (
        <TabEquipe
          constructionId={construction.id}
          crew={crew}
          isLoading={loadingCrew}
          createMember={createMember}
          updateMember={updateMember}
        />
      )}
      {activeTab === 'materiais' && (
        <TabMateriais
          constructionId={construction.id}
          materials={materials}
          isLoading={loadingMaterials}
          createMaterial={createMaterial}
          updateStatus={updateStatus}
        />
      )}
      {activeTab === 'custos' && (
        <TabCustos
          constructionId={construction.id}
          costs={costs}
          isLoading={loadingCosts}
          createCost={createCost}
        />
      )}
      {activeTab === 'atualizacoes' && (
        <TabAtualizacoes
          construction={construction}
          updates={updates}
          addUpdate={addUpdate}
          portalUrl={portalUrl}
        />
      )}
      {activeTab === 'portal' && (
        <TabPortal portalUrl={portalUrl} />
      )}
    </div>
  )
}

// ============================================
// ABA 1 — VISAO GERAL
// ============================================

function TabVisaoGeral({
  construction,
  currentPhaseIdx,
  updateConstruction,
  updates,
  crew,
  costs,
  materials,
  diasDeObra,
}: {
  construction: any
  currentPhaseIdx: number
  updateConstruction: any
  updates: any[]
  crew: CrewMember[]
  costs: ConstructionCost[]
  materials: ConstructionMaterial[]
  diasDeObra: number
}) {
  const totalPlanned = costs.reduce((s, c) => s + c.planned_value, 0)
  const totalActual = costs.reduce((s, c) => s + c.actual_value, 0)
  const totalCrew = crew.filter(c => c.active).length
  const totalMaterialsReq = materials.length

  return (
    <div className="space-y-6">
      {/* Timeline de fases */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-medium text-white/60 mb-4">Fases da Obra</h3>
        <div className="space-y-3">
          {PHASES.map((p, i) => {
            const isDone = i < currentPhaseIdx
            const isCurrent = i === currentPhaseIdx

            return (
              <div
                key={p.key}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${
                  isCurrent ? 'bg-white/5 border border-white/10' : ''
                }`}
              >
                <div className="relative">
                  <div
                    className={`w-4 h-4 rounded-full ${isDone ? 'bg-emerald-400' : isCurrent ? 'glow-pulse' : 'bg-white/10'}`}
                    style={isCurrent ? { background: p.color } : {}}
                  />
                  {i < PHASES.length - 1 && (
                    <div
                      className={`absolute left-1.5 top-5 w-0.5 h-6 ${isDone ? 'bg-emerald-400/30' : 'bg-white/5'}`}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm ${
                      isCurrent ? 'font-semibold' : isDone ? 'text-white/50 line-through' : 'text-white/25'
                    }`}
                    style={isCurrent ? { color: p.color } : {}}
                  >
                    {p.label}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const progress = Math.round(((i + 1) / PHASES.length) * 100)
                    updateConstruction.mutate({ id: construction.id, phase: p.key, progress })
                  }}
                  className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
                    isCurrent
                      ? 'border-gold-400/30 bg-gold-400/20 text-gold-400'
                      : isDone
                        ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-400/60'
                        : 'border-white/10 text-white/20 hover:border-white/20 hover:text-white/40'
                  }`}
                >
                  {isDone ? 'Concluida' : isCurrent ? 'Atual' : 'Ir para'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Custo Planejado</p>
          <p className="gradient-text text-lg font-bold">{currency(totalPlanned)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Custo Realizado</p>
          <p className="gradient-text text-lg font-bold">{currency(totalActual)}</p>
          {totalPlanned > 0 && (
            <p className={`text-xs mt-1 ${totalActual > totalPlanned ? 'text-red-400' : 'text-emerald-400'}`}>
              {totalActual > totalPlanned ? '+' : ''}{((totalActual - totalPlanned) / totalPlanned * 100).toFixed(1)}%
            </p>
          )}
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Equipe Ativa</p>
          <p className="gradient-text text-lg font-bold">{totalCrew} pessoas</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Dias de Obra</p>
          <p className="gradient-text text-lg font-bold">{diasDeObra} dias</p>
          <p className="text-xs text-white/30 mt-1">{totalMaterialsReq} materiais requisitados</p>
        </div>
      </div>

      {/* Ultimas atualizacoes */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-medium text-white/60 mb-4">Ultimas Atualizacoes</h3>
        {updates.length > 0 ? (
          <div className="space-y-3">
            {updates.slice(0, 5).map(u => {
              const pi = getPhaseInfo(u.phase)
              return (
                <div key={u.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: pi.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: pi.color + '20', color: pi.color }}
                      >
                        {pi.label}
                      </span>
                      <span className="text-xs text-white/25">
                        {format(new Date(u.created_at), "dd/MM 'as' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 truncate">{u.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-white/20 text-center py-6">Nenhuma atualizacao registrada</p>
        )}
      </div>
    </div>
  )
}

// ============================================
// ABA 2 — DIARIO DE OBRA
// ============================================

function TabDiario({
  constructionId,
  entries,
  isLoading,
  createEntry,
}: {
  constructionId: string
  entries: DiaryEntry[]
  isLoading: boolean
  createEntry: any
}) {
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    weather: 'ensolarado',
    workers_present: 0,
    activities: '',
    incidents: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [filterMonth, setFilterMonth] = useState('')

  const filteredEntries = useMemo(() => {
    if (!filterMonth) return entries
    return entries.filter(e => e.date.startsWith(filterMonth))
  }, [entries, filterMonth])

  const handleSubmit = async () => {
    if (!form.activities.trim()) return
    setSubmitting(true)
    try {
      await createEntry.mutateAsync({
        construction_id: constructionId,
        date: form.date,
        weather: form.weather,
        workers_present: form.workers_present,
        activities: form.activities.trim(),
        incidents: form.incidents.trim() || null,
        images: [],
      })
      setForm(f => ({ ...f, activities: '', incidents: '', workers_present: 0 }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-medium text-white/60 mb-4">Registrar Dia</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          />
          <select
            value={form.weather}
            onChange={e => setForm({ ...form, weather: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          >
            {WEATHER_OPTIONS.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            placeholder="Trabalhadores presentes"
            value={form.workers_present || ''}
            onChange={e => setForm({ ...form, workers_present: parseInt(e.target.value) || 0 })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          />
        </div>
        <textarea
          placeholder="Atividades realizadas *"
          value={form.activities}
          onChange={e => setForm({ ...form, activities: e.target.value })}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none resize-none mb-3"
        />
        <textarea
          placeholder="Ocorrencias (opcional)"
          value={form.incidents}
          onChange={e => setForm({ ...form, incidents: e.target.value })}
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none resize-none mb-3"
        />
        <button
          onClick={handleSubmit}
          disabled={!form.activities.trim() || submitting}
          className="glow-button px-6 py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {submitting ? 'Salvando...' : 'Registrar Dia'}
        </button>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gold-400/40 focus:outline-none"
          placeholder="Filtrar por mes"
        />
        {filterMonth && (
          <button onClick={() => setFilterMonth('')} className="text-xs text-white/40 hover:text-white/60">
            Limpar filtro
          </button>
        )}
        <span className="text-xs text-white/30 ml-auto">{filteredEntries.length} registros</span>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : filteredEntries.length > 0 ? (
        <div className="space-y-4">
          {filteredEntries.map(entry => {
            const weather = getWeatherInfo(entry.weather)
            const WeatherIcon = weather.icon
            return (
              <div key={entry.id} className="glass rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <WeatherIcon size={20} style={{ color: weather.color }} />
                  <span className="text-sm font-medium">
                    {format(new Date(entry.date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                    {entry.workers_present} trabalhadores
                  </span>
                </div>
                <p className="text-sm text-white/70 mb-2">{entry.activities}</p>
                {entry.incidents && (
                  <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400 font-medium mb-0.5">Ocorrencia</p>
                    <p className="text-sm text-red-300/70">{entry.incidents}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-white/20 text-center py-8">Nenhum registro no diario</p>
      )}
    </div>
  )
}

// ============================================
// ABA 3 — EQUIPE
// ============================================

function TabEquipe({
  constructionId,
  crew,
  isLoading,
  createMember,
  updateMember,
}: {
  constructionId: string
  crew: CrewMember[]
  isLoading: boolean
  createMember: any
  updateMember: any
}) {
  const [form, setForm] = useState({ name: '', role: 'pedreiro', daily_rate: 0 })
  const [submitting, setSubmitting] = useState(false)

  const totalCrew = crew.filter(c => c.active).length
  const totalCost = crew.reduce((s, c) => s + c.daily_rate * c.days_worked, 0)

  const handleAdd = async () => {
    if (!form.name.trim() || !form.daily_rate) return
    setSubmitting(true)
    try {
      await createMember.mutateAsync({
        construction_id: constructionId,
        name: form.name.trim(),
        role: form.role,
        daily_rate: form.daily_rate,
        days_worked: 0,
        active: true,
      })
      setForm({ name: '', role: 'pedreiro', daily_rate: 0 })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-medium text-white/60 mb-4">Adicionar Membro</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input
            placeholder="Nome *"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          />
          <select
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          >
            {Object.entries(CREW_ROLES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            placeholder="Diaria R$"
            value={form.daily_rate || ''}
            onChange={e => setForm({ ...form, daily_rate: parseFloat(e.target.value) || 0 })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!form.name.trim() || !form.daily_rate || submitting}
          className="glow-button px-6 py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {submitting ? 'Salvando...' : 'Adicionar'}
        </button>
      </div>

      {/* Totalizadores */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Equipe Ativa</p>
          <p className="gradient-text text-lg font-bold">{totalCrew} pessoas</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Custo Total Mao de Obra</p>
          <p className="gradient-text text-lg font-bold">{currency(totalCost)}</p>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : crew.length > 0 ? (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Funcao</th>
                  <th className="px-4 py-3 font-medium text-right">Diaria</th>
                  <th className="px-4 py-3 font-medium text-center">Dias</th>
                  <th className="px-4 py-3 font-medium text-right">Custo Total</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {crew.map(member => (
                  <tr key={member.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium">{member.name}</td>
                    <td className="px-4 py-3 text-white/60">{CREW_ROLES[member.role] ?? member.role}</td>
                    <td className="px-4 py-3 text-right text-white/60">{currency(member.daily_rate)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-white/60">{member.days_worked}</span>
                        <button
                          onClick={() => updateMember.mutate({ id: member.id, days_worked: member.days_worked + 1 })}
                          className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-gold-400/20 hover:border-gold-400/30 transition-colors text-white/40 hover:text-gold-400"
                          title="Adicionar dia"
                        >
                          <Plus size={12} />
                        </button>
                        {member.days_worked > 0 && (
                          <button
                            onClick={() => updateMember.mutate({ id: member.id, days_worked: member.days_worked - 1 })}
                            className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-400/20 hover:border-red-400/30 transition-colors text-white/40 hover:text-red-400"
                            title="Remover dia"
                          >
                            <Minus size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{currency(member.daily_rate * member.days_worked)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => updateMember.mutate({ id: member.id, active: !member.active })}
                        className={`text-xs px-2 py-1 rounded-full ${
                          member.active
                            ? 'bg-emerald-400/20 text-emerald-400'
                            : 'bg-red-400/20 text-red-400'
                        }`}
                      >
                        {member.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => updateMember.mutate({ id: member.id, active: !member.active })}
                        className="text-xs text-white/30 hover:text-white/60 transition-colors"
                      >
                        {member.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/20 text-center py-8">Nenhum membro na equipe</p>
      )}
    </div>
  )
}

// ============================================
// ABA 4 — MATERIAIS
// ============================================

function TabMateriais({
  constructionId,
  materials,
  isLoading,
  createMaterial,
  updateStatus,
}: {
  constructionId: string
  materials: ConstructionMaterial[]
  isLoading: boolean
  createMaterial: any
  updateStatus: any
}) {
  const [form, setForm] = useState({ material_name: '', quantity: 0, unit_price: 0 })
  const [submitting, setSubmitting] = useState(false)

  const totalValue = materials.reduce((s, m) => s + m.quantity * m.unit_price, 0)

  const handleSubmit = async () => {
    if (!form.material_name.trim() || !form.quantity) return
    setSubmitting(true)
    try {
      await createMaterial.mutateAsync({
        construction_id: constructionId,
        material_name: form.material_name.trim(),
        quantity: form.quantity,
        unit_price: form.unit_price,
        status: 'solicitado' as ConstructionMaterialStatus,
      })
      setForm({ material_name: '', quantity: 0, unit_price: 0 })
    } finally {
      setSubmitting(false)
    }
  }

  const advanceStatus = (material: ConstructionMaterial) => {
    const currentIdx = MATERIAL_STATUS_FLOW.indexOf(material.status)
    if (currentIdx < MATERIAL_STATUS_FLOW.length - 1) {
      const nextStatus = MATERIAL_STATUS_FLOW[currentIdx + 1]
      updateStatus.mutate({ id: material.id, status: nextStatus })
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-medium text-white/60 mb-4">Requisitar Material</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input
            placeholder="Nome do material *"
            value={form.material_name}
            onChange={e => setForm({ ...form, material_name: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          />
          <input
            type="number"
            min={0}
            placeholder="Quantidade *"
            value={form.quantity || ''}
            onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          />
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="Valor unitario R$"
            value={form.unit_price || ''}
            onChange={e => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!form.material_name.trim() || !form.quantity || submitting}
          className="glow-button px-6 py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {submitting ? 'Salvando...' : 'Requisitar Material'}
        </button>
      </div>

      {/* Totalizador */}
      <div className="glass rounded-xl p-4">
        <p className="text-xs text-white/40 mb-1">Valor Total de Materiais</p>
        <p className="gradient-text text-lg font-bold">{currency(totalValue)}</p>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : materials.length > 0 ? (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left">
                  <th className="px-4 py-3 font-medium">Material</th>
                  <th className="px-4 py-3 font-medium text-right">Qtd</th>
                  <th className="px-4 py-3 font-medium text-right">Valor Un.</th>
                  <th className="px-4 py-3 font-medium text-right">Valor Total</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {materials.map(m => {
                  const statusColor = MATERIAL_STATUS_COLORS[m.status]
                  const canAdvance = MATERIAL_STATUS_FLOW.indexOf(m.status) < MATERIAL_STATUS_FLOW.length - 1
                  return (
                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium">{m.material_name}</td>
                      <td className="px-4 py-3 text-right text-white/60">{m.quantity}</td>
                      <td className="px-4 py-3 text-right text-white/60">{currency(m.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{currency(m.quantity * m.unit_price)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => canAdvance && advanceStatus(m)}
                          className={`text-xs px-2 py-1 rounded-full transition-colors ${canAdvance ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                          style={{ background: statusColor + '20', color: statusColor }}
                          title={canAdvance ? `Avancar para: ${MATERIAL_STATUS_FLOW[MATERIAL_STATUS_FLOW.indexOf(m.status) + 1]}` : ''}
                        >
                          {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right text-white/30 text-xs">
                        {format(new Date(m.requested_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/20 text-center py-8">Nenhum material requisitado</p>
      )}
    </div>
  )
}

// ============================================
// ABA 5 — CUSTOS
// ============================================

function TabCustos({
  constructionId,
  costs,
  isLoading,
  createCost,
}: {
  constructionId: string
  costs: ConstructionCost[]
  isLoading: boolean
  createCost: any
}) {
  const [form, setForm] = useState({
    category: 'materiais' as CostCategory,
    description: '',
    planned_value: 0,
    actual_value: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
  })
  const [submitting, setSubmitting] = useState(false)

  const totalPlanned = costs.reduce((s, c) => s + c.planned_value, 0)
  const totalActual = costs.reduce((s, c) => s + c.actual_value, 0)
  const desvioTotal = totalPlanned > 0 ? ((totalActual - totalPlanned) / totalPlanned * 100) : 0

  // Dados para grafico
  const chartData = useMemo(() => {
    const categories = Object.keys(COST_CATEGORIES) as CostCategory[]
    return categories.map(cat => {
      const catCosts = costs.filter(c => c.category === cat)
      return {
        name: COST_CATEGORIES[cat].label,
        planejado: catCosts.reduce((s, c) => s + c.planned_value, 0),
        realizado: catCosts.reduce((s, c) => s + c.actual_value, 0),
      }
    }).filter(d => d.planejado > 0 || d.realizado > 0)
  }, [costs])

  const handleSubmit = async () => {
    if (!form.description.trim()) return
    setSubmitting(true)
    try {
      await createCost.mutateAsync({
        construction_id: constructionId,
        category: form.category,
        description: form.description.trim(),
        planned_value: form.planned_value,
        actual_value: form.actual_value,
        date: form.date || null,
      })
      setForm(f => ({ ...f, description: '', planned_value: 0, actual_value: 0 }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-medium text-white/60 mb-4">Adicionar Custo</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <select
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value as CostCategory })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          >
            {Object.entries(COST_CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <input
            placeholder="Descricao *"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="Valor planejado R$"
            value={form.planned_value || ''}
            onChange={e => setForm({ ...form, planned_value: parseFloat(e.target.value) || 0 })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          />
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="Valor realizado R$"
            value={form.actual_value || ''}
            onChange={e => setForm({ ...form, actual_value: parseFloat(e.target.value) || 0 })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          />
          <input
            type="date"
            value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!form.description.trim() || submitting}
          className="glow-button px-6 py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {submitting ? 'Salvando...' : 'Adicionar Custo'}
        </button>
      </div>

      {/* Totalizadores */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Total Planejado</p>
          <p className="gradient-text text-lg font-bold">{currency(totalPlanned)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Total Realizado</p>
          <p className="gradient-text text-lg font-bold">{currency(totalActual)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-white/40 mb-1">Desvio</p>
          <p className={`text-lg font-bold ${desvioTotal > 0 ? 'text-red-400' : desvioTotal < 0 ? 'text-emerald-400' : 'text-white/60'}`}>
            {desvioTotal > 0 ? '+' : ''}{desvioTotal.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Grafico */}
      {chartData.length > 0 && (
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-medium text-white/60 mb-4">Planejado vs Realizado por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false}
                tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                formatter={(value: any) => [currency(value), '']}
              />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Bar dataKey="planejado" name="Planejado" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realizado" name="Realizado" fill="#F5C518" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela */}
      {isLoading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : costs.length > 0 ? (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-left">
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Descricao</th>
                  <th className="px-4 py-3 font-medium text-right">Planejado</th>
                  <th className="px-4 py-3 font-medium text-right">Realizado</th>
                  <th className="px-4 py-3 font-medium text-right">Desvio</th>
                  <th className="px-4 py-3 font-medium text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {costs.map(cost => {
                  const cat = COST_CATEGORIES[cost.category]
                  const desvio = cost.planned_value > 0
                    ? ((cost.actual_value - cost.planned_value) / cost.planned_value * 100)
                    : 0
                  return (
                    <tr key={cost.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ background: cat.color + '20', color: cat.color }}
                        >
                          {cat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/60">{cost.description}</td>
                      <td className="px-4 py-3 text-right text-white/60">{currency(cost.planned_value)}</td>
                      <td className="px-4 py-3 text-right font-medium">{currency(cost.actual_value)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={desvio > 0 ? 'text-red-400' : desvio < 0 ? 'text-emerald-400' : 'text-white/30'}>
                          {desvio > 0 ? '+' : ''}{desvio.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white/30 text-xs">
                        {cost.date ? format(new Date(cost.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/20 text-center py-8">Nenhum custo registrado</p>
      )}
    </div>
  )
}

// ============================================
// ABA 6 — ATUALIZACOES
// ============================================

function TabAtualizacoes({
  construction,
  updates,
  addUpdate,
  portalUrl,
}: {
  construction: any
  updates: any[]
  addUpdate: any
  portalUrl: string
}) {
  const [phase, setPhase] = useState<ConstructionPhase>('fundacao')
  const [desc, setDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!desc.trim()) return
    setSubmitting(true)
    try {
      await addUpdate.mutateAsync({
        construction_id: construction.id,
        phase,
        description: desc.trim(),
        progress: construction.progress,
      })
      setDesc('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Formulario */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-medium text-white/60 mb-4">Registrar Atualizacao</h3>
        <div className="flex gap-3 mb-3">
          <select
            value={phase}
            onChange={e => setPhase(e.target.value as ConstructionPhase)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none"
          >
            {PHASES.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>
        <textarea
          placeholder="Descreva o andamento da obra..."
          value={desc}
          onChange={e => setDesc(e.target.value)}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none resize-none mb-3"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={!desc.trim() || submitting}
            className="glow-button px-6 py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {submitting ? 'Salvando...' : 'Registrar Atualizacao'}
          </button>
          <button
            onClick={() => window.open(portalUrl, '_blank')}
            className="text-xs text-gold-400/70 hover:text-gold-400 transition-colors"
          >
            Ver como cliente ve →
          </button>
        </div>
      </div>

      {/* Timeline */}
      {updates.length > 0 ? (
        <div className="border-l-2 border-white/10 ml-4 space-y-6 pl-6">
          {updates.map(u => {
            const pi = getPhaseInfo(u.phase)
            return (
              <div key={u.id} className="relative">
                <div
                  className="absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 border-[#0e0e14]"
                  style={{ background: pi.color }}
                />
                <div className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: pi.color + '20', color: pi.color }}
                    >
                      {pi.label}
                    </span>
                    <span className="text-xs text-white/25">
                      {format(new Date(u.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-white/70">{u.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-white/20 text-center py-8">Nenhuma atualizacao registrada</p>
      )}
    </div>
  )
}

// ============================================
// ABA 7 — PORTAL
// ============================================

function TabPortal({ portalUrl }: { portalUrl: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* URL e acoes */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-medium text-white/60">Portal do Cliente</h3>
        <p className="text-xs text-white/40">
          Compartilhe este link com o cliente para que ele acompanhe o andamento da obra em tempo real.
        </p>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gold-400 truncate">
            {portalUrl}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={() => window.open(portalUrl, '_blank')}
            className="glow-button px-4 py-2.5 rounded-xl text-sm flex items-center gap-2"
          >
            <ExternalLink size={14} /> Abrir
          </button>
        </div>
      </div>

      {/* QR Code simulado */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-medium text-white/60 mb-4">QR Code</h3>
        <div className="flex flex-col items-center gap-4">
          <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center p-4">
            <div className="w-full h-full border-4 border-black rounded-lg flex items-center justify-center">
              <div className="text-center">
                <HardHat size={32} className="text-black mx-auto mb-2" />
                <p className="text-[8px] text-black font-mono break-all leading-tight px-1">{portalUrl}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-white/30 text-center">
            Escaneie para acessar o portal da obra
          </p>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-medium text-white/60 mb-4">Preview do Portal</h3>
        <div className="rounded-xl overflow-hidden border border-white/10" style={{ height: 500 }}>
          <iframe
            src={portalUrl}
            className="w-full h-full bg-[#06060a]"
            title="Portal do Cliente"
          />
        </div>
      </div>
    </div>
  )
}
