import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Package,
  FileText,
  BarChart2,
  Truck,
  ClipboardList,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
} from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [resumo, setResumo] = useState({
    totalProdutos: 0,
    abaixoMinimo: 0,
    valorEstoque: 0,
    notasPendentes: 0,
    notasAgendadas: 0,
    entradasHoje: 0,
    saidasHoje: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarResumo()
  }, [])

  async function carregarResumo() {
    setLoading(true)
    const hoje = new Date().toISOString().split('T')[0]

    const [{ data: produtos }, { data: notas }, { data: movs }] =
      await Promise.all([
        supabase
          .from('produtos')
          .select('quantidade, quantidade_minima, preco_unitario'),
        supabase
          .from('notas_fiscais')
          .select('status, tipo')
          .eq('tipo', 'saida'),
        supabase
          .from('movimentacoes')
          .select('tipo, data')
          .gte('data', hoje + 'T00:00:00'),
      ])

    const totalProdutos = produtos?.length || 0
    const abaixoMinimo =
      produtos?.filter((p) => p.quantidade <= p.quantidade_minima).length || 0
    const valorEstoque =
      produtos?.reduce(
        (acc, p) => acc + Number(p.quantidade) * Number(p.preco_unitario),
        0,
      ) || 0
    const notasPendentes =
      notas?.filter((n) => n.status === 'pendente').length || 0
    const notasAgendadas =
      notas?.filter((n) => n.status === 'agendada').length || 0
    const entradasHoje = movs?.filter((m) => m.tipo === 'entrada').length || 0
    const saidasHoje = movs?.filter((m) => m.tipo === 'saida').length || 0

    setResumo({
      totalProdutos,
      abaixoMinimo,
      valorEstoque,
      notasPendentes,
      notasAgendadas,
      entradasHoje,
      saidasHoje,
    })
    setLoading(false)
  }

  const saudacao = () => {
    const hora = new Date().getHours()
    if (hora < 12) return 'Bom dia'
    if (hora < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const nomeUsuario = user?.email?.split('@')[0] || 'usuário'

  const modulos = [
    {
      titulo: 'Inventário',
      descricao:
        'Visualize o estoque atual, alertas de mínimo e imprima o mapa cego.',
      icon: <ClipboardList size={28} />,
      cor: 'bg-blue-600',
      corClaro: 'bg-blue-50',
      corTexto: 'text-blue-600',
      rota: '/inventario',
    },
    {
      titulo: 'Produtos',
      descricao: 'Cadastre, edite e consulte todos os produtos do estoque.',
      icon: <Package size={28} />,
      cor: 'bg-indigo-600',
      corClaro: 'bg-indigo-50',
      corTexto: 'text-indigo-600',
      rota: '/produtos',
    },
    {
      titulo: 'Notas Fiscais',
      descricao:
        'Importe XMLs de entrada e saída e gerencie o estoque automaticamente.',
      icon: <FileText size={28} />,
      cor: 'bg-green-600',
      corClaro: 'bg-green-50',
      corTexto: 'text-green-600',
      rota: '/notas',
    },
    {
      titulo: 'Relatórios',
      descricao:
        'Consulte movimentações de entrada e saída com filtros por período.',
      icon: <BarChart2 size={28} />,
      cor: 'bg-purple-600',
      corClaro: 'bg-purple-50',
      corTexto: 'text-purple-600',
      rota: '/relatorios',
    },
    {
      titulo: 'Coleta',
      descricao:
        'Gerencie expedições, gere protocolos e consulte o histórico de coletas.',
      icon: <Truck size={28} />,
      cor: 'bg-orange-600',
      corClaro: 'bg-orange-50',
      corTexto: 'text-orange-600',
      rota: '/coleta',
    },
    {
      titulo: 'Auditoria',
      descricao:
        'Acompanhe todas as ações realizadas no sistema por usuário e data.',
      icon: <ShieldCheck size={28} />,
      cor: 'bg-red-600',
      corClaro: 'bg-red-50',
      corTexto: 'text-red-600',
      rota: '/auditoria',
    },
  ]

  return (
    <div className="min-h-full">
      {/* Header de boas-vindas */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm mb-1">{saudacao()},</p>
            <h1 className="text-2xl font-bold capitalize">{nomeUsuario}! 👋</h1>
            <p className="text-blue-200 text-sm mt-1">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="hidden md:block">
            <img
              src="/icon-192.png"
              alt="ELO"
              className="h-16 w-16 rounded-xl opacity-90"
            />
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
          <div className="bg-blue-500 text-white p-2.5 rounded-lg">
            <Package size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Produtos</p>
            <p className="text-xl font-bold text-gray-800">
              {loading ? '...' : resumo.totalProdutos}
            </p>
          </div>
        </div>

        <div
          className={`rounded-xl shadow p-4 flex items-center gap-3 cursor-pointer transition hover:shadow-md ${resumo.abaixoMinimo > 0 ? 'bg-red-50 border border-red-200' : 'bg-white'}`}
          onClick={() => navigate('/inventario')}
        >
          <div
            className={`p-2.5 rounded-lg ${resumo.abaixoMinimo > 0 ? 'bg-red-500' : 'bg-gray-300'} text-white`}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Abaixo do mínimo</p>
            <p
              className={`text-xl font-bold ${resumo.abaixoMinimo > 0 ? 'text-red-600' : 'text-gray-800'}`}
            >
              {loading ? '...' : resumo.abaixoMinimo}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
          <div className="bg-purple-500 text-white p-2.5 rounded-lg">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Valor em estoque</p>
            <p className="text-lg font-bold text-gray-800">
              {loading
                ? '...'
                : resumo.valorEstoque.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
            </p>
          </div>
        </div>

        <div
          className={`rounded-xl shadow p-4 flex items-center gap-3 cursor-pointer transition hover:shadow-md ${resumo.notasPendentes > 0 || resumo.notasAgendadas > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-white'}`}
          onClick={() => navigate('/coleta')}
        >
          <div
            className={`p-2.5 rounded-lg text-white ${resumo.notasAgendadas > 0 ? 'bg-blue-500' : resumo.notasPendentes > 0 ? 'bg-yellow-500' : 'bg-gray-300'}`}
          >
            <Truck size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Coletas pendentes</p>
            <p
              className={`text-xl font-bold ${resumo.notasPendentes > 0 ? 'text-yellow-600' : 'text-gray-800'}`}
            >
              {loading ? '...' : resumo.notasPendentes}
            </p>
            {resumo.notasAgendadas > 0 && (
              <p className="text-xs text-blue-600">
                {resumo.notasAgendadas} agendada(s)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Movimentações de hoje */}
      {(resumo.entradasHoje > 0 || resumo.saidasHoje > 0) && (
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex items-center gap-6">
          <p className="text-sm font-medium text-gray-600">
            Movimentações hoje:
          </p>
          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp size={18} />
            <span className="text-sm font-semibold">
              {resumo.entradasHoje} entrada(s)
            </span>
          </div>
          <div className="flex items-center gap-2 text-orange-600">
            <TrendingDown size={18} />
            <span className="text-sm font-semibold">
              {resumo.saidasHoje} saída(s)
            </span>
          </div>
        </div>
      )}

      {/* Cards dos módulos */}
      <h2 className="text-lg font-bold text-gray-700 mb-4">
        Módulos do sistema
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modulos.map((m) => (
          <div
            key={m.rota}
            onClick={() => navigate(m.rota)}
            className="bg-white rounded-xl shadow p-5 cursor-pointer hover:shadow-lg transition group border border-transparent hover:border-blue-100"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`${m.corClaro} ${m.corTexto} p-3 rounded-xl`}>
                {m.icon}
              </div>
              <ArrowRight
                size={18}
                className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"
              />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">{m.titulo}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              {m.descricao}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
