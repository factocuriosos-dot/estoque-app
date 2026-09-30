import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Truck, FileText } from 'lucide-react'

export default function ValePalete() {
  const navigate = useNavigate()
  const [transportadoras, setTransportadoras] = useState([])
  const [tiposPalete, setTiposPalete] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    transportadora_id: '',
    motorista: '',
    placa: '',
    tipo_palete_id: '',
    quantidade: '',
    tipo_movimentacao: 'RETIRADA',
    observacoes: '',
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      setLoading(true)

      const { data: transpData, error: transpError } = await supabase
        .from('transportadoras')
        .select('*')
        .eq('ativo', true)
        .order('nome_fantasia', { ascending: true })

      if (transpError) throw transpError
      setTransportadoras(transpData || [])

      const { data: tiposData, error: tiposError } = await supabase
        .from('tipos_palete')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (tiposError) throw tiposError
      setTiposPalete(tiposData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Gerar número do vale (VP-AAAA-NNNN)
      const ano = new Date().getFullYear()
      const { count } = await supabase
        .from('vale_palete')
        .select('*', { count: 'exact', head: true })

      const numero = `VP-${ano}-${String((count || 0) + 1).padStart(4, '0')}`

      const { error: insertError } = await supabase.from('vale_palete').insert({
        numero,
        transportadora_id: form.transportadora_id,
        motorista: form.motorista,
        placa: form.placa,
        tipo_palete_id: form.tipo_palete_id,
        quantidade: parseInt(form.quantidade),
        tipo_movimentacao: form.tipo_movimentacao,
        observacoes: form.observacoes,
      })

      if (insertError) throw insertError

      setSuccess(true)
      setForm({
        transportadora_id: '',
        motorista: '',
        placa: '',
        tipo_palete_id: '',
        quantidade: '',
        tipo_movimentacao: 'RETIRADA',
        observacoes: '',
      })

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/paletes')
      }, 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/paletes')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Emitir Vale Palete
          </h1>
          <p className="text-gray-500 mt-1">
            Preencha os dados para emitir um novo vale
          </p>
        </div>
      </div>

      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border p-6 space-y-4"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-600 text-sm">
              Vale Palete emitido com sucesso!
            </p>
          </div>
        )}

        {/* Tipo de Movimentação */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Movimentação *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo_movimentacao"
                value="RETIRADA"
                checked={form.tipo_movimentacao === 'RETIRADA'}
                onChange={handleChange}
                className="text-blue-600"
              />
              <span className="text-sm">
                Retirada (transportadora pega paletes)
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo_movimentacao"
                value="DEVOLUCAO"
                checked={form.tipo_movimentacao === 'DEVOLUCAO'}
                onChange={handleChange}
                className="text-blue-600"
              />
              <span className="text-sm">
                Devolução (transportadora devolve paletes)
              </span>
            </label>
          </div>
        </div>

        {/* Transportadora */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transportadora *
          </label>
          <select
            name="transportadora_id"
            value={form.transportadora_id}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecione uma transportadora</option>
            {transportadoras.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome_fantasia || t.razao_social}
              </option>
            ))}
          </select>
        </div>

        {/* Conferente e Placa */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conferente *
            </label>
            <input
              type="text"
              name="motorista"
              value={form.motorista}
              onChange={handleChange}
              required
              placeholder="Nome do conferente"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placa *
            </label>
            <input
              type="text"
              name="placa"
              value={form.placa}
              onChange={handleChange}
              required
              placeholder="ABC-1234"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tipo de Palete e Quantidade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Palete *
            </label>
            <select
              name="tipo_palete_id"
              value={form.tipo_palete_id}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione o tipo</option>
              {tiposPalete.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantidade *
            </label>
            <input
              type="number"
              name="quantidade"
              value={form.quantidade}
              onChange={handleChange}
              required
              min="1"
              placeholder="0"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observações
          </label>
          <textarea
            name="observacoes"
            value={form.observacoes}
            onChange={handleChange}
            rows={3}
            placeholder="Observações sobre a movimentação..."
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/paletes')}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Emitir Vale Palete'}
          </button>
        </div>
      </form>
    </div>
  )
}
