import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, TrendingUp, TrendingDown } from 'lucide-react'

export default function Relatorios() {
  const [movimentacoes, setMovimentacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('movimentacoes')
      .select(
        '*, produtos (codigo, descricao, unidade), notas_fiscais (numero, serie, fornecedor_destinatario)',
      )
      .order('data', { ascending: false })
    setMovimentacoes(data || [])
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtradas = movimentacoes.filter((m) => {
    const tipoOk = filtroTipo === 'todos' || m.tipo === filtroTipo
    const dataOk =
      (!dataInicio || m.data >= dataInicio) &&
      (!dataFim || m.data <= dataFim + 'T23:59:59')
    return tipoOk && dataOk
  })

  const totalEntradas = filtradas
    .filter((m) => m.tipo === 'entrada')
    .reduce((acc, m) => acc + Number(m.quantidade), 0)
  const totalSaidas = filtradas
    .filter((m) => m.tipo === 'saida')
    .reduce((acc, m) => acc + Number(m.quantidade), 0)
  const totalNotas = new Set(filtradas.map((m) => m.nota_id)).size

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Relatórios</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
          <div className="bg-green-500 text-white p-3 rounded-lg">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Entradas</p>
            <p className="text-xl font-bold text-gray-800">
              {totalEntradas} itens
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
          <div className="bg-orange-500 text-white p-3 rounded-lg">
            <TrendingDown size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Saídas</p>
            <p className="text-xl font-bold text-gray-800">
              {totalSaidas} itens
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
          <div className="bg-blue-500 text-white p-3 rounded-lg">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Notas no período</p>
            <p className="text-xl font-bold text-gray-800">{totalNotas}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <div className="flex gap-2">
            {['todos', 'entrada', 'saida'].map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filtroTipo === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {t === 'todos'
                  ? 'Todos'
                  : t === 'entrada'
                    ? 'Entradas'
                    : 'Saídas'}
              </button>
            ))}
          </div>
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
        {(dataInicio || dataFim || filtroTipo !== 'todos') && (
          <button
            onClick={() => {
              setDataInicio('')
              setDataFim('')
              setFiltroTipo('todos')
            }}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Limpar filtros
          </button>
        )}
      </div>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Produto</th>
              <th className="px-4 py-3 text-left">Nota Fiscal</th>
              <th className="px-4 py-3 text-left">Fornecedor/Dest.</th>
              <th className="px-4 py-3 text-right">Quantidade</th>
              <th className="px-4 py-3 text-center">UN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            ) : (
              filtradas.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(m.data).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${m.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
                    >
                      {m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.produtos?.descricao}</p>
                    <p className="text-xs text-gray-400">
                      {m.produtos?.codigo}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">
                    {m.notas_fiscais
                      ? `${m.notas_fiscais.numero}/${m.notas_fiscais.serie || '1'}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {m.notas_fiscais?.fornecedor_destinatario || '-'}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold ${m.tipo === 'entrada' ? 'text-green-600' : 'text-orange-600'}`}
                  >
                    {m.tipo === 'entrada' ? '+' : '-'}
                    {m.quantidade}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {m.produtos?.unidade}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
