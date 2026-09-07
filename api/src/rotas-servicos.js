// Servicos: o pedido de limpeza, o mercado, as candidaturas e o percurso do
// trabalho (a caminho -> a fazer -> tudo pronto).
//
// Duas decisoes de produto vivem neste ficheiro:
//
//  1. Quem escolhe e o DONO. Por omissao um servico recebe candidaturas e o
//     dono decide quem entra em casa dele. "Fica quem chegar primeiro" existe,
//     mas e uma escolha explicita para urgencias — nao a omissao. Dar a chave
//     de casa a alguem nao e uma corrida.
//
//  2. A plataforma NAO fixa precos. O dono propoe, o profissional aceita ou
//     contrapoe, e o valor combinado fica registado para os dois terem prova.
//     Isto e desenho deliberado: uma plataforma que fixa a remuneracao, impoe
//     horarios e sanciona quem recusa cai na presuncao de contrato de trabalho
//     do art. 12.-A do Codigo do Trabalho. Aqui nao ha nenhuma das tres.

import {
  AGORA, booleano, daLista, distanciaKm, erro, hora, inteiro, json, novoId, data as validarData, texto,
} from './util.js'
import { exigirConta, exigirDono, exigirProfissional } from './auth.js'
import { alojamentoCompleto, alojamentoPublico } from './rotas-alojamentos.js'
import { avisar } from './push.js'
import { enviar, modelos } from './correio.js'
import { CONCELHOS } from './concelhos.js'

const TIPOS = ['saida', 'profunda', 'preparacao', 'manutencao']
const ORIGEM_ROUPA = ['alojamento', 'profissional', 'lavandaria']
const ORIGEM_PRODUTOS = ['alojamento', 'profissional']

const NOME_TIPO = {
  saida: 'Limpeza de saida',
  profunda: 'Limpeza profunda',
  preparacao: 'Preparacao para hospedes',
  manutencao: 'Manutencao',
}

/** Carrega um servico e diz que papel a conta tem nele. Uma consulta so:
 *  em cada ecra de servico, duas consultas seriam duas viagens ao D1. */
async function carregar (env, conta, id) {
  const s = await env.BD.prepare(`
    SELECT s.*, a.nome AS aloj_nome, a.tipologia, a.quartos, a.camas, a.casas_banho, a.area_m2,
           a.distrito, a.concelho, a.freguesia, a.morada, a.codigo_postal, a.acesso, a.instrucoes,
           a.tem_elevador, a.andar, a.lat, a.lon, a.registo_al
      FROM servicos s JOIN alojamentos a ON a.id = s.alojamento_id
     WHERE s.id = ?1`
  ).bind(id).first()
  if (!s) erro(404, 'Essa limpeza ja nao existe.')
  const papel = s.dono_id === conta.id ? 'dono'
    : s.profissional_id === conta.id ? 'profissional'
    : null
  return { s, papel }
}

/** A vista de um servico, cortada ao que quem pergunta tem direito a ver.
 *  Este e o unico sitio onde a morada e o codigo de acesso saem — e so saem
 *  para o dono e para quem ja foi escolhido. */
function vista (s, papel, { candidaturas, tarefas, avaliei } = {}) {
  const base = {
    id: s.id,
    tipo: s.tipo,
    tipo_nome: NOME_TIPO[s.tipo],
    data: s.data,
    hora_inicio: s.hora_inicio,
    hora_limite: s.hora_limite,
    duracao_prevista: s.duracao_prevista,
    muda_roupa: !!s.muda_roupa,
    roupa_de: s.roupa_de,
    repor_consumiveis: !!s.repor_consumiveis,
    produtos_de: s.produtos_de,
    valor: s.valor,
    notas: s.notas,
    estado: s.estado,
    visibilidade: s.visibilidade,
    aceita_primeira: !!s.aceita_primeira,
    criado_em: s.criado_em,
    atribuido_em: s.atribuido_em,
    iniciado_em: s.iniciado_em,
    concluido_em: s.concluido_em,
    dono_id: s.dono_id,
    profissional_id: s.profissional_id,
    alojamento: alojamentoPublico({ ...s, id: s.alojamento_id }),
  }
  if (papel) {
    base.alojamento = alojamentoCompleto({ ...s, id: s.alojamento_id, nome: s.aloj_nome })
    base.motivo_cancelamento = s.motivo_cancelamento
  }
  if (candidaturas) base.candidaturas = candidaturas
  if (tarefas) base.tarefas = tarefas
  if (avaliei !== undefined) base.avaliei = avaliei
  return base
}

async function reputacaoDe (env, contaId, papel) {
  const r = await env.BD.prepare(
    'SELECT * FROM reputacao WHERE conta_id = ?1'
  ).bind(contaId).first()
  if (!r) return { estrelas: null, n_avaliacoes: 0, n_concluidos: 0 }
  return {
    estrelas: r.n_avaliacoes ? Math.round((r.soma_estrelas / r.n_avaliacoes) * 10) / 10 : null,
    n_avaliacoes: r.n_avaliacoes,
    n_concluidos: r.n_concluidos,
    n_faltas: r.n_faltas,
  }
}

export function rotasServicos (api) {
  // ─────────────────────── criar e listar ───────────────────────

  api.post('/v1/servicos', async ({ env, pedido, corpo }) => {
    const c = await exigirDono(env, pedido)
    const a = await env.BD.prepare(
      'SELECT * FROM alojamentos WHERE id = ?1'
    ).bind(texto(corpo.alojamento_id, { campo: 'alojamento' })).first()
    if (!a) erro(404, 'Esse alojamento ja nao existe.')
    if (a.dono_id !== c.id) erro(403, 'Esse alojamento nao e seu.')
    if (a.arquivado) erro(400, 'Esse alojamento esta arquivado.')

    const dia = validarData(corpo.data)
    const inicio = hora(corpo.hora_inicio, 'hora de entrada')
    const limite = hora(corpo.hora_limite, 'hora limite')
    if (limite <= inicio) erro(400, 'A hora limite tem de ser depois da hora de entrada.', 'hora_limite')
    // Marcar para ontem so pode ser engano.
    if (dia < AGORA().slice(0, 10)) erro(400, 'Essa data ja passou.', 'data')

    const visibilidade = daLista(corpo.visibilidade, ['mercado', 'equipa', 'directo'],
      { campo: 'visibilidade', obrigatorio: false, omissao: 'mercado' })
    const valor = inteiro(corpo.valor, { campo: 'valor', min: 0, max: 100000, obrigatorio: false })
    const directoPara = texto(corpo.profissional_id, { campo: 'profissional', max: 40, obrigatorio: false })

    let profissionalId = null
    if (visibilidade === 'directo') {
      if (!directoPara) erro(400, 'Escolha a quem quer entregar esta limpeza.', 'profissional_id')
      const naEquipa = await env.BD.prepare(
        "SELECT id FROM equipa WHERE dono_id = ?1 AND profissional_id = ?2 AND estado = 'activa'"
      ).bind(c.id, directoPara).first()
      if (!naEquipa) erro(400, 'Essa pessoa nao esta na sua equipa.')
      profissionalId = directoPara
    }

    const id = novoId()
    const agora = AGORA()
    await env.BD.prepare(`
      INSERT INTO servicos (id, alojamento_id, dono_id, profissional_id, tipo, data, hora_inicio,
        hora_limite, duracao_prevista, muda_roupa, roupa_de, repor_consumiveis, produtos_de, valor,
        notas, visibilidade, aceita_primeira, estado, criado_em, atribuido_em)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)`
    ).bind(
      id, a.id, c.id, profissionalId,
      daLista(corpo.tipo, TIPOS, { campo: 'tipo', obrigatorio: false, omissao: 'saida' }),
      dia, inicio, limite,
      inteiro(corpo.duracao_prevista, { campo: 'duracao', min: 15, max: 960, obrigatorio: false }),
      booleano(corpo.muda_roupa, true) ? 1 : 0,
      daLista(corpo.roupa_de, ORIGEM_ROUPA, { campo: 'roupa', obrigatorio: false, omissao: 'alojamento' }),
      booleano(corpo.repor_consumiveis, true) ? 1 : 0,
      daLista(corpo.produtos_de, ORIGEM_PRODUTOS, { campo: 'produtos', obrigatorio: false, omissao: 'alojamento' }),
      valor,
      texto(corpo.notas, { campo: 'notas', max: 1000, obrigatorio: false }),
      visibilidade,
      booleano(corpo.aceita_primeira) ? 1 : 0,
      profissionalId ? 'atribuido' : 'aberto',
      agora, profissionalId ? agora : null,
    ).run()

    await copiarTarefas(env, id, a.id)

    if (profissionalId) {
      await avisar(env, profissionalId, {
        tipo: 'servico_directo',
        titulo: `${c.nome} entregou-lhe uma limpeza`,
        corpo: `${a.nome} — ${dia} as ${inicio}`,
        ligacao: `/app/#/servico/${id}`,
      })
    } else if (visibilidade === 'equipa') {
      const equipa = await env.BD.prepare(
        "SELECT profissional_id FROM equipa WHERE dono_id = ?1 AND estado = 'activa' AND profissional_id IS NOT NULL LIMIT 20"
      ).bind(c.id).all()
      for (const e of equipa.results || []) {
        await avisar(env, e.profissional_id, {
          tipo: 'servico_equipa',
          titulo: `${c.nome} tem uma limpeza para ${formatarDia(dia)}`,
          corpo: `${a.concelho} — das ${inicio} as ${limite}`,
          ligacao: `/app/#/servico/${id}`,
        })
      }
    }

    const { s } = await carregar(env, c, id)
    return json({ servico: vista(s, 'dono') }, 201)
  })

  /** Os meus servicos. `papel` decide o lado; sem ele, os dois. */
  api.get('/v1/servicos', async ({ env, pedido, url }) => {
    const c = await exigirConta(env, pedido)
    const papel = url.searchParams.get('papel')
    const desde = url.searchParams.get('desde') || '2000-01-01'
    const estado = url.searchParams.get('estado')
    const filtros = []
    const vals = []
    if (papel === 'dono' || (!papel && !c.e_profissional)) {
      filtros.push(`s.dono_id = ?${vals.push(c.id)}`)
    } else if (papel === 'profissional' || (!papel && !c.e_dono)) {
      filtros.push(`s.profissional_id = ?${vals.push(c.id)}`)
    } else {
      const a = vals.push(c.id)
      const b = vals.push(c.id)
      filtros.push(`(s.dono_id = ?${a} OR s.profissional_id = ?${b})`)
    }
    filtros.push(`s.data >= ?${vals.push(desde)}`)
    if (estado) filtros.push(`s.estado = ?${vals.push(estado)}`)

    const r = await env.BD.prepare(`
      SELECT s.*, a.nome AS aloj_nome, a.tipologia, a.quartos, a.camas, a.casas_banho, a.area_m2,
             a.distrito, a.concelho, a.freguesia, a.morada, a.codigo_postal, a.acesso, a.instrucoes,
             a.tem_elevador, a.andar, a.lat, a.lon, a.registo_al
        FROM servicos s JOIN alojamentos a ON a.id = s.alojamento_id
       WHERE ${filtros.join(' AND ')}
       ORDER BY s.data, s.hora_inicio LIMIT 200`
    ).bind(...vals).all()

    return json({
      servicos: (r.results || []).map(s =>
        vista(s, s.dono_id === c.id ? 'dono' : s.profissional_id === c.id ? 'profissional' : null)),
    })
  })

  api.get('/v1/servicos/:id', async ({ env, pedido, params }) => {
    const c = await exigirConta(env, pedido)
    const { s, papel } = await carregar(env, c, params.id)
    // Quem nao esta no servico so o ve se ele estiver aberto no mercado — e ai
    // ve a versao publica, sem morada.
    if (!papel && !(s.estado === 'aberto' && s.visibilidade === 'mercado')) {
      erro(403, 'Nao tem acesso a esta limpeza.')
    }
    const extras = {}
    if (papel === 'dono' && s.estado === 'aberto') {
      const cands = await env.BD.prepare(`
        SELECT c.*, p.nome, p.foto_id, p.concelho, p.bio,
               r.soma_estrelas, r.n_avaliacoes, r.n_concluidos, r.n_faltas
          FROM candidaturas c
          JOIN contas p ON p.id = c.profissional_id
     LEFT JOIN reputacao r ON r.conta_id = c.profissional_id
         WHERE c.servico_id = ?1 AND c.estado = 'pendente'
      ORDER BY c.criada_em`
      ).bind(s.id).all()
      extras.candidaturas = (cands.results || []).map(x => ({
        id: x.id,
        valor: x.valor,
        mensagem: x.mensagem,
        criada_em: x.criada_em,
        profissional: {
          id: x.profissional_id, nome: x.nome, foto_id: x.foto_id,
          concelho: x.concelho, bio: x.bio,
          estrelas: x.n_avaliacoes ? Math.round((x.soma_estrelas / x.n_avaliacoes) * 10) / 10 : null,
          n_avaliacoes: x.n_avaliacoes || 0,
          n_concluidos: x.n_concluidos || 0,
          n_faltas: x.n_faltas || 0,
        },
      }))
    }
    if (papel) {
      const t = await env.BD.prepare(
        'SELECT * FROM tarefas WHERE servico_id = ?1 ORDER BY ordem'
      ).bind(s.id).all()
      extras.tarefas = t.results || []
      const a = await env.BD.prepare(
        'SELECT id FROM avaliacoes WHERE servico_id = ?1 AND autor_id = ?2'
      ).bind(s.id, c.id).first()
      extras.avaliei = !!a
    }
    const v = vista(s, papel, extras)
    // As duas partes veem-se uma a outra: e preciso saber para quem se vai
    // abrir a porta, e para quem se vai trabalhar.
    if (papel && s.profissional_id) {
      v.profissional = await pessoaNoServico(env, s.profissional_id, papel === 'dono')
    }
    if (papel === 'profissional') {
      v.dono = await pessoaNoServico(env, s.dono_id, true)
    }
    return json({ servico: v })
  })

  api.patch('/v1/servicos/:id', async ({ env, pedido, params, corpo }) => {
    const c = await exigirDono(env, pedido)
    const { s, papel } = await carregar(env, c, params.id)
    if (papel !== 'dono') erro(403, 'Essa limpeza nao e sua.')
    if (!['aberto', 'atribuido'].includes(s.estado)) {
      erro(400, 'Ja nao da para mudar esta limpeza.')
    }
    const campos = []
    const vals = []
    const por = (k, v) => { campos.push(`${k} = ?${campos.length + 1}`); vals.push(v) }
    if (corpo.data !== undefined) por('data', validarData(corpo.data))
    if (corpo.hora_inicio !== undefined) por('hora_inicio', hora(corpo.hora_inicio, 'hora de entrada'))
    if (corpo.hora_limite !== undefined) por('hora_limite', hora(corpo.hora_limite, 'hora limite'))
    if (corpo.valor !== undefined) por('valor', inteiro(corpo.valor, { campo: 'valor', min: 0, max: 100000, obrigatorio: false }))
    if (corpo.notas !== undefined) por('notas', texto(corpo.notas, { campo: 'notas', max: 1000, obrigatorio: false }))
    if (corpo.duracao_prevista !== undefined) por('duracao_prevista', inteiro(corpo.duracao_prevista, { campo: 'duracao', min: 15, max: 960, obrigatorio: false }))
    if (corpo.muda_roupa !== undefined) por('muda_roupa', booleano(corpo.muda_roupa) ? 1 : 0)
    if (corpo.roupa_de !== undefined) por('roupa_de', daLista(corpo.roupa_de, ORIGEM_ROUPA, { campo: 'roupa' }))
    if (corpo.repor_consumiveis !== undefined) por('repor_consumiveis', booleano(corpo.repor_consumiveis) ? 1 : 0)
    if (corpo.produtos_de !== undefined) por('produtos_de', daLista(corpo.produtos_de, ORIGEM_PRODUTOS, { campo: 'produtos' }))
    if (corpo.aceita_primeira !== undefined) por('aceita_primeira', booleano(corpo.aceita_primeira) ? 1 : 0)
    if (!campos.length) erro(400, 'Nao ha nada para mudar.')
    vals.push(s.id)
    await env.BD.prepare(`UPDATE servicos SET ${campos.join(', ')} WHERE id = ?${vals.length}`).bind(...vals).run()

    // Mudar a hora de uma limpeza ja atribuida nao pode ser silencioso: a
    // pessoa organizou o dia a volta dela.
    if (s.profissional_id && (corpo.data !== undefined || corpo.hora_inicio !== undefined || corpo.hora_limite !== undefined)) {
      await avisar(env, s.profissional_id, {
        tipo: 'servico_mudou',
        titulo: `${c.nome} mudou a hora de uma limpeza`,
        corpo: `${s.aloj_nome} — veja os novos detalhes`,
        ligacao: `/app/#/servico/${s.id}`,
      })
    }
    const { s: novo } = await carregar(env, c, params.id)
    return json({ servico: vista(novo, 'dono') })
  })

  api.post('/v1/servicos/:id/cancelar', async ({ env, pedido, params, corpo }) => {
    const c = await exigirConta(env, pedido)
    const { s, papel } = await carregar(env, c, params.id)
    if (!papel) erro(403, 'Essa limpeza nao e sua.')
    if (['concluido', 'cancelado'].includes(s.estado)) erro(400, 'Essa limpeza ja esta fechada.')
    const motivo = texto(corpo.motivo, { campo: 'motivo', max: 300, obrigatorio: false })
    await env.BD.prepare(
      "UPDATE servicos SET estado = 'cancelado', cancelado_por = ?2, motivo_cancelamento = ?3 WHERE id = ?1"
    ).bind(s.id, c.id, motivo).run()

    // Cancelar depois de aceitar conta para a reputacao de quem cancelou —
    // dos dois lados. Um dono que desmarca a meio da manha custa uma manha a
    // alguem, tanto como uma profissional que nao aparece.
    if (s.estado === 'atribuido' || s.estado === 'a_decorrer') {
      await env.BD.prepare(
        'UPDATE reputacao SET n_cancelados = n_cancelados + 1, actualizada_em = ?2 WHERE conta_id = ?1'
      ).bind(c.id, AGORA()).run()
      const outro = papel === 'dono' ? s.profissional_id : s.dono_id
      if (outro) {
        await avisar(env, outro, {
          tipo: 'servico_cancelado',
          titulo: 'Uma limpeza foi cancelada',
          corpo: `${s.aloj_nome} — ${formatarDia(s.data)}${motivo ? `: ${motivo}` : ''}`,
          ligacao: `/app/#/servico/${s.id}`,
        })
      }
    }
    return json({ ok: true })
  })

  // ─────────────────────────── mercado ──────────────────────────

  api.get('/v1/mercado', async ({ env, pedido, url }) => {
    const c = await exigirProfissional(env, pedido)
    const hoje = AGORA().slice(0, 10)
    const concelho = url.searchParams.get('concelho') || null
    const ate = url.searchParams.get('ate') || '2099-12-31'

    const filtros = ["s.estado = 'aberto'", "s.visibilidade = 'mercado'", 's.data >= ?1', 's.data <= ?2']
    const vals = [hoje, ate]
    if (concelho) filtros.push(`a.concelho = ?${vals.push(concelho)}`)

    const r = await env.BD.prepare(`
      SELECT s.*, a.nome AS aloj_nome, a.tipologia, a.quartos, a.camas, a.casas_banho, a.area_m2,
             a.distrito, a.concelho, a.freguesia, a.tem_elevador, a.andar, a.lat, a.lon,
             d.nome AS dono_nome, d.foto_id AS dono_foto,
             rd.soma_estrelas AS d_soma, rd.n_avaliacoes AS d_n,
             (SELECT COUNT(*) FROM candidaturas x WHERE x.servico_id = s.id AND x.estado = 'pendente') AS n_candidaturas,
             (SELECT COUNT(*) FROM candidaturas y WHERE y.servico_id = s.id AND y.profissional_id = ?${vals.push(c.id)}) AS ja_me_candidatei
        FROM servicos s
        JOIN alojamentos a ON a.id = s.alojamento_id
        JOIN contas d ON d.id = s.dono_id
   LEFT JOIN reputacao rd ON rd.conta_id = s.dono_id
       WHERE ${filtros.join(' AND ')}
    ORDER BY s.data, s.hora_inicio
       LIMIT 100`
    ).bind(...vals).all()

    const meu = CONCELHOS.find(x => x.nome === c.concelho)
    const lista = (r.results || []).map(s => ({
      ...vista(s, null),
      dono: {
        id: s.dono_id, nome: s.dono_nome, foto_id: s.dono_foto,
        estrelas: s.d_n ? Math.round((s.d_soma / s.d_n) * 10) / 10 : null,
        n_avaliacoes: s.d_n || 0,
      },
      n_candidaturas: s.n_candidaturas,
      ja_me_candidatei: !!s.ja_me_candidatei,
      distancia_km: meu ? distanciaKm(meu.lat, meu.lon, s.lat, s.lon) : null,
    }))

    // Filtrar pelo raio DEPOIS de ler: filtrar por distancia em SQL obrigava a
    // uma funcao que o SQLite nao tem, e a lista ja vem limitada a 100.
    const dentro = lista.filter(x => x.distancia_km === null || x.distancia_km <= (c.raio_km || 15))
    return json({
      servicos: dentro,
      fora_do_raio: lista.length - dentro.length,
      raio_km: c.raio_km,
    })
  })

  api.post('/v1/servicos/:id/candidatar', async ({ env, pedido, params, corpo }) => {
    const c = await exigirProfissional(env, pedido)
    const { s } = await carregar(env, c, params.id)
    if (s.estado !== 'aberto') erro(400, 'Essa limpeza ja nao esta disponivel.')
    if (s.dono_id === c.id) erro(400, 'Nao pode candidatar-se a sua propria limpeza.')
    if (s.visibilidade === 'directo') erro(400, 'Essa limpeza foi entregue a outra pessoa.')
    if (s.visibilidade === 'equipa') {
      const naEquipa = await env.BD.prepare(
        "SELECT id FROM equipa WHERE dono_id = ?1 AND profissional_id = ?2 AND estado = 'activa'"
      ).bind(s.dono_id, c.id).first()
      if (!naEquipa) erro(403, 'Essa limpeza e so para a equipa deste anfitriao.')
    }
    const valor = inteiro(corpo.valor, { campo: 'valor', min: 0, max: 100000, obrigatorio: false })
    const mensagem = texto(corpo.mensagem, { campo: 'mensagem', max: 500, obrigatorio: false })

    const ja = await env.BD.prepare(
      'SELECT id, estado FROM candidaturas WHERE servico_id = ?1 AND profissional_id = ?2'
    ).bind(s.id, c.id).first()
    if (ja && ja.estado === 'pendente') erro(409, 'Ja se candidatou a esta limpeza.')

    const id = ja ? ja.id : novoId()
    const agora = AGORA()
    if (ja) {
      await env.BD.prepare(
        "UPDATE candidaturas SET estado = 'pendente', valor = ?2, mensagem = ?3, criada_em = ?4, respondida_em = NULL WHERE id = ?1"
      ).bind(id, valor, mensagem, agora).run()
    } else {
      await env.BD.prepare(`
        INSERT INTO candidaturas (id, servico_id, profissional_id, valor, mensagem, criada_em)
        VALUES (?1,?2,?3,?4,?5,?6)`
      ).bind(id, s.id, c.id, valor, mensagem, agora).run()
    }

    // "Fica quem chegar primeiro" e uma escolha explicita do dono, para as
    // urgencias. Nao e a omissao: por omissao o dono ve quem se ofereceu e
    // escolhe. Dar a chave de casa a alguem nao e uma corrida.
    if (s.aceita_primeira) {
      const atribuido = await atribuir(env, s, c.id, id)
      if (atribuido) return json({ atribuido: true, servico_id: s.id }, 201)
    }

    await avisar(env, s.dono_id, {
      tipo: 'candidatura',
      titulo: `${c.nome} ofereceu-se para uma limpeza`,
      corpo: `${s.aloj_nome} — ${formatarDia(s.data)}`,
      ligacao: `/app/#/servico/${s.id}`,
    })
    return json({ atribuido: false, id }, 201)
  })

  api.del('/v1/candidaturas/:id', async ({ env, pedido, params }) => {
    const c = await exigirProfissional(env, pedido)
    const x = await env.BD.prepare('SELECT * FROM candidaturas WHERE id = ?1').bind(params.id).first()
    if (!x) erro(404, 'Essa candidatura ja nao existe.')
    if (x.profissional_id !== c.id) erro(403, 'Essa candidatura nao e sua.')
    if (x.estado !== 'pendente') erro(400, 'Essa candidatura ja foi respondida.')
    await env.BD.prepare("UPDATE candidaturas SET estado = 'retirada', respondida_em = ?2 WHERE id = ?1")
      .bind(x.id, AGORA()).run()
    return json({ ok: true })
  })

  api.post('/v1/candidaturas/:id/aceitar', async ({ env, pedido, params }) => {
    const c = await exigirDono(env, pedido)
    const x = await env.BD.prepare('SELECT * FROM candidaturas WHERE id = ?1').bind(params.id).first()
    if (!x) erro(404, 'Essa candidatura ja nao existe.')
    const { s, papel } = await carregar(env, c, x.servico_id)
    if (papel !== 'dono') erro(403, 'Essa limpeza nao e sua.')
    if (s.estado !== 'aberto') erro(400, 'Essa limpeza ja foi atribuida.')
    if (x.estado !== 'pendente') erro(400, 'Essa candidatura ja foi respondida.')
    const ok = await atribuir(env, s, x.profissional_id, x.id)
    if (!ok) erro(409, 'Essa limpeza acabou de ser atribuida a outra pessoa.')
    return json({ ok: true })
  })

  api.post('/v1/candidaturas/:id/recusar', async ({ env, pedido, params }) => {
    const c = await exigirDono(env, pedido)
    const x = await env.BD.prepare('SELECT * FROM candidaturas WHERE id = ?1').bind(params.id).first()
    if (!x) erro(404, 'Essa candidatura ja nao existe.')
    const s = await env.BD.prepare('SELECT dono_id FROM servicos WHERE id = ?1').bind(x.servico_id).first()
    if (!s || s.dono_id !== c.id) erro(403, 'Essa limpeza nao e sua.')
    await env.BD.prepare("UPDATE candidaturas SET estado = 'recusada', respondida_em = ?2 WHERE id = ?1")
      .bind(x.id, AGORA()).run()
    return json({ ok: true })
  })

  // ────────────────────── percurso do trabalho ──────────────────────

  api.post('/v1/servicos/:id/iniciar', async ({ env, pedido, params }) => {
    const c = await exigirConta(env, pedido)
    const { s, papel } = await carregar(env, c, params.id)
    if (papel !== 'profissional') erro(403, 'So quem vai fazer a limpeza pode comecar.')
    if (s.estado !== 'atribuido') erro(400, 'Essa limpeza nao esta por comecar.')
    await env.BD.prepare("UPDATE servicos SET estado = 'a_decorrer', iniciado_em = ?2 WHERE id = ?1")
      .bind(s.id, AGORA()).run()
    await avisar(env, s.dono_id, {
      tipo: 'servico_iniciado',
      titulo: `${c.nome} chegou a ${s.aloj_nome}`,
      corpo: 'A limpeza comecou.',
      ligacao: `/app/#/servico/${s.id}`,
    })
    return json({ ok: true })
  })

  api.post('/v1/servicos/:id/tarefas/:tid', async ({ env, pedido, params, corpo }) => {
    const c = await exigirConta(env, pedido)
    const { s, papel } = await carregar(env, c, params.id)
    if (papel !== 'profissional') erro(403, 'So quem esta a fazer a limpeza pode marcar tarefas.')
    if (!['atribuido', 'a_decorrer'].includes(s.estado)) erro(400, 'Essa limpeza ja esta fechada.')
    const t = await env.BD.prepare('SELECT * FROM tarefas WHERE id = ?1 AND servico_id = ?2')
      .bind(params.tid, s.id).first()
    if (!t) erro(404, 'Essa tarefa nao existe.')

    const feita = booleano(corpo.feita, true)
    const fotoId = texto(corpo.foto_id, { campo: 'foto', max: 40, obrigatorio: false })
    if (feita && t.exige_foto && !fotoId && !t.foto_id) {
      erro(400, 'Esta tarefa pede uma fotografia.')
    }
    await env.BD.prepare('UPDATE tarefas SET feita_em = ?2, foto_id = ?3 WHERE id = ?1')
      .bind(t.id, feita ? AGORA() : null, fotoId || t.foto_id || null).run()
    // Marcar a primeira tarefa e comecar, sem obrigar a carregar noutro botao.
    if (feita && s.estado === 'atribuido') {
      await env.BD.prepare("UPDATE servicos SET estado = 'a_decorrer', iniciado_em = ?2 WHERE id = ?1")
        .bind(s.id, AGORA()).run()
    }
    return json({ ok: true })
  })

  api.post('/v1/servicos/:id/concluir', async ({ env, pedido, params }) => {
    const c = await exigirConta(env, pedido)
    const { s, papel } = await carregar(env, c, params.id)
    if (papel !== 'profissional') erro(403, 'So quem fez a limpeza pode dar por terminada.')
    if (!['atribuido', 'a_decorrer'].includes(s.estado)) erro(400, 'Essa limpeza ja esta fechada.')

    const porFazer = await env.BD.prepare(
      'SELECT COUNT(*) n FROM tarefas WHERE servico_id = ?1 AND exige_foto = 1 AND (feita_em IS NULL OR foto_id IS NULL)'
    ).bind(s.id).first()
    if (porFazer?.n) {
      erro(400, `Faltam ${porFazer.n} tarefa(s) com fotografia. A fotografia e o que prova o trabalho — e o que evita discussoes depois.`)
    }

    const agora = AGORA()
    await env.BD.prepare("UPDATE servicos SET estado = 'concluido', concluido_em = ?2 WHERE id = ?1")
      .bind(s.id, agora).run()
    await env.BD.batch([
      env.BD.prepare('UPDATE reputacao SET n_concluidos = n_concluidos + 1, actualizada_em = ?2 WHERE conta_id = ?1').bind(c.id, agora),
      env.BD.prepare('UPDATE reputacao SET n_concluidos = n_concluidos + 1, actualizada_em = ?2 WHERE conta_id = ?1').bind(s.dono_id, agora),
    ])

    await avisar(env, s.dono_id, {
      tipo: 'tudo_pronto',
      titulo: `Tudo pronto em ${s.aloj_nome}`,
      corpo: `${c.nome} terminou. Veja as fotografias.`,
      ligacao: `/app/#/servico/${s.id}`,
    })
    const dono = await env.BD.prepare('SELECT email, nome FROM contas WHERE id = ?1').bind(s.dono_id).first()
    if (dono) {
      await enviar(env, {
        para: dono.email, nome: dono.nome,
        ...modelos.tudoPronto(c.nome, s.aloj_nome, `https://tudopronto.pt/app/#/servico/${s.id}`),
      })
    }
    return json({ ok: true })
  })

  api.post('/v1/servicos/:id/ocorrencias', async ({ env, pedido, params, corpo }) => {
    const c = await exigirConta(env, pedido)
    const { s, papel } = await carregar(env, c, params.id)
    if (!papel) erro(403, 'Essa limpeza nao e sua.')
    const id = novoId()
    await env.BD.prepare(`
      INSERT INTO ocorrencias (id, servico_id, autor_id, tipo, descricao, foto_id, criada_em)
      VALUES (?1,?2,?3,?4,?5,?6,?7)`
    ).bind(id, s.id, c.id,
      daLista(corpo.tipo, ['dano', 'perdido', 'falta', 'outro'], { campo: 'tipo' }),
      texto(corpo.descricao, { campo: 'descricao', min: 3, max: 500 }),
      texto(corpo.foto_id, { campo: 'foto', max: 40, obrigatorio: false }),
      AGORA()).run()
    const outro = papel === 'dono' ? s.profissional_id : s.dono_id
    if (outro) {
      await avisar(env, outro, {
        tipo: 'ocorrencia',
        titulo: `${c.nome} registou uma ocorrencia`,
        corpo: `${s.aloj_nome} — ${String(corpo.descricao).slice(0, 80)}`,
        ligacao: `/app/#/servico/${s.id}`,
      })
    }
    return json({ id }, 201)
  })

  api.get('/v1/servicos/:id/ocorrencias', async ({ env, pedido, params }) => {
    const c = await exigirConta(env, pedido)
    const { s, papel } = await carregar(env, c, params.id)
    if (!papel) erro(403, 'Essa limpeza nao e sua.')
    const r = await env.BD.prepare(`
      SELECT o.*, c.nome AS autor_nome FROM ocorrencias o JOIN contas c ON c.id = o.autor_id
       WHERE o.servico_id = ?1 ORDER BY o.criada_em`
    ).bind(s.id).all()
    return json({ ocorrencias: r.results || [] })
  })
}

// ───────────────────────────── auxiliares ────────────────────────────

/** Atribui o servico. A escrita e CONDICIONAL: `WHERE estado = 'aberto'` faz
 *  a base decidir quem chegou primeiro. Sem isso, duas candidaturas
 *  simultaneas com "aceita a primeira" ligado davam a mesma limpeza a duas
 *  pessoas, e uma delas fazia a viagem para nada. */
async function atribuir (env, s, profissionalId, candidaturaId) {
  const agora = AGORA()
  const r = await env.BD.prepare(`
    UPDATE servicos SET estado = 'atribuido', profissional_id = ?2, atribuido_em = ?3
     WHERE id = ?1 AND estado = 'aberto'`
  ).bind(s.id, profissionalId, agora).run()
  if (!r.meta.changes) return false

  await env.BD.batch([
    env.BD.prepare("UPDATE candidaturas SET estado = 'aceite', respondida_em = ?2 WHERE id = ?1")
      .bind(candidaturaId, agora),
    env.BD.prepare("UPDATE candidaturas SET estado = 'recusada', respondida_em = ?2 WHERE servico_id = ?1 AND id != ?3 AND estado = 'pendente'")
      .bind(s.id, agora, candidaturaId),
  ])

  const prof = await env.BD.prepare('SELECT nome, email FROM contas WHERE id = ?1').bind(profissionalId).first()
  await avisar(env, profissionalId, {
    tipo: 'atribuido',
    titulo: 'A limpeza e sua',
    corpo: `${s.aloj_nome} — ${formatarDia(s.data)} as ${s.hora_inicio}. Ja pode ver a morada.`,
    ligacao: `/app/#/servico/${s.id}`,
  })
  await avisar(env, s.dono_id, {
    tipo: 'atribuido',
    titulo: `${prof?.nome || 'Alguem'} ficou com a limpeza`,
    corpo: `${s.aloj_nome} — ${formatarDia(s.data)}`,
    ligacao: `/app/#/servico/${s.id}`,
  })
  const dono = await env.BD.prepare('SELECT email, nome FROM contas WHERE id = ?1').bind(s.dono_id).first()
  if (dono && prof) {
    await enviar(env, {
      para: dono.email, nome: dono.nome,
      ...modelos.servicoAtribuido(prof.nome, formatarDia(s.data), s.aloj_nome,
        `https://tudopronto.pt/app/#/servico/${s.id}`),
    })
  }
  return true
}

/** Copia a lista DO DONO para o servico. Copiar em vez de apontar: mudar a
 *  lista do alojamento amanha nao pode reescrever o que ficou provado num
 *  servico de ontem. A lista e conteudo de quem tem a casa, nao um padrao do
 *  Tudo Pronto — ver a nota em rotas-alojamentos.js. */
async function copiarTarefas (env, servicoId, alojamentoId) {
  const m = await env.BD.prepare(
    'SELECT * FROM tarefas_modelo WHERE alojamento_id = ?1 ORDER BY ordem'
  ).bind(alojamentoId).all()
  const lista = m.results || []
  if (!lista.length) return
  const stmt = env.BD.prepare(
    'INSERT INTO tarefas (id, servico_id, zona, descricao, exige_foto, ordem) VALUES (?1,?2,?3,?4,?5,?6)'
  )
  await env.BD.batch(lista.map(t =>
    stmt.bind(novoId(), servicoId, t.zona, t.descricao, t.exige_foto, t.ordem)))
}

/** A outra pessoa do servico. O telefone so vai quando ha razao para ele
 *  existir: depois de atribuido, para se poderem falar no dia. */
async function pessoaNoServico (env, id, comTelefone) {
  const p = await env.BD.prepare(`
    SELECT c.id, c.nome, c.foto_id, c.telefone, c.concelho, c.bio,
           r.soma_estrelas, r.n_avaliacoes, r.n_concluidos, r.n_faltas
      FROM contas c LEFT JOIN reputacao r ON r.conta_id = c.id WHERE c.id = ?1`
  ).bind(id).first()
  if (!p) return null
  return {
    id: p.id, nome: p.nome, foto_id: p.foto_id, concelho: p.concelho, bio: p.bio,
    telefone: comTelefone ? p.telefone : null,
    estrelas: p.n_avaliacoes ? Math.round((p.soma_estrelas / p.n_avaliacoes) * 10) / 10 : null,
    n_avaliacoes: p.n_avaliacoes || 0,
    n_concluidos: p.n_concluidos || 0,
    n_faltas: p.n_faltas || 0,
  }
}

const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export function formatarDia (iso) {
  const d = new Date(iso + 'T12:00:00Z')
  return `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`
}
