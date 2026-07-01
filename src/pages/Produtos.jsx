import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { registrarLog } from '../lib/log'
import { Plus, Search, Pencil, Trash2, X, Check } from 'lucide-react'

const unidades = ['UN', 'CX', 'KG', 'LT', 'MT', 'PC', 'PT', 'FD']

const vazio = {
  codigo: '',
  descricao: '',
  unidade: 'UN',
  quantidade_minima: 0,
  preco_unitario: 0,
}

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(vazio)
  const [editId, setEditId] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .order('descricao')
    setProdutos(data || [])
    setLoading(false)
  }

  const filtrados = produtos.filter(
    (p) =>
      p.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busca.toLowerCase()),
  )

  function abrirNovo() {
    setForm(vazio)
    setEditId(null)
    setErro('')
    setModal(true)
  }

  function abrirEditar(p) {
    setForm({
      codigo: p.codigo,
      descricao: p.descricao,
      unidade: p.unidade,
      quantidade_minima: p.quantidade_minima,
      preco_unitario: p.preco_unitario,
    })
    setEditId(p.id)
    setErro('')
    setModal(true)
  }

  async function salvar() {
    if (!form.codigo || !form.descricao) {
      setErro('Código e descrição são obrigatórios.')
      return
    }
    setSalvando(true)
    setErro('')

    if (editId) {
      const { error } = await supabase
        .from('produtos')
        .update(form)
        .eq('id', editId)
      if (error) {
        setErro('Erro ao salvar. Código já existe?')
        setSalvando(false)
        return
      }
      await registrarLog(
        'editou',
        'produto',
        `Editou produto ${form.codigo} — ${form.descricao}`,
        editId,
      )
    } else {
      const { data: novo, error } = await supabase
        .from('produtos')
        .insert(form)
        .select()
        .single()
      if (error) {
        setErro('Erro ao salvar. Código já existe?')
        setSalvando(false)
        return
      }
      await registrarLog(
        'criou',
        'produto',
        `Cadastrou produto ${form.codigo} — ${form.descricao}`,
        novo?.id,
      )
    }

    setSalvando(false)
    setModal(false)
    carregar()
  }

  async function excluir(id) {
    if (!confirm('Deseja excluir este produto?')) return
    const produto = produtos.find((p) => p.id === id)
    await supabase.from('produtos').delete().eq('id', id)
    await registrarLog(
      'excluiu',
      'produto',
      `Excluiu produto ${produto?.codigo} — ${produto?.descricao}`,
      id,
    )
    carregar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por código ou descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-center">UN</th>
              <th className="px-4 py-3 text-right">Estoque</th>
              <th className="px-4 py-3 text-right">Mín.</th>
              <th className="px-4 py-3 text-right">Preço</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{p.codigo}</td>
                  <td className="px-4 py-3">{p.descricao}</td>
                  <td className="px-4 py-3 text-center">{p.unidade}</td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${p.quantidade <= p.quantidade_minima ? 'text-red-500' : 'text-green-600'}`}
                  >
                    {p.quantidade}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {p.quantidade_minima}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {Number(p.preco_unitario).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => abrirEditar(p)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => excluir(p.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg">
                {editId ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button onClick={() => setModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição *
                </label>
                <input
                  value={form.descricao}
                  onChange={(e) =>
                    setForm({ ...form, descricao: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Parafuso M8"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidade
                  </label>
                  <select
                    value={form.unidade}
                    onChange={(e) =>
                      setForm({ ...form, unidade: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {unidades.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estoque mínimo
                  </label>
                  <input
                    type="number"
                    value={form.quantidade_minima}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quantidade_minima: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço unitário
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.preco_unitario}
                  onChange={(e) =>
                    setForm({ ...form, preco_unitario: Number(e.target.value) })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {erro && <p className="text-red-500 text-sm">{erro}</p>}
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Check size={18} />
                {salvando ? 'Salvando...' : 'Salvar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
