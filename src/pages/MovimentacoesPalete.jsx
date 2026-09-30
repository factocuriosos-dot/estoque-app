import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowLeft, FileText, Truck, Package, Calendar, Printer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ValePaletePrint from '../components/ValePaletePrint'

export default function MovimentacoesPalete() {
  const navigate = useNavigate()
  const [movimentacoes, setMovimentacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [valeParaImprimir, setValeParaImprimir] = useState(null)
  const [filtro, setFiltro] = useState({
    transportadora_id: '',
    tipo_movimentacao: '',
    data_inicio: '',
    data_fim: '',
  })
  const [transportadoras, setTransportadoras] = useState([])

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    carregarMovimentacoes()
  }, [filtro])

  async function carregarDados() {
    try {
      const { data, error } = await supabase
        .from('transportadoras')
        .select('*')
        .eq('ativo', true)
        .order('nome_fantasia', { ascending: true })
      
      if (error) throw error
      setTransportadoras(data || [])
    } catch (err) {
      console.error(err)
    }
  }

  async function carregarMovimentacoes() {
    try {
      setLoading(true)
      
      let query = supabase
        .from('vale_palete')
        .select(`
          *,
          transportadoras(nome_fantasia, razao_social),
          tipos_palete(nome, codigo)
        `)
        .order('data_emissao', { ascending: false })

      // Aplicar filtros
      if (filtro.transportadora_id) {
        query = query.eq('transportadora_id', filtro.transportadora_id)
      }
      if (filtro.tipo_movimentacao) {
        query = query.eq('tipo_movimentacao', filtro.tipo_movimentacao)
      }
      if (filtro.data_inicio) {
        query = query.gte('data_emissao', filtro.data_inicio)
      }
      if (filtro.data_fim) {
        query = query.lte('data_emissao', filtro.data_fim + 'T23:59:59')
      }

      const { data, error } = await query

      if (error) throw error
      setMovimentacoes(data || [])
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

  function limparFiltros() {
    setFiltro({
      transportadora_id: '',
      tipo_movimentacao: '',
      data_inicio: '',
      data_fim: '',
    })
  }

  function formatarData(data) {
    return new Date(data).toLocaleString('pt-BR')
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
          <h1 className="text-2xl font-bold text-gray-800">Histórico de Movimentações</h1>
          <p className="text-gray-500 mt-1">Todos os vales palete emitidos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transportadora
            </label>
            <select
              name="transportadora_id"
              value={filtro.transportadora_id}
              onChange={handleFiltroChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {transportadoras.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome_fantasia || t.razao_social}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              name="tipo_movimentacao"
              value={filtro.tipo_movimentacao}
              onChange={handleFiltroChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="RETIRADA">Retirada</option>
              <option value="DEVOLUCAO">Devolução</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              name="data_inicio"
              value={filtro.data_inicio}
              onChange={handleFiltroChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              name="data_fim"
              value={filtro.data_fim}
              onChange={handleFiltroChange}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={limparFiltros}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Lista de movimentações */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">Erro: {error}</div>
        ) : movimentacoes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Nenhuma movimentação encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Vale</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transportadora</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motorista</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qtd</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movimentacoes.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-blue-600">
                      {mov.numero}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatarData(mov.data_emissao)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {mov.transportadoras?.nome_fantasia || mov.transportadoras?.razao_social}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {mov.motorista}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        mov.tipo_movimentacao === 'RETIRADA'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {mov.tipo_movimentacao === 'RETIRADA' ? 'Retirada' : 'Devolução'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      {mov.quantidade}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        mov.status === 'ASSINADO'
                          ? 'bg-green-100 text-green-800'
                          : mov.status === 'CANCELADO'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {mov.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setValeParaImprimir(mov)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Imprimir"
                      >
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de impressão */}
      {valeParaImprimir && (
        <ValePaletePrint
          vale={valeParaImprimir}
          onClose={() => setValeParaImprimir(null)}
        />
      )}
    </div>
  )
}
