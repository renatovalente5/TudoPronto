/* Tamanhos de toque, ecrã pequeno, letra grande e contraste REAL.

   A paleta já é medida por programa em _source/verificar/contraste.mjs. Este
   módulo mede outra coisa: o que sai depois de o CSS ser aplicado. Uma paleta
   impecável estraga-se com um `opacity: .6` por cima de uma tinta calculada
   para 4,5 — e isso não se vê em ficheiro nenhum, só no ecrã. */

export const nome = 'Alvos de toque, ecrã pequeno e contraste real'
export const ecra = { largura: 390, altura: 844 }

import { AMANHA, cenarioComServico, comoEla, criarConta, entrarComo } from './_ajuda.mjs'

/* O piso é 44 px — o mínimo da Apple. O WCAG 2.5.8 pede 24, que é o mínimo
   legal e não o mínimo utilizável por quem trabalha com luvas. */
const PISO = 44
const CAMPO = 52   /* margem de tolerância abaixo dos 56 pedidos */

export async function correr (palco, certo) {
  await palco.ir('/app/')
  const dona = await criarConta(palco, { nome: 'Ana Dona', papel: 'dono' })
  const prof = await criarConta(palco, { nome: 'Berta Profissional', papel: 'profissional' })
  const { servico } = await cenarioComServico(palco, dona)
  await comoEla(palco, prof.testemunho, 'POST', `/v1/servicos/${servico.id}/candidatar`, {})
  const cands = await comoEla(palco, dona.testemunho, 'GET', `/v1/servicos/${servico.id}`)
  await comoEla(palco, dona.testemunho, 'POST',
    `/v1/candidaturas/${cands.servico.candidaturas[0].id}/aceitar`, {})

  const ECRAS = [
    ['/app/#/', 'painel'],
    ['/app/#/mercado', 'mercado'],
    [`/app/#/servico/${servico.id}`, 'ficha do serviço'],
    ['/app/#/eu', 'a minha conta'],
    ['/app/#/equipa', 'equipa'],
    [`/app/#/avaliar/${servico.id}`, 'avaliar'],
  ]

  /* ═══ 1. alvos de toque ═══ */
  await entrarComo(palco, prof, '/app/#/')
  for (const [caminho, comoSeChama] of ECRAS) {
    await palco.ir(caminho)
    await palco.esperar('#principal')
    await palco.js('return new Promise(r => setTimeout(r, 400))')

    const pequenos = await palco.js(`
      const alvos = [...document.querySelectorAll(
        'button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button]')]
      const maus = []
      for (const n of alvos) {
        const e = getComputedStyle(n)
        if (e.display === 'none' || e.visibility === 'hidden' || Number(e.opacity) === 0) continue
        const r = n.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        // Uma ligação dentro de um parágrafo é texto, não é um alvo de barra:
        // o WCAG isenta-a explicitamente (2.5.8, excepção "inline").
        const dentroDeTexto = n.tagName === 'A' &&
          ['P','LI','SPAN','SMALL','DD','DT'].includes(n.parentElement?.tagName)
        if (dentroDeTexto) continue
        if (r.height < ${PISO} - 0.5 || r.width < 24) {
          maus.push((n.textContent || n.getAttribute('aria-label') || n.tagName)
            .replace(/\\s+/g,' ').trim().slice(0, 34)
            + ' → ' + Math.round(r.width) + '×' + Math.round(r.height))
        }
      }
      return maus`)
    certo(!pequenos.length,
      `no ${comoSeChama}, tudo o que se toca tem pelo menos ${PISO} px de altura`,
      pequenos.slice(0, 5).join(' | '))
  }

  /* O botão de campo — o que se toca com luvas — é maior. */
  await palco.ir(`/app/#/servico/${servico.id}`)
  await palco.esperar('#accao .b')
  const accao = await palco.medir('#accao .b')
  certo(accao && accao.altura >= CAMPO,
    `o botão ancorado tem ${CAMPO} px ou mais (é o que se toca em campo)`,
    `${Math.round(accao?.altura)} px`)
  certo(accao && accao.largura > 300,
    'e ocupa a largura do ecrã', `${Math.round(accao?.largura)} px`)

  /* As estrelas de avaliar são alvos de campo. */
  await palco.ir(`/app/#/avaliar/${servico.id}`)
  await palco.esperar('.estrelar button')
  const estrela = await palco.medir('.estrelar button')
  certo(estrela && estrela.altura >= CAMPO && estrela.largura >= CAMPO,
    'as estrelas são alvos de campo',
    `${Math.round(estrela?.largura)}×${Math.round(estrela?.altura)}`)

  /* ═══ 2. o destrutivo nunca encostado ao positivo ═══ */
  await palco.ir(`/app/#/servico/${servico.id}`)
  await palco.esperar('.zona-perigo')
  const folga = await palco.js(`
    const perigo = document.querySelector('.zona-perigo .b--perigo')
    if (!perigo) return { erro: 'não há botão destrutivo' }
    const rp = perigo.getBoundingClientRect()
    let menor = Infinity, quem = null
    for (const b of document.querySelectorAll('.b:not(.b--perigo):not(.b--nu)')) {
      const r = b.getBoundingClientRect()
      if (!r.width || !r.height) continue
      // distância vertical entre as duas caixas
      const d = r.top > rp.bottom ? r.top - rp.bottom
              : rp.top > r.bottom ? rp.top - r.bottom
              : 0
      const sobrepoemNaHorizontal = r.left < rp.right && r.right > rp.left
      if (!sobrepoemNaHorizontal) continue
      if (d < menor) { menor = d; quem = (b.textContent||'').trim().slice(0,26) }
    }
    return { menor: menor === Infinity ? null : Math.round(menor), quem }`)
  certo(folga.menor === null || folga.menor >= 24,
    'há pelo menos 24 px entre o botão destrutivo e qualquer acção positiva',
    `${folga.menor} px até «${folga.quem}»`)
  certo(!(await palco.js(`
    const p = document.querySelector('.b--perigo')
    if (!p) return false
    const e = getComputedStyle(p)
    return e.backgroundColor !== 'rgba(0, 0, 0, 0)' && e.backgroundColor !== 'transparent'`)),
    'o botão destrutivo distingue-se pelo PESO (contorno, não cheio) e não só pela cor')

  /* ═══ 3. contraste real, depois do CSS aplicado ═══ */
  for (const [caminho, comoSeChama] of ECRAS) {
    await palco.ir(caminho)
    await palco.esperar('#principal')
    await palco.js('return new Promise(r => setTimeout(r, 350))')
    const fracos = await palco.js(`
      const lum = ({r,g,b}) => {
        const c = [r,g,b].map(v => { const s = v/255
          return s <= 0.04045 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4) })
        return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]
      }
      const ler = (s) => {
        const m = String(s).match(/rgba?\\(([^)]+)\\)/)
        if (!m) return null
        const p = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number)
        return { r:p[0], g:p[1], b:p[2], a: p.length > 3 ? p[3] : 1 }
      }
      /* O fundo efectivo: sobe a árvore até encontrar um fundo opaco. Uma
         caixa transparente não tem a cor que declara — tem a do que está por
         baixo dela. */
      /* Começa no PRÓPRIO elemento e não no pai: um botão tem fundo próprio,
         e medir o texto dele contra o fundo da página dava 1,05 num botão que
         na verdade tem 6:1. Foi o erro que fez este medidor acusar sete ecrãs
         de contraste mau quando o mau era ele. */
      const fundoDe = (n) => {
        let x = n
        while (x) {
          const c = ler(getComputedStyle(x).backgroundColor)
          if (c && c.a >= 0.95) return c
          x = x.parentElement
        }
        return { r:255, g:255, b:255, a:1 }
      }
      const achatar = (f, b) => f.a >= 1 ? f : {
        r: f.r*f.a + b.r*(1-f.a), g: f.g*f.a + b.g*(1-f.a), b: f.b*f.a + b.b*(1-f.a), a:1 }
      const razao = (f, b) => {
        const lf = lum(achatar(f,b)), lb = lum(b)
        const [hi,lo] = lf > lb ? [lf,lb] : [lb,lf]
        return (hi+0.05)/(lo+0.05)
      }
      const maus = []
      for (const n of document.querySelectorAll('*')) {
        const e = getComputedStyle(n)
        if (e.display === 'none' || e.visibility === 'hidden') continue
        const op = Number(e.opacity)
        if (op === 0) continue
        /* só elementos com texto próprio */
        const txt = [...n.childNodes].filter(x => x.nodeType === 3)
          .map(x => x.textContent.trim()).join(' ').trim()
        if (!txt) continue
        const r = n.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        /* Fora do ecrã não se lê: o atalho «Ir para o conteúdo» vive acima
           do topo até receber foco, e medi-lo é medir o invisível. */
        if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue
        /* Controlos desactivados estão fora do 1.4.3, que isenta
           explicitamente "part of an inactive user interface component". Um
           botão a 55% de opacidade É a forma de dizer que está desligado. */
        if (n.closest('[disabled]') || n.closest('[aria-disabled="true"]')) continue
        const frente = ler(e.color)
        if (!frente) continue
        /* A opacidade herdada multiplica-se na tinta — é aqui que uma paleta
           medida se estraga sem ninguém dar por isso. */
        let opAcum = op
        let pai = n.parentElement
        while (pai) { opAcum *= Number(getComputedStyle(pai).opacity); pai = pai.parentElement }
        const fundo = fundoDe(n)
        const efectiva = { ...frente, a: (frente.a ?? 1) * opAcum }
        const px = parseFloat(e.fontSize)
        const peso = Number(e.fontWeight) || 400
        const grande = px >= 24 || (px >= 18.66 && peso >= 700)
        const minimo = grande ? 3 : 4.5
        const razaoReal = razao(efectiva, fundo)
        if (razaoReal < minimo - 0.02) {
          maus.push(txt.slice(0, 30) + ' → ' + razaoReal.toFixed(2)
            + ' (min ' + minimo + ', ' + Math.round(px) + 'px'
            + (opAcum < 1 ? ', opacidade ' + opAcum.toFixed(2) : '') + ')')
        }
      }
      return [...new Set(maus)]`)
    certo(!fracos.length,
      `no ${comoSeChama}, o texto todo passa o contraste mínimo depois do CSS aplicado`,
      fracos.slice(0, 5).join(' | '))
  }

  /* ═══ 4. ecrã de 320 px ═══ */
  await palco.tamanho(320, 700)
  for (const [caminho, comoSeChama] of ECRAS) {
    await palco.ir(caminho)
    await palco.esperar('#principal')
    await palco.js('return new Promise(r => setTimeout(r, 350))')
    const transborda = await palco.js(
      'return document.documentElement.scrollWidth > innerWidth + 1 ? document.documentElement.scrollWidth : 0')
    certo(!transborda, `a ${comoSeChama} cabe em 320 px`, `precisa de ${transborda} px`)

    const cortado = await palco.js(`
      const maus = []
      for (const n of document.querySelectorAll('.b, .dist, .serv__quando, .valor, .topo__t, .medida b')) {
        const e = getComputedStyle(n)
        if (e.display === 'none') continue
        // texto cortado com reticências: o conteúdo é maior do que a caixa
        if (n.scrollWidth > n.clientWidth + 2 && e.textOverflow === 'ellipsis') {
          maus.push((n.textContent||'').trim().slice(0, 30))
        }
      }
      return maus`)
    certo(!cortado.length, `e nada fica cortado na ${comoSeChama}`, cortado.join(' | '))
  }
  await palco.tamanho(390, 844)

  /* ═══ 5. letra a 200% ═══
     O WCAG 1.4.4 pede que o conteúdo aguente 200% sem perder função. Quem
     tem sessenta e cinco anos costuma ter a letra do telemóvel aumentada. */
  await palco.ir('/app/#/')
  await palco.esperar('#principal')
  await palco.js(`document.documentElement.style.fontSize = '32px'; return true`)
  await palco.js('return new Promise(r => setTimeout(r, 400))')
  const transbordaGrande = await palco.js(
    'return document.documentElement.scrollWidth > innerWidth + 1 ? document.documentElement.scrollWidth : 0')
  certo(!transbordaGrande, 'com a letra ao dobro, o painel continua a caber na largura',
    `precisa de ${transbordaGrande} px`)
  await palco.js(`document.documentElement.style.fontSize = ''; return true`)

  /* ═══ 6. modo escuro ═══ */
  await palco.tema('dark')
  await palco.ir('/app/#/')
  await palco.esperar('#principal')
  await palco.js('return new Promise(r => setTimeout(r, 350))')
  const fundoEscuro = await palco.estilo('body', 'background-color')
  const claroDemais = await palco.js(`
    const m = getComputedStyle(document.body).backgroundColor.match(/\\d+/g).map(Number)
    return (m[0] + m[1] + m[2]) / 3 > 120`)
  certo(!claroDemais, 'no modo escuro o fundo é escuro de facto', fundoEscuro)

  /* E a escolha explícita tem de dizer o mesmo que a automática — se estiverem
     escritas duas vezes, metade das pessoas fica com a paleta velha. */
  await palco.tema('light')
  await palco.js(`document.documentElement.setAttribute('data-tema','escuro'); return true`)
  await palco.js('return new Promise(r => setTimeout(r, 250))')
  const escolhaExplicita = await palco.estilo('body', 'background-color')
  certo(escolhaExplicita === fundoEscuro,
    'o escuro escolhido à mão é idêntico ao escuro automático',
    `${escolhaExplicita} vs ${fundoEscuro}`)
  await palco.js(`document.documentElement.removeAttribute('data-tema'); return true`)

  /* ═══ 7. menos movimento não vira estroboscópio ═══
     O reset habitual (`animation-duration: .01ms`) NÃO para uma animação
     infinita: acelera-a até piscar. */
  await palco.movimento('reduce')
  await palco.ir('/app/#/')
  const infinitasRapidas = await palco.js(`
    const maus = []
    for (const n of document.querySelectorAll('*')) {
      const e = getComputedStyle(n)
      if (e.animationName === 'none') continue
      const conta = e.animationIterationCount
      const dur = parseFloat(e.animationDuration) || 0
      if ((conta === 'infinite' || Number(conta) > 3) && dur < 0.05) {
        maus.push(e.animationName + ' × ' + conta + ' em ' + dur + 's')
      }
    }
    return maus`)
  certo(!infinitasRapidas.length,
    'com menos movimento pedido, nada fica a piscar em ciclo',
    infinitasRapidas.join(' | '))
  await palco.movimento('no-preference')
}
