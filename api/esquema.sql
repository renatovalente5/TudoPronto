-- Tudo Pronto — esquema D1 (SQLite).
-- Regras que atravessam o esquema todo:
--  1. Toda a consulta do caminho quente tem de bater num indice. No D1 gratuito
--     "linhas lidas" sao linhas PERCORRIDAS: um SELECT sem indice sobre 10 mil
--     servicos gasta 10 mil leituras das 5M/dia.
--  2. Datas em texto ISO-8601 UTC ('2026-09-07T14:30:00Z'). SQLite ordena
--     lexicograficamente, o que da ordenacao cronologica de graca.
--  3. Dinheiro em CENTIMOS inteiros. Nunca float.
--  4. Ids opacos gerados no Worker (crypto.randomUUID sem hifens), nunca
--     sequenciais: um id sequencial deixa adivinhar quantos utilizadores ha e
--     enumerar as casas de outras pessoas.

PRAGMA foreign_keys = ON;

-- ─────────────────────────────── contas ───────────────────────────────
-- Uma pessoa, uma conta. Os papeis sao bandeiras e nao tipos de conta: quem
-- tem um alojamento e tambem limpa para outros nao precisa de duas contas.
CREATE TABLE IF NOT EXISTS contas (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE,        -- guardado em minusculas
  senha_hash        TEXT NOT NULL,               -- SHA-256(sal || pbkdf2_do_cliente)
  senha_sal         TEXT NOT NULL,
  nome              TEXT NOT NULL,
  telefone          TEXT,                        -- revelado a outra parte SO depois de atribuido
  e_dono            INTEGER NOT NULL DEFAULT 0,
  e_profissional    INTEGER NOT NULL DEFAULT 0,
  concelho          TEXT,                        -- onde trabalha (profissional)
  raio_km           INTEGER NOT NULL DEFAULT 15, -- quao longe aceita ir
  bio               TEXT,
  foto_id           TEXT,                        -- binario em KV
  email_verificado  INTEGER NOT NULL DEFAULT 0,
  estado            TEXT NOT NULL DEFAULT 'activa'
                      CHECK (estado IN ('activa','suspensa','apagada')),
  criada_em         TEXT NOT NULL,
  visto_em          TEXT
);
CREATE INDEX IF NOT EXISTS idx_contas_concelho
  ON contas (concelho) WHERE e_profissional = 1 AND estado = 'activa';

-- ─────────────────────────────── sessoes ──────────────────────────────
-- Guarda-se o RESUMO do testemunho, nunca o testemunho: quem ler a base nao
-- fica com sessoes utilizaveis.
CREATE TABLE IF NOT EXISTS sessoes (
  token_hash  TEXT PRIMARY KEY,
  conta_id    TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  criada_em   TEXT NOT NULL,
  expira_em   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessoes_conta ON sessoes (conta_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes (expira_em);

-- Codigos de 6 algarismos (verificar email, recuperar conta). Um link de email
-- nao entra numa app instalada no iOS — o Safari e a app tem armazenamentos
-- separados — por isso e codigo para escrever, e nao ligacao para carregar.
CREATE TABLE IF NOT EXISTS codigos (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  codigo_hash TEXT NOT NULL,
  fim         TEXT NOT NULL CHECK (fim IN ('verificar','recuperar')),
  tentativas  INTEGER NOT NULL DEFAULT 0,
  expira_em   TEXT NOT NULL,
  usado_em    TEXT,
  criado_em   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_codigos_email ON codigos (email, fim);

-- ───────────────────────────── alojamentos ────────────────────────────
-- A morada exacta e as instrucoes de acesso NAO sao publicas. O mercado mostra
-- freguesia + tipologia; a morada e o codigo da caixa de chaves aparecem a UMA
-- pessoa, depois de o dono a escolher. E minimizacao de dados e e seguranca:
-- um anuncio publico com morada e codigo de acesso e um convite a assaltos.
CREATE TABLE IF NOT EXISTS alojamentos (
  id             TEXT PRIMARY KEY,
  dono_id        TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,             -- "T2 Baixa" — nome interno do dono
  tipologia      TEXT NOT NULL,             -- T0..T5+
  quartos        INTEGER NOT NULL DEFAULT 1,
  camas          INTEGER NOT NULL DEFAULT 1,
  casas_banho    INTEGER NOT NULL DEFAULT 1,
  area_m2        INTEGER,
  distrito       TEXT NOT NULL,
  concelho       TEXT NOT NULL,
  freguesia      TEXT,
  morada         TEXT NOT NULL,             -- reservada
  codigo_postal  TEXT,
  acesso         TEXT,                      -- reservada: caixa de chaves, andar, portao
  instrucoes     TEXT,                      -- o que o dono quer que se saiba
  registo_al     TEXT,                      -- numero do RNAL: prova que o alojamento e legal
  tem_elevador   INTEGER NOT NULL DEFAULT 0,
  andar          TEXT,
  lat            REAL,                      -- centroide do concelho, nao a casa
  lon            REAL,
  arquivado      INTEGER NOT NULL DEFAULT 0,
  criado_em      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aloj_dono ON alojamentos (dono_id, arquivado);

-- ─────────────────────────────── servicos ─────────────────────────────
-- O pedido. "aberto" = visivel no mercado. "convidado" = oferecido a pessoas
-- especificas da equipa de confianca e a mais ninguem.
CREATE TABLE IF NOT EXISTS servicos (
  id                TEXT PRIMARY KEY,
  alojamento_id     TEXT NOT NULL REFERENCES alojamentos(id) ON DELETE CASCADE,
  dono_id           TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  profissional_id   TEXT REFERENCES contas(id) ON DELETE SET NULL,
  tipo              TEXT NOT NULL DEFAULT 'saida'
                      CHECK (tipo IN ('saida','profunda','preparacao','manutencao')),
  data              TEXT NOT NULL,            -- '2026-09-12'
  hora_inicio       TEXT NOT NULL,            -- '11:00' — a partir de que horas pode entrar
  hora_limite       TEXT NOT NULL,            -- '15:00' — tem de estar pronto a esta hora
  duracao_prevista  INTEGER,                  -- minutos, estimativa do dono
  muda_roupa        INTEGER NOT NULL DEFAULT 1,
  roupa_de           TEXT NOT NULL DEFAULT 'alojamento'
                      CHECK (roupa_de IN ('alojamento','profissional','lavandaria')),
  repor_consumiveis INTEGER NOT NULL DEFAULT 1,
  produtos_de       TEXT NOT NULL DEFAULT 'alojamento'
                      CHECK (produtos_de IN ('alojamento','profissional')),
  valor             INTEGER,                  -- centimos. Proposto pelo DONO, nunca pela plataforma.
  notas             TEXT,
  visibilidade      TEXT NOT NULL DEFAULT 'mercado'
                      CHECK (visibilidade IN ('mercado','equipa','directo')),
  aceita_primeira   INTEGER NOT NULL DEFAULT 0, -- 1 = quem chega primeiro fica (urgencias)
  estado            TEXT NOT NULL DEFAULT 'aberto'
                      CHECK (estado IN ('aberto','atribuido','a_decorrer','concluido','cancelado','expirado')),
  cancelado_por     TEXT,
  motivo_cancelamento TEXT,
  criado_em         TEXT NOT NULL,
  atribuido_em      TEXT,
  iniciado_em       TEXT,
  concluido_em      TEXT
);
-- O mercado: "servicos abertos, por data". Sem este indice, cada abertura do
-- mercado percorre a tabela inteira.
CREATE INDEX IF NOT EXISTS idx_serv_mercado ON servicos (estado, data) WHERE estado = 'aberto';
CREATE INDEX IF NOT EXISTS idx_serv_dono ON servicos (dono_id, data);
CREATE INDEX IF NOT EXISTS idx_serv_prof ON servicos (profissional_id, data);
CREATE INDEX IF NOT EXISTS idx_serv_aloj ON servicos (alojamento_id, data);

-- ──────────────────────────── candidaturas ────────────────────────────
-- O profissional oferece-se e diz por quanto. A plataforma nao sugere valores:
-- quem propoe e o dono, quem contrapoe e o profissional. Isto e desenho
-- deliberado — uma plataforma que fixa o preco do trabalho aproxima-se da
-- presuncao de contrato de trabalho do art. 12.-A do Codigo do Trabalho.
CREATE TABLE IF NOT EXISTS candidaturas (
  id               TEXT PRIMARY KEY,
  servico_id       TEXT NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  profissional_id  TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  valor            INTEGER,                 -- centimos; NULL = aceita o proposto
  mensagem         TEXT,
  estado           TEXT NOT NULL DEFAULT 'pendente'
                     CHECK (estado IN ('pendente','aceite','recusada','retirada')),
  criada_em        TEXT NOT NULL,
  respondida_em    TEXT,
  UNIQUE (servico_id, profissional_id)
);
CREATE INDEX IF NOT EXISTS idx_cand_servico ON candidaturas (servico_id, estado);
CREATE INDEX IF NOT EXISTS idx_cand_prof ON candidaturas (profissional_id, criada_em);

-- ───────────────────────── equipa de confianca ────────────────────────
-- O que faz a aplicacao valer no primeiro dia, com o mercado ainda vazio: o
-- dono traz a pessoa que JA limpa a casa dele. Cada dono que entra traz uma
-- profissional para a rede.
CREATE TABLE IF NOT EXISTS equipa (
  id               TEXT PRIMARY KEY,
  dono_id          TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  profissional_id  TEXT REFERENCES contas(id) ON DELETE CASCADE,
  convite_email    TEXT,                    -- quando ainda nao tem conta
  convite_codigo   TEXT,                    -- o codigo que ela escreve para se ligar
  alcunha          TEXT,                    -- como o dono lhe chama na sua lista
  estado           TEXT NOT NULL DEFAULT 'convidada'
                     CHECK (estado IN ('convidada','activa','removida')),
  criada_em        TEXT NOT NULL,
  aceite_em        TEXT
);
CREATE INDEX IF NOT EXISTS idx_equipa_dono ON equipa (dono_id, estado);
CREATE INDEX IF NOT EXISTS idx_equipa_prof ON equipa (profissional_id, estado);
CREATE UNIQUE INDEX IF NOT EXISTS idx_equipa_codigo ON equipa (convite_codigo) WHERE convite_codigo IS NOT NULL;

-- ──────────────────────────── lista de tarefas ────────────────────────
-- Modelo por alojamento; cada servico recebe uma copia. Copiar em vez de
-- apontar e deliberado: mudar a lista do alojamento nao pode reescrever o que
-- ja foi feito num servico do mes passado.
CREATE TABLE IF NOT EXISTS tarefas_modelo (
  id             TEXT PRIMARY KEY,
  alojamento_id  TEXT NOT NULL REFERENCES alojamentos(id) ON DELETE CASCADE,
  zona           TEXT NOT NULL,            -- Cozinha, Quarto 1, WC...
  descricao      TEXT NOT NULL,
  exige_foto     INTEGER NOT NULL DEFAULT 0,
  ordem          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tmodelo_aloj ON tarefas_modelo (alojamento_id, ordem);

CREATE TABLE IF NOT EXISTS tarefas (
  id            TEXT PRIMARY KEY,
  servico_id    TEXT NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  zona          TEXT NOT NULL,
  descricao     TEXT NOT NULL,
  exige_foto    INTEGER NOT NULL DEFAULT 0,
  ordem         INTEGER NOT NULL DEFAULT 0,
  feita_em      TEXT,
  foto_id       TEXT
);
CREATE INDEX IF NOT EXISTS idx_tarefas_servico ON tarefas (servico_id, ordem);

-- ───────────────────────────────  fotos  ──────────────────────────────
-- Metadados aqui; o binario em KV (as escritas do D1 sao 100k/dia e uma
-- fotografia nao tem nada que fazer numa base de dados relacional).
CREATE TABLE IF NOT EXISTS fotos (
  id          TEXT PRIMARY KEY,
  servico_id  TEXT REFERENCES servicos(id) ON DELETE CASCADE,
  autor_id    TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  fim         TEXT NOT NULL CHECK (fim IN ('tarefa','dano','perdido','perfil','alojamento')),
  bytes       INTEGER NOT NULL,
  largura     INTEGER,
  altura      INTEGER,
  criada_em   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fotos_servico ON fotos (servico_id, fim);

-- ──────────────────────────── ocorrencias ─────────────────────────────
-- Danos, objectos esquecidos, falta de produtos. E o que transforma a app de
-- "agenda" em "prova": uma fotografia com hora resolve a discussao de quem
-- partiu o copo.
CREATE TABLE IF NOT EXISTS ocorrencias (
  id          TEXT PRIMARY KEY,
  servico_id  TEXT NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  autor_id    TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('dano','perdido','falta','outro')),
  descricao   TEXT NOT NULL,
  foto_id     TEXT,
  criada_em   TEXT NOT NULL,
  vista_em    TEXT
);
CREATE INDEX IF NOT EXISTS idx_ocor_servico ON ocorrencias (servico_id);

-- ──────────────────────────── avaliacoes ──────────────────────────────
-- Revelacao simultanea: uma avaliacao fica escondida ate a outra parte
-- tambem avaliar, ou ate passar o prazo. Sem isto, quem avalia primeiro fica
-- exposto a retaliacao e ninguem escreve o que pensa — foi o que o Airbnb
-- resolveu em 2014 ao passar as avaliacoes a duplo-cego.
CREATE TABLE IF NOT EXISTS avaliacoes (
  id           TEXT PRIMARY KEY,
  servico_id   TEXT NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  autor_id     TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  avaliado_id  TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  estrelas     INTEGER NOT NULL CHECK (estrelas BETWEEN 1 AND 5),
  etiquetas    TEXT,                     -- JSON de etiquetas de uma lista fechada
  comentario   TEXT,                     -- texto livre: espera por revelacao
  criada_em    TEXT NOT NULL,
  revelar_em   TEXT NOT NULL,            -- prazo maximo; revela antes se ambos avaliarem
  revelada_em  TEXT,
  UNIQUE (servico_id, autor_id)
);
CREATE INDEX IF NOT EXISTS idx_aval_avaliado ON avaliacoes (avaliado_id, revelada_em);
CREATE INDEX IF NOT EXISTS idx_aval_revelar ON avaliacoes (revelar_em) WHERE revelada_em IS NULL;

-- Resumo desnormalizado. Calcular a media de 300 avaliacoes a cada abertura de
-- perfil custa 300 linhas lidas; aqui custa 1.
CREATE TABLE IF NOT EXISTS reputacao (
  conta_id       TEXT PRIMARY KEY REFERENCES contas(id) ON DELETE CASCADE,
  papel          TEXT NOT NULL CHECK (papel IN ('dono','profissional')),
  soma_estrelas  INTEGER NOT NULL DEFAULT 0,
  n_avaliacoes   INTEGER NOT NULL DEFAULT 0,
  n_concluidos   INTEGER NOT NULL DEFAULT 0,
  n_cancelados   INTEGER NOT NULL DEFAULT 0,
  n_faltas       INTEGER NOT NULL DEFAULT 0,   -- aceitou e nao apareceu
  actualizada_em TEXT NOT NULL
);

-- ──────────────────────────── mensagens ───────────────────────────────
CREATE TABLE IF NOT EXISTS mensagens (
  id          TEXT PRIMARY KEY,
  servico_id  TEXT NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
  autor_id    TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL,
  criada_em   TEXT NOT NULL,
  lida_em     TEXT
);
CREATE INDEX IF NOT EXISTS idx_msg_servico ON mensagens (servico_id, criada_em);

-- ───────────────────────── avisos e subscricoes ───────────────────────
CREATE TABLE IF NOT EXISTS avisos (
  id         TEXT PRIMARY KEY,
  conta_id   TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL,
  titulo     TEXT NOT NULL,
  corpo      TEXT,
  ligacao    TEXT,
  criado_em  TEXT NOT NULL,
  lido_em    TEXT
);
CREATE INDEX IF NOT EXISTS idx_avisos_conta ON avisos (conta_id, criado_em);

CREATE TABLE IF NOT EXISTS push (
  id        TEXT PRIMARY KEY,
  conta_id  TEXT NOT NULL REFERENCES contas(id) ON DELETE CASCADE,
  endpoint  TEXT NOT NULL UNIQUE,
  p256dh    TEXT NOT NULL,
  auth      TEXT NOT NULL,
  criada_em TEXT NOT NULL,
  falhas    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_push_conta ON push (conta_id);

-- ───────────────────────────── travao de abuso ────────────────────────
-- O travao vive no SERVIDOR. Guarda-se o resumo do IP com sal do dia, nunca o
-- IP: e interesse legitimo e nao identifica ninguem depois da meia-noite.
-- Em IPv6 resume-se o prefixo /64 — um /64 domestico tem 2^64 enderecos e um
-- travao por endereco nao travaria nada.
CREATE TABLE IF NOT EXISTS travao (
  chave      TEXT PRIMARY KEY,   -- sha256(sal_do_dia || acao || prefixo_ip)
  contagem   INTEGER NOT NULL DEFAULT 1,
  primeiro   TEXT NOT NULL,
  ultimo     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_travao_ultimo ON travao (ultimo);

-- ─────────────────────────────── denuncias ────────────────────────────
CREATE TABLE IF NOT EXISTS denuncias (
  id           TEXT PRIMARY KEY,
  autor_id     TEXT REFERENCES contas(id) ON DELETE SET NULL,
  alvo_tipo    TEXT NOT NULL CHECK (alvo_tipo IN ('conta','servico','avaliacao','mensagem')),
  alvo_id      TEXT NOT NULL,
  motivo       TEXT NOT NULL,
  descricao    TEXT,
  estado       TEXT NOT NULL DEFAULT 'aberta'
                 CHECK (estado IN ('aberta','em_analise','resolvida','rejeitada')),
  criada_em    TEXT NOT NULL,
  resolvida_em TEXT
);
CREATE INDEX IF NOT EXISTS idx_den_estado ON denuncias (estado, criada_em);
