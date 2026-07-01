import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Inventario from './pages/Inventario'
import Produtos from './pages/Produtos'
import Notas from './pages/Notas'
import Relatorios from './pages/Relatorios'
import Coleta from './pages/Coleta'
import Auditoria from './pages/Auditoria'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />
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
          <PrivateRoute>
            <Auditoria />
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
