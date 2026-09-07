# Tudo Pronto — dossiê de conformidade

Documento interno. Serve dois fins: guiar decisões de produto, e estar pronto
a entregar se a ACT, a CNPD ou a AT perguntarem alguma coisa.

Última revisão: **7 de setembro de 2026**.
**Data de revisão obrigatória: 2 de dezembro de 2026** (prazo de transposição
da Directiva (UE) 2024/2831).

---

## 1. O risco que decide o projecto: presunção de laboralidade

O risco existencial do Tudo Pronto **não é** o RGPD nem o fisco. É o
**artigo 12.º-A do Código do Trabalho**, aditado pela Lei n.º 13/2023, de 3 de
abril, em vigor desde 1 de maio de 2023: presume-se contrato de trabalho entre
a plataforma digital e quem presta a actividade quando se verifiquem *algumas*
de seis características.

A fórmula «algumas» é indeterminada. A leitura dominante, por analogia com o
artigo 12.º, é que **bastam duas**. Se a presunção operar:

- responsabilidade **solidária** da plataforma, dos intermediários e — isto é o
  que mais importa — dos seus **gerentes, administradores e directores a título
  pessoal**, pelos créditos laborais e encargos sociais dos últimos três anos;
- contraordenação muito grave;
- a acção de reconhecimento de contrato de trabalho (Lei n.º 63/2013) pode ser
  intentada pelo **Ministério Público**, por participação da ACT, **sem
  depender da vontade da prestadora**.

### As seis alíneas, e o que fizemos a cada uma

| Alínea | O que apanha | Decisão do Tudo Pronto | Onde está no código |
|---|---|---|---|
| a) | a plataforma **fixa a retribuição** ou limites máximos/mínimos | Nunca sugerimos, fixamos, recomendamos ou limitamos preços. Quem propõe é quem tem a casa; quem contrapõe é quem faz o trabalho. Não há tabela, não há «preço sugerido», não há intervalo. | `api/src/rotas-servicos.js` — o campo `valor` vem do dono; nenhuma rota calcula ou sugere valores |
| b) | a plataforma **estabelece regras de conduta** | Não temos código de conduta, guião, padrão de limpeza nem código de apresentação. As listas de tarefas são **conteúdo do dono do alojamento**, escritas por ele para aquela casa. | `RASCUNHO_SUGERIDO` em `api/src/rotas-alojamentos.js` — é um rascunho editável, e a interface diz «Esta lista é sua» |
| c) | a plataforma **controla e supervisiona a prestação**, incluindo por meios electrónicos ou gestão algorítmica | Não avaliamos ninguém. As avaliações são **entre as partes**, publicadas como foram escritas. Não há pontuação calculada por nós, nem usada para atribuir trabalho, ordenar por mérito ou excluir alguém. O mercado ordena por **data e distância**, igual para todos. | `api/src/rotas-social.js`; `GET /v1/mercado` com `ORDER BY s.data, s.hora_inicio` |
| d) | a plataforma **restringe a autonomia** (horários, recusas, substitutos, escolha de clientes) | Sem disponibilidade mínima, sem escalas, sem turnos, sem obrigação de aceitar, sem penalização por recusa, sem exclusividade, sem cláusula de não contorno. Quem faz limpezas pode combinar directamente com quem conheceu aqui. | Nenhuma rota registra recusas; não existe conceito de «taxa de aceitação» |
| e) | a plataforma **exerce poder disciplinar**, designadamente por desactivação de conta | Suspensão **apenas** por fraude, ilegalidade, violação dos termos ou risco de segurança. Decisão **humana**, fundamentada por escrito, notificada antes de produzir efeitos, contestável em 14 dias, respondida por pessoa diferente da que decidiu. Nunca por métricas. | Termos, secção 9; não existe rota de suspensão automática |
| f) | os equipamentos são da plataforma | Não fornecemos equipamento nenhum. | — |

### A Directiva (UE) 2024/2831

Em vigor desde 2 de dezembro de 2024, **transposição até 2 de dezembro de
2026**. Portugal ainda não transpôs. Não tem isenção por dimensão da
plataforma: um projecto de duas pessoas está sujeito ao mesmo regime que a
Uber. O ónus de ilidir a presunção passa a ser da plataforma.

**A peça decisiva ao desenho:** a definição de «plataforma de trabalho
digital» exige, como elemento constitutivo, o uso de **sistemas automatizados
de monitorização ou de tomada de decisões**. Quem não os usa fica fora do
conceito.

Por isso o Tudo Pronto não tem: recomendação personalizada, ordenação por
mérito, pontuação interna, decisões automatizadas sobre pessoas, nem
monitorização da prestação. E isso está escrito nos termos, secção 3, de forma
vinculativa.

### Vocabulário

O vocabulário conta como prova. **Não se escreve, em sítio nenhum**: «as
nossas empregadas», «contratamos», «as nossas equipas», «os nossos
funcionários», «turnos», «trabalha para nós».

Escreve-se: «profissional independente», «serviço publicado», «proposta
aceite», «ofereceu-se».

> Isto tem uma guarda automática: o módulo `01-site.mjs` da bateria procura
> estas expressões em todas as páginas e **falha a construção** se alguma
> aparecer.

### Prova de autonomia a guardar

Se houver inspecção, o que demonstra autonomia é o histórico:

- recusas e não-respostas **sem qualquer consequência** registada;
- contrapropostas de preço aceites e recusadas pelos donos;
- profissionais a trabalhar para vários donos, e fora da plataforma;
- ausência total de qualquer métrica de desempenho nossa.

---

## 2. DAC7 — comunicação de rendimentos à Autoridade Tributária

Regime: **Lei n.º 36/2023**, que altera o **Decreto-Lei n.º 61/2013**
(transposição da Directiva (UE) 2021/514).

> ⚠️ **A confirmar antes de citar em documento externo:** a data exacta da Lei
> 36/2023 (26 ou 31 de julho de 2023). A fonte consultada indicou 26 de julho.
> Confirmar no Diário da República.

**«Prestação de um serviço pessoal» é actividade relevante.** O limiar de
dispensa (menos de 30 operações e até 2 000 €) **só existe para venda de
bens**: em serviços **não há mínimo**. Uma pessoa que faça duas limpezas por
ano é, em princípio, comunicada.

### Correcção a uma versão anterior deste documento

Uma versão anterior desta secção afirmava que **não intermediar pagamentos**
nos deixava fora do regime. **Isso está errado e foi corrigido.**

A definição de «plataforma» exclui apenas o software que se limite a *listar*,
*publicitar* ou *processar pagamentos* **«sem qualquer outra intervenção»**. O
Tudo Pronto **agenda e emparelha** — o que é intervenção. Não escapamos por
não tocar no dinheiro.

O que não intermediar pagamentos faz, e é diferente:

- **reduz a contrapartida que «conhecemos ou podemos razoavelmente conhecer»**,
  que é a medida do que há a comunicar;
- mantém-nos fora das obrigações de instituição de pagamento;
- e mantém-nos longe da alínea a) do art. 12.º-A (fixação de retribuição).

### O que isto obriga a fazer

1. **Assumir que somos plataforma reportante** para efeitos de DAC7, e planear
   o registo no Portal das Finanças e a comunicação anual (até 31 de janeiro),
   em vez de contar com uma isenção que não temos.
2. **Diligência devida:** recolher e verificar nome, morada, NIF e data de
   nascimento de quem presta o serviço. Isto **ainda não está feito** e é uma
   decisão pendente — ver o risco abaixo.
3. **Dizer isto às pessoas ANTES do botão de inscrição**, em português simples:
   o que se comunica, sobre quem, e quando. Quem descobrir pela carta da
   Autoridade Tributária abandona a plataforma e conta a todas as colegas.

> **Risco de adesão, e é o maior do projecto.** O sector é largamente informal.
> Pedir NIF, morada e data de nascimento a uma pessoa de baixa literacia
> digital, à porta de um alojamento, é um obstáculo brutal — e um passivo de
> RGPD. Ao mesmo tempo, o dono de alojamento no regime simplificado (coeficiente
> 0,35, ou 0,50 em contenção) **não deduz despesas**: não ganha nada com a
> factura, logo não tem incentivo para exigir formalização. É esta aritmética,
> e não a falta de software, que faz o WhatsApp continuar a ganhar.
>
> **Decisão pendente, para o Renato tomar:** (a) recolher os dados e cumprir o
> DAC7 desde o início, aceitando a fricção; ou (b) manter a versão actual como
> ferramenta de agenda entre partes que já se conhecem, e resolver o DAC7 antes
> de abrir o mercado aberto ao público. A versão actual do produto está no
> estado (b) — **o mercado aberto não deve ser publicitado antes de isto estar
> decidido.**

### Modelo de receita

Se algum dia houver receita, **não pode ser comissão por serviço**: uma
comissão reforça o enquadramento de plataforma reportante e recoloca a alínea
a) do 12.º-A em cima da mesa. Tem de ser subscrição do dono do alojamento ou
destaque pago do anúncio.

---

## 2-A. Angariação de mão-de-obra e colocação

Dois regimes que só apareceram na segunda volta da investigação, e que
condicionam a comunicação:

**Artigo 185.º da Lei n.º 23/2007** (regime de entrada e permanência de
estrangeiros) pune a angariação de mão-de-obra. O sector da limpeza de
alojamento local em Portugal emprega muita mão-de-obra imigrante. A previsão
legal apanha quem **promete trabalho e cobra por isso**.

Regras que daqui saem, e são absolutas:

- **Nunca cobrar nada a quem faz limpezas.** Em nenhuma forma: nem subscrição,
  nem comissão, nem destaque pago, nem verificação de antecedentes paga. Cobrar
  *mais* angariar é exactamente a previsão legal.
- **Nunca prometer trabalho, emprego ou rendimento** na comunicação.

**Decreto-Lei n.º 260/2009** regula as agências privadas de colocação. Não
somos uma — e a comunicação tem de continuar a deixar isso claro, sem
linguagem de colocação («arranjamos-lhe trabalho», «ofertas», «vagas»).

> Isto tem **duas guardas automáticas** no módulo `01-site.mjs` da bateria: uma
> procura promessas de trabalho ou rendimento em todas as páginas (ignorando o
> que estiver marcado como lista de proibições) e outra exige que a página de
> quem faz limpezas diga explicitamente que não paga nada.

### Registo criminal

**Não pedir.** A posição da CNPD inviabiliza que uma plataforma privada exija
certificado de registo criminal para este tipo de actividade. É uma tentação
óbvia — «verificamos os antecedentes» vende confiança — e não se pode fazer.
A confiança constrói-se com o histórico de serviços concluídos e as avaliações
reveladas, que é o que temos.

### Seguro de acidentes de trabalho

Quem trabalha por conta própria tem **obrigação própria** de seguro de
acidentes de trabalho. Não somos nós que o contratamos nem podemos contratá-lo
em nome de ninguém — mas a página de quem faz limpezas deve mencioná-lo entre
as obrigações que são dela. **Está por acrescentar** (ver secção 7).

---

## 3. Regulamento dos Serviços Digitais (DSA)

Regulamento (UE) 2022/2065.

Sendo **micro ou pequena empresa**, os artigos 19.º e 29.º dispensam a
Secção 3 (salvo o 24.º/3) e a Secção 4 inteira — **incluindo a rastreabilidade
dos comerciantes do artigo 30.º**.

Deveres que restam, e o que fizemos:

| Dever | Estado |
|---|---|
| Ponto de contacto único | `ola@tudopronto.pt`, no rodapé de todas as páginas |
| Termos e condições claros | `/termos.html` |
| Mecanismo de notificação e acção | `POST /v1/denuncias` na aplicação |
| Fundamentação das decisões de moderação | Termos, secção 9: motivo concreto, por escrito, contestável em 14 dias |

O **Regulamento P2B** (UE 2019/1150) só se aplica havendo consumidores do outro
lado — não é o nosso caso (dono de alojamento local ↔ prestadora independente).

---

## 4. RGPD

- **Responsável pelo tratamento:** a entidade que explora o Tudo Pronto
  (**POR CONFIRMAR** — ver secção 7).
- **Fundamento:** execução do contrato (art. 6.º/1/b) para conta, alojamentos,
  serviços e mensagens. Interesse legítimo (art. 6.º/1/f) para as avaliações e
  para o travão de abuso. Consentimento apenas para avisos push.
- **Subcontratante:** Cloudflare (Workers, D1, KV). A base D1 foi criada com
  `--jurisdiction eu`, **escolha irreversível**, o que obriga a Cloudflare a
  correr e guardar os dados dentro da União.
- **Minimização:** não pedimos NIF, número de documento, morada de residência
  de quem limpa, nem dados bancários. Não precisamos deles, porque não
  processamos pagamentos.
- **A morada do alojamento:** só é revelada à pessoa atribuída, e só depois de
  o ser. A distância mostrada no mercado é calculada a partir do **centróide do
  concelho**, nunca da casa. Isto tem duas guardas na bateria (`02-privacidade-morada.mjs`).
- **Sem analytics.** Em Portugal não há isenção à francesa: qualquer
  estatística, mesmo auto-alojada, precisaria de consentimento — e portanto de
  banner. Zero analytics no cliente.
- **Sem banner de cookies:** o testemunho de sessão em armazenamento local é
  «estritamente necessário» (Lei 41/2004, art. 5.º/2). Nada é escrito no
  aparelho antes de a pessoa iniciar sessão.
- **ROPA (art. 30.º) obrigatório desde o primeiro dia** — a isenção para menos
  de 250 trabalhadores não se aplica, porque o tratamento é regular e não
  ocasional. **Está por escrever.** Ver secção 7.
- **Direito ao apagamento vs. reputação da outra pessoa:** eliminar a conta
  anonimiza (nome, email, telefone, fotografias). O registo de que houve um
  serviço, e a avaliação sem nome, permanecem — porque também são o histórico
  da outra parte, e não são desta pessoa para deitar fora. Está explicado na
  página de privacidade, em vez de escondido.

---

## 5. Consumo, reclamações e litígios

- **DL 7/2004, art. 10.º:** identificação completa do prestador no site.
  **POR PREENCHER** — as páginas assinalam os campos em falta com um marcador
  visível, e a página de termos abre com um aviso.
- **Livro de Reclamações electrónico** obrigatório mesmo só online
  (DL 156/2005 / DL 74/2017). Ligação no rodapé. Resposta em **15 dias úteis**.
- **RAL** (Lei 144/2015): entidade de competência genérica e residual é o
  **CNIACC**. Consoante o concelho da sede, pode existir centro de arbitragem
  territorialmente competente — **a fixar quando a sede estiver decidida**.
- **A plataforma ODR europeia foi desactivada a 20 de julho de 2025**
  (Reg. (UE) 2024/3228). Não se põe o link, apesar de continuar em muitos
  sites por copiar-colar. Há uma guarda na bateria que falha se ele aparecer.

---

## 6. Acessibilidade

O **Decreto-Lei n.º 82/2022** aplica-se a serviços de comércio electrónico
desde 28 de junho de 2025, mas o art. 3.º/5/b) **exclui as microempresas**.
Provavelmente estamos fora, por duas razões cumulativas (microempresa; e é
discutível que um mercado entre dois profissionais seja «serviço de comércio
electrónico»).

Construímos para **WCAG 2.1 AA** de qualquer maneira, porque a isenção legal
não é uma isenção de negócio: em Portugal, apenas **21 %** das pessoas entre os
65 e os 74 anos tem literacia digital de nível básico ou acima, e muitas donas
de alojamento local estão nesse escalão. Sem acessibilidade, metade do público
não consegue usar isto.

O que está medido por programa, e falha a construção:

- **72 pares de contraste** da paleta (`_source/verificar/contraste.mjs`);
- o contraste **real depois do CSS aplicado**, incluindo opacidade herdada, em
  seis ecrãs (`04-alvos-e-ecra.mjs`) — uma paleta impecável estraga-se com um
  `opacity: .6`;
- **alvos de toque**: 44 px de piso, 56 px no que se toca em campo;
- **24 px de folga** entre acção positiva e destrutiva;
- ecrã de **320 px** e letra a **200 %**;
- as **três promessas do `aria-modal`** (o foco entra, não sai, e volta);
- o campo de código **aceita colar** e declara `autocomplete="one-time-code"`
  — transcrever um código à mão é um «teste de função cognitiva» proibido pelo
  critério 3.3.8 do WCAG 2.2 sem alternativa.

---

## 6-A. Onde isto está alojado — um risco a decidir

> **Não confirmado por mim.** Dois agentes de investigação independentes
> relataram que os **Termos Adicionais do GitHub** dizem que o Pages «não é
> destinado nem permitido como serviço de alojamento gratuito para gerir o seu
> negócio em linha, sítio de comércio electrónico, ou qualquer outro sítio
> dirigido principalmente a facilitar transacções comerciais ou a fornecer
> software comercial como serviço (SaaS)». **Não consegui abrir a página dos
> termos para citar o texto exacto** (a documentação devolveu 404 e o orçamento
> de pesquisa da sessão esgotou-se). Confirmar antes de decidir.

Como está hoje, o Tudo Pronto fica do lado favorável dessa cláusula, se ela
existir nesses termos:

- **não facilita transacções comerciais** — não processa, retém nem transfere
  pagamentos;
- **não é software comercial como serviço** — é gratuito para ambos os lados e
  não tem receita;
- não é uma loja.

**Mas o risco é real e a decisão é fácil de tomar a favor da segurança:** o
**Cloudflare Pages** aloja isto ao mesmo custo (zero), não tem restrição
documentada de uso comercial, e a API já corre na Cloudflare — passaria a
haver um fornecedor em vez de dois, e um domínio em vez de dois.

**Recomendação:** manter o GitHub Pages enquanto isto for gratuito e sem
pagamentos, e **mudar para o Cloudflare Pages antes** de (a) haver qualquer
receita, ou (b) haver qualquer fluxo de pagamento. A mudança é de meia hora: o
gerador já produz um sítio estático e deriva os caminhos do `CNAME`.

---

## 6-B. O que já falhou neste mercado, e quem o pode fechar

Não é conformidade, mas condiciona as decisões tanto como ela.

**A Helpling faliu em janeiro de 2023** — era o maior marketplace de limpezas
da Europa. Começou com cerca de 23 % de comissão e acabou a impor um preço
mínimo. As duas causas aplicam-se-nos por inteiro:

1. num serviço **recorrente e pré-agendado**, sair da plataforma é trivial —
   as duas pessoas conhecem-se ao fim do primeiro serviço;
2. o preço tem **tecto no mercado informal**: uma comissão significativa não
   sobrevive à alternativa de combinar por WhatsApp.

É a razão pela qual o Tudo Pronto **não tenta cobrar comissão** e **não tenta
impedir o contacto directo**. Não é generosidade: é a única leitura honesta do
que aconteceu a quem tentou.

**O Airbnb lançou, a 16 de outubro de 2024, uma rede de co-anfitriões** de duas
faces, com «limpeza e manutenção» entre as categorias, sem taxa de
emparelhamento e com o preço definido pelo co-anfitrião. Se ligarem o
interruptor a Portugal, o emparelhamento passa a ser gratuito dentro da
aplicação onde as reservas já vivem.

**A defesa não pode ser funcionalidade.** Duas coisas que a rede do Airbnb não
serve, e que são o nosso terreno: exige **historial de anfitrião** — barreira
absoluta para uma profissional de limpeza que nunca alugou nada — e vive
dentro do Airbnb, enquanto muitos alojamentos estão também no Booking, no Vrbo
e em reservas directas.

**O mercado está a encolher, e isso importa:** o RNAL passou de ~126 mil
registos (dezembro de 2025) para ~119 mil (março de 2026), com previsão de
estabilizar perto dos 90 mil, por causa do saneamento por falta de seguro
obrigatório. O alvo continua a existir e mede-se: **46 % do alojamento local de
Lisboa e 43 % do Porto são explorados pelo próprio dono** — é exactamente quem
não tem empresa de gestão a tratar-lhe das limpezas.

---

## 7. O que falta, e o que bloqueia a abertura ao público

**Não abrir ao público antes de resolver os quatro primeiros.**

| # | O que falta | Porquê bloqueia |
|---|---|---|
| 1 | **Identificação da entidade**: denominação, NIF, sede, registo comercial, capital social. Preencher em `_source/dados/site.json`. | DL 7/2004 art. 10.º. As páginas mostram marcadores de «por preencher» enquanto faltar. |
| 2 | **Credenciais do Mailjet** (`MAILJET_CHAVE`, `MAILJET_SEGREDO`, `MAILJET_REMETENTE`). | Sem isto não sai email nenhum: ninguém confirma o email nem recupera a conta. A aplicação não rebenta — regista no log e continua — mas a recuperação de conta não funciona. |
| 3 | **ROPA** (registo das actividades de tratamento), art. 30.º RGPD. | Obrigatório desde o primeiro tratamento. |
| 4 | **Centro de arbitragem territorialmente competente**, em função da sede. | Completa a informação de RAL nos termos. |
| 5 | Domínio **tudopronto.pt** (livre a 7 de setembro de 2026) + `CNAME` no repositório. | O gerador deriva os caminhos do `CNAME`: com ele, os caminhos passam a absolutos sozinhos. |
| 6 | **SPF e DKIM** no domínio, depois de o comprar. | Sem alinhamento, o código de confirmação cai no spam — e um código no spam é pior do que código nenhum: a pessoa conclui que a aplicação está avariada. |
| 7 | **Decidir a estratégia DAC7** (secção 2): recolher os dados e cumprir desde o início, ou manter-se como agenda entre partes que já se conhecem até isso estar resolvido. | O mercado aberto não deve ser publicitado antes desta decisão. |
| 8 | Acrescentar o **seguro de acidentes de trabalho** à lista de obrigações na página de quem faz limpezas. | É obrigação de quem trabalha por conta própria, e não a podemos contratar por ninguém. |
| 9 | **Confirmar os Termos Adicionais do GitHub** quanto ao Pages (secção 6-A) e decidir se se muda já para o Cloudflare Pages. | Não consegui confirmar o texto. A mudança é de meia hora e o custo mantém-se zero. |
| 10 | Rever tudo isto a **2 de dezembro de 2026**. | Prazo de transposição da Directiva 2024/2831. |
