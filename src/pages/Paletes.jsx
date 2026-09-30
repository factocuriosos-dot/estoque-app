import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Truck, Plus, AlertTriangle, Package, History } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Paletes() {
  const [saldo, setSaldo] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
    </div>
  )
}
