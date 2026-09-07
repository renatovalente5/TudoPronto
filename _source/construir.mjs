// Gerador do Tudo Pronto. Sem dependencias: node _source/construir.mjs
//
// Produz na raiz do repositorio o que o GitHub Pages serve:
//   index.html, como-funciona.html, para-quem-limpa.html, ...
//   app/          a aplicacao (PWA)
//   estilo.css    o desenho, com as cores VINDAS DA PALETA
//
// Duas regras que o gerador impoe e que ja custaram caro noutros projectos:
//  1. Nenhuma cor e escrita a mao no CSS. As variaveis saem de marca/paleta.json,
//     que e a mesma fonte que o verificador de contraste mede. Se divergirem,
//     metade das pessoas fica com a paleta velha e a medicao olha para a outra.
//  2. Nenhum contacto e escrito a mao numa pagina. Sai de dados/site.json, e
//     a construcao MORRE se faltar um campo obrigatorio — senao uma pagina
//     legal fica a mentir em silencio no dia em que alguem mexe nos dados.

import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { AQUI, BASE, M, PALETA, RAIZ, SITE, cssPaleta, esc, ler, lerJSON, numero, versao } from './dados.mjs'

// ─────────────────── guarda dos dados obrigatorios ───────────────────
// Escrito antes de qualquer geracao: uma pagina legal sem o campo que a lei
// exige e pior do que pagina nenhuma, e o silencio de um campo em falta nao
// se ve numa captura de ecra.
const OBRIGATORIOS = [
  'marca.nome', 'marca.dominio', 'marca.tagline', 'marca.descricao', 'marca.email',
  'mercado.alojamentos_continente',
]
{
  const emFalta = []
  for (const caminho of OBRIGATORIOS) {
    const v = caminho.split('.').reduce((o, k) => (o == null ? o : o[k]), SITE)
    if (v === undefined || v === null || v === '') emFalta.push(caminho)
  }
  if (emFalta.length) {
    console.error('\n  A construcao parou: faltam campos obrigatorios em _source/dados/site.json\n')
    for (const c of emFalta) console.error(`    · ${c}`)
    console.error('')
    process.exit(1)
  }
}

// ═══════════════════════════════ geracao ═══════════════════════════════

import { inicio } from './paginas/inicio.mjs'
import { paraDono, paraProfissional, comoFunciona, apoio } from './paginas/lados.mjs'
import { termos, privacidade } from './paginas/legal.mjs'
import { pagina, LOGO } from './paginas/esqueleto.mjs'

/** O prefixo dos caminhos sai do CNAME, e nao de uma constante escrita a mao.
 *  Sem dominio proprio o GitHub Pages serve em /TudoPronto/, e um `/estilo.css`
 *  aponta para a raiz do github.io — onde nao esta nada. Com dominio, o prefixo
 *  desaparece. Derivar em vez de decidir e o que evita ter de mexer em vinte
 *  ficheiros no dia em que o dominio for comprado. */
const TEM_CNAME = existsSync(join(RAIZ, 'CNAME'))
const PREFIXO = TEM_CNAME ? '' : '/TudoPronto'

/** Reescreve os caminhos absolutos do HTML com o prefixo. Apanha `="/algo"` e
 *  deixa em paz `//host`, `mailto:`, `tel:` e `https:`. */
function comPrefixo (html) {
  if (!PREFIXO) return html
  return html.replace(/(\s(?:href|src|content)=")\/(?!\/)/g, `$1${PREFIXO}/`)
}

const ICONE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#0F6E68"/>
  <path d="M16 6.4 6.6 13.1v11.5a1.2 1.2 0 0 0 1.2 1.2h16.4a1.2 1.2 0 0 0 1.2-1.2V13.1L16 6.4Z"
        fill="none" stroke="#FBF9F5" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M11.8 18.6l3.3 3.4 6-6.7" fill="none" stroke="#FBF9F5" stroke-width="2.4"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const PAGINAS = [
  { f: 'index.html', t: 'Início', d: SITE.marca.descricao, c: inicio },
  { f: 'como-funciona.html', t: 'Como funciona',
    d: 'O percurso completo de uma limpeza de alojamento local: publicar, escolher quem vai, quando a morada aparece, as fotografias do trabalho e as avaliações.',
    c: comoFunciona },
  { f: 'para-quem-tem-alojamento.html', t: 'Tenho alojamento local',
    d: 'Combine as limpezas do seu alojamento local num sítio só, com a pessoa que já lhe limpa a casa ou com quem se ofereça. Fotografias do trabalho feito, sem comissões.',
    c: paraDono },
  { f: 'para-quem-limpa.html', t: 'Faço limpezas',
    d: 'Trabalho de limpeza de alojamento local perto de si. Veja o valor, a hora e a distância antes de aceitar, ofereça-se ao seu preço, e sem qualquer comissão.',
    c: paraProfissional },
  { f: 'apoio.html', t: 'Apoio', d: 'Ajuda para começar a usar o Tudo Pronto, contactos e perguntas frequentes.', c: apoio },
  { f: 'termos.html', t: 'Termos de utilização',
    d: 'Termos de utilização do Tudo Pronto: o que é o serviço, a independência de quem faz limpezas, avaliações, suspensão de contas e resolução de litígios.',
    c: termos },
  { f: 'privacidade.html', t: 'Privacidade',
    d: 'Que dados o Tudo Pronto guarda, para que servem, quem os vê e que direitos tem. Sem cookies de publicidade nem estatística.',
    c: privacidade },
]

function copiarPasta (de, para) {
  mkdirSync(para, { recursive: true })
  for (const nome of readdirSync(de)) {
    const o = join(de, nome)
    const d = join(para, nome)
    // "E pasta" decide-se por statSync e nao por o nome nao ter ponto: uma
    // pasta chamada `v1.2` seria tratada como ficheiro e a subarvore toda
    // desaparecia em silencio.
    if (statSync(o).isDirectory()) copiarPasta(o, d)
    else copyFileSync(o, d)
  }
}

export function construir () {
  const t0 = Date.now()
  const escritos = []
  const escrever = (rel, conteudo) => {
    const destino = join(RAIZ, rel)
    mkdirSync(dirname(destino), { recursive: true })
    writeFileSync(destino, conteudo)
    escritos.push([rel, Buffer.byteLength(conteudo)])
  }

  // ── folha de estilo: paleta gerada + base + site ──
  const css = [
    cssPaleta(),
    ler('app', 'base.css'),
    ler('app', 'site.css'),
  ].join('\n')
  const vCss = versao(css)
  escrever('estilo.css', css)

  // ── paginas ──
  for (const p of PAGINAS) {
    const html = pagina({
      titulo: p.t,
      descricao: p.d,
      caminho: '/' + p.f,
      corpo: p.c(),
      v: vCss,
    })
    escrever(p.f, comPrefixo(html))
  }

  // ── icones ──
  escrever('icone.svg', ICONE)

  // ── a aplicacao ──
  const appCss = [cssPaleta(), ler('app', 'base.css'), ler('app', 'app.css')].join('\n')
  const vApp = versao(appCss + ler('app', 'nucleo.js'))
  escrever('app/estilo.css', appCss)
  escrever('app/nucleo.js', ler('app', 'nucleo.js'))
  escrever('app/index.html', comPrefixo(
    ler('app', 'index.html').replace(/\{\{V\}\}/g, vApp)))
  escrever('app/sw.js', ler('app', 'sw.js').replace(/\{\{V\}\}/g, vApp).replace(/\{\{PREFIXO\}\}/g, PREFIXO))
  escrever('app/manifesto.json', JSON.stringify({
    name: M.nome,
    short_name: M.nome,
    description: M.descricao,
    start_url: `${PREFIXO}/app/`,
    scope: `${PREFIXO}/app/`,
    display: 'standalone',
    orientation: 'portrait',
    lang: 'pt-PT',
    dir: 'ltr',
    background_color: '#FBF9F5',
    theme_color: '#0F6E68',
    icons: [
      { src: `${PREFIXO}/icone.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: `${PREFIXO}/icone-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${PREFIXO}/icone-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${PREFIXO}/icone-mascara.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2))

  // ── SPA no GitHub Pages: um 404 que devolve a aplicacao ──
  // A aplicacao usa hash (#/servico/x), que nao chega ao servidor — mas se
  // alguem escrever /app/servico/1 a mao, e melhor cair na aplicacao do que
  // num 404 do GitHub.
  escrever('404.html', comPrefixo(pagina({
    titulo: 'Página não encontrada',
    descricao: 'A página que procurava não existe.',
    caminho: '/404.html',
    v: vCss,
    corpo: `
<article class="artigo">
  <div class="envolve envolve--estreito centro">
    <h1>Esta página não existe</h1>
    <p class="artigo__intro">Provavelmente a ligação está errada, ou a página mudou de sítio.</p>
    <div class="fita fita--centro" style="margin-top:26px">
      <a class="b" href="/">Ir para o início</a>
      <a class="b b--contorno" href="/app/">Abrir a aplicação</a>
    </div>
  </div>
</article>`,
  })))

  // ── sitemap e robots ──
  escrever('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.w3.org/1999/sitemap/0.9"
        xmlns:x="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGINAS.filter(p => !['termos.html', 'privacidade.html'].includes(p.f))
  .map(p => `  <url><loc>${BASE}/${p.f === 'index.html' ? '' : p.f}</loc></url>`).join('\n')}
</urlset>`.replace('xmlns="http://www.w3.org/1999/sitemap/0.9"\n        xmlns:x="http://www.sitemaps.org/schemas/sitemap/0.9"',
                   'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'))

  escrever('robots.txt', `User-agent: *
Allow: /
Disallow: /app/
Sitemap: ${BASE}/sitemap.xml
`)

  // O GitHub Pages nao serve pastas com _ a frente sem isto.
  escrever('.nojekyll', '')

  const ms = Date.now() - t0
  const total = escritos.reduce((s, [, n]) => s + n, 0)
  console.log(`\n  ${escritos.length} ficheiros, ${(total / 1024).toFixed(0)} kB, ${ms} ms`)
  console.log(`  prefixo: ${PREFIXO || '(raiz — CNAME presente)'}\n`)
  for (const [f, n] of escritos) console.log(`    ${String(Math.round(n / 1024) + ' kB').padStart(7)}  ${f}`)
  console.log('')
  return escritos
}

if (process.argv[1] === fileURLToPath(import.meta.url)) construir()
