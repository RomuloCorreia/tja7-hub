import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/app/ProtectedRoute'
import { AppLayout } from './components/app/AppLayout'

import LoginPage from './pages/app/LoginPage'
import Dashboard from './pages/app/Dashboard'
import Pipeline from './pages/app/Pipeline'
import SimuladorMCMV from './pages/app/SimuladorMCMV'
import Imoveis from './pages/app/Imoveis'
import LotesLayout from './pages/app/lotes/LotesLayout'
import LoteamentosLista from './pages/app/lotes/LoteamentosLista'
import LoteamentoPage from './pages/app/lotes/LoteamentoPage'
import Obras from './pages/app/Obras'
import MateriaisLayout from './pages/app/materiais/MateriaisLayout'
import MateriaisDashboard from './pages/app/materiais/MateriaisDashboard'
import MateriaisEstoque from './pages/app/materiais/MateriaisEstoque'
import MateriaisPedidos from './pages/app/materiais/MateriaisPedidos'
import MateriaisOrcamentos from './pages/app/materiais/MateriaisOrcamentos'
import ObraPage from './pages/app/ObraPage'
import Agentes from './pages/app/Agentes'
import Ecossistema from './pages/app/Ecossistema'
import ClientePage from './pages/app/ClientePage'
import PortalCliente from './pages/public/PortalCliente'
import Apresentacao from './pages/public/Apresentacao'
import CaseTJA7 from './pages/public/CaseTJA7'
import MaterialTV from './pages/public/MaterialTV'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/obra/:id" element={<PortalCliente />} />
            <Route path="/apresentacao" element={<Apresentacao />} />
            <Route path="/materiais/tv" element={<MaterialTV />} />
            <Route path="/case" element={<CaseTJA7 />} />

            {/* Protected app routes */}
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="simulacoes" element={<SimuladorMCMV />} />
              <Route path="imoveis" element={<Imoveis />} />
              <Route path="lotes" element={<LotesLayout />}>
                <Route index element={<LoteamentosLista />} />
                <Route path=":loteamento" element={<LoteamentoPage />} />
              </Route>
              <Route path="obras" element={<Obras />} />
              <Route path="obras/:id" element={<ObraPage />} />
              <Route path="materiais" element={<MateriaisLayout />}>
                <Route index element={<MateriaisDashboard />} />
                <Route path="estoque" element={<MateriaisEstoque />} />
                <Route path="pedidos" element={<MateriaisPedidos />} />
                <Route path="orcamentos" element={<MateriaisOrcamentos />} />
              </Route>
              <Route path="agentes" element={<Agentes />} />
              <Route path="ecossistema" element={<Ecossistema />} />
              <Route path="cliente/:id" element={<ClientePage />} />
            </Route>

            {/* Redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
