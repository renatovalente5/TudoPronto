// Pagina inicial.
//
// O argumento tem de funcionar com o mercado VAZIO — e por isso a promessa
// principal nao e "encontre alguem", e "traga a pessoa que ja limpa a sua
// casa". Uma agenda partilhada com quem ja se conhece vale no primeiro dia; um
// mercado sem ninguem dentro nao vale nada. O mercado e a camada de cima, para
// as semanas em que essa pessoa nao pode.
import { esc, numero, SITE, M } from '../dados.mjs'

const P = (n) => `<span class="num">${numero(n)}</span>`

export const PASSOS_DONO = [
  ['Diga que casa tem', 'Tipologia, concelho, morada e as instruções que quiser deixar. A morada só aparece a quem escolher.'],
  ['Publique a limpeza', 'A data, a hora a que se pode entrar e a hora a que tem de estar pronta. Diga quanto oferece.'],
  ['Escolha quem vai', 'Veja quem se ofereceu, o histórico e as avaliações. Escolhe você — ou entrega directamente a quem já conhece.'],
  ['Receba as fotografias', 'À medida que o trabalho é feito. Fica prova com data e hora, e ninguém discute o que ficou por fazer.'],
]

export const PASSOS_PROF = [
  ['Crie a conta', 'Nome, concelho e até onde aceita ir. Quatro campos e está feito.'],
  ['Veja o que há perto', 'Serviços por dia e por distância. Vê o valor, a hora e o tipo de casa antes de decidir.'],
  ['Ofereça-se, ao seu preço', 'Aceita o valor proposto ou contrapõe o seu. Recusar não tem consequência nenhuma.'],
  ['Faça e mostre', 'A lista de quem tem a casa, tarefa a tarefa, com fotografia onde ela for pedida. No fim: tudo pronto.'],
]

export function inicio () {
  const mer = SITE.mercado
  return `
<section class="heroi">
  <div class="envolve heroi__i">
    <p class="heroi__olho">Para alojamento local em Portugal</p>
    <h1>A casa pronta para<br>o próximo hóspede.</h1>
    <p class="heroi__sub">
      Combine as limpezas do seu alojamento local com profissionais de limpeza
      independentes. Veja as fotografias do trabalho feito, e avaliem-se um ao
      outro no fim. <strong>Sem comissões e sem mensalidade.</strong>
    </p>
    <div class="heroi__accoes">
      <a class="b b--campo heroi__b" href="/app/#/registar?papel=dono">Tenho um alojamento</a>
      <a class="b b--contorno b--campo heroi__b" href="/app/#/registar?papel=profissional">Faço limpezas</a>
    </div>
    <p class="heroi__nota">
      Não precisa de instalar nada. Abre no telemóvel como uma aplicação.
    </p>
  </div>
</section>

<section class="faixa">
  <div class="envolve">
    <div class="faixa__grelha">
      <div><b>${P(mer.alojamentos_continente)}</b><span>alojamentos locais registados no continente<sup>1</sup></span></div>
      <div><b>0&nbsp;€</b><span>de comissão, para os dois lados</span></div>
      <div><b>Você</b><span>escolhe quem entra em casa — não é sorteio nem antiguidade</span></div>
    </div>
  </div>
</section>

<section class="secc">
  <div class="envolve">
    <div class="secc__cabeca">
      <h2>Comece com quem já limpa a sua casa</h2>
      <p class="secc__sub">
        A maior parte de quem tem alojamento local já tem alguém de confiança.
        O problema nunca foi encontrar — é combinar. As datas mudam, as
        mensagens perdem-se no meio da conversa, e ninguém sabe ao certo se a
        casa ficou pronta antes do check-in.
      </p>
    </div>
    <div class="grelha grelha--2 comparar">
      <div class="cartao cartao--fundo">
        <h3><span class="dist dist--aviso"><span class="ponto" aria-hidden="true"></span>Como é hoje</span></h3>
        <ul class="lista lista--contra">
          <li>Datas combinadas no WhatsApp, entre fotografias de família</li>
          <li>«Já limpaste o T2?» às onze da noite</li>
          <li>Descobre que faltou uma toalha pela avaliação do hóspede</li>
          <li>Quando a pessoa não pode, começa a telefonar a conhecidos</li>
          <li>Sem registo de nada: o que se combinou é o que cada um lembra</li>
        </ul>
      </div>
      <div class="cartao">
        <h3><span class="dist dist--ok"><span class="ponto" aria-hidden="true"></span>Com o ${esc(M.nome)}</span></h3>
        <ul class="lista lista--pro">
          <li>Convida a pessoa por email — fica na sua equipa</li>
          <li>Entrega-lhe a limpeza directamente, sem passar por mercado</li>
          <li>Recebe as fotografias com data e hora, tarefa a tarefa</li>
          <li>Se ela não puder, publica no mercado e outra pessoa oferece-se</li>
          <li>Fica tudo escrito: o que se combinou, quanto, e o que se fez</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="secc secc--alt" id="como">
  <div class="envolve">
    <div class="secc__cabeca">
      <h2>Como funciona</h2>
      <p class="secc__sub">O mesmo serviço, visto dos dois lados.</p>
    </div>
    <div class="grelha grelha--2 lados">
      <div>
        <h3 class="lados__t"><span class="dist dist--marca">Tem alojamento</span></h3>
        <ol class="passos">
          ${PASSOS_DONO.map(([t, d], i) => `<li><span class="passos__n" aria-hidden="true">${i + 1}</span><div><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join('\n          ')}
        </ol>
      </div>
      <div>
        <h3 class="lados__t"><span class="dist dist--acento">Faz limpezas</span></h3>
        <ol class="passos">
          ${PASSOS_PROF.map(([t, d], i) => `<li><span class="passos__n" aria-hidden="true">${i + 1}</span><div><b>${esc(t)}</b><span>${esc(d)}</span></div></li>`).join('\n          ')}
        </ol>
      </div>
    </div>
  </div>
</section>

<section class="secc">
  <div class="envolve">
    <div class="secc__cabeca">
      <h2>Confiança que se vê</h2>
      <p class="secc__sub">
        Vai dar a chave da sua casa a alguém, ou entrar na casa de um
        desconhecido. Nenhuma das duas coisas se resolve com boa vontade.
      </p>
    </div>
    <div class="grelha grelha--3">
      ${[
        ['A morada só aparece depois de escolher',
         'No mercado mostra-se a freguesia, a tipologia e a distância. A morada, o andar e o código da caixa de chaves aparecem a uma pessoa — a que você escolheu. Nunca a uma lista.'],
        ['Fotografias com data e hora',
         'Quem tem a casa diz que tarefas quer com fotografia. Sem essas fotografias, o serviço não fecha. É prova para os dois lados: também protege quem trabalha de ser acusado do que não fez.'],
        ['Avaliações que aparecem ao mesmo tempo',
         'O que cada um escreve fica escondido até o outro também escrever, ou até passarem 14 dias. Ninguém escreve a pensar no que o outro vai responder — e é isso que faz uma avaliação valer algo.'],
        ['Danos e esquecidos ficam registados',
         'Um copo partido, um carregador esquecido, o detergente que acabou. Com fotografia e hora, no serviço certo. Deixa de ser discussão.'],
        ['Duas medidas separadas',
         'Quantas estrelas teve, e quantos serviços aceitou e levou até ao fim. Misturar as duas penaliza quem trabalha pouco em vez de quem trabalha mal.'],
        ['Recusar não custa nada',
         'Quem faz limpezas pode recusar, contrapor preço e trabalhar onde quiser. O ' + M.nome + ' não penaliza recusas, não obriga a exclusividade e não impede ninguém de combinar directamente.'],
      ].map(([t, d]) => `<div class="cartao"><h3>${esc(t)}</h3><p class="mudo">${esc(d)}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="secc secc--alt">
  <div class="envolve envolve--estreito">
    <div class="secc__cabeca">
      <h2>Quanto custa</h2>
    </div>
    <div class="cartao preco">
      <p class="preco__v">0&nbsp;€</p>
      <p class="preco__d">
        Para quem tem alojamento e para quem faz limpezas. Sem comissão sobre o
        serviço, sem mensalidade, sem percentagem.
      </p>
      <ul class="lista lista--pro">
        <li>O pagamento é entre as duas pessoas, como sempre foi — dinheiro, MB WAY ou transferência</li>
        <li>O ${esc(M.nome)} não recebe, não retém e não intermedeia pagamentos</li>
        <li>O valor combinado fica registado, para os dois terem a mesma versão</li>
      </ul>
      <p class="mudo preco__nota">
        Enquanto a aplicação for gratuita para todos, é isto. Se um dia houver
        alguma coisa paga, será uma opção para quem tem alojamento — nunca uma
        percentagem do trabalho de quem limpa.
      </p>
    </div>
  </div>
</section>

<section class="secc">
  <div class="envolve envolve--estreito">
    <div class="secc__cabeca"><h2>Perguntas</h2></div>
    <div class="faq">
      ${[
        ['Preciso de pagar para usar?',
         'Não. Nem quem tem alojamento nem quem faz limpezas paga alguma coisa para publicar, oferecer-se ou concluir um serviço.'],
        ['Já tenho uma pessoa que me limpa a casa. Serve para quê?',
         'É exactamente o melhor caso. Convida-a por email, ela fica na sua equipa, e passa a entregar-lhe as limpezas directamente — com as datas, a lista do que quer feito e as fotografias no fim. Nunca precisa de publicar nada no mercado.'],
        ['E se ela não tiver jeito para telemóveis?',
         'A aplicação foi feita a pensar nisso: quatro campos para criar conta, um único botão grande em cada ecrã, letra grande, e nada de menus escondidos. Há também um contacto de apoio para quem preferir que alguém a ajude a começar.'],
        ['Quem define o preço?',
         'As duas pessoas. Quem tem a casa diz quanto oferece; quem faz a limpeza aceita ou contrapõe. O ' + M.nome + ' não sugere valores, não define mínimos e não define máximos.'],
        ['O ' + M.nome + ' é a minha entidade patronal?',
         'Não, e o desenho da aplicação é deliberado nesse ponto. Quem faz limpezas trabalha por conta própria: escolhe a que serviços se oferece, a que preço, e pode recusar sem qualquer consequência. O ' + M.nome + ' não dá ordens, não impõe métodos de trabalho, não avalia desempenho e não penaliza recusas.'],
        ['Quem vê a morada da minha casa?',
         'Só a pessoa que você escolher para aquele serviço, e só depois de a escolher. Antes disso o mercado mostra a freguesia, a tipologia e a distância aproximada — nunca a morada nem o código de acesso.'],
        ['Funciona sem rede?',
         'A parte que é usada dentro das casas, sim. Ao aceitar um serviço, a morada, as instruções e a lista de tarefas ficam guardadas no telemóvel. Pode marcar tarefas e tirar fotografias sem rede: sai tudo sozinho quando houver ligação.'],
        ['Em que zonas funciona?',
         'Em todo o país. Como qualquer aplicação que liga duas pontas, funciona melhor onde houver mais gente — e é por isso que a forma de começar é trazer quem já trabalha consigo, em vez de esperar que apareça alguém.'],
      ].map(([p, r], i) => `
      <details class="faq__i"${i === 0 ? ' open' : ''}>
        <summary><span>${esc(p)}</span></summary>
        <div class="faq__r"><p>${esc(r)}</p></div>
      </details>`).join('')}
    </div>
  </div>
</section>

<section class="chama">
  <div class="envolve envolve--estreito centro">
    <h2>Comece pela próxima limpeza</h2>
    <p>
      Crie a conta, diga que casa tem e convide a pessoa que já lhe limpa. Leva
      menos tempo do que combinar uma data por mensagem.
    </p>
    <div class="fita fita--centro">
      <a class="b b--campo" href="/app/#/registar?papel=dono">Tenho um alojamento</a>
      <a class="b b--contorno b--campo" href="/app/#/registar?papel=profissional">Faço limpezas</a>
    </div>
  </div>
</section>

<section class="notas">
  <div class="envolve envolve--estreito">
    <p><sup>1</sup> ${P(mer.alojamentos_continente)} estabelecimentos de alojamento local
    registados em Portugal continental, dos quais ${P(mer.apartamentos)} apartamentos e
    ${P(mer.moradias)} moradias. Fonte: Registo Nacional de Alojamento Local,
    dados abertos do Turismo de Portugal, consultados a 6 de setembro de 2026.
    Uma parte destes registos está em processo de saneamento por falta de seguro
    de responsabilidade civil obrigatório.</p>
  </div>
</section>
`
}
