import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { registrarLog } from '../lib/log'
import {
  PackagePlus,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Package,
} from 'lucide-react'

export default function Devolucoes() {
  const navigate = useNavigate()

  const [produtos, setProdutos] = useState<any[]>([])
  const [devolucoes, setDevolucoes] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  const [numero, setNumero] = useState('')
  const [serie, setSerie] = useState('')
  const [transportadora, setTransportadora] = useState('')
  const [cliente, setCliente] = useState('')
  const [dataEmissao, setDataEmissao] = useState(
    new Date().toISOString().split('T')[0],
  )
  const [observacao, setObservacao] = useState('')

  const [itens, setItens] = useState([
    {
      codigo: '',
      descricao: '',
      unidade: 'UN',
      quantidade: 1,
      preco_unitario: 0,
    },
  ])

  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<any>(null)

  async function carregar() {
    setCarregando(true)
    const [{ data: prods }, { data: devs }] = await Promise.all([
      supabase.from('produtos').select('*').order('descricao'),
      supabase
        .from('notas_fiscais')
        .select('*')
        .eq('tipo', 'entrada')
        .eq('status', 'devolucao')
        .order('data_emissao', { ascending: false })
        .limit(30),
    ])
    setProdutos(prods || [])
    setDevolucoes(devs || [])
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  function atualizarItem(index: number, campo: string, valor: string) {
    setItens((prev) => {
      const novo = prev.map((it, i) =>
        i === index ? { ...it, [campo]: valor } : it,
      )
      if (campo === 'codigo') {
        const p = produtos.find((x) => x.codigo === valor.trim())
        if (p) {
          novo[index] = {
            ...novo[index],
            descricao: p.descricao,
            unidade: p.unidade,
            preco_unitario: p.preco_unitario || 0,
          }
        }
      }
      return novo
    })
  }

  function adicionarItem() {
    setItens((prev) => [
      ...prev,
      {
        codigo: '',
        descricao: '',
        unidade: 'UN',
        quantidade: 1,
        preco_unitario: 0,
      },
    ])
  }

  function removerItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index))
  }

  const saldoDe = (codigo: string) => {
    const p = produtos.find((x) => x.codigo === codigo.trim())
    return p ? Number(p.quantidade) : null
  }

  const itensValidos = itens.filter(
    (it) => it.codigo.trim() && Number(it.quantidade) > 0,
  )
  const totalValor = itensValidos.reduce(
    (acc, it) => acc + Number(it.quantidade) * Number(it.preco_unitario || 0),
    0,
  )

  async function concluir() {
    if (!numero.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o Nº da nota de devolução.' })
      return
    }
    if (itensValidos.length === 0) {
      setMensagem({
        tipo: 'erro',
        texto:
          'Adicione pelo menos um item com código e quantidade maior que zero.',
      })
      return
    }
    if (
      new Set(itensValidos.map((it) => it.codigo.trim())).size !==
      itensValidos.length
    ) {
      setMensagem({
        tipo: 'erro',
        texto: 'Há itens com código de produto repetido.',
      })
      return
    }

    setSalvando(true)
    setMensagem(null)

    const { data: nota, error: erroNota } = await supabase
      .from('notas_fiscais')
      .insert({
        numero: numero.trim(),
        serie: serie.trim() || null,
        tipo: 'entrada',
        status: 'devolucao',
        fornecedor_destinatario: cliente.trim() || null,
        transportadora: transportadora.trim() || null,
        data_emissao: dataEmissao || null,
        valor_total: totalValor,
        observacao: observacao.trim() || null,
      })
      .select()
      .single()

    if (erroNota) {
      setMensagem({
        tipo: 'erro',
        texto: 'Erro ao salvar a nota: ' + erroNota.message,
      })
      setSalvando(false)
      return
    }

    const erros: string[] = []
    let qtdItens = 0

    for (const item of itensValidos) {
      const { data: prodArr } = await supabase
        .from('produtos')
        .select('*')
        .eq('codigo', item.codigo.trim())
      let produto = prodArr?.[0] || null

      if (!produto) {
        const { data: novo, error: erroCriar } = await supabase
          .from('produtos')
          .insert({
            codigo: item.codigo.trim(),
            descricao: item.descricao.trim() || item.codigo.trim(),
            unidade: item.unidade,
            quantidade: 0,
            preco_unitario: Number(item.preco_unitario) || 0,
          })
          .select()
          .single()
        if (erroCriar || !novo) {
          erros.push(item.codigo.trim())
          continue
        }
        produto = novo
      }

      if (!produto) {
        erros.push(item.codigo.trim())
        continue
      }

      qtdItens++

      const precoUnit =
        Number(item.preco_unitario) || produto.preco_unitario || 0
      const qtd = Number(item.quantidade)

      await supabase.from('nota_itens').insert({
        nota_id: nota.id,
        produto_id: produto.id,
        codigo_produto: item.codigo.trim(),
        descricao: item.descricao.trim() || produto.descricao,
        quantidade: qtd,
        unidade: item.unidade,
        preco_unitario: precoUnit,
        preco_total: qtd * precoUnit,
      })

      await supabase
        .from('produtos')
        .update({ quantidade: produto.quantidade + qtd })
        .eq('id', produto.id)

      await supabase.from('movimentacoes').insert({
        produto_id: produto.id,
        nota_id: nota.id,
        tipo: 'entrada',
        quantidade: qtd,
      })
    }

    await registrarLog(
      'registrou devolução',
      'nota_fiscal',
      `Registrou nota de devolução ${numero.trim()} com ${qtdItens} item(ns) — estoque atualizado (entrada)`,
      nota.id,
    )

    setSalvando(false)

    if (erros.length > 0) {
      setMensagem({
        tipo: 'erro',
        texto: `Nota salva, mas houve erro nos itens: ${erros.join(', ')}. Estoque atualizado para ${qtdItens} item(ns).`,
      })
    } else {
      setMensagem({
        tipo: 'ok',
        texto: `Devolução ${numero.trim()} registrada! Estoque atualizado com ${qtdItens} item(ns).`,
      })
    }

    setNumero('')
    setSerie('')
    setTransportadora('')
    setCliente('')
    setObservacao('')
    setDataEmissao(new Date().toISOString().split('T')[0])
    setItens([
      {
        codigo: '',
        descricao: '',
        unidade: 'UN',
        quantidade: 1,
        preco_unitario: 0,
      },
    ])
    carregar()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <PackagePlus className="text-teal-600" size={26} />
          Devoluções
        </h1>
        <div className="w-24" />
      </div>

      {mensagem && (
        <div
          className={`mb-4 rounded-xl p-4 flex items-center gap-2 text-sm font-medium ${
            mensagem.tipo === 'ok'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {mensagem.tipo === 'ok' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          {mensagem.texto}
        </div>
      )}

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="font-bold text-gray-700 mb-4">
          Registrar nota de devolução
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Nº da nota *
            </label>
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Série</label>
            <input
              type="text"
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Data de emissão
            </label>
            <input
              type="date"
              value={dataEmissao}
              onChange={(e) => setDataEmissao(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Transportadora
            </label>
            <input
              type="text"
              value={transportadora}
              onChange={(e) => setTransportadora(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Cliente / Fornecedor
            </label>
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Observação
            </label>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Itens */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Itens</h3>
            <button
              onClick={adicionarItem}
              className="flex items-center gap-1 text-sm bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition"
            >
              <Plus size={16} /> Adicionar item
            </button>
          </div>

          <datalist id="devolucoes-produtos">
            {produtos.map((p) => (
              <option
                key={p.id}
                value={p.codigo}
                label={`${p.codigo} — ${p.descricao}`}
              />
            ))}
          </datalist>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Código *</th>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Un.</th>
                  <th className="px-3 py-2 text-left">Qtd. *</th>
                  <th className="px-3 py-2 text-left">Valor unit.</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itens.map((item, index) => {
                  const saldo = saldoDe(item.codigo)
                  const totalLinha =
                    Number(item.quantidade) * Number(item.preco_unitario || 0)
                  return (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <input
                          list="devolucoes-produtos"
                          type="text"
                          value={item.codigo}
                          onChange={(e) =>
                            atualizarItem(index, 'codigo', e.target.value)
                          }
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <div className="text-xs text-gray-400 mt-0.5">
                          {saldo !== null
                            ? `Saldo atual: ${saldo}`
                            : item.codigo.trim() && 'Produto novo'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) =>
                            atualizarItem(index, 'descricao', e.target.value)
                          }
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.unidade}
                          onChange={(e) =>
                            atualizarItem(index, 'unidade', e.target.value)
                          }
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          {['UN', 'CX', 'KG', 'LT', 'PC', 'PR', 'MT', 'GL'].map(
                            (u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ),
                          )}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantidade}
                          onChange={(e) =>
                            atualizarItem(index, 'quantidade', e.target.value)
                          }
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.preco_unitario}
                          onChange={(e) =>
                            atualizarItem(
                              index,
                              'preco_unitario',
                              e.target.value,
                            )
                          }
                          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        {totalLinha.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => removerItem(index)}
                          className="text-gray-300 hover:text-red-500 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {itensValidos.length} item(ns) válido(s)
            </p>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                Total:{' '}
                <strong className="text-lg">
                  {totalValor.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </strong>
              </p>
              <button
                onClick={concluir}
                disabled={salvando}
                className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Concluir devolução'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Devoluções registradas */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Package size={18} className="text-teal-600" />
          <h2 className="font-bold text-gray-700">Devoluções registradas</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Cliente / Fornecedor</th>
              <th className="px-4 py-3 text-left">Transportadora</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-left">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {carregando ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : devolucoes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Nenhuma devolução registrada ainda.
                </td>
              </tr>
            ) : (
              devolucoes.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">
                    {d.numero}
                    {d.serie ? `/${d.serie}` : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {d.data_emissao
                      ? new Date(
                          d.data_emissao + 'T00:00:00',
                        ).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {d.fornecedor_destinatario || '-'}
                  </td>
                  <td className="px-4 py-3">{d.transportadora || '-'}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {Number(d.valor_total || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                    {d.observacao || '-'}
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
