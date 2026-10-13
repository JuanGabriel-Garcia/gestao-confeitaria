# Guia: criar o banco de dados e conectar ao sistema

O sistema guarda tudo num banco **PostgreSQL**. Você só precisa fazer três coisas:

1. Criar um banco de dados vazio (e um usuário para ele).
2. Informar o endereço desse banco no arquivo `server/.env`.
3. Iniciar o sistema. As tabelas são criadas automaticamente.

> No seu computador já existe o **PostgreSQL 17 instalado e rodando** (serviço `postgresql-x64-17`, porta 5432).
> Então siga a **Opção A**. As outras opções ficam como alternativa.

---

## Opção A: usar o PostgreSQL já instalado (recomendado)

### 1. Abrir o terminal do PostgreSQL (psql)

Escolha um dos caminhos:

- **Menu Iniciar** → procure por **"SQL Shell (psql)"**. Aperte Enter nas perguntas de servidor, banco, porta e usuário (aceita os valores padrão) e, por fim, digite a senha do usuário `postgres`.
- **PowerShell**:

  ```powershell
  & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres
  ```

A senha pedida é a que você definiu **na instalação do PostgreSQL** para o usuário `postgres`.

### 2. Criar o usuário e o banco

Dentro do psql (o prompt fica `postgres=#`), cole os comandos abaixo. **Troque a senha** por uma sua:

```sql
CREATE USER confeitaria WITH PASSWORD 'MinhaSenhaForte123';
CREATE DATABASE confeitaria OWNER confeitaria ENCODING 'UTF8';
```

Para sair do psql, digite `\q`.

### 3. Configurar o sistema

Na pasta do projeto, copie o arquivo de exemplo:

```powershell
Copy-Item server\.env.example server\.env
```

Abra `server/.env` e ajuste a linha `DATABASE_URL` com o usuário, senha e banco que você criou:

```env
DATABASE_URL=postgresql://confeitaria:MinhaSenhaForte123@localhost:5432/confeitaria
PORT=3001
```

O formato é `postgresql://USUARIO:SENHA@SERVIDOR:PORTA/BANCO`.

> **Senha com caracteres especiais?** Se a senha tiver `@ : / ? # %`, substitua-os no endereço:
> `@` → `%40`, `:` → `%3A`, `/` → `%2F`, `?` → `%3F`, `#` → `%23`, `%` → `%25`.
> É mais simples usar só letras e números.

### 4. Criar as tabelas e iniciar

Na pasta raiz do projeto:

```powershell
npm install          # só na primeira vez
npm run db:init      # cria as tabelas (opcional: o sistema também cria ao iniciar)
npm run dev          # inicia a API e o site
```

Se aparecer `Tabelas criadas/verificadas com sucesso.`, a conexão está funcionando.
Abra **http://localhost:5173** no navegador.

---

## Opção B: usar o pgAdmin (interface gráfica)

O pgAdmin normalmente é instalado junto com o PostgreSQL.

1. Abra o **pgAdmin 4** e conecte no servidor *PostgreSQL 17* com a senha do `postgres`.
2. Clique com o botão direito em **Login/Group Roles** → **Create** → **Login/Group Role...**
   - Aba *General*: Name = `confeitaria`
   - Aba *Definition*: Password = sua senha
   - Aba *Privileges*: marque **Can login?**
3. Clique com o botão direito em **Databases** → **Create** → **Database...**
   - Database = `confeitaria`, Owner = `confeitaria`
4. Continue a partir do **passo 3 da Opção A**.

---

## Opção C: usar Docker

Se preferir não usar o PostgreSQL instalado, existe um `docker-compose.yml` na raiz do projeto.
Como a porta 5432 já está em uso pelo PostgreSQL local, o contêiner usa a porta **5433**.

```powershell
docker compose up -d
```

E no `server/.env`:

```env
DATABASE_URL=postgresql://confeitaria:confeitaria@localhost:5433/confeitaria
```

---

## Estrutura das tabelas

O arquivo [server/db/schema.sql](server/db/schema.sql) contém a estrutura completa. Resumo:

| Tabela                 | Para que serve                                                                 |
| ---------------------- | ------------------------------------------------------------------------------ |
| `ingredientes`         | Nome, unidade (g, kg, ml, l, un), quantidade padrão e preço pago por ela.       |
| `receitas`             | Nome, categoria (bolacha, bolo, docinho), modo de preparo, rendimento, margem. |
| `receita_ingredientes` | Quais ingredientes cada receita usa e em que quantidade.                       |
| `gastos_gerais`        | Água, luz, gás etc. Valor fixo (R$) por receita ou percentual (%).             |
| `configuracoes`        | Margem de lucro padrão (começa em 30%).                                        |

O banco começa **vazio**: ingredientes, receitas e gastos são cadastrados pelo próprio site.

---

## Problemas comuns

| Mensagem                                                | O que fazer                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `A variável DATABASE_URL não foi definida`              | O arquivo `server/.env` não existe. Faça o passo 3.                                          |
| `password authentication failed for user ...`           | Usuário ou senha errados no `DATABASE_URL`.                                                  |
| `database "confeitaria" does not exist`                 | O banco não foi criado. Refaça o passo 2.                                                    |
| `connect ECONNREFUSED 127.0.0.1:5432`                   | O PostgreSQL está parado. Abra *Serviços* do Windows e inicie `postgresql-x64-17`.           |
| `permission denied for schema public`                   | O banco não pertence ao usuário. No psql: `ALTER DATABASE confeitaria OWNER TO confeitaria;` |
| Faixa vermelha "Sem conexão com o banco de dados" no site | A API não conseguiu conectar. Veja a mensagem no terminal onde rodou `npm run dev`.        |

**Esqueci a senha do usuário `postgres`.** Abra como administrador o arquivo
`C:\Program Files\PostgreSQL\17\data\pg_hba.conf`, troque `scram-sha-256` por `trust` nas linhas de `127.0.0.1` e `::1`,
reinicie o serviço `postgresql-x64-17` e entre no psql sem senha. Rode `ALTER USER postgres PASSWORD 'nova_senha';`,
volte o arquivo para `scram-sha-256` e reinicie o serviço novamente.

---

## Backup dos dados

Para salvar uma cópia de tudo o que foi cadastrado:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -U confeitaria -d confeitaria -F c -f backup_confeitaria.dump
```

Para restaurar:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -U confeitaria -d confeitaria --clean backup_confeitaria.dump
```
