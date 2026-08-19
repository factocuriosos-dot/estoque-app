import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { registrarLog } from '../lib/log'
import {
  Eye,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Truck,
  Check,
  ClipboardList,
  CheckSquare,
  Square,
} from 'lucide-react'

const expedicaoVazia = {
  transportadora: '',
  municipio: '',
  uf: '',
  peso: 0,
  qtd_volumes: 0,
  data_expedicao: '',
}

export default function Notas() {
  const [notas, setNotas] = useState([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [modalItens, setModalItens] = useState(null)
  const [itens, setItens] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [modalExpedicao, setModalExpedicao] = useState(null)
  const [formExpedicao, setFormExpedicao] = useState(expedicaoVazia)
  const [salvandoExpedicao, setSalvandoExpedicao] = useState(false)

  // Seleção para mapa cego
  const [selecionadas, setSelecionadas] = useState([])

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('notas_fiscais')
      .select('*')
      .order('criado_em', { ascending: false })
    setNotas(data || [])
    setLoading(false)
  }

  async function verItens(nota) {
    const { data } = await supabase
      .from('nota_itens')
      .select('*')
      .eq('nota_id', nota.id)
    setItens(data || [])
    setModalItens(nota)
  }

  function abrirExpedicao(nota) {
    setFormExpedicao({
      transportadora: nota.transportadora || '',
      municipio: nota.municipio || '',
      uf: nota.uf || '',
      peso: nota.peso || 0,
      qtd_volumes: nota.qtd_volumes || 0,
      data_expedicao: nota.data_expedicao || '',
    })
    setModalExpedicao(nota)
  }

  async function salvarExpedicao() {
    setSalvandoExpedicao(true)
    await supabase
      .from('notas_fiscais')
      .update(formExpedicao)
      .eq('id', modalExpedicao.id)
    await registrarLog(
      'editou',
      'nota_fiscal',
      `Atualizou dados de expedição da NF ${modalExpedicao.numero} — Transp: ${formExpedicao.transportadora || '—'}`,
      modalExpedicao.id,
    )
    setSalvandoExpedicao(false)
    setModalExpedicao(null)
    carregar()
  }

  async function excluir(nota) {
    if (!confirm(`Excluir a nota ${nota.numero}? O estoque será revertido.`))
      return

    const { data: movs } = await supabase
      .from('movimentacoes')
      .select('*')
      .eq('nota_id', nota.id)

    for (const mov of movs || []) {
      const { data: prod } = await supabase
        .from('produtos')
        .select('quantidade')
        .eq('id', mov.produto_id)
        .single()

      if (prod) {
        const novaQtd =
          mov.tipo === 'entrada'
            ? prod.quantidade - mov.quantidade
            : prod.quantidade + mov.quantidade

        await supabase
          .from('produtos')
          .update({ quantidade: novaQtd })
          .eq('id', mov.produto_id)
      }
    }

    await supabase.from('nota_itens').delete().eq('nota_id', nota.id)
    await supabase.from('movimentacoes').delete().eq('nota_id', nota.id)
    await supabase.from('notas_fiscais').delete().eq('id', nota.id)
    await registrarLog(
      'excluiu',
      'nota_fiscal',
      `Excluiu NF ${nota.numero}/${nota.serie} (${nota.tipo.toUpperCase()}) — ${nota.fornecedor_destinatario}`,
      nota.id,
    )
    carregar()
  }

  function parseXML(xmlText, tipoForcado) {
    const parser = new DOMParser()
    const xml = parser.parseFromString(xmlText, 'text/xml')
    const get = (tag) => xml.getElementsByTagName(tag)[0]?.textContent || ''

    const numero = get('nNF')
    const serie = get('serie')
    const chave = get('Id')?.replace('NFe', '') || get('chNFe')
    const dataEmissao = get('dhEmi')?.split('T')[0] || get('dEmi')
    const valorTotal = parseFloat(get('vNF')) || 0
    const emitente = get('xNome')
    const cnpjEmit = get('CNPJ')
    const destinatario =
      xml.getElementsByTagName('dest')[0]?.getElementsByTagName('xNome')[0]
        ?.textContent || ''
    const tipoReal = tipoForcado
    const fornecedorDestinatario =
      tipoReal === 'entrada' ? emitente : destinatario
    const cnpj = cnpjEmit

    const enderDest = xml.getElementsByTagName('enderDest')[0]
    const municipioXml =
      enderDest?.getElementsByTagName('xMun')[0]?.textContent || ''
    const ufXml = enderDest?.getElementsByTagName('UF')[0]?.textContent || ''

    const transp = xml.getElementsByTagName('transp')[0]
    const transportaTag = transp?.getElementsByTagName('transporta')[0]
    const transportadoraXml =
      transportaTag?.getElementsByTagName('xNome')[0]?.textContent || ''

    const volTag = transp?.getElementsByTagName('vol')[0]
    const pesoXml =
      parseFloat(volTag?.getElementsByTagName('pesoB')[0]?.textContent) ||
      parseFloat(volTag?.getElementsByTagName('pesoL')[0]?.textContent) ||
      0
    const qVolXml =
      parseFloat(volTag?.getElementsByTagName('qVol')[0]?.textContent) || 0

    const detalhes = xml.getElementsByTagName('det')
    const itens = []

    for (const det of detalhes) {
      const codigo = det.getElementsByTagName('cProd')[0]?.textContent || ''
      const descricao = det.getElementsByTagName('xProd')[0]?.textContent || ''
      const quantidade =
        parseFloat(det.getElementsByTagName('qCom')[0]?.textContent) || 0
      const unidade = det.getElementsByTagName('uCom')[0]?.textContent || ''
      const precoUnitario =
        parseFloat(det.getElementsByTagName('vUnCom')[0]?.textContent) || 0
      const precoTotal =
        parseFloat(det.getElementsByTagName('vProd')[0]?.textContent) || 0

      itens.push({
        codigo,
        descricao,
        quantidade,
        unidade,
        precoUnitario,
        precoTotal,
      })
    }

    return {
      numero,
      serie,
      chave,
      dataEmissao,
      valorTotal,
      fornecedorDestinatario,
      cnpj,
      itens,
      tipoReal,
      municipioXml,
      ufXml,
      transportadoraXml,
      pesoXml,
      qVolXml,
    }
  }

  async function importarXML(e, tipoForcado) {
    const arquivos = Array.from(e.target.files)
    if (!arquivos.length) return

    setProcessando(true)
    setResultado(null)
    const resultados = []

    for (const arquivo of arquivos) {
      try {
        const texto = await arquivo.text()
        const dados = parseXML(texto, tipoForcado)
        const tipo = dados.tipoReal

        if (!dados.numero) {
          resultados.push({
            arquivo: arquivo.name,
            ok: false,
            msg: 'XML inválido ou formato não reconhecido.',
          })
          continue
        }

        const { data: existeArr } = await supabase
          .from('notas_fiscais')
          .select('id')
          .eq('chave_acesso', dados.chave)
        const existe = existeArr?.[0] || null

        if (existe) {
          resultados.push({
            arquivo: arquivo.name,
            ok: false,
            msg: `Nota ${dados.numero} já importada.`,
          })
          continue
        }

        const somaQuantidadeItens = dados.itens.reduce(
          (acc, it) => acc + it.quantidade,
          0,
        )
        const qtdVolumesFinal =
          dados.qVolXml > 0 ? dados.qVolXml : somaQuantidadeItens

        const { data: nota, error: erroNota } = await supabase
          .from('notas_fiscais')
          .insert({
            numero: dados.numero,
            serie: dados.serie,
            chave_acesso: dados.chave,
            tipo,
            fornecedor_destinatario: dados.fornecedorDestinatario,
            cnpj: dados.cnpj,
            data_emissao: dados.dataEmissao,
            valor_total: dados.valorTotal,
            municipio: dados.municipioXml,
            uf: dados.ufXml,
            transportadora: dados.transportadoraXml,
            peso: dados.pesoXml,
            qtd_volumes: qtdVolumesFinal,
          })
          .select()
          .single()

        if (erroNota) {
          resultados.push({
            arquivo: arquivo.name,
            ok: false,
            msg: 'Erro ao salvar nota.',
          })
          continue
        }

        for (const item of dados.itens) {
          const { data: prodArr } = await supabase
            .from('produtos')
            .select('*')
            .eq('codigo', item.codigo)
          let produto = prodArr?.[0] || null

          if (!produto) {
            const { data: novo } = await supabase
              .from('produtos')
              .insert({
                codigo: item.codigo,
                descricao: item.descricao,
                unidade: item.unidade,
                quantidade: 0,
                preco_unitario: item.precoUnitario,
              })
              .select()
              .single()
            produto = novo
          }

          if (!produto) continue

          await supabase.from('nota_itens').insert({
            nota_id: nota.id,
            produto_id: produto.id,
            codigo_produto: item.codigo,
            descricao: item.descricao,
            quantidade: item.quantidade,
            unidade: item.unidade,
            preco_unitario: item.precoUnitario,
            preco_total: item.precoTotal,
          })

          const novaQtd =
            tipo === 'entrada'
              ? produto.quantidade + item.quantidade
              : produto.quantidade - item.quantidade

          await supabase
            .from('produtos')
            .update({ quantidade: novaQtd })
            .eq('id', produto.id)
          await supabase.from('movimentacoes').insert({
            produto_id: produto.id,
            nota_id: nota.id,
            tipo,
            quantidade: item.quantidade,
          })
        }

        const detalhesExtra = []
        if (dados.transportadoraXml)
          detalhesExtra.push(`Transp.: ${dados.transportadoraXml}`)
        if (!dados.transportadoraXml && tipo === 'saida')
          detalhesExtra.push(
            'Transportadora não informada no XML — preencha manualmente',
          )

        await registrarLog(
          'importou',
          'nota_fiscal',
          `Importou NF ${dados.numero}/${dados.serie} como ${tipo.toUpperCase()} — ${dados.fornecedorDestinatario} (${dados.itens.length} item(ns))`,
          nota.id,
        )

        resultados.push({
          arquivo: arquivo.name,
          ok: true,
          msg: `Nota ${dados.numero} importada como ${tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA'} com ${dados.itens.length} item(ns). ${detalhesExtra.join(' | ')}`,
        })
      } catch (err) {
        resultados.push({
          arquivo: arquivo.name,
          ok: false,
          msg: 'Erro ao processar arquivo.',
        })
      }
    }

    setResultado(resultados)
    setProcessando(false)
    carregar()
    e.target.value = ''
  }

  // Gera mapa cego de separação para as notas selecionadas
  async function gerarMapaCego() {
    if (selecionadas.length === 0) return

    const notasSelecionadas = notas.filter((n) => selecionadas.includes(n.id))
    const hoje = new Date().toLocaleDateString('pt-BR')
    const horaAgora = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    let paginasHTML = ''

    for (const nota of notasSelecionadas) {
      const { data: itensNota } = await supabase
        .from('nota_itens')
        .select('*')
        .eq('nota_id', nota.id)
        .order('codigo_produto')

      const linhasItens = (itensNota || [])
        .map(
          (item, i) => `
          <tr>
            <td class="num">${i + 1}</td>
            <td class="cod">${item.codigo_produto}</td>
            <td>${item.descricao}</td>
            <td class="centro">${item.unidade}</td>
            <td class="vazio"></td>
          </tr>`,
        )
        .join('')

      paginasHTML += `
        <div class="pagina">
          <div class="cabecalho">
            <div class="cab-linha">
              <span class="cab-label">MAPA DE SEPARAÇÃO</span>
              <span class="cab-data">Data: ${hoje} — ${horaAgora}</span>
            </div>
            <div class="cab-linha">
              <span><strong>NF:</strong> ${nota.numero}/${nota.serie || '1'}</span>
              <span><strong>Emissão:</strong> ${nota.data_emissao ? nota.data_emissao.split('-').reverse().join('/') : '-'}</span>
            </div>
            <div class="cab-linha">
              <span><strong>Destinatário:</strong> ${nota.fornecedor_destinatario || '-'}</span>
              <span><strong>Município/UF:</strong> ${nota.municipio || '-'}${nota.uf ? '/' + nota.uf : ''}</span>
            </div>
            <div class="cab-linha">
              <span><strong>Transportadora:</strong> ${nota.transportadora || '________________________________'}</span>
              <span><strong>Valor NF:</strong> ${Number(nota.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="num">#</th>
                <th class="cod">Código</th>
                <th>Descrição</th>
                <th class="centro">UN</th>
                <th class="vazio">Qtd. Contada</th>
              </tr>
            </thead>
            <tbody>
              ${linhasItens}
            </tbody>
          </table>

          <div class="rodape">
            <div class="rodape-campos">
              <div class="campo-rodape">
                <span>Total de Itens:</span>
                <div class="linha-preench"></div>
              </div>
              <div class="campo-rodape">
                <span>Total de Volumes:</span>
                <div class="linha-preench"></div>
              </div>
            </div>

            <div class="assinaturas">
              <div class="assinatura">
                <div class="linha-ass"></div>
                <span>Separador</span>
              </div>
              <div class="assinatura">
                <div class="linha-ass"></div>
                <span>Conferente</span>
              </div>
            </div>
          </div>
        </div>`
    }

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Mapa de Separação</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1f2937; }
  .pagina {
    padding: 16mm;
    page-break-after: always;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .pagina:last-child { page-break-after: avoid; }
  .cabecalho {
    border: 2px solid #1f2937;
    padding: 8px 12px;
    margin-bottom: 12px;
    border-radius: 4px;
  }
  .cab-linha {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 11px;
  }
  .cab-linha:first-child {
    border-bottom: 1px solid #9ca3af;
    padding-bottom: 4px;
    margin-bottom: 6px;
  }
  .cab-label {
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 1px;
  }
  .cab-data { font-size: 10px; color: #6b7280; align-self: flex-end; }
  table {
    width: 100%;
    border-collapse: collapse;
    flex: 1;
  }
  th, td {
    border: 1px solid #9ca3af;
    padding: 5px 7px;
    font-size: 10.5px;
    text-align: left;
  }
  th { background: #f3f4f6; font-size: 9.5px; text-transform: uppercase; font-weight: bold; }
  td.num, th.num { text-align: right; width: 30px; }
  td.cod, th.cod { width: 70px; font-family: monospace; }
  td.centro, th.centro { text-align: center; width: 40px; }
  td.vazio, th.vazio { width: 120px; background: #fffef0; text-align: center; }
  tr:nth-child(even) td { background: #f9fafb; }
  tr:nth-child(even) td.vazio { background: #fffde7; }
  .rodape { margin-top: 16px; }
  .rodape-campos {
    display: flex;
    gap: 40px;
    margin-bottom: 24px;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: #f9fafb;
  }
  .campo-rodape {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
  }
  .linha-preench {
    border-bottom: 1px solid #374151;
    width: 80px;
    height: 16px;
  }
  .assinaturas {
    display: flex;
    justify-content: space-around;
    margin-top: 32px;
  }
  .assinatura { text-align: center; }
  .linha-ass {
    border-top: 1px solid #374151;
    width: 200px;
    margin-bottom: 4px;
  }
  .assinatura span { font-size: 10px; color: #6b7280; }
  @media print {
    body { padding: 0; }
    @page { margin: 8mm; }
    .pagina { padding: 0; }
  }
</style>
</head>
<body>
  ${paginasHTML}
  <script>window.onload = function() { window.print() }</script>
</body>
</html>`

    const janela = window.open('', '_blank')
    janela.document.write(html)
    janela.document.close()

    await registrarLog(
      'gerou mapa cego',
      'nota_fiscal',
      `Gerou mapa de separação de ${notasSelecionadas.length} NF(s): ${notasSelecionadas.map((n) => n.numero).join(', ')}`,
    )

    setSelecionadas([])
  }

  function toggleSelecao(id) {
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }

  function selecionarTodasSaidas() {
    const saidas = filtradas.filter((n) => n.tipo === 'saida').map((n) => n.id)
    if (
      selecionadas.length === saidas.length &&
      saidas.every((id) => selecionadas.includes(id))
    ) {
      setSelecionadas([])
    } else {
      setSelecionadas(saidas)
    }
  }

  const filtradas = notas.filter(
    (n) => filtroTipo === 'todos' || n.tipo === filtroTipo,
  )

  const saidasFiltradas = filtradas.filter((n) => n.tipo === 'saida')

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Notas Fiscais</h1>

        <div className="flex gap-3 flex-wrap">
          {selecionadas.length > 0 && (
            <button
              onClick={gerarMapaCego}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              <ClipboardList size={18} />
              Mapa Cego ({selecionadas.length})
            </button>
          )}

          <label
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white cursor-pointer transition
            ${processando ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
          >
            <ArrowDownCircle size={18} />
            Importar Entrada
            <input
              type="file"
              accept=".xml"
              multiple
              className="hidden"
              onChange={(e) => importarXML(e, 'entrada')}
              disabled={processando}
            />
          </label>

          <label
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white cursor-pointer transition
            ${processando ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
          >
            <ArrowUpCircle size={18} />
            Importar Saída
            <input
              type="file"
              accept=".xml"
              multiple
              className="hidden"
              onChange={(e) => importarXML(e, 'saida')}
              disabled={processando}
            />
          </label>
        </div>
      </div>

      {/* Aviso de seleção para mapa cego */}
      {selecionadas.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-purple-800">
            <strong>{selecionadas.length}</strong> nota(s) de saída
            selecionada(s) para o mapa cego
          </span>
          <button
            onClick={() => setSelecionadas([])}
            className="text-xs text-purple-600 hover:text-purple-800"
          >
            Limpar seleção
          </button>
        </div>
      )}

      {resultado && (
        <div className="mb-4 bg-white rounded-xl shadow p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-gray-700">
              Resultado da importação
            </span>
            <button onClick={() => setResultado(null)}>
              <X size={16} />
            </button>
          </div>
          {resultado.map((r, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm ${r.ok ? 'text-green-600' : 'text-red-500'}`}
            >
              {r.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              <span className="font-medium">{r.arquivo}:</span> {r.msg}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {['todos', 'entrada', 'saida'].map((t) => (
          <button
            key={t}
            onClick={() => {
              setFiltroTipo(t)
              setSelecionadas([])
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition
              ${filtroTipo === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
          >
            {t === 'todos' ? 'Todos' : t === 'entrada' ? 'Entradas' : 'Saídas'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={selecionarTodasSaidas}
                  title="Selecionar todas as notas de saída"
                  className="text-gray-400 hover:text-purple-600"
                >
                  {saidasFiltradas.length > 0 &&
                  saidasFiltradas.every((n) => selecionadas.includes(n.id)) ? (
                    <CheckSquare size={16} className="text-purple-600" />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">Nº</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Fornecedor/Destinatário</th>
              <th className="px-4 py-3 text-left">Transportadora</th>
              <th className="px-4 py-3 text-left">Emissão</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Nenhuma nota encontrada.
                </td>
              </tr>
            ) : (
              filtradas.map((n) => (
                <tr
                  key={n.id}
                  className={`hover:bg-gray-50 ${selecionadas.includes(n.id) ? 'bg-purple-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    {n.tipo === 'saida' ? (
                      <button
                        onClick={() => toggleSelecao(n.id)}
                        className="text-gray-400 hover:text-purple-600"
                      >
                        {selecionadas.includes(n.id) ? (
                          <CheckSquare size={16} className="text-purple-600" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    ) : (
                      <span className="w-4 block" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {n.numero}/{n.serie}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${n.tipo === 'entrada' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}
                    >
                      {n.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">
                    {n.fornecedor_destinatario}
                  </td>
                  <td className="px-4 py-3 max-w-[160px] truncate text-gray-500">
                    {n.tipo === 'saida' ? n.transportadora || '—' : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {n.data_emissao
                      ? new Date(
                          n.data_emissao + 'T00:00:00',
                        ).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {Number(n.valor_total).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${
                      n.status === 'pendente'
                        ? 'bg-yellow-100 text-yellow-700'
                        : n.status === 'agendada'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                    }`}
                    >
                      {n.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      {n.tipo === 'saida' && (
                        <button
                          onClick={() => abrirExpedicao(n)}
                          title="Dados de expedição"
                          className="text-purple-500 hover:text-purple-700"
                        >
                          <Truck size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => verItens(n)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => excluir(n)}
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

      {/* Modal itens */}
      {modalItens && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="font-bold text-lg">
                  Itens da Nota {modalItens.numero}
                </h2>
                <p className="text-sm text-gray-500">
                  {modalItens.fornecedor_destinatario}
                </p>
              </div>
              <button onClick={() => setModalItens(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Descrição</th>
                    <th className="px-3 py-2 text-center">UN</th>
                    <th className="px-3 py-2 text-right">Qtd</th>
                    <th className="px-3 py-2 text-right">Preço Unit.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {itens.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-mono">
                        {item.codigo_produto}
                      </td>
                      <td className="px-3 py-2">{item.descricao}</td>
                      <td className="px-3 py-2 text-center">{item.unidade}</td>
                      <td className="px-3 py-2 text-right">
                        {item.quantidade}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {Number(item.preco_unitario).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {Number(item.preco_total).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal expedição */}
      {modalExpedicao && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg">
                Dados de Expedição — NF {modalExpedicao.numero}
              </h2>
              <button onClick={() => setModalExpedicao(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs text-gray-500 -mt-2">
                Esses dados já vêm preenchidos automaticamente pelo XML. Ajuste
                aqui apenas se necessário.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transportadora
                </label>
                <input
                  value={formExpedicao.transportadora}
                  onChange={(e) =>
                    setFormExpedicao({
                      ...formExpedicao,
                      transportadora: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: CINCO LOG TRANSPORTES EIRELI - ME"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Município
                  </label>
                  <input
                    value={formExpedicao.municipio}
                    onChange={(e) =>
                      setFormExpedicao({
                        ...formExpedicao,
                        municipio: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: JOAO PESSOA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    UF
                  </label>
                  <input
                    value={formExpedicao.uf}
                    onChange={(e) =>
                      setFormExpedicao({
                        ...formExpedicao,
                        uf: e.target.value.toUpperCase(),
                      })
                    }
                    maxLength={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PB"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formExpedicao.peso}
                    onChange={(e) =>
                      setFormExpedicao({
                        ...formExpedicao,
                        peso: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Qtd. Volumes
                  </label>
                  <input
                    type="number"
                    value={formExpedicao.qtd_volumes}
                    onChange={(e) =>
                      setFormExpedicao({
                        ...formExpedicao,
                        qtd_volumes: Number(e.target.value),
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={salvarExpedicao}
                disabled={salvandoExpedicao}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Check size={18} />
                {salvandoExpedicao ? 'Salvando...' : 'Salvar Dados'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
