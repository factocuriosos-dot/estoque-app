import { NavLink } from 'react-router-dom'
import {
  Package,
  FileText,
  BarChart2,
  Truck,
  ClipboardList,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const menu = [
  { to: '/', icon: <ClipboardList size={20} />, label: 'Inventário' },
  { to: '/produtos', icon: <Package size={20} />, label: 'Produtos' },
  { to: '/notas', icon: <FileText size={20} />, label: 'Notas Fiscais' },
  { to: '/relatorios', icon: <BarChart2 size={20} />, label: 'Relatórios' },
  { to: '/coleta', icon: <Truck size={20} />, label: 'Coleta' },
  { to: '/auditoria', icon: <ShieldCheck size={20} />, label: 'Auditoria' },
]

export default function Sidebar({ open, onClose }) {
  const { user, signOut } = useAuth()

  return (
    <>
      {/* Overlay no mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
        fixed top-0 left-0 h-full w-64 bg-blue-900 text-white z-30
        flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:z-auto
      `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <Package size={24} />
            <span className="font-bold text-lg">Estoque</span>
          </div>
          <button onClick={onClose} className="md:hidden">
            <X size={20} />
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 py-4">
          {menu.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm font-medium transition
                ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Usuário */}
        <div className="px-6 py-4 border-t border-blue-800">
          <p className="text-xs text-blue-300 mb-3 truncate">{user?.email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-blue-200 hover:text-white transition"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
