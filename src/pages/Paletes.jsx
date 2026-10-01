import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Truck, Plus, AlertTriangle, Package, History, Edit2, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Paletes() {
  const [saldo, setSaldo] = useState([])
  const [valesRecentes, setValesRecentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [valeParaExcluir, setValeParaExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('saldo_paletes')
        .select('*')
        .order('transportadora', { ascending: true })
      
      if (error) throw error
      
      const saldoFiltrado = (data || []).filter(item => item.saldo_devedor !== 0)
      setSaldo(saldoFiltrado)

      // Carregar vales recentes
      const { data: valesData, error: valesError } = await supabase
        .from('vale_palete')
        .select(`
          *,
          transportadoras(nome_fantasia, razao_social),
          tipos_palete(nome, codigo)
        `)
        .order('data_emissao', { ascending: false })
        .limit(10)
      
      if (valesError) throw valesError
      setValesRecentes(valesData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function confirmarExclusao() {
    if (!valeParaExcluir) return
    
    try {
      setExcluindo(true)
      
      const { error } = await supabase
        .from('vale_palete')
        .delete()
        .eq('id', valeParaExcluir.id)
      
      if (error) throw error
      
      setValeParaExcluir(null)
      await carregarDados()
    } catch (err) {
      setError(err.message)
    } finally {
      setExcluindo(false)
    }
  }

  function formatarData(data) {
    return new Date(data).toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando saldo de paletes...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Erro ao carregar dados: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Controle of Paletes</h1>
          <p className="text-gray-500 mt-1">Saldo devedor de paletes por transportadora</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/paletes/movimentacoes"
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
          >
            <History size={20} />
            Histórico
          </Link>
          <Link
            to="/paletes/novo"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Novo Vale Palete
          </Link>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Truck className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Transportadoras com saldo</p>
              <p className="text-2xl font-bold text-gray-800">{saldo.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de paletes devidos</p>
              <p className="text-2xl font-bold text-gray-800">
                {saldo.reduce((acc, item) => acc + item.saldo_devedor, 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Package className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tipos de palete</p>
              <p className="text-2xl font-bold text-gray-800">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de saldo */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Saldo Devedor por Transportadora</h2>
        </div>
        
        {saldo.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Nenhuma transportadora com saldo devedor de paletes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transportadora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de Palete</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo Devedor</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {saldo.map((item) => (
                  <tr key={`${item.transportadora_id}-${item.tipo_palete_id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-800">{item.transportadora}</td>
                    <td className="px-6 py-4 text-gray-600">{item.tipo_palete}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${item.saldo_devedor > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.saldo_devedor > 0 ? '+' : ''}{item.saldo_devedor}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.saldo_devedor > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Devendo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vales Recentes */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Vales Recentes</h2>
        </div>
        
        {valesRecentes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Nenhum vale emitido ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Vale</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transportadora</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conferente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qtd</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {valesRecentes.map((vale) => (
                  <tr key={vale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-blue-600">
                      {vale.numero}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatarData(vale.data_emissao)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {vale.transportadoras?.nome_fantasia || vale.transportadoras?.razao_social}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {vale.motorista}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        vale.tipo_movimentacao === 'RETIRADA'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {vale.tipo_movimentacao === 'RETIRADA' ? 'Retirada' : 'Devolução'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      {vale.quantidade}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        vale.status === 'ASSINADO'
                          ? 'bg-green-100 text-green-800'
                          : vale.status === 'CANCELADO'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {vale.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to={`/paletes/editar/${vale.id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </Link>
                        <button
                          onClick={() => setValeParaExcluir(vale)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      {valeParaExcluir && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Confirmar Exclusão</h2>
              <button
                onClick={() => setValeParaExcluir(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o vale <strong>{valeParaExcluir.numero}</strong>?
              <br />Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setValeParaExcluir(null)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                disabled={excluindo}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
