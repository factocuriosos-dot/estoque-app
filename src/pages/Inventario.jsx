import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Search,
  Printer,
} from 'lucide-react'

export default function Inventario() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

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

  const totalProdutos = produtos.length
  const abaixoMinimo = produtos.filter(
    (p) => p.quantidade <= p.quantidade_minima,
  ).length
  const totalItens = produtos.reduce((acc, p) => acc + Number(p.quantidade), 0)
  const valorTotal = produtos.reduce(
    (acc, p) => acc + Number(p.quantidade) * Number(p.preco_unitario),
    0,
  )

  const cards = [
    {
      label: 'Total de Produtos',
      valor: totalProdutos,
      icon: <Package size={22} />,
      cor: 'bg-blue-500',
    },
    {
      label: 'Abaixo do Mínimo',
      valor: abaixoMinimo,
      icon: <AlertTriangle size={22} />,
      cor: 'bg-red-500',
    },
    {
      label: 'Total em Estoque',
      valor: totalItens,
      icon: <TrendingUp size={22} />,
      cor: 'bg-green-500',
    },
    {
      label: 'Valor em Estoque',
      valor: valorTotal.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }),
      icon: <DollarSign size={22} />,
      cor: 'bg-purple-500',
    },
  ]

  // Gera o Mapa Cego para contagem física: produtos ordenados por código
  // (menor para o maior), com o estoque do sistema + coluna vazia para
  // anotar a contagem física durante a conferência no galpão.
  function imprimirMapaCego() {
    const ordenados = [...produtos].sort((a, b) =>
      a.codigo.localeCompare(b.codigo, undefined, { numeric: true }),
    )

    const dataHoje = new Date().toLocaleDateString('pt-BR')
    const horaAgora = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const linhas = ordenados
      .map(
        (p, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td>${p.codigo}</td>
          <td>${p.descricao}</td>
          <td class="centro">${p.unidade}</td>
          <td class="num">${p.quantidade}</td>
          <td class="vazio"></td>
          <td class="vazio"></td>
        </tr>`,
      )
      .join('')

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Mapa Cego de Inventário</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #1f2937;
    padding: 20px;
    font-size: 11px;
  }
  .cabecalho {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid #1f2937;
    padding: 10px 16px;
    margin-bottom: 6px;
    gap: 16px;
  }
  .cabecalho img {
    height: 70px;
    object-fit: contain;
  }
  .cabecalho .titulo {
    flex: 1;
    text-align: center;
  }
  .cabecalho h1 {
    font-size: 16px;
    margin: 0;
  }
  .cabecalho .espaco-direita {
    width: 70px;
  }
  .info-topo {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin-bottom: 12px;
    color: #4b5563;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid #9ca3af;
    padding: 5px 7px;
    font-size: 10.5px;
    text-align: left;
  }
  th {
    background: #f3f4f6;
    text-transform: uppercase;
    font-size: 9.5px;
  }
  td.num, th.num { text-align: right; }
  td.centro, th.centro { text-align: center; }
  td.vazio { background: #fffef5; }
  tr { break-inside: avoid; }
  @media print {
    body { padding: 0; }
    @page { margin: 12mm; }
    thead { display: table-header-group; }
  }
</style>
</head>
<body>

  <div class="cabecalho">
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOYAAADbCAMAAABOUB36AAABSlBMVEX///8oFW8mEm7Gw9LaJSQyIHTaJBz9/P3w8PDW19UoFW5lWo3///36+vr39/fb29nj4+Pt7e0kEmLe3t7n5+fUZWLu3dzPnZnhpJ/DwsIdAGnUQjvx8u69uM/WHhTREwbr6vCnpqQhCWt3b5tBMH6WjrLPzNvSqKYpDnFYTYp/eKLf3Ofe1NPTdXGAfYsWAGPaurojA3M/MnViVpCtpsYyInOyrcaQiK7NVE8dB1d1aaLl4+tLP4GblbMAAF3YlJFFN4A3Jm7lycfRfX25t8akoLhtZZW1rsnIxc5MQ3dbUINBNXVWSYt9cKTCwcuNiKnLJiXNLizORkTXbnHeHB7RSEDizsnb1OXPMjLPt7bQaGHQe3beubzLpqjHiIXcqabKvLjPlJODe53rxL/fkYrHVVErHVs6LWdlWoQeDVOsqbO6uLihlr+Vk5s4w/nEAAAcqklEQVR4nO1ca3vaSJYWhWUJIQQEOxfZcrQFKEZyVhlAwhshG2yDHZvESboTJ510u9uZnp2e7f3/X/ecKgkExjakM5edR+8z0zFIdXnrnDqXuiAIKVKkSJEiRYoUKVKkSJEiRYoUKVKkSJEiRYoUKVKkSJEiRYoUKVKkSJEiRYoUKVKkSJEiRYoUKVKk+KdBkgoADf9TkP7Znfm7ABhqmibLcpkB/oCPBenfiixSRIJrgBIC/0CuwPRfUKxqBPhj8UIoR+DIGFYqRY5KpYJkOdM7iPIG8T9/rPeLQ8VeS9LXkESOHFNMQaZ3E2XV/AOkznhppuNYVtbIZi3HCcxC4tGN4CTLgXOSPfL9wcD3j45eneQqE6Yo0rlEo4o1M4hbvYBWtejh30GyKEPTyYbVUY26DEov3/EtR+YadRvJTbnsnByF1UZN0RmINxqe+0cnkVSRKJfotVZV1urAbtUU3iqpta6gVZPPnm/MEeqTnSO767o6HYMAX7EVZoPCLQOLlse0jPORAkUJAAvif129Vx0c5YoTojBHpwUKlWrOUWdEkq1SqrukUc862jcWJyNphQ0KjYEkat1GK59vNXoefAFUvarvSDcorspIDvLEhTcp8XrdBmDU8xQkq+vd86OTMU+muROeSJIXhWaJF7Xa5a3qSt4Hot/SIqmqZtW7yJF2h+cD34AZgjPFD6/yNWhTJ0PfmTe0YBc1zWq3sF+036hehQOYlkdH/iA8t/M9goPU64BEc7lckdmiBE9QSWvQcLH65vA8ZK1eYKsD1iqgNXAK35Cn6gwaSLJZHWSn5WZafj0v6tCTqqHNKVgoBP4Q2WQaVyGfipXIvMKEOx/WdBBp9/xVhfGMFTcqHfgtJNmvhkfOVOWyY4RDTydUGfrmN2OpZaugYm733AhY39XYhzH5aZZf7UNvaqEzM7IqOACr06QKdCf0T8Z2tVKKooMgO7jqAVFlOMjluECZJZJYzVkbx6d5ZeDICuqkWaxbcnwbiuq1c0v64wLFWk0QJdF751mZfzPzHP7r+EMFiFazQtJ9q6pkGnkFzE0+fMVYFHk4sMYDPRbvOYaNYumGJ1M8BaHgN1xCPTtr8somDcf/mkc26BHJG9rtln4RmqA65yArpXpk3mjX4Gtn0KXE7fpT76hme8R08igX6WQpCu40Frjz8Nbx89DZvp1N8lTN0IMKW4Z5a9f8FgigOzD/EE0VJeLYCmhOGKi3DBk80KwhOIl+KE3EKZlhE7Ru6I8Vks+8pM9gca5VF8EGD4/Gr8la0AEtoHVHEm6MKVXW6pVIabNu/hG9RQ0MsPenhnz320GdkG0vjGYKlGUsxfMsZxmZ0euBDjA1/a5OxAnPTRhbhYrG7b1nw24OmpR65+bXcuT1mEOQR94q3K0UqiD7IAEvjLoGatckpDY95+aHpFJBNlq6MuHp2CKhNWh1gS7KBjgB73wBOdxciVkFMzl0pAV0H94oGDDJagOmBarW7lHSDCcW9CaSCAl03iVilc9P50oEE2oJC2QjqLhZ5Blqf0BvOyhLZ7F3oVOS4Sqka6AaSFmwSbWJn0i4w3kAz5N3iXeOsi+e91GW0iI0EQWjQUnfWCZjmu44aCFtOAubMYiyfeDZghLCRQusSuhELMvlOVH5dNmCBW6rj+OCyi4atw9LsqRaMLpgh5yvpRmAJznLLpHvAM/6HlFsSTBtiFjPmSxzKMtkqHpDZyUDjMnIKB6dEuL6qOQLNgpFwz7RWwu+P1tYAKfUby85RnIeZSIYCkQLVpHb2AVYYotaG4y6nb1SMm7Hgck8I05cKeMe9/rakQZeTwdntrxAVeEYFHA41ljpZiRLqQGY2/xxg9KGwVlW1nhYczfMjq54rZ7itiD4LU2VwsS8bK5xsCkw0+opaE+wPE3QP4+QZhCZAfTi5bX5wKBlUqxguBmlrxAxrEQquyhLQbAaVFEyMDG5bR6LEzmulXYOPn/+/OXLwc4Of5jI2FTVaBI9v7yxVYW6TpQw/iiV7x8cHHx+Ng8H9+WkesktPaNkYpVlE3NBlqo6oEoGVJaFv1iQt61tlkufD3c/vF5ZWV1dff3m7XeX72H0NqeUGsKYvYtlWYK639sm3UkPPr998/gGbF2uTRG50DMZ0huMVZYLBQZ/vp4naApOVQeP9KrIImAoKTGW5fsPd1e3vv9+dWP9ux9236x+v7r15ulBZXr8nDPwCsvTrJMMMSbxKejNl/XVrVXE1sY7wMbG6xX2aeVBRU72W7b1DLUrxdhjalg4WpqNV2fnmlGYWm3Qg7oTFS2jlhTkNWh4BbD7YAcTufeHH1ah4TeHO6VykqetZJYVJ9hoGJwXE12XYHaUnryNaD54lNsBHFw+3UAtepArJyeF1nYVpRPRRGGqwpeHD/cTePilPDciUs0rN0NbJ0WetOEIafL9hx+Q5eunH9kCQ6lSfLaBrFfWn1WS1hjEqQ+Xm52qYIjEPZ4qVJDfr8c0c8U1XD0vVZ79sLI1S9Mc0QzNv+JJNNMs6fJw/cNYx9/98Ony/jzfr6oQOmUU6kcJOEgLWO6vMFkCSzRmaApLnz8wnrtPihN5qkKVZFxzKWOr4owWZ9Jy7X5E8/GTCkgDALp48N01aVpgaiFmZ0uTXPFUTd78ssEKb22tfyxi6DenO6owgGmt6Ha0CAYKX77/5xVO6cdcKbJ0mlzaZ9+t7n4e88SFI4/o7eXEaZ4R1xZupFlka7OSWtDKT96tPCgmaWodoKmQqwoTJusGvlf8xAu/+elRpTw3klOFACyQCDYoXk8BfXn4mjF6DaXG9lwr77zl5Nc/Anee+MH/u4S0lqEJoUGf7Fkz387QBFliUHL/0+vLKZpml0BfudaCzsbL8mv7j1nhjV9y5ZsMLeis2OgRasTLRsXPH77ncvsxlzDnWml/lfM83FmbmL8OVcRltFYFs0XuzXZmlub9ywOQSvnhxmVJTtTtuKTWEMGjVFBnx33bfBjRBLt8U7s+pd32kOr1aI069349pvNz0pprawd8dq68A00aG22LkIRzWASnlOZnv5uhqR2sX4Kl076sXyZGVIUkhTQ6PQgtKsyIxA9kTnPrFppy6OrViytommttLveAk1n58EuulHBB0uZOzP+796Vx41KfEHsJkkLQpW44++UMTfnLW+SngVA3x12AdNrWad7IUx0m50RnGc2tO2hCcOCGUgiaENH8+dfvOZm3T3JrU5FW5TCiCdWVx9tVkPwtFSFkm8SdnZozNAtrTFvB3GqJXBKS+QbNVB3gOjyZormA0lojSo8EHyZnlgvzyeuV2NQUpya0VrrcWhnPznh/TOjopLnMzmC7T1zzVpqS9n594xInjCSpyW0P2SPeVSXUaesIaY4fbd6ttNka8bJCtgHpJqP5KBbZytOfi1OBVmHt80o8As8ms9ZwSX/BtQ6GjkfFa4sOCZq5NXnt8vWcHquC6aLPHFDS9YGmtgxNg9CRJTh5mDA5RvPX1bHIpuNJae0gFvTGk7GgVbB+ME6Lw1Zo95rJStIsVj7vPt54ULxO09kjzUHJZ6a2MrFAC9F0ceHJrFK9w2j+HJnTldeHUxYIE6aD8bNfivG0VbW9jOgvQbNKaOuaAxrT3Prpxyf7u1tbc2laeyDH0hHo37I0wUbrQ0eQgGaV0fwYS+zNT7M0N99vxFr7U2JyupDmLkFzOC8KHtNcfbf77vUWWpNrNGGCubRrVI56RBwk/ckCJkgbuLodCJJN9SGj+ePKTTQFoDlR6FIUOaqCQpT6cjRf3izNVcjBtrbm91gFzXuRrRxBKDSX5i3S1EJGU7ApjWjGTD5coym/f5ukGX8tEqXzzWiC0j7487stJs3ZlzjNIkjzH09T/Qqaz693Y0zzCeSblxtb82iC0pIXRvFGpb2N5hJKewPN5ZW2dTNNdCjlysN50uQmCGhyE7S2zNyUBrMm6Ja5efAtTNBdDqVYhiR7F8MDfElNrO6o3KEcibTHaN7tNyf+OXIowwUcymbCocRxIERge2Qph9IRiXg7TaFQ2o9SE3bcMHZdKoQH/bCEuYa/SBQkQfAfB4TXwoPd7+eYmYhm7Gze4ZhHNGGIlwoPMNi7plrTMa2KoTvLDgqbl5CqRIOiQrAndibB3mxMO0tTkx/IseZna7SGwR51/cpssFeZCfaeRU9W1z9+fbBn9DCrnhHnvERMZt8/fTjOOFVthKH71YKhOwzWh7U4xYDQXTeE4x7Reej+6Mk4cP04HdNOhe4TQdchdF9mJ8XpEvfaskpyLQh6WmBpNS6FXUZi5TQhOflrlIgVE6Z2vjQLa083SnGw5gwpT8RqcSL2NtLa3R9z5WQiplUOOU00g5MnyyZiwum2e2taXcZZxaakhMskT0pR11W1cOzSxu88rZ6zejBDU7v/ereyFo2nWQeP4iTT6l8irYW0ei0pJnmSVn+cpNWCt2RajYskyq00JXaWRsI18csPG88mNNEO1Br3cNk9uRY0l6ZaKO8//qFSjj/7OlskcTt8kaSSG3tHUM2E1hbK79/w7zcgcJ8skijLLZKowrF325LXg2LcM2D5eXdr92PCEJo9qmQUms+Ol2mTNKfmpirf33j8KVeOW81C0UaPuJMlr8vJ5ExorVbaj6bmpyT9DiX3zKVW9swzos/KfzNejn6MKiSxo8Dl0hNIVX74OUFT6+iKotArh68ox+JM0oy6UpDXnm5t7efGtIOqniEkXsDEozM7h1GA8EtuwqdQ3tnlUv71WTIJ6hJyutSKF1uOVqTk5j8o2MFuFOx9epTDrZBSZefgz2+24PPPyZUay81kxsvRY3GWowXMNzhG7PDTZrmy/xpUYyxdthytZFw7F6+6y+X36xNxRoSkzdJDzvLtg+I4AIH4y5tjN++gaXiKezyJ3lUQ3M7+Bk9Qvl/56fOzg4NnT/Z/ePMYUpWt/Z2kHTQbuLmQTe73SNJmJVqOXjl8lGOH9oo7B4crGCBXtHGrbHOB+JM9FK18sB4FQj8XcU9TkjRz7YDPzLcwMcfrwKpQzRC65OaCWgANGCW2iu4ffPnzxlYkzdXHwG6LbYiswh+rl1POGzINhVwFnCb2VZXkcuXgXZTFffj04BLxy1NUhNWtg7HCQwh1RaOtomiEJOT5mhubn4t4uKi8VjlAlV1FWZbGFk4VgiYmyctJUxLqYLYmgZP67Idfd2/C+rNpa3+uZzI4NSedPfiy/xYlucK3CiPgN6uvd8YKD5Z7QDJ654QfY8SNCVXVyvcPWZj+5vDjzk6xuPP+ksWAb9afFNeS+8cQoLrXQpo7YfYJaYxlBE6yvHZ/Zz5KU82hXc+Qrl+ZHLAoPPz06ekNOJzEvaoaVEGajVfx+GgC38W9/O4t7qW+e7r/8OHh+gqw/LC7/74y1azTpfR0SY6IuqvcG4f7zKomwU+LcmxOHRQxmbmk8TkS3D2XNXlzso87hTVzsqOram0RRkg/jzerkQXkHXL5/pPDX9/ipjxuAr7Z2P1h/wBDjwRLCTy9u0zYHjUpmE1KusFY2TEYmHugfWp7UMXlA+I1+c7f5CTJLZj0VbLy7IhF/ygSJj8uzDa7S+8//3L46el3IP79B8922FxIWEgBj1gMv+q4adslir3sUTjVgdHJt1uUtoyx2uL0vLOkJAXg3/t53HQ+mTpIwnWJOTCcnexY7pQCgf3JE+JdfA1NVcKTTP6yx5+qkAwNJN8DtT2pJM4l3sVTLZhtLGTYItHrzmwRfpklukB37U6ZjPYn/JrDw3jkuQbJcXaJyx6qIIWoAiY7zOZ12FkJdmhm/sbtFA3ZGFHaOKocNQgRfXPOwKiFeZchgZw2wFNBX3122KcQPlmLD5LKSrTwroYFqtCcTM/bz5kyYfES4Eygz7RnLHBlLGqUH03sWl99ArPQ0YkyXCIfN0RCmuygKW964BQTentzx2HuWUOdeFfskPF5n+iN7MKyUbMNUB1/gUPGN5QH3XOR56LyNPpgQ3x+ZFPD09kzPG88HY0sKbTEPSYejtYb1kIRDQxoFs/r/aFjw7izCq0vorfg33yIKJSBFn00wz7wDHPF+NrCDUTxXGXZAFeSyR9FM9mpKkQ/NRawCjAv8dAwqZtfw25SjQOWk5zOuzE0iyD0qELDyZ1DxrN5xe1tgmjioCg7OyrLAd50URhLln5tOjYhbnewQKsm3gxRzpdJM+dBdWx2Gya45fQwvwNUFQmlfrJnZtijRBz6Ec/4tlvyHgqLrdjNo8yYJbiMArhQhXrnjnBrs4JwYcPUEEPzj5FEBOeU0H7VuPEaIbIEeYCeeTNSN30Yato4PylGRIv8kvFU0BgM8hkYjeqryWUVcD5mqCswXfybbwyx+055aLU3+AYsBagML6x1r26+MGH6Q7wD1LCmdrixH0YLeHr5kBMt5pJ3xBgCv4p3cvr1k7Gl4i5WNkRQo6advdE8awYW1VuG9i2uceIViKFLqPLiKquxz6oqxDe68YVgMGxCrK7Xg1ljB0UvbBFY1P56fsLPKka34dhCT6XkDKpdvLLa8E+u3fiTnOEetNq12QWq+N4628zgQ4tFqWJffLO7jYUgbCLR7rCejQ1phMCwT8HAkr1Wdt4OEN6Ga7h4repFNcyOL46z242Wf3UK46PoHmSY4wu5iVh+7bgGRTPNfCeqe9yqaXTyUBTcjl/+RhwZtIsO6hD1uqfVumE5JsDJ+p3haVOhaBX9G5cntKDdg94Ssfkib9f9o6xlWdmj0B6+aIrYUwKzMnG9ehITQugY1PFOH/XOoFU/atXy68PTM5FuU70ZBgvcd0pCxct3t8G07D6KhSpe8+wF4qzZ9xSQhut22055fqlN/MWKkhOe7VF8Vew3z6DwGS+qQIp4b3h0wu9xjC/LJbFmdfouReX0+rzVF2d97x5e0XbPQsdkDdyKzamznoVyKXcXXoWnf/mve/f+K4F7937776p/clfJR68Gf/3Lb7/9liwKH397cfW3/+F4hJhX9ORkkP/Lb/emi9777S/5wZ2t8sFLLOCYL18O8wugNerfm0Gz0WotUvS00Zwt2u82ThO4pdVrRZuNhRrNX/3tUa48ofknsgAyCuT2s4DvlAXKKpnrRaEs/u+ukgxzWr272Qx98Z//8agkJWhe78Q3wR+uF+bvnjtneBdr/R9Fc54QlwLp+dLv9OtqUUh/Dk2uHbGqZCbaxP5kbcID/hX7JYqkYmWU+CWsniTbGtcy+Zs9hya2Jy8S3h7T5PhN3HMamr5O4s4kVZz1RomKxfVEXb+TJhF7jcaZhy2A3WfoE7F/5uEINM/E7eb4a6XP/+0rjCfpnzV59/t9L9H9Pnu/L+JLXjMqK/KBaTbxD96y2Bw1ulAX6yz/kIEyvVYfXlSajQZYIkI8aJ53QPHO+viu14NXPcLrgcb4TGYjP5cmezg6xm+NBiHb8dOs3rrArUCyfSFUdTP6Vmp32e0WybSqHvOB8LFGMxnasIKOPqbpGuxuEAQJVKm1o8LOkDJxBtpzGsmy0UbL79h9qIv22ljIrOMimODkIVAK2Oea24k7HfQ6glUjpMfyEyuP46MQQzCHOhfnTTSBP204guwEMp6PphC1Bxh4GHrLEtj2hgM0L+BLVQ3MoD6yBBlekPFuMrKD4PJ3vJzRcLSQN4VCcrOqBpVogtOjQFNjVWYxjc4o25rw3GXvkYYFjxyzIIRArQe9gA+Sekw5zY5ccCynINSJDS2rKrRr1epAE9fksJxg5kHfSQ8v5+oKl6VynSbvFBENGGjdfWkKHZCm9FLfBhAKNIXsiOqO8FIh23pV0ODBnxpWIYR/hw52TXGPBWhMB1EwmmzqcZqCQbZFW5OOXaCZZVVuE6ZTSFNnkwieBLa+V/M1zSa6oZov9T3xWApG0JjTgm75yp5uaFaXbP/JNdU61CIiTTJQoZzbctQ29EHvCLJgdul4Bs7QdLlFoM8dPEmdccN2nlCh8Fxn8x5oqgUpFP8ENDHWfgk04VukuUd1MSu0QXk8U6hqwks9SZMpLdDMkG03FMwMozl2hpkJTZo3C22ss2cJbW9kCjakm1Q87vQ4zWMhC7H6yLZh6pA9oOmCSICmBxoVYsDZab8UMxk9UEPeOCd6jSbvk34uB0MdXtDxd28EtW13Oh27C0prOhqIGWjiQ6SJUrMkH2IXmDYdMaN3CqZrCNaEZmZCE115SzAbXhsmH1TZaaGoI5r4J6hmwOaU6wtWt6NJYMxEEeJ2hdHUz03MSvCXWqB9kObv0GGkKVYD7Qo7r+vQbdoQZFBlRyQRz+s0GU99IDl5ymYvTJz4oQ0mKKhnBb/GlDYhTZgjgamZuOqkw7C6LUGCOT2HJpj9kSA/9+Ld5DbY3cyEZiZjC04DG3bbBacRamYTZkr4e1h/qbO5WQvxN2ZkI48v75m4j8Vp2qZZ1SMXosAwZ/daEii8Mt+h6Jy9HiJN7IBOgaaa9QHtFtA0q7ap2QlpcpqBBcMc1nDzVRZejrqS2nZvpxlglUZVzCRpKkizRVFSbclp1JGm/rsA/TP2GE1db4VZRwZJk2s0baSJHSaipNa7eUc1bqLJLS1oHh8cvXo1AhNUeL7nujrkmUDT3gZ1MmFuJmkW2qIdaD7Mef24IEAeqamBiDTreuy8lJjmUDBHODf3dN11KXsc0cRJVEWlgW8oCKT7UhYaFKQZBpLhotLWhtWmS7ttWRhO0/SGjnQOpPT8VUtxbUG9yEIngxGdb4IimsAHLICue47WYSbIxd8Xo4ymi5sGIE1QbUYzw0yQSzsyWCBaCwQHUSjYbsOR63vsh8kimscUZo4vOGhPsy7/zbJMTJN/blwIRg/+ZWYbKjsWdXdPdCQuzYZhdmB0RoEwnFZaD/yJ0YTasxr02xEC7IOstXXlFpowIduFYDCs+gVpSAlEADZiqCBNXa/LglBVIpoZZoKAZs0HvwmOTbPxp7YswQKamlHFgl2cgEDTgr/bmlRHh+KwJ3aXRDRZE9WeV5dk3x6esxOYeqgV/Gre9jXBR2nme+DnOvkqeJvWtDRrFPTPrw4HMnjAEXSvlW8NDXQ03J815wd7dORrUhAIuG+8jT9vx3x5jdEktSzUw6UpMaW9kNou6IsjWODcDQ9/BwtcagtCDFYwuEK3ggcC4IMg+yKpHUPQxB7ZzI9sS/xN56Xb9cHjgZ1x0Gd4bZjy4PO17BBqDPJ6lUUtghZC/wmnSThNDIKCQJWMHhiggP2CG5sALPbLzKPJeHbrhmUZdfRPRoSw1g39FoUZ6xsteI22jGMMonuhX4XeUts4ft42hizarxn+814YFRzieS+9zv72Ox5VPDuuM89cOPH5J6idNjtG1soOhugNiNjx4YNfH+mkZbRH+KNdWewWk5J+bLxEgzPEbtJeBzsc9ojeNmwMgEi3fcxpZm6IabGjFEL3GsUgtRZDEWs1NI0K/gNvib0ai6ZqNY/1qdar1XrcRSjwtxKXY2F5Bp9CHczleb2pR5n4IyQGhNYaja5ICXN4ujdqjEA/FGwMGqVil3WLPaz1oF1wrNAUdhjK9TDigBcJc4ZercaDE3JNmpOMDpOsTJRYTdIfVi5OoAivLs5/oryI2dYoQxon/uPka/LmdN5ExvkXS+8SvaDjMtgk5d2K2+BlpzocrW8o437NSau/PZRFF1C+FTKYDE81SF/87/88WpvQ9DxP/HvB8/6etV9ra+pz/m+5xM0nyXGs7L8jrEpJnj70IN32IzL/b/Gv+DvGKVKkSJEiRYoUKVKkSJEiRYoUKVKkSJEiRYoUKVKkSJEiRYoUKVKkSJEiRYoUKVKkSJEiRYoUKVKkSJEixRz8H/MWt/kreAleAAAAAElFTkSuQmCC" alt="Logo" />
    <div class="titulo">
      <h1>MAPA CEGO DE INVENTÁRIO</h1>
    </div>
    <div class="espaco-direita"></div>
  </div>

  <div class="info-topo">
    <span>Data da contagem: ${dataHoje} — ${horaAgora}</span>
    <span>Conferente: ____________________________</span>
    <span>Total de itens: ${ordenados.length}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Código</th>
        <th>Descrição</th>
        <th class="centro">UN</th>
        <th class="num">Estoque (Sistema)</th>
        <th class="centro">1ª Contagem</th>
        <th class="centro">2ª Contagem</th>
      </tr>
    </thead>
    <tbody>
      ${linhas}
    </tbody>
  </table>

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
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Inventário</h1>
        <button
          onClick={imprimirMapaCego}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          <Printer size={18} />
          Imprimir Mapa Cego
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-xl shadow p-4 flex items-center gap-4"
          >
            <div className={`${card.cor} text-white p-3 rounded-lg`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-xl font-bold text-gray-800">{card.valor}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas estoque mínimo */}
      {abaixoMinimo > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
            <AlertTriangle size={18} />
            {abaixoMinimo} produto(s) abaixo do estoque mínimo
          </div>
          <div className="flex flex-wrap gap-2">
            {produtos
              .filter((p) => p.quantidade <= p.quantidade_minima)
              .map((p) => (
                <span
                  key={p.id}
                  className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full"
                >
                  {p.descricao} ({p.quantidade} {p.unidade})
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-center">UN</th>
              <th className="px-4 py-3 text-right">Estoque</th>
              <th className="px-4 py-3 text-right">Mínimo</th>
              <th className="px-4 py-3 text-right">Valor Unit.</th>
              <th className="px-4 py-3 text-right">Valor Total</th>
              <th className="px-4 py-3 text-center">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              filtrados.map((p) => {
                const valorTotalProd =
                  Number(p.quantidade) * Number(p.preco_unitario)
                const abaixo = p.quantidade <= p.quantidade_minima
                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-gray-50 ${abaixo ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono">{p.codigo}</td>
                    <td className="px-4 py-3">{p.descricao}</td>
                    <td className="px-4 py-3 text-center">{p.unidade}</td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${abaixo ? 'text-red-600' : 'text-green-600'}`}
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
                    <td className="px-4 py-3 text-right font-semibold">
                      {valorTotalProd.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${abaixo ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                      >
                        {abaixo ? '⚠ Baixo' : '✓ OK'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
