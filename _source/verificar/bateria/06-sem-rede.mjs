/* Sem rede.

   É o cenário normal, não o excepcional: uma casa de granito num rés-do-chão
   não tem rede, e é lá que a pessoa está quando precisa da morada e da lista
   de tarefas. O que se exige aqui é que ela consiga TRABALHAR — ler o que
   precisa e marcar o que fez — e que nada se perca. */

export const nome = 'Sem rede'
export const ecra = { largura: 390, altura: 844 }

/* Este é o único módulo que corre COM o service worker. Nos outros ele é
   desligado, senão serve versões guardadas a meio da bateria e o teste
   seguinte vê a aplicação anterior. Aqui é o que se está a testar: sem ele,
   recarregar sem rede não serve nada e o ecrã fica em branco. */
export const comServiceWorker = true

import { cenarioComServico, comoEla, criarConta, entrarComo } from './_ajuda.mjs'

export async function correr (palco, certo) {
  await palco.ir('/app/')
  const dona = await criarConta(palco, { nome: 'Ana Dona', papel: 'dono' })
  const prof = await criarConta(palco, { nome: 'Berta Profissional', papel: 'profissional' })
  const { servico } = await cenarioComServico(palco, dona)
  await comoEla(palco, prof.testemunho, 'POST', `/v1/servicos/${servico.id}/candidatar`, {})
  const c = await comoEla(palco, dona.testemunho, 'GET', `/v1/servicos/${servico.id}`)
  await comoEla(palco, dona.testemunho, 'POST',
    `/v1/candidaturas/${c.servico.candidaturas[0].id}/aceitar`, {})

  /* Abrir a ficha COM rede: é o momento em que tudo o que é preciso dentro da
     casa fica guardado no aparelho. */
  await entrarComo(palco, prof, `/app/#/servico/${servico.id}`)
  await palco.esperar('.morada', 8000)
  certo((await palco.textoTodo()).includes('Rua das Gaivotas'),
    'com rede, a morada está no ecrã')

  const guardou = await palco.js(`
    const d = await new Promise((res) => {
      const p = indexedDB.open('tudopronto')
      p.onsuccess = () => res(p.result); p.onerror = () => res(null)
    })
    if (!d) return null
    return new Promise((res) => {
      const t = d.transaction('cache', 'readonly')
      const p = t.objectStore('cache').getAllKeys()
      p.onsuccess = () => res(p.result.map(String))
      p.onerror = () => res(null)
    })`)
  certo(Array.isArray(guardou) && guardou.some(k => k.includes('servico:')),
    'e a ficha fica guardada no aparelho', JSON.stringify(guardou))
  certo(Array.isArray(guardou) && guardou.every(k => k.includes('|')),
    'com a conta na chave — para outra conta no mesmo telemóvel não a ler',
    JSON.stringify(guardou))

  /* ═══ 1. cortar a rede ═══
     Primeiro espera-se que o service worker esteja INSTALADO e no comando.
     Cortar a rede antes disso testa apenas o dinossauro do navegador. */
  const swPronto = await palco.js(`
    if (!('serviceWorker' in navigator)) return 'sem suporte'
    const reg = await navigator.serviceWorker.ready
    for (let i = 0; i < 60; i++) {
      if (navigator.serviceWorker.controller) return 'no comando'
      await new Promise(r => setTimeout(r, 250))
    }
    return 'instalado mas sem controlar'`)
  certo(swPronto === 'no comando',
    'o service worker instala-se e assume o comando', String(swPronto))

  await palco.semRede(true)
  await palco.recarregar()
  await palco.esperar('#principal', 12000)
  await palco.js('return new Promise(r => setTimeout(r, 900))')

  /* Esperar pelo aviso em vez de afirmar sobre um instante — mas com tecto
     curto, porque o que se exige é que apareça DEPRESSA. */
  let apareceu = false
  for (let i = 0; i < 20; i++) {
    if (await palco.visivel('#rede')) { apareceu = true; break }
    await palco.js('return new Promise(r => setTimeout(r, 150))')
  }
  certo(apareceu, 'sem rede, aparece um aviso permanente, e aparece depressa',
    'navigator.onLine = ' + await palco.js('return navigator.onLine')
    + ', #rede hidden = ' + await palco.js(`return document.querySelector('#rede')?.hidden`))
  const aviso = await palco.textoQuando('#rede')
  certo(/guardado no telemóvel/i.test(aviso) && !/sincroniz/i.test(aviso),
    'e o aviso diz o que acontece, em linguagem de gente',
    aviso)

  await palco.ir(`/app/#/servico/${servico.id}`)
  await palco.esperar('#principal', 10000)
  await palco.js('return new Promise(r => setTimeout(r, 900))')
  const semRede = await palco.textoTodo()
  certo(semRede.includes('Rua das Gaivotas'),
    'SEM REDE, a morada continua a aparecer — foi guardada quando havia',
    semRede.slice(0, 250))
  certo(semRede.includes('4471'), 'e o código da caixa de chaves também')
  certo((await palco.contar('.tarefa')) > 0,
    'e a lista de tarefas também', `${await palco.contar('.tarefa')} tarefas`)

  /* ═══ 2. trabalhar sem rede ═══ */
  const alvo = await palco.js(`
    const t = [...document.querySelectorAll('.tarefa')]
      .find(b => !b.querySelector('.tarefa__pede') && b.getAttribute('aria-pressed') === 'false')
    if (!t) return null
    t.id = 'alvo-offline'
    return true`)
  certo(!!alvo, 'há uma tarefa por fazer para experimentar')
  await palco.clicar('#alvo-offline')
  certo((await palco.atributo('#alvo-offline', 'aria-pressed')) === 'true',
    'SEM REDE, marcar uma tarefa funciona logo — não fica à espera da rede')

  await palco.js('return new Promise(r => setTimeout(r, 600))')
  const naFila = await palco.js(`
    const d = await new Promise((res) => {
      const p = indexedDB.open('tudopronto')
      p.onsuccess = () => res(p.result); p.onerror = () => res(null)
    })
    if (!d) return -1
    return new Promise((res) => {
      const t = d.transaction('fila', 'readonly')
      const p = t.objectStore('fila').getAll()
      p.onsuccess = () => res(p.result.length); p.onerror = () => res(-1)
    })`)
  certo(naFila >= 1, 'e o que foi feito fica numa fila no aparelho', `${naFila} na fila`)
  certo(/guardada|guardadas|coisa/i.test(await palco.textoQuando('#rede')),
    'o aviso passa a dizer quantas coisas estão à espera',
    await palco.textoQuando('#rede'))

  /* ═══ 3. a rede volta e a fila escoa ═══ */
  await palco.semRede(false)
  await palco.js(`window.dispatchEvent(new Event('online')); return true`)
  /* A fila escoa sozinha. Espera-se por ela em vez de afirmar sobre um
     instante — um teste que meça uma vez apanha-a a meio e acusa de avariado
     o que está a funcionar. */
  let restam = -1
  for (let i = 0; i < 40; i++) {
    await palco.js('return new Promise(r => setTimeout(r, 250))')
    restam = await palco.js(`
      const d = await new Promise((res) => {
        const p = indexedDB.open('tudopronto')
        p.onsuccess = () => res(p.result); p.onerror = () => res(null)
      })
      if (!d) return -1
      return new Promise((res) => {
        const t = d.transaction('fila', 'readonly')
        const p = t.objectStore('fila').getAll()
        p.onsuccess = () => res(p.result.length); p.onerror = () => res(-1)
      })`)
    if (restam === 0) break
  }
  certo(restam === 0, 'quando a rede volta, a fila escoa sozinha', `${restam} ficaram`)
  certo(!(await palco.visivel('#rede')), 'e o aviso desaparece')

  /* E o servidor tem mesmo a tarefa marcada — não é só o ecrã a dizer que sim. */
  const noServidor = await comoEla(palco, prof.testemunho, 'GET', `/v1/servicos/${servico.id}`)
  certo(noServidor.servico.tarefas.some(t => t.feita_em),
    'e a tarefa está mesmo marcada no servidor',
    `${noServidor.servico.tarefas.filter(t => t.feita_em).length} feitas`)

  /* ═══ 4. o que exige rede diz-se antes, não depois ═══ */
  await palco.semRede(true)
  await palco.ir('/app/#/mercado')
  await palco.esperar('#principal', 10000)
  await palco.js('return new Promise(r => setTimeout(r, 1200))')
  const mercadoSemRede = await palco.textoTodo()
  certo(/sem ligação|Sem rede|Não foi possível/i.test(mercadoSemRede),
    'o mercado sem rede explica-se em vez de ficar em branco',
    mercadoSemRede.slice(0, 200))
  certo(await palco.ver('button.b'),
    'e oferece uma forma de tentar outra vez')
  await palco.semRede(false)
}
