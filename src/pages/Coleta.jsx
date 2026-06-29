import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Truck, CheckSquare, Square, Calendar, Printer } from 'lucide-react'

export default function Coleta() {
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selecionadas, setSelecionadas] = useState([])
  const [aba, setAba] = useState('pendente')
  const [processando, setProcessando] = useState(false)

  // Filtros da aba Histórico
  const [filtroTransportadora, setFiltroTransportadora] = useState('todas')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [filtroNumero, setFiltroNumero] = useState('')

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('notas_fiscais')
      .select('*')
      .eq('tipo', 'saida')
      .order('data_emissao', { ascending: false })
    setNotas(data || [])
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const filtradas = notas.filter((n) => n.status === aba)

  // Lista de transportadoras já usadas (para o dropdown do histórico)
  const transportadorasUnicas = Array.from(
    new Set(
      notas
        .map((n) => n.transportadora)
        .filter((t) => t && t.trim().length > 0),
    ),
  ).sort()

  // Notas coletadas, com os filtros do histórico aplicados
  const historico = notas
    .filter((n) => n.status === 'coletada')
    .filter((n) => {
      const transpOk =
        filtroTransportadora === 'todas' ||
        n.transportadora === filtroTransportadora
      const dataRef = n.data_expedicao || n.data_emissao
      const inicioOk = !filtroDataInicio || dataRef >= filtroDataInicio
      const fimOk = !filtroDataFim || dataRef <= filtroDataFim
      const numeroOk =
        !filtroNumero || n.numero?.toString().includes(filtroNumero.trim())
      return transpOk && inicioOk && fimOk && numeroOk
    })
    .sort((a, b) => {
      const da = a.data_expedicao || a.data_emissao || ''
      const db = b.data_expedicao || b.data_emissao || ''
      return db.localeCompare(da)
    })

  function toggleSelecao(id) {
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  function selecionarTodas() {
    if (selecionadas.length === filtradas.length) {
      setSelecionadas([])
    } else {
      setSelecionadas(filtradas.map((n) => n.id))
    }
  }

  async function agendarColeta() {
    if (selecionadas.length === 0) return
    setProcessando(true)
    await supabase
      .from('notas_fiscais')
      .update({ status: 'agendada' })
      .in('id', selecionadas)
    setSelecionadas([])
    setProcessando(false)
    carregar()
  }

  async function confirmarColeta() {
    if (selecionadas.length === 0) return
    setProcessando(true)
    await supabase
      .from('notas_fiscais')
      .update({ status: 'coletada' })
      .in('id', selecionadas)
    setSelecionadas([])
    setProcessando(false)
    carregar()
  }

  async function voltarPendente() {
    if (selecionadas.length === 0) return
    setProcessando(true)
    await supabase
      .from('notas_fiscais')
      .update({ status: 'pendente' })
      .in('id', selecionadas)
    setSelecionadas([])
    setProcessando(false)
    carregar()
  }

  // Gera o relatório de protocolo de expedição e abre a tela de impressão.
  // Também grava a data de expedição (data da coleta) em cada nota selecionada,
  // caso ainda não tenha sido definida.
  async function gerarRelatorio() {
    if (selecionadas.length === 0) return

    const hoje = new Date().toISOString().split('T')[0]

    const notasSelecionadas = notas
      .filter((n) => selecionadas.includes(n.id))
      .map((n) => ({
        ...n,
        data_expedicao: n.data_expedicao || hoje,
      }))

    // Grava a data de expedição no banco para cada nota que ainda não tinha
    for (const n of notasSelecionadas) {
      if (!notas.find((x) => x.id === n.id)?.data_expedicao) {
        await supabase
          .from('notas_fiscais')
          .update({ data_expedicao: n.data_expedicao })
          .eq('id', n.id)
      }
    }

    const transportadoraNome =
      notasSelecionadas[0]?.transportadora || 'TRANSPORTADORA NÃO INFORMADA'

    const totais = notasSelecionadas.reduce(
      (acc, n) => ({
        qtd: acc.qtd + Number(n.qtd_volumes || 0),
        peso: acc.peso + Number(n.peso || 0),
        valor: acc.valor + Number(n.valor_total || 0),
      }),
      { qtd: 0, peso: 0, valor: 0 },
    )

    const formatarData = (d) =>
      d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-'
    const formatarMoeda = (v) =>
      Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const formatarPeso = (v) =>
      Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3 })

    const linhas = notasSelecionadas
      .map(
        (n) => `
        <tr>
          <td>${formatarData(n.data_emissao)}</td>
          <td>${formatarData(n.data_expedicao)}</td>
          <td>${n.numero}</td>
          <td>${n.transportadora || '-'}</td>
          <td>${n.fornecedor_destinatario || '-'}</td>
          <td>${n.municipio || '-'}</td>
          <td>${n.uf || '-'}</td>
          <td class="num">${n.qtd_volumes || 0}</td>
          <td class="num">${formatarPeso(n.peso || 0)}</td>
          <td class="num">${formatarMoeda(n.valor_total || 0)}</td>
        </tr>`,
      )
      .join('')

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Protocolo de Expedição</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1f2937;
    padding: 24px;
    font-size: 12px;
  }
  .cabecalho {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #1f2937;
    padding: 10px 16px;
    margin-bottom: 16px;
    gap: 16px;
  }
  .cabecalho img {
    height: 90px;
    object-fit: contain;
  }
  .cabecalho .titulo {
    flex: 1;
    text-align: center;
  }
  .cabecalho h1 {
    font-size: 18px;
    margin: 0;
  }
  .cabecalho .espaco-direita {
    width: 90px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
  }
  th, td {
    border: 1px solid #9ca3af;
    padding: 6px 8px;
    font-size: 11px;
    text-align: left;
  }
  th {
    background: #f3f4f6;
    text-transform: uppercase;
    font-size: 10px;
  }
  td.num, th.num { text-align: right; }
  tfoot td {
    font-weight: bold;
    background: #fef9c3;
  }
  .declaracao {
    margin: 28px 0 40px;
    line-height: 1.6;
    text-align: justify;
  }
  .assinaturas {
    margin-top: 50px;
  }
  .linha-assinatura {
    margin-bottom: 36px;
  }
  .linha-assinatura .traco {
    border-top: 1px solid #1f2937;
    width: 320px;
    margin-bottom: 4px;
  }
  @media print {
    body { padding: 0; }
    @page { margin: 16mm; }
  }
</style>
</head>
<body>

  <div class="cabecalho">
    <img src="data:image/png;base64,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" alt="Logo" />
    <div class="titulo">
      <h1>PROTOCOLO DE EXPEDIÇÃO</h1>
    </div>
    <div class="espaco-direita"></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Emissão</th>
        <th>Expedição</th>
        <th>NF</th>
        <th>Transportadora</th>
        <th>Destinatário</th>
        <th>Município</th>
        <th>UF</th>
        <th class="num">Qtd.</th>
        <th class="num">Peso</th>
        <th class="num">Valor NF</th>
      </tr>
    </thead>
    <tbody>
      ${linhas}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6">${notasSelecionadas.length} NF(s)</td>
        <td class="num">TOTAIS:</td>
        <td class="num">${totais.qtd}</td>
        <td class="num">${formatarPeso(totais.peso)}</td>
        <td class="num">${formatarMoeda(totais.valor)}</td>
      </tr>
    </tfoot>
  </table>

  <div class="declaracao">
    Declaro para os devidos fins que recebi em perfeito estado a posse dos volumes que compõem a Nota Fiscal citadas acima.
    Declaro ainda que a expedição ocorreu dentro da normalidade e que todos os volumes carregados foram vistoriados e encontram-se em perfeitas condições.
  </div>

  <div class="assinaturas">
    <div class="linha-assinatura">
      <div class="traco"></div>
      Assinatura do Conferente
    </div>
    <div class="linha-assinatura">
      <div class="traco"></div>
      RG/CPF:
    </div>
    <div class="linha-assinatura">
      <div class="traco"></div>
      Placa do Carro:
    </div>
  </div>

  <script>
    window.onload = function () {
      window.print()
    }
  </script>
</body>
</html>`

    const janela = window.open('', '_blank')
    janela.document.write(html)
    janela.document.close()

    carregar()
  }

  const valorSelecionado = notas
    .filter((n) => selecionadas.includes(n.id))
    .reduce((acc, n) => acc + Number(n.valor_total), 0)

  const abas = [
    { id: 'pendente', label: 'Pendentes' },
    { id: 'agendada', label: 'Agendadas' },
    { id: 'coletada', label: 'Coletadas' },
    { id: 'historico', label: 'Histórico' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Coleta de Notas</h1>
        <div className="flex items-center gap-2 text-gray-500">
          <Truck size={20} />
          <span className="text-sm">Saídas para expedição</span>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {abas.map((a) => {
          const count =
            a.id === 'historico'
              ? historico.length
              : notas.filter((n) => n.status === a.id).length
          return (
            <button
              key={a.id}
              onClick={() => {
                setAba(a.id)
                setSelecionadas([])
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2
                ${aba === a.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
            >
              {a.label}
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${aba === a.id ? 'bg-blue-700' : 'bg-gray-100'}`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {aba === 'historico' && (
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Transportadora
            </label>
            <select
              value={filtroTransportadora}
              onChange={(e) => setFiltroTransportadora(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
            >
              <option value="todas">Todas as transportadoras</option>
              {transportadorasUnicas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Data início (expedição)
            </label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Data fim (expedição)
            </label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Número da NF
            </label>
            <input
              type="text"
              value={filtroNumero}
              onChange={(e) => setFiltroNumero(e.target.value)}
              placeholder="Ex: 34361"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
            />
          </div>

          {(filtroTransportadora !== 'todas' ||
            filtroDataInicio ||
            filtroDataFim ||
            filtroNumero) && (
            <button
              onClick={() => {
                setFiltroTransportadora('todas')
                setFiltroDataInicio('')
                setFiltroDataFim('')
                setFiltroNumero('')
              }}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {selecionadas.length > 0 && aba !== 'historico' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-blue-800">
            <strong>{selecionadas.length}</strong> nota(s) selecionada(s) —
            Total:{' '}
            <strong>
              {valorSelecionado.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </strong>
          </div>
          <div className="flex gap-2">
            <button
              onClick={gerarRelatorio}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-purple-700 transition"
            >
              <Printer size={16} />
              Gerar Relatório
            </button>

            {aba === 'pendente' && (
              <button
                onClick={agendarColeta}
                disabled={processando}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                Agendar Coleta
              </button>
            )}
            {aba === 'agendada' && (
              <>
                <button
                  onClick={voltarPendente}
                  disabled={processando}
                  className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-300 transition disabled:opacity-50"
                >
                  Voltar p/ Pendente
                </button>
                <button
                  onClick={confirmarColeta}
                  disabled={processando}
                  className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
                >
                  Confirmar Coletada
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {aba === 'historico' ? (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Nº</th>
                <th className="px-4 py-3 text-left">Destinatário</th>
                <th className="px-4 py-3 text-left">Transportadora</th>
                <th className="px-4 py-3 text-left">Município/UF</th>
                <th className="px-4 py-3 text-left">Emissão</th>
                <th className="px-4 py-3 text-left">Coletada em</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    Carregando...
                  </td>
                </tr>
              ) : historico.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    Nenhuma coleta encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                historico.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">
                      {n.numero}/{n.serie}
                    </td>
                    <td className="px-4 py-3">{n.fornecedor_destinatario}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">
                      {n.transportadora || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {n.municipio ? `${n.municipio}/${n.uf || ''}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {n.data_emissao
                        ? new Date(
                            n.data_emissao + 'T00:00:00',
                          ).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-green-700 font-medium">
                        <Calendar size={14} />
                        {n.data_expedicao
                          ? new Date(
                              n.data_expedicao + 'T00:00:00',
                            ).toLocaleDateString('pt-BR')
                          : 'Não registrada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {Number(n.valor_total).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={selecionarTodas}
                    className="text-gray-400 hover:text-blue-600"
                  >
                    {selecionadas.length === filtradas.length &&
                    filtradas.length > 0 ? (
                      <CheckSquare size={18} />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Nº</th>
                <th className="px-4 py-3 text-left">Destinatário</th>
                <th className="px-4 py-3 text-left">Transportadora</th>
                <th className="px-4 py-3 text-left">Emissão</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    Carregando...
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">
                    Nenhuma nota nesta categoria.
                  </td>
                </tr>
              ) : (
                filtradas.map((n) => (
                  <tr
                    key={n.id}
                    onClick={() => toggleSelecao(n.id)}
                    className={`hover:bg-gray-50 cursor-pointer ${selecionadas.includes(n.id) ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      {selecionadas.includes(n.id) ? (
                        <CheckSquare size={18} className="text-blue-600" />
                      ) : (
                        <Square size={18} className="text-gray-300" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {n.numero}/{n.serie}
                    </td>
                    <td className="px-4 py-3">{n.fornecedor_destinatario}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">
                      {n.transportadora || '—'}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1 text-gray-500">
                      <Calendar size={14} />
                      {n.data_emissao
                        ? new Date(
                            n.data_emissao + 'T00:00:00',
                          ).toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {Number(n.valor_total).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
