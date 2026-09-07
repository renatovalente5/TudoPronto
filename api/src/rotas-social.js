// Avaliacoes, equipa de confianca, mensagens e perfis publicos.
//
// A peca central: REVELACAO SIMULTANEA. Uma avaliacao fica escondida das duas
// partes ate a outra tambem avaliar, ou ate passarem 14 dias. Sem isto, quem
// avalia primeiro fica exposto a retaliacao — e o resultado conhecido e toda a
// gente dar cinco estrelas por prudencia, o que torna a reputacao inutil. Foi
// o que o Airbnb resolveu em 2014 ao passar a revelacao a duplo-cego.
//
// E as ETIQUETAS sao uma lista fechada. Uma avaliacao feita so de caixas de
// marcacao nao pode ser insulto nem spam: publica-se na hora. So quem escreve
// texto a mao espera pela revelacao. Moderar tudo e lento, e a promessa
// quebra-se na primeira semana atarefada.

import { AGORA, booleano, daLista, erro, inteiro, json, novoId, texto } from './util.js'
import { exigirConta, exigirDono, exigirProfissional } from './auth.js'
import { avisar } from './push.js'
import { enviar, modelos } from './correio.js'
import { codigo6 } from './util.js'

const DIAS_ATE_REVELAR = 14

// Listas fechadas, uma por lado. Sao os elogios que as pessoas de facto
// querem dar — nao categorias abstractas de inquerito.
export const ETIQUETAS_PROFISSIONAL = [
  'Pontual', 'Muito cuidadosa', 'Casa impecavel', 'Boa comunicacao',
  'Resolveu imprevistos', 'Deixou tudo no sitio', 'Avisou de um problema', 'Voltaria a chamar',
]
export const ETIQUETAS_DONO = [
  'Instrucoes claras', 'Pagou a horas', 'Casa em bom estado', 'Boa comunicacao',
  'Material completo', 'Horario realista', 'Respeitador', 'Voltaria a trabalhar',
]

export function rotasSocial (api) {
  // ─────────────────────────── avaliacoes ──────────────────────────

  api.post('/v1/servicos/:id/avaliar', async ({ env, pedido, params, corpo }) => {
    const c = await exigirConta(env, pedido)
    const s = await env.BD.prepare(
      'SELECT * FROM servicos WHERE id = ?1'
    ).bind(params.id).first()
    if (!s) erro(404, 'Essa limpeza ja nao existe.')
    const papel = s.dono_id === c.id ? 'dono' : s.profissional_id === c.id ? 'profissional' : null
    if (!papel) erro(403, 'Essa limpeza nao e sua.')
    if (s.estado !== 'concluido') erro(400, 'So se avalia depois de a limpeza estar concluida.')

    const avaliadoId = papel === 'dono' ? s.profissional_id : s.dono_id
    if (!avaliadoId) erro(400, 'Nao ha ninguem para avaliar nesta limpeza.')

    const ja = await env.BD.prepare(
      'SELECT id FROM avaliacoes WHERE servico_id = ?1 AND autor_id = ?2'
    ).bind(s.id, c.id).first()
    if (ja) erro(409, 'Ja avaliou esta limpeza.')

    const estrelas = inteiro(corpo.estrelas, { campo: 'estrelas', min: 1, max: 5 })
    const permitidas = papel === 'dono' ? ETIQUETAS_PROFISSIONAL : ETIQUETAS_DONO
    const etiquetas = Array.isArray(corpo.etiquetas)
      ? corpo.etiquetas.filter(e => permitidas.includes(e)).slice(0, 4)
      : []
    const comentario = texto(corpo.comentario, { campo: 'comentario', max: 700, obrigatorio: false })

    const agora = AGORA()
    const revelarEm = new Date(Date.now() + DIAS_ATE_REVELAR * 86400000).toISOString()
    const id = novoId()
    await env.BD.prepare(`
      INSERT INTO avaliacoes (id, servico_id, autor_id, avaliado_id, estrelas, etiquetas, comentario, criada_em, revelar_em)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`
    ).bind(id, s.id, c.id, avaliadoId, estrelas, JSON.stringify(etiquetas), comentario, agora, revelarEm).run()

    // Se a outra parte ja avaliou, caiu a razao para esconder: revelam-se as
    // duas ao mesmo tempo, e nenhuma delas pode ter influenciado a outra.
    const outra = await env.BD.prepare(
      'SELECT id FROM avaliacoes WHERE servico_id = ?1 AND autor_id = ?2 AND revelada_em IS NULL'
    ).bind(s.id, avaliadoId).first()

    if (outra) {
      await env.BD.prepare(
        'UPDATE avaliacoes SET revelada_em = ?2 WHERE servico_id = ?1 AND revelada_em IS NULL'
      ).bind(s.id, agora).run()
      await contarNaReputacao(env, s.id)
      await avisar(env, avaliadoId, {
        tipo: 'avaliacao_revelada',
        titulo: 'As avaliacoes ja estao visiveis',
        corpo: 'Voces os dois avaliaram — veja o que escreveram.',
        ligacao: `/app/#/servico/${s.id}`,
      })
    } else {
      await avisar(env, avaliadoId, {
        tipo: 'avaliacao_pendente',
        titulo: 'Avaliaram-no. Falta a sua.',
        corpo: 'A avaliacao aparece assim que avaliar tambem — ou daqui a 14 dias.',
        ligacao: `/app/#/servico/${s.id}`,
      })
    }
    return json({ id, revelada: !!outra }, 201)
  })

  /** As avaliacoes de um servico, se ja forem visiveis. */
  api.get('/v1/servicos/:id/avaliacoes', async ({ env, pedido, params }) => {
    const c = await exigirConta(env, pedido)
    const s = await env.BD.prepare('SELECT dono_id, profissional_id FROM servicos WHERE id = ?1')
      .bind(params.id).first()
    if (!s) erro(404, 'Essa limpeza ja nao existe.')
    if (s.dono_id !== c.id && s.profissional_id !== c.id) erro(403, 'Essa limpeza nao e sua.')
    const r = await env.BD.prepare(`
      SELECT a.*, c.nome AS autor_nome, c.foto_id AS autor_foto
        FROM avaliacoes a JOIN contas c ON c.id = a.autor_id
       WHERE a.servico_id = ?1`
    ).bind(params.id).all()
    return json({
      avaliacoes: (r.results || []).map(a => a.revelada_em
        ? { ...a, etiquetas: seguro(a.etiquetas) }
        // A propria pessoa ve sempre o que escreveu; da outra so sabe que existe.
        : a.autor_id === c.id
          ? { ...a, etiquetas: seguro(a.etiquetas), por_revelar: true }
          : { id: a.id, autor_id: a.autor_id, escondida: true }),
    })
  })

  api.get('/v1/etiquetas', async () => json(
    { profissional: ETIQUETAS_PROFISSIONAL, dono: ETIQUETAS_DONO },
    200, { 'Cache-Control': 'public, max-age=86400' },
  ))

  // ──────────────────────── perfil publico ─────────────────────────

  api.get('/v1/perfil/:id', async ({ env, pedido, params }) => {
    await exigirConta(env, pedido)   // perfis nao sao publicos na Internet aberta
    const p = await env.BD.prepare(`
      SELECT c.id, c.nome, c.foto_id, c.bio, c.concelho, c.e_dono, c.e_profissional, c.criada_em,
             r.soma_estrelas, r.n_avaliacoes, r.n_concluidos, r.n_cancelados, r.n_faltas
        FROM contas c LEFT JOIN reputacao r ON r.conta_id = c.id
       WHERE c.id = ?1 AND c.estado = 'activa'`
    ).bind(params.id).first()
    if (!p) erro(404, 'Essa pessoa ja nao esta no Tudo Pronto.')

    const av = await env.BD.prepare(`
      SELECT a.estrelas, a.etiquetas, a.comentario, a.criada_em, c.nome AS autor_nome, c.foto_id AS autor_foto
        FROM avaliacoes a JOIN contas c ON c.id = a.autor_id
       WHERE a.avaliado_id = ?1 AND a.revelada_em IS NOT NULL
    ORDER BY a.criada_em DESC LIMIT 20`
    ).bind(params.id).all()

    return json({
      perfil: {
        id: p.id, nome: p.nome, foto_id: p.foto_id, bio: p.bio, concelho: p.concelho,
        e_dono: !!p.e_dono, e_profissional: !!p.e_profissional, desde: p.criada_em,
        estrelas: p.n_avaliacoes ? Math.round((p.soma_estrelas / p.n_avaliacoes) * 10) / 10 : null,
        n_avaliacoes: p.n_avaliacoes || 0,
        n_concluidos: p.n_concluidos || 0,
        n_cancelados: p.n_cancelados || 0,
        n_faltas: p.n_faltas || 0,
      },
      avaliacoes: (av.results || []).map(a => ({ ...a, etiquetas: seguro(a.etiquetas) })),
    })
  })

  // ──────────────────────── equipa de confianca ────────────────────
  // O que faz a aplicacao valer alguma coisa no primeiro dia, com o mercado
  // ainda vazio: o dono traz a pessoa que JA limpa a casa dele.

  api.get('/v1/equipa', async ({ env, pedido }) => {
    const c = await exigirConta(env, pedido)
    const minha = await env.BD.prepare(`
      SELECT e.*, p.nome, p.foto_id, p.concelho, p.telefone,
             r.soma_estrelas, r.n_avaliacoes, r.n_concluidos
        FROM equipa e
   LEFT JOIN contas p ON p.id = e.profissional_id
   LEFT JOIN reputacao r ON r.conta_id = e.profissional_id
       WHERE e.dono_id = ?1 AND e.estado != 'removida' ORDER BY e.criada_em`
    ).bind(c.id).all()

    const onde = await env.BD.prepare(`
      SELECT e.id, e.alcunha, e.criada_em, d.id AS dono_id, d.nome AS dono_nome, d.foto_id AS dono_foto
        FROM equipa e JOIN contas d ON d.id = e.dono_id
       WHERE e.profissional_id = ?1 AND e.estado = 'activa' ORDER BY e.criada_em`
    ).bind(c.id).all()

    return json({
      minha_equipa: (minha.results || []).map(e => ({
        id: e.id, estado: e.estado, alcunha: e.alcunha, convite_email: e.convite_email,
        convite_codigo: e.estado === 'convidada' ? e.convite_codigo : null,
        criada_em: e.criada_em,
        profissional: e.profissional_id ? {
          id: e.profissional_id, nome: e.nome, foto_id: e.foto_id, concelho: e.concelho,
          telefone: e.telefone,
          estrelas: e.n_avaliacoes ? Math.round((e.soma_estrelas / e.n_avaliacoes) * 10) / 10 : null,
          n_avaliacoes: e.n_avaliacoes || 0, n_concluidos: e.n_concluidos || 0,
        } : null,
      })),
      trabalho_para: onde.results || [],
    })
  })

  api.post('/v1/equipa/convidar', async ({ env, pedido, corpo }) => {
    const c = await exigirDono(env, pedido)
    const n = await env.BD.prepare(
      "SELECT COUNT(*) n FROM equipa WHERE dono_id = ?1 AND estado != 'removida'"
    ).bind(c.id).first()
    if ((n?.n || 0) >= 30) erro(400, 'Chegou ao limite de 30 pessoas na equipa.')

    const alcunha = texto(corpo.alcunha, { campo: 'nome', min: 2, max: 60 })
    const endereco = corpo.email ? (await import('./util.js')).email(corpo.email) : null

    // Se ja tem conta, liga-se directamente e recebe aviso na aplicacao.
    let profissionalId = null
    if (endereco) {
      const p = await env.BD.prepare(
        "SELECT id, nome FROM contas WHERE email = ?1 AND e_profissional = 1 AND estado = 'activa'"
      ).bind(endereco).first()
      if (p) profissionalId = p.id
    }
    if (profissionalId) {
      const ja = await env.BD.prepare(
        "SELECT id FROM equipa WHERE dono_id = ?1 AND profissional_id = ?2 AND estado != 'removida'"
      ).bind(c.id, profissionalId).first()
      if (ja) erro(409, 'Essa pessoa ja esta na sua equipa.')
    }

    const codigo = codigo6()
    const id = novoId()
    await env.BD.prepare(`
      INSERT INTO equipa (id, dono_id, profissional_id, convite_email, convite_codigo, alcunha, estado, criada_em, aceite_em)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`
    ).bind(id, c.id, profissionalId, endereco, profissionalId ? null : codigo, alcunha,
      profissionalId ? 'activa' : 'convidada', AGORA(), profissionalId ? AGORA() : null).run()

    if (profissionalId) {
      await avisar(env, profissionalId, {
        tipo: 'equipa',
        titulo: `${c.nome} juntou-a a equipa`,
        corpo: 'Vai passar a receber as limpezas deste anfitriao.',
        ligacao: '/app/#/equipa',
      })
    } else if (endereco) {
      await enviar(env, {
        para: endereco, nome: alcunha,
        ...modelos.convite(c.nome, codigo, 'https://tudopronto.pt/app/#/convite'),
      })
    }
    return json({ id, codigo: profissionalId ? null : codigo, ja_tinha_conta: !!profissionalId }, 201)
  })

  api.post('/v1/equipa/entrar', async ({ env, pedido, corpo }) => {
    const c = await exigirProfissional(env, pedido)
    const codigo = texto(corpo.codigo, { campo: 'codigo', min: 6, max: 6 })
    const e = await env.BD.prepare(
      "SELECT * FROM equipa WHERE convite_codigo = ?1 AND estado = 'convidada'"
    ).bind(codigo).first()
    if (!e) erro(404, 'Esse codigo nao serve. Peca um novo a quem a convidou.')
    if (e.dono_id === c.id) erro(400, 'Nao pode juntar-se a sua propria equipa.')
    await env.BD.prepare(
      "UPDATE equipa SET profissional_id = ?2, estado = 'activa', aceite_em = ?3, convite_codigo = NULL WHERE id = ?1"
    ).bind(e.id, c.id, AGORA()).run()
    const d = await env.BD.prepare('SELECT nome FROM contas WHERE id = ?1').bind(e.dono_id).first()
    await avisar(env, e.dono_id, {
      tipo: 'equipa',
      titulo: `${c.nome} juntou-se a sua equipa`,
      corpo: 'Ja lhe pode entregar limpezas directamente.',
      ligacao: '/app/#/equipa',
    })
    return json({ ok: true, dono: d?.nome || null })
  })

  api.del('/v1/equipa/:id', async ({ env, pedido, params }) => {
    const c = await exigirConta(env, pedido)
    const e = await env.BD.prepare('SELECT * FROM equipa WHERE id = ?1').bind(params.id).first()
    if (!e) erro(404, 'Esse vinculo ja nao existe.')
    // Qualquer um dos dois pode desfazer: ninguem fica preso a equipa de ninguem.
    if (e.dono_id !== c.id && e.profissional_id !== c.id) erro(403, 'Esse vinculo nao e seu.')
    await env.BD.prepare("UPDATE equipa SET estado = 'removida' WHERE id = ?1").bind(e.id).run()
    return json({ ok: true })
  })

  // ──────────────────────────── mensagens ──────────────────────────

  api.get('/v1/servicos/:id/mensagens', async ({ env, pedido, params }) => {
    const c = await exigirConta(env, pedido)
    const s = await env.BD.prepare('SELECT dono_id, profissional_id FROM servicos WHERE id = ?1')
      .bind(params.id).first()
    if (!s) erro(404, 'Essa limpeza ja nao existe.')
    if (s.dono_id !== c.id && s.profissional_id !== c.id) erro(403, 'Essa conversa nao e sua.')
    const r = await env.BD.prepare(`
      SELECT m.*, c.nome AS autor_nome, c.foto_id AS autor_foto
        FROM mensagens m JOIN contas c ON c.id = m.autor_id
       WHERE m.servico_id = ?1 ORDER BY m.criada_em LIMIT 200`
    ).bind(params.id).all()
    await env.BD.prepare(
      'UPDATE mensagens SET lida_em = ?3 WHERE servico_id = ?1 AND autor_id != ?2 AND lida_em IS NULL'
    ).bind(params.id, c.id, AGORA()).run()
    return json({ mensagens: r.results || [] })
  })

  api.post('/v1/servicos/:id/mensagens', async ({ env, pedido, params, corpo }) => {
    const c = await exigirConta(env, pedido)
    const s = await env.BD.prepare(
      'SELECT dono_id, profissional_id, alojamento_id FROM servicos WHERE id = ?1'
    ).bind(params.id).first()
    if (!s) erro(404, 'Essa limpeza ja nao existe.')
    if (s.dono_id !== c.id && s.profissional_id !== c.id) erro(403, 'Essa conversa nao e sua.')
    if (!s.profissional_id) erro(400, 'Ainda nao ha com quem falar nesta limpeza.')
    const t = texto(corpo.texto, { campo: 'mensagem', min: 1, max: 1000 })
    const id = novoId()
    await env.BD.prepare(
      'INSERT INTO mensagens (id, servico_id, autor_id, texto, criada_em) VALUES (?1,?2,?3,?4,?5)'
    ).bind(id, params.id, c.id, t, AGORA()).run()
    const outro = s.dono_id === c.id ? s.profissional_id : s.dono_id
    await avisar(env, outro, {
      tipo: 'mensagem',
      titulo: `${c.nome} escreveu-lhe`,
      corpo: t.slice(0, 90),
      ligacao: `/app/#/servico/${params.id}`,
    })
    return json({ id }, 201)
  })

  // ──────────────────────────── denuncias ──────────────────────────

  api.post('/v1/denuncias', async ({ env, pedido, corpo }) => {
    const c = await exigirConta(env, pedido)
    const id = novoId()
    await env.BD.prepare(`
      INSERT INTO denuncias (id, autor_id, alvo_tipo, alvo_id, motivo, descricao, criada_em)
      VALUES (?1,?2,?3,?4,?5,?6,?7)`
    ).bind(id, c.id,
      daLista(corpo.alvo_tipo, ['conta', 'servico', 'avaliacao', 'mensagem'], { campo: 'tipo' }),
      texto(corpo.alvo_id, { campo: 'alvo', max: 40 }),
      texto(corpo.motivo, { campo: 'motivo', min: 3, max: 100 }),
      texto(corpo.descricao, { campo: 'descricao', max: 1000, obrigatorio: false }),
      AGORA()).run()
    return json({ id, mensagem: 'Recebemos a sua denuncia. Vamos analisa-la.' }, 201)
  })
}

// ───────────────────────────── auxiliares ────────────────────────────

/** As etiquetas vao para a base como JSON. Se alguma vez ficarem mal
 *  formadas, uma lista vazia e melhor do que um ecra em branco. */
function seguro (json_) {
  try {
    const v = JSON.parse(json_ || '[]')
    return Array.isArray(v) ? v : []
  } catch { return [] }
}

/** So conta para a media depois de revelada. Contar antes deixaria adivinhar
 *  o que a outra pessoa escreveu, vendo a media mexer. */
async function contarNaReputacao (env, servicoId) {
  const r = await env.BD.prepare(
    'SELECT avaliado_id, estrelas FROM avaliacoes WHERE servico_id = ?1 AND revelada_em IS NOT NULL'
  ).bind(servicoId).all()
  const agora = AGORA()
  const ops = (r.results || []).map(a => env.BD.prepare(`
    UPDATE reputacao SET soma_estrelas = soma_estrelas + ?2, n_avaliacoes = n_avaliacoes + 1,
           actualizada_em = ?3 WHERE conta_id = ?1`
  ).bind(a.avaliado_id, a.estrelas, agora))
  if (ops.length) await env.BD.batch(ops)
}
