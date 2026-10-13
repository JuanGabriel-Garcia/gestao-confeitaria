import { Router } from 'express';
import { pool } from '../db.js';
import { corpo, HttpError, id, numero, opcao, texto } from '../validacao.js';

export const gastosRouter = Router();

function lerGasto(body: unknown) {
  const b = corpo(body);
  const tipo = opcao(b, 'tipo', 'Tipo', ['fixo', 'percentual'] as const);
  const valor = numero(b, 'valor', 'Valor', { min: 0 });
  if (tipo === 'percentual' && valor > 1000) throw new HttpError(400, 'O percentual deve ser de no máximo 1000%.');
  return {
    nome: texto(b, 'nome', 'Nome', { max: 100 }),
    tipo,
    valor,
    ativo: b.ativo === undefined ? true : Boolean(b.ativo),
  };
}

gastosRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM gastos_gerais ORDER BY nome');
  res.json(rows);
});

gastosRouter.post('/', async (req, res) => {
  const g = lerGasto(req.body);
  const { rows } = await pool.query(
    'INSERT INTO gastos_gerais (nome, tipo, valor, ativo) VALUES ($1, $2, $3, $4) RETURNING *',
    [g.nome, g.tipo, g.valor, g.ativo],
  );
  res.status(201).json(rows[0]);
});

gastosRouter.put('/:id', async (req, res) => {
  const g = lerGasto(req.body);
  const { rows } = await pool.query(
    'UPDATE gastos_gerais SET nome = $1, tipo = $2, valor = $3, ativo = $4 WHERE id = $5 RETURNING *',
    [g.nome, g.tipo, g.valor, g.ativo, id(req.params.id)],
  );
  if (!rows[0]) throw new HttpError(404, 'Gasto não encontrado.');
  res.json(rows[0]);
});

gastosRouter.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM gastos_gerais WHERE id = $1', [id(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Gasto não encontrado.');
  res.status(204).end();
});
