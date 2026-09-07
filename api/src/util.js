// Utilitarios do Worker. Tudo aqui tem de caber em 10 ms de CPU: e o tecto do
// plano gratuito do Workers, e e CPU, nao tempo de parede (esperar pelo D1 nao
// conta). Por isso nao ha aqui um unico ciclo criptografico pesado.

export const AGORA = () => new Date().toISOString()

/** Id opaco de 32 hexadecimais. Nunca sequencial: um id sequencial deixa
 *  adivinhar quantas contas existem e enumerar as casas de outras pessoas. */
export function novoId () {
  return crypto.randomUUID().replace(/-/g, '')
}

const HEX = '0123456789abcdef'
export function paraHex (buf) {
  const b = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < b.length; i++) s += HEX[b[i] >> 4] + HEX[b[i] & 15]
  return s
}

export async function sha256 (texto) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return paraHex(d)
}

/** Comparacao em tempo constante. Um `===` sobre um resumo de senha vaza o
 *  numero de caracteres certos pelo tempo que leva a devolver false. */
export function iguais (a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let dif = 0
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return dif === 0
}

/** Codigo de 6 algarismos sem enviesamento. `% 1000000` sobre 32 bits enviesa
 *  os primeiros valores; rejeitar acima do maior multiplo nao. */
export function codigo6 () {
  const lim = Math.floor(0xFFFFFFFF / 1000000) * 1000000
  const u = new Uint32Array(1)
  do { crypto.getRandomValues(u) } while (u[0] >= lim)
  return String(u[0] % 1000000).padStart(6, '0')
}

export function testemunho () {
  const b = new Uint8Array(32)
  crypto.getRandomValues(b)
  return paraHex(b)
}

// ───────────────────────────── respostas ─────────────────────────────

export const ORIGENS_PERMITIDAS = [
  'https://tudopronto.pt',
  'https://www.tudopronto.pt',
  'https://renatovalente5.github.io',
]

/** Em desenvolvimento a bateria de browser corre numa porta SORTEADA — uma
 *  porta fixa faz a segunda corrida encontrar o servidor da primeira ainda
 *  vivo. Por isso qualquer porta de localhost serve, mas SO fora de producao:
 *  em producao a lista e fechada e nao ha excepcao nenhuma. */
function origemAceita (origem, env) {
  if (!origem) return false
  if (ORIGENS_PERMITIDAS.includes(origem)) return true
  if (env?.AMBIENTE === 'producao' || env?.AMBIENTE === undefined) return false
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origem)
}

export function cabecalhosCORS (pedido, env) {
  const origem = pedido.headers.get('Origin')
  const h = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
  // Devolver o Origin que vier, seja ele qual for, e o mesmo que nao ter CORS.
  if (origemAceita(origem, env)) h['Access-Control-Allow-Origin'] = origem
  return h
}

export function json (dados, estado = 200, extra = {}) {
  return new Response(JSON.stringify(dados), {
    status: estado,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...extra,
    },
  })
}

/** Erro com mensagem para pessoas. A mensagem chega a interface, por isso e
 *  escrita em portugues e diz o que fazer, nao o que falhou por dentro. */
export class Erro extends Error {
  constructor (estado, mensagem, campo) {
    super(mensagem)
    this.estado = estado
    this.campo = campo
  }
}
export const erro = (estado, mensagem, campo) => { throw new Erro(estado, mensagem, campo) }

// ───────────────────────────── validacao ─────────────────────────────

export function texto (v, { campo, min = 0, max = 2000, obrigatorio = true } = {}) {
  if (v === undefined || v === null || v === '') {
    if (obrigatorio) erro(400, `Falta preencher: ${campo}.`, campo)
    return null
  }
  if (typeof v !== 'string') erro(400, `${campo}: valor inválido.`, campo)
  const s = v.trim().normalize('NFC')
  if (s.length < min) erro(400, `${campo}: escreva pelo menos ${min} caracteres.`, campo)
  if (s.length > max) erro(400, `${campo}: no máximo ${max} caracteres.`, campo)
  return s
}

export function inteiro (v, { campo, min = 0, max = 1e9, obrigatorio = true, omissao = null } = {}) {
  if (v === undefined || v === null || v === '') {
    if (obrigatorio) erro(400, `Falta preencher: ${campo}.`, campo)
    return omissao
  }
  const n = Number(v)
  if (!Number.isInteger(n)) erro(400, `${campo}: tem de ser um número inteiro.`, campo)
  if (n < min || n > max) erro(400, `${campo}: tem de estar entre ${min} e ${max}.`, campo)
  return n
}

export function booleano (v, omissao = false) {
  if (v === undefined || v === null) return omissao
  return v === true || v === 1 || v === '1' || v === 'true'
}

export function daLista (v, lista, { campo, obrigatorio = true, omissao = null } = {}) {
  if (v === undefined || v === null || v === '') {
    if (obrigatorio) erro(400, `Falta escolher: ${campo}.`, campo)
    return omissao
  }
  if (!lista.includes(v)) erro(400, `${campo}: valor não permitido.`, campo)
  return v
}

/** Email. Nao tento validar com uma expressao perfeita (nao existe): valido a
 *  forma minima e normalizo para minusculas, que e o que a base espera. */
export function email (v) {
  const s = texto(v, { campo: 'email', max: 254 }).toLowerCase()
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(s)) erro(400, 'Esse endereco de email não parece valido.', 'email')
  return s
}

export function data (v, campo = 'data') {
  const s = texto(v, { campo })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) erro(400, `${campo}: use o formato AAAA-MM-DD.`, campo)
  const d = new Date(s + 'T12:00:00Z')
  if (Number.isNaN(d.getTime())) erro(400, `${campo}: essa data não existe.`, campo)
  return s
}

export function hora (v, campo = 'hora') {
  const s = texto(v, { campo })
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) erro(400, `${campo}: use o formato HH:MM.`, campo)
  return s
}

/** Telefone portugues ou internacional, guardado normalizado. */
export function telefone (v, obrigatorio = false) {
  if (!v) { if (obrigatorio) erro(400, 'Falta o telefone.', 'telefone'); return null }
  const s = String(v).replace(/[\s.\-()]/g, '')
  if (!/^(\+\d{6,15}|\d{9})$/.test(s)) erro(400, 'Escreva 9 algarismos, ou +351 e o número.', 'telefone')
  return s.startsWith('+') ? s : '+351' + s
}

// ─────────────────────── travao de abuso ───────────────────────
// O travao vive no servidor. Guardar o IP seria guardar um dado pessoal sem
// necessidade; guardar o resumo do prefixo com um sal que muda todos os dias
// trava o abuso e deixa de identificar quem seja depois da meia-noite.

function prefixoIP (ip) {
  if (!ip) return 'sem-ip'
  if (ip.includes(':')) {
    // IPv6: resumir o /64. Um /64 domestico tem 2^64 enderecos — travar por
    // endereco nao travava nada, bastava mudar de endereco dentro da mesma casa.
    const p = ip.split(':')
    return p.slice(0, 4).join(':') + '::/64'
  }
  return ip
}

/** Fora de producao a bateria de browser cria dezenas de contas do mesmo IP
 *  em segundos, e o travao — a funcionar bem — travava-a. Os tectos sobem 50x
 *  em desenvolvimento e ficam INTACTOS em producao. A regra e a de sempre:
 *  se `AMBIENTE` nao estiver definido, e producao. Falhar fechado. */
export const factorTecto = (env) =>
  (env?.AMBIENTE === 'producao' || env?.AMBIENTE === undefined) ? 1 : 50

export async function travar (env, pedido, acao, tecto, janelaMin = 60) {
  const ip = pedido.headers.get('CF-Connecting-IP')
  const dia = AGORA().slice(0, 10)
  // O sal do dia sai de um segredo. Sem segredo, o travao NAO abre: falhar
  // aberto num travao de abuso e nao ter travao nenhum.
  if (!env.SAL_TRAVAO) erro(503, 'Serviço indisponível de momento. Tente daqui a pouco.')
  const chave = await sha256(`${env.SAL_TRAVAO}|${dia}|${acao}|${prefixoIP(ip)}`)
  const agora = AGORA()
  const limite = new Date(Date.now() - janelaMin * 60000).toISOString()

  const l = await env.BD.prepare(
    'SELECT contagem, primeiro FROM travao WHERE chave = ?1'
  ).bind(chave).first()

  if (!l) {
    await env.BD.prepare(
      'INSERT INTO travao (chave, contagem, primeiro, ultimo) VALUES (?1, 1, ?2, ?2)'
    ).bind(chave, agora).run()
    return
  }
  if (l.primeiro < limite) {
    await env.BD.prepare(
      'UPDATE travao SET contagem = 1, primeiro = ?2, ultimo = ?2 WHERE chave = ?1'
    ).bind(chave, agora).run()
    return
  }
  if (l.contagem >= tecto * factorTecto(env)) {
    erro(429, 'Demasiadas tentativas. Espere alguns minutos e tente outra vez.')
  }
  await env.BD.prepare(
    'UPDATE travao SET contagem = contagem + 1, ultimo = ?2 WHERE chave = ?1'
  ).bind(chave, agora).run()
}

// ───────────────────────── distancias ─────────────────────────
/** Haversine em km. Usada com o centroide do CONCELHO, nunca com a casa: a
 *  posicao exacta de um alojamento nao sai daqui para o mercado. */
export function distanciaKm (lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(v => typeof v !== 'number' || Number.isNaN(v))) return null
  const R = 6371
  const r = Math.PI / 180
  const dLat = (lat2 - lat1) * r
  const dLon = (lon2 - lon1) * r
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)))
}
