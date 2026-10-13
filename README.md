# Confeitaria · Gestão e Precificação

Sistema web para precificar receitas de bolachas, bolos e docinhos, garantindo uma margem de lucro sobre o custo.

## Como funciona o preço

```
custo dos ingredientes = soma de (quantidade usada ÷ quantidade padrão × preço) de cada ingrediente
gastos gerais          = valores fixos (R$) + percentuais (%) sobre o custo dos ingredientes
custo total            = custo dos ingredientes + gastos gerais
preço de venda         = custo total × (1 + margem)      → margem padrão de 30%
preço por unidade      = preço de venda ÷ rendimento
```

As unidades são convertidas automaticamente. Um ingrediente comprado em **kg** pode ser usado em **g** na receita, e um comprado em **l** pode ser usado em **ml**.
Também é possível cadastrar **medidas próprias**, como Caixa (cx) = 240 ml ou Dúzia (dz) = 12 un, e usá-las nos ingredientes e nas receitas.
Quando o preço de um ingrediente, um gasto geral ou a margem muda, **todas as receitas são recalculadas** na hora.

## Funcionalidades

- **Ingredientes:** listar, buscar, cadastrar, editar preço e medida, excluir (bloqueado se estiver em uso numa receita).
- **Receitas:** listar por categoria, ver detalhes com custo de cada ingrediente, criar e editar com cálculo de preço em tempo real.
- **Medidas:** cadastro de medidas personalizadas (caixa, lata, xícara...) com quanto cada uma equivale. Podem existir várias com o mesmo nome e tamanhos diferentes.
- **Gastos gerais:** água, luz, gás etc., como valor fixo por receita ou percentual. Podem ser ativados e desativados.
- **Margem de lucro:** padrão global (30%) editável, com opção de margem personalizada por receita.

## Tecnologias

| Parte         | Tecnologia                                    |
| ------------- | --------------------------------------------- |
| Site          | React 18 + TypeScript + Vite + React Router   |
| API           | Node.js + Express 5 + TypeScript              |
| Banco         | PostgreSQL                                    |

## Como rodar

Pré-requisitos: **Node.js 18+** e **PostgreSQL**.

1. Crie o banco e configure `server/.env`. O passo a passo está em [GUIA_BANCO_DE_DADOS.md](GUIA_BANCO_DE_DADOS.md).
2. Na pasta do projeto:

   ```powershell
   npm install
   npm run dev
   ```

3. Abra **http://localhost:5173**.

| Comando           | O que faz                                           |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Inicia API (porta 3001) e site (porta 5173)         |
| `npm run db:init` | Cria as tabelas no banco (também é feito ao iniciar) |
| `npm run build`   | Gera a versão de produção                           |

## Estrutura

```
├── GUIA_BANCO_DE_DADOS.md     guia de criação e conexão do banco
├── docker-compose.yml         alternativa: PostgreSQL via Docker
├── server/                    API (Express + PostgreSQL)
│   ├── db/schema.sql          estrutura das tabelas
│   ├── .env.example           modelo de configuração
│   └── src/
│       ├── index.ts           servidor e tratamento de erros
│       ├── db.ts              conexão com o banco
│       ├── validacao.ts       validação dos dados recebidos
│       └── routes/            ingredientes, receitas, medidas, gastos, configuracoes
└── client/                    site (React + TypeScript)
    └── src/
        ├── lib/               API, tipos, unidades, cálculo de preço, formatação
        ├── components/        layout, resumo de preço, componentes visuais
        └── pages/             telas do sistema
```

## Rotas da API

| Método                 | Rota                         | Descrição                    |
| ---------------------- | ---------------------------- | ---------------------------- |
| GET / POST             | `/api/ingredientes`          | Listar / criar ingrediente   |
| GET / PUT / DELETE     | `/api/ingredientes/:id`      | Ver / editar / excluir       |
| GET / POST             | `/api/receitas`              | Listar / criar receita       |
| GET / PUT / DELETE     | `/api/receitas/:id`          | Ver / editar / excluir       |
| GET / POST             | `/api/medidas`               | Listar / criar medida        |
| PUT / DELETE           | `/api/medidas/:id`           | Editar / excluir medida      |
| GET / POST             | `/api/gastos`                | Listar / criar gasto geral   |
| PUT / DELETE           | `/api/gastos/:id`            | Editar / excluir gasto       |
| GET / PUT              | `/api/configuracoes`         | Ver / alterar margem padrão  |
| GET                    | `/api/health`                | Verifica conexão com o banco |
