// As paginas de cada lado, o "como funciona" detalhado e o apoio.
//
// Nota de vocabulario que atravessa TODOS os textos deste ficheiro: nunca
// "as nossas empregadas", "contratamos", "as nossas equipas" ou "turnos".
// Quem limpa e uma "profissional independente" que se "oferece" a um "serviço
// publicado". O vocabulario de um site conta como prova num processo de
// reconhecimento de contrato de trabalho (Lei 63/2013), e uma unica frase mal
// escolhida vale mais contra nos do que dez clausulas bem escritas.
import { esc, numero, SITE, M } from '../dados.mjs'
import { PASSOS_DONO, PASSOS_PROF } from './inicio.mjs'

export function paraDono () {
  return `
<article class="artigo">
  <div class="envolve envolve--estreito">
    <p class="artigo__olho">Tenho alojamento local</p>
    <h1>Deixe de combinar limpezas por mensagem</h1>
    <p class="artigo__intro">
      As datas mudam, as reservas entram de um dia para o outro, e a pergunta
      «a casa está pronta?» acaba sempre numa conversa às onze da noite. O
      ${esc(M.nome)} põe isso num sítio só — com a pessoa que já lhe limpa a casa,
      ou com quem se ofereça quando ela não puder.
    </p>

    <h2>O que ganha em concreto</h2>
    <dl>
      <dt>A pessoa que já conhece, dentro da aplicação</dt>
      <dd>Convida-a por email e ela fica na sua equipa. A partir daí entrega-lhe
      as limpezas directamente: ela recebe a data, a hora limite, a morada e a
      lista do que você quer feito. Nunca passa pelo mercado, e nunca precisa de
      publicar nada em público.</dd>

      <dt>Uma rede de segurança para quando ela não pode</dt>
      <dd>É a semana de férias dela, ou está doente, e você tem check-in às três
      da tarde. Publica a limpeza no mercado, vê quem se ofereceu — com histórico
      e avaliações — e escolhe. Continua a ser você a decidir quem entra em casa.</dd>

      <dt>Prova do trabalho feito, sem ter de perguntar</dt>
      <dd>Você diz que tarefas quer com fotografia. Sem essas fotografias, quem
      está a limpar não consegue fechar o serviço. Recebe-as com data e hora, e
      pode vê-las do sítio onde estiver antes do hóspede entrar.</dd>

      <dt>A sua lista, não a nossa</dt>
      <dd>Cada casa tem manias. Onde está o segundo jogo de lençóis, quantas
      cápsulas de café ficam, se a máquina de lavar é na varanda. Escreve a lista
      uma vez, e ela vai em todas as limpezas daquela casa. O ${esc(M.nome)} não
      tem padrão de limpeza nenhum: sugere um rascunho e você apaga, muda e
      acrescenta o que quiser.</dd>

      <dt>Danos e esquecidos com fotografia</dt>
      <dd>Um copo partido, um carregador na gaveta, o papel higiénico que acabou.
      Fica registado no serviço certo, com hora, e não se perde numa conversa.</dd>
    </dl>

    <h2>Como se faz</h2>
    <ol class="passos" style="margin: 22px 0 32px">
      ${PASSOS_DONO.map(([t, d], i) => `<li><span class="passos__n" aria-hidden="true">${i + 1}</span><div><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join('\n      ')}
    </ol>

    <h2>O que o ${esc(M.nome)} não faz</h2>
    <p>Por desenho, e não por falta de tempo:</p>
    <ul>
      <li><strong>Não recebe o seu dinheiro.</strong> O pagamento é entre as duas
      pessoas — dinheiro, MB WAY, transferência — como sempre foi. Não há
      comissão porque não passa nada por aqui.</li>
      <li><strong>Não define preços.</strong> Você diz quanto oferece; quem faz a
      limpeza aceita ou contrapõe. A aplicação não sugere valores, nem mínimos,
      nem máximos.</li>
      <li><strong>Não emprega ninguém.</strong> Quem faz limpezas trabalha por
      conta própria. Se combinar com alguém uma relação estável, isso é entre
      vocês — e as obrigações que dela resultem também.</li>
      <li><strong>Não garante o serviço.</strong> Não somos uma empresa de
      limpezas com seguro nem uma agência. Somos o sítio onde as duas pessoas se
      encontram e fica escrito o que combinaram.</li>
    </ul>

    <div class="aviso aviso--marca" style="margin: 30px 0">
      <div>
        <b>Sobre o seguro do seu alojamento</b>
        O registo de alojamento local exige seguro de responsabilidade civil, e
        muitos registos foram cancelados em 2026 por falta dele. Isso é uma
        obrigação sua enquanto titular do alojamento — o ${esc(M.nome)} não a
        cobre nem a substitui.
      </div>
    </div>

    <div class="fita" style="margin-top: 34px">
      <a class="b b--campo" href="/app/#/registar?papel=dono">Criar conta</a>
      <a class="b b--nu" href="/como-funciona.html">Ver como funciona</a>
    </div>
  </div>
</article>`
}

export function paraProfissional () {
  const p = SITE.precos_referencia
  return `
<article class="artigo">
  <div class="envolve envolve--estreito">
    <p class="artigo__olho">Faço limpezas</p>
    <h1>Trabalho de limpeza perto de si, com as regras à vista</h1>
    <p class="artigo__intro">
      Vê o que há, a que horas é, a que distância fica e quanto pagam — antes de
      dizer que sim. Oferece-se ao seu preço. E o trabalho que faz fica provado
      com as suas fotografias, o que também a protege.
    </p>

    <h2>Como funciona para si</h2>
    <ol class="passos" style="margin: 22px 0 32px">
      ${PASSOS_PROF.map(([t, d], i) => `<li><span class="passos__n" aria-hidden="true">${i + 1}</span><div><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join('\n      ')}
    </ol>

    <h2>O que é seu, e continua seu</h2>
    <ul>
      <li><strong>O preço.</strong> Quem tem a casa diz quanto oferece. Você
      aceita, ou diz quanto quer. Ninguém aqui lhe fixa uma tarifa.</li>
      <li><strong>A decisão.</strong> Recusar não tem consequência nenhuma:
      nenhuma pontuação desce, nenhum serviço deixa de lhe aparecer, ninguém a
      penaliza.</li>
      <li><strong>Os seus clientes.</strong> Pode continuar a trabalhar para quem
      quiser, dentro e fora daqui. Não há exclusividade e não há nada que a
      impeça de combinar directamente com alguém que conheceu aqui.</li>
      <li><strong>O seu horário.</strong> Você escolhe os dias, as horas e até
      onde está disposta a ir. Não há escalas, não há mínimos e não há turnos.</li>
      <li><strong>O seu método.</strong> A lista de tarefas é escrita por quem
      tem a casa, para aquela casa. O ${esc(M.nome)} não lhe diz como limpar,
      não a supervisiona e não avalia o seu desempenho.</li>
    </ul>

    <h2>O que o ${esc(M.nome)} lhe dá que o WhatsApp não dá</h2>
    <dl>
      <dt>A morada e o código de acesso no telemóvel, mesmo sem rede</dt>
      <dd>Quando aceita um serviço, tudo o que precisa fica guardado no aparelho:
      morada, andar, código da caixa de chaves, instruções e a lista de tarefas.
      Dentro de uma casa de granito sem rede, continua a funcionar.</dd>

      <dt>Prova de que fez o trabalho</dt>
      <dd>As fotografias que tira ficam com data e hora, agarradas àquele serviço.
      Se alguém disser depois que ficou coisa por fazer, a prova existe — e é sua
      tanto como de quem tem a casa.</dd>

      <dt>Reputação que anda consigo</dt>
      <dd>Cada serviço concluído e cada avaliação ficam no seu perfil. Quem tem
      alojamento vê isso antes de escolher, e é o que faz um desconhecido
      confiar-lhe a chave da casa dele.</dd>

      <dt>Nada a pagar</dt>
      <dd>Não paga para se registar, não paga para se oferecer, e não há
      percentagem nenhuma sobre o que recebe. O que combinar é o que recebe.</dd>
    </dl>

    <h2>Trabalhar por conta própria: o que tem de saber</h2>
    <p>
      Isto não é um emprego, e é importante que fique claro antes de começar.
      Quem se oferece no ${esc(M.nome)} presta um serviço por conta própria, e
      isso traz obrigações que são suas:
    </p>
    <ul>
      <li>Declarar os rendimentos que receber, nos termos que se aplicarem ao seu caso.</li>
      <li>Ter a sua situação contributiva regularizada, se e quando a lei o exigir.</li>
      <li>Emitir recibo ou factura a quem lhe pagar, se estiver obrigada a isso.</li>
      <li>Ter seguro de acidentes de trabalho, que é obrigação de quem trabalha
      por conta própria. Não é algo que possamos contratar por você.</li>
    </ul>
    <p>
      O ${esc(M.nome)} não retém impostos, não faz descontos e não emite documentos
      em seu nome. Se tiver dúvidas sobre a sua situação, fale com um contabilista
      ou com a Autoridade Tributária: não somos nós que lhe podemos responder a isso.
    </p>

    <div class="aviso" style="margin: 30px 0">
      <div>
        <b>Para ter uma ideia do mercado</b>
        Uma limpeza de saída num T1 leva ${esc(p.duracao_t1)} e num T2
        ${esc(p.duracao_t2)}, e os valores correntes em Portugal andam pelos
        ${esc(p.faixa)}. Isto é informação de mercado, recolhida de anúncios e
        levantamentos públicos — não é uma tabela nossa, e o ${esc(M.nome)} não
        propõe nem recomenda preço nenhum. Quem decide o seu preço é você.
      </div>
    </div>

    <div class="fita" style="margin-top: 34px">
      <a class="b b--campo" href="/app/#/registar?papel=profissional">Criar conta</a>
      <a class="b b--nu" href="/apoio.html">Preciso de ajuda a começar</a>
    </div>
  </div>
</article>`
}

export function comoFunciona () {
  return `
<article class="artigo">
  <div class="envolve envolve--estreito">
    <p class="artigo__olho">Como funciona</p>
    <h1>Do check-out ao «tudo pronto»</h1>
    <p class="artigo__intro">
      O percurso completo de uma limpeza, com o que cada pessoa vê em cada
      momento — e sobretudo o que <em>não</em> vê.
    </p>

    <div class="artigo__indice">
      <h2>Nesta página</h2>
      <ol>
        <li><a href="#publicar">Publicar a limpeza</a></li>
        <li><a href="#quem">Quem a vai fazer</a></li>
        <li><a href="#morada">Quando a morada aparece</a></li>
        <li><a href="#trabalho">O trabalho, tarefa a tarefa</a></li>
        <li><a href="#pronto">Tudo pronto</a></li>
        <li><a href="#avaliar">As avaliações</a></li>
        <li><a href="#dinheiro">O dinheiro</a></li>
      </ol>
    </div>

    <h2 id="publicar">1. Publicar a limpeza</h2>
    <p>
      Quem tem o alojamento diz a data, a hora a partir da qual se pode entrar
      (normalmente depois do check-out) e a hora a que a casa tem de estar pronta
      (antes do check-in). Diz também o que é preciso: mudar a roupa de cama,
      repor consumíveis, quem fornece os produtos. E diz quanto oferece.
    </p>
    <p>Depois escolhe para quem isto vai:</p>
    <div class="tabela-rolo">
      <table>
        <thead><tr><th>Visibilidade</th><th>Quem vê</th><th>Quando usar</th></tr></thead>
        <tbody>
          <tr><td><strong>Directo</strong></td><td>Uma pessoa da sua equipa, e mais ninguém. Já nasce atribuída.</td><td>A pessoa que lhe limpa sempre a casa.</td></tr>
          <tr><td><strong>Equipa</strong></td><td>Só as pessoas que você convidou. Elas oferecem-se, você escolhe.</td><td>Tem duas ou três pessoas de confiança e qualquer delas serve.</td></tr>
          <tr><td><strong>Mercado</strong></td><td>Profissionais na zona do alojamento, dentro do raio que cada uma definiu.</td><td>Ninguém da sua equipa pode, ou ainda não tem equipa.</td></tr>
        </tbody>
      </table>
    </div>

    <h2 id="quem">2. Quem a vai fazer</h2>
    <p>
      Por omissão, quem se oferece <strong>não fica logo com o serviço</strong>.
      As candidaturas chegam, e quem tem a casa vê de cada pessoa: o nome, a
      fotografia, o concelho, as estrelas, quantos serviços concluiu, quantos
      cancelou — e o valor que pede, se for diferente do proposto. Depois escolhe.
    </p>
    <p>
      Dar a chave de casa a alguém não é uma corrida. Mas há dias em que é: para
      esses, existe a opção <em>fica quem chegar primeiro</em>, que tem de ser
      ligada de propósito em cada limpeza.
    </p>

    <h2 id="morada">3. Quando a morada aparece</h2>
    <p>
      Esta é a regra mais importante da aplicação, e não tem excepções.
    </p>
    <div class="tabela-rolo">
      <table>
        <thead><tr><th></th><th>Antes de ser escolhida</th><th>Depois de ser escolhida</th></tr></thead>
        <tbody>
          <tr><td>Concelho e freguesia</td><td>Sim</td><td>Sim</td></tr>
          <tr><td>Tipologia, camas, casas de banho</td><td>Sim</td><td>Sim</td></tr>
          <tr><td>Distância aproximada</td><td>Sim</td><td>Sim</td></tr>
          <tr><td>Morada e andar</td><td><strong>Não</strong></td><td>Sim</td></tr>
          <tr><td>Código da caixa de chaves</td><td><strong>Não</strong></td><td>Sim</td></tr>
          <tr><td>Telefone da outra pessoa</td><td><strong>Não</strong></td><td>Sim</td></tr>
          <tr><td>Instruções da casa</td><td><strong>Não</strong></td><td>Sim</td></tr>
        </tbody>
      </table>
    </div>
    <p>
      A distância é calculada a partir do centro do concelho, não da casa. Nem no
      mercado nem em lado nenhum existe um mapa com a sua casa marcada.
    </p>

    <h2 id="trabalho">4. O trabalho, tarefa a tarefa</h2>
    <p>
      No momento em que é escolhida, a aplicação guarda no telemóvel tudo o que
      é preciso: morada, código de acesso, instruções e a lista de tarefas. Isto
      é de propósito — uma casa de paredes grossas sem rede não pode ser o fim
      do serviço.
    </p>
    <p>
      A lista vem de quem tem a casa, agrupada por zona. Cada tarefa marca-se com
      um toque. Nas tarefas em que o dono pediu fotografia, é preciso fotografar
      — e essas fotografias ficam com data e hora.
    </p>

    <h2 id="pronto">5. Tudo pronto</h2>
    <p>
      No fim há um botão só: <strong>Tudo pronto</strong>. Ele só funciona quando
      todas as tarefas que pedem fotografia tiverem fotografia. Quem tem a casa
      recebe o aviso no telemóvel e um email, e pode ver as fotografias antes de
      o hóspede entrar.
    </p>
    <p>
      Se ficou alguma coisa a assinalar — um dano, um objecto esquecido, um
      produto que acabou — regista-se como ocorrência, com fotografia. Fica no
      serviço, com hora, e a outra pessoa é avisada.
    </p>

    <h2 id="avaliar">6. As avaliações</h2>
    <p>
      Depois de o serviço estar concluído, cada um pode avaliar o outro: estrelas,
      até quatro etiquetas de uma lista, e um comentário se quiser.
    </p>
    <p>
      <strong>O que escreve fica escondido</strong> até a outra pessoa também
      avaliar, ou até passarem catorze dias. Nenhum dos dois escreve a pensar no
      que o outro vai responder. É a única forma de uma avaliação querer dizer
      alguma coisa: quando cada um sabe que a sua nota pode ser respondida, as
      notas passam a ser todas cinco estrelas por prudência.
    </p>
    <p>
      No perfil ficam duas medidas separadas: as <strong>estrelas</strong> (como
      foi o trabalho) e os <strong>serviços concluídos</strong> face aos aceites
      (se pode contar-se com a pessoa). Não há uma pontuação única inventada por
      nós, e nada desce por alguém estar um mês sem trabalhar.
    </p>

    <h2 id="dinheiro">7. O dinheiro</h2>
    <p>
      O ${esc(M.nome)} não toca no dinheiro. O pagamento é feito entre as duas
      pessoas, da maneira que combinarem. O valor acordado fica registado no
      serviço para as duas terem a mesma versão do que foi combinado — nada mais
      do que isso.
    </p>
    <p>
      É também por isso que não há comissão: não há nada por onde a cobrar.
    </p>

    <div class="fita" style="margin-top: 40px">
      <a class="b b--campo" href="/app/#/registar">Criar conta</a>
      <a class="b b--nu" href="/apoio.html">Falar com alguém</a>
    </div>
  </div>
</article>`
}

export function apoio () {
  const tel = M.telefone && !String(M.telefone).includes('000 000 000')
  return `
<article class="artigo">
  <div class="envolve envolve--estreito">
    <p class="artigo__olho">Apoio</p>
    <h1>Precisa de ajuda?</h1>
    <p class="artigo__intro">
      Se estiver a ter dificuldade em começar, escreva-nos. Não há problema
      nenhum em pedir que alguém o ajude a criar a conta — e não é sinal de nada.
    </p>

    <h2>Falar connosco</h2>
    <ul>
      <li><strong>Email:</strong> <a href="mailto:${esc(M.email)}">${esc(M.email)}</a></li>
      ${tel ? `<li><strong>Telefone:</strong> <a href="tel:${esc(String(M.telefone).replace(/\s/g, ''))}">${esc(M.telefone)}</a> (chamada para a rede fixa nacional)</li>` : ''}
    </ul>
    <p>Respondemos em português. Se escrever fora de horas, responde-se no dia seguinte.</p>

    <h2>Perguntas de quem está a começar</h2>
    <dl>
      <dt>Não consigo criar a conta no telemóvel.</dt>
      <dd>Pode pedir a alguém de confiança que a crie consigo — o importante é
      que o email e a senha sejam seus. Ou escreva-nos e ajudamos.</dd>

      <dt>Não recebi o código no email.</dt>
      <dd>Veja na pasta do lixo ou do spam. O código vale vinte minutos; se já
      passou, peça outro. Se continuar sem chegar, escreva-nos.</dd>

      <dt>Esqueci-me da senha.</dt>
      <dd>No ecrã de entrada há <em>Esqueci-me da senha</em>. Recebe um código de
      seis algarismos no email e escolhe uma senha nova. Isso fecha as sessões
      abertas noutros aparelhos.</dd>

      <dt>Como ponho a aplicação no ecrã do telemóvel?</dt>
      <dd>No iPhone: abra o site no Safari, toque no botão de partilha e escolha
      <em>Adicionar ao ecrã principal</em>. No Android: no menu do Chrome, escolha
      <em>Instalar aplicação</em> ou <em>Adicionar ao ecrã principal</em>. Fica
      com um ícone como qualquer outra aplicação, e é assim que os avisos
      funcionam melhor.</dd>

      <dt>Quero apagar a minha conta.</dt>
      <dd>Escreva-nos do email da conta. Apagamos os seus dados pessoais; os
      serviços já concluídos ficam sem o seu nome, porque também são o histórico
      da outra pessoa e não lhe podemos tirar isso.</dd>
    </dl>

    <h2>Reclamações</h2>
    <p>
      Se alguma coisa correu mal, diga-nos primeiro: quase tudo se resolve por
      email. Tem também à disposição o
      <a href="https://www.livroreclamacoes.pt/inicio" rel="noopener">Livro de
      Reclamações electrónico</a>, e a informação sobre resolução de litígios
      está nos <a href="/termos.html#litigios">termos de utilização</a>.
    </p>
  </div>
</article>`
}
