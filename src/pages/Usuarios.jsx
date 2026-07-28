import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { registrarLog } from '../lib/log'
import { UserPlus, Trash2, X, Check, ShieldCheck, User } from 'lucide-react'

const vazio = { nome: '', email: '', senha: '', perfil: 'operador' }

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(vazio)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('usuarios_perfil')
      .select('*')
      .order('criado_em')
    setUsuarios(data || [])
    setLoading(false)
  }

  async function salvar() {
    if (!form.nome || !form.email || !form.senha) {
      setErro('Nome, e-mail e senha são obrigatórios.')
      return
    }
    if (form.senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setSalvando(true)
    setErro('')

    // Criar usuário no Supabase Auth via API
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: form.email,
          password: form.senha,
          email_confirm: true,
        }),
      },
    )

    const resultado = await response.json()

    if (!response.ok || resultado.error) {
      setErro(
        resultado.error?.message ||
          resultado.msg ||
          'Erro ao criar usuário. E-mail já existe?',
      )
      setSalvando(false)
      return
    }

    // Salvar perfil na tabela usuarios_perfil
    const { error: erroPerfil } = await supabase
      .from('usuarios_perfil')
      .insert({
        user_id: resultado.id,
        nome: form.nome,
        perfil: form.perfil,
      })

    if (erroPerfil) {
      setErro(
        'Usuário criado mas erro ao salvar perfil. Contate o administrador.',
      )
      setSalvando(false)
      return
    }

    await registrarLog(
      'criou',
      'usuario',
      `Criou usuário ${form.nome} (${form.email}) com perfil ${form.perfil}`,
    )

    setSalvando(false)
    setModal(false)
    setForm(vazio)
    carregar()
  }

  async function alterarPerfil(usuario, novoPerfil) {
    await supabase
      .from('usuarios_perfil')
      .update({ perfil: novoPerfil })
      .eq('id', usuario.id)
    await registrarLog(
      'editou',
      'usuario',
      `Alterou perfil de ${usuario.nome} para ${novoPerfil}`,
      usuario.id,
    )
    carregar()
  }

  async function excluir(usuario) {
    if (!confirm(`Deseja remover o usuário ${usuario.nome}?`)) return
    await supabase.from('usuarios_perfil').delete().eq('id', usuario.id)
    await registrarLog(
      'excluiu',
      'usuario',
      `Removeu usuário ${usuario.nome}`,
      usuario.id,
    )
    carregar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
        <button
          onClick={() => {
            setForm(vazio)
            setErro('')
            setModal(true)
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <UserPlus size={18} />
          Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">Perfil</th>
              <th className="px-4 py-3 text-left">Cadastrado em</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-full ${u.perfil === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}
                      >
                        {u.perfil === 'admin' ? (
                          <ShieldCheck size={16} />
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                      <span className="font-medium">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.perfil}
                      onChange={(e) => alterarPerfil(u, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full font-semibold border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500
                      ${u.perfil === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
                    >
                      <option value="admin">Administrador</option>
                      <option value="operador">Operador</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => excluir(u)}
                      className="text-red-500 hover:text-red-700"
                      title="Remover usuário"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Aviso sobre permissões */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Perfis de acesso:</strong>
        <ul className="mt-1 ml-4 list-disc">
          <li>
            <strong>Administrador</strong> — acesso completo a todas as telas,
            incluindo Usuários e Auditoria
          </li>
          <li>
            <strong>Operador</strong> — acesso ao Inventário, Produtos, Notas
            Fiscais, Relatórios e Coleta
          </li>
        </ul>
      </div>

      {/* Modal novo usuário */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg">Novo Usuário</h2>
              <button onClick={() => setModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome *
                </label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: João Silva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: joao@empresa.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha *
                </label>
                <input
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil
                </label>
                <select
                  value={form.perfil}
                  onChange={(e) => setForm({ ...form, perfil: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="operador">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {erro && <p className="text-red-500 text-sm">{erro}</p>}
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Check size={18} />
                {salvando ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
