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

> ⚠️ **A confirmar antes de citar em documento externo:** a data da Lei
> 36/2023 (26 ou 31 de julho de 2023). A fonte consultada indicou 26 de julho.
> Confirmar no Diário da República.

**«Prestação de um serviço pessoal» é actividade relevante.** O limiar de
dispensa (menos de 30 actividades e até 2 000 €) **só existe para venda de
bens**: em serviços **não há mínimo**. Em princípio, uma pessoa que fizesse
duas limpezas por ano seria comunicada.

**A saída, e é a decisão de arquitectura mais consequente do projecto:**

1. A «contrapartida» a comunicar é apenas a que o operador **conhece ou pode
   razoavelmente conhecer**.
2. O conceito de «plataforma» **exclui** software que apenas permita a oferta
   ou promoção da actividade pelos utilizadores.

O Tudo Pronto **não intermedia pagamentos**: não recebe, não retém, não
transfere, não garante. O valor combinado fica registado no serviço porque as
duas partes precisam de ter a mesma versão do que combinaram — mas é uma nota
entre elas, não uma contrapartida devida à plataforma nem processada por ela.

**Risco residual, dito em voz alta:** registar o valor acordado aproxima-nos do
conceito de plataforma reportante mais do que não o registar. A alternativa
(não registar nada) tira às duas partes a única prova escrita do que
combinaram, que é uma das razões pelas quais elas usam isto. A decisão foi
manter o registo e assumir o risco residual, por ser a mais honesta com o
utilizador. **Se um dia se ligar pagamentos, isto muda tudo** e passa a ser
obrigatório: registo DAC7 no Portal das Finanças, recolha de cinco campos de
identificação (nome, morada, NIF, data de nascimento, número de registo) e
comunicação até 31 de janeiro.

**Consequência para o modelo de receita:** se algum dia houver receita, **não
pode ser comissão por serviço**. Tem de ser subscrição do dono do alojamento
ou destaque pago do anúncio. Uma comissão faria de nós plataforma reportante e
recolocaria a alínea a) do 12.º-A em cima da mesa.

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
| 7 | Rever tudo isto a **2 de dezembro de 2026**. | Prazo de transposição da Directiva 2024/2831. |
