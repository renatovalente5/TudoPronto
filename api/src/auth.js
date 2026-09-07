// Autenticacao.
//
// A decisao que molda este ficheiro: o plano gratuito do Workers da 10 ms de
// CPU por pedido, e o PBKDF2 com as 600 000 iteracoes que a OWASP pede gasta
// dez vezes isso. Logo o alongamento acontece no TELEMOVEL:
//
//   telemovel:  chave = PBKDF2-SHA256(senha, sha256("tudopronto.v1:"+email), 600k, 32B)
//   servidor:   guardado = SHA-256(sal_aleatorio || chave)
//
// Isto NAO enfraquece nada: quem roubar a base tem de encontrar a senha, e
// cada tentativa custa-lhe as mesmas 600 000 iteracoes. O sal do servidor
// impede tabelas pre-calculadas sobre chaves derivadas. O sal do cliente sai
// do email para o telemovel poder derivar sem primeiro perguntar ao servidor
// (senao o registo precisava de duas viagens e vazava quem tem conta).
//
// O que se envia pela rede e equivalente a uma senha, e por isso so viaja em
// TLS — como uma senha em claro viajaria. A diferenca esta em repouso.

import { AGORA, Erro, erro, iguais, json, novoId, paraHex, sha256, testemunho, texto } from './util.js'

const DIAS_SESSAO = 60
export const ITERACOES_CLIENTE = 600000   // o cliente le isto de /v1/parametros

/** A chave derivada tem de ter a forma certa antes de tocar na base. */
export function chaveDerivada (v) {
  const s = texto(v, { campo: 'senha', min: 43, max: 64 })
  if (!/^[A-Za-z0-9_-]{43}$/.test(s)) {
    erro(400, 'Nao foi possivel processar a senha. Actualize a pagina e tente outra vez.', 'senha')
  }
  return s
}

export async function guardarSenha (chave) {
  const sal = paraHex(crypto.getRandomValues(new Uint8Array(16)))
  return { senha_sal: sal, senha_hash: await sha256(sal + '|' + chave) }
}

export async function senhaCerta (conta, chave) {
  const h = await sha256(conta.senha_sal + '|' + chave)
  return iguais(h, conta.senha_hash)
}

// ─────────────────────────────── sessoes ──────────────────────────────

export async function abrirSessao (env, contaId) {
  const t = testemunho()
  const agora = new Date()
  const expira = new Date(agora.getTime() + DIAS_SESSAO * 86400000)
  await env.BD.prepare(
    'INSERT INTO sessoes (token_hash, conta_id, criada_em, expira_em) VALUES (?1, ?2, ?3, ?4)'
  ).bind(await sha256(t), contaId, agora.toISOString(), expira.toISOString()).run()
  return { testemunho: t, expira_em: expira.toISOString() }
}

export async function fecharSessao (env, t) {
  if (!t) return
  await env.BD.prepare('DELETE FROM sessoes WHERE token_hash = ?1').bind(await sha256(t)).run()
}

function testemunhoDoPedido (pedido) {
  const a = pedido.headers.get('Authorization') || ''
  if (a.startsWith('Bearer ')) return a.slice(7).trim()
  return null
}

/** Devolve a conta ou null. Uma consulta so, com JOIN: duas consultas custavam
 *  duas viagens ao D1 em cada pedido autenticado da aplicacao inteira. */
export async function quemE (env, pedido) {
  const t = testemunhoDoPedido(pedido)
  if (!t || !/^[0-9a-f]{64}$/.test(t)) return null
  const l = await env.BD.prepare(`
    SELECT c.*, s.token_hash
      FROM sessoes s JOIN contas c ON c.id = s.conta_id
     WHERE s.token_hash = ?1 AND s.expira_em > ?2 AND c.estado = 'activa'`
  ).bind(await sha256(t), AGORA()).first()
  return l || null
}

/** Igual a quemE mas recusa em vez de devolver null. */
export async function exigirConta (env, pedido) {
  const c = await quemE(env, pedido)
  if (!c) erro(401, 'Tem de entrar na sua conta para continuar.')
  return c
}

export async function exigirDono (env, pedido) {
  const c = await exigirConta(env, pedido)
  if (!c.e_dono) erro(403, 'Esta parte e para quem tem alojamentos.')
  return c
}

export async function exigirProfissional (env, pedido) {
  const c = await exigirConta(env, pedido)
  if (!c.e_profissional) erro(403, 'Esta parte e para quem faz limpezas.')
  return c
}

// ──────────────────────── codigos de 6 algarismos ─────────────────────
// Um link de email nao entra numa aplicacao instalada no iOS: o Safari e a
// aplicacao do ecra principal tem armazenamentos separados, e quem carrega no
// link fica com sessao iniciada no Safari e continua de fora da aplicacao.
// Por isso e um codigo para escrever.

const VALIDADE_CODIGO_MIN = 20
const MAX_TENTATIVAS = 5

export async function criarCodigo (env, endereco, fim) {
  const c = (await import('./util.js')).codigo6()
  const agora = new Date()
  // Invalidar os anteriores do mesmo fim: dois codigos validos ao mesmo tempo
  // duplicam as hipoteses de quem adivinha, e confundem quem recebeu dois emails.
  await env.BD.prepare(
    'UPDATE codigos SET usado_em = ?3 WHERE email = ?1 AND fim = ?2 AND usado_em IS NULL'
  ).bind(endereco, fim, agora.toISOString()).run()
  await env.BD.prepare(`
    INSERT INTO codigos (id, email, codigo_hash, fim, expira_em, criado_em)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  ).bind(
    novoId(), endereco, await sha256(`${endereco}|${fim}|${c}`), fim,
    new Date(agora.getTime() + VALIDADE_CODIGO_MIN * 60000).toISOString(),
    agora.toISOString(),
  ).run()
  return c
}

/** Um milhao de hipoteses nao chega sozinho: sem contador de tentativas, quem
 *  quiser experimenta as um milhao. Cinco e morre. */
export async function validarCodigo (env, endereco, fim, codigo) {
  const l = await env.BD.prepare(`
    SELECT * FROM codigos
     WHERE email = ?1 AND fim = ?2 AND usado_em IS NULL
     ORDER BY criado_em DESC LIMIT 1`
  ).bind(endereco, fim).first()

  if (!l) erro(400, 'Esse codigo ja nao serve. Peca um novo.')
  if (l.expira_em < AGORA()) erro(400, `O codigo expirou (vale ${VALIDADE_CODIGO_MIN} minutos). Peca um novo.`)
  if (l.tentativas >= MAX_TENTATIVAS) erro(429, 'Errou o codigo demasiadas vezes. Peca um novo.')

  const certo = iguais(await sha256(`${endereco}|${fim}|${String(codigo).trim()}`), l.codigo_hash)
  if (!certo) {
    await env.BD.prepare('UPDATE codigos SET tentativas = tentativas + 1 WHERE id = ?1').bind(l.id).run()
    const restam = MAX_TENTATIVAS - l.tentativas - 1
    erro(400, restam > 0
      ? `Codigo errado. ${restam === 1 ? 'Resta 1 tentativa' : `Restam ${restam} tentativas`}.`
      : 'Codigo errado. Peca um novo codigo.')
  }
  await env.BD.prepare('UPDATE codigos SET usado_em = ?2 WHERE id = ?1').bind(l.id, AGORA()).run()
  return true
}
