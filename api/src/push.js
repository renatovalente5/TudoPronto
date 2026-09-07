// Avisos push (Web Push, VAPID). Gratuito e sem terceiros: o Worker assina o
// JWT e fala directamente com o servidor de push do navegador.
//
// No iOS so funciona em aplicacao INSTALADA no ecra principal (16.4+). Nao ha
// forma de o pedir a quem so abriu o site — por isso o convite a instalar tem
// de ser interface nossa: o `beforeinstallprompt` nunca existiu na Apple.

import { paraHex } from './util.js'

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const deB64url = (s) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
  return Uint8Array.from(b, c => c.charCodeAt(0))
}

async function chaveVAPID (segredoB64) {
  const d = deB64url(segredoB64)
  return crypto.subtle.importKey('pkcs8', d, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

/** Envia um aviso. Devolve 'ok' | 'morto' | 'falhou'. 'morto' quer dizer que a
 *  subscricao deixou de existir (404/410) e deve ser apagada — senao a tabela
 *  enche-se de telemoveis que ja nao existem e cada aviso gasta pedidos a toa. */
export async function enviarPush (env, sub, { titulo, corpo, ligacao }) {
  if (!env.VAPID_PRIVADA || !env.VAPID_PUBLICA || !env.VAPID_CONTACTO) return 'falhou'
  try {
    const url = new URL(sub.endpoint)
    const agora = Math.floor(Date.now() / 1000)
    const cabecalho = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
    const corpoJwt = b64url(new TextEncoder().encode(JSON.stringify({
      aud: url.origin,
      exp: agora + 12 * 3600,
      sub: env.VAPID_CONTACTO,
    })))
    const chave = await chaveVAPID(env.VAPID_PRIVADA)
    const assinatura = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' }, chave,
      new TextEncoder().encode(`${cabecalho}.${corpoJwt}`),
    )
    const jwt = `${cabecalho}.${corpoJwt}.${b64url(assinatura)}`

    // Sem carga util cifrada: o aviso vai vazio e a aplicacao vai buscar o que
    // ha de novo. Cifrar exigiria ECDH+HKDF+AES-GCM por destinatario, que nao
    // cabe confortavelmente em 10 ms de CPU quando ha varios avisos a sair.
    const r = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        TTL: '86400',
        Urgency: 'normal',
        Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLICA}`,
      },
    })
    if (r.status === 404 || r.status === 410) return 'morto'
    return r.ok ? 'ok' : 'falhou'
  } catch (e) {
    console.log('[push] falhou:', e.message)
    return 'falhou'
  }
}

/** Grava o aviso na base (que e o que a aplicacao le) e tenta o push. A base e
 *  a fonte da verdade: um push perdido nao pode fazer desaparecer o aviso. */
export async function avisar (env, contaId, { tipo, titulo, corpo, ligacao }) {
  const { novoId, AGORA } = await import('./util.js')
  await env.BD.prepare(`
    INSERT INTO avisos (id, conta_id, tipo, titulo, corpo, ligacao, criado_em)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  ).bind(novoId(), contaId, tipo, titulo, corpo || null, ligacao || null, AGORA()).run()

  const subs = await env.BD.prepare(
    'SELECT id, endpoint, p256dh, auth FROM push WHERE conta_id = ?1 LIMIT 5'
  ).bind(contaId).all()

  for (const s of subs.results || []) {
    const r = await enviarPush(env, s, { titulo, corpo, ligacao })
    if (r === 'morto') {
      await env.BD.prepare('DELETE FROM push WHERE id = ?1').bind(s.id).run()
    }
  }
}
