/* O percurso completo, conduzido pela interface, dos dois lados:
   criar alojamento → marcar limpeza → ser escolhida → chegar → marcar tarefas
   com fotografia → tudo pronto → avaliar → a revelação simultânea.

   É o teste que prova que o produto funciona. Nenhum passo é feito por API:
   tudo o que uma pessoa faria com o dedo é feito com o rato. */

export const nome = 'Percurso completo de uma limpeza'
export const ecra = { largura: 390, altura: 844 }

import { AMANHA, comoEla, criarConta, entrarComo } from './_ajuda.mjs'

export async function correr (palco, certo) {
  await palco.ir('/app/')
  const dona = await criarConta(palco, { nome: 'Ana Dona', papel: 'dono' })
  const prof = await criarConta(palco, { nome: 'Berta Profissional', papel: 'profissional' })

  /* ═══ 1. a dona cria o alojamento, pela interface ═══ */
  await entrarComo(palco, dona, '/app/#/alojamento/novo')
  await palco.esperar('#c-nome')
  await palco.preencher('#c-nome', 'T2 do Centro')
  await palco.preencher('#c-tipologia', 'T2')
  await palco.preencher('#c-concelho', 'Ovar')
  await palco.preencher('#c-freguesia', 'Esmoriz')
  await palco.preencher('#c-morada', 'Rua da Igreja, 22, 1.º Esq')
  await palco.preencher('#c-acesso', 'Código do portão: 1984')
  await palco.clicar('button[type=submit]')
  await palco.esperarTexto('Marcar uma limpeza', 10000)
  const criados = await comoEla(palco, dona.testemunho, 'GET', '/v1/alojamentos')
  certo(criados.alojamentos.length === 1 && criados.alojamentos[0].morada.includes('Rua da Igreja'),
    'a dona cria um alojamento pela interface, com a morada certa',
    criados.alojamentos[0]?.morada)

  /* A lista de tarefas nasce preenchida — e é apresentada como DELA. */
  const alojamentos = await comoEla(palco, dona.testemunho, 'GET', '/v1/alojamentos')
  const alojId = alojamentos.alojamentos[0].id
  await palco.ir(`/app/#/alojamento/${alojId}`)
  await palco.esperarTexto('A sua lista de tarefas')
  const fichaAloj = await palco.textoTodo()
  certo(/\d+ tarefas/.test(fichaAloj), 'o alojamento nasce com uma lista de tarefas', fichaAloj.slice(0, 200))
  certo(fichaAloj.includes('Esta lista é sua'),
    'a lista é apresentada como do dono, não como padrão nosso')
  certo(fichaAloj.includes('1984'), 'o dono vê o seu próprio código de acesso')

  /* ═══ 2. a dona marca a limpeza ═══ */
  await palco.ir(`/app/#/servico/novo?alojamento=${alojId}`)
  await palco.esperar('#c-data')
  await palco.preencher('#c-data', AMANHA)
  await palco.preencher('#c-hora_inicio', '11:00')
  await palco.preencher('#c-hora_limite', '15:00')
  await palco.preencher('#c-valor', '54')

  /* Não há equipa, logo a única opção é o mercado. */
  const opcoesVis = await palco.textos('.seg button')
  certo(opcoesVis.length === 1 && opcoesVis[0].includes('perto'),
    'sem equipa, a única visibilidade oferecida é o mercado', opcoesVis.join(' | '))

  certo(await palco.visivel('#accao .b'), 'o botão de marcar está ancorado no fundo')
  await palco.clicar('#accao .b')
  await palco.esperar('.ficha__cabeca', 12000)
  certo((await palco.textoTodo()).includes('Por atribuir'),
    'a limpeza nasce por atribuir')

  const servicos = await comoEla(palco, dona.testemunho, 'GET', '/v1/servicos')
  const servId = servicos.servicos[0].id

  /* O painel da dona mostra-a à espera. */
  await palco.ir('/app/#/')
  await palco.esperarTexto('Olá, Ana')
  certo((await palco.textoTodo()).includes('À espera de resposta'),
    'o painel da dona mostra as limpezas à espera de resposta')

  /* ═══ 3. a profissional oferece-se e é escolhida ═══ */
  await entrarComo(palco, prof, '/app/#/mercado')
  await palco.esperarTexto('Perto de si')
  certo((await palco.contar('.serv')) >= 1, 'a limpeza aparece no mercado')
  /* Aponta-se ao serviço CERTO e não ao primeiro cartão do mercado: o mercado
     mostra tudo o que está aberto na zona, e carregar no primeiro faz o teste
     provar coisas sobre um serviço que não é o dele. */
  certo(await palco.ver(`a[href="#/servico/${servId}"]`),
    'e é a limpeza que a dona acabou de marcar')
  await palco.clicar(`a[href="#/servico/${servId}"]`)
  await palco.esperar('#accao .b', 8000)
  await palco.clicar('#accao .b')
  await palco.esperar('.painel')
  await palco.clicar('[data-acto="candidatar"]')
  await palco.sumir('.painel', 8000)
  /* `certo(true, ...)` não prova nada: o painel fechar não significa que a
     candidatura chegou. Vai-se buscá-la. */
  const cands = await comoEla(palco, dona.testemunho, 'GET', `/v1/servicos/${servId}`)
  certo((cands.servico.candidaturas || []).length === 1,
    'a profissional oferece-se, e a candidatura chega',
    `${(cands.servico.candidaturas || []).length} candidaturas`)

  await entrarComo(palco, dona, `/app/#/servico/${servId}`)
  await palco.esperarTexto('Quem se ofereceu')
  await palco.clicar('[data-acto="escolher"]')
  await palco.esperarTexto('Combinado', 10000)
  const atribuido = await comoEla(palco, dona.testemunho, 'GET', `/v1/servicos/${servId}`)
  certo(atribuido.servico.estado === 'atribuido' && atribuido.servico.profissional_id === prof.conta.id,
    'a dona escolhe, e a limpeza fica atribuída a quem ela escolheu',
    `estado ${atribuido.servico.estado}`)

  /* ═══ 4. o trabalho ═══ */
  await entrarComo(palco, prof, `/app/#/servico/${servId}`)
  await palco.esperar('.morada', 8000)
  const botao1 = await palco.texto('#accao .b')
  certo(botao1.includes('Cheguei'), 'o botão passa a «Cheguei — começar»', botao1)

  await palco.clicar('#accao .b')
  await palco.esperarTexto('A decorrer', 10000)
  const botao2 = await palco.texto('#accao .b')
  certo(botao2.includes('Tudo pronto'), 'o botão passa a «Tudo pronto»', botao2)

  /* A lista de tarefas aparece e conta o progresso. */
  await palco.esperar('#tarefas')
  const nTarefas = await palco.contar('.tarefa')
  certo(nTarefas >= 15, 'a lista de tarefas está no ecrã', `${nTarefas} tarefas`)
  const progInicial = await palco.texto('#prog-n')
  certo(/^0\//.test(progInicial), 'o progresso começa a zero', progInicial)

  /* Uma tarefa sem fotografia marca-se com um toque. */
  const semFoto = await palco.js(`
    const t = [...document.querySelectorAll('.tarefa')]
      .find(b => !b.querySelector('.tarefa__pede'))
    if (!t) return null
    t.id = 'alvo-sem-foto'
    return t.textContent.trim().slice(0, 40)`)
  certo(!!semFoto, 'há tarefas que não pedem fotografia', String(semFoto))
  await palco.clicar('#alvo-sem-foto')
  certo((await palco.atributo('#alvo-sem-foto', 'aria-pressed')) === 'true',
    'um toque marca a tarefa como feita')
  const progDepois = await palco.texto('#prog-n')
  certo(/^1\//.test(progDepois), 'o progresso avança', progDepois)

  /* Tocar outra vez desmarca — o gesto é reversível. */
  await palco.clicar('#alvo-sem-foto')
  certo((await palco.atributo('#alvo-sem-foto', 'aria-pressed')) === 'false',
    'tocar outra vez desmarca')
  await palco.clicar('#alvo-sem-foto')

  /* Concluir com fotografias em falta é recusado, e diz-se quantas faltam. */
  await palco.clicar('#accao .b')
  await palco.esperar('#brinde', 6000)
  const recusa = await palco.texto('#brinde')
  certo(/Falta/i.test(recusa) && /fotografia/i.test(recusa),
    'concluir sem as fotografias é recusado, e diz quantas faltam', recusa)
  certo((await palco.texto('.ficha__estado')).includes('A decorrer'),
    'e a limpeza continua a decorrer')

  /* As fotografias: pela API, porque não há forma de o Chrome abrir a câmara.
     O que se prova aqui é o que a interface faz com elas. */
  const tarefas = (await comoEla(palco, prof.testemunho, 'GET', `/v1/servicos/${servId}`))
    .servico.tarefas.filter(t => t.exige_foto)
  for (const t of tarefas) {
    const foto = await palco.js(`
      const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0))
      const r = await fetch('http://127.0.0.1:8787/v1/fotos?fim=tarefa&servico=${servId}', {
        method: 'POST',
        headers: { 'Content-Type': 'image/png', Authorization: 'Bearer ${prof.testemunho}' },
        body: png,
      })
      const d = await r.json()
      if (!r.ok) throw new Error('foto: ' + (d.erro || r.status))
      return d.id`)
    await comoEla(palco, prof.testemunho, 'POST', `/v1/servicos/${servId}/tarefas/${t.id}`,
      { feita: true, foto_id: foto })
  }

  /* Recarregar, e não navegar: já estamos neste hash, e navegar para o mesmo
     hash não dispara pintura nenhuma — a ficha ficaria a mostrar o estado de
     antes das fotografias. */
  await palco.recarregar()
  await palco.esperar('#tarefas', 10000)
  certo((await palco.contar('.tarefa__foto')) >= tarefas.length,
    'as fotografias aparecem ao lado das tarefas',
    `${await palco.contar('.tarefa__foto')} miniaturas`)

  await palco.clicar('#accao .b')
  await palco.esperarTexto('Concluído', 12000)
  const fim = await comoEla(palco, prof.testemunho, 'GET', `/v1/servicos/${servId}`)
  certo(fim.servico.estado === 'concluido' && !!fim.servico.concluido_em,
    'com as fotografias feitas, «Tudo pronto» conclui a limpeza',
    `estado ${fim.servico.estado}`)

  /* ═══ 5. avaliação em duplo-cego, pela interface ═══ */
  await palco.ir(`/app/#/avaliar/${servId}`)
  await palco.esperar('.estrelar')
  certo((await palco.contar('.estrelar button')) === 5, 'há cinco estrelas')
  certo((await palco.texto('.estrelar__d')).includes('Toque nas estrelas'),
    'e uma instrução antes de tocar')
  certo(await palco.js(`return document.querySelector('[data-acto="avaliar"]').disabled`),
    'o botão de enviar está desligado antes de escolher estrelas')

  await palco.clicar('.estrelar button:nth-child(5)')
  const desc = await palco.texto('.estrelar__d')
  certo(desc.includes('Tudo como combinado'), 'cada nível de estrelas tem uma frase', desc)
  certo(!(await palco.js(`return document.querySelector('[data-acto="avaliar"]').disabled`)),
    'e o botão liga-se')

  certo((await palco.contar('.etiqueta')) >= 6, 'há etiquetas de uma lista fechada')
  await palco.clicar('.etiqueta')
  certo((await palco.atributo('.etiqueta', 'aria-pressed')) === 'true', 'as etiquetas alternam')

  await palco.preencher('#c-comentario', 'Ficou tudo impecável.')
  await palco.clicar('[data-acto="avaliar"]')
  await palco.esperarTexto('escondida', 10000)
  const av1 = await comoEla(palco, prof.testemunho, 'GET', `/v1/servicos/${servId}/avaliacoes`)
  certo(av1.avaliacoes.length === 1 && av1.avaliacoes[0].por_revelar === true,
    'a primeira avaliação fica por revelar', JSON.stringify(av1.avaliacoes[0] || {}).slice(0, 120))

  /* A dona foi avaliada mas não vê nada até avaliar também. */
  await entrarComo(palco, dona, `/app/#/servico/${servId}`)
  await palco.esperarTexto('Avaliações', 8000)
  const vistaDona = await palco.textoTodo()
  certo(!vistaDona.includes('impecável'),
    'quem ainda não avaliou NÃO vê o que a outra parte escreveu', vistaDona.slice(0, 300))
  certo(vistaDona.includes('já o avaliou') || vistaDona.includes('já pode avaliar'),
    'mas sabe que já foi avaliada')

  await palco.ir(`/app/#/avaliar/${servId}`)
  await palco.esperar('.estrelar')
  await palco.clicar('.estrelar button:nth-child(4)')
  await palco.clicar('[data-acto="avaliar"]')
  await palco.esperarTexto('ver as duas', 10000)
  const av2 = await comoEla(palco, dona.testemunho, 'GET', `/v1/servicos/${servId}/avaliacoes`)
  certo(av2.avaliacoes.length === 2 && av2.avaliacoes.every(a => !!a.revelada_em),
    'quando a segunda avalia, as DUAS são reveladas ao mesmo tempo',
    av2.avaliacoes.map(a => a.revelada_em || 'por revelar').join(' | '))

  await palco.ir(`/app/#/servico/${servId}`)
  await palco.esperarTexto('Avaliações', 8000)
  certo((await palco.textoTodo()).includes('impecável'),
    'e agora a dona vê o que a profissional escreveu')

  /* ═══ 6. a reputação aparece no perfil, com DUAS medidas ═══ */
  await palco.ir(`/app/#/perfil/${prof.conta.id}`)
  await palco.esperar('.medidas')
  const medidas = await palco.textos('.medida')
  certo(medidas.length === 2, 'o perfil tem duas medidas separadas', medidas.join(' | '))
  certo(medidas[0].includes('4') || medidas[0].includes('5'),
    'a primeira é a média das estrelas', medidas[0])
  certo(medidas[1].includes('100%'),
    'a segunda é a fiabilidade, separada da qualidade', medidas[1])
}
