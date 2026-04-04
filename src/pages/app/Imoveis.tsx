import { useState } from 'react'
import { useProperties } from '../../hooks/useProperties'
import type { Property, PropertyStatus, PropertyType } from '../../types'
import { Building2, Plus, MapPin, Bed, Bath, Maximize, X, Search, Pencil, Check } from 'lucide-react'

const statusColors: Record<string, string> = {
  disponivel: '#34d399',
  reservado: '#F5C518',
  vendido: '#ef4444',
  construcao: '#60a5fa',
}

const statusLabels: Record<string, string> = {
  disponivel: 'Disponivel',
  reservado: 'Reservado',
  vendido: 'Vendido',
  construcao: 'Construcao',
}

export default function Imoveis() {
  const { properties, isLoading, createProperty, updateProperty } = useProperties()
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('todos')
  const [selected, setSelected] = useState<Property | null>(null)

  const filtered = properties.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.neighborhood.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'todos' || p.status === filter
    return matchSearch && matchFilter
  })

  if (isLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Imoveis</h1>
          <p className="text-white/40 text-sm">{properties.length} imoveis cadastrados</p>
        </div>
        <button onClick={() => setShowNew(true)} className="glow-button px-4 py-2 rounded-xl text-sm flex items-center gap-2">
          <Plus size={16} /> Novo Imovel
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar imovel..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-gold-400/40 focus:outline-none"
          />
        </div>
        {['todos', 'disponivel', 'reservado', 'vendido', 'construcao'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              filter === s ? 'bg-gold-400/20 border-gold-400/30 text-gold-400' : 'border-white/10 text-white/40'
            }`}
          >
            {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(prop => (
          <div key={prop.id} className="glass rounded-xl overflow-hidden gradient-border group cursor-pointer" onClick={() => setSelected(prop)}>
            <div className="h-40 bg-gradient-to-br from-gold-400/10 to-transparent flex items-center justify-center">
              {prop.images?.[0] ? (
                <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
              ) : (
                <Building2 size={40} className="text-white/10" />
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <h3 className="text-sm font-medium">{prop.title}</h3>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: `${statusColors[prop.status]}15`, color: statusColors[prop.status] }}
                >
                  {prop.status}
                </span>
              </div>
              <p className="text-lg font-bold gradient-text">R$ {prop.price.toLocaleString('pt-BR')}</p>
              <div className="flex items-center gap-1 text-xs text-white/40">
                <MapPin size={12} /> {prop.neighborhood}, {prop.city}
              </div>
              <div className="flex items-center gap-4 text-xs text-white/50 pt-2 border-t border-white/5">
                {prop.bedrooms && <span className="flex items-center gap-1"><Bed size={12} />{prop.bedrooms} quartos</span>}
                {prop.bathrooms && <span className="flex items-center gap-1"><Bath size={12} />{prop.bathrooms} banheiros</span>}
                <span className="flex items-center gap-1"><Maximize size={12} />{prop.area_m2}m2</span>
              </div>
              {prop.mcmv_eligible && (
                <span className="inline-block text-[10px] px-2 py-0.5 bg-emerald-400/10 text-emerald-400 rounded">MCMV</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-white/20 text-sm py-12">Nenhum imovel encontrado</p>
      )}

      {showNew && <NewPropertyModal onClose={() => setShowNew(false)} onSave={data => { createProperty.mutate(data); setShowNew(false) }} />}

      {selected && (
        <PropertyDetailModal
          property={selected}
          onClose={() => setSelected(null)}
          onUpdate={async (id, fields) => {
            await updateProperty.mutateAsync({ id, ...fields })
            // refresh selected with new data
            setSelected(prev => prev ? { ...prev, ...fields } : null)
          }}
        />
      )}
    </div>
  )
}

/* ============ DETAIL MODAL ============ */
function PropertyDetailModal({
  property,
  onClose,
  onUpdate,
}: {
  property: Property
  onClose: () => void
  onUpdate: (id: string, fields: Partial<Property>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    title: property.title,
    type: property.type,
    price: String(property.price),
    area_m2: String(property.area_m2),
    bedrooms: property.bedrooms != null ? String(property.bedrooms) : '',
    bathrooms: property.bathrooms != null ? String(property.bathrooms) : '',
    neighborhood: property.neighborhood,
    description: property.description ?? '',
    mcmv_eligible: property.mcmv_eligible,
  })

  const handleSave = async () => {
    await onUpdate(property.id, {
      title: form.title,
      type: form.type,
      price: Number(form.price),
      area_m2: Number(form.area_m2),
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      neighborhood: form.neighborhood,
      description: form.description || null,
      mcmv_eligible: form.mcmv_eligible,
    })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1000)
  }

  const handleStatusChange = async (status: PropertyStatus) => {
    await onUpdate(property.id, { status })
  }

  const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold-400/40 focus:outline-none'
  const labelClass = 'text-xs text-white/40 mb-1 block'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">{editing ? 'Editar Imovel' : property.title}</h2>
            {saved && <span className="text-xs text-emerald-400 flex items-center gap-1"><Check size={14} /> Salvo!</span>}
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)} className="border border-white/10 text-white/40 hover:text-white/70 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                <Pencil size={12} /> Editar
              </button>
            )}
            <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
          </div>
        </div>

        {/* Image placeholder */}
        <div className="h-48 bg-gradient-to-br from-gold-400/10 to-transparent rounded-xl flex items-center justify-center">
          {property.images?.[0] ? (
            <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <Building2 size={64} className="text-white/10" />
          )}
        </div>

        {editing ? (
          /* EDIT MODE */
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Titulo</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as PropertyType })} className={inputClass}>
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="terreno">Terreno</option>
                  <option value="comercial">Comercial</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Preco (R$)</label>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Area m2</label>
                <input type="number" value={form.area_m2} onChange={e => setForm({ ...form, area_m2: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Quartos</label>
                <input type="number" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Banheiros</label>
                <input type="number" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Bairro</label>
                <input value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Descricao</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className={inputClass} />
            </div>
            <label className="flex items-center gap-2 text-sm text-white/60">
              <input type="checkbox" checked={form.mcmv_eligible} onChange={e => setForm({ ...form, mcmv_eligible: e.target.checked })} className="rounded" />
              Elegivel MCMV
            </label>
            <div className="flex gap-3">
              <button onClick={handleSave} className="glow-button px-6 py-2.5 rounded-xl text-sm flex-1">Salvar</button>
              <button onClick={() => setEditing(false)} className="border border-white/10 text-white/40 hover:text-white/70 px-4 py-2.5 rounded-xl text-sm">Cancelar</button>
            </div>
          </div>
        ) : (
          /* VIEW MODE */
          <div className="space-y-4">
            {/* Status buttons */}
            <div>
              <label className={labelClass}>Status</label>
              <div className="flex gap-2 mt-1">
                {(['disponivel', 'reservado', 'vendido', 'construcao'] as PropertyStatus[]).map(s => {
                  const isActive = property.status === s
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className="text-xs px-3 py-1.5 rounded-full border transition-all"
                      style={{
                        background: isActive ? `${statusColors[s]}20` : 'transparent',
                        borderColor: isActive ? statusColors[s] : 'rgba(255,255,255,0.1)',
                        color: isActive ? statusColors[s] : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      {statusLabels[s]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo</label>
                <p className="text-sm capitalize">{property.type}</p>
              </div>
              <div>
                <label className={labelClass}>Preco</label>
                <p className="text-lg font-bold gradient-text">R$ {property.price.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <label className={labelClass}>Area</label>
                <p className="text-sm">{property.area_m2} m2</p>
              </div>
              <div>
                <label className={labelClass}>Localizacao</label>
                <p className="text-sm flex items-center gap-1"><MapPin size={12} className="text-white/30" /> {property.neighborhood}, {property.city}</p>
              </div>
              {property.bedrooms != null && (
                <div>
                  <label className={labelClass}>Quartos</label>
                  <p className="text-sm flex items-center gap-1"><Bed size={14} className="text-white/30" /> {property.bedrooms}</p>
                </div>
              )}
              {property.bathrooms != null && (
                <div>
                  <label className={labelClass}>Banheiros</label>
                  <p className="text-sm flex items-center gap-1"><Bath size={14} className="text-white/30" /> {property.bathrooms}</p>
                </div>
              )}
            </div>

            {/* Description */}
            {property.description && (
              <div>
                <label className={labelClass}>Descricao</label>
                <p className="text-sm text-white/70 leading-relaxed">{property.description}</p>
              </div>
            )}

            {/* Features */}
            {property.features?.length > 0 && (
              <div>
                <label className={labelClass}>Caracteristicas</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {property.features.map((f, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-white/60">{f}</span>
                  ))}
                </div>
              </div>
            )}

            {/* MCMV badge */}
            {property.mcmv_eligible && (
              <span className="inline-block text-xs px-3 py-1 bg-emerald-400/10 text-emerald-400 rounded-full border border-emerald-400/20">
                Elegivel MCMV
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ============ NEW MODAL ============ */
function NewPropertyModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Partial<Property>) => void }) {
  const [form, setForm] = useState({
    title: '', type: 'casa' as Property['type'], price: '', area_m2: '',
    bedrooms: '', bathrooms: '', neighborhood: '', city: 'Ico',
    description: '', mcmv_eligible: true,
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Novo Imovel</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <input placeholder="Titulo *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Property['type'] })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none">
            <option value="casa">Casa</option>
            <option value="apartamento">Apartamento</option>
            <option value="terreno">Terreno</option>
            <option value="comercial">Comercial</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Preco" type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
            <input placeholder="Area m2" type="number" value={form.area_m2} onChange={e => setForm({ ...form, area_m2: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
            <input placeholder="Quartos" type="number" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
            <input placeholder="Banheiros" type="number" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
          </div>
          <input placeholder="Bairro" value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none" />
          <label className="flex items-center gap-2 text-sm text-white/60">
            <input type="checkbox" checked={form.mcmv_eligible} onChange={e => setForm({ ...form, mcmv_eligible: e.target.checked })}
              className="rounded" />
            Elegivel MCMV
          </label>
        </div>
        <button onClick={() => form.title && onSave({
          ...form,
          price: Number(form.price),
          area_m2: Number(form.area_m2),
          bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
          status: 'disponivel',
          images: [],
          features: [],
          address: '',
        })} className="glow-button w-full py-3 rounded-xl text-sm">
          Salvar Imovel
        </button>
      </div>
    </div>
  )
}
