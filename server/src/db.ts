import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

// Colunas NUMERIC chegam como string no driver; convertemos para number.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (valor) => parseFloat(valor));

if (!process.env.DATABASE_URL) {
  console.error(
    '\n[ERRO] A variável DATABASE_URL não foi definida.\n' +
      'Copie o arquivo server/.env.example para server/.env e preencha os dados do seu banco.\n' +
      'Veja o passo a passo em GUIA_BANCO_DE_DADOS.md\n',
  );
  process.exit(1);
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

/** Cria as tabelas (se ainda não existirem). */
export async function inicializarBanco(): Promise<void> {
  const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await pool.query(sql);
}

/** Executa uma função dentro de uma transação. */
export async function transacao<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}
