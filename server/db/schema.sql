-- Estrutura do banco de dados da confeitaria.
-- Pode ser executado várias vezes com segurança (usa IF NOT EXISTS).

-- Medidas personalizadas (ex.: Caixa "cx" = 240 ml, Dúzia "dz" = 12 un).
-- Cada medida equivale a uma quantidade de uma unidade básica.
CREATE TABLE IF NOT EXISTS medidas (
  id         SERIAL PRIMARY KEY,
  nome       VARCHAR(60)   NOT NULL,
  sigla      VARCHAR(10)   NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL CHECK (quantidade > 0),
  unidade    VARCHAR(5)    NOT NULL CHECK (unidade IN ('g', 'kg', 'ml', 'l', 'un')),
  criado_em  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (sigla, quantidade, unidade)
);

CREATE TABLE IF NOT EXISTS ingredientes (
  id                SERIAL PRIMARY KEY,
  nome              VARCHAR(120)  NOT NULL UNIQUE,
  unidade           VARCHAR(5)    NOT NULL CHECK (unidade IN ('g', 'kg', 'ml', 'l', 'un')),
  quantidade_padrao NUMERIC(12,3) NOT NULL CHECK (quantidade_padrao > 0),
  preco             NUMERIC(12,2) NOT NULL CHECK (preco >= 0),
  criado_em         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receitas (
  id                 SERIAL PRIMARY KEY,
  nome               VARCHAR(150)  NOT NULL,
  categoria          VARCHAR(20)   NOT NULL CHECK (categoria IN ('bolacha', 'bolo', 'docinho')),
  modo_preparo       TEXT          NOT NULL DEFAULT '',
  rendimento         NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (rendimento > 0),
  unidade_rendimento VARCHAR(30)   NOT NULL DEFAULT 'unidades',
  -- NULL = usa a margem padrão definida em "configuracoes"
  margem_lucro       NUMERIC(6,2)  CHECK (margem_lucro >= 0),
  criado_em          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  atualizado_em      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS receita_ingredientes (
  id             SERIAL PRIMARY KEY,
  receita_id     INTEGER       NOT NULL REFERENCES receitas(id) ON DELETE CASCADE,
  ingrediente_id INTEGER       NOT NULL REFERENCES ingredientes(id) ON DELETE RESTRICT,
  quantidade     NUMERIC(12,3) NOT NULL CHECK (quantidade > 0),
  unidade        VARCHAR(5)    NOT NULL CHECK (unidade IN ('g', 'kg', 'ml', 'l', 'un'))
);

-- Uso de medidas personalizadas. Quando medida_id está preenchido:
--   * "quantidade" é contada nessa medida (ex.: 2 caixas)
--   * "unidade" guarda a unidade básica da medida (mantida em sincronia pela API)
ALTER TABLE ingredientes         ADD COLUMN IF NOT EXISTS medida_id INTEGER REFERENCES medidas(id) ON DELETE RESTRICT;
ALTER TABLE receita_ingredientes ADD COLUMN IF NOT EXISTS medida_id INTEGER REFERENCES medidas(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_receita_ingredientes_receita     ON receita_ingredientes(receita_id);
CREATE INDEX IF NOT EXISTS idx_receita_ingredientes_ingrediente ON receita_ingredientes(ingrediente_id);

-- Gastos gerais (água, luz, gás...) aplicados a TODAS as receitas.
--   tipo 'fixo'       -> valor em R$ somado ao custo de cada receita
--   tipo 'percentual' -> valor em % sobre o custo dos ingredientes da receita
CREATE TABLE IF NOT EXISTS gastos_gerais (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(100)  NOT NULL,
  tipo          VARCHAR(12)   NOT NULL CHECK (tipo IN ('fixo', 'percentual')),
  valor         NUMERIC(12,2) NOT NULL CHECK (valor >= 0),
  ativo         BOOLEAN       NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave VARCHAR(50) PRIMARY KEY,
  valor TEXT        NOT NULL
);

-- Margem de lucro padrão: 30%
INSERT INTO configuracoes (chave, valor) VALUES ('margem_lucro', '30')
ON CONFLICT (chave) DO NOTHING;
