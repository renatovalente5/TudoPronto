/* Teclado e foco.

   `role="dialog" aria-modal="true"` não faz NADA sozinho. São três promessas
   a quem navega por teclado ou por leitor de ecrã, e as três têm de ser
   escritas à mão: o foco ENTRA quando abre, NÃO SAI enquanto estiver aberto,
   e VOLTA ao sítio de onde veio quando fecha. Este módulo cobra as três. */

export const nome = 'Teclado e foco'
export const ecra = { largura: 390, altura: 844 }

import { cenarioComServico, criarConta, entrarComo } from './_ajuda.mjs'

export async function correr (palco, certo) {
  await palco.ir('/app/')
  const dona = await criarConta(palco, { nome: 'Ana Dona', papel: 'dono' })
  const prof = await criarConta(palco, { nome: 'Berta Profissional', papel: 'profissional' })
  const { servico } = await cenarioComServico(palco, dona)

  /* ═══ 1. o atalho para o conteúdo é o primeiro alvo do teclado ═══ */
  await entrarComo(palco, prof, '/app/#/')
  /* Medir ANTES de qualquer foco: a primeira tabulação já o traz para dentro
     do ecrã, e medir depois é medir o estado que se queria comparar. */
  const posicaoAntes = await palco.js(`
    document.activeElement?.blur?.()
    const r = document.querySelector('.salta').getBoundingClientRect()
    return Math.round(r.y)`)
  certo(posicaoAntes < 0, 'em repouso, o atalho está fora do ecrã', `y = ${posicaoAntes}`)

  await palco.js(`document.body.focus(); return true`)
  await palco.tecla('Tab')
  const primeiro = await palco.focado()
  certo(primeiro && /salta/.test(primeiro.classe),
    'a primeira tabulação da página é o atalho para o conteúdo',
    JSON.stringify(primeiro))
  const posicaoDepois = await palco.medir('.salta')
  certo(posicaoDepois && posicaoDepois.y > posicaoAntes,
    'e ao receber foco desce para dentro do ecrã',
    `${posicaoAntes} → ${Math.round(posicaoDepois?.y)}`)

  /* ═══ 2. as três promessas do painel ═══ */
  await palco.ir(`/app/#/servico/${servico.id}`)
  await palco.esperar('#accao .b')
  /* Marca quem tinha o foco antes de abrir, para se poder exigir que volte. */
  await palco.js(`document.querySelector('#accao .b').focus(); return true`)
  const veioDe = await palco.focado()

  await palco.clicar('#accao .b')
  await palco.esperar('.painel')

  const dentro = await palco.focado()
  certo(dentro && await palco.js(
    `return document.querySelector('.painel').contains(document.activeElement)`),
    'promessa 1: ao abrir o painel, o foco ENTRA nele', JSON.stringify(dentro))

  certo((await palco.atributo('.painel', 'role')) === 'dialog'
    && (await palco.atributo('.painel', 'aria-modal')) === 'true',
    'o painel anuncia-se como diálogo modal')
  certo(!!(await palco.atributo('.painel', 'aria-label')),
    'e tem nome, para um leitor de ecrã poder dizer o que abriu')

  /* Vinte tabulações não podem levar o foco para fora do painel. */
  let escapou = null
  for (let i = 0; i < 20; i++) {
    await palco.tecla('Tab')
    const fora = await palco.js(
      `return !document.querySelector('.painel')?.contains(document.activeElement)`)
    if (fora) { escapou = await palco.focado(); break }
  }
  certo(!escapou,
    'promessa 2: com 20 tabulações, o foco NÃO SAI do painel',
    escapou ? `escapou para ${JSON.stringify(escapou)}` : '')

  /* Shift+Tab, na outra direcção, também não. */
  let escapouAtras = null
  for (let i = 0; i < 8; i++) {
    await palco.enviar('Input.dispatchKeyEvent', {
      type: 'keyDown', windowsVirtualKeyCode: 9, code: 'Tab', key: 'Tab', modifiers: 8,
    }, palco.sessao)
    await palco.enviar('Input.dispatchKeyEvent', {
      type: 'keyUp', windowsVirtualKeyCode: 9, code: 'Tab', key: 'Tab', modifiers: 8,
    }, palco.sessao)
    await palco.js('return new Promise(r => setTimeout(r, 60))')
    const fora = await palco.js(
      `return !document.querySelector('.painel')?.contains(document.activeElement)`)
    if (fora) { escapouAtras = await palco.focado(); break }
  }
  certo(!escapouAtras, 'e também não sai para trás, com Shift+Tab',
    escapouAtras ? JSON.stringify(escapouAtras) : '')

  /* Escape fecha. */
  await palco.tecla('Escape')
  await palco.sumir('.painel', 4000)
  certo(true, 'o Escape fecha o painel')

  const voltou = await palco.focado()
  certo(voltou && voltou.texto === veioDe?.texto,
    'promessa 3: ao fechar, o foco VOLTA ao botão de onde veio',
    `veio de «${veioDe?.texto}», voltou a «${voltou?.texto}»`)

  /* Um clique no véu, fora da caixa, também fecha. */
  await palco.clicar('#accao .b')
  await palco.esperar('.painel')
  const caixaVeu = await palco.medir('.veu')
  for (const tipo of ['mousePressed', 'mouseReleased']) {
    await palco.enviar('Input.dispatchMouseEvent', {
      type: tipo, x: Math.round(caixaVeu.centroX), y: 8, button: 'left', clickCount: 1,
    }, palco.sessao)
  }
  await palco.sumir('.painel', 4000)
  certo(true, 'e um toque fora da caixa também fecha')

  /* ═══ 3. o anel de foco é visível ═══ */
  await palco.ir('/app/#/eu')
  await palco.esperar('#c-nome')
  const anel = await palco.js(`
    const n = document.querySelector('#c-nome')
    n.focus()
    const e = getComputedStyle(n)
    return { largura: e.outlineWidth, estilo: e.outlineStyle, cor: e.outlineColor }`)
  certo(anel.estilo !== 'none' && parseFloat(anel.largura) >= 2,
    'um campo focado ganha um anel de pelo menos 2 px', JSON.stringify(anel))

  /* ═══ 4. os campos têm rótulo a sério ═══ */
  for (const caminho of ['/app/#/eu', '/app/#/alojamento/novo', '/app/#/servico/novo']) {
    await entrarComo(palco, dona, caminho)
    await palco.esperar('#principal')
    await palco.js('return new Promise(r => setTimeout(r, 400))')
    const semRotulo = await palco.js(`
      const maus = []
      for (const n of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
        const e = getComputedStyle(n)
        if (e.display === 'none') continue
        const id = n.id
        const temLabel = id && document.querySelector('label[for="' + id + '"]')
        const dentroDeLabel = n.closest('label')
        const aria = n.getAttribute('aria-label') || n.getAttribute('aria-labelledby')
        if (!temLabel && !dentroDeLabel && !aria) {
          maus.push(n.tagName.toLowerCase() + '#' + (id || '(sem id)'))
        }
      }
      return maus`)
    certo(!semRotulo.length, `em ${caminho}, todos os campos têm rótulo`, semRotulo.join(', '))
  }

  /* ═══ 5. o campo de código aceita colar e anuncia-se ═══
     Transcrever um código à mão é um «teste de função cognitiva», proibido
     pelo critério 3.3.8 do WCAG 2.2 sem alternativa. A alternativa é deixar
     colar — e dizer ao sistema que aquilo é um código de uso único, para o
     teclado o oferecer sozinho. */
  await palco.ir('/app/#/verificar?email=teste@exemplo.pt')
  await palco.esperar('#c-codigo')
  certo((await palco.atributo('#c-codigo', 'autocomplete')) === 'one-time-code',
    'o campo de código pede ao sistema o código de uso único')
  certo((await palco.atributo('#c-codigo', 'inputmode')) === 'numeric',
    'e abre o teclado numérico')
  await palco.js(`
    const n = document.querySelector('#c-codigo')
    n.focus(); n.value = 'Código: 123 456'
    n.dispatchEvent(new Event('input', { bubbles: true }))
    return true`)
  certo((await palco.valor('#c-codigo')) === '123456',
    'e limpa o que se cola: «Código: 123 456» fica 123456',
    await palco.valor('#c-codigo'))
}
