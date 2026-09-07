// Envio de email.
//
// Porque Mailjet e nao os outros: e o unico servico decente que aceita um
// REMETENTE UNICO confirmado por ligacao, sem obrigar a autenticar um dominio
// por DNS — util enquanto o tudopronto.pt nao estiver comprado. A Resend so
// entrega ao endereco da propria conta enquanto nao houver dominio; a Brevo
// reescreve o remetente para um endereco de maquina e carimba "Sent with
// Brevo" no plano gratuito, o que e a forma exacta de uma burla parecer uma
// burla; o Cloudflare Email Sending exige Workers Paid.
//
// Assim que o dominio existir, autenticar SPF/DKIM. Sem alinhamento o codigo
// cai no spam, e um codigo no spam e pior do que codigo nenhum: a pessoa
// conclui que a aplicacao esta avariada em vez de tentar outra vez.

const REMETENTE_NOME = 'Tudo Pronto'

/** Envia e devolve true/false. NUNCA lanca: um email que nao sai nao pode
 *  derrubar o registo de uma conta que ja foi criada. Quem chama decide. */
export async function enviar (env, { para, nome, assunto, texto, html }) {
  if (!env.MAILJET_CHAVE || !env.MAILJET_SEGREDO || !env.MAILJET_REMETENTE) {
    console.log('[correio] sem credenciais; email nao enviado:', assunto, '->', para)
    return false
  }
  try {
    const r = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${env.MAILJET_CHAVE}:${env.MAILJET_SEGREDO}`),
      },
      body: JSON.stringify({
        Messages: [{
          From: { Email: env.MAILJET_REMETENTE, Name: REMETENTE_NOME },
          To: [{ Email: para, Name: nome || para }],
          Subject: assunto,
          TextPart: texto,
          HTMLPart: html || undefined,
        }],
      }),
    })
    if (!r.ok) {
      console.log('[correio] mailjet devolveu', r.status, (await r.text()).slice(0, 300))
      return false
    }
    return true
  } catch (e) {
    console.log('[correio] falhou:', e.message)
    return false
  }
}

const ENVOLVER = (titulo, corpo) => `<!doctype html>
<html lang="pt"><head><meta charset="utf-8"><title>${titulo}</title></head>
<body style="margin:0;padding:24px;background:#FBF9F5;font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1B2528">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #1B252819">
    <div style="font-weight:700;font-size:18px;color:#0F6E68;margin-bottom:24px">Tudo Pronto</div>
    ${corpo}
    <hr style="border:0;border-top:1px solid #1B252819;margin:28px 0">
    <p style="font-size:13px;color:#59696E;margin:0">
      Recebeu esta mensagem porque alguém a escreveu no Tudo Pronto.
      Se não foi você, ignore — sem fazer nada, nada acontece.
    </p>
  </div>
</body></html>`

export const modelos = {
  codigo (codigo, fim) {
    const porque = fim === 'recuperar'
      ? 'Pediu para recuperar o acesso à sua conta.'
      : 'Falta só confirmar o seu email.'
    return {
      assunto: `${codigo} — o seu código do Tudo Pronto`,
      texto: `${porque}\n\nO seu código é: ${codigo}\n\n`
        + 'Escreva-o na aplicação. Vale 20 minutos.\n'
        + 'Se não foi você que pediu, ignore esta mensagem.',
      html: ENVOLVER('O seu código', `
        <p style="margin:0 0 16px">${porque}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#59696E">Escreva este código na aplicação:</p>
        <div style="font-size:38px;font-weight:700;letter-spacing:.18em;color:#0F6E68;background:#E4F0EE;border-radius:12px;padding:18px;text-align:center;margin:0 0 16px">${codigo}</div>
        <p style="margin:0;font-size:14px;color:#59696E">Vale 20 minutos.</p>`),
    }
  },

  convite (nomeDono, codigo, ligacao) {
    return {
      assunto: `${nomeDono} convidou-a para a equipa no Tudo Pronto`,
      texto: `${nomeDono} usa o Tudo Pronto para combinar as limpezas do alojamento `
        + `e quer combiná-las consigo.\n\nO seu código de convite: ${codigo}\n\n`
        + `Abra ${ligacao} e escreva o código.\n`
        + `É gratuito e não a obriga a nada: continua a combinar preços e horários `
        + `directamente com ${nomeDono}.`,
      html: ENVOLVER('Convite', `
        <p style="margin:0 0 16px"><strong>${nomeDono}</strong> usa o Tudo Pronto para combinar
          as limpezas do alojamento, e quer combiná-las consigo.</p>
        <p style="margin:0 0 8px;font-size:14px;color:#59696E">O seu código de convite:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:.16em;color:#0F6E68;background:#E4F0EE;border-radius:12px;padding:16px;text-align:center;margin:0 0 20px">${codigo}</div>
        <p style="margin:0 0 20px"><a href="${ligacao}" style="display:inline-block;background:#0F6E68;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:600">Abrir o Tudo Pronto</a></p>
        <p style="margin:0;font-size:14px;color:#59696E">É gratuito. Continua a combinar preços e
          horários directamente com ${nomeDono} — o Tudo Pronto só serve para não se perderem
          datas e recados.</p>`),
    }
  },

  servicoAtribuido (nomeProf, quando, alojamento, ligacao) {
    return {
      assunto: `${nomeProf} ficou com a limpeza de ${quando}`,
      texto: `${nomeProf} vai tratar de "${alojamento}" em ${quando}.\n\n`
        + `Ver os detalhes: ${ligacao}`,
      html: ENVOLVER('Limpeza combinada', `
        <p style="margin:0 0 16px"><strong>${nomeProf}</strong> vai tratar de
          <strong>${alojamento}</strong> em ${quando}.</p>
        <p style="margin:0"><a href="${ligacao}" style="display:inline-block;background:#0F6E68;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:600">Ver os detalhes</a></p>`),
    }
  },

  tudoPronto (nomeProf, alojamento, ligacao) {
    return {
      assunto: `Tudo pronto em ${alojamento}`,
      texto: `${nomeProf} terminou a limpeza de "${alojamento}".\n\n`
        + `Ver as fotografias e avaliar: ${ligacao}`,
      html: ENVOLVER('Tudo pronto', `
        <p style="margin:0 0 16px"><strong>${nomeProf}</strong> terminou a limpeza de
          <strong>${alojamento}</strong>. A casa está pronta para o próximo hóspede.</p>
        <p style="margin:0"><a href="${ligacao}" style="display:inline-block;background:#0F6E68;color:#fff;text-decoration:none;padding:14px 24px;border-radius:12px;font-weight:600">Ver as fotografias</a></p>`),
    }
  },
}
