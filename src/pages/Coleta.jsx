import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { registrarLog } from '../lib/log'
import {
  Truck,
  CheckSquare,
  Square,
  Calendar,
  Printer,
  Search,
} from 'lucide-react'

export default function Coleta() {
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selecionadas, setSelecionadas] = useState([])
  const [aba, setAba] = useState('pendente')
  const [processando, setProcessando] = useState(false)

  const [filtroTranspAgendada, setFiltroTranspAgendada] = useState('todas')
  const [filtroNFColetada, setFiltroNFColetada] = useState('')
  const [filtroTransportadora, setFiltroTransportadora] = useState('todas')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [filtroNumero, setFiltroNumero] = useState('')

  const [editandoTransp, setEditandoTransp] = useState(null)
  const [editandoObs, setEditandoObs] = useState(null)

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

  const transportadorasUnicas = Array.from(
    new Set(
      notas
        .map((n) => n.transportadora)
        .filter((t) => t && t.trim().length > 0),
    ),
  ).sort()

  const filtradas = notas.filter((n) => {
    if (n.status !== aba) return false
    if (aba === 'agendada' && filtroTranspAgendada !== 'todas') {
      return n.transportadora === filtroTranspAgendada
    }
    if (aba === 'coletada' && filtroNFColetada.trim()) {
      return n.numero?.toString().includes(filtroNFColetada.trim())
    }
    return true
  })

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

  async function salvarTransportadora(novaTransportadora) {
    if (!editandoTransp || !novaTransportadora.trim()) {
      setEditandoTransp(null)
      return
    }

    const nota = notas.find((n) => n.id === editandoTransp)
    const transportadoraAntiga = nota?.transportadora || '(vazio)'

    await supabase
      .from('notas_fiscais')
      .update({ transportadora: novaTransportadora.trim() })
      .eq('id', editandoTransp)

    await registrarLog(
      'alterou transportadora',
      'coleta',
      `Alterou transportadora da NF ${nota?.numero} de "${transportadoraAntiga}" para "${novaTransportadora.trim()}"`,
    )

    setEditandoTransp(null)
    carregar()
  }

  async function salvarObservacao(novaObservacao) {
    if (!editandoObs) {
      setEditandoObs(null)
      return
    }

    const nota = notas.find((n) => n.id === editandoObs)
    const obsAntiga = nota?.observacao || '(vazio)'
    const obsFinal = novaObservacao.trim()

    await supabase
      .from('notas_fiscais')
      .update({ observacao: obsFinal })
      .eq('id', editandoObs)

    await registrarLog(
      obsFinal ? 'editou observação' : 'removeu observação',
      'coleta',
      `Observação da NF ${nota?.numero} alterada de "${obsAntiga}" para "${obsFinal || '(vazio)'}"`,
    )

    setEditandoObs(null)
    carregar()
  }

  async function agendarColeta() {
    if (selecionadas.length === 0) return
    setProcessando(true)
    await supabase
      .from('notas_fiscais')
      .update({ status: 'agendada' })
      .in('id', selecionadas)
    const nfsSelecionadas = notas
      .filter((n) => selecionadas.includes(n.id))
      .map((n) => n.numero)
      .join(', ')
    await registrarLog(
      'agendou',
      'coleta',
      `Agendou coleta de ${selecionadas.length} NF(s): ${nfsSelecionadas}`,
    )
    setSelecionadas([])
    setProcessando(false)
    carregar()
  }

  async function confirmarColeta() {
    if (selecionadas.length === 0) return
    setProcessando(true)
    const hoje = new Date().toISOString().split('T')[0]
    await supabase
      .from('notas_fiscais')
      .update({ status: 'coletada', data_expedicao: hoje })
      .in('id', selecionadas)
    const nfsSelecionadas = notas
      .filter((n) => selecionadas.includes(n.id))
      .map((n) => n.numero)
      .join(', ')
    await registrarLog(
      'confirmou coleta',
      'coleta',
      `Confirmou coleta de ${selecionadas.length} NF(s): ${nfsSelecionadas}`,
    )
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
    const nfsSelecionadas = notas
      .filter((n) => selecionadas.includes(n.id))
      .map((n) => n.numero)
      .join(', ')
    await registrarLog(
      'reverteu para pendente',
      'coleta',
      `Reverteu ${selecionadas.length} NF(s) para pendente: ${nfsSelecionadas}`,
    )
    setSelecionadas([])
    setProcessando(false)
    carregar()
  }

  async function voltarParaAgendada() {
    if (selecionadas.length === 0) return
    setProcessando(true)
    await supabase
      .from('notas_fiscais')
      .update({ status: 'agendada', data_expedicao: null })
      .in('id', selecionadas)
    const nfsSelecionadas = notas
      .filter((n) => selecionadas.includes(n.id))
      .map((n) => n.numero)
      .join(', ')
    await registrarLog(
      'reverteu para agendada',
      'coleta',
      `Reverteu ${selecionadas.length} NF(s) de Coletada para Agendada: ${nfsSelecionadas}`,
    )
    setSelecionadas([])
    setProcessando(false)
    carregar()
  }

  async function gerarRelatorio() {
    if (selecionadas.length === 0) return

    const hoje = new Date().toISOString().split('T')[0]

    const notasSelecionadas = notas
      .filter((n) => selecionadas.includes(n.id))
      .map((n) => ({
        ...n,
        data_expedicao: n.data_expedicao || hoje,
      }))

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
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; padding: 24px; font-size: 12px; }
  .cabecalho { display: flex; align-items: center; justify-content: space-between; border: 1px solid #1f2937; padding: 10px 16px; margin-bottom: 16px; gap: 16px; }
  .cabecalho img { height: 90px; object-fit: contain; }
  .cabecalho .titulo { flex: 1; text-align: center; }
  .cabecalho h1 { font-size: 18px; margin: 0; }
  .cabecalho .espaco-direita { width: 90px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #9ca3af; padding: 6px 8px; font-size: 11px; text-align: left; }
  th { background: #f3f4f6; text-transform: uppercase; font-size: 10px; }
  td.num, th.num { text-align: right; }
  tfoot td { font-weight: bold; background: #fef9c3; }
  .declaracao { margin: 28px 0 40px; line-height: 1.6; text-align: justify; }
  .assinaturas { margin-top: 50px; }
  .linha-assinatura { margin-bottom: 36px; }
  .linha-assinatura .traco { border-top: 1px solid #1f2937; width: 320px; margin-bottom: 4px; }
  @media print { body { padding: 0; } @page { margin: 16mm; } }
</style>
</head>
<body>
  <div class="cabecalho">
    <img src="SUA_URL_OU_BASE64_DO_LOGO_AQUI" alt="Logo" />
    <div class="titulo"><h1>PROTOCOLO DE EXPEDIÇÃO</h1></div>
    <div class="espaco-direita"></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Emissão</th><th>Expedição</th><th>NF</th><th>Transportadora</th>
        <th>Destinatário</th><th>Município</th><th>UF</th>
        <th class="num">Qtd.</th><th class="num">Peso</th><th class="num">Valor NF</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
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
    <div class="linha-assinatura"><div class="traco"></div>Assinatura do Conferente</div>
    <div class="linha-assinatura"><div class="traco"></div>RG/CPF:</div>
    <div class="linha-assinatura"><div class="traco"></div>Placa do Carro:</div>
  </div>
  <script>window.onload = function () { window.print() }</script>
</body>
</html>`

    const janela = window.open('', '_blank')
    janela.document.write(html)
    janela.document.close()

    const nfsGeradas = notasSelecionadas.map((n) => n.numero).join(', ')
    await registrarLog(
      'gerou relatório',
      'coleta',
      `Gerou protocolo de expedição de ${notasSelecionadas.length} NF(s): ${nfsGeradas} — Transp: ${transportadoraNome}`,
    )

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

  function CelulaTransportadora({ nota }) {
    if (editandoTransp !== nota.id) {
      return (
        <td
          className="px-4 py-3 text-gray-500 max-w-[160px] truncate cursor-pointer hover:bg-yellow-50"
          title="Clique para editar"
          onClick={(e) => {
            e.stopPropagation()
            setEditandoTransp(nota.id)
          }}
        >
          {nota.transportadora || '—'}
        </td>
      )
    }

    return (
      <td className="px-1 py-1" onClick={(e) => e.stopPropagation()}>
        <select
          autoFocus
          defaultValue={nota.transportadora || ''}
          onBlur={(e) => salvarTransportadora(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              salvarTransportadora(e.target.value)
            }
            if (e.key === 'Escape') {
              setEditandoTransp(null)
            }
          }}
          className="border border-blue-400 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">—</option>
          {transportadorasUnicas.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
    )
  }

  function CelulaObservacao({ nota }) {
    if (editandoObs !== nota.id) {
      return (
        <td
          className="px-4 py-3 text-gray-500 max-w-[200px] truncate cursor-pointer hover:bg-yellow-50"
          title="Clique para editar"
          onClick={(e) => {
            e.stopPropagation()
            setEditandoObs(nota.id)
          }}
        >
          {nota.observacao || (
            <span className="text-gray-300 italic">adicionar</span>
          )}
        </td>
      )
    }

    return (
      <td className="px-1 py-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          autoFocus
          defaultValue={nota.observacao || ''}
          placeholder="Digite a observação..."
          onBlur={(e) => salvarObservacao(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              salvarObservacao(e.target.value)
            }
            if (e.key === 'Escape') {
              setEditandoObs(null)
            }
          }}
          className="border border-blue-400 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </td>
    )
  }

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
                setFiltroTranspAgendada('todas')
                setFiltroNFColetada('')
                setEditandoTransp(null)
                setEditandoObs(null)
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

      {aba === 'agendada' && (
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Filtrar por Transportadora
            </label>
            <select
              value={filtroTranspAgendada}
              onChange={(e) => {
                setFiltroTranspAgendada(e.target.value)
                setSelecionadas([])
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[260px]"
            >
              <option value="todas">Todas as transportadoras</option>
              {transportadorasUnicas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {filtroTranspAgendada !== 'todas' && (
            <>
              <button
                onClick={() => {
                  setFiltroTranspAgendada('todas')
                  setSelecionadas([])
                }}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Limpar filtro
              </button>
              <p className="text-xs text-gray-400 self-end">
                {filtradas.length} nota(s) encontrada(s) para esta
                transportadora
              </p>
            </>
          )}
        </div>
      )}

      {aba === 'coletada' && (
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Buscar por Número da NF
            </label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-2 text-gray-400"
              />
              <input
                type="text"
                value={filtroNFColetada}
                onChange={(e) => {
                  setFiltroNFColetada(e.target.value)
                  setSelecionadas([])
                }}
                placeholder="Ex: 34361"
                className="pl-9 pr-3 border border-gray-300 rounded-lg py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
          </div>
          {filtroNFColetada && (
            <>
              <button
                onClick={() => {
                  setFiltroNFColetada('')
                  setSelecionadas([])
                }}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Limpar filtro
              </button>
              <p className="text-xs text-gray-400 self-end">
                {filtradas.length} nota(s) encontrada(s)
              </p>
            </>
          )}
        </div>
      )}

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
          <div className="flex gap-2 flex-wrap">
            {aba === 'agendada' && (
              <button
                onClick={gerarRelatorio}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-purple-700 transition"
              >
                <Printer size={16} />
                Gerar Relatório
              </button>
            )}
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
            {aba === 'coletada' && (
              <button
                onClick={voltarParaAgendada}
                disabled={processando}
                className="bg-yellow-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-yellow-600 transition disabled:opacity-50"
              >
                Voltar p/ Agendada
              </button>
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
                <th className="px-4 py-3 text-left">Observação</th>
                <th className="px-4 py-3 text-left">Município/UF</th>
                <th className="px-4 py-3 text-left">Emissão</th>
                <th className="px-4 py-3 text-left">Coletada em</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    Carregando...
                  </td>
                </tr>
              ) : historico.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
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
                    <CelulaTransportadora nota={n} />
                    <CelulaObservacao nota={n} />
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
                      {n.data_expedicao ? (
                        <span className="flex items-center gap-1 text-green-700 font-medium">
                          <Calendar size={14} />
                          {n.data_expedicao.split('-').reverse().join('/')}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">
                          Não registrada
                        </span>
                      )}
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
                <th className="px-4 py-3 text-left">Observação</th>
                <th className="px-4 py-3 text-left">Emissão</th>
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
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
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
                    <CelulaTransportadora nota={n} />
                    <CelulaObservacao nota={n} />
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
