// Esqueleto comum das paginas do site de apresentacao.
import { esc, M, BASE } from '../dados.mjs'

/** Logotipo. Uma casa cuja porta e um visto: a casa esta pronta.
 *  O `fill` vem de uma custom property e nao do atributo, porque um
 *  `fill="…"` no atributo e atropelado por qualquer regra de CSS que toque em
 *  `fill` — e depois a forma aparece preta sem se saber porque. */
export const LOGO = (tamanho = 30) => `
<svg class="logo" width="${tamanho}" height="${tamanho}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
  <path d="M16 3.2 3.4 12.1v15.3a1.6 1.6 0 0 0 1.6 1.6h22a1.6 1.6 0 0 0 1.6-1.6V12.1L16 3.2Z"
        fill="none" stroke="var(--logo-traco, currentColor)" stroke-width="2.4"
        stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M10.6 17.9l3.9 4.1 7.1-8"
        fill="none" stroke="var(--logo-visto, currentColor)" stroke-width="2.8"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const NAV = [
  ['/como-funciona.html', 'Como funciona'],
  ['/para-quem-tem-alojamento.html', 'Tenho alojamento'],
  ['/para-quem-limpa.html', 'Faço limpezas'],
  ['/apoio.html', 'Apoio'],
]

export function pagina ({ titulo, descricao, caminho, corpo, v, semRodapeGrande }) {
  const url = BASE + caminho
  const tituloCheio = caminho === '/index.html'
    ? `${M.nome} — ${M.tagline}`
    : `${titulo} · ${M.nome}`
  return `<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tituloCheio)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#0F6E68" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131819" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(M.nome)}">
<meta property="og:title" content="${esc(tituloCheio)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="pt_PT">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icone.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icone-180.png">
<link rel="manifest" href="/app/manifesto.json">
<link rel="stylesheet" href="/estilo.css?v=${v}">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: M.nome,
  url: BASE,
  description: M.descricao,
  inLanguage: 'pt-PT',
})}</script>
</head>
<body>
<a class="salta" href="#principal">Ir para o conteúdo</a>

<header class="cabeca">
  <div class="envolve cabeca__i">
    <a class="cabeca__marca" href="/">${LOGO(28)}<span>${esc(M.nome)}</span></a>
    <nav class="cabeca__nav" aria-label="Navegação principal">
      ${NAV.map(([h, t]) => `<a href="${h}"${caminho === h ? ' aria-current="page"' : ''}>${esc(t)}</a>`).join('\n      ')}
    </nav>
    <a class="b b--contorno cabeca__entrar" href="/app/">Entrar</a>
  </div>
</header>

<main id="principal">
${corpo}
</main>

<footer class="pe">
  <div class="envolve">
    <div class="pe__grelha">
      <div>
        <a class="pe__marca" href="/">${LOGO(26)}<span>${esc(M.nome)}</span></a>
        <p class="pe__tag">${esc(M.tagline)}</p>
      </div>
      <div>
        <h2>A aplicação</h2>
        <ul>
          <li><a href="/como-funciona.html">Como funciona</a></li>
          <li><a href="/para-quem-tem-alojamento.html">Tenho alojamento local</a></li>
          <li><a href="/para-quem-limpa.html">Faço limpezas</a></li>
          <li><a href="/app/">Entrar ou criar conta</a></li>
        </ul>
      </div>
      <div>
        <h2>Ajuda</h2>
        <ul>
          <li><a href="/apoio.html">Apoio e contactos</a></li>
          <li><a href="mailto:${esc(M.email)}">${esc(M.email)}</a></li>
          <li><a href="https://www.livroreclamacoes.pt/inicio" rel="noopener">Livro de Reclamações</a></li>
        </ul>
      </div>
      <div>
        <h2>Legal</h2>
        <ul>
          <li><a href="/termos.html">Termos de utilização</a></li>
          <li><a href="/privacidade.html">Privacidade</a></li>
          <li><a href="/termos.html#independencia">Independência de quem trabalha</a></li>
        </ul>
      </div>
    </div>
    <p class="pe__fim">
      ${esc(M.nome)} · ${esc(M.dominio)} · Portugal.
      O ${esc(M.nome)} liga pessoas: não emprega ninguém, não define preços e não recebe pagamentos.
    </p>
  </div>
</footer>
</body>
</html>
`
}
