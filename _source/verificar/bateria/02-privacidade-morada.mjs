/* A regra mais importante do produto, conduzida a sério:
   a morada, o andar, o código da caixa de chaves e o telefone NÃO existem
   para quem não foi escolhido — e passam a existir no instante em que é.

   Um anúncio público com morada e código de acesso é um convite a assaltos.
   Por isso isto não se verifica só na API: verifica-se no que chega ao ecrã. */

export const nome = 'A morada só aparece a quem é escolhido'
export const ecra = { largura: 390, altura: 844 }

import { cenarioComServico, comoEla, criarConta, entrarComo } from './_ajuda.mjs'

const MORADA = 'Rua das Gaivotas'
const CODIGO = '4471'

export async function correr (palco, certo) {
  await palco.ir('/app/')
  const dona = await criarConta(palco, { nome: 'Ana Dona', papel: 'dono' })
  const prof = await criarConta(palco, { nome: 'Berta Profissional', papel: 'profissional' })
  const { servico } = await cenarioComServico(palco, dona)

  /* --- 1. no mercado ---------------------------------------------------- */
  await entrarComo(palco, prof, '/app/#/mercado')
  await palco.esperarTexto('Perto de si')
  const noMercado = await palco.textoTodo()
  certo(noMercado.includes('Esmoriz') || noMercado.includes('Ovar'),
    'o mercado mostra a zona')
  certo(!noMercado.includes(MORADA),
    'o mercado NÃO mostra a morada', noMercado.slice(0, 300))
  certo(!noMercado.includes(CODIGO),
    'o mercado NÃO mostra o código da caixa de chaves')
  /* Mede-se o DISTINTIVO do cartão, e não a página toda: o cabeçalho diz
     «até 15 km de Ovar» (o raio), e um teste que procure dígitos seguidos de
     «km» em qualquer parte da página passa por acidente mesmo que o cartão
     não mostre distância nenhuma. */
  const distintivos = await palco.textos('.serv .dist')
  certo(distintivos.some(d => /\d+\s*km/.test(d) || /no seu concelho/.test(d)),
    'o cartão do mercado mostra a distância aproximada (ou «no seu concelho»)',
    distintivos.join(' | '))
  certo(noMercado.includes('54'), 'o mercado mostra o valor oferecido')

  /* --- 2. a ficha, antes de ser escolhida ------------------------------- */
  await palco.ir(`/app/#/servico/${servico.id}`)
  await palco.esperar('.ficha__cabeca')
  const antes = await palco.textoTodo()
  certo(!antes.includes(MORADA),
    'na ficha, ANTES de ser escolhida, a morada continua escondida', antes.slice(0, 400))
  certo(!antes.includes(CODIGO),
    'na ficha, ANTES de ser escolhida, o código de acesso continua escondido')
  certo(!(await palco.ver('.morada')),
    'o bloco da morada nem existe no documento')
  certo(antes.includes('A morada aparece se for escolhida'),
    'a aplicação explica porque não mostra a morada')

  /* Nem no HTML, nem no JavaScript, nem em nenhuma resposta guardada. Um
     campo escondido por CSS continuaria a estar no código-fonte da página. */
  const noCodigo = await palco.js(`
    const h = document.documentElement.outerHTML
    return { html: h.includes(${JSON.stringify(MORADA)}) || h.includes(${JSON.stringify(CODIGO)}) }`)
  certo(!noCodigo.html,
    'a morada não está escondida no código da página — não está lá de facto')

  /* --- 3. oferecer-se, pela interface ---------------------------------- */
  certo(await palco.visivel('#accao .b'), 'há um botão de acção ancorado')
  const rotulo = await palco.texto('#accao .b')
  certo(rotulo.includes('Oferecer'), 'o botão diz «Oferecer-me»', rotulo)

  await palco.clicar('#accao .b')
  await palco.esperar('.painel')
  certo(await palco.visivel('.painel'), 'abre o painel de candidatura')
  const painel = await palco.textoTodo()
  certo(painel.includes('Aceito 54'), 'o painel deixa aceitar o valor proposto', painel.slice(0, 300))
  certo(painel.includes('Quero outro valor'), 'o painel deixa contrapropor')

  await palco.clicar('[data-acto="candidatar"]')
  await palco.sumir('.painel', 8000)
  await palco.esperarTexto('Enviado', 6000)
  certo(true, 'a candidatura é enviada pela interface')

  /* Continua sem morada: candidatar-se não é ser escolhida. */
  await palco.ir(`/app/#/servico/${servico.id}`)
  await palco.esperar('.ficha__cabeca')
  const depoisCand = await palco.textoTodo()
  certo(!depoisCand.includes(MORADA),
    'candidatar-se NÃO revela a morada — só ser escolhida revela')

  /* --- 4. a dona escolhe, pela interface ------------------------------- */
  await entrarComo(palco, dona, `/app/#/servico/${servico.id}`)
  await palco.esperarTexto('Quem se ofereceu')
  const vistaDona = await palco.textoTodo()
  certo(vistaDona.includes('Berta'), 'a dona vê quem se ofereceu')
  certo(vistaDona.includes('Ainda sem avaliações') || vistaDona.includes('serviço'),
    'a dona vê o histórico de quem se ofereceu')

  await palco.clicar('[data-acto="escolher"]')
  await palco.esperarTexto('Combinado', 8000)
  certo(true, 'a dona escolhe a pessoa pela interface')

  /* --- 5. depois de escolhida ------------------------------------------ */
  await entrarComo(palco, prof, `/app/#/servico/${servico.id}`)
  await palco.esperar('.morada', 8000)
  const depois = await palco.textoTodo()
  certo(depois.includes(MORADA),
    'DEPOIS de escolhida, a morada aparece', depois.slice(0, 300))
  certo(depois.includes(CODIGO),
    'DEPOIS de escolhida, o código da caixa de chaves aparece')
  certo(depois.includes('máquina de lavar'),
    'DEPOIS de escolhida, as notas da casa aparecem')
  certo(await palco.visivel('.morada'), 'o bloco da morada está à vista')

  /* A ligação para o mapa é para FORA e só parte quando a pessoa carrega —
     nunca ao abrir o ecrã. Um mapa carregado sozinho seria um terceiro a
     receber a morada de uma casa sem ninguém ter pedido. */
  const mapa = await palco.atributo('.morada a[target="_blank"]', 'href')
  certo(mapa && mapa.startsWith('https://www.openstreetmap.org'),
    'a ligação ao mapa é externa e explícita', String(mapa).slice(0, 60))
  certo((await palco.atributo('.morada a[target="_blank"]', 'rel') || '').includes('noopener'),
    'a ligação externa leva rel="noopener"')
  const terceiros = await palco.js(`
    return [...new Set(performance.getEntriesByType('resource')
      .filter(e => /^https?:$/.test(new URL(e.name).protocol))
      .map(e => new URL(e.name).host)
      .filter(h => h && h !== location.host && !h.startsWith('127.0.0.1')))]`)
  certo(!terceiros.length,
    'abrir a ficha com a morada não contacta terceiro nenhum', terceiros.join(', '))

  /* --- 6. uma terceira pessoa não entra ------------------------------- */
  const intrusa = await criarConta(palco, { nome: 'Carla Intrusa', papel: 'profissional' })
  await entrarComo(palco, intrusa, `/app/#/servico/${servico.id}`)
  await palco.esperar('#principal')
  const vistaIntrusa = await palco.textoTodo()
  certo(!vistaIntrusa.includes(MORADA),
    'quem não está no serviço não vê a morada', vistaIntrusa.slice(0, 250))
  certo(vistaIntrusa.includes('Não tem acesso') || vistaIntrusa.includes('não é sua')
    || vistaIntrusa.includes('Não foi possível'),
    'e é dito que não tem acesso, em vez de um ecrã em branco', vistaIntrusa.slice(0, 250))
}
