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
  PackagePlus,
  PackageMinus,
  Undo2,
  Save,
  Plus,
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
  const [itensNf, setItensNf] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [modalExpedicao, setModalExpedicao] = useState(null)
  const [formExpedicao, setFormExpedicao] = useState(expedicaoVazia)
  const [salvandoExpedicao, setSalvandoExpedicao] = useState(false)

  const [modalMovimentacao, setModalMovimentacao] = useState(false)
  const [tipoMovimento, setTipoMovimento] = useState('entrada')
  const [numeroNota, setNumeroNota] = useState('')
  const [produtos, setProdutos] = useState([])
  const [itens, setItens] = useState([
    {
      codigo: '',
      descricao: '',
      unidade: 'UN',
      quantidade: 1,
      preco_unitario: 0,
    },
  ])
  const [dataMov, setDataMov] = useState(new Date().toISOString().split('T')[0])
  const [observacao, setObservacao] = useState('')
  const [nota, setNota] = useState(null)
  const [salvandoMov, setSalvandoMov] = useState(false)
  const [erroMov, setErroMov] = useState('')
  const [mensagemMov, setMensagemMov] = useState(null)

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
    setItensNf(data || [])
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

  async function abrirModalMovimentacao() {
    setTipoMovimento('entrada')
    setNumeroNota('')
    setNota(null)
    setItens([
      {
        codigo: '',
        descricao: '',
        unidade: 'UN',
        quantidade: 1,
        preco_unitario: 0,
      },
    ])
    setDataMov(new Date().toISOString().split('T')[0])
    setObservacao('')
    setErroMov('')
    setMensagemMov(null)
    setModalMovimentacao(true)

    const { data } = await supabase
      .from('produtos')
      .select('id, codigo, descricao, unidade, quantidade, preco_unitario')
      .order('codigo')
    setProdutos(data || [])
  }

  async function carregarItensDaNota() {
    if (!numeroNota.trim()) {
      setErroMov('Informe o número da nota para carregar os itens.')
      return
    }

    const { data: notaEncontrada } = await supabase
      .from('notas_fiscais')
      .select('*')
      .eq('numero', numeroNota.trim())
      .single()

    if (!notaEncontrada) {
      setErroMov('Nota não encontrada.')
      return
    }

    const { data: itensNota } = await supabase
      .from('nota_itens')
      .select('*')
      .eq('nota_id', notaEncontrada.id)

    const carregados = (itensNota || []).map((i) => ({
      codigo: (i.codigo_produto || i.codigo_producto || i.codigo || '').trim(),
      descricao: i.descricao || '',
      unidade: i.unidade || 'UN',
      quantidade: Number(i.quantidade) || 0,
      preco_unitario: Number(i.preco_unitario) || 0,
    }))

    setItens(
      carregados.length > 0
        ? carregados
        : [
            {
              codigo: '',
              descricao: '',
              unidade: 'UN',
              quantidade: 1,
              preco_unitario: 0,
            },
          ],
    )
    setNota(notaEncontrada)
  }

  function atualizarItem(index, campo, valor) {
    setItens((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [campo]: valor } : it)),
    )
  }

  function atualizarItemProduto(index, codigo) {
    setItens((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it
        const novo = { ...it, codigo: codigo }
        const p = produtos.find((x) => x.codigo === codigo.trim())
        if (p) {
          return {
            ...novo,
            descricao: p.descricao,
            unidade: p.unidade,
            preco_unitario: p.preco_unitario || 0,
          }
        }
        return novo
      }),
    )
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

  function removerItem(index) {
    setItens((prev) => prev.filter((_, i) => i !== index))
  }

  const itensValidos = itens.filter(
    (i) => String(i.codigo || '').trim().length > 0 && Number(i.quantidade) > 0,
  )

  const totalValor = itensValidos.reduce(
    (acc, i) => acc + Number(i.quantidade) * Number(i.preco_unitario || 0),
    0,
  )

  const totalItens = itensValidos.length

  const totalVolumes =
    nota?.qtd_volumes ??
    itensValidos.reduce((acc, i) => acc + Number(i.quantidade), 0);

  async function salvarMovimentacao() {
    if (!numeroNota.trim()) {
      setErroMov('Informe o número da nota.')
      return
    }

    if (itensValidos.length === 0) {
      setErroMov(
        'Adicione ao menos um item com código e quantidade maior que zero.',
      )
      return
    }

    const codigos = itensValidos.map((i) => i.codigo.trim())
    if (new Set(codigos).size !== codigos.length) {
      setErroMov('Há itens com código de produto repetido.')
      return
    }

    setSalvandoMov(true)
    setErroMov('')

    const produtoIds = []

    for (const item of itensValidos) {
      const { data: prodArr } = await supabase
        .from('produtos')
        .select('*')
        .eq('codigo', item.codigo.trim())
      const produto = prodArr?.[0] || null

      if (!produto) {
        setErroMov(`Produto ${item.codigo.trim()} não encontrado.`)
        setSalvandoMov(false)
        return
      }

      const qtd = Number(item.quantidade)

      if (tipoMovimento === 'saida' && qtd > Number(produto.quantidade)) {
        setErroMov(
          `Saldo insuficiente para saída: ${produto.codigo} (${produto.descricao}) — saldo: ${produto.quantidade} ${produto.unidade}, necessário: ${qtd} ${produto.unidade}.`,
        )
        setSalvandoMov(false)
        return
      }

      const delta = tipoMovimento === 'saida' ? -qtd : qtd
      const novaQuantidade = Number(produto.quantidade) + delta

      const { error: erroEstoque } = await supabase
        .from('produtos')
        .update({ quantidade: novaQuantidade })
        .eq('id', produto.id)

      if (erroEstoque) {
        setErroMov('Erro ao atualizar o estoque: ' + erroEstoque.message)
        setSalvandoMov(false)
        return
      }

      const { error: erroMovDb } = await supabase.from('movimentacoes').insert({
        produto_id: produto.id,
        tipo: tipoMovimento === 'devolucao' ? 'entrada' : tipoMovimento,
        quantidade: qtd,
        data: dataMov + 'T00:00:00',
        ...(nota ? { nota_id: nota.id } : {}),
      })

      if (erroMovDb) {
        setErroMov('Erro ao registrar a movimentação: ' + erroMovDb.message)
        setSalvandoMov(false)
        return
      }

      produtoIds.push(produto.id)
    }

    await registrarLog(
      tipoMovimento === 'saida'
        ? 'registrou saída'
        : tipoMovimento === 'devolucao'
          ? 'registrou devolução'
          : 'registrou entrada',
      'movimentacao',
      `Registrada movimentação ${tipoMovimento} (${numeroNota.trim()}) com ${itensValidos.length} item(ns)`,
      produtoIds[0] || null,
    )

    setSalvandoMov(false)
    setModalMovimentacao(false)
    setMensagemMov({
      tipo: 'ok',
      texto: `Movimentação ${tipoMovimento} registrada com ${itensValidos.length} item(ns).`,
    })
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

        // VALIDAÇÃO: para notas de saída, verifica saldo antes de importar
        if (tipo === 'saida') {
          const semSaldo = []

          for (const item of dados.itens) {
            const { data: prodArr } = await supabase
              .from('produtos')
              .select('quantidade')
              .eq('codigo', item.codigo)
            const saldo = Number(prodArr?.[0]?.quantidade) || 0

            if (saldo < item.quantidade) {
              semSaldo.push(
                `${item.codigo} — ${item.descricao} (saldo: ${saldo}, necessário: ${item.quantidade})`,
              )
            }
          }

          if (semSaldo.length > 0) {
            resultados.push({
              arquivo: arquivo.name,
              ok: false,
              msg: `Nota ${dados.numero} NÃO importada — saldo insuficiente: ${semSaldo.join(' | ')}`,
            })
            continue
          }
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
    padding: 10mm 14mm;
    page-break-after: always;
    display: flex;
    flex-direction: column;
  }
  .pagina:last-child { page-break-after: avoid; }
  .cabecalho {
    border: 2px solid #1f2937;
    padding: 6px 10px;
    margin-bottom: 8px;
    border-radius: 4px;
  }
  .cab-linha {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2px;
    font-size: 11px;
  }
  .cab-linha:first-child {
    border-bottom: 1px solid #9ca3af;
    padding-bottom: 3px;
    margin-bottom: 4px;
  }
  .cab-label {
    font-size: 13px;
    font-weight: bold;
    letter-spacing: 1px;
  }
  .cab-data { font-size: 10px; color: #6b7280; align-self: flex-end; }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid #9ca3af;
    padding: 3px 6px;
    font-size: 10.5px;
    text-align: left;
  }
  th { background: #f3f4f6; font-size: 9.5px; text-transform: uppercase; font-weight: bold; }
  td.num, th.num { text-align: right; width: 28px; }
  td.cod, th.cod { width: 65px; font-family: monospace; }
  td.centro, th.centro { text-align: center; width: 35px; }
  td.vazio, th.vazio { width: 110px; background: #fffef0; text-align: center; }
  tr:nth-child(even) td { background: #f9fafb; }
  tr:nth-child(even) td.vazio { background: #fffde7; }
  .rodape { margin-top: 10px; }
  .rodape-campos {
    display: flex;
    gap: 40px;
    margin-bottom: 20px;
    padding: 6px 10px;
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
    margin-top: 24px;
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
          <button
            onClick={abrirModalMovimentacao}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <PackagePlus size={18} /> Nova Movimentação Manual
          </button>

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
                  {itensNf.map((item) => (
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

      {/* Modal de movimentação manual (entrada / saída / devolução) */}
      {modalMovimentacao && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-lg text-gray-800">
                Nova Movimentação Manual
              </h2>
              <button onClick={() => setModalMovimentacao(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              {/* Tipo de movimentação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de movimentação
                </label>
                <select
                  value={tipoMovimento}
                  onChange={(e) => setTipoMovimento(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                  <option value="devolucao">Devolução</option>
                </select>
              </div>

              {/* Nº da nota */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nº da nota *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={numeroNota}
                    onChange={(e) => setNumeroNota(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 12345"
                  />
                  <button
                    type="button"
                    onClick={carregarItensDaNota}
                    className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                  >
                    <ClipboardList size={16} /> Carregar itens
                  </button>
                </div>
              </div>

              {/* Itens */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700">Itens</h3>
                  <button
                    type="button"
                    onClick={adicionarItem}
                    className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus size={16} /> Adicionar item
                  </button>
                </div>

                {produtos.length > 0 && (
                  <datalist id="notas-mov-produtos">
                    {produtos.map((p) => (
                      <option
                        key={p.id}
                        value={p.codigo}
                        label={`${p.codigo} — ${p.descricao}`}
                      />
                    ))}
                  </datalist>
                )}

                <div className="flex flex-col gap-3">
                  {itens.map((item, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                        <div className="md:col-span-4">
                          <label className="block text-xs text-gray-500 mb-1">
                            Código *
                          </label>
                          <input
                            list="notas-mov-produtos"
                            type="text"
                            value={item.codigo}
                            onChange={(e) =>
                              atualizarItemProduto(index, e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">
                            Un.
                          </label>
                          <select
                            value={item.unidade}
                            onChange={(e) =>
                              atualizarItem(index, 'unidade', e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {[
                              'UN',
                              'CX',
                              'KG',
                              'LT',
                              'PC',
                              'PR',
                              'MT',
                              'GL',
                            ].map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">
                            Qtd. *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantidade}
                            onChange={(e) =>
                              atualizarItem(
                                index,
                                'quantidade',
                                Number(e.target.value),
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">
                            Preço unit.
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.preco_unitario}
                            onChange={(e) =>
                              atualizarItem(
                                index,
                                'preco_unitario',
                                Number(e.target.value),
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="md:col-span-2 flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => removerItem(index)}
                            className="text-gray-300 hover:text-red-500 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-500 truncate">
                          {item.descricao ||
                            (item.codigo ? 'Produto novo' : '')}
                        </p>
                        <p className="text-sm font-semibold text-gray-700">
                          Total:{' '}
                          {(
                            Number(item.quantidade) *
                            Number(item.preco_unitario || 0)
                          ).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex flex-wrap gap-6 text-sm text-gray-700">
                  <div>
                    <p className="text-xs text-gray-500">Total de itens</p>
                    <p className="font-bold text-gray-800">{totalItens}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total de volumes</p>
                    <p className="font-bold text-gray-800">{totalVolumes}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Valor total</p>
                    <p className="font-bold text-gray-800">
                      {totalValor.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Total de volumes (NF) para comparação com a nota física.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={dataMov}
                  onChange={(e) => setDataMov(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observação
                </label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Entrada manual via conferência"
                />
              </div>

              {erroMov && <p className="text-red-500 text-sm">{erroMov}</p>}

              <button
                onClick={salvarMovimentacao}
                disabled={salvandoMov}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                <Save size={18} />
                {salvandoMov ? 'Salvando...' : 'Concluir Movimentação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
