// Mede o contraste WCAG 2.1 de TODOS os pares declarados na paleta.
// Falha com codigo 1 se algum par ficar abaixo do minimo.
// Lido pela bateria e pelo CI. A paleta e a fonte da verdade: nao ha cores a mao.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const AQUI = dirname(fileURLToPath(import.meta.url))
export const PALETA = JSON.parse(readFileSync(join(AQUI, '..', 'marca', 'paleta.json'), 'utf8'))

// #RGB, #RRGGBB, #RRGGBBAA  ->  {r,g,b,a}  (0-255, a em 0-1)
export function lerCor (hex) {
  const s = String(hex).trim().replace(/^#/, '')
  const exp = s.length === 3 || s.length === 4
    ? s.split('').map(c => c + c).join('')
    : s
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(exp)) throw new Error(`cor invalida: ${hex}`)
  return {
    r: parseInt(exp.slice(0, 2), 16),
    g: parseInt(exp.slice(2, 4), 16),
    b: parseInt(exp.slice(4, 6), 16),
    a: exp.length === 8 ? parseInt(exp.slice(6, 8), 16) / 255 : 1,
  }
}

// Achata uma cor com alfa sobre um fundo opaco. Uma linha a 10% de preto
// NAO tem o contraste do preto: tem o contraste do resultado.
export function achatar (frente, fundo) {
  const f = lerCor(frente), b = lerCor(fundo)
  if (f.a >= 1) return f
  return {
    r: Math.round(f.r * f.a + b.r * (1 - f.a)),
    g: Math.round(f.g * f.a + b.g * (1 - f.a)),
    b: Math.round(f.b * f.a + b.b * (1 - f.a)),
    a: 1,
  }
}

export function luminancia ({ r, g, b }) {
  const c = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

export function contraste (frente, fundo) {
  const f = luminancia(achatar(frente, fundo))
  const b = luminancia(lerCor(fundo))
  const [hi, lo] = f > b ? [f, b] : [b, f]
  return (hi + 0.05) / (lo + 0.05)
}

export function medir () {
  const falhas = []
  const linhas = []
  for (const modo of ['claro', 'escuro']) {
    const cores = PALETA[modo]
    for (const par of PALETA.pares) {
      const frente = cores[par.frente]
      const fundo = cores[par.fundo]
      if (!frente) { falhas.push({ modo, ...par, erro: `cor "${par.frente}" nao existe no modo ${modo}` }); continue }
      if (!fundo) { falhas.push({ modo, ...par, erro: `cor "${par.fundo}" nao existe no modo ${modo}` }); continue }
      const razao = contraste(frente, fundo)
      const passa = razao >= par.min
      linhas.push({ modo, par: `${par.frente} / ${par.fundo}`, razao: razao.toFixed(2), min: par.min, passa })
      if (!passa) falhas.push({ modo, ...par, razao: razao.toFixed(2) })
    }
  }
  // Toda a cor declarada tem de existir nos DOIS modos, senao metade das
  // pessoas fica com uma variavel em falta e a medicao so olha para um modo.
  const soClaro = Object.keys(PALETA.claro).filter(k => !(k in PALETA.escuro))
  const soEscuro = Object.keys(PALETA.escuro).filter(k => !(k in PALETA.claro))
  for (const k of soClaro) falhas.push({ erro: `"${k}" existe no modo claro mas nao no escuro` })
  for (const k of soEscuro) falhas.push({ erro: `"${k}" existe no modo escuro mas nao no claro` })
  return { linhas, falhas }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { linhas, falhas } = medir()
  const larg = Math.max(...linhas.map(l => l.par.length))
  for (const modo of ['claro', 'escuro']) {
    console.log(`\n  ── modo ${modo} ──`)
    for (const l of linhas.filter(x => x.modo === modo)) {
      console.log(`  ${l.passa ? '✓' : '✗'} ${l.par.padEnd(larg)}  ${String(l.razao).padStart(6)}  (min ${l.min})`)
    }
  }
  console.log(`\n  ${linhas.length} pares medidos, ${falhas.length} falha(s).`)
  if (falhas.length) {
    console.log('')
    for (const f of falhas) console.log(`  ✗ ${f.erro || `[${f.modo}] ${f.frente}/${f.fundo}: ${f.razao} < ${f.min} — ${f.porque}`}`)
    process.exit(1)
  }
}
