import { useAuth } from '../contexts/AuthContext'
import { LogOut, Package } from 'lucide-react'

export default function Dashboard() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <Package size={24} />
          <h1 className="text-xl font-bold">Controle de Estoque</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">{user?.email}</span>
          <button
            onClick={signOut}
            className="flex items-center gap-1 bg-blue-700 hover:bg-blue-800 px-3 py-1 rounded-lg text-sm transition"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      <main className="p-6">
        <h2 className="text-2xl font-bold text-gray-800">Bem-vindo! 🎉</h2>
        <p className="text-gray-500 mt-1">
          O sistema está funcionando corretamente.
        </p>
      </main>
    </div>
  )
}
