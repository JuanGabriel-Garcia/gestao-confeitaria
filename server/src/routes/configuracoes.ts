import { Router } from 'express';
import { pool } from '../db.js';
import { corpo, HttpError, numero } from '../validacao.js';

export const configuracoesRouter = Router();

async function ler() {
  const { rows } = await pool.query<{ chave: string; valor: string }>('SELECT chave, valor FROM configuracoes');
  const mapa = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
  return { margem_lucro: Number(mapa.margem_lucro ?? 30) };
}

configuracoesRouter.get('/', async (_req, res) => {
  res.json(await ler());
});

configuracoesRouter.put('/', async (req, res) => {
  const margem = numero(corpo(req.body), 'margem_lucro', 'Margem de lucro', { min: 0 });
  if (margem > 1000) throw new HttpError(400, 'A margem de lucro deve ser de no máximo 1000%.');
  await pool.query(
    `INSERT INTO configuracoes (chave, valor) VALUES ('margem_lucro', $1)
     ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor`,
    [String(margem)],
  );
  res.json(await ler());
});
