import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LogIn, Eye, EyeOff, Building2, HardHat, Calculator, Users } from 'lucide-react'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError('Email ou senha incorretos')
      setLoading(false)
    } else {
      navigate('/app')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold-400/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo e branding */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center">
            <img src="/img/tja7-logo.png" alt="TJA7" className="h-12" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">TJA7 HUB</h1>
          <p className="text-white/40 text-sm mt-1">Ecossistema Inteligente</p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {[
            { icon: Calculator, label: 'Simulador MCMV' },
            { icon: Users, label: 'CRM' },
            { icon: Building2, label: 'Imoveis' },
            { icon: HardHat, label: 'Obras' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
              <Icon size={12} className="text-gold-400" />
              <span className="text-[10px] text-white/50">{label}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none transition-colors"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-1 block">Senha</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold-400/40 focus:outline-none transition-colors pr-10"
                placeholder="********"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="glow-button w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <LogIn size={16} />
                Entrar
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 space-y-1">
          <p className="text-white/20 text-xs">TJA7 Empreendimentos &copy; {new Date().getFullYear()}</p>
          <p className="text-white/10 text-[10px]">Ico, Ceara — Powered by RC Digital</p>
        </div>
      </div>
    </div>
  )
}
