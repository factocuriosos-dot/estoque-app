import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ShieldCheck, Search, Filter } from 'lucide-react'

const corAcao = {
  importou: 'bg-green-100 text-green-700',
  criou: 'bg-blue-100 text-blue-700',
  editou: 'bg-yellow-100 text-yellow-700',
  excluiu: 'bg-red-100 text-red-700',
  agendou: 'bg-purple-100 text-purple-700',
  'confirmou coleta': 'bg-green-100 text-green-700',
  'reverteu para pendente': 'bg-gray-100 text-gray-700',
  'gerou relatório': 'bg-blue-100 text-blue-700',
}

export default function Auditoria() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('todos')
  const [filtroAcao, setFiltroAcao] = useState('todas')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('log_atividades')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(500)
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const usuariosUnicos = Array.from(
    new Set(logs.map((l) => l.usuario_email)),
  ).sort()

  const acoesUnicas = Array.from(new Set(logs.map((l) => l.acao))).sort()

  const filtrados = logs.filter((l) => {
    const usuarioOk =
      filtroUsuario === 'todos' || l.usuario_email === filtroUsuario
    const acaoOk = filtroAcao === 'todas' || l.acao === filtroAcao
    const dataRef = l.criado_em?.slice(0, 10)
    const inicioOk = !dataInicio || dataRef >= dataInicio
    const fimOk = !dataFim || dataRef <= dataFim
    const buscaOk =
      !busca ||
      l.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      l.usuario_email?.toLowerCase().includes(busca.toLowerCase())
    return usuarioOk && acaoOk && inicioOk && fimOk && buscaOk
  })

  const limparFiltros = () => {
    setFiltroUsuario('todos')
    setFiltroAcao('todas')
    setDataInicio('')
    setDataFim('')
    setBusca('')
  }

  const temFiltro =
    filtroUsuario !== 'todos' ||
    filtroAcao !== 'todas' ||
    dataInicio ||
    dataFim ||
    busca

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">
            Log de Atividades
          </h1>
          <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
            {filtrados.length} registro(s)
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <ShieldCheck size={20} />
          <span className="text-sm">Trilha de auditoria completa</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-gray-500 mb-1">
            Busca livre
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar na descrição ou usuário..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Usuário</label>
          <select
            value={filtroUsuario}
            onChange={(e) => setFiltroUsuario(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            <option value="todos">Todos os usuários</option>
            {usuariosUnicos.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Ação</label>
          <select
            value={filtroAcao}
            onChange={(e) => setFiltroAcao(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
          >
            <option value="todas">Todas as ações</option>
            {acoesUnicas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Data início
          </label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Data fim</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {temFiltro && (
          <button
            onClick={limparFiltros}
            className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <Filter size={14} />
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Data/Hora</th>
              <th className="px-4 py-3 text-left">Usuário</th>
              <th className="px-4 py-3 text-center">Ação</th>
              <th className="px-4 py-3 text-left">Módulo</th>
              <th className="px-4 py-3 text-left">Descrição</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Nenhuma atividade encontrada.
                </td>
              </tr>
            ) : (
              filtrados.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    <div>
                      {new Date(l.criado_em).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(l.criado_em).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-700">
                      {l.usuario_email}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${corAcao[l.acao] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {l.acao}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">
                    {l.entidade?.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{l.descricao}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
