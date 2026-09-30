import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, FileText, TrendingUp, TrendingDown, Package, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function RelatoriosPaletes() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState({
    data_inicio: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
  })
  const [dados, setDados] = useState({
    totalRetiradas: 0,
    totalDevolucoes: 0,
    saldo: 0,
    porTransportadora: [],
    porTipoPalete: [],
    porDia: [],
  })

  useEffect(() => {
    carregarDados()
  }, [filtro])

  async function carregarDados() {
    try {
      setLoading(true)
      setError(null)

      // Buscar movimentações do período
      const { data: movimentacoes, error: movError } = await supabase
        .from('vale_palete')
        .select(`
          *,
          transportadoras(nome_fantasia, razao_social, cnpj),
          tipos_palete(nome, codigo)
        `)
        .gte('data_emissao', filtro.data_inicio)
        .lte('data_emissao', filtro.data_fim + 'T23:59:59')
        .neq('status', 'CANCELADO')

      if (movError) throw movError

      // Calcular totais
      const totalRetiradas = movimentacoes
        .filter(m => m.tipo_movimentacao === 'RETIRADA')
        .reduce((acc, m) => acc + m.quantidade, 0)

      const totalDevolucoes = movimentacoes
        .filter(m => m.tipo_movimentacao === 'DEVOLUCAO')
        .reduce((acc, m) => acc + m.quantidade, 0)

      const saldo = totalRetiradas - totalDevolucoes

      // Agrupar por transportadora
      const porTransportadora = {}
      movimentacoes.forEach(m => {
        const nome = m.transportadoras?.nome_fantasia || m.transportadoras?.razao_social || 'Sem nome'
        const cnpj = m.transportadoras?.cnpj || '-'
        if (!porTransportadora[nome]) {
          porTransportadora[nome] = { cnpj, retiradas: 0, devolucoes: 0, total: 0 }
        }
        if (m.tipo_movimentacao === 'RETIRADA') {
          porTransportadora[nome].retiradas += m.quantidade
        } else {
          porTransportadora[nome].devolucoes += m.quantidade
        }
        porTransportadora[nome].total = porTransportadora[nome].retiradas - porTransportadora[nome].devolucoes
      })

      // Agrupar por tipo de palete
      const porTipoPalete = {}
      movimentacoes.forEach(m => {
        const nome = m.tipos_palete?.nome || 'Sem tipo'
        if (!porTipoPalete[nome]) {
          porTipoPalete[nome] = { retiradas: 0, devolucoes: 0, total: 0 }
        }
        if (m.tipo_movimentacao === 'RETIRADA') {
          porTipoPalete[nome].retiradas += m.quantidade
        } else {
          porTipoPalete[nome].devolucoes += m.quantidade
        }
        porTipoPalete[nome].total = porTipoPalete[nome].retiradas - porTipoPalete[nome].devolucoes
      })

      // Agrupar por dia
      const porDia = {}
      movimentacoes.forEach(m => {
        const dia = m.data_emissao.split('T')[0]
        if (!porDia[dia]) {
          porDia[dia] = { retiradas: 0, devolucoes: 0 }
        }
        if (m.tipo_movimentacao === 'RETIRADA') {
          porDia[dia].retiradas += m.quantidade
        } else {
          porDia[dia].devolucoes += m.quantidade
        }
      })

      setDados({
        totalRetiradas,
        totalDevolucoes,
        saldo,
        porTransportadora: Object.entries(porTransportadora).map(([nome, valores]) => ({ nome, ...valores })),
        porTipoPalete: Object.entries(porTipoPalete).map(([nome, valores]) => ({ nome, ...valores })),
        porDia: Object.entries(porDia).map(([data, valores]) => ({ data, ...valores })).sort((a, b) => a.data.localeCompare(b.data)),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleFiltroChange(e) {
    const { name, value } = e.target
    setFiltro(prev => ({ ...prev, [name]: value }))
  }

  function formatarData(data) {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/paletes')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatórios de Paletes</h1>
          <p className="text-gray-500 mt-1">Análise de movimentação de paletes por período</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
            <input
              type="date"
              name="data_inicio"
              value={filtro.data_inicio}
              onChange={handleFiltroChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              name="data_fim"
              value={filtro.data_fim}
              onChange={handleFiltroChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Carregando relatório...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Erro: {error}</p>
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <TrendingUp className="text-orange-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Retiradas</p>
                  <p className="text-2xl font-bold text-gray-800">{dados.totalRetiradas}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <TrendingDown className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Devoluções</p>
                  <p className="text-2xl font-bold text-gray-800">{dados.totalDevolucoes}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${dados.saldo >= 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                  <Package className={dados.saldo >= 0 ? 'text-red-600' : 'text-green-600'} size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Saldo (Retiradas - Devoluções)</p>
                  <p className={`text-2xl font-bold ${dados.saldo >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {dados.saldo}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela por Transportadora */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">Movimentação por Transportadora</h2>
            </div>
            {dados.porTransportadora.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Nenhuma movimentação no período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transportadora</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNPJ</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Retiradas</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Devoluções</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dados.porTransportadora.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{item.nome}</td>
                        <td className="px-6 py-4 font-mono text-sm text-gray-600">{item.cnpj || '-'}</td>
                        <td className="px-6 py-4 text-center text-orange-600 font-medium">{item.retiradas}</td>
                        <td className="px-6 py-4 text-center text-green-600 font-medium">{item.devolucoes}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-bold ${item.total > 0 ? 'text-red-600' : item.total < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {item.total > 0 ? '+' : ''}{item.total}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabela por Tipo de Palete */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">Movimentação por Tipo de Palete</h2>
            </div>
            {dados.porTipoPalete.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Nenhuma movimentação no período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de Palete</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Retiradas</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Devoluções</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dados.porTipoPalete.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{item.nome}</td>
                        <td className="px-6 py-4 text-center text-orange-600 font-medium">{item.retiradas}</td>
                        <td className="px-6 py-4 text-center text-green-600 font-medium">{item.devolucoes}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-bold ${item.total > 0 ? 'text-red-600' : item.total < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {item.total > 0 ? '+' : ''}{item.total}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabela por Dia */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">Movimentação por Dia</h2>
            </div>
            {dados.porDia.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Nenhuma movimentação no período</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Retiradas</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Devoluções</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Saldo do Dia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dados.porDia.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-800">{formatarData(item.data)}</td>
                        <td className="px-6 py-4 text-center text-orange-600 font-medium">{item.retiradas}</td>
                        <td className="px-6 py-4 text-center text-green-600 font-medium">{item.devolucoes}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-bold ${item.retiradas - item.devolucoes > 0 ? 'text-red-600' : item.retiradas - item.devolucoes < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {item.retiradas - item.devolucoes > 0 ? '+' : ''}{item.retiradas - item.devolucoes}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
