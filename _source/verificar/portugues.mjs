// Guarda de português: o TEXTO VISÍVEL não pode ir para o ar sem acentos.
//
// Isto existe porque aconteceu. As mensagens do Worker e a lista de tarefas
// foram escritas sem acentos — por comodidade de teclado — e chegaram ao ecrã
// assim: «Esse alojamento ja nao existe», «Loica lavada», «Chao aspirado».
// Ninguém repara ao escrever código; repara-se numa fotografia do produto.
//
// O código pode continuar sem acentos: nomes de variáveis, chaves e
// comentários não são lidos por ninguém de fora. O que esta guarda mede é
// apenas o que sai para o ecrã ou para um email.
//
// node _source/verificar/portugues.mjs

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..', '..')

/** Palavras que em português europeu levam acento SEMPRE, e cuja forma sem
 *  acento não é outra palavra. As ambíguas ficam de fora de propósito: «e»
 *  (conjunção) vs «é» (verbo), «esta» vs «está», «so» vs «só», «da» vs «dá» —
 *  essas precisam de contexto, e uma guarda que dê falsos positivos é uma
 *  guarda que se aprende a ignorar. */
const EXIGEM_ACENTO = [
  'nao', 'ja', 'possivel', 'servico', 'servicos', 'codigo', 'codigos',
  'numero', 'numeros', 'voce', 'comecar', 'comeca', 'atribuida', 'atribuido',
  'disponivel', 'indisponivel', 'aplicacao', 'pagina', 'paginas', 'anfitriao',
  'anfitrioes', 'hospede', 'hospedes', 'proximo', 'proxima', 'proprio',
  'propria', 'maximo', 'minimo', 'invalido', 'invalida', 'obrigatorio',
  'obrigatoria', 'duracao', 'avaliacao', 'avaliacoes', 'descricao',
  'ocorrencia', 'ocorrencias', 'reputacao', 'informacao', 'utilizacao',
  'instrucoes', 'condicoes', 'confianca', 'seguranca', 'atencao', 'excepcao',
  'sessao', 'sessoes', 'permissao', 'decisao', 'razao', 'identificacao',
  'reclamacoes', 'denuncia', 'denuncias', 'analise', 'tres', 'alguem',
  'tambem', 'nivel', 'util', 'facil', 'area', 'atras', 'ate', 'apos',
  'precos', 'horarios', 'loica', 'frigorifico', 'fogao', 'lencois',
  'lavatorio', 'sofas', 'superficies', 'chao', 'electrodomesticos',
  'consumiveis', 'higienico', 'lencol', 'quarteis', 'conteudo',
]

const PADRAO = new RegExp('\\b(' + EXIGEM_ACENTO.join('|') + ')\\b', 'gi')

/** Recolhe as strings de TEXTO VISÍVEL de um ficheiro JS.
 *  Uma string é texto visível se tiver espaços e comprimento de frase, e não
 *  parecer código (SQL, selectores, URLs, chaves). */
function frasesVisiveis (fonte) {
  const frases = []
  for (const [n, linha] of fonte.split('\n').entries()) {
    const despido = linha.trimStart()
    // Comentários não são texto visível.
    if (despido.startsWith('//') || despido.startsWith('*') || despido.startsWith('/*')) continue
    for (const m of linha.matchAll(/(['"`])((?:[^'"`\\]|\\.)*?)\1/g)) {
      const t = m[2]
      if (!t.includes(' ') || t.length < 13) continue
      if (/SELECT |INSERT |UPDATE |DELETE |CREATE |https?:\/\/|^\/v1\/|\?fim=|^\s*[.#[]|font-size|margin:|padding:/.test(t)) continue
      /* Dentro de `${...}` está código — nomes de variáveis como `codigo`,
         `servico` ou `descricao` não são texto que alguém leia. Medi-los dava
         falsos positivos, e uma guarda com falsos positivos aprende-se a
         ignorar. */
      const soTexto = t.replace(/\$\{[^}]*\}/g, ' ')
      if (!soTexto.trim()) continue
      frases.push({ linha: n + 1, texto: soTexto, original: t })
    }
  }
  return frases
}

const FICHEIROS = [
  ...readdirSync(join(RAIZ, 'api', 'src')).filter(f => f.endsWith('.js') && f !== 'concelhos.js')
    .map(f => join('api', 'src', f)),
  join('_source', 'app', 'nucleo.js'),
  join('_source', 'paginas', 'esqueleto.mjs'),
  join('_source', 'paginas', 'inicio.mjs'),
  join('_source', 'paginas', 'lados.mjs'),
  join('_source', 'paginas', 'legal.mjs'),
]

let achados = 0
for (const rel of FICHEIROS) {
  const fonte = readFileSync(join(RAIZ, rel), 'utf8')
  for (const { linha, texto } of frasesVisiveis(fonte)) {
    const faltas = [...new Set([...texto.matchAll(PADRAO)].map(m => m[0]))]
    if (!faltas.length) continue
    achados++
    console.log(`  ✗ ${rel}:${linha}`)
    console.log(`      ${texto.trim().slice(0, 100)}`)
    console.log(`      sem acento: ${faltas.join(', ')}`)
  }
}

// As páginas geradas também: é o que o visitante lê.
for (const f of ['index.html', 'como-funciona.html', 'para-quem-tem-alojamento.html',
  'para-quem-limpa.html', 'apoio.html', 'termos.html', 'privacidade.html', '404.html']) {
  let html
  try { html = readFileSync(join(RAIZ, f), 'utf8') } catch { continue }
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
  const faltas = [...new Set([...texto.matchAll(PADRAO)].map(m => m[0]))]
  if (faltas.length) {
    achados++
    console.log(`  ✗ ${f} (página gerada)`)
    console.log(`      sem acento: ${faltas.join(', ')}`)
  }
}

if (achados) {
  console.log(`\n  ${achados} sítio(s) com texto visível sem acentos.\n`)
  process.exit(1)
}
console.log(`  ✓ o texto visível está acentuado (${FICHEIROS.length} ficheiros + 8 páginas)\n`)
