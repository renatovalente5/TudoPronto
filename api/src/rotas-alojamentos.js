// Alojamentos e as suas listas de tarefas.

import { AGORA, booleano, daLista, erro, inteiro, json, novoId, texto } from './util.js'
import { exigirConta, exigirDono } from './auth.js'
import { CONCELHOS } from './concelhos.js'

export const TIPOLOGIAS = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+', 'Moradia', 'Quarto']

/** O que o mercado pode ver de um alojamento: nem morada, nem acesso, nem
 *  codigo postal. Quem ve isto ainda nao foi escolhido para la entrar. */
export function alojamentoPublico (a) {
  return {
    id: a.id,
    tipologia: a.tipologia,
    quartos: a.quartos,
    camas: a.camas,
    casas_banho: a.casas_banho,
    area_m2: a.area_m2,
    distrito: a.distrito,
    concelho: a.concelho,
    freguesia: a.freguesia,
    tem_elevador: !!a.tem_elevador,
    andar: a.andar,
    lat: a.lat,
    lon: a.lon,
  }
}

/** Tudo, incluindo morada e codigo de acesso. So para o dono e para quem esta
 *  atribuido ao servico. */
export function alojamentoCompleto (a) {
  return {
    ...alojamentoPublico(a),
    nome: a.nome,
    morada: a.morada,
    codigo_postal: a.codigo_postal,
    acesso: a.acesso,
    instrucoes: a.instrucoes,
    registo_al: a.registo_al,
    arquivado: !!a.arquivado,
    criado_em: a.criado_em,
  }
}

async function meuAlojamento (env, dono, id) {
  const a = await env.BD.prepare('SELECT * FROM alojamentos WHERE id = ?1').bind(id).first()
  if (!a) erro(404, 'Esse alojamento já não existe.')
  if (a.dono_id !== dono.id) erro(403, 'Esse alojamento não é seu.')
  return a
}

function lerCampos (corpo, obrigatorios) {
  const concelho = texto(corpo.concelho, { campo: 'concelho', max: 60, obrigatorio: obrigatorios })
  if (concelho && !CONCELHOS.some(c => c.nome === concelho)) {
    erro(400, 'Escolha um concelho da lista.', 'concelho')
  }
  const c = CONCELHOS.find(x => x.nome === concelho)
  return {
    nome: texto(corpo.nome, { campo: 'nome', min: 2, max: 80, obrigatorio: obrigatorios }),
    tipologia: daLista(corpo.tipologia, TIPOLOGIAS, { campo: 'tipologia', obrigatorio: obrigatorios }),
    quartos: inteiro(corpo.quartos, { campo: 'quartos', min: 0, max: 20, obrigatorio: false, omissao: 1 }),
    camas: inteiro(corpo.camas, { campo: 'camas', min: 0, max: 40, obrigatorio: false, omissao: 1 }),
    casas_banho: inteiro(corpo.casas_banho, { campo: 'casas de banho', min: 0, max: 20, obrigatorio: false, omissao: 1 }),
    area_m2: inteiro(corpo.area_m2, { campo: 'area', min: 0, max: 2000, obrigatorio: false }),
    distrito: c ? c.distrito : texto(corpo.distrito, { campo: 'distrito', max: 40, obrigatorio: false }),
    concelho,
    freguesia: texto(corpo.freguesia, { campo: 'freguesia', max: 80, obrigatorio: false }),
    morada: texto(corpo.morada, { campo: 'morada', min: 5, max: 200, obrigatorio: obrigatorios }),
    codigo_postal: texto(corpo.codigo_postal, { campo: 'código postal', max: 12, obrigatorio: false }),
    acesso: texto(corpo.acesso, { campo: 'acesso', max: 500, obrigatorio: false }),
    instrucoes: texto(corpo.instrucoes, { campo: 'instrucoes', max: 2000, obrigatorio: false }),
    registo_al: texto(corpo.registo_al, { campo: 'registo AL', max: 40, obrigatorio: false }),
    tem_elevador: booleano(corpo.tem_elevador) ? 1 : 0,
    andar: texto(corpo.andar, { campo: 'andar', max: 20, obrigatorio: false }),
    lat: c ? c.lat : null,
    lon: c ? c.lon : null,
  }
}

// RASCUNHO que o dono recebe ao criar um alojamento, para nao comecar de uma
// folha em branco. Ele apaga, reescreve e acrescenta o que quiser, e o que
// ficar e a lista DELE para aquela casa.
//
// A distincao nao e cosmetica. O art. 12.-A/b) e c) do Codigo do Trabalho
// conta como indicio de contrato de trabalho a plataforma que "estabelece
// regras de conduta" ou "verifica a qualidade da actividade prestada" — e
// bastam alguns indicios para a presuncao operar, com responsabilidade
// solidaria que alcanca pessoalmente os gerentes. Uma lista de qualidade
// imposta pelo Tudo Pronto seria exactamente esse indicio.
//
// Logo: o Tudo Pronto nao tem padrao de limpeza nenhum, nao verifica trabalho
// nenhum e nao avalia ninguem. Sugere um rascunho, e quem define o que quer
// na sua casa e quem tem a casa. Isto tem de continuar verdadeiro na interface
// (onde a lista aparece como "a sua lista, pode mudar tudo") e nos termos.
export const RASCUNHO_SUGERIDO = [
  ['Cozinha', 'Loiça lavada e arrumada', 0],
  ['Cozinha', 'Frigorífico vazio e limpo por dentro', 1],
  ['Cozinha', 'Fogão, forno e micro-ondas sem gordura', 1],
  ['Cozinha', 'Lixo despejado e saco novo', 0],
  ['Cozinha', 'Bancadas e lava-loiça limpos', 0],
  ['Quartos', 'Lençóis e fronhas mudados', 1],
  ['Quartos', 'Camas feitas', 1],
  ['Quartos', 'Roupeiros vazios e limpos', 0],
  ['Quartos', 'Chão aspirado e lavado', 0],
  ['Casa de banho', 'Sanita, chuveiro e lavatório lavados', 1],
  ['Casa de banho', 'Toalhas mudadas', 1],
  ['Casa de banho', 'Espelho sem marcas', 0],
  ['Casa de banho', 'Papel higiénico e sabonete repostos', 0],
  ['Sala', 'Sofás e almofadas arrumados', 0],
  ['Sala', 'Superfícies sem pó', 0],
  ['Sala', 'Chão aspirado e lavado', 0],
  ['Geral', 'Janelas e vidros interiores sem marcas', 0],
  ['Geral', 'Ar renovado e casa a cheirar bem', 0],
  ['Geral', 'Luzes, torneiras e electrodomésticos a funcionar', 0],
  ['Geral', 'Fotografia final da casa pronta', 1],
]

export function rotasAlojamentos (api) {
  api.get('/v1/alojamentos', async ({ env, pedido }) => {
    const c = await exigirDono(env, pedido)
    const r = await env.BD.prepare(
      'SELECT * FROM alojamentos WHERE dono_id = ?1 AND arquivado = 0 ORDER BY criado_em'
    ).bind(c.id).all()
    return json({ alojamentos: (r.results || []).map(alojamentoCompleto) })
  })

  api.post('/v1/alojamentos', async ({ env, pedido, corpo }) => {
    const c = await exigirDono(env, pedido)
    const n = await env.BD.prepare(
      'SELECT COUNT(*) n FROM alojamentos WHERE dono_id = ?1 AND arquivado = 0'
    ).bind(c.id).first()
    if ((n?.n || 0) >= 50) erro(400, 'Chegou ao limite de 50 alojamentos. Fale connosco.')

    const d = lerCampos(corpo, true)
    const id = novoId()
    await env.BD.prepare(`
      INSERT INTO alojamentos (id, dono_id, nome, tipologia, quartos, camas, casas_banho, area_m2,
        distrito, concelho, freguesia, morada, codigo_postal, acesso, instrucoes, registo_al,
        tem_elevador, andar, lat, lon, criado_em)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21)`
    ).bind(id, c.id, d.nome, d.tipologia, d.quartos, d.camas, d.casas_banho, d.area_m2,
      d.distrito, d.concelho, d.freguesia, d.morada, d.codigo_postal, d.acesso, d.instrucoes,
      d.registo_al, d.tem_elevador, d.andar, d.lat, d.lon, AGORA()).run()

    // O rascunho, para o dono nao comecar de uma folha em branco. Em lote:
    // 20 INSERT separados sao 20 viagens ao D1.
    const stmt = env.BD.prepare(
      'INSERT INTO tarefas_modelo (id, alojamento_id, zona, descricao, exige_foto, ordem) VALUES (?1,?2,?3,?4,?5,?6)'
    )
    await env.BD.batch(RASCUNHO_SUGERIDO.map(([zona, desc, foto], i) =>
      stmt.bind(novoId(), id, zona, desc, foto, i)))

    const a = await env.BD.prepare('SELECT * FROM alojamentos WHERE id = ?1').bind(id).first()
    return json({ alojamento: alojamentoCompleto(a) }, 201)
  })

  api.get('/v1/alojamentos/:id', async ({ env, pedido, params }) => {
    const c = await exigirDono(env, pedido)
    const a = await meuAlojamento(env, c, params.id)
    return json({ alojamento: alojamentoCompleto(a) })
  })

  api.patch('/v1/alojamentos/:id', async ({ env, pedido, params, corpo }) => {
    const c = await exigirDono(env, pedido)
    await meuAlojamento(env, c, params.id)
    const d = lerCampos(corpo, false)
    const campos = []
    const vals = []
    for (const [k, v] of Object.entries(d)) {
      if (corpo[k] === undefined && !(k === 'lat' || k === 'lon' || k === 'distrito')) continue
      if ((k === 'lat' || k === 'lon' || k === 'distrito') && corpo.concelho === undefined) continue
      campos.push(`${k} = ?${campos.length + 1}`)
      vals.push(v)
    }
    if (!campos.length) erro(400, 'Não há nada para mudar.')
    vals.push(params.id)
    await env.BD.prepare(`UPDATE alojamentos SET ${campos.join(', ')} WHERE id = ?${vals.length}`).bind(...vals).run()
    const a = await env.BD.prepare('SELECT * FROM alojamentos WHERE id = ?1').bind(params.id).first()
    return json({ alojamento: alojamentoCompleto(a) })
  })

  // Arquivar, nao apagar: apagar levava atras o historico de servicos e de
  // avaliacoes de quem la trabalhou, que nao e do dono para deitar fora.
  api.del('/v1/alojamentos/:id', async ({ env, pedido, params }) => {
    const c = await exigirDono(env, pedido)
    await meuAlojamento(env, c, params.id)
    const abertos = await env.BD.prepare(
      "SELECT COUNT(*) n FROM servicos WHERE alojamento_id = ?1 AND estado IN ('aberto','atribuido','a_decorrer')"
    ).bind(params.id).first()
    if (abertos?.n) erro(400, `Este alojamento ainda tem ${abertos.n} limpeza(s) por fechar. Cancele-as primeiro.`)
    await env.BD.prepare('UPDATE alojamentos SET arquivado = 1 WHERE id = ?1').bind(params.id).run()
    return json({ ok: true })
  })

  // ── lista de tarefas do alojamento ──
  api.get('/v1/alojamentos/:id/tarefas', async ({ env, pedido, params }) => {
    const c = await exigirDono(env, pedido)
    await meuAlojamento(env, c, params.id)
    const r = await env.BD.prepare(
      'SELECT * FROM tarefas_modelo WHERE alojamento_id = ?1 ORDER BY ordem'
    ).bind(params.id).all()
    return json({ tarefas: r.results || [] })
  })

  // Substitui a lista inteira. Mais simples de raciocinar do que remendar
  // linha a linha, e a lista e curta.
  api.put('/v1/alojamentos/:id/tarefas', async ({ env, pedido, params, corpo }) => {
    const c = await exigirDono(env, pedido)
    await meuAlojamento(env, c, params.id)
    const lista = Array.isArray(corpo.tarefas) ? corpo.tarefas : erro(400, 'Falta a lista de tarefas.')
    if (lista.length > 120) erro(400, 'Sao demasiadas tarefas (máximo 120).')
    const limpas = lista.map((t, i) => ({
      id: novoId(),
      zona: texto(t.zona, { campo: 'zona', max: 40 }),
      descricao: texto(t.descricao, { campo: 'tarefa', min: 2, max: 160 }),
      exige_foto: booleano(t.exige_foto) ? 1 : 0,
      ordem: i,
    }))
    const ops = [env.BD.prepare('DELETE FROM tarefas_modelo WHERE alojamento_id = ?1').bind(params.id)]
    const stmt = env.BD.prepare(
      'INSERT INTO tarefas_modelo (id, alojamento_id, zona, descricao, exige_foto, ordem) VALUES (?1,?2,?3,?4,?5,?6)'
    )
    for (const t of limpas) ops.push(stmt.bind(t.id, params.id, t.zona, t.descricao, t.exige_foto, t.ordem))
    await env.BD.batch(ops)
    return json({ tarefas: limpas })
  })

  api.get('/v1/concelhos', async () => json({ concelhos: CONCELHOS }, 200, {
    'Cache-Control': 'public, max-age=86400',
  }))
}
