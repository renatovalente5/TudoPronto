// Bateria da API. Percorre o caminho completo de uma limpeza, dos dois lados,
// e depois TENTA QUEBRAR as regras: ver a morada sem ter sido escolhida,
// mexer na casa de outra pessoa, avaliar duas vezes, concluir sem fotografia.
//
// Um teste que so percorre o caminho feliz nao prova nada sobre privacidade.

const BASE = process.env.API || 'http://127.0.0.1:8787'
let passou = 0, falhou = 0
const falhas = []

function ok (cond, nome, detalhe) {
  if (cond) { passou++; console.log(`  ✓ ${nome}`) }
  else { falhou++; falhas.push({ nome, detalhe }); console.log(`  ✗ ${nome}${detalhe ? ` — ${detalhe}` : ''}`) }
}

async function api (metodo, caminho, { corpo, testemunho, cru } = {}) {
  const h = {}
  if (corpo && !cru) h['Content-Type'] = 'application/json'
  if (cru) h['Content-Type'] = cru
  if (testemunho) h.Authorization = `Bearer ${testemunho}`
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: h,
    body: cru ? corpo : (corpo ? JSON.stringify(corpo) : undefined),
  })
  let dados = null
  try { dados = await r.json() } catch { dados = null }
  return { estado: r.status, dados }
}

/** A mesma derivacao que o telemovel faz. 43 caracteres base64url de 32 bytes. */
async function derivar (senha, email) {
  const enc = new TextEncoder()
  const salBruto = await crypto.subtle.digest('SHA-256', enc.encode('tudopronto.v1:' + email.toLowerCase()))
  const material = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits'])
  // Nos testes bastam poucas iteracoes: o que se testa aqui e o percurso, nao
  // a resistencia. Em producao sao as 600 000 que o cliente le de /v1/parametros.
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salBruto, iterations: 1000, hash: 'SHA-256' }, material, 256)
  return btoa(String.fromCharCode(...new Uint8Array(bits)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const marca = Math.floor(Math.random() * 1e9).toString(36)
const emailDona = `dona-${marca}@exemplo.pt`
const emailProf = `prof-${marca}@exemplo.pt`
const emailOutra = `outra-${marca}@exemplo.pt`

const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

console.log(`\n▸ Bateria da API — ${BASE}\n`)

// ─────────────────────────── 1. contas ───────────────────────────
console.log('1. Contas e sessao')
const r0 = await api('GET', '/v1/parametros')
ok(r0.estado === 200 && r0.dados.iteracoes >= 100000,
  'os parametros dizem quantas iteracoes o cliente deve fazer', JSON.stringify(r0.dados))

const rDona = await api('POST', '/v1/registar', { corpo: {
  email: emailDona, senha: await derivar('umaSenhaBoa123', emailDona),
  nome: 'Ana Dona', e_dono: true,
} })

// Bater no travao aqui nao e um defeito: e o travao a funcionar. Mas
// continuar depois disto enche o relatorio de falhas que nao sao falhas — a
// primeira vez que isto correu contra producao, duas afirmacoes sobre
// validacao de registo apareceram em vermelho e a causa era o tecto de 8
// registos por hora. Parar e dizer porque vale mais do que um relatorio que
// mente sobre o que esta mal.
if (rDona.estado === 429) {
  console.log('\n  ⚠ O travao de abuso desta API esta esgotado para este IP.')
  console.log('    Em producao sao 8 registos por hora. Espere uma hora, ou corra')
  console.log('    contra a API local (sem API=..., com `wrangler dev` a andar).')
  console.log('    A bateria para aqui: continuar daria falhas que nao sao falhas.\n')
  process.exit(2)
}
ok(rDona.estado === 201 && rDona.dados.testemunho, 'regista uma dona de alojamento', JSON.stringify(rDona.dados).slice(0, 200))
const tDona = rDona.dados?.testemunho

const rProf = await api('POST', '/v1/registar', { corpo: {
  email: emailProf, senha: await derivar('outraSenha456', emailProf),
  nome: 'Berta Profissional', e_profissional: true, concelho: 'Ovar',
} })
ok(rProf.estado === 201, 'regista uma profissional de limpeza', JSON.stringify(rProf.dados).slice(0, 200))
const tProf = rProf.dados?.testemunho

const rOutra = await api('POST', '/v1/registar', { corpo: {
  email: emailOutra, senha: await derivar('terceiraSenha789', emailOutra),
  nome: 'Carla Intrusa', e_dono: true, e_profissional: true, concelho: 'Ovar',
} })
const tOutra = rOutra.dados?.testemunho
ok(rOutra.estado === 201, 'regista uma conta com os dois papeis')

const rRepetido = await api('POST', '/v1/registar', { corpo: {
  email: emailDona, senha: await derivar('xpto', emailDona), nome: 'Impostora', e_dono: true,
} })
ok(rRepetido.estado === 409, 'recusa registar o mesmo email duas vezes')

const rSemPapel = await api('POST', '/v1/registar', { corpo: {
  email: `x-${marca}@exemplo.pt`, senha: await derivar('abc', `x-${marca}@exemplo.pt`), nome: 'Sem Papel',
} })
ok(rSemPapel.estado === 400, 'recusa uma conta que nao e nem dona nem profissional')

const rMa = await api('POST', '/v1/entrar', { corpo: {
  email: emailDona, senha: await derivar('senhaErrada', emailDona),
} })
ok(rMa.estado === 401, 'recusa a senha errada')

const rInexistente = await api('POST', '/v1/entrar', { corpo: {
  email: `nao-existe-${marca}@exemplo.pt`, senha: await derivar('x', `nao-existe-${marca}@exemplo.pt`),
} })
ok(rInexistente.estado === 401 && rInexistente.dados.erro === rMa.dados.erro,
  'diz a MESMA coisa a senha errada e a email desconhecido (nao revela quem tem conta)',
  `${rMa.dados?.erro} vs ${rInexistente.dados?.erro}`)

const rEu = await api('GET', '/v1/eu', { testemunho: tDona })
ok(rEu.estado === 200 && rEu.dados.conta.email === emailDona, 'devolve a propria conta')

const rSemSessao = await api('GET', '/v1/eu')
ok(rSemSessao.estado === 401, 'recusa sem sessao')

const rTestemunhoFalso = await api('GET', '/v1/eu', { testemunho: 'a'.repeat(64) })
ok(rTestemunhoFalso.estado === 401, 'recusa um testemunho inventado')

// ────────────────────── 2. alojamentos ──────────────────────
console.log('\n2. Alojamentos')
const rAloj = await api('POST', '/v1/alojamentos', { testemunho: tDona, corpo: {
  nome: 'T2 da Praia', tipologia: 'T2', quartos: 2, camas: 3, casas_banho: 1,
  concelho: 'Ovar', freguesia: 'Esmoriz', morada: 'Rua das Gaivotas, 14, 2.º Dto',
  codigo_postal: '3885-000', acesso: 'Caixa de chaves ao lado da porta, codigo 4471',
  instrucoes: 'A maquina de lavar esta na varanda.', registo_al: '12345/AL',
} })
ok(rAloj.estado === 201, 'cria um alojamento', JSON.stringify(rAloj.dados).slice(0, 250))
const alojId = rAloj.dados?.alojamento?.id

const rTarefas = await api('GET', `/v1/alojamentos/${alojId}/tarefas`, { testemunho: tDona })
ok(rTarefas.estado === 200 && rTarefas.dados.tarefas.length >= 15,
  'o alojamento nasce com uma lista de tarefas de partida',
  `${rTarefas.dados?.tarefas?.length} tarefas`)
ok((rTarefas.dados?.tarefas || []).some(t => t.exige_foto),
  'algumas tarefas da lista de partida exigem fotografia')

const rConcelhoMau = await api('POST', '/v1/alojamentos', { testemunho: tDona, corpo: {
  nome: 'X', tipologia: 'T1', concelho: 'Concelho Inventado', morada: 'Rua Nenhuma, 1',
} })
ok(rConcelhoMau.estado === 400, 'recusa um concelho que nao existe')

const rProfCriaAloj = await api('POST', '/v1/alojamentos', { testemunho: tProf, corpo: {
  nome: 'Casa da Berta', tipologia: 'T1', concelho: 'Ovar', morada: 'Rua A, 1',
} })
ok(rProfCriaAloj.estado === 403, 'uma profissional sem papel de dona nao cria alojamentos')

const rIntrusaVeAloj = await api('GET', `/v1/alojamentos/${alojId}`, { testemunho: tOutra })
ok(rIntrusaVeAloj.estado === 403, 'ninguem abre o alojamento de outra pessoa')

// ──────────────────────── 3. servicos ────────────────────────
console.log('\n3. Criar a limpeza')
const rServ = await api('POST', '/v1/servicos', { testemunho: tDona, corpo: {
  alojamento_id: alojId, data: amanha, hora_inicio: '11:00', hora_limite: '15:00',
  tipo: 'saida', valor: 3500, muda_roupa: true, notas: 'Saem 4 pessoas.',
} })
ok(rServ.estado === 201, 'cria uma limpeza', JSON.stringify(rServ.dados).slice(0, 250))
const servId = rServ.dados?.servico?.id

const rHoraMa = await api('POST', '/v1/servicos', { testemunho: tDona, corpo: {
  alojamento_id: alojId, data: amanha, hora_inicio: '15:00', hora_limite: '11:00',
} })
ok(rHoraMa.estado === 400, 'recusa uma hora limite anterior a hora de entrada')

const rOntem = await api('POST', '/v1/servicos', { testemunho: tDona, corpo: {
  alojamento_id: alojId, data: '2020-01-01', hora_inicio: '11:00', hora_limite: '15:00',
} })
ok(rOntem.estado === 400, 'recusa marcar uma limpeza para uma data que ja passou')

// ───────────── 4. o mercado e o que ele NAO mostra ─────────────
console.log('\n4. Mercado e privacidade da morada')
const rMercado = await api('GET', '/v1/mercado', { testemunho: tProf })
ok(rMercado.estado === 200, 'a profissional ve o mercado')
const noMercado = (rMercado.dados?.servicos || []).find(s => s.id === servId)
ok(!!noMercado, 'a limpeza criada aparece no mercado')
ok(noMercado?.alojamento?.concelho === 'Ovar', 'o mercado mostra o concelho')
ok(noMercado?.alojamento?.morada === undefined,
  'o mercado NAO mostra a morada', JSON.stringify(noMercado?.alojamento))
ok(noMercado?.alojamento?.acesso === undefined,
  'o mercado NAO mostra o codigo da caixa de chaves')
ok(noMercado?.distancia_km !== undefined, 'o mercado diz a distancia aproximada')

const rVerAntes = await api('GET', `/v1/servicos/${servId}`, { testemunho: tProf })
ok(rVerAntes.estado === 200, 'a profissional abre a ficha da limpeza aberta')
ok(rVerAntes.dados?.servico?.alojamento?.morada === undefined,
  'ANTES de ser escolhida, a morada continua escondida',
  JSON.stringify(rVerAntes.dados?.servico?.alojamento))
ok(rVerAntes.dados?.servico?.alojamento?.acesso === undefined,
  'ANTES de ser escolhida, o codigo de acesso continua escondido')

// ───────────────── 5. candidatura e atribuicao ─────────────────
console.log('\n5. Candidatar e escolher')
const rCand = await api('POST', `/v1/servicos/${servId}/candidatar`, { testemunho: tProf, corpo: {
  valor: 4000, mensagem: 'Posso ir as 11h30.',
} })
ok(rCand.estado === 201 && rCand.dados.atribuido === false,
  'a profissional candidata-se e NAO fica logo com o servico (o dono e que escolhe)',
  JSON.stringify(rCand.dados))

const rCandRepetida = await api('POST', `/v1/servicos/${servId}/candidatar`, { testemunho: tProf, corpo: {} })
ok(rCandRepetida.estado === 409, 'recusa candidatar-se duas vezes a mesma limpeza')

const rDonaVe = await api('GET', `/v1/servicos/${servId}`, { testemunho: tDona })
ok((rDonaVe.dados?.servico?.candidaturas || []).length === 1, 'a dona ve a candidatura')
const cand = rDonaVe.dados?.servico?.candidaturas?.[0]
ok(cand?.valor === 4000, 'a dona ve a contraproposta de valor')
ok(cand?.profissional?.nome === 'Berta Profissional', 'a dona ve quem se ofereceu')
ok(cand?.profissional?.n_concluidos === 0, 'a dona ve o historico de quem se ofereceu')

const rIntrusaAceita = await api('POST', `/v1/candidaturas/${cand?.id}/aceitar`, { testemunho: tOutra })
ok(rIntrusaAceita.estado === 403, 'ninguem aceita candidaturas de limpezas que nao sao suas')

const rAceitar = await api('POST', `/v1/candidaturas/${cand?.id}/aceitar`, { testemunho: tDona })
ok(rAceitar.estado === 200, 'a dona aceita a candidatura', JSON.stringify(rAceitar.dados))

const rDepois = await api('GET', `/v1/servicos/${servId}`, { testemunho: tProf })
ok(rDepois.dados?.servico?.estado === 'atribuido', 'a limpeza passa a atribuida')
ok(rDepois.dados?.servico?.alojamento?.morada === 'Rua das Gaivotas, 14, 2.º Dto',
  'DEPOIS de escolhida, a profissional ve a morada',
  JSON.stringify(rDepois.dados?.servico?.alojamento?.morada))
ok(rDepois.dados?.servico?.alojamento?.acesso?.includes('4471'),
  'DEPOIS de escolhida, ve o codigo da caixa de chaves')
ok(rDepois.dados?.servico?.dono?.nome === 'Ana Dona', 've quem e a dona')
ok((rDepois.dados?.servico?.tarefas || []).length >= 15,
  'a limpeza tem a sua propria copia da lista de tarefas',
  `${rDepois.dados?.servico?.tarefas?.length}`)

const rTerceiraVe = await api('GET', `/v1/servicos/${servId}`, { testemunho: tOutra })
ok(rTerceiraVe.estado === 403,
  'depois de atribuida, quem nao esta nela nem sequer a abre', JSON.stringify(rTerceiraVe.dados))

// ──────────────── 6. fazer o trabalho ────────────────
console.log('\n6. Fazer a limpeza')
const tarefas = rDepois.dados?.servico?.tarefas || []
const comFoto = tarefas.filter(t => t.exige_foto)
const semFoto = tarefas.filter(t => !t.exige_foto)

const rIniciar = await api('POST', `/v1/servicos/${servId}/iniciar`, { testemunho: tProf })
ok(rIniciar.estado === 200, 'a profissional marca que chegou')

const rDonaMarca = await api('POST', `/v1/servicos/${servId}/tarefas/${semFoto[0]?.id}`, {
  testemunho: tDona, corpo: { feita: true } })
ok(rDonaMarca.estado === 403, 'a dona NAO pode marcar tarefas como feitas')

const rMarcar = await api('POST', `/v1/servicos/${servId}/tarefas/${semFoto[0]?.id}`, {
  testemunho: tProf, corpo: { feita: true } })
ok(rMarcar.estado === 200, 'a profissional marca uma tarefa sem fotografia')

const rSemFoto = await api('POST', `/v1/servicos/${servId}/tarefas/${comFoto[0]?.id}`, {
  testemunho: tProf, corpo: { feita: true } })
ok(rSemFoto.estado === 400, 'recusa dar por feita uma tarefa que exige fotografia, sem fotografia')

// Uma fotografia a serio: 1x1 PNG.
const png = Uint8Array.from(atob(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
), c => c.charCodeAt(0))

let fotoId = null
for (const t of comFoto) {
  const rFoto = await fetch(`${BASE}/v1/fotos?fim=tarefa&servico=${servId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png', Authorization: `Bearer ${tProf}` },
    body: png,
  })
  const d = await rFoto.json()
  if (!fotoId) { fotoId = d.id; ok(rFoto.status === 201 && d.id, 'envia uma fotografia', JSON.stringify(d)) }
  await api('POST', `/v1/servicos/${servId}/tarefas/${t.id}`, {
    testemunho: tProf, corpo: { feita: true, foto_id: d.id } })
}

const rImagem = await fetch(`${BASE}/f/${fotoId}`)
ok(rImagem.status === 200 && rImagem.headers.get('Content-Type') === 'image/png',
  'a fotografia serve-se pelo seu endereco', `${rImagem.status} ${rImagem.headers.get('Content-Type')}`)

const rTexto = await fetch(`${BASE}/v1/fotos?fim=tarefa&servico=${servId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'text/html', Authorization: `Bearer ${tProf}` },
  body: '<script>alert(1)</script>',
})
ok(rTexto.status === 400, 'recusa enviar seja o que for que nao seja uma fotografia')

const rOcor = await api('POST', `/v1/servicos/${servId}/ocorrencias`, { testemunho: tProf, corpo: {
  tipo: 'dano', descricao: 'Um copo partido na cozinha.', foto_id: fotoId } })
ok(rOcor.estado === 201, 'regista uma ocorrencia com fotografia')

const rConcluir = await api('POST', `/v1/servicos/${servId}/concluir`, { testemunho: tProf })
ok(rConcluir.estado === 200, 'a profissional dá por terminado: tudo pronto', JSON.stringify(rConcluir.dados))

const rEstado = await api('GET', `/v1/servicos/${servId}`, { testemunho: tDona })
ok(rEstado.dados?.servico?.estado === 'concluido', 'a limpeza fica concluida')

// ────────────── 7. avaliacoes em duplo-cego ──────────────
console.log('\n7. Avaliacoes com revelacao simultanea')
const rAvDona = await api('POST', `/v1/servicos/${servId}/avaliar`, { testemunho: tDona, corpo: {
  estrelas: 5, etiquetas: ['Pontual', 'Casa impecavel'], comentario: 'Ficou tudo impecavel.' } })
ok(rAvDona.estado === 201 && rAvDona.dados.revelada === false,
  'a primeira avaliacao fica ESCONDIDA ate a outra parte avaliar', JSON.stringify(rAvDona.dados))

const rVerEscondida = await api('GET', `/v1/servicos/${servId}/avaliacoes`, { testemunho: tProf })
const daDona = (rVerEscondida.dados?.avaliacoes || []).find(a => a.autor_id !== undefined && a.escondida)
ok(!!daDona, 'a profissional sabe que foi avaliada mas NAO ve o que escreveram')
ok(daDona?.estrelas === undefined, 'nem sequer ve as estrelas antes de avaliar tambem')

const rPerfilAntes = await api('GET', `/v1/perfil/${rProf.dados.conta.id}`, { testemunho: tDona })
ok(rPerfilAntes.dados?.perfil?.n_avaliacoes === 0,
  'a avaliacao escondida ainda NAO conta para a media (senao adivinhava-se pela media a mexer)')

const rAvDupla = await api('POST', `/v1/servicos/${servId}/avaliar`, { testemunho: tDona, corpo: { estrelas: 1 } })
ok(rAvDupla.estado === 409, 'ninguem avalia a mesma limpeza duas vezes')

const rAvProf = await api('POST', `/v1/servicos/${servId}/avaliar`, { testemunho: tProf, corpo: {
  estrelas: 4, etiquetas: ['Instrucoes claras'], comentario: 'Casa bem organizada.' } })
ok(rAvProf.estado === 201 && rAvProf.dados.revelada === true,
  'quando a segunda avalia, as DUAS aparecem ao mesmo tempo', JSON.stringify(rAvProf.dados))

const rReveladas = await api('GET', `/v1/servicos/${servId}/avaliacoes`, { testemunho: tProf })
ok((rReveladas.dados?.avaliacoes || []).every(a => !a.escondida),
  'depois da revelacao, as duas partes veem tudo')

const rPerfil = await api('GET', `/v1/perfil/${rProf.dados.conta.id}`, { testemunho: tDona })
ok(rPerfil.dados?.perfil?.estrelas === 5, 'a media da profissional passa a 5', JSON.stringify(rPerfil.dados?.perfil))
ok(rPerfil.dados?.perfil?.n_avaliacoes === 1, 'com uma avaliacao contada')
ok(rPerfil.dados?.perfil?.n_concluidos === 1, 'e uma limpeza concluida')
ok((rPerfil.dados?.avaliacoes || [])[0]?.comentario === 'Ficou tudo impecavel.',
  'o comentario aparece no perfil publico')

const rEtiquetaInventada = await api('GET', '/v1/etiquetas')
ok(rEtiquetaInventada.estado === 200 && rEtiquetaInventada.dados.profissional.length >= 6,
  'ha uma lista fechada de etiquetas')

// ───────────────── 8. equipa de confianca ─────────────────
console.log('\n8. Equipa de confianca')
const rConvite = await api('POST', '/v1/equipa/convidar', { testemunho: tDona, corpo: {
  alcunha: 'Berta', email: emailProf } })
ok(rConvite.estado === 201 && rConvite.dados.ja_tinha_conta === true,
  'convidar quem ja tem conta liga logo, sem codigo', JSON.stringify(rConvite.dados))

const emailNovo = `nova-${marca}@exemplo.pt`
const rConvite2 = await api('POST', '/v1/equipa/convidar', { testemunho: tDona, corpo: {
  alcunha: 'Dona Rosa', email: emailNovo } })
ok(rConvite2.estado === 201 && /^\d{6}$/.test(rConvite2.dados.codigo || ''),
  'convidar quem ainda nao tem conta gera um codigo de 6 algarismos', JSON.stringify(rConvite2.dados))

const rEquipa = await api('GET', '/v1/equipa', { testemunho: tDona })
ok((rEquipa.dados?.minha_equipa || []).length === 2, 'a equipa tem duas pessoas')

const rDirecto = await api('POST', '/v1/servicos', { testemunho: tDona, corpo: {
  alojamento_id: alojId, data: amanha, hora_inicio: '11:00', hora_limite: '15:00',
  visibilidade: 'directo', profissional_id: rProf.dados.conta.id, valor: 4000 } })
ok(rDirecto.estado === 201 && rDirecto.dados.servico.estado === 'atribuido',
  'entregar uma limpeza directamente a alguem da equipa ja nasce atribuida',
  JSON.stringify(rDirecto.dados?.servico?.estado))

const rDirectoEstranho = await api('POST', '/v1/servicos', { testemunho: tDona, corpo: {
  alojamento_id: alojId, data: amanha, hora_inicio: '11:00', hora_limite: '15:00',
  visibilidade: 'directo', profissional_id: rOutra.dados.conta.id } })
ok(rDirectoEstranho.estado === 400, 'nao se entrega uma limpeza a quem nao esta na equipa')

const rMercadoDirecto = await api('GET', '/v1/mercado', { testemunho: tOutra })
ok(!(rMercadoDirecto.dados?.servicos || []).some(s => s.id === rDirecto.dados.servico.id),
  'uma limpeza entregue directamente NAO aparece no mercado')

// ───────────────── 9. mensagens ─────────────────
console.log('\n9. Mensagens')
const rMsg = await api('POST', `/v1/servicos/${servId}/mensagens`, { testemunho: tDona, corpo: {
  texto: 'Obrigada! A proxima e na sexta.' } })
ok(rMsg.estado === 201, 'a dona escreve na conversa da limpeza')

const rMsgIntrusa = await api('POST', `/v1/servicos/${servId}/mensagens`, { testemunho: tOutra, corpo: {
  texto: 'Ola?' } })
ok(rMsgIntrusa.estado === 403, 'ninguem escreve numa conversa que nao e sua')

const rLerMsg = await api('GET', `/v1/servicos/${servId}/mensagens`, { testemunho: tProf })
ok((rLerMsg.dados?.mensagens || []).length === 1, 'a profissional le a mensagem')

const rLerMsgIntrusa = await api('GET', `/v1/servicos/${servId}/mensagens`, { testemunho: tOutra })
ok(rLerMsgIntrusa.estado === 403, 'ninguem le uma conversa que nao e sua')

// ───────────────── 10. avisos ─────────────────
console.log('\n10. Avisos')
const rAvisos = await api('GET', '/v1/avisos', { testemunho: tProf })
ok(rAvisos.estado === 200 && (rAvisos.dados?.avisos || []).length > 0,
  'a profissional recebeu avisos ao longo do percurso',
  `${rAvisos.dados?.avisos?.length} avisos`)
const tipos = new Set((rAvisos.dados?.avisos || []).map(a => a.tipo))
ok(tipos.has('atribuido'), 'foi avisada de que ficou com a limpeza')

// ───────────────── 11. o travao trava ─────────────────
// Um travao que nao trava nao e travao. Este teste prova que trava, e o
// numero de tentativas que gasta e de proposito maior do que o tecto.
console.log('\n11. Travão de abuso')
{
  // O tecto do registo é 8/hora em produção. Fora de produção sobe 50x, para
  // a bateria de browser poder correr — e o teste ajusta-se em vez de passar
  // a verde sem ter provado nada.
  const factor = r0.dados?.factor_travao ?? 1
  const tecto = 8 * factor
  const maximo = tecto + 4
  let travou = false
  let tentativas = 0
  for (let i = 0; i < maximo; i++) {
    tentativas++
    const e = `travao-${marca}-${i}@exemplo.pt`
    const r = await api('POST', '/v1/registar', { corpo: {
      email: e, senha: await derivar('senhaQualquer', e), nome: 'Travão Teste', e_dono: true,
    } })
    if (r.estado === 429) { travou = true; break }
  }
  ok(travou,
    `o travão trava o registo em massa (tecto ${tecto}, parou à ${tentativas}.ª tentativa)`,
    travou ? '' : `fez ${maximo} registos seguidos sem travar`)
}

// ───────────────── resumo ─────────────────
console.log(`\n${'─'.repeat(60)}`)
console.log(`  ${passou} passaram, ${falhou} falharam`)
if (falhou) {
  console.log('')
  for (const f of falhas) console.log(`  ✗ ${f.nome}${f.detalhe ? `\n      ${f.detalhe}` : ''}`)
  process.exit(1)
}
console.log('  Tudo pronto.\n')
