/* Peças partilhadas pelos módulos que conduzem a aplicação. */

export const API = 'http://127.0.0.1:8787'

/** Um sufixo diferente por corrida, para as contas não colidirem entre
 *  corridas nem entre módulos. */
export const marca = () => Math.random().toString(36).slice(2, 9)

/** Cria uma conta pela API, sem passar pela interface. Serve para MONTAR o
 *  cenário — o registo pela interface é testado no seu próprio módulo, e
 *  repetir 600 000 iterações de PBKDF2 em cada módulo levaria minutos. */
export async function criarConta (palco, { nome, papel, concelho = 'Ovar' }) {
  const endereco = `${papel}-${marca()}@exemplo.pt`
  const d = await palco.js(`
    const endereco = ${JSON.stringify(endereco)}
    const enc = new TextEncoder()
    const sal = await crypto.subtle.digest('SHA-256', enc.encode('tudopronto.v1:' + endereco))
    const mat = await crypto.subtle.importKey('raw', enc.encode('senhaDeTeste123'), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: sal, iterations: 600000, hash: 'SHA-256' }, mat, 256)
    const senha = btoa(String.fromCharCode(...new Uint8Array(bits)))
      .replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')
    const r = await fetch(${JSON.stringify(API)} + '/v1/registar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: ${JSON.stringify(nome)}, email: endereco, senha,
        e_dono: ${papel === 'dono'}, e_profissional: ${papel === 'profissional'},
        concelho: ${JSON.stringify(concelho)},
      }),
    })
    const d = await r.json()
    if (!r.ok) throw new Error('registar: ' + (d.erro || r.status))
    return { testemunho: d.testemunho, conta: d.conta, email: endereco }`)
  return d
}

/** Põe a sessão no armazenamento e RECARREGA o documento.
 *
 *  Recarregar não é zelo a mais: navegar para o mesmo documento com outro
 *  hash não recarrega nada — dispara `hashchange` e mais nada. A aplicação lê
 *  a sessão UMA vez, no arranque; sem recarregamento continuava a correr com
 *  `E.conta` a null e o encaminhador mandava tudo para o ecrã de entrada.
 *  Foi exactamente isso que aconteceu, e a fotografia da falha mostrava o
 *  ecrã «Entrar» onde se esperava o mercado. */
export async function entrarComo (palco, sessao, caminho = '/app/#/') {
  await palco.js(`localStorage.setItem('tp.sessao', ${JSON.stringify(JSON.stringify({
    testemunho: sessao.testemunho, conta: sessao.conta,
  }))}); return true`)
  await palco.ir(caminho)
  await palco.recarregar()
  await palco.esperar('#principal')
  await palco.js('return new Promise(r => setTimeout(r, 250))')
}

/** Fala com a API em nome de alguém. Para montar cenários que levariam
 *  dezenas de cliques. */
export async function comoEla (palco, testemunho, metodo, caminho, corpo) {
  return palco.js(`
    const r = await fetch(${JSON.stringify(API + caminho)}, {
      method: ${JSON.stringify(metodo)},
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ${JSON.stringify(testemunho)} },
      body: ${corpo === undefined ? 'undefined' : JSON.stringify(JSON.stringify(corpo))},
    })
    const d = await r.json().catch(() => null)
    if (!r.ok) throw new Error(${JSON.stringify(caminho)} + ': ' + (d?.erro || r.status))
    return d`)
}

export const AMANHA = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

/** Monta um alojamento com uma limpeza aberta no mercado. */
export async function cenarioComServico (palco, dona, extra = {}) {
  const al = await comoEla(palco, dona.testemunho, 'POST', '/v1/alojamentos', {
    nome: 'T2 da Praia', tipologia: 'T2', quartos: 2, camas: 3, casas_banho: 1,
    concelho: 'Ovar', freguesia: 'Esmoriz', morada: 'Rua das Gaivotas, 14',
    codigo_postal: '3885-000', acesso: 'Caixa de chaves ao lado da porta, código 4471',
    instrucoes: 'A máquina de lavar está na varanda.', registo_al: '12345/AL',
  })
  const sv = await comoEla(palco, dona.testemunho, 'POST', '/v1/servicos', {
    alojamento_id: al.alojamento.id, data: AMANHA,
    hora_inicio: '11:00', hora_limite: '15:00', tipo: 'saida',
    valor: 5400, muda_roupa: true, notas: 'Saem quatro pessoas.', ...extra,
  })
  return { alojamento: al.alojamento, servico: sv.servico }
}
