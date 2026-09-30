import { useRef } from 'react'
import { Printer, X } from 'lucide-react'

export default function ValePaletePrint({ vale, onClose }) {
  const printRef = useRef()

  function handlePrint() {
    const content = printRef.current
    const windowPrint = window.open('', '', 'width=800,height=600')
    
    windowPrint.document.write(`
      <html>
        <head>
          <title>Vale Palete ${vale.numero}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { font-size: 24px; margin-bottom: 5px; }
            .header p { font-size: 14px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
            .info-item { margin-bottom: 8px; }
            .info-item label { font-weight: bold; font-size: 12px; display: block; }
            .info-item span { font-size: 14px; }
            .section { margin-bottom: 20px; }
            .section h2 { font-size: 16px; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 14px; }
            th { background-color: #f0f0f0; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
            .signature-line { border-top: 1px solid #000; padding-top: 5px; text-align: center; font-size: 12px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; border-top: 1px solid #000; padding-top: 10px; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>VALE PALETE</h1>
            <p>Nº ${vale.numero} - ${new Date(vale.data_emissao).toLocaleDateString('pt-BR')}</p>
          </div>

          <div class="section">
            <h2>Dados da Transportadora</h2>
            <div class="info-grid">
              <div class="info-item">
                <label>Transportadora:</label>
                <span>${vale.transportadoras?.nome_fantasia || vale.transportadoras?.razao_social || '-'}</span>
              </div>
              <div class="info-item">
                <label>Conferente:</label>
                <span>${vale.motorista || '-'}</span>
              </div>
              <div class="info-item">
                <label>Placa:</label>
                <span>${vale.placa || '-'}</span>
              </div>
              <div class="info-item">
                <label>Data:</label>
                <span>${new Date(vale.data_emissao).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Dados dos Paletes</h2>
            <table>
              <thead>
                <tr>
                  <th>Tipo de Palete</th>
                  <th>Movimentação</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${vale.tipos_palete?.nome || '-'}</td>
                  <td>${vale.tipo_movimentacao === 'RETIRADA' ? 'Retirada' : 'Devolução'}</td>
                  <td>${vale.quantidade}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${vale.observacoes ? `
          <div class="section">
            <h2>Observações</h2>
            <p style="font-size: 14px; white-space: pre-wrap;">${vale.observacoes}</p>
          </div>
          ` : ''}

          <div class="signatures">
            <div class="signature-line">
              <p>Conferente da Transportadora</p>
              <p style="margin-top: 20px;">${vale.asinatura_conferente_transportadora || '_________________________'}</p>
            </div>
            <div class="signature-line">
              <p>Conferente do CD</p>
              <p style="margin-top: 20px;">${vale.asinatura_conferente_cd || '_________________________'}</p>
            </div>
          </div>

          <div class="footer">
            <p>Documento emitido em ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </body>
      </html>
    `)
    
    windowPrint.document.close()
    windowPrint.focus()
    setTimeout(() => {
      windowPrint.print()
      windowPrint.close()
    }, 250)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header com ações */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">Vale Palete {vale.numero}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Printer size={18} />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Conteúdo do vale */}
        <div ref={printRef} className="p-6">
          {/* Cabeçalho */}
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <h1 className="text-2xl font-bold">VALE PALETE</h1>
            <p className="text-sm mt-1">
              Nº {vale.numero} - {new Date(vale.data_emissao).toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Dados da Transportadora */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold border-b border-black pb-2 mb-3">
              Dados da Transportadora
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block">Transportadora:</label>
                <span className="text-sm">{vale.transportadoras?.nome_fantasia || vale.transportadoras?.razao_social || '-'}</span>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block">Conferente:</label>
                <span className="text-sm">{vale.motorista || '-'}</span>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block">Placa:</label>
                <span className="text-sm">{vale.placa || '-'}</span>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block">Data:</label>
                <span className="text-sm">{new Date(vale.data_emissao).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>

          {/* Dados dos Paletes */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold border-b border-black pb-2 mb-3">
              Dados dos Paletes
            </h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-3 py-2 text-left text-sm">Tipo de Palete</th>
                  <th className="border border-black px-3 py-2 text-left text-sm">Movimentação</th>
                  <th className="border border-black px-3 py-2 text-center text-sm">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black px-3 py-2 text-sm">{vale.tipos_palete?.nome || '-'}</td>
                  <td className="border border-black px-3 py-2 text-sm">
                    {vale.tipo_movimentacao === 'RETIRADA' ? 'Retirada' : 'Devolução'}
                  </td>
                  <td className="border border-black px-3 py-2 text-center text-sm">{vale.quantidade}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Observações */}
          {vale.observacoes && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold border-b border-black pb-2 mb-3">
                Observações
              </h2>
              <p className="text-sm whitespace-pre-wrap">{vale.observacoes}</p>
            </div>
          )}

          {/* Assinaturas */}
          <div className="grid grid-cols-2 gap-8 mt-10">
            <div className="text-center">
              <div className="border-t border-black pt-2">
                <p className="text-xs">Conferente da Transportadora</p>
                <p className="text-sm mt-4">
                  {vale.asinatura_conferente_transportadora || '_________________________'}
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-2">
                <p className="text-xs">Conferente do CD</p>
                <p className="text-sm mt-4">
                  {vale.asinatura_conferente_cd || '_________________________'}
                </p>
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div className="text-center text-xs mt-8 pt-4 border-t border-black">
            <p>Documento emitido em {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
