// Tudo Pronto — a aplicacao.
//
// Um ficheiro so, de proposito. Modulos ES separados obrigariam a carimbar a
// versao em cada caminho de import no build, porque um `import` NAO passa pelo
// `?v=` do <script> que o carregou — e sem isso o ficheiro fica colado durante
// dias, com a aplicacao a servir metade novo e metade velho.
//
// Regras de interface que estao aqui codificadas, e nao sao gosto:
//  · UM botao primario por ecra, largura total, 56px, ancorado no fundo.
//  · A fotografia NUNCA impede fechar um servico. Fecha-se local, sobe depois.
//  · Tudo o que e preciso dentro da casa e guardado no aparelho no momento em
//    que o servico e aceite. A rede pode nao existir quando se chega la.
//  · Sem sondagem. Actualiza-se ao abrir, ao puxar para baixo e por aviso.

'use strict'

const API = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8787'
  : 'https://tudopronto-api.renato-lima-valente-dcb.workers.dev'

const CHAVE_SESSAO = 'tp.sessao'
const CHAVE_TEMA = 'tp.tema'

// ══════════════════════════════ estado ══════════════════════════════

const E = {
  testemunho: null,
  conta: null,
  reputacao: [],
  avisosPorLer: 0,
  concelhos: null,
  etiquetas: null,
  // `navigator.onLine` NAO serve para decidir isto sozinho: diz `true` desde
  // que exista uma interface de rede, mesmo sem Internet nenhuma do outro
  // lado. Uma pessoa dentro de uma casa com o Wi-Fi do alojamento ligado mas
  // sem cobertura tem `onLine === true` e nada a funcionar — e nunca veria o
  // aviso. Por isso o que decide e o que ACONTECE aos pedidos.
  semRede: false,
  aFechar: null,      // desfazer pendente
}

/** Chamado por cada pedido, com o resultado. Muda o aviso so quando o estado
 *  muda, para nao repintar a cada leitura. */
function marcarRede (falhou) {
  if (E.semRede === falhou) return
  E.semRede = falhou
  actualizarRede()
}

const estaSemRede = () => E.semRede || !navigator.onLine

// ══════════════════════════════ DOM ══════════════════════════════

const $ = (s, raiz = document) => raiz.querySelector(s)
const $$ = (s, raiz = document) => [...raiz.querySelectorAll(s)]

/** Cria elementos. `texto` entra sempre por textContent — nunca por
 *  innerHTML — para que um nome com `<` nao possa virar marcacao. */
function el (etiqueta, props = {}, ...filhos) {
  const n = document.createElement(etiqueta)
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue
    if (k === 'texto') n.textContent = v
    else if (k === 'html') n.innerHTML = v
    else if (k === 'classe') n.className = v
    else if (k === 'estilo') Object.assign(n.style, v)
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v)
    else if (k === 'dados') for (const [dk, dv] of Object.entries(v)) n.dataset[dk] = dv
    else n.setAttribute(k, v === true ? '' : v)
  }
  for (const f of filhos.flat(9)) {
    if (f === null || f === undefined || f === false) continue
    n.append(f instanceof Node ? f : document.createTextNode(String(f)))
  }
  return n
}

const svg = (d, tamanho = 24, extra = {}) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  s.setAttribute('viewBox', `0 0 ${tamanho} ${tamanho}`)
  s.setAttribute('aria-hidden', 'true')
  s.setAttribute('focusable', 'false')
  s.innerHTML = d
  for (const [k, v] of Object.entries(extra)) s.setAttribute(k, v)
  return s
}

const I = {
  visto: (t = 24) => svg('<path d="M5 13l4 4 10-11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>', t),
  casa: () => svg('<path d="M12 3.5 3.5 9.6v10.1c0 .6.5 1.1 1.1 1.1h14.8c.6 0 1.1-.5 1.1-1.1V9.6L12 3.5Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>'),
  lista: () => svg('<path d="M8 6h12M8 12h12M8 18h12M3.6 6h.01M3.6 12h.01M3.6 18h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  lupa: () => svg('<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 16l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  pessoas: () => svg('<circle cx="9" cy="8" r="3.4" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20c0-2.6-1-4.2-2.4-5.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'),
  eu: () => svg('<circle cx="12" cy="8.4" r="3.8" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M4.6 20.5c0-3.8 3.3-6.2 7.4-6.2s7.4 2.4 7.4 6.2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'),
  estrela: (t = 24) => svg('<path d="M12 2.9l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.7 6.2 20.8l1.1-6.5L2.6 9.7l6.5-.9L12 2.9Z" fill="currentColor"/>', t),
  camara: () => svg('<path d="M3.5 8.6A2 2 0 0 1 5.5 6.6h1.8l1.2-2h5l1.2 2h1.8a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8.6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
  mais: () => svg('<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  relogio: () => svg('<circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 7.4V12l3.4 2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>'),
  fala: () => svg('<path d="M20.5 12c0 4-3.8 7.2-8.5 7.2-1.1 0-2.2-.2-3.2-.5L4 20.5l1.4-3.6A6.8 6.8 0 0 1 3.5 12C3.5 8 7.3 4.8 12 4.8s8.5 3.2 8.5 7.2Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>'),
}

// ══════════════════════════ armazenamento ══════════════════════════
// Qualquer acesso vai em try/catch: em navegacao privada, com dados de sitio
// bloqueados, ou durante a captura de miniaturas, o proprio acessor rebenta —
// e uma aplicacao que rebenta ao arrancar nao se recupera.

const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const lerG = (k, omissao = null) => {
  try {
    const v = localStorage.getItem(k)
    return v === null ? omissao : JSON.parse(v)
  } catch { return omissao }
}
const apagarG = (k) => { try { localStorage.removeItem(k) } catch {} }

// ─────────────────────── fila de saida (outbox) ───────────────────────
// O Background Sync nao existe no Safari nem no iOS, e 37% dos telemoveis em
// Portugal sao iOS. Logo a fila e escrita a mao, em IndexedDB, com uma chave
// de idempotencia gerada no cliente — para que reenviar duas vezes nao marque
// a tarefa duas vezes nem envie a fotografia duas vezes.

const BD_NOME = 'tudopronto'
const BD_VERSAO = 1
let bdPromessa = null

function bd () {
  if (bdPromessa) return bdPromessa
  bdPromessa = new Promise((resolve, reject) => {
    const p = indexedDB.open(BD_NOME, BD_VERSAO)
    p.onupgradeneeded = () => {
      const d = p.result
      if (!d.objectStoreNames.contains('fila')) {
        d.createObjectStore('fila', { keyPath: 'id' }).createIndex('criado', 'criado')
      }
      if (!d.objectStoreNames.contains('cache')) d.createObjectStore('cache', { keyPath: 'chave' })
    }
    p.onsuccess = () => resolve(p.result)
    p.onerror = () => reject(p.error)
  }).catch(() => null)
  return bdPromessa
}

async function comLoja (nome, modo, fn) {
  const d = await bd()
  if (!d) return null
  return new Promise((resolve) => {
    let saida = null
    const t = d.transaction(nome, modo)
    t.oncomplete = () => resolve(saida)
    t.onerror = () => resolve(null)
    t.onabort = () => resolve(null)
    try {
      const p = fn(t.objectStore(nome))
      if (p) p.onsuccess = () => { saida = p.result }
    } catch { resolve(null) }
  })
}

/** A cache e SEMPRE por conta.
 *
 *  O IndexedDB e do DOMINIO, nao da conta. Sem o identificador da conta na
 *  chave, a ficha que uma pessoa guardou para trabalhar sem rede — com morada
 *  e codigo da caixa de chaves — era lida pela conta seguinte no mesmo
 *  telemovel. E telemoveis partilham-se. */
const chaveDe = (chave) => `${E.conta?.id || 'ninguem'}|${chave}`

const guardarCache = (chave, valor) =>
  comLoja('cache', 'readwrite', l => l.put({ chave: chaveDe(chave), valor, quando: Date.now() }))

const lerCache = async (chave) => {
  const r = await comLoja('cache', 'readonly', l => l.get(chaveDe(chave)))
  return r ? r.valor : null
}

/** Apaga tudo o que ficou guardado de uma conta. Corre ao sair. */
async function esquecerCache () {
  const d = await bd()
  if (!d) return
  const meu = `${E.conta?.id || 'ninguem'}|`
  await comLoja('cache', 'readwrite', (l) => {
    const p = l.getAllKeys()
    p.onsuccess = () => {
      for (const k of p.result || []) if (String(k).startsWith(meu)) l.delete(k)
    }
    return null
  })
}

/** A cache serve para a FALTA DE REDE, e mais nada.
 *
 *  Um 401 ou um 403 nao sao falta de rede: sao o servidor a dizer que aquilo
 *  nao e para esta pessoa. Cair na cache nesse caso transforma uma recusa
 *  correcta numa fuga de dados — foi assim que uma terceira conta viu a
 *  morada e o codigo de acesso de uma casa que nao era dela. */
const podeUsarCache = (erro) => !erro || erro.estado === 0 || erro.estado >= 500

async function enfileirar (acao) {
  const item = { id: crypto.randomUUID(), criado: Date.now(), tentativas: 0, ...acao }
  await comLoja('fila', 'readwrite', l => l.put(item))
  actualizarRede()
  return item.id
}

async function fila () {
  return (await comLoja('fila', 'readonly', l => l.getAll())) || []
}

const desenfileirar = (id) => comLoja('fila', 'readwrite', l => l.delete(id))

let aEscoar = false
/** Escoa a fila. Nao lanca: se falhar, fica para a proxima abertura. */
async function escoar () {
  if (aEscoar || !E.testemunho) return
  aEscoar = true
  try {
    const itens = (await fila()).sort((a, b) => a.criado - b.criado)
    for (const it of itens) {
      try {
        if (it.tipo === 'foto') {
          const d = await enviarBytes(`/v1/fotos?fim=${it.fim}${it.servico ? `&servico=${it.servico}` : ''}`, it.blob, it.mime)
          if (it.depois === 'tarefa') {
            await pedir('POST', `/v1/servicos/${it.servico}/tarefas/${it.tarefa}`, { feita: true, foto_id: d.id })
          }
        } else {
          await pedir(it.metodo, it.caminho, it.corpo)
        }
        await desenfileirar(it.id)
      } catch (erro) {
        // 4xx e recusa definitiva: reenviar nao muda nada e a fila nunca
        // esvaziava. 5xx e falta de rede ficam para a proxima.
        if (erro.estado >= 400 && erro.estado < 500 && erro.estado !== 429) {
          await desenfileirar(it.id)
          console.warn('[fila] descartado', it.tipo || it.caminho, erro.message)
        }
      }
    }
  } finally {
    aEscoar = false
    actualizarRede()
  }
}

// ══════════════════════════════ API ══════════════════════════════

class ErroAPI extends Error {
  constructor (estado, mensagem, campo) { super(mensagem); this.estado = estado; this.campo = campo }
}

async function pedir (metodo, caminho, corpo) {
  const h = {}
  if (corpo !== undefined) h['Content-Type'] = 'application/json'
  if (E.testemunho) h.Authorization = `Bearer ${E.testemunho}`
  let r
  try {
    r = await fetch(API + caminho, {
      method: metodo, headers: h,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
  } catch {
    marcarRede(true)
    throw new ErroAPI(0, 'Sem ligação. Verifique a rede e tente outra vez.')
  }
  marcarRede(false)
  if (r.status === 204) return {}
  let d = null
  try { d = await r.json() } catch {}
  if (!r.ok) {
    if (r.status === 401 && E.testemunho) { sair(true); throw new ErroAPI(401, 'A sessão expirou. Entre outra vez.') }
    throw new ErroAPI(r.status, d?.erro || 'Alguma coisa correu mal. Tente outra vez.', d?.campo)
  }
  return d || {}
}

async function enviarBytes (caminho, blob, mime) {
  const r = await fetch(API + caminho, {
    method: 'POST',
    headers: { 'Content-Type': mime, Authorization: `Bearer ${E.testemunho}` },
    body: blob,
  })
  let d = null
  try { d = await r.json() } catch {}
  if (!r.ok) throw new ErroAPI(r.status, d?.erro || 'Não foi possível enviar a fotografia.')
  return d
}

const urlFoto = (id) => `${API}/f/${id}`

// ══════════════════════════════ senha ══════════════════════════════
// O alongamento acontece AQUI, no telemovel, e nao no servidor: o plano
// gratuito do Workers da 10 ms de CPU por pedido, e o PBKDF2 com as 600 000
// iteracoes que a OWASP pede gasta dez vezes isso. Quem roubar a base continua
// a ter de fazer estas 600 000 iteracoes por cada tentativa.

let ITERACOES = 600000

async function derivarSenha (senha, endereco) {
  const enc = new TextEncoder()
  const sal = await crypto.subtle.digest('SHA-256', enc.encode('tudopronto.v1:' + endereco.toLowerCase()))
  const material = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal, iterations: ITERACOES, hash: 'SHA-256' }, material, 256)
  return btoa(String.fromCharCode(...new Uint8Array(bits)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ══════════════════════════ formatacao ══════════════════════════

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const DIAS_C = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const hojeISO = () => new Date().toISOString().slice(0, 10)

function dia (iso, curto = false) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  const h = new Date(hojeISO() + 'T12:00:00')
  const delta = Math.round((d - h) / 86400000)
  if (delta === 0) return 'hoje'
  if (delta === 1) return 'amanhã'
  if (delta === -1) return 'ontem'
  if (delta > 1 && delta < 7) return (curto ? DIAS_C : DIAS)[d.getDay()]
  return curto
    ? `${DIAS_C[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`
    : `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
}

const euros = (centimos) => centimos === null || centimos === undefined
  ? null
  : (centimos / 100).toLocaleString('pt-PT', { minimumFractionDigits: centimos % 100 ? 2 : 0, maximumFractionDigits: 2 })

function quandoRelativo (iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)} min`
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`
  const d = Math.floor(s / 86400)
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
  return new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
}

const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase()

const ESTADOS = {
  aberto: ['Por atribuir', 'aviso'],
  atribuido: ['Combinado', 'marca'],
  a_decorrer: ['A decorrer', 'acento'],
  concluido: ['Concluído', 'ok'],
  cancelado: ['Cancelado', 'erro'],
  expirado: ['Expirou', ''],
}

// ══════════════════════ pecas de interface ══════════════════════

function brinde (texto, tipo = '') {
  const n = $('#brinde')
  n.textContent = texto
  n.className = 'brinde' + (tipo ? ` brinde--${tipo}` : '')
  n.hidden = false
  clearTimeout(brinde._t)
  brinde._t = setTimeout(() => { n.hidden = true }, tipo === 'erro' ? 5200 : 3200)
}

/** "Feito. Anular" durante 15 segundos, em vez de "tem a certeza?" antes.
 *  E mais rapido, tolera toques acidentais com luvas, e nao interroga quem
 *  sabe o que esta a fazer. */
function comDesfazer (texto, aoAnular, segundos = 15) {
  const n = $('#desfaz')
  const b = $('#desfaz-b')
  $('#desfaz-txt').textContent = texto
  n.hidden = false
  const fechar = () => { n.hidden = true; b.onclick = null; clearTimeout(comDesfazer._t) }
  b.onclick = async () => { fechar(); await aoAnular() }
  clearTimeout(comDesfazer._t)
  comDesfazer._t = setTimeout(fechar, segundos * 1000)
}

/** As tres promessas do aria-modal, escritas a mao — porque o atributo nao faz
 *  nada sozinho: o foco entra, o foco nao sai, e o foco volta ao sitio de onde
 *  veio. O keydown vai em fase de CAPTURA, senao um campo dentro do painel
 *  come o Tab primeiro. */
function prenderFoco (dentro, aoEscapar) {
  const veio = document.activeElement
  const focaveis = () => $$('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])', dentro)
    .filter(n => n.offsetParent !== null || n === document.activeElement)

  const primeiro = focaveis()[0]
  ;(primeiro || dentro).focus()

  const aoTecla = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); aoEscapar?.(); return }
    if (ev.key !== 'Tab') return
    const f = focaveis()
    if (!f.length) { ev.preventDefault(); return }
    const i = f.indexOf(document.activeElement)
    if (ev.shiftKey && (i <= 0)) { ev.preventDefault(); f[f.length - 1].focus() }
    else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus() }
  }
  document.addEventListener('keydown', aoTecla, true)

  return () => {
    document.removeEventListener('keydown', aoTecla, true)
    // O `body` conta como "nao ha sitio": devolver-lhe o foco e o mesmo que
    // nao devolver nada, e quem navega por teclado recomeca do topo.
    const serve = veio && veio !== document.body && document.contains(veio) &&
      veio.offsetParent !== null
    if (serve) veio.focus()
    else ($('#accao .b') || $('#principal'))?.focus()
  }
}

/** Painel de baixo. Devolve uma promessa que resolve com o que o painel
 *  decidir (ou null se for fechado). */
function painel ({ titulo, sub, conteudo, accoes }) {
  return new Promise((resolve) => {
    let soltar = null
    const veu = el('div', { classe: 'veu' })
    const caixa = el('div', {
      classe: 'painel', role: 'dialog', 'aria-modal': 'true',
      'aria-label': titulo, tabindex: '-1',
    })
    const fim = (v) => { soltar?.(); veu.remove(); resolve(v) }
    caixa.append(
      el('h2', { texto: titulo }),
      sub ? el('p', { classe: 'painel__sub', texto: sub }) : null,
    )
    if (conteudo) caixa.append(conteudo(fim))
    if (accoes) caixa.append(el('div', { classe: 'pilha', estilo: { '--e': '12px', marginTop: '22px' } },
      ...accoes(fim)))
    veu.append(caixa)
    veu.addEventListener('click', (ev) => { if (ev.target === veu) fim(null) })
    document.body.append(veu)
    soltar = prenderFoco(caixa, () => fim(null))
  })
}

const confirmar = ({ titulo, sub, botao, perigo }) => painel({
  titulo, sub,
  accoes: (fim) => [
    el('button', {
      type: 'button',
      classe: 'b b--campo' + (perigo ? ' b--perigo' : ''),
      texto: botao,
      onclick: () => fim(true),
    }),
    el('button', { type: 'button', classe: 'b b--nu b--largo', texto: 'Deixar como está', onclick: () => fim(false) }),
  ],
})

/** Campo de formulario. O rotulo e sempre um <label> a envolver — nao um
 *  placeholder, que desaparece assim que se comeca a escrever e deixa quem
 *  foi interrompido sem saber o que estava a preencher. */
function campo ({ nome, rotulo, tipo = 'text', valor = '', nota, obrigatorio, ...resto }) {
  const entrada = el(tipo === 'textarea' ? 'textarea' : tipo === 'select' ? 'select' : 'input', {
    name: nome, id: 'c-' + nome,
    ...(tipo !== 'textarea' && tipo !== 'select' ? { type: tipo } : {}),
    ...(obrigatorio ? { required: true } : {}),
    ...resto,
  })
  if (tipo === 'select') {
    for (const o of resto.opcoes || []) {
      entrada.append(el('option', { value: o.v, texto: o.t, ...(o.v === valor ? { selected: true } : {}) }))
    }
    entrada.removeAttribute('opcoes')
  } else {
    entrada.value = valor ?? ''
  }
  return el('label', { classe: 'campo', for: 'c-' + nome },
    el('span', { classe: 'rotulo', texto: rotulo }),
    entrada,
    nota ? el('span', { classe: 'nota', texto: nota }) : null,
    el('span', { classe: 'erro', 'data-erro': nome, hidden: true }),
  )
}

function mostrarErroCampo (raiz, nomeCampo, mensagem) {
  const n = $(`[data-erro="${nomeCampo}"]`, raiz)
  if (!n) return false
  n.textContent = mensagem
  n.hidden = false
  const entrada = $(`#c-${nomeCampo}`, raiz)
  if (entrada) { entrada.setAttribute('aria-invalid', 'true'); entrada.focus() }
  return true
}

function limparErros (raiz) {
  for (const n of $$('[data-erro]', raiz)) { n.hidden = true; n.textContent = '' }
  for (const n of $$('[aria-invalid]', raiz)) n.removeAttribute('aria-invalid')
}

/** O botao primario do ecra: largura total, 56px, ancorado no fundo.
 *  `ocupado` desliga-o e muda o rotulo enquanto o pedido corre — senao dois
 *  toques rapidos criam dois servicos. */
function accaoAncorada (rotulo, aoCarregar, { nota, classe = '', desligado } = {}) {
  // A guarda: se o ecra que pediu este botao ja foi substituido enquanto
  // esperava pela rede, o botao nao nasce. Sem isto, uma resposta lenta de um
  // ecra abandonado punha um botao de outro estado por cima do ecra actual.
  const minhaGeracao = geracao
  const b = el('button', {
    type: 'button',
    classe: `b b--campo ${classe}`,
    texto: rotulo,
    ...(desligado ? { disabled: true } : {}),
  })
  let aOcorrer = false
  b.addEventListener('click', async () => {
    // A referencia e guardada ANTES do await. Um `ev.currentTarget` depois de
    // um await vale null, o catch rebenta a tentar mexer nele, e o botao fica
    // morto sem uma palavra.
    if (aOcorrer) return
    aOcorrer = true
    const antes = b.textContent
    // `aria-disabled` e nao `disabled`: um elemento DESACTIVADO perde o foco,
    // e depois um painel aberto a partir dele nao tem sitio para devolver o
    // foco quando fecha — o cursor cai no `body` e quem navega por teclado
    // recomeca no topo da pagina. A guarda de reentrancia faz o trabalho que
    // o `disabled` fazia, sem tirar o foco a ninguem.
    b.setAttribute('aria-disabled', 'true')
    b.setAttribute('aria-busy', 'true')
    b.textContent = 'Um momento…'
    try {
      await aoCarregar()
    } catch (erro) {
      brinde(erro.message || 'Não foi possível concluir.', 'erro')
    } finally {
      aOcorrer = false
      if (document.contains(b)) {
        b.removeAttribute('aria-disabled')
        b.removeAttribute('aria-busy')
        b.textContent = antes
      }
    }
  })
  if (minhaGeracao !== geracao) return b
  for (const n of $$('[id="accao"]')) n.remove()
  document.body.append(el('div', { classe: 'accao', id: 'accao' },
    el('div', { classe: 'accao__i' }, b, nota ? el('p', { classe: 'accao__nota', texto: nota }) : null)))
  $('#principal').classList.add('corpo--com-accao')
  return b
}

const estrelasVista = (n, tamanho = 15) => el('span', {
  classe: 'estrelas', role: 'img',
  'aria-label': `${n} de 5 estrelas`,
}, ...Array.from({ length: 5 }, (_, i) => I.estrela(24)).map((s, i) => {
  s.setAttribute('width', tamanho); s.setAttribute('height', tamanho)
  if (i >= Math.round(n)) s.style.color = 'var(--linha-campo)'
  return s
}))

function pessoaVista (p, { grande, ligar } = {}) {
  if (!p) return null
  const foto = p.foto_id
    ? el('img', { classe: 'pessoa__f', src: urlFoto(p.foto_id), alt: '', loading: 'lazy', width: 48, height: 48 })
    : el('span', { classe: 'pessoa__f', texto: iniciais(p.nome), 'aria-hidden': 'true' })
  const meta = el('p', { classe: 'pessoa__m' })
  if (p.estrelas) {
    meta.append(el('span', {}, estrelasVista(p.estrelas), ' ', el('b', { texto: String(p.estrelas).replace('.', ',') })))
  }
  if (p.n_concluidos) meta.append(el('span', { texto: `${p.n_concluidos} ${p.n_concluidos === 1 ? 'serviço' : 'serviços'}` }))
  if (!p.estrelas && !p.n_concluidos) meta.append(el('span', { texto: 'Ainda sem avaliações' }))
  if (p.concelho) meta.append(el('span', { texto: p.concelho }))

  const dentro = [foto, el('div', {}, el('p', { classe: 'pessoa__n', texto: p.nome }), meta)]
  return ligar
    ? el('a', { classe: 'pessoa' + (grande ? ' pessoa--grande' : ''), href: `#/perfil/${p.id}`, estilo: { textDecoration: 'none', color: 'inherit' } }, ...dentro)
    : el('div', { classe: 'pessoa' + (grande ? ' pessoa--grande' : '') }, ...dentro)
}

const dist = (texto, tipo) => el('span', { classe: 'dist' + (tipo ? ` dist--${tipo}` : ''), texto })

function distEstado (estado) {
  const [t, c] = ESTADOS[estado] || [estado, '']
  return el('span', { classe: 'dist' + (c ? ` dist--${c}` : '') },
    el('span', { classe: 'ponto', 'aria-hidden': 'true' }), t)
}

function vazio (icone, titulo, texto, accao) {
  const i = icone()
  i.setAttribute('class', 'vazio__i')
  return el('div', { classe: 'vazio' }, i,
    el('h2', { texto: titulo }),
    el('p', { texto }),
    accao || null)
}

/** Garante que a lista de concelhos existe ANTES de pintar um campo que a
 *  precise.
 *
 *  O arranque carrega os concelhos em paralelo com a primeira pintura, o que
 *  e bom para quem abre no elevador — mas quem abrisse o formulario de
 *  alojamento antes de a lista chegar via um selector VAZIO, com um campo
 *  obrigatorio impossivel de preencher e uma mensagem de erro a pedir para
 *  escolher o concelho. */
async function garantirConcelhos () {
  if (E.concelhos?.length) return E.concelhos
  const guardados = await lerCache('concelhos')
  if (guardados?.length) { E.concelhos = guardados; return E.concelhos }
  try {
    const d = await pedir('GET', '/v1/concelhos')
    E.concelhos = d.concelhos || []
    if (E.concelhos.length) await guardarCache('concelhos', E.concelhos)
  } catch {
    E.concelhos = E.concelhos || []
  }
  return E.concelhos
}

// ══════════════════════════ ecras: entrada ══════════════════════════
// Registo em quatro campos. Cada campo a mais e um campo que nao se preenche
// de pe, a porta de um alojamento: 18% das pessoas abandonam por lhes ser
// exigida conta e 17% por o processo ser longo.

function ecraBemVindo () {
  const p = pintar('Tudo Pronto', { semTopo: true })
  p.append(
    el('div', { classe: 'pilha', estilo: { '--e': '20px', paddingTop: '24px', textAlign: 'center' } },
      el('div', { html: `<svg width="72" height="72" viewBox="0 0 32 32" aria-hidden="true" style="color:var(--marca)">
        <path d="M16 3.2 3.4 12.1v15.3a1.6 1.6 0 0 0 1.6 1.6h22a1.6 1.6 0 0 0 1.6-1.6V12.1L16 3.2Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M10.6 17.9l3.9 4.1 7.1-8" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        estilo: { margin: '0 auto' } }),
      el('h1', { texto: 'Tudo Pronto', estilo: { margin: '0' } }),
      el('p', { texto: 'A casa pronta para o próximo hóspede.', classe: 'mudo', estilo: { fontSize: '1.1rem' } }),
    ),
    el('div', { classe: 'pilha', estilo: { '--e': '12px', marginTop: '34px' } },
      el('a', { classe: 'b b--campo', href: '#/registar?papel=dono', texto: 'Tenho um alojamento' }),
      el('a', { classe: 'b b--contorno b--campo', href: '#/registar?papel=profissional', texto: 'Faço limpezas' }),
      el('a', { classe: 'b b--nu b--largo', href: '#/entrar', texto: 'Já tenho conta', estilo: { marginTop: '10px' } }),
    ),
    el('p', { classe: 'mudo', estilo: { fontSize: '14px', textAlign: 'center', marginTop: '28px' } },
      'Ao criar conta aceita os ',
      el('a', { href: '../termos.html', texto: 'termos de utilização' }), ' e a ',
      el('a', { href: '../privacidade.html', texto: 'política de privacidade' }), '.'),
  )
}

function ecraEntrar () {
  const p = pintar('Entrar')
  const f = el('form', { classe: 'forma', novalidate: true })
  f.append(
    el('h1', { classe: 'forma__t', texto: 'Entrar' }),
    campo({ nome: 'email', rotulo: 'Email', tipo: 'email', obrigatorio: true,
      autocomplete: 'username', inputmode: 'email', autocapitalize: 'off', spellcheck: 'false' }),
    campo({ nome: 'senha', rotulo: 'Senha', tipo: 'password', obrigatorio: true, autocomplete: 'current-password' }),
    el('button', { type: 'submit', classe: 'b b--campo', texto: 'Entrar' }),
    el('a', { classe: 'b b--nu b--largo', href: '#/recuperar', texto: 'Esqueci-me da senha' }),
  )
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    limparErros(f)
    const b = $('button[type=submit]', f)
    const endereco = $('#c-email', f).value.trim()
    const senha = $('#c-senha', f).value
    if (!endereco || !senha) return mostrarErroCampo(f, endereco ? 'senha' : 'email', 'Falta preencher.')
    b.disabled = true; b.textContent = 'A entrar…'
    try {
      const d = await pedir('POST', '/v1/entrar', { email: endereco, senha: await derivarSenha(senha, endereco) })
      aceitarSessao(d)
      irPara('#/')
    } catch (erro) {
      if (!mostrarErroCampo(f, erro.campo || 'senha', erro.message)) brinde(erro.message, 'erro')
    } finally {
      b.disabled = false; b.textContent = 'Entrar'
    }
  })
  p.append(f)
}

async function ecraRegistar (params) {
  const papelInicial = params.get('papel') === 'profissional' ? 'profissional' : 'dono'
  let papel = papelInicial
  const p = pintar('Criar conta')
  await garantirConcelhos()
  const f = el('form', { classe: 'forma', novalidate: true })

  const seg = el('div', { classe: 'seg', role: 'group', 'aria-label': 'O que vem cá fazer' })
  const bDono = el('button', { type: 'button', texto: 'Tenho alojamento', 'aria-pressed': String(papel === 'dono') })
  const bProf = el('button', { type: 'button', texto: 'Faço limpezas', 'aria-pressed': String(papel === 'profissional') })
  const zonaConcelho = el('div')

  const pintarConcelho = () => {
    zonaConcelho.textContent = ''
    if (papel !== 'profissional') return
    zonaConcelho.append(
      campo({ nome: 'concelho', rotulo: 'Em que concelho trabalha', tipo: 'select',
        obrigatorio: true,
        nota: 'Serve para lhe mostrarmos o que há perto de si. Pode mudar depois.',
        opcoes: [{ v: '', t: 'Escolha o concelho…' },
          ...(E.concelhos || []).map(c => ({ v: c.nome, t: `${c.nome} (${c.distrito})` }))] }),
    )
  }
  const trocar = (novo) => {
    papel = novo
    bDono.setAttribute('aria-pressed', String(papel === 'dono'))
    bProf.setAttribute('aria-pressed', String(papel === 'profissional'))
    pintarConcelho()
  }
  bDono.onclick = () => trocar('dono')
  bProf.onclick = () => trocar('profissional')
  seg.append(bDono, bProf)

  f.append(
    el('h1', { classe: 'forma__t', texto: 'Criar conta' }),
    el('p', { classe: 'forma__sub', texto: 'Quatro campos e está feito.' }),
    seg,
    campo({ nome: 'nome', rotulo: 'Como se chama', obrigatorio: true, autocomplete: 'name',
      nota: 'A outra pessoa vê este nome antes de decidir. Use o seu nome verdadeiro.' }),
    campo({ nome: 'email', rotulo: 'Email', tipo: 'email', obrigatorio: true,
      autocomplete: 'email', inputmode: 'email', autocapitalize: 'off', spellcheck: 'false' }),
    campo({ nome: 'senha', rotulo: 'Escolha uma senha', tipo: 'password', obrigatorio: true,
      autocomplete: 'new-password', minlength: '8', nota: 'Pelo menos 8 caracteres.' }),
    zonaConcelho,
    el('button', { type: 'submit', classe: 'b b--campo', texto: 'Criar conta' }),
    el('p', { classe: 'mudo', estilo: { fontSize: '14px', textAlign: 'center' } },
      'Ao criar conta aceita os ', el('a', { href: '../termos.html', texto: 'termos' }),
      ' e a ', el('a', { href: '../privacidade.html', texto: 'privacidade' }), '.'),
    el('a', { classe: 'b b--nu b--largo', href: '#/entrar', texto: 'Já tenho conta' }),
  )
  pintarConcelho()

  f.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    limparErros(f)
    const b = $('button[type=submit]', f)
    const nome = $('#c-nome', f).value.trim()
    const endereco = $('#c-email', f).value.trim()
    const senha = $('#c-senha', f).value
    const concelho = $('#c-concelho', f)?.value || null
    if (nome.length < 2) return mostrarErroCampo(f, 'nome', 'Escreva o seu nome.')
    if (!endereco.includes('@')) return mostrarErroCampo(f, 'email', 'Esse email não parece válido.')
    if (senha.length < 8) return mostrarErroCampo(f, 'senha', 'A senha precisa de pelo menos 8 caracteres.')
    if (papel === 'profissional' && !concelho) return mostrarErroCampo(f, 'concelho', 'Escolha o concelho onde trabalha.')

    b.disabled = true; b.textContent = 'A criar…'
    try {
      const d = await pedir('POST', '/v1/registar', {
        nome, email: endereco, senha: await derivarSenha(senha, endereco),
        e_dono: papel === 'dono', e_profissional: papel === 'profissional', concelho,
      })
      aceitarSessao(d)
      irPara('#/verificar?email=' + encodeURIComponent(endereco))
    } catch (erro) {
      if (!mostrarErroCampo(f, erro.campo || 'email', erro.message)) brinde(erro.message, 'erro')
    } finally {
      b.disabled = false; b.textContent = 'Criar conta'
    }
  })
  p.append(f)
}

/** Codigo de 6 algarismos. Nao e um link porque um link de email NAO entra
 *  numa aplicacao instalada no iOS: o Safari e a aplicacao do ecra principal
 *  tem armazenamentos separados, e quem carrega no link fica com sessao no
 *  Safari e continua de fora.
 *
 *  O campo tem `autocomplete="one-time-code"` e aceita colar. Sem isso,
 *  transcrever o codigo a mao e um "teste de funcao cognitiva" e reprova o
 *  criterio 3.3.8 do WCAG 2.2. */
function ecraCodigo ({ fim, endereco, titulo, sub, aoValidar }) {
  const p = pintar(titulo)
  const f = el('form', { classe: 'forma', novalidate: true })
  const entrada = el('input', {
    type: 'text', id: 'c-codigo', name: 'codigo', classe: 'codigo',
    inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6',
    pattern: '[0-9]*', 'aria-label': 'Código de seis algarismos', required: true,
  })
  // Aceita colar e limpa o que nao for algarismo — quem cola "123 456" ou
  // "Codigo: 123456" nao devia ficar bloqueado.
  entrada.addEventListener('input', () => {
    const limpo = entrada.value.replace(/\D/g, '').slice(0, 6)
    if (limpo !== entrada.value) entrada.value = limpo
    if (limpo.length === 6) f.requestSubmit()
  })
  f.append(
    el('h1', { classe: 'forma__t', texto: titulo }),
    el('p', { classe: 'forma__sub' }, sub, ' ', el('b', { texto: endereco })),
    el('label', { classe: 'campo', for: 'c-codigo' },
      el('span', { classe: 'rotulo', texto: 'Código de 6 algarismos' }),
      entrada,
      el('span', { classe: 'nota', texto: 'Vale 20 minutos. Pode colar.' }),
      el('span', { classe: 'erro', 'data-erro': 'codigo', hidden: true })),
    el('button', { type: 'submit', classe: 'b b--campo', texto: 'Confirmar' }),
    el('button', { type: 'button', classe: 'b b--nu b--largo', texto: 'Enviar outro código',
      onclick: async (ev) => {
        const b = ev.currentTarget
        b.disabled = true
        try {
          await pedir('POST', '/v1/codigo', { email: endereco, fim })
          brinde('Código novo enviado.')
        } catch (erro) { brinde(erro.message, 'erro') } finally { b.disabled = false }
      } }),
  )
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    limparErros(f)
    const b = $('button[type=submit]', f)
    if (entrada.value.length !== 6) return mostrarErroCampo(f, 'codigo', 'Faltam algarismos.')
    b.disabled = true; b.textContent = 'A confirmar…'
    try {
      await aoValidar(entrada.value)
    } catch (erro) {
      mostrarErroCampo(f, 'codigo', erro.message)
      entrada.select()
    } finally {
      b.disabled = false; b.textContent = 'Confirmar'
    }
  })
  p.append(f)
  setTimeout(() => entrada.focus(), 60)
}

function ecraVerificar (params) {
  const endereco = params.get('email') || E.conta?.email || ''
  ecraCodigo({
    fim: 'verificar', endereco,
    titulo: 'Confirme o email',
    sub: 'Enviámos um código de 6 algarismos para',
    aoValidar: async (codigo) => {
      await pedir('POST', '/v1/codigo/validar', { email: endereco, codigo })
      brinde('Email confirmado.')
      await carregarEu()
      irPara('#/')
    },
  })
  const p = $('#principal')
  p.append(el('a', { classe: 'b b--nu b--largo', href: '#/', texto: 'Confirmar mais tarde',
    estilo: { marginTop: '18px' } }))
}

function ecraRecuperar () {
  const p = pintar('Recuperar acesso')
  const f = el('form', { classe: 'forma', novalidate: true })
  f.append(
    el('h1', { classe: 'forma__t', texto: 'Esqueceu-se da senha?' }),
    el('p', { classe: 'forma__sub', texto: 'Escreva o seu email. Recebe um código de 6 algarismos para escolher uma senha nova.' }),
    campo({ nome: 'email', rotulo: 'Email', tipo: 'email', obrigatorio: true,
      autocomplete: 'email', inputmode: 'email', autocapitalize: 'off' }),
    el('button', { type: 'submit', classe: 'b b--campo', texto: 'Enviar código' }),
    el('a', { classe: 'b b--nu b--largo', href: '#/entrar', texto: 'Voltar' }),
  )
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    const b = $('button[type=submit]', f)
    const endereco = $('#c-email', f).value.trim()
    if (!endereco.includes('@')) return mostrarErroCampo(f, 'email', 'Esse email não parece válido.')
    b.disabled = true; b.textContent = 'A enviar…'
    try {
      await pedir('POST', '/v1/codigo', { email: endereco, fim: 'recuperar' })
      irPara('#/senha-nova?email=' + encodeURIComponent(endereco))
    } catch (erro) { brinde(erro.message, 'erro') } finally { b.disabled = false; b.textContent = 'Enviar código' }
  })
  p.append(f)
}

function ecraSenhaNova (params) {
  const endereco = params.get('email') || ''
  const p = pintar('Senha nova')
  const f = el('form', { classe: 'forma', novalidate: true })
  const entradaCodigo = el('input', {
    type: 'text', id: 'c-codigo', classe: 'codigo', inputmode: 'numeric',
    autocomplete: 'one-time-code', maxlength: '6', 'aria-label': 'Código de seis algarismos',
  })
  entradaCodigo.addEventListener('input', () => {
    entradaCodigo.value = entradaCodigo.value.replace(/\D/g, '').slice(0, 6)
  })
  f.append(
    el('h1', { classe: 'forma__t', texto: 'Escolher senha nova' }),
    el('p', { classe: 'forma__sub' }, 'Escreva o código que enviámos para ', el('b', { texto: endereco })),
    el('label', { classe: 'campo', for: 'c-codigo' },
      el('span', { classe: 'rotulo', texto: 'Código de 6 algarismos' }),
      entradaCodigo,
      el('span', { classe: 'erro', 'data-erro': 'codigo', hidden: true })),
    campo({ nome: 'senha', rotulo: 'Senha nova', tipo: 'password', obrigatorio: true,
      autocomplete: 'new-password', minlength: '8', nota: 'Pelo menos 8 caracteres.' }),
    el('div', { classe: 'aviso' }, el('div', {}, 'Ao mudar a senha, as sessões abertas noutros aparelhos são fechadas.')),
    el('button', { type: 'submit', classe: 'b b--campo', texto: 'Guardar senha nova' }),
  )
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    limparErros(f)
    const b = $('button[type=submit]', f)
    const senha = $('#c-senha', f).value
    if (entradaCodigo.value.length !== 6) return mostrarErroCampo(f, 'codigo', 'Faltam algarismos.')
    if (senha.length < 8) return mostrarErroCampo(f, 'senha', 'A senha precisa de pelo menos 8 caracteres.')
    b.disabled = true; b.textContent = 'A guardar…'
    try {
      const d = await pedir('POST', '/v1/senha/nova', {
        email: endereco, codigo: entradaCodigo.value, senha: await derivarSenha(senha, endereco),
      })
      aceitarSessao(d)
      brinde('Senha alterada.')
      irPara('#/')
    } catch (erro) {
      if (!mostrarErroCampo(f, erro.campo || 'codigo', erro.message)) brinde(erro.message, 'erro')
    } finally { b.disabled = false; b.textContent = 'Guardar senha nova' }
  })
  p.append(f)
}

// ══════════════════════════ cartao de servico ══════════════════════════
// O valor em euros e o maior elemento do cartao. E a primeira coisa que uma
// pessoa procura, e a hierarquia tipografica tem de dizer isso em vez de o
// esconder numa linha de metadados.

function cartaoServico (s, { comDono, comProfissional } = {}) {
  const a = s.alojamento || {}
  const val = euros(s.valor)
  const c = el('a', { classe: 'serv', href: `#/servico/${s.id}` })

  c.append(
    el('div', { classe: 'serv__topo' },
      el('div', { classe: 'serv__quando' }, dia(s.data),
        el('span', { texto: `${s.hora_inicio} – ${s.hora_limite}` })),
      val ? el('div', { classe: 'serv__valor' },
        el('span', { classe: 'valor' }, val, el('small', {}, ' €'))) : null,
    ),
    el('p', { classe: 'serv__onde' },
      [a.tipologia, a.freguesia || a.concelho, a.concelho && a.freguesia ? a.concelho : null]
        .filter(Boolean).join(' · '),
      a.camas ? ` · ${a.camas} ${a.camas === 1 ? 'cama' : 'camas'}` : '',
      a.casas_banho ? ` · ${a.casas_banho} WC` : ''),
  )

  const pe = el('div', { classe: 'serv__pe' }, distEstado(s.estado))
  if (s.distancia_km !== null && s.distancia_km !== undefined) {
    // A distância é entre CENTRÓIDES de concelho. No mesmo concelho dá zero, e
    // «0 km» lê-se como um erro — ninguém está a zero quilómetros de nada.
    pe.append(dist(s.distancia_km === 0 ? 'no seu concelho' : `${s.distancia_km} km`, 'marca'))
  }
  if (s.muda_roupa) pe.append(dist('muda roupa'))
  if (s.tipo && s.tipo !== 'saida') pe.append(dist(s.tipo_nome || s.tipo))
  if (s.n_candidaturas) pe.append(dist(`${s.n_candidaturas} ${s.n_candidaturas === 1 ? 'candidatura' : 'candidaturas'}`, 'acento'))
  if (s.ja_me_candidatei) pe.append(dist('já se ofereceu', 'ok'))
  c.append(pe)

  const p = comDono ? s.dono : comProfissional ? s.profissional : null
  if (p) {
    c.append(el('div', { estilo: { marginTop: '13px', paddingTop: '13px', borderTop: '1px solid var(--linha)' } },
      pessoaVista(p)))
  }
  return c
}

// ══════════════════════════ painel inicial ══════════════════════════

async function ecraInicio () {
  const p = pintar('Tudo Pronto', { comBarra: true, semVoltar: true })
  p.append(el('div', { classe: 'carga', id: 'c-carga' },
    el('span', { classe: 'carga__roda', 'aria-hidden': 'true' }), el('p', { texto: 'A carregar…' })))

  let d
  try {
    d = await pedir('GET', '/v1/servicos?desde=' + hojeISO())
    await guardarCache('servicos', d)
  } catch (erro) {
    d = podeUsarCache(erro) ? await lerCache('servicos') : null
    if (!d) { p.textContent = ''; p.append(erroDeRede(erro, ecraInicio)); return }
    brinde('Sem rede: a mostrar o que estava guardado.')
  }
  if (rotaActual() !== '#/' && rotaActual() !== '') return
  p.textContent = ''

  const meus = d.servicos || []
  const souDono = !!E.conta?.e_dono
  const souProf = !!E.conta?.e_profissional

  const porFazer = meus.filter(s => ['atribuido', 'a_decorrer'].includes(s.estado))
  const porAtribuir = meus.filter(s => s.estado === 'aberto')
  const porAvaliar = meus.filter(s => s.estado === 'concluido' && s.avaliei === false)

  p.append(el('h1', { estilo: { fontSize: '1.5rem', margin: '0 0 4px' } },
    `Olá, ${String(E.conta?.nome || '').split(' ')[0]}`))
  p.append(el('p', { classe: 'mudo', estilo: { marginBottom: '24px' } },
    porFazer.length
      ? `${porFazer.length} ${porFazer.length === 1 ? 'limpeza combinada' : 'limpezas combinadas'}.`
      : 'Nada combinado para os próximos dias.'))

  if (E.conta && !E.conta.email_verificado) {
    p.append(el('div', { classe: 'aviso aviso--aviso', estilo: { marginBottom: '20px' } },
      el('div', {}, el('b', { texto: 'Falta confirmar o email' }),
        'Sem isso não conseguimos ajudá-lo a recuperar a conta. ',
        el('a', { href: '#/verificar?email=' + encodeURIComponent(E.conta.email), texto: 'Confirmar agora' }))))
  }

  if (porAvaliar.length) {
    p.append(seccao('Falta avaliar', porAvaliar.map(s => cartaoServico(s, {
      comDono: s.profissional_id === E.conta.id, comProfissional: s.dono_id === E.conta.id,
    }))))
  }
  if (porFazer.length) {
    p.append(seccao('Combinadas', porFazer.map(s => cartaoServico(s, {
      comDono: s.profissional_id === E.conta.id, comProfissional: s.dono_id === E.conta.id,
    }))))
  }
  if (souDono && porAtribuir.length) {
    p.append(seccao('À espera de resposta', porAtribuir.filter(s => s.dono_id === E.conta.id).map(s => cartaoServico(s))))
  }

  if (!meus.length) {
    p.append(souDono
      ? vazio(I.casa, 'Ainda não tem nada marcado',
          'Comece por dizer que casa tem. Depois convide a pessoa que já lhe limpa, ou publique a limpeza para quem estiver perto.',
          el('a', { classe: 'b b--campo', href: '#/alojamento/novo', texto: 'Adicionar o meu alojamento' }))
      : vazio(I.lupa, 'Ainda não tem serviços',
          'Veja o que há perto de si e ofereça-se. Pode também pedir a quem já lhe dá trabalho para a convidar para a equipa.',
          el('a', { classe: 'b b--campo', href: '#/mercado', texto: 'Ver o que há perto' })))
  }

  if (souDono && meus.length) {
    p.append(el('div', { classe: 'pilha', estilo: { '--e': '12px', marginTop: '28px' } },
      el('a', { classe: 'b b--campo', href: '#/servico/novo', texto: 'Marcar uma limpeza' })))
  }
  if (souProf && meus.length) {
    p.append(el('div', { classe: 'pilha', estilo: { '--e': '12px', marginTop: '28px' } },
      el('a', { classe: 'b b--contorno b--campo', href: '#/mercado', texto: 'Ver o que há perto' })))
  }
}

const seccao = (titulo, cartoes, ligacao) => el('section', { classe: 'secc-app' },
  el('div', { classe: 'secc-app__t' }, el('h2', { texto: titulo }),
    ligacao ? el('a', { href: ligacao[0], texto: ligacao[1] }) : null),
  el('div', { classe: 'pilha-serv' }, ...cartoes))

function erroDeRede (erro, tentarOutraVez) {
  return el('div', { classe: 'vazio' },
    el('h2', { texto: erro?.estado === 0 ? 'Sem ligação' : 'Não foi possível carregar' }),
    el('p', { texto: erro?.message || 'Tente outra vez daqui a pouco.' }),
    el('button', { type: 'button', classe: 'b', texto: 'Tentar outra vez', onclick: () => tentarOutraVez() }))
}

// ══════════════════════════ mercado ══════════════════════════

async function ecraMercado () {
  const p = pintar('Perto de si', { comBarra: true, semVoltar: true })
  p.append(el('div', { classe: 'carga' }, el('span', { classe: 'carga__roda', 'aria-hidden': 'true' }),
    el('p', { texto: 'A procurar…' })))
  let d
  try { d = await pedir('GET', '/v1/mercado') }
  catch (erro) { p.textContent = ''; p.append(erroDeRede(erro, ecraMercado)); return }
  if (!rotaActual().startsWith('#/mercado')) return
  p.textContent = ''

  const lista = d.servicos || []
  p.append(el('div', { estilo: { marginBottom: '18px' } },
    el('h1', { estilo: { fontSize: '1.4rem', margin: '0 0 4px' } }, 'Perto de si'),
    el('p', { classe: 'mudo', estilo: { margin: 0, fontSize: '15px' } },
      lista.length
        ? `${lista.length} ${lista.length === 1 ? 'limpeza' : 'limpezas'} até ${d.raio_km} km de ${E.conta?.concelho || 'si'}`
        : `Nada por agora até ${d.raio_km} km de ${E.conta?.concelho || 'si'}`),
    d.fora_do_raio
      ? el('p', { classe: 'mudo', estilo: { margin: '6px 0 0', fontSize: '14px' } },
          `Há ${d.fora_do_raio} fora do seu raio. `,
          el('a', { href: '#/eu', texto: 'Aumentar o raio' }))
      : null,
  ))

  if (!lista.length) {
    p.append(vazio(I.lupa, 'Ainda não há nada aqui',
      'O Tudo Pronto é novo na sua zona. Se já trabalha para alguém com alojamento local, peça-lhe para a convidar: fica logo com as limpezas dessa pessoa, sem precisar de esperar pelo mercado.'))
    return
  }
  p.append(el('div', { classe: 'pilha-serv' }, ...lista.map(s => cartaoServico(s, { comDono: true }))))
}

// ══════════════════════════ os meus alojamentos ══════════════════════════

async function ecraAlojamentos () {
  const p = pintar('Os meus alojamentos', { comBarra: true, semVoltar: true })
  let d
  try { d = await pedir('GET', '/v1/alojamentos') }
  catch (erro) { p.append(erroDeRede(erro, ecraAlojamentos)); return }
  if (!rotaActual().startsWith('#/alojamentos')) return
  p.textContent = ''

  const lista = d.alojamentos || []
  p.append(el('h1', { estilo: { fontSize: '1.4rem', margin: '0 0 18px' } }, 'Os meus alojamentos'))

  if (!lista.length) {
    p.append(vazio(I.casa, 'Sem alojamentos',
      'Comece por dizer que casa tem: a tipologia, o concelho e a morada. A morada só é mostrada a quem escolher para lá ir.',
      el('a', { classe: 'b b--campo', href: '#/alojamento/novo', texto: 'Adicionar alojamento' })))
    return
  }

  p.append(el('div', { classe: 'pilha', estilo: { '--e': '12px' } },
    ...lista.map(a => el('a', { classe: 'serv', href: `#/alojamento/${a.id}` },
      el('div', { classe: 'serv__topo' },
        el('div', { classe: 'serv__quando' }, a.nome,
          el('span', { texto: [a.tipologia, a.freguesia, a.concelho].filter(Boolean).join(' · ') })),
      ),
      el('div', { classe: 'serv__pe' },
        dist(`${a.quartos} ${a.quartos === 1 ? 'quarto' : 'quartos'}`),
        dist(`${a.camas} ${a.camas === 1 ? 'cama' : 'camas'}`),
        dist(`${a.casas_banho} WC`),
        a.registo_al ? dist('registo AL', 'ok') : dist('sem registo AL', 'aviso'),
      )))))

  accaoAncorada('Adicionar alojamento', () => irPara('#/alojamento/novo'))
}

// ══════════════════════════ ficha do servico ══════════════════════════
// O ecra que faz a aplicacao. Um botao primario, ancorado, cujo rotulo muda
// com o estado. Tudo o resto e informacao.

async function ecraServico (id) {
  const p = pintar('Limpeza')
  p.append(el('div', { classe: 'carga' }, el('span', { classe: 'carga__roda', 'aria-hidden': 'true' }),
    el('p', { texto: 'A carregar…' })))

  let d
  try {
    d = await pedir('GET', `/v1/servicos/${id}`)
    // Guardar TUDO no aparelho no momento em que se abre um servico atribuido:
    // morada, codigo de acesso, instrucoes e lista de tarefas. A rede pode nao
    // existir quando se chegar la, e e ai que a informacao faz falta.
    if (d.servico?.alojamento?.morada) await guardarCache('servico:' + id, d)
  } catch (erro) {
    d = podeUsarCache(erro) ? await lerCache('servico:' + id) : null
    if (!d) { p.textContent = ''; p.append(erroDeRede(erro, () => ecraServico(id))); return }
    brinde('Sem rede: a mostrar o que estava guardado.')
  }
  if (rotaActual() !== `#/servico/${id}`) return

  const s = d.servico
  const souDono = s.dono_id === E.conta?.id
  const souProf = s.profissional_id === E.conta?.id
  const a = s.alojamento || {}
  p.textContent = ''

  // ── cabeca ──
  p.append(el('div', { classe: 'ficha__cabeca' },
    el('h1', { classe: 'ficha__quando', texto: dia(s.data) }),
    el('p', { classe: 'mudo', estilo: { margin: 0, fontSize: '17px' } },
      `Entrar a partir das ${s.hora_inicio} · pronto até às ${s.hora_limite}`),
    el('div', { classe: 'ficha__estado' },
      distEstado(s.estado),
      s.tipo !== 'saida' ? dist(s.tipo_nome) : null,
      s.valor !== null && s.valor !== undefined ? dist(`${euros(s.valor)} €`, 'marca') : null),
  ))

  // ── morada: so aparece quando ha direito a ela ──
  if (a.morada) {
    const m = el('div', { classe: 'morada', estilo: { marginBottom: '20px' } },
      el('h3', { texto: 'Onde é' }),
      el('p', { texto: a.nome }),
      el('p', { estilo: { fontWeight: '400', fontSize: '16px' } },
        [a.morada, a.andar, a.codigo_postal, a.concelho].filter(Boolean).join(', ')),
    )
    if (a.acesso) m.append(el('div', { classe: 'acesso' }, el('b', { texto: 'Acesso: ' }), a.acesso))
    if (a.instrucoes) m.append(el('div', { classe: 'acesso' }, el('b', { texto: 'Notas da casa: ' }), a.instrucoes))
    // Abrir no mapa e uma ligacao para FORA: nao ha mapa dentro da aplicacao,
    // e o endereco so e passado ao mapa quando a pessoa carrega de propria
    // vontade — nunca ao abrir o ecra.
    m.append(el('a', {
      classe: 'b b--contorno b--largo',
      href: `https://www.openstreetmap.org/search?query=${encodeURIComponent([a.morada, a.codigo_postal, a.concelho].filter(Boolean).join(', '))}`,
      target: '_blank', rel: 'noopener noreferrer',
      texto: 'Abrir num mapa',
    }))
    p.append(m)
  } else if (!souDono && s.estado === 'aberto') {
    p.append(el('div', { classe: 'aviso aviso--marca', estilo: { marginBottom: '20px' } },
      el('div', {}, el('b', { texto: 'A morada aparece se for escolhida' }),
        `Por agora sabe a zona (${[a.freguesia, a.concelho].filter(Boolean).join(', ')}) e a distância. `
        + 'A morada, o andar e o código de acesso só são mostrados a quem ficar com o serviço.')))
  }

  // ── o que é preciso ──
  const linhas = el('dl', { classe: 'linhas' })
  const linha = (t, v) => v ? linhas.append(el('div', { classe: 'linhas__l' },
    el('dt', { texto: t }), el('dd', {}, v))) : null

  linha('Alojamento', [a.tipologia, a.quartos ? `${a.quartos} ${a.quartos === 1 ? 'quarto' : 'quartos'}` : null,
    a.camas ? `${a.camas} ${a.camas === 1 ? 'cama' : 'camas'}` : null,
    a.casas_banho ? `${a.casas_banho} WC` : null, a.area_m2 ? `${a.area_m2} m²` : null].filter(Boolean).join(' · '))
  linha('Zona', [a.freguesia, a.concelho, a.distrito].filter(Boolean).join(', '))
  if (a.andar && !a.morada) linha('Andar', a.tem_elevador ? 'com elevador' : 'sem elevador')
  else if (a.morada) linha('Elevador', a.tem_elevador ? 'sim' : 'não')
  if (s.distancia_km !== null && s.distancia_km !== undefined) {
    linha('Distância', s.distancia_km === 0
      ? 'no seu concelho'
      : `cerca de ${s.distancia_km} km`)
  }
  linha('Roupa de cama', s.muda_roupa
    ? `muda · fornecida ${{ alojamento: 'pela casa', profissional: 'por quem limpa', lavandaria: 'por lavandaria' }[s.roupa_de]}`
    : 'não é preciso mudar')
  linha('Consumíveis', s.repor_consumiveis ? 'repor' : 'não é preciso')
  linha('Produtos de limpeza', s.produtos_de === 'alojamento' ? 'estão na casa' : 'quem limpa leva os seus')
  if (s.duracao_prevista) linha('Duração prevista', `cerca de ${Math.round(s.duracao_prevista / 60 * 10) / 10} h`)
  if (s.valor !== null && s.valor !== undefined) {
    linha('Valor combinado', el('span', {}, `${euros(s.valor)} €`,
      el('span', { classe: 'nota', estilo: { display: 'block', fontWeight: '400' },
        texto: 'pago directamente entre os dois' })))
  }
  p.append(el('section', { classe: 'secc-app' },
    el('div', { classe: 'secc-app__t' }, el('h2', { texto: 'O que é preciso' })),
    el('div', { classe: 'cartao cartao--plano' }, linhas)))

  if (s.notas) {
    p.append(el('section', { classe: 'secc-app' },
      el('div', { classe: 'secc-app__t' }, el('h2', { texto: 'Recado de quem tem a casa' })),
      el('div', { classe: 'cartao cartao--fundo' }, el('p', { estilo: { margin: 0 }, texto: s.notas }))))
  }

  // ── a outra pessoa ──
  const outro = souDono ? s.profissional : s.dono
  if (outro) {
    const cart = el('div', { classe: 'cartao' }, pessoaVista(outro, { ligar: true }))
    if (outro.telefone) {
      cart.append(el('div', { classe: 'pilha', estilo: { '--e': '10px', marginTop: '14px' } },
        el('a', { classe: 'b b--contorno b--largo', href: `tel:${outro.telefone}`, texto: `Telefonar · ${outro.telefone}` }),
        el('a', { classe: 'b b--nu b--largo', href: `#/conversa/${s.id}`, texto: 'Mensagens' })))
    }
    p.append(el('section', { classe: 'secc-app' },
      el('div', { classe: 'secc-app__t' }, el('h2', { texto: souDono ? 'Quem vai fazer' : 'Quem tem a casa' })),
      cart))
  }

  // ── candidaturas (só o dono, e só enquanto está aberto) ──
  if (souDono && s.estado === 'aberto') {
    const cands = s.candidaturas || []
    const zona = el('div', { classe: 'pilha', estilo: { '--e': '12px' } })
    if (!cands.length) {
      zona.append(el('div', { classe: 'cartao cartao--fundo' },
        el('p', { classe: 'mudo', estilo: { margin: 0 },
          texto: s.visibilidade === 'mercado'
            ? 'Ainda ninguém se ofereceu. Assim que alguém se oferecer, recebe um aviso.'
            : 'À espera de resposta da sua equipa.' })))
    }
    for (const c of cands) {
      const cart = el('div', { classe: 'cartao' })
      cart.append(pessoaVista(c.profissional, { ligar: true }))
      if (c.profissional.n_faltas) {
        cart.append(el('p', { classe: 'mudo', estilo: { fontSize: '14px', marginTop: '8px' } },
          `${c.profissional.n_faltas} ${c.profissional.n_faltas === 1 ? 'falta registada' : 'faltas registadas'}`))
      }
      if (c.valor !== null && c.valor !== undefined && c.valor !== s.valor) {
        cart.append(el('div', { classe: 'aviso aviso--aviso', estilo: { marginTop: '12px' } },
          el('div', {}, el('b', { texto: `Pede ${euros(c.valor)} €` }),
            `Você tinha oferecido ${euros(s.valor)} €.`)))
      }
      if (c.mensagem) {
        cart.append(el('p', { estilo: { marginTop: '12px', fontSize: '15.5px' }, texto: `“${c.mensagem}”` }))
      }
      cart.append(el('div', { classe: 'pilha', estilo: { '--e': '10px', marginTop: '14px' } },
        el('button', { type: 'button', classe: 'b b--campo', 'data-acto': 'escolher',
          texto: 'Escolher esta pessoa',
          onclick: async (ev) => {
            const b = ev.currentTarget
            b.disabled = true; b.textContent = 'Um momento…'
            try {
              await pedir('POST', `/v1/candidaturas/${c.id}/aceitar`)
              brinde('Combinado. A pessoa já foi avisada.')
              ecraServico(id)
            } catch (erro) { brinde(erro.message, 'erro'); b.disabled = false; b.textContent = 'Escolher esta pessoa' }
          } }),
        el('button', { type: 'button', classe: 'b b--nu b--largo', 'data-acto': 'recusar',
          texto: 'Não, obrigado',
          onclick: async (ev) => {
            const b = ev.currentTarget
            b.disabled = true
            try {
              await pedir('POST', `/v1/candidaturas/${c.id}/recusar`)
              ecraServico(id)
            } catch (erro) { brinde(erro.message, 'erro'); b.disabled = false }
          } })))
      zona.append(cart)
    }
    p.append(el('section', { classe: 'secc-app' },
      el('div', { classe: 'secc-app__t' }, el('h2', { texto: `Quem se ofereceu${cands.length ? ` (${cands.length})` : ''}` })),
      zona))
  }

  // ── lista de tarefas ──
  if ((souProf || souDono) && (s.tarefas || []).length) {
    p.append(await zonaTarefas(s, souProf))
  }

  // ── ocorrências ──
  if (souProf || souDono) p.append(await zonaOcorrencias(s))

  // ── avaliação ──
  if (s.estado === 'concluido' && (souProf || souDono)) p.append(await zonaAvaliacao(s, souDono))

  // ── acção principal, conforme o estado ──
  pintarAccao(s, { souDono, souProf, id })

  // ── cancelar: longe de tudo, com folga e com confirmação ──
  if ((souDono || souProf) && ['aberto', 'atribuido', 'a_decorrer'].includes(s.estado)) {
    p.append(el('div', { classe: 'zona-perigo' },
      el('button', {
        type: 'button', classe: 'b b--perigo b--largo',
        texto: souDono ? 'Cancelar esta limpeza' : 'Desistir desta limpeza',
        onclick: async () => {
          // Desistir prejudica um terceiro: aqui a confirmacao e devida, e
          // reafirma o pedido com especificidade em vez de perguntar "tem a
          // certeza?" — que ninguem le.
          const ok = await confirmar({
            titulo: souDono ? 'Cancelar a limpeza?' : 'Desistir da limpeza?',
            sub: `${a.nome || 'A limpeza'}, ${dia(s.data)} às ${s.hora_inicio}. `
              + (s.estado === 'aberto'
                ? 'Ainda não estava atribuída.'
                : souDono
                  ? 'A pessoa que ia fazer o trabalho é avisada, e o cancelamento fica registado no seu perfil.'
                  : 'Quem tem a casa é avisado e fica sem ninguém para esta data. Fica registado no seu perfil.'),
            botao: souDono ? 'Sim, cancelar' : 'Sim, desistir',
            perigo: true,
          })
          if (!ok) return
          try {
            await pedir('POST', `/v1/servicos/${s.id}/cancelar`, {})
            brinde('Cancelado.')
            irPara('#/')
          } catch (erro) { brinde(erro.message, 'erro') }
        },
      })))
  }
}

/** O botao. Um so, e o rotulo diz o que acontece a seguir. */
function pintarAccao (s, { souDono, souProf, id }) {
  const t = (s.tarefas || [])
  const porFotografar = t.filter(x => x.exige_foto && (!x.feita_em || !x.foto_id)).length

  if (souProf && s.estado === 'atribuido') {
    accaoAncorada('Cheguei — começar', async () => {
      await pedir('POST', `/v1/servicos/${id}/iniciar`)
      brinde('Bom trabalho.')
      ecraServico(id)
    }, { nota: 'Quem tem a casa é avisado de que chegou.' })
    return
  }
  if (souProf && s.estado === 'a_decorrer') {
    accaoAncorada('Tudo pronto', async () => {
      if (porFotografar) {
        brinde(`Faltam ${porFotografar} ${porFotografar === 1 ? 'fotografia' : 'fotografias'}.`, 'erro')
        $('#tarefas')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      await pedir('POST', `/v1/servicos/${id}/concluir`)
      brinde('Tudo pronto. Já foi avisado.')
      ecraServico(id)
    }, {
      nota: porFotografar
        ? `Faltam ${porFotografar} ${porFotografar === 1 ? 'tarefa' : 'tarefas'} com fotografia`
        : 'Quem tem a casa recebe as fotografias',
    })
    return
  }
  if (!souProf && !souDono && s.estado === 'aberto') {
    accaoAncorada(s.ja_me_candidatei ? 'Já se ofereceu' : 'Oferecer-me', async () => {
      if (s.ja_me_candidatei) return
      await painelCandidatar(s)
    }, {
      nota: 'Pode aceitar o valor proposto ou dizer quanto quer',
      desligado: !!s.ja_me_candidatei,
    })
    return
  }
  if (s.estado === 'concluido' && s.avaliei === false) {
    accaoAncorada('Avaliar', () => irPara(`#/avaliar/${id}`),
      { nota: 'O que escrever fica escondido até a outra pessoa também avaliar' })
  }
}

async function painelCandidatar (s) {
  const escolhido = await painel({
    titulo: 'Oferecer-me para esta limpeza',
    sub: `${dia(s.data)}, das ${s.hora_inicio} às ${s.hora_limite}.`,
    conteudo: (fim) => {
      const caixa = el('div', { classe: 'forma' })
      const propOferecido = s.valor !== null && s.valor !== undefined
      let modo = 'aceitar'
      const zonaValor = el('div')
      const seg = el('div', { classe: 'seg', role: 'group', 'aria-label': 'Valor' })
      const bA = el('button', { type: 'button', texto: propOferecido ? `Aceito ${euros(s.valor)} €` : 'Sem valor', 'aria-pressed': 'true' })
      const bC = el('button', { type: 'button', texto: 'Quero outro valor', 'aria-pressed': 'false' })
      const repintar = () => {
        bA.setAttribute('aria-pressed', String(modo === 'aceitar'))
        bC.setAttribute('aria-pressed', String(modo === 'contra'))
        zonaValor.textContent = ''
        if (modo === 'contra') {
          // O campo nasce VAZIO, de proposito. Pre-encher com o valor do dono
          // ancorava a decisao dela nele — e um valor que a plataforma poe no
          // campo e um valor que a plataforma sugeriu, o que e exactamente o
          // indicio da alinea a) do art. 12.-A do Codigo do Trabalho. Sem
          // minimo, sem maximo, sem sugestao: o numero e dela.
          zonaValor.append(campo({
            nome: 'valor', rotulo: 'Quanto quer receber (em euros)', tipo: 'number',
            inputmode: 'decimal', min: '0', step: '0.5', valor: '',
            placeholder: 'o valor que quiser',
            nota: 'Escreva o seu preço. Quem tem a casa vê-o e decide.',
          }))
        }
      }
      bA.onclick = () => { modo = 'aceitar'; repintar() }
      bC.onclick = () => { modo = 'contra'; repintar() }
      seg.append(bA, bC)
      caixa.append(
        propOferecido ? seg : null,
        zonaValor,
        campo({ nome: 'mensagem', rotulo: 'Quer dizer alguma coisa? (opcional)', tipo: 'textarea',
          maxlength: '500', placeholder: 'Ex.: posso chegar às 11h30.' }),
        el('button', {
          type: 'button', classe: 'b b--campo', 'data-acto': 'candidatar', texto: 'Enviar',
          onclick: async (ev) => {
            const b = ev.currentTarget
            b.disabled = true; b.textContent = 'A enviar…'
            const bruto = $('#c-valor', caixa)?.value
            const valor = modo === 'contra' && bruto ? Math.round(parseFloat(bruto.replace(',', '.')) * 100) : undefined
            try {
              const r = await pedir('POST', `/v1/servicos/${s.id}/candidatar`, {
                valor, mensagem: $('#c-mensagem', caixa)?.value || undefined,
              })
              fim(r)
            } catch (erro) {
              brinde(erro.message, 'erro')
              b.disabled = false; b.textContent = 'Enviar'
            }
          },
        }),
      )
      if (!propOferecido) { modo = 'contra'; repintar() }
      return caixa
    },
  })
  if (!escolhido) return
  brinde(escolhido.atribuido ? 'A limpeza é sua. Já pode ver a morada.' : 'Enviado. Vai receber resposta.')
  ecraServico(s.id)
}

// ══════════════════════════ tarefas e fotografias ══════════════════════════

/** Reduz a fotografia NO TELEMOVEL antes de a enviar. Uma fotografia de um
 *  telemovel actual tem 4 MB; 1280px de lado maior a 0,7 de qualidade da
 *  150–300 kB, que e o que faz a diferenca entre subir num elevador sem rede
 *  e nao subir. */
async function reduzirFoto (ficheiro, ladoMax = 1280, qualidade = 0.7) {
  const bitmap = await createImageBitmap(ficheiro).catch(() => null)
  if (!bitmap) return { blob: ficheiro, mime: ficheiro.type || 'image/jpeg' }
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height))
  const l = Math.round(bitmap.width * escala)
  const a = Math.round(bitmap.height * escala)
  const tela = document.createElement('canvas')
  tela.width = l; tela.height = a
  tela.getContext('2d').drawImage(bitmap, 0, 0, l, a)
  bitmap.close?.()
  const blob = await new Promise(r => tela.toBlob(r, 'image/jpeg', qualidade))
  return blob ? { blob, mime: 'image/jpeg' } : { blob: ficheiro, mime: ficheiro.type || 'image/jpeg' }
}

async function zonaTarefas (s, podeMarcar) {
  const tarefas = s.tarefas || []
  const zona = el('section', { classe: 'secc-app', id: 'tarefas' })
  const feitas = tarefas.filter(t => t.feita_em).length

  const barra = el('div', { classe: 'progresso' },
    el('div', { classe: 'progresso__b' },
      el('div', { classe: 'progresso__p', id: 'prog', estilo: { width: `${Math.round(feitas / tarefas.length * 100)}%` } })),
    el('span', { classe: 'progresso__n', id: 'prog-n', texto: `${feitas}/${tarefas.length}` }))

  zona.append(el('div', { classe: 'secc-app__t' },
    el('h2', { texto: 'O que fazer' }),
    el('span', { classe: 'nota', texto: 'lista de quem tem a casa' })), barra)

  const actualizarBarra = () => {
    const n = $$('.tarefa[aria-pressed="true"]', zona).length
    $('#prog', zona).style.width = `${Math.round(n / tarefas.length * 100)}%`
    $('#prog-n', zona).textContent = `${n}/${tarefas.length}`
  }

  const porZona = new Map()
  for (const t of tarefas) {
    if (!porZona.has(t.zona)) porZona.set(t.zona, [])
    porZona.get(t.zona).push(t)
  }

  for (const [nomeZona, lista] of porZona) {
    const bloco = el('div', { classe: 'zona' }, el('h3', { classe: 'zona__t', texto: nomeZona }))
    for (const t of lista) {
      bloco.append(linhaTarefa(t, s, podeMarcar, actualizarBarra))
    }
    zona.append(bloco)
  }
  return zona
}

function linhaTarefa (t, s, podeMarcar, aoMudar) {
  const feita = !!t.feita_em
  const b = el('button', {
    type: 'button', classe: 'tarefa',
    'aria-pressed': String(feita),
    ...(podeMarcar ? {} : { disabled: true }),
  })
  const caixa = el('span', { classe: 'tarefa__c' }, I.visto(24))
  const txt = el('span', { classe: 'tarefa__t', texto: t.descricao })
  b.append(caixa, txt)

  const zonaFoto = el('span', { classe: 'tarefa__fim' })
  if (t.foto_id) {
    zonaFoto.append(el('img', { classe: 'tarefa__foto', src: urlFoto(t.foto_id), alt: '', loading: 'lazy' }))
  } else if (t.exige_foto) {
    zonaFoto.append(el('span', { classe: 'tarefa__pede', texto: 'FOTO' }))
  }
  b.append(zonaFoto)

  if (!podeMarcar) return b

  // O selector de ficheiro fica FORA do botao: um <input> dentro de um
  // <button> nao e clicavel de forma fiavel, e `capture="environment"` abre a
  // camara de tras directamente em vez do rolo de fotografias.
  const escolher = el('input', {
    type: 'file', accept: 'image/*', capture: 'environment',
    estilo: { display: 'none' }, 'aria-hidden': 'true', tabindex: '-1',
  })

  escolher.addEventListener('change', async () => {
    const f = escolher.files?.[0]
    escolher.value = ''
    if (!f) return
    // Marca-se JA, localmente. A fotografia sobe depois, pela fila. O que nao
    // pode acontecer e alguem ficar a olhar para uma roda a girar dentro de
    // uma casa sem rede — foi assim que a app do Uber Eats perdia entregas.
    b.setAttribute('aria-pressed', 'true')
    zonaFoto.textContent = ''
    const previa = el('img', { classe: 'tarefa__foto', src: URL.createObjectURL(f), alt: '' })
    zonaFoto.append(el('span', { classe: 'foto-espera' }, previa))
    aoMudar?.()
    const { blob, mime } = await reduzirFoto(f)
    await enfileirar({ tipo: 'foto', fim: 'tarefa', servico: s.id, tarefa: t.id, blob, mime, depois: 'tarefa' })
    escoar()
  })

  b.addEventListener('click', async () => {
    const estaFeita = b.getAttribute('aria-pressed') === 'true'
    if (!estaFeita && t.exige_foto && !t.foto_id) { escolher.click(); return }
    const novo = !estaFeita
    b.setAttribute('aria-pressed', String(novo))
    aoMudar?.()
    await enfileirar({
      metodo: 'POST', caminho: `/v1/servicos/${s.id}/tarefas/${t.id}`,
      corpo: { feita: novo, foto_id: t.foto_id || undefined },
    })
    escoar()
  })

  return el('span', { estilo: { display: 'block' } }, b, escolher)
}

// ══════════════════════════ ocorrencias ══════════════════════════

async function zonaOcorrencias (s) {
  const zona = el('section', { classe: 'secc-app' })
  let lista = []
  try { lista = (await pedir('GET', `/v1/servicos/${s.id}/ocorrencias`)).ocorrencias || [] } catch {}

  const NOMES = { dano: 'Dano', perdido: 'Objecto esquecido', falta: 'Faltou material', outro: 'Outro' }
  const corpo = el('div', { classe: 'pilha', estilo: { '--e': '11px' } })
  for (const o of lista) {
    corpo.append(el('div', { classe: 'cartao' },
      el('div', { classe: 'fita', estilo: { justifyContent: 'space-between' } },
        dist(NOMES[o.tipo] || o.tipo, o.tipo === 'dano' ? 'erro' : o.tipo === 'falta' ? 'aviso' : ''),
        el('span', { classe: 'nota', texto: quandoRelativo(o.criada_em) })),
      el('p', { estilo: { margin: '10px 0 0' }, texto: o.descricao }),
      o.foto_id ? el('div', { classe: 'fotos', estilo: { marginTop: '10px' } },
        el('a', { href: urlFoto(o.foto_id), target: '_blank', rel: 'noopener' },
          el('img', { src: urlFoto(o.foto_id), alt: `Fotografia: ${o.descricao}`, loading: 'lazy' }))) : null,
      el('p', { classe: 'nota', estilo: { marginTop: '8px' }, texto: `registado por ${o.autor_nome}` })))
  }

  if (['atribuido', 'a_decorrer', 'concluido'].includes(s.estado)) {
    corpo.append(el('button', {
      type: 'button', classe: 'b b--contorno b--largo', texto: 'Registar uma ocorrência',
      onclick: async () => {
        const feito = await painelOcorrencia(s)
        if (feito) ecraServico(s.id)
      },
    }))
  }

  if (!lista.length && !['atribuido', 'a_decorrer', 'concluido'].includes(s.estado)) return el('span')

  zona.append(el('div', { classe: 'secc-app__t' },
    el('h2', { texto: `Ocorrências${lista.length ? ` (${lista.length})` : ''}` })), corpo)
  return zona
}

function painelOcorrencia (s) {
  return painel({
    titulo: 'Registar uma ocorrência',
    sub: 'Fica no serviço, com data e hora, e a outra pessoa é avisada.',
    conteudo: (fim) => {
      const caixa = el('div', { classe: 'forma' })
      let tipo = 'dano'
      let fotoId = null
      const seg = el('div', { classe: 'seg', role: 'group', 'aria-label': 'Tipo' })
      const bs = [['dano', 'Dano'], ['perdido', 'Esquecido'], ['falta', 'Faltou'], ['outro', 'Outro']]
        .map(([v, t]) => {
          const b = el('button', { type: 'button', texto: t, 'aria-pressed': String(v === tipo) })
          b.onclick = () => { tipo = v; for (const x of bs) x.setAttribute('aria-pressed', String(x === b)) }
          return b
        })
      seg.append(...bs)

      const escolher = el('input', { type: 'file', accept: 'image/*', capture: 'environment', estilo: { display: 'none' } })
      const previa = el('div', { classe: 'fotos', estilo: { marginTop: '10px' } })
      const bFoto = el('button', { type: 'button', classe: 'b b--contorno b--largo' },
        I.camara(), 'Juntar fotografia')
      bFoto.onclick = () => escolher.click()
      escolher.addEventListener('change', async () => {
        const f = escolher.files?.[0]
        if (!f) return
        previa.textContent = ''
        previa.append(el('img', { src: URL.createObjectURL(f), alt: '' }))
        bFoto.disabled = true; bFoto.textContent = 'A enviar…'
        try {
          const { blob, mime } = await reduzirFoto(f)
          const d = await enviarBytes(`/v1/fotos?fim=${tipo === 'dano' ? 'dano' : 'perdido'}&servico=${s.id}`, blob, mime)
          fotoId = d.id
          bFoto.textContent = 'Fotografia juntada'
        } catch (erro) {
          brinde(erro.message, 'erro')
          bFoto.disabled = false; bFoto.textContent = 'Juntar fotografia'
        }
      })

      caixa.append(seg,
        campo({ nome: 'descricao', rotulo: 'O que aconteceu', tipo: 'textarea', obrigatorio: true,
          maxlength: '500', placeholder: 'Ex.: um copo partido na cozinha.' }),
        bFoto, escolher, previa,
        el('button', {
          type: 'button', classe: 'b b--campo', texto: 'Registar',
          onclick: async (ev) => {
            const b = ev.currentTarget
            const desc = $('#c-descricao', caixa).value.trim()
            if (desc.length < 3) return mostrarErroCampo(caixa, 'descricao', 'Escreva o que aconteceu.')
            b.disabled = true; b.textContent = 'A registar…'
            try {
              await pedir('POST', `/v1/servicos/${s.id}/ocorrencias`, { tipo, descricao: desc, foto_id: fotoId || undefined })
              fim(true)
            } catch (erro) { brinde(erro.message, 'erro'); b.disabled = false; b.textContent = 'Registar' }
          },
        }))
      return caixa
    },
  })
}

// ══════════════════════════ avaliacoes ══════════════════════════

async function zonaAvaliacao (s, souDono) {
  const zona = el('section', { classe: 'secc-app' })
  let lista = []
  try { lista = (await pedir('GET', `/v1/servicos/${s.id}/avaliacoes`)).avaliacoes || [] } catch {}

  const minha = lista.find(a => a.autor_id === E.conta?.id)
  const dela = lista.find(a => a.autor_id !== E.conta?.id)

  const corpo = el('div', { classe: 'cartao' })
  if (!minha) {
    corpo.append(el('p', { estilo: { margin: '0 0 14px' },
      texto: dela
        ? 'A outra pessoa já o avaliou. O que escreveu fica escondido até você também avaliar.'
        : 'Já pode avaliar. O que escrever fica escondido até a outra pessoa também avaliar, ou até passarem 14 dias.' }),
      el('a', { classe: 'b b--campo', href: `#/avaliar/${s.id}`, texto: 'Avaliar' }))
  } else if (minha.por_revelar) {
    corpo.append(
      el('div', { classe: 'aviso aviso--marca' }, el('div', {},
        el('b', { texto: 'A sua avaliação está escondida' }),
        'Aparece quando a outra pessoa também avaliar, ou daqui a 14 dias.')),
      el('div', { estilo: { marginTop: '14px' } }, vistaAvaliacao(minha, 'a sua')))
  } else {
    if (dela && !dela.escondida) corpo.append(vistaAvaliacao(dela))
    corpo.append(el('div', { estilo: { marginTop: dela ? '4px' : 0 } }, vistaAvaliacao(minha, 'a sua')))
  }

  zona.append(el('div', { classe: 'secc-app__t' }, el('h2', { texto: 'Avaliações' })), corpo)
  return zona
}

function vistaAvaliacao (a, quem) {
  return el('div', { classe: 'aval' },
    el('div', { classe: 'aval__c' },
      el('div', { classe: 'fita' }, estrelasVista(a.estrelas, 17),
        el('b', { texto: String(a.estrelas) })),
      el('span', { classe: 'nota', texto: quem || a.autor_nome || quandoRelativo(a.criada_em) })),
    (a.etiquetas || []).length
      ? el('div', { classe: 'aval__e' }, ...a.etiquetas.map(e => dist(e, 'ok')))
      : null,
    a.comentario ? el('p', { classe: 'aval__q', texto: `“${a.comentario}”` }) : null)
}

const DESCRICAO_ESTRELAS = [
  '',
  'Correu mal e não se resolveu',
  'Ficou bastante abaixo do combinado',
  'Cumpriu, com alguma coisa a apontar',
  'Correu bem',
  'Tudo como combinado, ou melhor',
]

async function ecraAvaliar (id) {
  const p = pintar('Avaliar')
  let s
  try { s = (await pedir('GET', `/v1/servicos/${id}`)).servico }
  catch (erro) { p.append(erroDeRede(erro, () => ecraAvaliar(id))); return }
  p.textContent = ''

  const souDono = s.dono_id === E.conta?.id
  const outro = souDono ? s.profissional : s.dono
  if (!E.etiquetas) { try { E.etiquetas = await pedir('GET', '/v1/etiquetas') } catch { E.etiquetas = { dono: [], profissional: [] } } }
  const disponiveis = souDono ? (E.etiquetas.profissional || []) : (E.etiquetas.dono || [])

  let estrelas = 0
  const escolhidas = new Set()

  const descricao = el('p', { classe: 'estrelar__d', texto: 'Toque nas estrelas' })
  const zonaEstrelas = el('div', { classe: 'estrelar', role: 'group', 'aria-label': 'Quantas estrelas' })
  const botoesE = Array.from({ length: 5 }, (_, i) => {
    const n = i + 1
    const b = el('button', {
      type: 'button', 'data-on': '0',
      'aria-label': `${n} ${n === 1 ? 'estrela' : 'estrelas'}`,
      'aria-pressed': 'false',
    }, I.estrela(24))
    b.onclick = () => {
      estrelas = n
      for (let j = 0; j < 5; j++) {
        botoesE[j].dataset.on = j < n ? '1' : '0'
        botoesE[j].setAttribute('aria-pressed', String(j === n - 1))
      }
      descricao.textContent = DESCRICAO_ESTRELAS[n]
      bEnviar.disabled = false
    }
    return b
  })
  zonaEstrelas.append(...botoesE)

  const zonaEtiquetas = el('div', { classe: 'etiquetas' },
    ...disponiveis.map(e => {
      const b = el('button', { type: 'button', classe: 'etiqueta', texto: e, 'aria-pressed': 'false' })
      b.onclick = () => {
        if (escolhidas.has(e)) { escolhidas.delete(e); b.setAttribute('aria-pressed', 'false') }
        else if (escolhidas.size < 4) { escolhidas.add(e); b.setAttribute('aria-pressed', 'true') }
        else brinde('São no máximo quatro.')
      }
      return b
    }))

  const bEnviar = el('button', { type: 'button', classe: 'b b--campo', 'data-acto': 'avaliar',
    texto: 'Enviar avaliação', disabled: true })
  bEnviar.onclick = async () => {
    bEnviar.disabled = true; bEnviar.textContent = 'A enviar…'
    try {
      const r = await pedir('POST', `/v1/servicos/${id}/avaliar`, {
        estrelas, etiquetas: [...escolhidas],
        comentario: $('#c-comentario', p)?.value?.trim() || undefined,
      })
      brinde(r.revelada
        ? 'Enviada. Já pode ver as duas avaliações.'
        : 'Enviada. Fica escondida até a outra pessoa avaliar.')
      irPara(`#/servico/${id}`)
    } catch (erro) {
      brinde(erro.message, 'erro')
      bEnviar.disabled = false; bEnviar.textContent = 'Enviar avaliação'
    }
  }

  p.append(el('div', { classe: 'forma' },
    el('h1', { classe: 'forma__t', texto: `Como correu com ${outro?.nome || 'a outra pessoa'}?` }),
    el('p', { classe: 'forma__sub', texto: `${dia(s.data)} · ${s.alojamento?.nome || s.alojamento?.concelho || ''}` }),
    outro ? el('div', { classe: 'cartao cartao--plano' }, pessoaVista(outro)) : null,
    el('div', {}, zonaEstrelas, descricao),
    disponiveis.length
      ? el('div', {}, el('p', { classe: 'rotulo', estilo: { marginBottom: '10px' } },
          'O que correu bem? (até quatro)'), zonaEtiquetas)
      : null,
    campo({ nome: 'comentario', rotulo: 'Quer escrever alguma coisa? (opcional)', tipo: 'textarea',
      maxlength: '700', placeholder: 'Fica visível no perfil da outra pessoa.' }),
    el('div', { classe: 'aviso' }, el('div', {},
      el('b', { texto: 'Ninguém vê nada até os dois avaliarem' }),
      'É por isso que vale a pena escrever o que pensa: a outra pessoa não pode responder ao que você escreveu.')),
    bEnviar,
  ))
}

// ══════════════════════════ formularios de criacao ══════════════════════════

const TIPOLOGIAS = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+', 'Moradia', 'Quarto']

async function ecraAlojamentoNovo (idExistente) {
  const editar = idExistente && idExistente !== 'novo'
  const p = pintar(editar ? 'Editar alojamento' : 'Novo alojamento')
  await garantirConcelhos()
  let a = {}
  if (editar) {
    try { a = (await pedir('GET', `/v1/alojamentos/${idExistente}`)).alojamento }
    catch (erro) { p.append(erroDeRede(erro, () => ecraAlojamentoNovo(idExistente))); return }
    p.textContent = ''
  }

  const f = el('form', { classe: 'forma', novalidate: true })
  f.append(
    el('h1', { classe: 'forma__t', texto: editar ? 'Editar alojamento' : 'O seu alojamento' }),
    el('p', { classe: 'forma__sub', texto: 'A morada só é mostrada a quem escolher para lá ir — nunca no mercado.' }),
    campo({ nome: 'nome', rotulo: 'Como lhe chama', obrigatorio: true, valor: a.nome || '',
      placeholder: 'Ex.: T2 da Praia', nota: 'É só para você o reconhecer na sua lista.' }),
    el('div', { classe: 'duplo' },
      campo({ nome: 'tipologia', rotulo: 'Tipologia', tipo: 'select', obrigatorio: true, valor: a.tipologia || 'T1',
        opcoes: TIPOLOGIAS.map(t => ({ v: t, t })) }),
      campo({ nome: 'area_m2', rotulo: 'Área (m², opcional)', tipo: 'number', inputmode: 'numeric',
        min: '0', max: '2000', valor: a.area_m2 ?? '' })),
    el('div', { classe: 'duplo' },
      campo({ nome: 'quartos', rotulo: 'Quartos', tipo: 'number', inputmode: 'numeric', min: '0', max: '20', valor: a.quartos ?? 1 }),
      campo({ nome: 'camas', rotulo: 'Camas', tipo: 'number', inputmode: 'numeric', min: '0', max: '40', valor: a.camas ?? 1 })),
    el('div', { classe: 'duplo' },
      campo({ nome: 'casas_banho', rotulo: 'Casas de banho', tipo: 'number', inputmode: 'numeric', min: '0', max: '20', valor: a.casas_banho ?? 1 }),
      campo({ nome: 'andar', rotulo: 'Andar (opcional)', valor: a.andar || '', placeholder: 'Ex.: 2.º Dto' })),
    el('label', { classe: 'escolha' },
      el('input', { type: 'checkbox', name: 'tem_elevador', id: 'c-tem_elevador', ...(a.tem_elevador ? { checked: true } : {}) }),
      el('span', { classe: 'txt' }, el('b', { texto: 'Tem elevador' }),
        el('span', { texto: 'Importa a quem vai levar roupa lavada para o 4.º andar.' }))),
    campo({ nome: 'concelho', rotulo: 'Concelho', tipo: 'select', obrigatorio: true, valor: a.concelho || '',
      opcoes: [{ v: '', t: 'Escolha o concelho…' }, ...(E.concelhos || []).map(c => ({ v: c.nome, t: `${c.nome} (${c.distrito})` }))] }),
    campo({ nome: 'freguesia', rotulo: 'Freguesia (opcional)', valor: a.freguesia || '',
      nota: 'Aparece no mercado. A morada não.' }),
    campo({ nome: 'morada', rotulo: 'Morada', obrigatorio: true, valor: a.morada || '',
      placeholder: 'Rua, número, andar', nota: 'Reservada. Só a vê quem ficar com o serviço.' }),
    campo({ nome: 'codigo_postal', rotulo: 'Código postal (opcional)', valor: a.codigo_postal || '', inputmode: 'numeric', placeholder: '0000-000' }),
    campo({ nome: 'acesso', rotulo: 'Como se entra (opcional)', tipo: 'textarea', valor: a.acesso || '', maxlength: '500',
      placeholder: 'Ex.: caixa de chaves ao lado da porta, código 0000.',
      nota: 'Reservado, como a morada. Só é mostrado depois de escolher alguém.' }),
    campo({ nome: 'instrucoes', rotulo: 'Notas da casa (opcional)', tipo: 'textarea', valor: a.instrucoes || '', maxlength: '2000',
      placeholder: 'Ex.: os lençóis extra estão no roupeiro do corredor. A máquina de lavar é na varanda.' }),
    campo({ nome: 'registo_al', rotulo: 'Número de registo AL (opcional)', valor: a.registo_al || '',
      nota: 'Quem faz limpezas confia mais num alojamento registado.' }),
    el('button', { type: 'submit', classe: 'b b--campo', texto: editar ? 'Guardar' : 'Criar alojamento' }),
  )

  if (editar) {
    f.append(el('div', { classe: 'zona-perigo' },
      el('button', { type: 'button', classe: 'b b--perigo b--largo', texto: 'Arquivar este alojamento',
        onclick: async () => {
          const ok = await confirmar({
            titulo: 'Arquivar o alojamento?',
            sub: 'Sai da sua lista e deixa de poder marcar limpezas. O histórico e as avaliações mantêm-se, porque também são de quem lá trabalhou.',
            botao: 'Sim, arquivar', perigo: true,
          })
          if (!ok) return
          try {
            await pedir('DELETE', `/v1/alojamentos/${idExistente}`)
            brinde('Arquivado.')
            irPara('#/alojamentos')
          } catch (erro) { brinde(erro.message, 'erro') }
        } })))
  }

  f.addEventListener('submit', async (ev) => {
    ev.preventDefault()
    limparErros(f)
    const b = $('button[type=submit]', f)
    const dados = {
      nome: $('#c-nome', f).value.trim(),
      tipologia: $('#c-tipologia', f).value,
      quartos: Number($('#c-quartos', f).value || 0),
      camas: Number($('#c-camas', f).value || 0),
      casas_banho: Number($('#c-casas_banho', f).value || 0),
      area_m2: $('#c-area_m2', f).value ? Number($('#c-area_m2', f).value) : undefined,
      andar: $('#c-andar', f).value.trim() || undefined,
      tem_elevador: $('#c-tem_elevador', f).checked,
      concelho: $('#c-concelho', f).value,
      freguesia: $('#c-freguesia', f).value.trim() || undefined,
      morada: $('#c-morada', f).value.trim(),
      codigo_postal: $('#c-codigo_postal', f).value.trim() || undefined,
      acesso: $('#c-acesso', f).value.trim() || undefined,
      instrucoes: $('#c-instrucoes', f).value.trim() || undefined,
      registo_al: $('#c-registo_al', f).value.trim() || undefined,
    }
    if (dados.nome.length < 2) return mostrarErroCampo(f, 'nome', 'Dê um nome ao alojamento.')
    if (!dados.concelho) return mostrarErroCampo(f, 'concelho', 'Escolha o concelho.')
    if (dados.morada.length < 5) return mostrarErroCampo(f, 'morada', 'Escreva a morada.')

    b.disabled = true; b.textContent = 'A guardar…'
    try {
      const r = editar
        ? await pedir('PATCH', `/v1/alojamentos/${idExistente}`, dados)
        : await pedir('POST', '/v1/alojamentos', dados)
      brinde(editar ? 'Guardado.' : 'Alojamento criado. Já pode marcar uma limpeza.')
      irPara(editar ? `#/alojamento/${idExistente}` : `#/servico/novo?alojamento=${r.alojamento.id}`)
    } catch (erro) {
      if (!mostrarErroCampo(f, erro.campo, erro.message)) brinde(erro.message, 'erro')
    } finally { b.disabled = false; b.textContent = editar ? 'Guardar' : 'Criar alojamento' }
  })
  p.append(f)
}

async function ecraAlojamento (id) {
  if (id === 'novo') return ecraAlojamentoNovo('novo')
  const p = pintar('Alojamento')
  let a, tarefas
  try {
    a = (await pedir('GET', `/v1/alojamentos/${id}`)).alojamento
    tarefas = (await pedir('GET', `/v1/alojamentos/${id}/tarefas`)).tarefas || []
  } catch (erro) { p.append(erroDeRede(erro, () => ecraAlojamento(id))); return }
  p.textContent = ''

  p.append(
    el('h1', { estilo: { fontSize: '1.5rem', margin: '0 0 6px' }, texto: a.nome }),
    el('p', { classe: 'mudo', texto: [a.tipologia, a.freguesia, a.concelho].filter(Boolean).join(' · ') }),
    el('div', { classe: 'morada', estilo: { margin: '18px 0' } },
      el('h3', { texto: 'Reservado' }),
      el('p', { estilo: { fontWeight: '400', fontSize: '16px' },
        texto: [a.morada, a.andar, a.codigo_postal].filter(Boolean).join(', ') }),
      a.acesso ? el('div', { classe: 'acesso' }, el('b', { texto: 'Acesso: ' }), a.acesso) : null,
      el('p', { classe: 'nota', estilo: { marginTop: '12px' },
        texto: 'Isto só é mostrado a quem escolher para cada limpeza.' })),
  )

  p.append(el('section', { classe: 'secc-app' },
    el('div', { classe: 'secc-app__t' },
      el('h2', { texto: 'A sua lista de tarefas' }),
      el('a', { href: `#/tarefas/${id}`, texto: 'Alterar' })),
    el('div', { classe: 'cartao cartao--fundo' },
      el('p', { classe: 'mudo', estilo: { margin: 0 } },
        `${tarefas.length} ${tarefas.length === 1 ? 'tarefa' : 'tarefas'}, `
        + `${tarefas.filter(t => t.exige_foto).length} com fotografia. `),
      el('p', { classe: 'nota', estilo: { marginTop: '8px', marginBottom: 0 } },
        'Esta lista é sua: nós sugerimos um rascunho, e você apaga, muda e acrescenta o que quiser.'))))

  p.append(el('div', { classe: 'pilha', estilo: { '--e': '12px' } },
    el('a', { classe: 'b b--contorno b--largo', href: `#/alojamento/${id}/editar`, texto: 'Editar dados' })))

  accaoAncorada('Marcar uma limpeza', () => irPara(`#/servico/novo?alojamento=${id}`))
}

async function ecraTarefasModelo (id) {
  const p = pintar('Lista de tarefas')
  let tarefas
  try { tarefas = (await pedir('GET', `/v1/alojamentos/${id}/tarefas`)).tarefas || [] }
  catch (erro) { p.append(erroDeRede(erro, () => ecraTarefasModelo(id))); return }
  p.textContent = ''

  const estado = tarefas.map(t => ({ ...t }))
  const zona = el('div', { classe: 'pilha', estilo: { '--e': '9px' } })

  const repintar = () => {
    zona.textContent = ''
    estado.forEach((t, i) => {
      zona.append(el('div', { classe: 'cartao', estilo: { padding: '13px' } },
        el('div', { classe: 'duplo' },
          campo({ nome: `zona-${i}`, rotulo: 'Zona', valor: t.zona,
            oninput: (ev) => { t.zona = ev.target.value } }),
          campo({ nome: `desc-${i}`, rotulo: 'Tarefa', valor: t.descricao,
            oninput: (ev) => { t.descricao = ev.target.value } })),
        el('div', { classe: 'fita', estilo: { marginTop: '12px', justifyContent: 'space-between' } },
          el('label', { classe: 'escolha', estilo: { flex: '1', minHeight: '44px' } },
            el('input', { type: 'checkbox', ...(t.exige_foto ? { checked: true } : {}),
              onchange: (ev) => { t.exige_foto = ev.target.checked ? 1 : 0 } }),
            el('span', { classe: 'txt' }, el('b', { texto: 'Pede fotografia' }))),
          el('button', { type: 'button', classe: 'b b--nu', texto: 'Apagar',
            onclick: () => { estado.splice(i, 1); repintar() } }))))
    })
  }
  repintar()

  p.append(
    el('h1', { estilo: { fontSize: '1.4rem', margin: '0 0 6px' }, texto: 'A sua lista de tarefas' }),
    el('p', { classe: 'mudo', estilo: { marginBottom: '18px' },
      texto: 'É a lista que vai em todas as limpezas desta casa. Escreva o que quer feito, à sua maneira — nós não temos padrão nenhum.' }),
    zona,
    el('button', { type: 'button', classe: 'b b--contorno b--largo', estilo: { marginTop: '12px' },
      texto: 'Acrescentar tarefa',
      onclick: () => { estado.push({ zona: 'Geral', descricao: '', exige_foto: 0 }); repintar() } }),
  )

  accaoAncorada('Guardar lista', async () => {
    const limpas = estado.filter(t => String(t.descricao || '').trim().length >= 2)
      .map(t => ({ zona: String(t.zona || 'Geral').trim() || 'Geral', descricao: t.descricao.trim(), exige_foto: !!t.exige_foto }))
    await pedir('PUT', `/v1/alojamentos/${id}/tarefas`, { tarefas: limpas })
    brinde('Lista guardada.')
    irPara(`#/alojamento/${id}`)
  })
}

async function ecraServicoNovo (params) {
  const p = pintar('Marcar limpeza')
  let alojamentos, equipa
  try {
    alojamentos = (await pedir('GET', '/v1/alojamentos')).alojamentos || []
    equipa = (await pedir('GET', '/v1/equipa')).minha_equipa || []
  } catch (erro) { p.append(erroDeRede(erro, () => ecraServicoNovo(params))); return }
  p.textContent = ''

  if (!alojamentos.length) {
    p.append(vazio(I.casa, 'Falta o alojamento',
      'Antes de marcar uma limpeza, diga que casa tem.',
      el('a', { classe: 'b b--campo', href: '#/alojamento/novo', texto: 'Adicionar alojamento' })))
    return
  }

  const daEquipa = equipa.filter(e => e.estado === 'activa' && e.profissional)
  let visibilidade = daEquipa.length ? 'directo' : 'mercado'
  let paraQuem = daEquipa[0]?.profissional?.id || null

  const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const f = el('form', { classe: 'forma', novalidate: true })

  const zonaQuem = el('div')
  const pintarQuem = () => {
    zonaQuem.textContent = ''
    if (visibilidade !== 'directo' || !daEquipa.length) return
    zonaQuem.append(campo({
      nome: 'para_quem', rotulo: 'A quem entrega', tipo: 'select', valor: paraQuem,
      opcoes: daEquipa.map(e => ({ v: e.profissional.id, t: e.alcunha || e.profissional.nome })),
      onchange: (ev) => { paraQuem = ev.target.value },
    }))
  }

  const seg = el('div', { classe: 'seg', role: 'group', 'aria-label': 'Para quem' })
  const opcoes = [
    daEquipa.length ? ['directo', 'A uma pessoa'] : null,
    daEquipa.length ? ['equipa', 'À equipa'] : null,
    ['mercado', 'A quem estiver perto'],
  ].filter(Boolean)
  const bsVis = opcoes.map(([v, t]) => {
    const b = el('button', { type: 'button', texto: t, 'aria-pressed': String(v === visibilidade) })
    b.onclick = () => {
      visibilidade = v
      for (const x of bsVis) x.setAttribute('aria-pressed', String(x === b))
      pintarQuem()
    }
    return b
  })
  seg.append(...bsVis)
  pintarQuem()

  f.append(
    el('h1', { classe: 'forma__t', texto: 'Marcar uma limpeza' }),
    campo({ nome: 'alojamento', rotulo: 'Que casa', tipo: 'select', obrigatorio: true,
      valor: params.get('alojamento') || alojamentos[0].id,
      opcoes: alojamentos.map(a => ({ v: a.id, t: `${a.nome} · ${a.concelho}` })) }),
    campo({ nome: 'data', rotulo: 'Que dia', tipo: 'date', obrigatorio: true, valor: amanha, min: hojeISO() }),
    el('div', { classe: 'duplo' },
      campo({ nome: 'hora_inicio', rotulo: 'Pode entrar a partir das', tipo: 'time', obrigatorio: true, valor: '11:00',
        nota: 'Normalmente a hora do check-out.' }),
      campo({ nome: 'hora_limite', rotulo: 'Tem de estar pronto às', tipo: 'time', obrigatorio: true, valor: '15:00',
        nota: 'Normalmente a hora do check-in.' })),
    campo({ nome: 'tipo', rotulo: 'Que tipo de limpeza', tipo: 'select', valor: 'saida',
      opcoes: [
        { v: 'saida', t: 'Limpeza de saída (entre hóspedes)' },
        { v: 'profunda', t: 'Limpeza profunda' },
        { v: 'preparacao', t: 'Preparação antes de hóspedes' },
        { v: 'manutencao', t: 'Manutenção' }] }),
    campo({ nome: 'valor', rotulo: 'Quanto oferece (em euros)', tipo: 'number', inputmode: 'decimal',
      min: '0', step: '0.5',
      nota: 'Quem faz a limpeza pode aceitar ou propor outro valor. O Tudo Pronto não sugere preços.' }),
    campo({ nome: 'duracao_prevista', rotulo: 'Quanto tempo acha que leva (minutos, opcional)', tipo: 'number',
      inputmode: 'numeric', min: '15', max: '960', step: '15', placeholder: '120' }),
    el('label', { classe: 'escolha' },
      el('input', { type: 'checkbox', id: 'c-muda_roupa', checked: true }),
      el('span', { classe: 'txt' }, el('b', { texto: 'Mudar a roupa de cama e as toalhas' }))),
    campo({ nome: 'roupa_de', rotulo: 'A roupa lavada é de quem', tipo: 'select', valor: 'alojamento',
      opcoes: [
        { v: 'alojamento', t: 'Está na casa' },
        { v: 'profissional', t: 'Quem limpa traz' },
        { v: 'lavandaria', t: 'Vem de lavandaria' }] }),
    el('label', { classe: 'escolha' },
      el('input', { type: 'checkbox', id: 'c-repor_consumiveis', checked: true }),
      el('span', { classe: 'txt' }, el('b', { texto: 'Repor consumíveis' }),
        el('span', { texto: 'Papel higiénico, sabonete, cápsulas de café.' }))),
    campo({ nome: 'produtos_de', rotulo: 'Os produtos de limpeza são de quem', tipo: 'select', valor: 'alojamento',
      opcoes: [{ v: 'alojamento', t: 'Estão na casa' }, { v: 'profissional', t: 'Quem limpa traz os seus' }] }),
    el('div', {}, el('p', { classe: 'rotulo', estilo: { marginBottom: '8px' }, texto: 'Para quem vai' }), seg),
    zonaQuem,
    campo({ nome: 'notas', rotulo: 'Quer deixar um recado? (opcional)', tipo: 'textarea', maxlength: '1000',
      placeholder: 'Ex.: saem quatro pessoas, a casa vai estar bastante usada.' }),
  )

  f.addEventListener('submit', (ev) => ev.preventDefault())
  p.append(f)

  accaoAncorada('Marcar limpeza', async () => {
    limparErros(f)
    const bruto = $('#c-valor', f).value
    const dados = {
      alojamento_id: $('#c-alojamento', f).value,
      data: $('#c-data', f).value,
      hora_inicio: $('#c-hora_inicio', f).value,
      hora_limite: $('#c-hora_limite', f).value,
      tipo: $('#c-tipo', f).value,
      valor: bruto ? Math.round(parseFloat(bruto.replace(',', '.')) * 100) : undefined,
      duracao_prevista: $('#c-duracao_prevista', f).value ? Number($('#c-duracao_prevista', f).value) : undefined,
      muda_roupa: $('#c-muda_roupa', f).checked,
      roupa_de: $('#c-roupa_de', f).value,
      repor_consumiveis: $('#c-repor_consumiveis', f).checked,
      produtos_de: $('#c-produtos_de', f).value,
      visibilidade,
      profissional_id: visibilidade === 'directo' ? paraQuem : undefined,
      notas: $('#c-notas', f).value.trim() || undefined,
    }
    if (!dados.data) return mostrarErroCampo(f, 'data', 'Escolha o dia.')
    if (dados.hora_limite <= dados.hora_inicio) {
      return mostrarErroCampo(f, 'hora_limite', 'Tem de ser depois da hora de entrada.')
    }
    const r = await pedir('POST', '/v1/servicos', dados)
    brinde(visibilidade === 'directo' ? 'Entregue. A pessoa já foi avisada.' : 'Publicado.')
    irPara(`#/servico/${r.servico.id}`)
  })
}

// ══════════════════════════ equipa ══════════════════════════

async function ecraEquipa () {
  const p = pintar('Equipa', { comBarra: true, semVoltar: true })
  let d
  try { d = await pedir('GET', '/v1/equipa') }
  catch (erro) { p.append(erroDeRede(erro, ecraEquipa)); return }
  p.textContent = ''

  const souDono = !!E.conta?.e_dono
  const minha = d.minha_equipa || []
  const para = d.trabalho_para || []

  p.append(el('h1', { estilo: { fontSize: '1.4rem', margin: '0 0 6px' }, texto: 'Equipa' }))

  if (souDono) {
    p.append(el('p', { classe: 'mudo', estilo: { marginBottom: '20px' },
      texto: 'As pessoas de confiança a quem pode entregar limpezas directamente, sem passar pelo mercado.' }))
    const corpo = el('div', { classe: 'pilha', estilo: { '--e': '12px' } })
    if (!minha.length) {
      corpo.append(el('div', { classe: 'cartao cartao--fundo' },
        el('p', { estilo: { margin: 0 },
          texto: 'Ainda não convidou ninguém. Se já tem uma pessoa que lhe limpa a casa, é por aqui que começa: convide-a e passa a combinar tudo aqui.' })))
    }
    for (const e of minha) {
      const cart = el('div', { classe: 'cartao' })
      if (e.profissional) {
        cart.append(pessoaVista(e.profissional, { ligar: true }))
        if (e.alcunha && e.alcunha !== e.profissional.nome) {
          cart.append(el('p', { classe: 'nota', estilo: { marginTop: '6px' }, texto: `Na sua lista: ${e.alcunha}` }))
        }
      } else {
        cart.append(
          el('div', { classe: 'pessoa' },
            el('span', { classe: 'pessoa__f', texto: iniciais(e.alcunha), 'aria-hidden': 'true' }),
            el('div', {}, el('p', { classe: 'pessoa__n', texto: e.alcunha }),
              el('p', { classe: 'pessoa__m' }, el('span', { texto: 'Convite enviado' })))),
        )
        if (e.convite_codigo) {
          cart.append(el('div', { classe: 'aviso aviso--marca', estilo: { marginTop: '12px' } },
            el('div', {}, el('b', { texto: 'Código de convite' }),
              el('span', { estilo: { fontSize: '26px', fontWeight: '700', letterSpacing: '.18em' }, texto: e.convite_codigo }),
              el('span', { estilo: { display: 'block', marginTop: '6px', fontSize: '14px' },
                texto: 'Ela escreve este código na aplicação. Se o email não chegar, diga-lho por telefone.' }))))
        }
      }
      cart.append(el('div', { classe: 'zona-perigo' },
        el('button', { type: 'button', classe: 'b b--nu b--largo', texto: 'Remover da equipa',
          onclick: async () => {
            const ok = await confirmar({
              titulo: 'Remover da equipa?',
              sub: `${e.alcunha || e.profissional?.nome} deixa de receber as suas limpezas directamente. As limpezas já combinadas mantêm-se.`,
              botao: 'Remover', perigo: true,
            })
            if (!ok) return
            try { await pedir('DELETE', `/v1/equipa/${e.id}`); ecraEquipa() }
            catch (erro) { brinde(erro.message, 'erro') }
          } })))
      corpo.append(cart)
    }
    p.append(corpo)
    accaoAncorada('Convidar alguém', async () => {
      const feito = await painelConvidar()
      if (feito) ecraEquipa()
    })
  }

  if (!souDono || para.length) {
    p.append(el('section', { classe: 'secc-app', estilo: { marginTop: souDono ? '30px' : '0' } },
      el('div', { classe: 'secc-app__t' }, el('h2', { texto: 'Trabalho para' })),
      para.length
        ? el('div', { classe: 'pilha', estilo: { '--e': '12px' } },
            ...para.map(x => el('div', { classe: 'cartao' },
              pessoaVista({ id: x.dono_id, nome: x.dono_nome, foto_id: x.dono_foto }, { ligar: true }),
              el('div', { classe: 'zona-perigo' },
                el('button', { type: 'button', classe: 'b b--nu b--largo', texto: 'Sair desta equipa',
                  onclick: async () => {
                    const ok = await confirmar({
                      titulo: 'Sair da equipa?',
                      sub: `Deixa de receber as limpezas de ${x.dono_nome} directamente. Pode continuar a oferecer-se no mercado.`,
                      botao: 'Sair', perigo: true,
                    })
                    if (!ok) return
                    try { await pedir('DELETE', `/v1/equipa/${x.id}`); ecraEquipa() }
                    catch (erro) { brinde(erro.message, 'erro') }
                  } })))))
        : el('div', { classe: 'cartao cartao--fundo' },
            el('p', { estilo: { margin: '0 0 14px' },
              texto: 'Ninguém a convidou ainda. Se já trabalha para alguém com alojamento local, peça-lhe o código de convite: fica logo com as limpezas dessa pessoa, sem esperar pelo mercado.' }),
            el('button', { type: 'button', classe: 'b b--contorno b--largo', texto: 'Tenho um código de convite',
              onclick: async () => { if (await painelEntrarEquipa()) ecraEquipa() } }))))
  }

  if (!souDono && para.length) {
    accaoAncorada('Tenho um código de convite', async () => {
      if (await painelEntrarEquipa()) ecraEquipa()
    })
  }
}

const painelConvidar = () => painel({
  titulo: 'Convidar para a equipa',
  sub: 'Se ela já tiver conta, fica ligada logo. Se não, recebe um código por email.',
  conteudo: (fim) => {
    const caixa = el('div', { classe: 'forma' })
    caixa.append(
      campo({ nome: 'alcunha', rotulo: 'Como se chama', obrigatorio: true,
        nota: 'É o nome que aparece na sua lista.' }),
      campo({ nome: 'email_convite', rotulo: 'Email dela (opcional)', tipo: 'email',
        inputmode: 'email', autocapitalize: 'off',
        nota: 'Sem email, dá-lhe o código por telefone ou em mão.' }),
      el('button', {
        type: 'button', classe: 'b b--campo', texto: 'Convidar',
        onclick: async (ev) => {
          const b = ev.currentTarget
          const alcunha = $('#c-alcunha', caixa).value.trim()
          if (alcunha.length < 2) return mostrarErroCampo(caixa, 'alcunha', 'Escreva o nome.')
          b.disabled = true; b.textContent = 'A convidar…'
          try {
            const r = await pedir('POST', '/v1/equipa/convidar', {
              alcunha, email: $('#c-email_convite', caixa).value.trim() || undefined,
            })
            brinde(r.ja_tinha_conta ? 'Ficou logo na sua equipa.' : 'Convite criado. Dê-lhe o código.')
            fim(true)
          } catch (erro) {
            if (!mostrarErroCampo(caixa, erro.campo, erro.message)) brinde(erro.message, 'erro')
            b.disabled = false; b.textContent = 'Convidar'
          }
        },
      }))
    return caixa
  },
})

const painelEntrarEquipa = () => painel({
  titulo: 'Código de convite',
  sub: 'Escreva os 6 algarismos que lhe deram.',
  conteudo: (fim) => {
    const caixa = el('div', { classe: 'forma' })
    const entrada = el('input', {
      type: 'text', id: 'c-codigo_equipa', classe: 'codigo', inputmode: 'numeric',
      autocomplete: 'one-time-code', maxlength: '6', 'aria-label': 'Código de convite',
    })
    entrada.addEventListener('input', () => { entrada.value = entrada.value.replace(/\D/g, '').slice(0, 6) })
    caixa.append(
      el('label', { classe: 'campo', for: 'c-codigo_equipa' },
        el('span', { classe: 'rotulo', texto: 'Código' }), entrada,
        el('span', { classe: 'erro', 'data-erro': 'codigo_equipa', hidden: true })),
      el('button', {
        type: 'button', classe: 'b b--campo', texto: 'Juntar-me',
        onclick: async (ev) => {
          const b = ev.currentTarget
          if (entrada.value.length !== 6) return mostrarErroCampo(caixa, 'codigo_equipa', 'Faltam algarismos.')
          b.disabled = true; b.textContent = 'Um momento…'
          try {
            const r = await pedir('POST', '/v1/equipa/entrar', { codigo: entrada.value })
            brinde(r.dono ? `Já está na equipa de ${r.dono}.` : 'Já está na equipa.')
            fim(true)
          } catch (erro) {
            mostrarErroCampo(caixa, 'codigo_equipa', erro.message)
            b.disabled = false; b.textContent = 'Juntar-me'
          }
        },
      }))
    setTimeout(() => entrada.focus(), 60)
    return caixa
  },
})

// ══════════════════════════ perfil e conta ══════════════════════════

async function ecraPerfil (id) {
  const p = pintar('Perfil')
  let d
  try { d = await pedir('GET', `/v1/perfil/${id}`) }
  catch (erro) { p.append(erroDeRede(erro, () => ecraPerfil(id))); return }
  p.textContent = ''
  const x = d.perfil
  const fiabilidade = x.n_concluidos + x.n_cancelados
    ? Math.round(x.n_concluidos / (x.n_concluidos + x.n_cancelados) * 100)
    : null

  p.append(
    el('div', { classe: 'cartao' },
      pessoaVista(x, { grande: true }),
      x.bio ? el('p', { estilo: { marginTop: '16px' }, texto: x.bio }) : null,
      el('p', { classe: 'nota', estilo: { marginTop: '12px' },
        texto: `No Tudo Pronto desde ${new Date(x.desde).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}` })),
    // Duas medidas separadas de proposito. Misturar qualidade com fiabilidade
    // numa pontuacao unica penaliza quem trabalha pouco em vez de quem
    // trabalha mal.
    el('div', { classe: 'medidas', estilo: { marginTop: '16px' } },
      el('div', { classe: 'medida' },
        el('b', { texto: x.estrelas ? String(x.estrelas).replace('.', ',') : '—' }),
        el('span', { texto: x.n_avaliacoes
          ? `de 5, em ${x.n_avaliacoes} ${x.n_avaliacoes === 1 ? 'avaliação' : 'avaliações'}`
          : 'ainda sem avaliações' })),
      el('div', { classe: 'medida' },
        el('b', { texto: fiabilidade === null ? '—' : `${fiabilidade}%` }),
        el('span', { texto: fiabilidade === null
          ? 'ainda sem histórico'
          : `${x.n_concluidos} de ${x.n_concluidos + x.n_cancelados} levados até ao fim` }))),
  )

  if (x.n_faltas) {
    p.append(el('div', { classe: 'aviso aviso--aviso', estilo: { marginTop: '16px' } },
      el('div', {}, `${x.n_faltas} ${x.n_faltas === 1 ? 'falta registada' : 'faltas registadas'}: aceitou e não apareceu.`)))
  }

  const avs = d.avaliacoes || []
  p.append(el('section', { classe: 'secc-app', estilo: { marginTop: '26px' } },
    el('div', { classe: 'secc-app__t' }, el('h2', { texto: `Avaliações${avs.length ? ` (${avs.length})` : ''}` })),
    avs.length
      ? el('div', { classe: 'cartao' }, ...avs.map(a => vistaAvaliacao(a)))
      : el('div', { classe: 'cartao cartao--fundo' },
          el('p', { classe: 'mudo', estilo: { margin: 0 }, texto: 'Ainda não há avaliações visíveis.' }))))
}

async function ecraEu () {
  const p = pintar('A minha conta', { comBarra: true, semVoltar: true })
  await Promise.all([carregarEu().catch(() => {}), garantirConcelhos()])
  p.textContent = ''
  const c = E.conta
  if (!c) { p.append(erroDeRede({ message: 'Não foi possível carregar a conta.' }, ecraEu)); return }

  const f = el('form', { classe: 'forma', novalidate: true })
  f.append(
    el('div', { classe: 'cartao' },
      pessoaVista(c, { grande: true }),
      el('a', { classe: 'b b--contorno b--largo', estilo: { marginTop: '14px' },
        href: `#/perfil/${c.id}`, texto: 'Ver o meu perfil público' })),
    campo({ nome: 'nome', rotulo: 'Nome', valor: c.nome, obrigatorio: true }),
    campo({ nome: 'telefone', rotulo: 'Telefone (opcional)', tipo: 'tel', valor: c.telefone || '',
      inputmode: 'tel', autocomplete: 'tel',
      nota: 'Só é mostrado à outra pessoa depois de um serviço ficar combinado.' }),
    campo({ nome: 'bio', rotulo: 'Uma linha sobre si (opcional)', tipo: 'textarea', valor: c.bio || '', maxlength: '600',
      placeholder: c.e_profissional ? 'Ex.: faço limpezas de alojamento local há 6 anos na zona de Ovar.' : 'Ex.: tenho dois apartamentos em Esmoriz.' }),
  )
  if (c.e_profissional) {
    f.append(
      campo({ nome: 'concelho', rotulo: 'Concelho onde trabalha', tipo: 'select', valor: c.concelho || '',
        opcoes: [{ v: '', t: 'Escolha…' }, ...(E.concelhos || []).map(x => ({ v: x.nome, t: `${x.nome} (${x.distrito})` }))] }),
      campo({ nome: 'raio_km', rotulo: 'Até quantos quilómetros aceita ir', tipo: 'number',
        inputmode: 'numeric', min: '1', max: '100', valor: c.raio_km ?? 15 }),
    )
  }
  f.addEventListener('submit', (ev) => ev.preventDefault())
  p.append(f)

  p.append(el('section', { classe: 'secc-app', estilo: { marginTop: '26px' } },
    el('div', { classe: 'secc-app__t' }, el('h2', { texto: 'Avisos' })),
    el('div', { classe: 'cartao' }, zonaPush())))

  p.append(el('section', { classe: 'secc-app' },
    el('div', { classe: 'secc-app__t' }, el('h2', { texto: 'Aspecto' })),
    el('div', { classe: 'cartao cartao--plano' }, zonaTema())))

  p.append(el('div', { classe: 'pilha', estilo: { '--e': '10px', marginTop: '20px' } },
    el('a', { classe: 'b b--nu b--largo', href: '../como-funciona.html', texto: 'Como funciona' }),
    el('a', { classe: 'b b--nu b--largo', href: '../apoio.html', texto: 'Apoio' }),
    el('a', { classe: 'b b--nu b--largo', href: '../privacidade.html', texto: 'Privacidade' }),
    el('a', { classe: 'b b--nu b--largo', href: '../termos.html', texto: 'Termos' })))

  p.append(el('div', { classe: 'zona-perigo' },
    el('button', { type: 'button', classe: 'b b--contorno b--largo', texto: 'Sair da conta',
      onclick: async () => {
        const ok = await confirmar({ titulo: 'Sair da conta?', sub: 'Vai ter de escrever o email e a senha para voltar a entrar.', botao: 'Sair' })
        if (ok) sair()
      } })))

  accaoAncorada('Guardar alterações', async () => {
    const dados = {
      nome: $('#c-nome', f).value.trim(),
      telefone: $('#c-telefone', f).value.trim() || null,
      bio: $('#c-bio', f).value.trim() || null,
    }
    if (c.e_profissional) {
      dados.concelho = $('#c-concelho', f).value || null
      dados.raio_km = Number($('#c-raio_km', f).value || 15)
    }
    if (dados.nome.length < 2) { mostrarErroCampo(f, 'nome', 'Escreva o seu nome.'); return }
    const d = await pedir('PATCH', '/v1/eu', dados)
    E.conta = { ...E.conta, ...d.conta }
    guardar(CHAVE_SESSAO, { testemunho: E.testemunho, conta: E.conta })
    brinde('Guardado.')
  })
}

function zonaTema () {
  const actual = lerG(CHAVE_TEMA, 'sistema')
  const seg = el('div', { classe: 'seg', role: 'group', 'aria-label': 'Tema' })
  const bs = [['sistema', 'Como o telemóvel'], ['claro', 'Claro'], ['escuro', 'Escuro']].map(([v, t]) => {
    const b = el('button', { type: 'button', texto: t, 'aria-pressed': String(v === actual) })
    b.onclick = () => {
      guardar(CHAVE_TEMA, v)
      aplicarTema()
      for (const x of bs) x.setAttribute('aria-pressed', String(x === b))
    }
    return b
  })
  seg.append(...bs)
  return seg
}

function zonaPush () {
  const caixa = el('div')
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    caixa.append(el('p', { classe: 'mudo', estilo: { margin: 0 },
      texto: 'Este telemóvel ou navegador não suporta avisos. Continua a receber tudo por email.' }))
    return caixa
  }
  const estado = Notification.permission
  if (estado === 'granted') {
    caixa.append(el('div', { classe: 'aviso aviso--ok' }, el('div', {}, 'Os avisos estão ligados.')))
    return caixa
  }
  if (estado === 'denied') {
    caixa.append(el('p', { classe: 'mudo', estilo: { margin: 0 },
      texto: 'Os avisos estão bloqueados nas definições do navegador. Para os ligar, tem de os autorizar nas definições do site.' }))
    return caixa
  }
  caixa.append(
    el('p', { estilo: { margin: '0 0 14px' },
      texto: 'Receba um aviso quando alguém se oferecer, quando uma limpeza ficar combinada, ou quando ficar tudo pronto.' }),
    el('button', { type: 'button', classe: 'b b--contorno b--largo', texto: 'Ligar os avisos',
      onclick: async (ev) => {
        const b = ev.currentTarget
        b.disabled = true
        try { await ligarPush(); brinde('Avisos ligados.'); ecraEu() }
        catch (erro) { brinde(erro.message || 'Não foi possível ligar os avisos.', 'erro'); b.disabled = false }
      } }),
    // No iOS os avisos SO funcionam em aplicacao instalada no ecra principal, e
    // nao ha forma de o pedir a quem so abriu o site: o `beforeinstallprompt`
    // nunca existiu na Apple. A instrucao tem de ser interface nossa.
    !window.matchMedia('(display-mode: standalone)').matches && /iPad|iPhone|iPod/.test(navigator.userAgent)
      ? el('div', { classe: 'instala', estilo: { marginTop: '14px' } },
          el('h3', { texto: 'No iPhone é preciso instalar primeiro' }),
          el('ol', {},
            el('li', { texto: 'Toque no botão de partilha, em baixo no Safari.' }),
            el('li', { texto: 'Escolha «Adicionar ao ecrã principal».' }),
            el('li', { texto: 'Abra o Tudo Pronto por esse ícone e volte aqui.' })))
      : null,
  )
  return caixa
}

async function ligarPush () {
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') throw new Error('Os avisos não foram autorizados.')
  const { chave } = await pedir('GET', '/v1/vapid')
  if (!chave) throw new Error('Os avisos ainda não estão configurados do nosso lado.')
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: Uint8Array.from(
      atob(chave.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((chave.length + 3) % 4)),
      c => c.charCodeAt(0)),
  })
  const j = sub.toJSON()
  await pedir('POST', '/v1/push', { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth })
}

// ══════════════════════════ avisos e conversa ══════════════════════════

async function ecraAvisos () {
  const p = pintar('Avisos')
  let d
  try { d = await pedir('GET', '/v1/avisos') }
  catch (erro) { p.append(erroDeRede(erro, ecraAvisos)); return }
  p.textContent = ''
  const lista = d.avisos || []
  if (!lista.length) {
    p.append(vazio(I.relogio, 'Sem avisos', 'Quando alguma coisa acontecer nas suas limpezas, fica aqui.'))
    return
  }
  p.append(el('div', { classe: 'pilha', estilo: { '--e': '10px' } },
    ...lista.map(a => el(a.ligacao ? 'a' : 'div', {
      classe: 'cartao', ...(a.ligacao ? { href: a.ligacao.replace('/app/', '') } : {}),
      estilo: { textDecoration: 'none', color: 'inherit', ...(a.lido_em ? { opacity: '.72' } : {}) },
    },
      el('div', { classe: 'fita', estilo: { justifyContent: 'space-between', alignItems: 'flex-start' } },
        el('b', { estilo: { fontSize: '16px' }, texto: a.titulo }),
        el('span', { classe: 'nota', estilo: { flex: 'none' }, texto: quandoRelativo(a.criado_em) })),
      a.corpo ? el('p', { classe: 'mudo', estilo: { margin: '6px 0 0', fontSize: '15px' }, texto: a.corpo }) : null))))

  try { await pedir('POST', '/v1/avisos/lidos'); E.avisosPorLer = 0; pintarContaAvisos() } catch {}
}

async function ecraConversa (id) {
  const p = pintar('Mensagens')
  let d, s
  try {
    d = await pedir('GET', `/v1/servicos/${id}/mensagens`)
    s = (await pedir('GET', `/v1/servicos/${id}`)).servico
  } catch (erro) { p.append(erroDeRede(erro, () => ecraConversa(id))); return }
  p.textContent = ''

  const conversa = el('div', { classe: 'conversa' })
  const pintarMsgs = (lista) => {
    conversa.textContent = ''
    if (!lista.length) {
      conversa.append(el('p', { classe: 'mudo', estilo: { textAlign: 'center', padding: '20px 0' },
        texto: 'Ainda não há mensagens.' }))
    }
    for (const m of lista) {
      const eu = m.autor_id === E.conta?.id
      conversa.append(el('div', { classe: 'msg ' + (eu ? 'msg--eu' : 'msg--ele') },
        m.texto, el('span', { classe: 'msg__h', texto: quandoRelativo(m.criada_em) })))
    }
  }
  pintarMsgs(d.mensagens || [])

  p.append(
    el('a', { classe: 'b b--nu b--largo', href: `#/servico/${id}`, estilo: { marginBottom: '14px' },
      texto: `${dia(s.data)} · ${s.alojamento?.nome || s.alojamento?.concelho || 'limpeza'}` }),
    conversa)

  const entrada = el('textarea', { id: 'c-msg', rows: '2', maxlength: '1000',
    placeholder: 'Escreva a sua mensagem', 'aria-label': 'Mensagem' })
  p.append(el('div', {}, entrada))

  accaoAncorada('Enviar', async () => {
    const t = entrada.value.trim()
    if (!t) return
    await pedir('POST', `/v1/servicos/${id}/mensagens`, { texto: t })
    entrada.value = ''
    const nova = await pedir('GET', `/v1/servicos/${id}/mensagens`)
    pintarMsgs(nova.mensagens || [])
    conversa.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

// ══════════════════════════ casco e navegacao ══════════════════════════

/** Substitui o <main> por um NOVO em cada pintura, em vez de embrulhar cada
 *  ecra numa caixa dentro dele. Embrulhar parece inofensivo e parte em
 *  silencio todos os selectores `#principal > algo` — e `display: contents`
 *  nao salva, porque muda a caixa de layout e nao a arvore de selectores.
 *  Assim os filhos directos continuam a ser filhos directos, e uma pintura
 *  atrasada escreve no seu <main>, que ja nao esta no documento. */
let geracao = 0

function pintar (titulo, { comBarra, semVoltar, semTopo } = {}) {
  const velho = $('#principal')
  const novo = el('main', { id: 'principal', classe: 'corpo', tabindex: '-1' })
  novo.dataset.geracao = String(++geracao)
  if (comBarra) novo.classList.add('corpo--com-barra')
  velho.replaceWith(novo)
  // TODOS, e nao `$('#accao')?.remove()`: dois ecras a pintar em paralelo
  // deixavam dois botoes ancorados sobrepostos, e quem carregasse podia
  // acertar no de baixo — o de um estado que ja nao existe. Aconteceu porque
  // a accao ancorada vive no `body` e escapa a substituicao do <main>.
  for (const n of $$('[id="accao"]')) n.remove()

  const topo = $('#topo')
  topo.hidden = !!semTopo
  $('#topo-t').textContent = titulo
  $('#voltar').hidden = !!semVoltar || !!semTopo
  $('#avisos-b').hidden = !E.conta
  document.title = titulo === 'Tudo Pronto' ? 'Tudo Pronto' : `${titulo} · Tudo Pronto`

  $('#barra').hidden = !comBarra
  if (comBarra) pintarBarra()
  window.scrollTo(0, 0)
  return novo
}

function pintarBarra () {
  const barra = $('#barra')
  const r = rotaActual()
  const souDono = !!E.conta?.e_dono
  const souProf = !!E.conta?.e_profissional
  // Quatro destinos, e nao mais. Cada destino a mais e uma decisao a mais para
  // quem abre isto duas vezes por semana — e a barra nao ganha um quinto sem
  // se tirar um dos que ca estao.
  const destinos = souDono
    ? [['#/', 'Limpezas', I.lista], ['#/alojamentos', 'Casas', I.casa], ['#/equipa', 'Equipa', I.pessoas], ['#/eu', 'Conta', I.eu]]
    : [['#/', 'Limpezas', I.lista], ['#/mercado', 'Perto', I.lupa], ['#/equipa', 'Equipa', I.pessoas], ['#/eu', 'Conta', I.eu]]
  barra.textContent = ''
  for (const [h, t, ic] of destinos) {
    const activo = h === '#/' ? (r === '#/' || r === '') : r.startsWith(h)
    barra.append(el('a', { href: h, ...(activo ? { 'aria-current': 'page' } : {}) }, ic(), el('span', { texto: t })))
  }
}

function pintarContaAvisos () {
  const n = $('#avisos-n')
  if (!n) return
  n.textContent = E.avisosPorLer > 9 ? '9+' : String(E.avisosPorLer)
  n.hidden = !E.avisosPorLer
}

const rotaActual = () => location.hash || '#/'
const irPara = (h) => { if (location.hash === h) encaminhar(); else location.hash = h }

function actualizarRede () {
  const n = $('#rede')
  if (!n) return
  // Decide-se JA com o que se sabe de imediato, e afina-se quando a fila
  // responder. Esperar pelo IndexedDB para dizer "sem rede" fazia o aviso
  // chegar segundos depois de a pessoa ja estar a tentar usar a aplicacao —
  // e sem rede, os pedidos do arranque demoram a desistir.
  if (estaSemRede()) {
    $('#rede-txt').textContent =
      'Sem rede. O que fizer fica guardado no telemóvel e envia-se sozinho quando houver ligação.'
    n.hidden = false
  }
  fila().then(f => {
    const semRede = estaSemRede()
    const porEnviar = f.length
    if (semRede) {
      $('#rede-txt').textContent = porEnviar
        ? `Sem rede. ${porEnviar} ${porEnviar === 1 ? 'coisa guardada' : 'coisas guardadas'} no telemóvel; envia-se sozinho quando houver ligação.`
        : 'Sem rede. O que fizer fica guardado no telemóvel e envia-se sozinho quando houver ligação.'
      n.hidden = false
    } else if (porEnviar) {
      $('#rede-txt').textContent = `A enviar ${porEnviar} ${porEnviar === 1 ? 'coisa' : 'coisas'}…`
      n.hidden = false
    } else {
      n.hidden = true
    }
  })
}

function aplicarTema () {
  const t = lerG(CHAVE_TEMA, 'sistema')
  if (t === 'sistema') document.documentElement.removeAttribute('data-tema')
  else document.documentElement.setAttribute('data-tema', t)
}

// ══════════════════════════ sessao ══════════════════════════

function aceitarSessao (d) {
  E.testemunho = d.testemunho
  E.conta = d.conta
  guardar(CHAVE_SESSAO, { testemunho: d.testemunho, conta: d.conta })
}

async function carregarEu () {
  const d = await pedir('GET', '/v1/eu')
  E.conta = d.conta
  E.reputacao = d.reputacao || []
  E.avisosPorLer = d.avisos_por_ler || 0
  guardar(CHAVE_SESSAO, { testemunho: E.testemunho, conta: E.conta })
  pintarContaAvisos()
  return d
}

async function sair (silencioso) {
  const t = E.testemunho
  // Apagar ANTES de esquecer quem era: a chave da cache e feita do id da
  // conta, e depois de o perder ja nao se sabe o que apagar.
  await esquecerCache().catch(() => {})
  await comLoja('fila', 'readwrite', l => l.clear()).catch(() => {})
  E.testemunho = null
  E.conta = null
  apagarG(CHAVE_SESSAO)
  if (t && !silencioso) pedir('POST', '/v1/sair').catch(() => {})
  if (!silencioso) { irPara('#/'); location.reload() }
}

// ══════════════════════════ encaminhamento ══════════════════════════

const ROTAS = [
  [/^#\/?$/, () => E.conta ? ecraInicio() : ecraBemVindo()],
  [/^#\/entrar/, () => ecraEntrar()],
  [/^#\/registar/, (m, q) => ecraRegistar(q)],
  [/^#\/verificar/, (m, q) => ecraVerificar(q)],
  [/^#\/recuperar/, () => ecraRecuperar()],
  [/^#\/senha-nova/, (m, q) => ecraSenhaNova(q)],
  [/^#\/mercado/, () => ecraMercado()],
  [/^#\/alojamentos/, () => ecraAlojamentos()],
  [/^#\/alojamento\/([^/?]+)\/editar/, (m) => ecraAlojamentoNovo(m[1])],
  [/^#\/alojamento\/([^/?]+)/, (m) => ecraAlojamento(m[1])],
  [/^#\/tarefas\/([^/?]+)/, (m) => ecraTarefasModelo(m[1])],
  [/^#\/servico\/novo/, (m, q) => ecraServicoNovo(q)],
  [/^#\/servico\/([^/?]+)/, (m) => ecraServico(m[1])],
  [/^#\/avaliar\/([^/?]+)/, (m) => ecraAvaliar(m[1])],
  [/^#\/conversa\/([^/?]+)/, (m) => ecraConversa(m[1])],
  [/^#\/equipa/, () => ecraEquipa()],
  [/^#\/convite/, () => { ecraEquipa().then(() => painelEntrarEquipa()) }],
  [/^#\/perfil\/([^/?]+)/, (m) => ecraPerfil(m[1])],
  [/^#\/eu/, () => ecraEu()],
  [/^#\/avisos/, () => ecraAvisos()],
]

const SEM_SESSAO = [/^#\/?$/, /^#\/entrar/, /^#\/registar/, /^#\/recuperar/, /^#\/senha-nova/, /^#\/verificar/]

function encaminhar () {
  const h = rotaActual()
  const caminho = h.split('?')[0]
  const q = new URLSearchParams(h.includes('?') ? h.slice(h.indexOf('?') + 1) : '')

  if (!E.conta && !SEM_SESSAO.some(r => r.test(caminho))) {
    guardar('tp.depois', h)
    return irPara('#/entrar')
  }

  for (const [padrao, mao] of ROTAS) {
    const m = caminho.match(padrao)
    if (m) {
      try {
        const r = mao(m, q)
        if (r && typeof r.catch === 'function') {
          r.catch((erro) => {
            console.error('[ecra]', erro)
            brinde(erro?.message || 'Alguma coisa correu mal neste ecrã.', 'erro')
          })
        }
      } catch (erro) {
        console.error('[ecra]', erro)
        brinde(erro?.message || 'Alguma coisa correu mal neste ecrã.', 'erro')
      }
      return
    }
  }
  const p = pintar('Não encontrado')
  p.append(vazio(I.lupa, 'Não encontrámos este ecrã', 'A ligação pode estar errada.',
    el('a', { classe: 'b b--campo', href: '#/', texto: 'Ir para o início' })))
}

// ══════════════════════════ arranque ══════════════════════════

async function arrancar () {
  aplicarTema()
  // Antes de qualquer pedido: quem abre a aplicacao sem rede tem de o saber
  // no primeiro instante, nao quando os pedidos desistirem.
  actualizarRede()

  const s = lerG(CHAVE_SESSAO)
  if (s?.testemunho) { E.testemunho = s.testemunho; E.conta = s.conta }

  $('#voltar').addEventListener('click', () => {
    if (history.length > 1) history.back()
    else irPara('#/')
  })

  window.addEventListener('hashchange', encaminhar)
  // Os eventos do navegador ainda informam quando funcionam — mas nao sao a
  // fonte da verdade, sao uma dica para tentar escoar mais cedo.
  window.addEventListener('online', () => { marcarRede(false); escoar() })
  window.addEventListener('offline', () => marcarRede(true))

  // Sem sondagem: actualiza-se ao voltar ao separador, e mais nada. Sondar de
  // 30 em 30 segundos por pessoa gastava, a 500 pessoas, mais de 120 000
  // pedidos por dia — o tecto do plano gratuito, partilhado por conta, sem
  // ninguem ter feito nada.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && E.conta) {
      escoar()
      carregarEu().catch(() => {})
    }
  })

  // Pintar JA com o que estava guardado, e ir buscar o resto depois. Quem abre
  // a aplicacao no elevador nao pode ficar a olhar para uma roda.
  encaminhar()

  const arranque = []
  arranque.push(pedir('GET', '/v1/parametros')
    .then(d => { if (d.iteracoes) ITERACOES = d.iteracoes })
    .catch(() => {}))
  arranque.push(garantirConcelhos())
  if (E.testemunho) {
    const antes = JSON.stringify(E.conta || null)
    arranque.push(carregarEu().then(() => {
      const depois = lerG('tp.depois')
      if (depois) { apagarG('tp.depois'); irPara(depois); return }
      // Repintar SO se a conta guardada estava desactualizada (papeis novos,
      // email confirmado). Encaminhar sempre punha dois ecras a pintar em
      // paralelo, e o segundo chegava depois do primeiro ter posto o botao.
      if (JSON.stringify(E.conta || null) !== antes) encaminhar()
    }).catch(() => {}))
  }
  await Promise.allSettled(arranque)

  actualizarRede()
  escoar()

  if ('serviceWorker' in navigator) {
    // `updateViaCache: 'none'` porque o GitHub Pages serve tudo com
    // `Cache-Control: max-age=600` e nao deixa mudar cabecalhos: sem isto, o
    // proprio ficheiro do service worker vem da cache e uma versao nova
    // instala-se com ficheiros velhos.
    navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' })
      .catch((erro) => console.warn('[sw]', erro.message))
  }
}

// Qualquer excepcao por apanhar deixaria um botao morto sem uma palavra.
window.addEventListener('unhandledrejection', (ev) => {
  console.error('[promessa]', ev.reason)
  if (ev.reason?.message) brinde(ev.reason.message, 'erro')
})

arrancar()
