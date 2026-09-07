// Dados e utilitarios puros. Este modulo NAO importa nada do projecto — e o
// que garante que nenhum ciclo de importacao possa deixar uma constante a ler
// `undefined` no topo de outro modulo, que foi exactamente o que aconteceu.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

export const AQUI = dirname(fileURLToPath(import.meta.url))
export const RAIZ = join(AQUI, '..')
export const ler = (...p) => readFileSync(join(AQUI, ...p), 'utf8')
export const lerJSON = (...p) => JSON.parse(ler(...p))

export const PALETA = lerJSON('marca', 'paleta.json')
export const SITE = lerJSON('dados', 'site.json')
export const M = SITE.marca
export const BASE = `https://${M.dominio}`

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export const numero = (n) => new Intl.NumberFormat('pt-PT').format(n)

/** Carimbo de versao a partir do conteudo. O GitHub Pages serve tudo com
 *  `Cache-Control: max-age=600` e nao deixa mudar cabecalhos: sem isto, uma
 *  versao nova instala-se com ficheiros velhos. */
export const versao = (texto) => createHash('sha256').update(texto).digest('hex').slice(0, 8)

export function cssPaleta () {
  const vars = (modo) => Object.entries(PALETA[modo])
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `  --${k}: ${v};`).join('\n')
  return `/* Gerado de _source/marca/paleta.json — nao editar a mao.
   O modo escuro esta escrito DUAS vezes de proposito: uma para quem nunca
   escolheu (prefers-color-scheme) e outra para quem escolheu explicitamente
   ([data-tema]). As duas tem de dizer o mesmo, e e por isso que saem da mesma
   fonte em vez de serem copiadas. */
:root {
${vars('claro')}
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-tema="claro"]) {
${vars('escuro')}
  }
}
:root[data-tema="escuro"] {
${vars('escuro')}
}
`
}
