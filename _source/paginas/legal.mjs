// Paginas legais.
//
// Nada aqui e decorativo. Cada seccao responde a uma obrigacao concreta:
//  · Identificacao do prestador — DL 7/2004, art. 10.
//  · Independencia de quem trabalha — art. 12.-A do Codigo do Trabalho
//    (Lei 13/2023) e Directiva (UE) 2024/2831. E a seccao que decide se isto e
//    uma plataforma de anuncios ou uma entidade empregadora com dezenas de
//    trabalhadoras a quem se devem creditos laborais de tres anos, com
//    responsabilidade solidaria que alcanca PESSOALMENTE os gerentes.
//  · Suspensao de contas — art. 17. do DSA e art. 22. da Directiva 2024/2831:
//    decisao humana, fundamentada, notificada e recorrivel. Nunca automatica,
//    nunca ligada a metricas de desempenho, nunca chamada "sancao".
//  · Livro de Reclamacoes — DL 156/2005. RAL — Lei 144/2015.
//  · Privacidade — RGPD.
//
// Os campos de identificacao da entidade estao POR CONFIRMAR e sao lidos de
// dados/site.json. Ver a nota no fim de cada pagina.
import { esc, SITE, M } from '../dados.mjs'

const PR = SITE.prestador
const porConfirmar = (v) => String(v || '').includes('POR CONFIRMAR')
const campo = (v) => porConfirmar(v)
  ? '<mark class="falta">por preencher</mark>'
  : esc(v)

const ATUALIZADO = '7 de setembro de 2026'

const AVISO_IDENTIFICACAO = `
<div class="aviso aviso--aviso" style="margin: 26px 0">
  <div>
    <b>Esta página está incompleta</b>
    A identificação completa da entidade que explora o ${esc(M.nome)} — denominação,
    número de identificação fiscal, sede e registo comercial — tem de constar aqui
    por exigência do artigo 10.º do Decreto-Lei n.º 7/2004. Enquanto o serviço não
    estiver aberto ao público, os campos ficam assinalados. Não abrir ao público
    antes de os preencher.
  </div>
</div>`

export function termos () {
  const falta = [PR.denominacao, PR.nif, PR.morada].some(porConfirmar)
  return `
<article class="artigo">
  <div class="envolve envolve--estreito">
    <p class="artigo__olho">Legal</p>
    <h1>Termos de utilização</h1>
    <p class="artigo__intro">
      O que é o ${esc(M.nome)}, o que faz, o que não faz, e o que se espera de
      cada pessoa que o usa.
    </p>
    <p class="artigo__data">Última actualização: ${ATUALIZADO}</p>

    ${falta ? AVISO_IDENTIFICACAO : ''}

    <div class="artigo__indice">
      <h2>Nesta página</h2>
      <ol>
        <li><a href="#quem">Quem presta este serviço</a></li>
        <li><a href="#que-e">O que o ${esc(M.nome)} é — e o que não é</a></li>
        <li><a href="#independencia">Independência de quem faz limpezas</a></li>
        <li><a href="#contas">Contas</a></li>
        <li><a href="#servicos">Serviços, propostas e cancelamentos</a></li>
        <li><a href="#pagamento">Pagamento</a></li>
        <li><a href="#avaliacoes">Avaliações</a></li>
        <li><a href="#conteudos">Conteúdos e comportamento</a></li>
        <li><a href="#suspensao">Suspensão de contas</a></li>
        <li><a href="#responsabilidade">Responsabilidade</a></li>
        <li><a href="#litigios">Reclamações e litígios</a></li>
        <li><a href="#alteracoes">Alterações</a></li>
      </ol>
    </div>

    <h2 id="quem">1. Quem presta este serviço</h2>
    <dl>
      <dt>Denominação</dt><dd>${campo(PR.denominacao)}</dd>
      <dt>Número de identificação fiscal</dt><dd>${campo(PR.nif)}</dd>
      <dt>Sede</dt><dd>${campo(PR.morada)}</dd>
      <dt>Registo comercial</dt><dd>${campo(PR.registo_comercial)}</dd>
      <dt>Capital social</dt><dd>${campo(PR.capital_social)}</dd>
      <dt>Email</dt><dd><a href="mailto:${esc(M.email)}">${esc(M.email)}</a></dd>
      <dt>Sítio</dt><dd>${esc(M.dominio)}</dd>
    </dl>

    <h2 id="que-e">2. O que o ${esc(M.nome)} é — e o que não é</h2>
    <p>
      O ${esc(M.nome)} é um <strong>serviço de intermediação</strong>. Permite que
      quem tem alojamento local publique serviços de limpeza, que profissionais
      independentes se ofereçam para os fazer, e que as duas partes combinem entre
      si os termos, comuniquem e se avaliem depois.
    </p>
    <p>O ${esc(M.nome)} <strong>não</strong>:</p>
    <ul>
      <li>presta serviços de limpeza;</li>
      <li>emprega, contrata ou subcontrata quem faz limpezas;</li>
      <li>fixa, sugere, recomenda ou limita preços;</li>
      <li>recebe, retém ou processa pagamentos entre as partes;</li>
      <li>garante a realização, a pontualidade ou a qualidade de nenhum serviço;</li>
      <li>seguraisto ou substitui qualquer seguro que a lei exija a qualquer das partes.</li>
    </ul>
    <p>
      O contrato de prestação de serviços de limpeza é celebrado
      <strong>exclusivamente entre</strong> quem tem o alojamento e quem faz a
      limpeza. O ${esc(M.nome)} não é parte nesse contrato.
    </p>

    <h2 id="independencia">3. Independência de quem faz limpezas</h2>
    <p>
      Esta secção descreve como o ${esc(M.nome)} está desenhado, e é vinculativa
      para nós.
    </p>
    <ul>
      <li><strong>O preço é das partes.</strong> Quem tem o alojamento indica o
      valor que oferece; quem faz a limpeza aceita-o ou propõe outro. O
      ${esc(M.nome)} não define valores, mínimos, máximos, tabelas nem sugestões
      de preço.</li>

      <li><strong>Não há obrigação de aceitar.</strong> Recusar um serviço, ou não
      responder, não tem qualquer consequência: não altera a reputação, não reduz
      a visibilidade dos serviços disponíveis e não dá origem a nenhuma medida.</li>

      <li><strong>Não há exclusividade nem restrição de clientes.</strong> Quem
      faz limpezas pode prestar serviços a quem quiser, dentro e fora do
      ${esc(M.nome)}, incluindo a pessoas que aqui conheceu, e sem qualquer
      cláusula de não contorno.</li>

      <li><strong>Não há horários nem escalas.</strong> Não há disponibilidade
      mínima, períodos de conexão obrigatórios, escalas nem turnos.</li>

      <li><strong>O ${esc(M.nome)} não dá instruções de execução.</strong> As
      listas de tarefas são escritas por quem tem o alojamento, para aquele
      alojamento, e são conteúdo dessa pessoa. O ${esc(M.nome)} não tem padrões
      de limpeza, não emite regras de conduta, não impõe métodos de trabalho e
      não define códigos de apresentação.</li>

      <li><strong>O ${esc(M.nome)} não verifica nem avalia o trabalho.</strong> As
      avaliações são feitas pelas partes, uma sobre a outra, e publicadas como
      foram escritas. Não existe pontuação calculada por nós, nem gestão
      algorítmica: os serviços disponíveis são ordenados por data e por
      distância, iguais para todos, sem recomendação personalizada, sem
      hierarquia por mérito e sem decisões automatizadas sobre pessoas.</li>

      <li><strong>Não há sanções.</strong> Nenhuma conta é suspensa, limitada ou
      penalizada por recusas, por avaliações recebidas, por inactividade ou por
      qualquer métrica de desempenho. Ver a secção 9.</li>
    </ul>
    <p>
      Quem faz limpezas através do ${esc(M.nome)} é <strong>profissional
      independente</strong> e é responsável pelas suas obrigações fiscais,
      contributivas e, quando aplicável, de facturação. O ${esc(M.nome)} não
      retém impostos, não efectua descontos e não emite documentos fiscais em
      nome de ninguém.
    </p>

    <h2 id="contas">4. Contas</h2>
    <ul>
      <li>É preciso ter 18 anos ou mais e capacidade para contratar.</li>
      <li>Os dados da conta têm de ser verdadeiros, sobretudo o nome: a outra
      pessoa vai decidir com base neles se entra na casa ou se abre a porta.</li>
      <li>A senha é pessoal. Se suspeitar que alguém lhe entrou na conta, mude-a
      — isso fecha as sessões abertas noutros aparelhos.</li>
      <li>Uma pessoa, uma conta. A mesma conta pode ter os dois papéis.</li>
    </ul>

    <h2 id="servicos">5. Serviços, propostas e cancelamentos</h2>
    <ul>
      <li>Quem publica um serviço é responsável pela exactidão do que escreve:
      morada, horas, o que é preciso fazer e o valor que oferece.</li>
      <li>Aceitar uma candidatura, ou receber um serviço entregue directamente,
      cria um compromisso <strong>entre as duas pessoas</strong>. O ${esc(M.nome)}
      registra-o mas não o garante.</li>
      <li>Qualquer das partes pode cancelar. Cancelamentos depois de o serviço
      estar atribuído ficam contados no perfil de quem cancelou, dos dois lados
      e da mesma maneira — é informação factual para a outra pessoa decidir, não
      uma penalização nossa.</li>
      <li>A morada, o andar, as instruções de acesso e o telefone da outra parte
      só são revelados depois de o serviço estar atribuído, e apenas às duas
      pessoas envolvidas. Usar essa informação para outra coisa que não a
      execução daquele serviço é motivo de suspensão.</li>
    </ul>

    <h2 id="pagamento">6. Pagamento</h2>
    <p>
      O ${esc(M.nome)} é <strong>gratuito</strong> para ambos os lados e não cobra
      comissão sobre nenhum serviço.
    </p>
    <p>
      O pagamento do serviço de limpeza é feito directamente entre as duas
      pessoas, pelos meios que combinarem. O ${esc(M.nome)} não recebe, não
      retém, não transfere e não garante pagamentos, e não intervém em conflitos
      sobre valores — embora o valor combinado fique registado no serviço,
      acessível às duas partes, o que costuma bastar para os resolver.
    </p>

    <h2 id="avaliacoes">7. Avaliações</h2>
    <ul>
      <li>Só quem participou num serviço concluído pode avaliá-lo, e uma vez só.</li>
      <li>Cada avaliação fica escondida até a outra parte também avaliar, ou até
      passarem 14 dias. Depois disso é pública no perfil e não pode ser
      alterada por quem a escreveu.</li>
      <li>As avaliações são opiniões de quem as escreve, publicadas como foram
      escritas. Não as editamos nem as somamos numa pontuação nossa.</li>
      <li>Removemos uma avaliação apenas se contiver insulto, dados pessoais de
      terceiros, conteúdo ilegal ou se for manifestamente falsa ou alheia ao
      serviço. A remoção é decidida por uma pessoa e comunicada a quem a
      escreveu, com o motivo.</li>
      <li>Trocar avaliações combinadas, pedir ou oferecer avaliações a troco de
      algo, ou avaliar-se através de contas de conveniência é motivo de
      suspensão.</li>
    </ul>

    <h2 id="conteudos">8. Conteúdos e comportamento</h2>
    <p>Não é permitido usar o ${esc(M.nome)} para:</p>
    <!-- Marcada para a bateria: as guardas que procuram promessas de trabalho
         ou de rendimento ignoram o que estiver aqui dentro. Uma lista de
         proibições tem de NOMEAR o que proíbe, e sem esta marca a guarda
         acusava os termos de prometerem exactamente o que vedam. -->
    <ul data-proibicoes>
      <li>publicar conteúdo ilegal, ofensivo, discriminatório ou enganoso;</li>
      <li>publicar fotografias onde apareçam pessoas identificáveis sem o
      consentimento delas, ou documentos e dados pessoais de terceiros;</li>
      <li>recolher dados de outras pessoas para fins alheios ao serviço, incluindo
      moradas e contactos;</li>
      <li>recrutar para relações de trabalho encobertas, ou publicar ofertas de
      emprego;</li>
      <li>tentar contornar limites técnicos, automatizar acessos ou sobrecarregar
      o serviço.</li>
    </ul>
    <p>
      As fotografias e textos que publicar continuam seus. Dá-nos apenas
      autorização para os guardar e mostrar às pessoas envolvidas naquele
      serviço, e nada mais — não os usamos para publicidade nem os mostramos a
      terceiros.
    </p>

    <h2 id="suspensao">9. Suspensão de contas</h2>
    <p>
      Uma conta só pode ser suspensa por <strong>fraude, actividade ilegal,
      violação destes termos ou risco para a segurança de pessoas</strong>.
    </p>
    <p>Nunca por:</p>
    <ul>
      <li>recusar serviços, ou recusar muitos;</li>
      <li>avaliações recebidas, número de estrelas ou qualquer métrica de desempenho;</li>
      <li>inactividade;</li>
      <li>combinar directamente com pessoas que conheceu aqui;</li>
      <li>praticar preços que não nos agradem — não temos opinião sobre preços.</li>
    </ul>
    <p>Quando acontece:</p>
    <ul>
      <li>a decisão é tomada por <strong>uma pessoa</strong>, nunca automaticamente;</li>
      <li>é comunicada por email, com o <strong>motivo concreto</strong> e os
      factos em que se baseia;</li>
      <li>pode ser contestada por email nos <strong>14 dias</strong> seguintes, e
      a resposta é dada por uma pessoa diferente da que decidiu, no prazo de 15
      dias úteis;</li>
      <li>salvo risco grave e imediato, produz efeitos <strong>depois</strong> de
      comunicada, e os serviços já atribuídos podem ser concluídos.</li>
    </ul>

    <h2 id="responsabilidade">10. Responsabilidade</h2>
    <p>
      O ${esc(M.nome)} responde pelo funcionamento do próprio serviço de
      intermediação, nos termos gerais da lei. Não responde pela execução, pela
      qualidade, pelos atrasos, pelos danos, pelos furtos ou pelos pagamentos
      relativos aos serviços de limpeza combinados entre as partes, porque não é
      parte nesses contratos, não os executa e não os supervisiona.
    </p>
    <p>
      Cada parte é responsável por ter os seguros que a lei lhe exija. Quem tem
      alojamento local está sujeito às obrigações do respectivo regime jurídico,
      incluindo o seguro de responsabilidade civil obrigatório.
    </p>
    <p>
      Nada nesta secção exclui ou limita a responsabilidade que a lei não permita
      excluir nem limitar, designadamente por dolo, por culpa grave ou perante
      consumidores.
    </p>

    <h2 id="litigios">11. Reclamações e litígios</h2>
    <p>
      Escreva primeiro para <a href="mailto:${esc(M.email)}">${esc(M.email)}</a>.
      Respondemos a reclamações no prazo de 15 dias úteis.
    </p>
    <p>
      Está também disponível o
      <a href="https://www.livroreclamacoes.pt/inicio" rel="noopener">Livro de
      Reclamações electrónico</a>.
    </p>
    <p>
      Sendo o utilizador um consumidor, pode recorrer a resolução alternativa de
      litígios (Lei n.º 144/2015). A entidade de competência genérica e residual
      é o <strong>CNIACC — Centro Nacional de Informação e Arbitragem de
      Conflitos de Consumo</strong>
      (<a href="https://www.cniacc.pt" rel="noopener">cniacc.pt</a>). Consoante o
      concelho da sede do prestador, pode haver um centro de arbitragem de
      competência territorial própria — a indicação definitiva será acrescentada
      aqui quando a sede estiver fixada.
    </p>
    <p>
      A plataforma europeia de resolução de litígios em linha foi desactivada a
      20 de julho de 2025 e por isso não é aqui indicada.
    </p>

    <h2 id="alteracoes">12. Alterações</h2>
    <p>
      Podemos alterar estes termos. Alterações com relevo para os utilizadores são
      comunicadas por email e dentro da aplicação com pelo menos 15 dias de
      antecedência, e a data no topo desta página é sempre a da versão em vigor.
      Quem não concordar pode deixar de usar o serviço e pedir a eliminação da
      conta.
    </p>

    <h2>Lei aplicável</h2>
    <p>
      Aplica-se a lei portuguesa. Sendo o utilizador consumidor, mantém o direito
      de recorrer ao tribunal do seu domicílio, nos termos da lei.
    </p>
  </div>
</article>`
}

export function privacidade () {
  const falta = [PR.denominacao, PR.nif, PR.morada].some(porConfirmar)
  return `
<article class="artigo">
  <div class="envolve envolve--estreito">
    <p class="artigo__olho">Legal</p>
    <h1>Privacidade</h1>
    <p class="artigo__intro">
      Que dados o ${esc(M.nome)} guarda, para que servem, quem os vê e o que
      pode exigir de nós. Escrito para ser lido, não para ser assinado.
    </p>
    <p class="artigo__data">Última actualização: ${ATUALIZADO}</p>

    ${falta ? AVISO_IDENTIFICACAO : ''}

    <h2>O resumo, em cinco linhas</h2>
    <ul>
      <li>Não há cookies de publicidade nem de estatística. Não há banner porque
      não há nada a consentir.</li>
      <li>Não usamos nenhuma ferramenta de análise de tráfego. Nenhuma.</li>
      <li>A morada da sua casa só é mostrada à pessoa que você escolher, e só
      depois de a escolher.</li>
      <li>Os dados ficam guardados na União Europeia.</li>
      <li>Não vendemos nada a ninguém, e não há publicidade.</li>
    </ul>

    <h2>Quem é responsável</h2>
    <dl>
      <dt>Responsável pelo tratamento</dt><dd>${campo(PR.denominacao)}</dd>
      <dt>NIF</dt><dd>${campo(PR.nif)}</dd>
      <dt>Sede</dt><dd>${campo(PR.morada)}</dd>
      <dt>Contacto para assuntos de privacidade</dt>
      <dd><a href="mailto:${esc(M.email)}">${esc(M.email)}</a></dd>
    </dl>
    <p>
      Quando você publica um serviço e escreve a lista de tarefas e as instruções
      da sua casa, esse conteúdo é seu: nós guardamo-lo e mostramo-lo a quem você
      escolher, por sua conta.
    </p>

    <h2>Que dados guardamos, e porquê</h2>
    <div class="tabela-rolo">
      <table>
        <thead><tr><th>Dados</th><th>Para que serve</th><th>Fundamento</th><th>Quanto tempo</th></tr></thead>
        <tbody>
          <tr>
            <td>Email, nome, senha (guardada como resumo criptográfico, nunca legível)</td>
            <td>Ter conta, entrar, recuperar o acesso</td>
            <td>Execução do contrato</td>
            <td>Enquanto tiver conta</td>
          </tr>
          <tr>
            <td>Concelho e raio de deslocação</td>
            <td>Mostrar serviços perto de quem faz limpezas</td>
            <td>Execução do contrato</td>
            <td>Enquanto tiver conta</td>
          </tr>
          <tr>
            <td>Telefone (opcional)</td>
            <td>As duas pessoas falarem-se no dia do serviço. Só é revelado depois de o serviço estar atribuído</td>
            <td>Execução do contrato</td>
            <td>Enquanto tiver conta</td>
          </tr>
          <tr>
            <td>Alojamentos: morada, andar, instruções, código de acesso</td>
            <td>Quem vai limpar precisa de chegar lá e entrar</td>
            <td>Execução do contrato</td>
            <td>Enquanto o alojamento existir na conta</td>
          </tr>
          <tr>
            <td>Serviços, tarefas, mensagens</td>
            <td>Combinar e executar a limpeza; ter registo do que foi combinado</td>
            <td>Execução do contrato</td>
            <td>3 anos após a conclusão</td>
          </tr>
          <tr>
            <td>Fotografias do trabalho e de ocorrências</td>
            <td>Provar o que foi feito e o que foi encontrado, para os dois lados</td>
            <td>Execução do contrato</td>
            <td>18 meses após a conclusão do serviço</td>
          </tr>
          <tr>
            <td>Avaliações e comentários</td>
            <td>Permitir que as pessoas decidiam em quem confiam</td>
            <td>Interesse legítimo na confiança do serviço</td>
            <td>3 anos, ou até a conta ser eliminada</td>
          </tr>
          <tr>
            <td>Resumo criptográfico do endereço de rede, com sal que muda todos os dias</td>
            <td>Travar registos automáticos e abuso</td>
            <td>Interesse legítimo na segurança</td>
            <td>24 horas</td>
          </tr>
          <tr>
            <td>Endereço de subscrição de avisos, se os autorizar</td>
            <td>Avisar de um serviço novo, de uma mensagem, de uma limpeza concluída</td>
            <td>Consentimento (pode retirar quando quiser)</td>
            <td>Até desligar os avisos</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>
      Não pedimos número de identificação fiscal, número de documento, morada de
      residência de quem faz limpezas, nem dados bancários. Não precisamos deles,
      porque não processamos pagamentos.
    </p>

    <h2>A morada da sua casa</h2>
    <p>
      Trata-se com cuidado especial, porque uma morada com um código de caixa de
      chaves é um convite a quem não devia entrar.
    </p>
    <ul>
      <li>Antes de escolher alguém, quem vê o serviço vê o <strong>concelho, a
      freguesia, a tipologia e a distância aproximada</strong>.</li>
      <li>A distância é calculada a partir do <strong>centro do concelho</strong>,
      não da sua casa. A posição exacta da casa nunca sai do seu registo.</li>
      <li>Morada, andar, instruções e código de acesso são mostrados
      <strong>apenas à pessoa atribuída</strong>, e só a partir do momento em que
      é atribuída.</li>
      <li>Não há mapa nenhum com a sua casa marcada, em sítio nenhum.</li>
    </ul>

    <h2>Quem mais toca nos dados</h2>
    <p>
      O seu navegador contacta, quando usa o ${esc(M.nome)}, exactamente estes
      domínios e mais nenhum:
    </p>
    <div class="tabela-rolo">
      <table>
        <thead><tr><th>Quem</th><th>Para quê</th><th>Onde</th></tr></thead>
        <tbody>
          <tr>
            <td><strong>GitHub Pages</strong> (GitHub, Inc.)</td>
            <td>Serve as páginas e a aplicação. Vê o endereço de rede de quem visita, como qualquer servidor web</td>
            <td>Estados Unidos, com cláusulas contratuais-tipo</td>
          </tr>
          <tr>
            <td><strong>Cloudflare</strong> (Workers, D1, KV)</td>
            <td>A base de dados, as fotografias e a lógica do serviço. É subcontratante</td>
            <td>União Europeia — a base de dados está criada com jurisdição europeia, o que é irreversível</td>
          </tr>
          <tr>
            <td><strong>Mailjet</strong> (Sinch)</td>
            <td>Envia os emails de código, convite e aviso. Recebe o endereço de email e o texto da mensagem</td>
            <td>União Europeia</td>
          </tr>
          <tr>
            <td><strong>Serviço de avisos do seu navegador</strong> (Apple, Google ou Mozilla, conforme o aparelho)</td>
            <td>Entrega os avisos push, se os tiver autorizado. Não lhe enviamos conteúdo dentro do aviso</td>
            <td>Conforme o fabricante</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>
      Não há Google Analytics, não há Facebook, não há mapas de terceiros, não há
      tipos de letra externos, não há publicidade. Esta lista é verificada por um
      teste automático que falha se aparecer um domínio novo — para esta página
      não começar a mentir no dia em que alguém acrescentar alguma coisa.
    </p>

    <h2>Cookies</h2>
    <p>
      Não usamos cookies de publicidade nem de estatística, e por isso não há
      pedido de consentimento.
    </p>
    <p>
      Guardamos no seu aparelho, no armazenamento local, apenas o que é
      estritamente necessário para o serviço funcionar: o testemunho da sua
      sessão (para não ter de escrever a senha em cada ecrã), a sua preferência de
      tema, e — quando está sem rede — as acções e fotografias que ainda não
      conseguiram ser enviadas. Nada disto sai do aparelho para outro fim, e nada
      é escrito antes de você iniciar sessão.
    </p>

    <h2>Os seus direitos</h2>
    <p>
      Pode pedir-nos, a qualquer momento e escrevendo para
      <a href="mailto:${esc(M.email)}">${esc(M.email)}</a>: acesso aos seus dados,
      correcção, eliminação, limitação do tratamento, oposição, e portabilidade.
      Respondemos no prazo de um mês.
    </p>
    <p>
      Quanto à <strong>eliminação da conta</strong>, há uma coisa que não podemos
      fazer e é melhor dizê-la antes: os serviços já concluídos e as avaliações
      que escreveu também fazem parte do histórico da outra pessoa, e apagá-los
      seria apagar a reputação que ela construiu. O que fazemos é anonimizar —
      o seu nome, email, telefone e fotografias desaparecem; o registo de que
      houve um serviço naquela data, e a avaliação sem nome, permanecem.
    </p>
    <p>
      Se entender que tratámos os seus dados indevidamente, pode reclamar à
      <strong>Comissão Nacional de Protecção de Dados</strong>
      (<a href="https://www.cnpd.pt" rel="noopener">cnpd.pt</a>).
    </p>

    <h2>Decisões automatizadas</h2>
    <p>
      Não existem. Não há perfis, não há pontuações calculadas por nós, não há
      recomendação personalizada e nenhuma decisão sobre pessoas é tomada por
      programa. Os serviços disponíveis são ordenados por data e por distância,
      da mesma maneira para todos. Suspensões de conta, quando acontecem, são
      decididas por uma pessoa e fundamentadas por escrito.
    </p>

    <h2>Segurança</h2>
    <ul>
      <li>Tudo circula cifrado.</li>
      <li>A senha é derivada no seu aparelho antes de sair dele, e no servidor
      fica apenas um resumo criptográfico com sal. Não temos como a ler nem como
      a recuperar — se a esquecer, cria-se uma nova.</li>
      <li>Os testemunhos de sessão são guardados como resumo: quem lesse a base
      de dados não ficaria com sessões utilizáveis.</li>
      <li>Os identificadores são opacos e aleatórios, para que não se possa
      adivinhar o registo de outra pessoa a partir do nosso.</li>
    </ul>

    <h2>Crianças</h2>
    <p>O ${esc(M.nome)} é para maiores de 18 anos e não se dirige a menores.</p>
  </div>
</article>`
}
