# Tudo Pronto

**A casa pronta para o próximo hóspede.**

Liga quem tem alojamento local a profissionais de limpeza independentes.
O dono publica a limpeza; quem faz limpezas vê o que há perto de si e
oferece-se ao seu preço; no fim os dois avaliam-se, com as avaliações a
aparecer ao mesmo tempo. Sem comissões, e sem infra-estrutura paga.

- **Site e aplicação:** GitHub Pages (estático)
- **API:** Cloudflare Worker + D1 + KV, plano gratuito, jurisdição europeia
- **Custo de infra-estrutura:** 0 €

---

## A ideia, em duas frases

Um mercado vazio não vale nada no primeiro dia. Por isso a promessa principal
não é «encontre alguém» — é **traga a pessoa que já limpa a sua casa**: o dono
convida-a por email, ela fica na equipa dele, e passa a receber as limpezas
directamente. Uma agenda partilhada com quem já se conhece é útil sozinha, e o
mercado aberto é a camada de cima, para as semanas em que essa pessoa não pode.

Cada dono que entra traz uma profissional para a rede. É o que resolve o
arranque a frio sem gastar um euro.

## Onde isto se encaixa no mercado

Há **111 581** alojamentos locais registados em Portugal continental —
102 208 são apartamentos e moradias, as tipologias que geram limpeza de saída.
Faro tem 44 901 (40 % do país), Lisboa 19 064, Porto 14 229.
*(RNAL, dados abertos do Turismo de Portugal, consultados a 6 de setembro de 2026;
uma parte está em saneamento por falta de seguro obrigatório.)*

E ninguém em Portugal faz exactamente isto:

- a **Doinn** (portuguesa) diz por escrito na sua página de fornecedores que
  **não trabalha com profissionais de limpeza independentes** — só com empresas;
- a **Turno** (o análogo global, 126 mil profissionais) diz cobrir Portugal,
  mas as páginas das cidades portuguesas dão 404 e os testemunhos são todos
  norte-americanos;
- a **Zaask** e a **Fixando** vendem contactos por crédito e não têm categoria
  de alojamento local.

O concorrente real é o **OLX e o WhatsApp com o calendário do telemóvel**.

## As decisões que definem o produto

**A morada só aparece a quem é escolhido.** No mercado mostra-se a freguesia,
a tipologia e a distância aproximada — calculada a partir do centróide do
concelho, nunca da casa. A morada, o andar, o código da caixa de chaves e o
telefone só existem para a pessoa atribuída, e só a partir do momento em que o
é. Um anúncio público com morada e código de acesso é um convite a assaltos.

**Quem escolhe é o dono.** Por omissão as candidaturas chegam e ele decide,
com o histórico à frente. «Fica quem chegar primeiro» existe, mas tem de ser
ligado de propósito em cada limpeza. Dar a chave de casa a alguém não é uma
corrida.

**As avaliações aparecem ao mesmo tempo.** O que cada um escreve fica
escondido até o outro também escrever, ou até passarem 14 dias. Sem isto, quem
avalia primeiro fica exposto a retaliação, e o resultado conhecido é toda a
gente dar cinco estrelas por prudência — o que torna a reputação inútil. Foi o
que o Airbnb resolveu em 2014.

**Duas medidas separadas, não uma pontuação.** Estrelas (como foi o trabalho) e
serviços concluídos face aos aceites (se se pode contar com a pessoa).
Misturá-las penaliza quem trabalha pouco em vez de quem trabalha mal.

**A plataforma não toca no dinheiro e não fixa preços.** O pagamento é entre as
duas pessoas. Isto não é preguiça: é o que mantém o projecto fora da presunção
de contrato de trabalho do artigo 12.º-A do Código do Trabalho e fora do
conceito de plataforma reportante do DAC7. Ver
[`legal/CONFORMIDADE.md`](legal/CONFORMIDADE.md).

**A fotografia nunca impede fechar o serviço.** Marca-se local, sobe depois,
por uma fila em IndexedDB com chave de idempotência. Uma casa de granito sem
rede não pode ser o fim do trabalho.

## Desenho, para quem vai usar isto de pé

O público inclui donas de alojamento com mais de 65 anos — escalão em que
apenas **21 %** das pessoas em Portugal tem literacia digital de nível básico
ou acima — e profissionais de limpeza com luvas, mãos molhadas e pouca rede.
Daí:

- **um** botão primário por ecrã, largura total, 56 px, ancorado no fundo, com
  o rótulo a mudar conforme o estado: *Oferecer-me*, *Cheguei — começar*,
  *Tudo pronto*;
- 44 px de piso para tudo o que se toca, 24 px de folga obrigatória entre uma
  acção positiva e uma destrutiva, e nunca as duas na mesma linha;
- registo em quatro campos; sem menu escondido; quatro destinos na barra;
- «Feito. Anular» durante 15 segundos em vez de «tem a certeza?» antes;
- 17 px de corpo mínimo, e o layout aguenta letra a 200 %;
- contraste medido por programa — e medido **outra vez** no browser, depois de
  o CSS aplicado, porque uma paleta impecável estraga-se com um `opacity: .6`.

## Como se corre isto

```bash
# construir (morre se faltar um campo obrigatório ou se a paleta falhar)
node _source/construir.mjs

# ver em casa
PORTA=4700 node _source/verificar/servir.mjs   # http://localhost:4700/TudoPronto/

# a API, em local
cd api && npx wrangler d1 execute tudopronto --local --file=./esquema.sql -y
npx wrangler dev --local --port 8787 --var SAL_TRAVAO:local --var AMBIENTE:dev
```

### Verificação

```bash
node _source/verificar/contraste.mjs    # 72 pares de contraste da paleta
node _source/verificar/api.mjs          # 78 testes da API
node _source/verificar/bateria.mjs      # 202 testes de browser, a conduzir a app
node _source/verificar/bateria.mjs alvos   # só um módulo
BATERIA_CAPTURAS=1 node _source/verificar/bateria.mjs   # guarda fotografias
```

A bateria de browser sobe o seu próprio servidor e o seu próprio Worker, e
esvazia a base local antes de começar — corre no CI sem preparação nenhuma.

Ela conduz **com o rato**, não com `elemento.click()`: mede o elemento, aponta
ao centro, verifica com `elementFromPoint` quem está lá, e só então carrega.
É a única forma de um teste falhar quando um botão está tapado — e foi assim
que se descobriu um aviso flutuante a comer os toques do botão principal.

## Estrutura

```
_source/
  construir.mjs          gerador (sem dependências)
  dados.mjs              módulo de dados puro — não importa nada, evita ciclos
  dados/site.json        fonte da verdade dos textos e números
  marca/paleta.json      fonte da verdade das cores
  paginas/               templates do site de apresentação
  app/                   a aplicação: index.html, nucleo.js, sw.js, CSS
  verificar/             contraste, API, e a bateria de browser
api/
  src/                   o Worker (2 600 linhas)
  esquema.sql            18 tabelas, 25 índices
legal/CONFORMIDADE.md    o dossiê
```

O CSS é **gerado** a partir de `marca/paleta.json`, que é a mesma fonte que o
verificador mede. Nenhuma cor é escrita à mão. Nenhum contacto é escrito à mão
numa página: sai de `dados/site.json`, e a construção morre se faltar um campo
obrigatório — senão uma página legal fica a mentir em silêncio no dia em que
alguém mexe nos dados.

## Falta, antes de abrir ao público

1. **Identificação da entidade** (denominação, NIF, sede, registo comercial) em
   `_source/dados/site.json` — exigida pelo art. 10.º do DL 7/2004. Enquanto
   faltar, as páginas mostram marcadores visíveis de «por preencher».
2. **Credenciais do Mailjet** — sem elas não sai email, e a recuperação de
   conta não funciona.
3. **ROPA** (art. 30.º RGPD).
4. **Domínio** `tudopronto.pt` (livre a 7 de setembro de 2026) e o ficheiro
   `CNAME` — o gerador deriva os caminhos dele.

A lista completa, com o porquê de cada uma, está em
[`legal/CONFORMIDADE.md`](legal/CONFORMIDADE.md), secção 7.
