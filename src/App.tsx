import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/app/ProtectedRoute'
import { AppLayout } from './components/app/AppLayout'

import LoginPage from './pages/app/LoginPage'
import Dashboard from './pages/app/Dashboard'
import Pipeline from './pages/app/Pipeline'
import Simulacoes from './pages/app/Simulacoes'
import Imoveis from './pages/app/Imoveis'
import Lotes from './pages/app/Lotes'
import Obras from './pages/app/Obras'
import Materiais from './pages/app/Materiais'
import Agentes from './pages/app/Agentes'
import PortalCliente from './pages/public/PortalCliente'
import Apresentacao from './pages/public/Apresentacao'

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

            {/* Protected app routes */}
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="simulacoes" element={<Simulacoes />} />
              <Route path="imoveis" element={<Imoveis />} />
              <Route path="lotes" element={<Lotes />} />
              <Route path="obras" element={<Obras />} />
              <Route path="materiais" element={<Materiais />} />
              <Route path="agentes" element={<Agentes />} />
            </Route>

            {/* Redirect */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
