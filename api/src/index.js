// Tudo Pronto — API. Cloudflare Worker + D1.
//
// Regras que atravessam o ficheiro:
//  · Toda a rota que toca num recurso confirma que a conta tem direito a ELE,
//    e nao apenas que ha sessao. A pergunta "estas autenticado?" nao responde
//    a "esta casa e tua?".
//  · A morada, o codigo da caixa de chaves e o telefone NAO saem daqui para
//    quem nao esteja atribuido ao servico. E minimizacao de dados e e
//    seguranca: um anuncio publico com morada e codigo de acesso e um convite.
//  · Falhar fechado. Sem segredo configurado, a rota recusa em vez de deixar
//    passar.

import {
  AGORA, Erro, booleano, cabecalhosCORS, daLista, data, distanciaKm, email as validarEmail,
  erro, factorTecto, hora, inteiro, json, novoId, sha256, telefone as validarTelefone, texto, travar,
} from './util.js'
import {
  ITERACOES_CLIENTE, abrirSessao, chaveDerivada, criarCodigo, exigirConta, exigirDono,
  exigirProfissional, fecharSessao, guardarSenha, quemE, senhaCerta, validarCodigo,
} from './auth.js'
import { enviar, modelos } from './correio.js'
import { avisar } from './push.js'
import { rotasAlojamentos } from './rotas-alojamentos.js'
import { rotasServicos } from './rotas-servicos.js'
import { rotasSocial } from './rotas-social.js'

// ───────────────────────────── roteador ──────────────────────────────

/** Casa '/v1/servicos/:id/candidatar' com o caminho pedido e devolve {id}. */
function casa (padrao, caminho) {
  const p = padrao.split('/')
  const c = caminho.split('/')
  if (p.length !== c.length) return null
  const params = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) {
      if (!c[i]) return null
      params[p[i].slice(1)] = decodeURIComponent(c[i])
    } else if (p[i] !== c[i]) return null
  }
  return params
}

export function construirRotas () {
  const rotas = []
  const reg = (metodo, padrao, mao) => rotas.push({ metodo, padrao, mao })
  const api = {
    get: (p, m) => reg('GET', p, m),
    post: (p, m) => reg('POST', p, m),
    patch: (p, m) => reg('PATCH', p, m),
    put: (p, m) => reg('PUT', p, m),
    del: (p, m) => reg('DELETE', p, m),
  }
  rotasConta(api)
  rotasAlojamentos(api)
  rotasServicos(api)
  rotasSocial(api)
  rotasFotos(api)
  return rotas
}

// ────────────────────────────── conta ────────────────────────────────

function contaPublica (c) {
  return {
    id: c.id,
    nome: c.nome,
    e_dono: !!c.e_dono,
    e_profissional: !!c.e_profissional,
    concelho: c.concelho,
    bio: c.bio,
    foto_id: c.foto_id,
    criada_em: c.criada_em,
  }
}

function contaPropria (c) {
  return {
    ...contaPublica(c),
    email: c.email,
    telefone: c.telefone,
    raio_km: c.raio_km,
    email_verificado: !!c.email_verificado,
  }
}

function rotasConta (api) {
  // Parametros que o cliente precisa antes de derivar a senha. Sem isto o
  // numero de iteracoes ficava escrito em dois sitios e um dia divergiam.
  api.get('/v1/parametros', async ({ env }) => json({
    iteracoes: ITERACOES_CLIENTE,
    versao: 1,
    // Dito em voz alta para a bateria poder ajustar-se: com tectos 50x mais
    // altos, um teste que faz 60 tentativas nao trava e passaria a verde sem
    // ter provado nada. Nao e segredo — quem corre em localhost ja sabe.
    factor_travao: factorTecto(env),
  }))

  api.post('/v1/registar', async ({ env, pedido, corpo }) => {
    await travar(env, pedido, 'registar', 8, 60)
    const endereco = validarEmail(corpo.email)
    const chave = chaveDerivada(corpo.senha)
    const nome = texto(corpo.nome, { campo: 'nome', min: 2, max: 60 })
    const eDono = booleano(corpo.e_dono)
    const eProf = booleano(corpo.e_profissional)
    if (!eDono && !eProf) erro(400, 'Escolha se vem por ter alojamentos, por fazer limpezas, ou os dois.')
    const concelho = texto(corpo.concelho, { campo: 'concelho', max: 60, obrigatorio: eProf })

    const jaExiste = await env.BD.prepare('SELECT id FROM contas WHERE email = ?1').bind(endereco).first()
    if (jaExiste) erro(409, 'Ja existe uma conta com esse email. Experimente entrar.', 'email')

    const { senha_sal, senha_hash } = await guardarSenha(chave)
    const id = novoId()
    const agora = AGORA()
    await env.BD.prepare(`
      INSERT INTO contas (id, email, senha_hash, senha_sal, nome, e_dono, e_profissional, concelho, criada_em, visto_em)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?9)`
    ).bind(id, endereco, senha_hash, senha_sal, nome, eDono ? 1 : 0, eProf ? 1 : 0, concelho, agora).run()

    if (eProf) await criarReputacao(env, id, 'profissional')
    if (eDono) await criarReputacao(env, id, 'dono')

    const c = await criarCodigo(env, endereco, 'verificar')
    const m = modelos.codigo(c, 'verificar')
    await enviar(env, { para: endereco, nome, ...m })

    const sessao = await abrirSessao(env, id)
    const conta = await env.BD.prepare('SELECT * FROM contas WHERE id = ?1').bind(id).first()
    return json({ ...sessao, conta: contaPropria(conta) }, 201)
  })

  api.post('/v1/entrar', async ({ env, pedido, corpo }) => {
    await travar(env, pedido, 'entrar', 20, 60)
    const endereco = validarEmail(corpo.email)
    const chave = chaveDerivada(corpo.senha)
    const c = await env.BD.prepare('SELECT * FROM contas WHERE email = ?1').bind(endereco).first()
    // A mesma mensagem para email desconhecido e senha errada: mensagens
    // diferentes deixam descobrir quem tem conta aqui.
    const mau = () => erro(401, 'Email ou senha errados.')
    if (!c || c.estado !== 'activa') mau()
    if (!await senhaCerta(c, chave)) mau()
    await env.BD.prepare('UPDATE contas SET visto_em = ?2 WHERE id = ?1').bind(c.id, AGORA()).run()
    const sessao = await abrirSessao(env, c.id)
    return json({ ...sessao, conta: contaPropria(c) })
  })

  api.post('/v1/sair', async ({ env, pedido }) => {
    const a = pedido.headers.get('Authorization') || ''
    await fecharSessao(env, a.startsWith('Bearer ') ? a.slice(7).trim() : null)
    return json({ ok: true })
  })

  api.get('/v1/eu', async ({ env, pedido }) => {
    const c = await exigirConta(env, pedido)
    const rep = await env.BD.prepare('SELECT * FROM reputacao WHERE conta_id = ?1').bind(c.id).all()
    const porFazer = await env.BD.prepare(
      'SELECT COUNT(*) n FROM avisos WHERE conta_id = ?1 AND lido_em IS NULL'
    ).bind(c.id).first()
    return json({ conta: contaPropria(c), reputacao: rep.results || [], avisos_por_ler: porFazer?.n || 0 })
  })

  api.patch('/v1/eu', async ({ env, pedido, corpo }) => {
    const c = await exigirConta(env, pedido)
    const campos = []
    const vals = []
    const por = (sql, v) => { campos.push(`${sql} = ?${campos.length + 1}`); vals.push(v) }
    if (corpo.nome !== undefined) por('nome', texto(corpo.nome, { campo: 'nome', min: 2, max: 60 }))
    if (corpo.telefone !== undefined) por('telefone', validarTelefone(corpo.telefone))
    if (corpo.bio !== undefined) por('bio', texto(corpo.bio, { campo: 'bio', max: 600, obrigatorio: false }))
    if (corpo.concelho !== undefined) por('concelho', texto(corpo.concelho, { campo: 'concelho', max: 60, obrigatorio: false }))
    if (corpo.raio_km !== undefined) por('raio_km', inteiro(corpo.raio_km, { campo: 'raio_km', min: 1, max: 100 }))
    if (corpo.foto_id !== undefined) por('foto_id', texto(corpo.foto_id, { campo: 'foto_id', max: 40, obrigatorio: false }))
    // Ganhar um papel e permitido; perder o ultimo nao.
    if (corpo.e_dono !== undefined || corpo.e_profissional !== undefined) {
      const d = corpo.e_dono !== undefined ? booleano(corpo.e_dono) : !!c.e_dono
      const p = corpo.e_profissional !== undefined ? booleano(corpo.e_profissional) : !!c.e_profissional
      if (!d && !p) erro(400, 'A conta tem de servir para alguma coisa: alojamentos, limpezas, ou as duas.')
      if (d && !c.e_dono) await criarReputacao(env, c.id, 'dono')
      if (p && !c.e_profissional) await criarReputacao(env, c.id, 'profissional')
      por('e_dono', d ? 1 : 0)
      por('e_profissional', p ? 1 : 0)
    }
    if (!campos.length) return json({ conta: contaPropria(c) })
    vals.push(c.id)
    await env.BD.prepare(`UPDATE contas SET ${campos.join(', ')} WHERE id = ?${vals.length}`).bind(...vals).run()
    const nova = await env.BD.prepare('SELECT * FROM contas WHERE id = ?1').bind(c.id).first()
    return json({ conta: contaPropria(nova) })
  })

  api.post('/v1/codigo', async ({ env, pedido, corpo }) => {
    await travar(env, pedido, 'codigo', 10, 60)
    const endereco = validarEmail(corpo.email)
    const fim = daLista(corpo.fim, ['verificar', 'recuperar'], { campo: 'fim' })
    const c = await env.BD.prepare('SELECT id, nome FROM contas WHERE email = ?1').bind(endereco).first()
    // Responder sempre o mesmo. Dizer "essa conta nao existe" transforma esta
    // rota numa lista de quem tem conta.
    if (c) {
      const cod = await criarCodigo(env, endereco, fim)
      await enviar(env, { para: endereco, nome: c.nome, ...modelos.codigo(cod, fim) })
    }
    return json({ ok: true, mensagem: 'Se essa conta existir, o codigo ja vai a caminho.' })
  })

  api.post('/v1/codigo/validar', async ({ env, pedido, corpo }) => {
    await travar(env, pedido, 'validar', 20, 60)
    const endereco = validarEmail(corpo.email)
    await validarCodigo(env, endereco, 'verificar', corpo.codigo)
    await env.BD.prepare('UPDATE contas SET email_verificado = 1 WHERE email = ?1').bind(endereco).run()
    return json({ ok: true })
  })

  api.post('/v1/senha/nova', async ({ env, pedido, corpo }) => {
    await travar(env, pedido, 'senha-nova', 10, 60)
    const endereco = validarEmail(corpo.email)
    const chave = chaveDerivada(corpo.senha)
    await validarCodigo(env, endereco, 'recuperar', corpo.codigo)
    const c = await env.BD.prepare('SELECT id FROM contas WHERE email = ?1').bind(endereco).first()
    if (!c) erro(400, 'Nao foi possivel concluir. Peca um novo codigo.')
    const { senha_sal, senha_hash } = await guardarSenha(chave)
    await env.BD.prepare(
      'UPDATE contas SET senha_hash = ?2, senha_sal = ?3, email_verificado = 1 WHERE id = ?1'
    ).bind(c.id, senha_hash, senha_sal).run()
    // Trocar a senha fecha as outras sessoes: e o unico gesto que uma pessoa
    // tem para expulsar quem lhe entrou na conta.
    await env.BD.prepare('DELETE FROM sessoes WHERE conta_id = ?1').bind(c.id).run()
    const sessao = await abrirSessao(env, c.id)
    const conta = await env.BD.prepare('SELECT * FROM contas WHERE id = ?1').bind(c.id).first()
    return json({ ...sessao, conta: contaPropria(conta) })
  })

  // ── avisos ──
  api.get('/v1/avisos', async ({ env, pedido }) => {
    const c = await exigirConta(env, pedido)
    const r = await env.BD.prepare(
      'SELECT * FROM avisos WHERE conta_id = ?1 ORDER BY criado_em DESC LIMIT 40'
    ).bind(c.id).all()
    return json({ avisos: r.results || [] })
  })

  api.post('/v1/avisos/lidos', async ({ env, pedido }) => {
    const c = await exigirConta(env, pedido)
    await env.BD.prepare(
      'UPDATE avisos SET lido_em = ?2 WHERE conta_id = ?1 AND lido_em IS NULL'
    ).bind(c.id, AGORA()).run()
    return json({ ok: true })
  })

  api.post('/v1/push', async ({ env, pedido, corpo }) => {
    const c = await exigirConta(env, pedido)
    const endpoint = texto(corpo.endpoint, { campo: 'endpoint', max: 800 })
    const p256dh = texto(corpo.p256dh, { campo: 'p256dh', max: 200 })
    const auth = texto(corpo.auth, { campo: 'auth', max: 100 })
    await env.BD.prepare(`
      INSERT INTO push (id, conta_id, endpoint, p256dh, auth, criada_em) VALUES (?1,?2,?3,?4,?5,?6)
      ON CONFLICT(endpoint) DO UPDATE SET conta_id = ?2, p256dh = ?4, auth = ?5, falhas = 0`
    ).bind(novoId(), c.id, endpoint, p256dh, auth, AGORA()).run()
    return json({ ok: true })
  })

  api.del('/v1/push', async ({ env, pedido, corpo }) => {
    const c = await exigirConta(env, pedido)
    if (corpo?.endpoint) {
      await env.BD.prepare('DELETE FROM push WHERE conta_id = ?1 AND endpoint = ?2').bind(c.id, corpo.endpoint).run()
    } else {
      await env.BD.prepare('DELETE FROM push WHERE conta_id = ?1').bind(c.id).run()
    }
    return json({ ok: true })
  })

  api.get('/v1/vapid', async ({ env }) => json({ chave: env.VAPID_PUBLICA || null }))
}

export async function criarReputacao (env, contaId, papel) {
  await env.BD.prepare(`
    INSERT INTO reputacao (conta_id, papel, actualizada_em) VALUES (?1, ?2, ?3)
    ON CONFLICT(conta_id) DO NOTHING`
  ).bind(contaId, papel, AGORA()).run()
}

// ────────────────────────────── fotos ────────────────────────────────
// O binario vive no KV; so os metadados vao para o D1. Uma fotografia numa
// base relacional gasta escritas (100k/dia) e leituras de linhas que nao se
// usam para procurar nada.

const MAX_FOTO = 400 * 1024   // o cliente ja comprime; isto e o tecto de seguranca

function rotasFotos (api) {
  api.post('/v1/fotos', async ({ env, pedido }) => {
    const c = await exigirConta(env, pedido)
    await travar(env, pedido, 'foto', 200, 60)
    const tipo = pedido.headers.get('Content-Type') || ''
    if (!/^image\/(jpeg|png|webp)$/.test(tipo)) {
      erro(400, 'So aceitamos fotografias JPEG, PNG ou WebP.')
    }
    const bytes = await pedido.arrayBuffer()
    if (!bytes.byteLength) erro(400, 'A fotografia chegou vazia. Tente outra vez.')
    if (bytes.byteLength > MAX_FOTO) {
      erro(413, 'Essa fotografia e demasiado grande. A aplicacao reduz as fotografias antes de enviar — actualize a pagina e tente outra vez.')
    }
    const url = new URL(pedido.url)
    const fim = daLista(url.searchParams.get('fim'),
      ['tarefa', 'dano', 'perdido', 'perfil', 'alojamento'], { campo: 'fim' })
    const servicoId = url.searchParams.get('servico') || null

    if (servicoId) {
      const s = await env.BD.prepare(
        'SELECT dono_id, profissional_id FROM servicos WHERE id = ?1'
      ).bind(servicoId).first()
      if (!s) erro(404, 'Esse servico ja nao existe.')
      if (s.dono_id !== c.id && s.profissional_id !== c.id) erro(403, 'Esse servico nao e seu.')
    }

    const id = novoId()
    await env.FOTOS.put(id, bytes, {
      httpMetadata: { contentType: tipo },
      metadata: { tipo, conta: c.id, criada: AGORA() },
    })
    await env.BD.prepare(`
      INSERT INTO fotos (id, servico_id, autor_id, fim, bytes, criada_em) VALUES (?1,?2,?3,?4,?5,?6)`
    ).bind(id, servicoId, c.id, fim, bytes.byteLength, AGORA()).run()
    return json({ id }, 201)
  })

  // Servida sem sessao: o id e opaco (128 bits) e a alternativa — passar o
  // testemunho em cada <img> — poe a sessao no historico e nos registos.
  // Cache longa: o id nunca aponta para outra imagem.
  api.get('/f/:id', async ({ env, params }) => {
    if (!/^[0-9a-f]{32}$/.test(params.id)) erro(404, 'Nao encontrado.')
    const o = await env.FOTOS.getWithMetadata(params.id, { type: 'arrayBuffer' })
    if (!o || !o.value) erro(404, 'Essa fotografia ja nao existe.')
    return new Response(o.value, {
      headers: {
        'Content-Type': o.metadata?.tipo || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    })
  })
}

// ────────────────────────── ponto de entrada ─────────────────────────

const ROTAS = construirRotas()

export default {
  async fetch (pedido, env, ctx) {
    const cors = cabecalhosCORS(pedido, env)
    if (pedido.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    const url = new URL(pedido.url)
    const caminho = url.pathname.replace(/\/+$/, '') || '/'

    if (caminho === '/') {
      return json({ nome: 'Tudo Pronto', api: 'v1', estado: 'no ar' }, 200, cors)
    }

    try {
      if (!env.BD) erro(503, 'Servico indisponivel de momento.')
      for (const r of ROTAS) {
        if (r.metodo !== pedido.method) continue
        const params = casa(r.padrao, caminho)
        if (!params) continue
        let corpo = {}
        if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(pedido.method) &&
            (pedido.headers.get('Content-Type') || '').includes('application/json')) {
          try { corpo = await pedido.json() } catch { erro(400, 'Pedido mal formado.') }
        }
        const resposta = await r.mao({ env, pedido, ctx, params, corpo, url })
        for (const [k, v] of Object.entries(cors)) resposta.headers.set(k, v)
        return resposta
      }
      erro(404, 'Nao encontrado.')
    } catch (e) {
      if (e instanceof Erro) {
        return json({ erro: e.message, campo: e.campo }, e.estado, cors)
      }
      console.log('[erro]', e?.stack || e?.message || String(e))
      return json({ erro: 'Alguma coisa correu mal do nosso lado. Tente outra vez daqui a pouco.' }, 500, cors)
    }
  },

  // Limpeza diaria. Sem isto as tabelas de sessoes, codigos e travao crescem
  // para sempre e cada consulta fica mais cara.
  async scheduled (evento, env, ctx) {
    const agora = AGORA()
    const ontem = new Date(Date.now() - 86400000).toISOString()
    await env.BD.prepare('DELETE FROM sessoes WHERE expira_em < ?1').bind(agora).run()
    await env.BD.prepare('DELETE FROM codigos WHERE expira_em < ?1').bind(ontem).run()
    await env.BD.prepare('DELETE FROM travao WHERE ultimo < ?1').bind(ontem).run()

    // Revelar avaliacoes cujo prazo passou: quem nao avaliou perdeu a vez, e a
    // avaliacao de quem avaliou deixa de ficar refem disso.
    //
    // Reveladas UMA A UMA e somadas a reputacao no mesmo passo. Revelar em
    // massa com um UPDATE deixava estas avaliacoes fora da media para sempre:
    // a soma so acontece no instante da revelacao, e quem revelasse por prazo
    // nunca la chegava. Foi assim que uma em cada duas avaliacoes deixava de
    // contar — a das pessoas cuja contraparte simplesmente nao avaliou.
    const porRevelar = await env.BD.prepare(
      'SELECT id, avaliado_id, estrelas FROM avaliacoes WHERE revelada_em IS NULL AND revelar_em <= ?1 LIMIT 500'
    ).bind(agora).all()
    for (const a of porRevelar.results || []) {
      await env.BD.batch([
        env.BD.prepare('UPDATE avaliacoes SET revelada_em = ?2 WHERE id = ?1 AND revelada_em IS NULL')
          .bind(a.id, agora),
        env.BD.prepare(`UPDATE reputacao SET soma_estrelas = soma_estrelas + ?2,
               n_avaliacoes = n_avaliacoes + 1, actualizada_em = ?3 WHERE conta_id = ?1`)
          .bind(a.avaliado_id, a.estrelas, agora),
      ])
    }

    // Servicos que passaram da hora sem ninguem: deixam de encher o mercado.
    const hoje = agora.slice(0, 10)
    await env.BD.prepare(
      "UPDATE servicos SET estado = 'expirado' WHERE estado = 'aberto' AND data < ?1"
    ).bind(hoje).run()
  },
}
