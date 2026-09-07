// Service worker do Tudo Pronto.
//
// Duas regras que vem de erros ja pagos noutros projectos:
//
//  1. O HTML vai PRIMEIRO A REDE; o resto vai primeiro a cache. O endereco do
//     HTML e a unica coisa que nao muda quando se publica uma versao nova —
//     servi-lo da cache prende a pessoa a uma versao antiga para sempre.
//
//  2. O ambito e a pasta da aplicacao, nao a raiz. Um service worker na raiz
//     apanharia o site de apresentacao tambem, e a pagina inicial passaria a
//     ser servida da cache com a aplicacao no lugar dela.

const VERSAO = '7192402a'
const CACHE = `tudopronto-${VERSAO}`
const PREFIXO = '/TudoPronto'

const CASCO = [
  `${PREFIXO}/app/`,
  `${PREFIXO}/app/index.html`,
  `${PREFIXO}/app/estilo.css?v=${VERSAO}`,
  `${PREFIXO}/app/nucleo.js?v=${VERSAO}`,
  `${PREFIXO}/app/manifesto.json`,
  `${PREFIXO}/icone.svg`,
]

self.addEventListener('install', (ev) => {
  ev.waitUntil((async () => {
    const c = await caches.open(CACHE)
    // `cache: 'reload'` obriga a ir a rede buscar cada ficheiro do casco. Sem
    // isto o pre-carregamento serve-se da cache HTTP do navegador (que o
    // GitHub Pages mantem 10 minutos) e instala-se uma versao nova com
    // ficheiros velhos lá dentro.
    await Promise.allSettled(CASCO.map(u =>
      fetch(new Request(u, { cache: 'reload' })).then(r => r.ok && c.put(u, r))))
    self.skipWaiting()
  })())
})

self.addEventListener('activate', (ev) => {
  ev.waitUntil((async () => {
    for (const nome of await caches.keys()) {
      if (nome.startsWith('tudopronto-') && nome !== CACHE) await caches.delete(nome)
    }
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (ev) => {
  const p = ev.request
  if (p.method !== 'GET') return
  const url = new URL(p.url)

  // A API nunca e cacheada aqui. Quem guarda o que a aplicacao precisa offline
  // e o IndexedDB do nucleo, que sabe o que faz sentido guardar; uma resposta
  // de API em cache devolveria dados velhos sem ninguem saber.
  if (url.origin !== location.origin) return

  const eHTML = p.mode === 'navigate' ||
    (p.headers.get('accept') || '').includes('text/html')

  if (eHTML) {
    // Primeiro a rede. Se falhar, a aplicacao guardada — que e melhor do que o
    // dinossauro do navegador.
    ev.respondWith((async () => {
      try {
        const r = await fetch(p)
        if (r.ok) {
          const c = await caches.open(CACHE)
          c.put(`${PREFIXO}/app/index.html`, r.clone())
        }
        return r
      } catch {
        return (await caches.match(`${PREFIXO}/app/index.html`)) ||
          new Response('<h1>Sem ligação</h1><p>Abra outra vez quando tiver rede.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }
    })())
    return
  }

  // Tudo o resto: primeiro a cache. Os enderecos levam `?v=` carimbado no
  // build, por isso uma versao nova tem endereco novo e nunca colide.
  ev.respondWith((async () => {
    const guardado = await caches.match(p)
    if (guardado) return guardado
    try {
      const r = await fetch(p)
      if (r.ok && (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') ||
                   url.pathname.endsWith('.svg') || url.pathname.endsWith('.json'))) {
        const c = await caches.open(CACHE)
        c.put(p, r.clone())
      }
      return r
    } catch {
      return new Response('', { status: 504 })
    }
  })())
})

// Os avisos chegam sem carga util: cifrar por destinatario exigiria
// ECDH+HKDF+AES-GCM, que nao cabe confortavelmente nos 10 ms de CPU do plano
// gratuito quando saem varios avisos ao mesmo tempo. O texto e generico e a
// aplicacao mostra o que ha de novo quando se abre.
self.addEventListener('push', (ev) => {
  let dados = {}
  try { dados = ev.data ? ev.data.json() : {} } catch {}
  ev.waitUntil(self.registration.showNotification(
    dados.titulo || 'Tudo Pronto',
    {
      body: dados.corpo || 'Tem novidades nas suas limpezas.',
      icon: `${PREFIXO}/icone-192.png`,
      badge: `${PREFIXO}/icone-192.png`,
      tag: dados.tag || 'tudopronto',
      data: { ligacao: dados.ligacao || `${PREFIXO}/app/` },
      lang: 'pt-PT',
    },
  ))
})

self.addEventListener('notificationclick', (ev) => {
  ev.notification.close()
  const destino = ev.notification.data?.ligacao || `${PREFIXO}/app/`
  ev.waitUntil((async () => {
    const abertos = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of abertos) {
      if (c.url.includes(`${PREFIXO}/app/`)) { await c.focus(); return c.navigate(destino).catch(() => {}) }
    }
    return self.clients.openWindow(destino)
  })())
})
