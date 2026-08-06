import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Search,
  Package,
} from 'lucide-react'

export default function Relatorios() {
  const [aba, setAba] = useState('movimentacoes')

  // Estados da aba Movimentações
  const [movimentacoes, setMovimentacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // Estados da aba Histórico por Produto
  const [busca, setBusca] = useState('')
  const [sugestoes, setSugestoes] = useState([])
  const [produtoSelecionado, setProdutoSelecionado] = useState(null)
  const [dataInicioHP, setDataInicioHP] = useState('')
  const [dataFimHP, setDataFimHP] = useState('')
  const [historicoItem, setHistoricoItem] = useState([])
  const [loadingHP, setLoadingHP] = useState(false)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    carregarMovimentacoes()
  }, [])

  async function carregarMovimentacoes() {
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

  // Busca produtos pelo código ou descrição
  async function buscarProdutos(termo) {
    if (!termo || termo.length < 1) {
      setSugestoes([])
      return
    }
    setBuscando(true)
    const { data } = await supabase
      .from('produtos')
      .select('id, codigo, descricao, unidade')
      .or(`codigo.ilike.%${termo}%,descricao.ilike.%${termo}%`)
      .limit(8)
    setSugestoes(data || [])
    setBuscando(false)
  }

  function selecionarProduto(produto) {
    setProdutoSelecionado(produto)
    setBusca(`${produto.codigo} — ${produto.descricao}`)
    setSugestoes([])
    setHistoricoItem([])
  }

  async function pesquisarHistorico() {
    if (!produtoSelecionado) return
    setLoadingHP(true)

    let query = supabase
      .from('movimentacoes')
      .select('*, notas_fiscais (numero, serie, fornecedor_destinatario, tipo)')
      .eq('produto_id', produtoSelecionado.id)
      .order('data', { ascending: false })

    if (dataInicioHP) query = query.gte('data', dataInicioHP + 'T00:00:00')
    if (dataFimHP) query = query.lte('data', dataFimHP + 'T23:59:59')

    const { data } = await query
    setHistoricoItem(data || [])
    setLoadingHP(false)
  }

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

  // Totais do histórico por produto
  const totalEntradasHP = historicoItem
    .filter((m) => m.tipo === 'entrada')
    .reduce((acc, m) => acc + Number(m.quantidade), 0)
  const totalSaidasHP = historicoItem
    .filter((m) => m.tipo === 'saida')
    .reduce((acc, m) => acc + Number(m.quantidade), 0)
  const saldoHP = totalEntradasHP - totalSaidasHP

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Relatórios</h1>

      {/* Abas */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setAba('movimentacoes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition
            ${aba === 'movimentacoes' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
        >
          Movimentações
        </button>
        <button
          onClick={() => setAba('historico')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition
            ${aba === 'historico' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
        >
          Histórico por Produto
        </button>
      </div>

      {/* ABA MOVIMENTAÇÕES */}
      {aba === 'movimentacoes' && (
        <>
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
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition
                      ${filtroTipo === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
              <label className="block text-xs text-gray-500 mb-1">
                Data fim
              </label>
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
                          className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${m.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
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
                        className={`px-4 py-3 text-right font-bold
                      ${m.tipo === 'entrada' ? 'text-green-600' : 'text-orange-600'}`}
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
        </>
      )}

      {/* ABA HISTÓRICO POR PRODUTO */}
      {aba === 'historico' && (
        <>
          <div className="bg-white rounded-xl shadow p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Package size={16} />
              Pesquisar produto
            </h2>

            <div className="flex flex-wrap gap-4 items-end">
              {/* Campo de busca com autocomplete */}
              <div className="relative flex-1 min-w-[260px]">
                <label className="block text-xs text-gray-500 mb-1">
                  Código ou descrição do produto
                </label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-2.5 text-gray-400"
                  />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => {
                      setBusca(e.target.value)
                      setProdutoSelecionado(null)
                      setHistoricoItem([])
                      buscarProdutos(e.target.value)
                    }}
                    placeholder="Ex: 181 ou SAB SENADOR..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Dropdown de sugestões */}
                {sugestoes.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {sugestoes.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selecionarProduto(p)}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                      >
                        <span className="font-mono text-blue-600 mr-2">
                          {p.codigo}
                        </span>
                        <span className="text-gray-700">{p.descricao}</span>
                        <span className="text-gray-400 ml-1">
                          ({p.unidade})
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {buscando && (
                  <p className="absolute text-xs text-gray-400 mt-1">
                    Buscando...
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Data início
                </label>
                <input
                  type="date"
                  value={dataInicioHP}
                  onChange={(e) => setDataInicioHP(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Data fim
                </label>
                <input
                  type="date"
                  value={dataFimHP}
                  onChange={(e) => setDataFimHP(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={pesquisarHistorico}
                disabled={!produtoSelecionado || loadingHP}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-40"
              >
                <Search size={16} />
                {loadingHP ? 'Buscando...' : 'Pesquisar'}
              </button>
            </div>

            {produtoSelecionado && (
              <div className="mt-3 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-800">
                Produto selecionado:{' '}
                <strong>
                  {produtoSelecionado.codigo} — {produtoSelecionado.descricao}
                </strong>{' '}
                ({produtoSelecionado.unidade})
              </div>
            )}
          </div>

          {/* Cards de resumo do produto */}
          {historicoItem.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                <div className="bg-green-500 text-white p-3 rounded-lg">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Entradas</p>
                  <p className="text-xl font-bold text-green-600">
                    +{totalEntradasHP}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                <div className="bg-orange-500 text-white p-3 rounded-lg">
                  <TrendingDown size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Saídas</p>
                  <p className="text-xl font-bold text-orange-600">
                    -{totalSaidasHP}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                <div
                  className={`p-3 rounded-lg text-white ${saldoHP >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                >
                  <Package size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Saldo no período</p>
                  <p
                    className={`text-xl font-bold ${saldoHP >= 0 ? 'text-blue-600' : 'text-red-600'}`}
                  >
                    {saldoHP >= 0 ? '+' : ''}
                    {saldoHP}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de histórico */}
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Nota Fiscal</th>
                  <th className="px-4 py-3 text-left">
                    Fornecedor/Destinatário
                  </th>
                  <th className="px-4 py-3 text-right">Quantidade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingHP ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      Buscando...
                    </td>
                  </tr>
                ) : !produtoSelecionado ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      Pesquise um produto acima para ver seu histórico.
                    </td>
                  </tr>
                ) : historicoItem.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      Nenhuma movimentação encontrada para este produto no
                      período.
                    </td>
                  </tr>
                ) : (
                  historicoItem.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(m.data).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${m.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
                        >
                          {m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600">
                        {m.notas_fiscais
                          ? `NF ${m.notas_fiscais.numero}/${m.notas_fiscais.serie || '1'} (${m.notas_fiscais.tipo === 'entrada' ? 'Entrada' : 'Saída'})`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                        {m.notas_fiscais?.fornecedor_destinatario || '-'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold text-lg
                      ${m.tipo === 'entrada' ? 'text-green-600' : 'text-orange-600'}`}
                      >
                        {m.tipo === 'entrada' ? '+' : '-'}
                        {m.quantidade}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
