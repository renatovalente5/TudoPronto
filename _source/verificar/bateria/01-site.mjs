/* O site de apresentação: as páginas existem, as ligações não estão mortas,
   nada transborda, e o navegador não contacta ninguém que a política de
   privacidade não nomeie. */

export const nome = 'Site de apresentação'
export const ecra = { largura: 1280, altura: 900 }

const PAGINAS = [
  ['/', 'A casa pronta'],
  ['/como-funciona.html', 'Do check-out'],
  ['/para-quem-tem-alojamento.html', 'combinar limpezas por mensagem'],
  ['/para-quem-limpa.html', 'Trabalho de limpeza perto de si'],
  ['/apoio.html', 'Precisa de ajuda'],
  ['/termos.html', 'Termos de utilização'],
  ['/privacidade.html', 'Privacidade'],
  ['/404.html', 'Esta página não existe'],
]

export async function correr (palco, certo) {
  for (const [caminho, pedaco] of PAGINAS) {
    await palco.ir(caminho)
    const t = await palco.textoTodo()
    certo(t.includes(pedaco), `${caminho} abre e diz «${pedaco}»`,
      `título: ${await palco.texto('h1')}`)
    certo(await palco.ver('header.cabeca') || caminho === '/404.html',
      `${caminho} tem cabeçalho`)
    certo(await palco.ver('footer.pe'), `${caminho} tem rodapé`)
    const transborda = await palco.js(
      'return document.documentElement.scrollWidth > innerWidth + 1 ? document.documentElement.scrollWidth : 0')
    certo(!transborda, `${caminho} não transborda na horizontal`, `scrollWidth ${transborda}`)
  }

  /* --- as ligações internas todas apontam para ficheiros que existem ----
     Contar ficheiros não prova nada: o que parte um site é um href para uma
     página que não foi gerada. */
  await palco.ir('/')
  const alvos = new Set()
  for (const [caminho] of PAGINAS) {
    await palco.ir(caminho)
    const hrefs = await palco.js(`return [...document.querySelectorAll('a[href]')]
      .map(a => a.getAttribute('href'))
      .filter(h => h && !h.startsWith('http') && !h.startsWith('mailto:')
                 && !h.startsWith('tel:') && !h.startsWith('#'))`)
    for (const h of hrefs) alvos.add(h)
  }
  const mortas = []
  for (const h of alvos) {
    const url = palco.servidor + (h.startsWith('/') ? h : '/TudoPronto/' + h)
    const r = await fetch(url, { method: 'HEAD' }).catch(() => ({ ok: false, status: 0 }))
    if (!r.ok) mortas.push(`${h} → ${r.status}`)
  }
  certo(!mortas.length, `as ${alvos.size} ligações internas apontam para páginas que existem`,
    mortas.join(', '))

  /* --- terceiros ------------------------------------------------------
     A página de privacidade nomeia os domínios contactados. Fica falsa no dia
     em que alguém acrescenta um, e ninguém dá por isso porque o novo
     funciona. Por isso a lista tem de vir COMPLETA e ser exigida vazia. */
  await palco.ir('/')
  const forasteiros = await palco.js(`
    return [...new Set(performance.getEntriesByType('resource')
      .filter(e => /^https?:$/.test(new URL(e.name).protocol))
      .map(e => new URL(e.name).host)
      .filter(h => h && h !== location.host))]`)
  certo(!forasteiros.length,
    'o site de apresentação não contacta terceiro nenhum', forasteiros.join(', '))

  /* --- SEO mínimo ------------------------------------------------------ */
  for (const [caminho] of PAGINAS.slice(0, 5)) {
    await palco.ir(caminho)
    const d = await palco.atributo('meta[name="description"]', 'content')
    certo(d && d.length > 60 && d.length < 240,
      `${caminho} tem descrição com tamanho útil`, `${d?.length} caracteres`)
    certo(await palco.ver('link[rel="canonical"]'), `${caminho} tem canónico`)
    certo((await palco.contar('h1')) === 1, `${caminho} tem exactamente um h1`)
  }

  /* --- o vocabulário legal ---------------------------------------------
     Palavras que não podem aparecer em lado nenhum do site: descrevem uma
     relação de trabalho que não existe, e o vocabulário de um site conta
     como prova num processo de reconhecimento de contrato de trabalho. */
  const PROIBIDAS = [
    'as nossas empregadas', 'nossas empregadas', 'contratamos',
    'as nossas equipas', 'nossos funcionários', 'nossas funcionárias',
    'nossos empregados', 'trabalha para nós', 'os nossos turnos',
  ]
  const encontradas = []
  for (const [caminho] of PAGINAS) {
    await palco.ir(caminho)
    const t = (await palco.textoTodo()).toLowerCase()
    for (const palavra of PROIBIDAS) if (t.includes(palavra)) encontradas.push(`${caminho}: «${palavra}»`)
  }
  certo(!encontradas.length,
    'o site nunca descreve quem limpa como empregado nosso', encontradas.join('; '))

  /* Nada pode PROMETER trabalho, emprego ou rendimento.
     Duas razões independentes. O DL 260/2009 regula a actividade das agências
     privadas de colocação, e prometer colocação sem o ser é entrar nesse
     regime. E o artigo 185.º da Lei 23/2007 pune a angariação de mão-de-obra
     — num sector com muita mão-de-obra imigrante, prometer trabalho e cobrar
     por ele é exactamente a previsão legal. Não cobramos nada a quem faz
     limpezas, e também não prometemos nada. */
  const PROMESSAS = [
    'garantimos trabalho', 'trabalho garantido', 'ganhe até', 'ganha até',
    'rendimento garantido', 'oferta de emprego', 'ofertas de emprego',
    'arranjamos-lhe trabalho', 'encontramos-lhe trabalho', 'salário',
  ]
  const prometidas = []
  for (const [caminho] of PAGINAS) {
    await palco.ir(caminho)
    /* Lê-se o texto SEM o que está marcado como lista de proibições: uma
       lista de proibições tem de nomear o que proíbe, e uma heurística de
       "há um «não» aqui perto" acusava os próprios termos de prometerem o
       que vedam — o cabeçalho da lista fica 380 caracteres atrás. Marcar no
       HTML é exacto; contar caracteres é adivinhar. */
    const t = await palco.js(`
      const c = document.body.cloneNode(true)
      for (const n of c.querySelectorAll('[data-proibicoes]')) n.remove()
      return c.innerText.replace(/\\s+/g, ' ').toLowerCase()`)
    for (const frase of PROMESSAS) {
      if (!t.includes(frase)) continue
      const i = t.indexOf(frase)
      const antes = t.slice(Math.max(0, i - 90), i)
      if (/não|nao|nunca|sem /.test(antes)) continue
      prometidas.push(`${caminho}: «${frase}»`)
    }
  }
  certo(!prometidas.length,
    'o site nunca promete trabalho, emprego nem rendimento', prometidas.join('; '))

  /* E não pode haver nada a cobrar a quem faz limpezas. */
  await palco.ir('/para-quem-limpa.html')
  const paraElas = await palco.textoTodo()
  certo(/não paga|Nada a pagar|sem qualquer comissão|não há percentagem/i.test(paraElas),
    'e diz claramente que quem faz limpezas não paga nada',
    paraElas.slice(0, 200))

  /* --- identificação do prestador (DL 7/2004 art. 10.º) --------------- */
  await palco.ir('/termos.html')
  const termos = await palco.textoTodo()
  certo(termos.includes('Quem presta este serviço'), 'os termos identificam o prestador')
  certo(termos.includes('CNIACC'), 'os termos indicam a entidade de resolução de litígios')
  certo(!termos.includes('ec.europa.eu/consumers/odr') && !termos.toLowerCase().includes('plataforma odr europeia para'),
    'os termos NÃO apontam para a plataforma ODR, desactivada em julho de 2025')
  certo(termos.includes('Independência de quem faz limpezas'),
    'os termos têm a secção de independência')

  await palco.ir('/privacidade.html')
  const priv = await palco.textoTodo()
  for (const nomeTerceiro of ['GitHub Pages', 'Cloudflare', 'Mailjet']) {
    certo(priv.includes(nomeTerceiro), `a privacidade nomeia ${nomeTerceiro}`)
  }
  certo(priv.includes('não há pedido de consentimento') || priv.includes('não há banner'),
    'a privacidade explica porque não há aviso de cookies')

  /* --- os campos por preencher estão assinalados, não escondidos ------ */
  const falta = await palco.contar('mark.falta')
  certo(falta > 0, 'os campos de identificação por preencher aparecem assinalados',
    `${falta} marcadores`)
}
