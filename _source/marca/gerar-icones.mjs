/* Gera os ícones PNG a partir do SVG, com o Chrome.
   Corre-se à mão quando a marca mudar: node _source/marca/gerar-icones.mjs
   Os PNG ficam versionados, porque o GitHub Pages não os pode gerar. */
import { writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { abrirChrome, novoSeparador, esperar } from '../verificar/chrome.mjs'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..', '..')

/* O ícone "maskable" precisa de margem: o Android recorta-o em círculo, e um
   desenho encostado às bordas fica sem cantos. A zona segura é os 80 % do
   centro, por isso o desenho é reduzido a 62 %. */
const svg = (tamanho, mascara) => {
  const escala = mascara ? 0.62 : 0.84
  const desvio = (1 - escala) / 2 * 32
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="${mascara ? 0 : 7}" fill="#0F6E68"/>
  <g transform="translate(${desvio} ${desvio}) scale(${escala})">
    <path d="M16 3.4 3.6 12.2v15.2a1.5 1.5 0 0 0 1.5 1.5h21.8a1.5 1.5 0 0 0 1.5-1.5V12.2L16 3.4Z"
          fill="none" stroke="#FBF9F5" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M10.7 17.9l3.9 4.1 7-8" fill="none" stroke="#FBF9F5" stroke-width="2.7"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`
}

const ICONES = [
  ['icone-180.png', 180, false],
  ['icone-192.png', 192, false],
  ['icone-512.png', 512, false],
  ['icone-mascara.png', 512, true],
]

const { enviar, fechar } = await abrirChrome({ tecto: 30000 })
const { sessionId } = await novoSeparador(enviar)

for (const [nome, tamanho, mascara] of ICONES) {
  await enviar('Emulation.setDeviceMetricsOverride', {
    width: tamanho, height: tamanho, deviceScaleFactor: 1, mobile: false,
  }, sessionId)
  const html = `<!doctype html><meta charset="utf-8">
    <style>html,body{margin:0;padding:0;width:${tamanho}px;height:${tamanho}px;overflow:hidden}</style>
    ${svg(tamanho, mascara)}`
  await enviar('Page.navigate', {
    url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html),
  }, sessionId)
  await esperar(400)
  const { data } = await enviar('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width: tamanho, height: tamanho, scale: 1 },
    captureBeyondViewport: true,
  }, sessionId)
  writeFileSync(join(RAIZ, nome), Buffer.from(data, 'base64'))
  console.log(`  ${nome} — ${tamanho}×${tamanho}${mascara ? ' (recortável)' : ''}`)
}

await fechar()
console.log('')
