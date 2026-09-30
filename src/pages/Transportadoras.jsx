import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, Trash2, Truck, X, Save } from 'lucide-react'

export default function Transportadoras() {
  const [transportadoras, setTransportadoras] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    telefone: '',
    email: '',
  })

  useEffect(() => {
    carregarTransportadoras()
  }, [])

  async function carregarTransportadoras() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('transportadoras')
        .select('*')
        .order('nome_fantasia', { ascending: true })

      if (error) throw error
      setTransportadoras(data || [])
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

  function abrirNova() {
    setForm({
      cnpj: '',
      razao_social: '',
      nome_fantasia: '',
      telefone: '',
      email: '',
    })
    setEditingId(null)
    setShowForm(true)
    setError(null)
    setSuccess(false)
  }

  function abrirEdicao(t) {
    setForm({
      cnpj: t.cnpj,
      razao_social: t.razao_social,
      nome_fantasia: t.nome_fantasia || '',
      telefone: t.telefone || '',
      email: t.email || '',
    })
    setEditingId(t.id)
    setShowForm(true)
    setError(null)
    setSuccess(false)
  }

  function fecharForm() {
    setShowForm(false)
    setEditingId(null)
    setError(null)
    setSuccess(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      if (editingId) {
        // Atualizar
        const { error } = await supabase
          .from('transportadoras')
          .update({
            cnpj: form.cnpj,
            razao_social: form.razao_social,
            nome_fantasia: form.nome_fantasia,
            telefone: form.telefone,
            email: form.email,
          })
          .eq('id', editingId)

        if (error) throw error
        setSuccess('Transportadora atualizada com sucesso!')
      } else {
        // Criar nova
        const { error } = await supabase.from('transportadoras').insert({
          cnpj: form.cnpj,
          razao_social: form.razao_social,
          nome_fantasia: form.nome_fantasia,
          telefone: form.telefone,
          email: form.email,
        })

        if (error) throw error
        setSuccess('Transportadora cadastrada com sucesso!')
      }

      setForm({
        cnpj: '',
        razao_social: '',
        nome_fantasia: '',
        telefone: '',
        email: '',
      })
      setEditingId(null)

      await carregarTransportadoras()

      setTimeout(() => {
        setShowForm(false)
        setSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(t) {
    try {
      const { error } = await supabase
        .from('transportadoras')
        .update({ ativo: !t.ativo })
        .eq('id', t.id)

      if (error) throw error
      await carregarTransportadoras()
    } catch (err) {
      setError(err.message)
    }
  }

  function formatarCNPJ(cnpj) {
    if (!cnpj) return ''
    return cnpj
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transportadoras</h1>
          <p className="text-gray-500 mt-1">
            Cadastro de transportadoras para vale palete
          </p>
        </div>
        <button
          onClick={abrirNova}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Nova Transportadora
        </button>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-600 text-sm">{success}</p>
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">
              {editingId ? 'Editar Transportadora' : 'Nova Transportadora'}
            </h2>
            <button
              onClick={fecharForm}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNPJ *
                </label>
                <input
                  type="text"
                  name="cnpj"
                  value={form.cnpj}
                  onChange={handleChange}
                  required
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  placeholder="(00) 0000-0000"
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razão Social *
              </label>
              <input
                type="text"
                name="razao_social"
                value={form.razao_social}
                onChange={handleChange}
                required
                placeholder="Nome da empresa"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                name="nome_fantasia"
                value={form.nome_fantasia}
                onChange={handleChange}
                placeholder="Nome fantasia (se houver)"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@empresa.com"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={fecharForm}
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
                {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : transportadoras.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Truck size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Nenhuma transportadora cadastrada</p>
            <p className="text-sm mt-1">
              Clique em "Nova Transportadora" para começar
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    CNPJ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Telefone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transportadoras.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm text-gray-600">
                      {formatarCNPJ(t.cnpj)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800">
                        {t.nome_fantasia || t.razao_social}
                      </p>
                      {t.nome_fantasia && (
                        <p className="text-sm text-gray-500">
                          {t.razao_social}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {t.telefone || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {t.email || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleStatus(t)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          t.ativo
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {t.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => abrirEdicao(t)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit2 size={16} />
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
    </div>
  )
}
