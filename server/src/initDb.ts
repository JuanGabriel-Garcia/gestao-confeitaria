import { inicializarBanco, pool } from './db.js';

try {
  await inicializarBanco();
  console.log('Tabelas criadas/verificadas com sucesso.');
} catch (erro) {
  console.error('Falha ao inicializar o banco:', (erro as Error).message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
