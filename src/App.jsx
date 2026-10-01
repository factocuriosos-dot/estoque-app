import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventario from './pages/Inventario'
import Produtos from './pages/Produtos'
import Notas from './pages/Notas'
import Devolucoes from './pages/Devolucoes'
import Relatorios from './pages/Relatorios'
import Coleta from './pages/Coleta'
import Auditoria from './pages/Auditoria'
import Usuarios from './pages/Usuarios'
import Paletes from './pages/Paletes'
import ValePalete from './pages/ValePalete'
import EditarValePalete from './pages/EditarValePalete'
import MovimentacoesPalete from './pages/MovimentacoesPalete'
import Transportadoras from './pages/Transportadoras'
import RelatoriosPaletes from './pages/RelatoriosPaletes'

function PrivateRoute({ children, apenasAdmin }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  if (!user) return <Navigate to="/login" />
  if (apenasAdmin && !isAdmin) return <Navigate to="/" />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/inventario"
        element={
          <PrivateRoute>
            <Inventario />
          </PrivateRoute>
        }
      />
      <Route
        path="/produtos"
        element={
          <PrivateRoute>
            <Produtos />
          </PrivateRoute>
        }
      />
      <Route
        path="/notas"
        element={
          <PrivateRoute>
            <Notas />
          </PrivateRoute>
        }
      />
      <Route
        path="/devolucoes"
        element={
          <PrivateRoute>
            <Devolucoes />
          </PrivateRoute>
        }
      />
      <Route
        path="/relatorios"
        element={
          <PrivateRoute>
            <Relatorios />
          </PrivateRoute>
        }
      />
      <Route
        path="/coleta"
        element={
          <PrivateRoute>
            <Coleta />
          </PrivateRoute>
        }
      />
      <Route
        path="/auditoria"
        element={
          <PrivateRoute apenasAdmin>
            <Auditoria />
          </PrivateRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <PrivateRoute apenasAdmin>
            <Usuarios />
          </PrivateRoute>
        }
      />
      <Route
        path="/paletes"
        element={
          <PrivateRoute>
            <Paletes />
          </PrivateRoute>
        }
      />
      <Route
        path="/paletes/novo"
        element={
          <PrivateRoute>
            <ValePalete />
          </PrivateRoute>
        }
      />
      <Route
        path="/paletes/editar/:id"
        element={
          <PrivateRoute>
            <EditarValePalete />
          </PrivateRoute>
        }
      />
      <Route
        path="/paletes/movimentacoes"
        element={
          <PrivateRoute>
            <MovimentacoesPalete />
          </PrivateRoute>
        }
      />
      <Route
        path="/transportadoras"
        element={
          <PrivateRoute>
            <Transportadoras />
          </PrivateRoute>
        }
      />
      <Route
        path="/paletes/relatorios"
        element={
          <PrivateRoute>
            <RelatoriosPaletes />
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
