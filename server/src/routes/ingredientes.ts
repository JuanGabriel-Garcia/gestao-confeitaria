import { Router } from 'express';
import { pool } from '../db.js';
import {
  carregarMedidas,
  corpo,
  HttpError,
  id,
  idOpcional,
  numero,
  opcao,
  texto,
  UNIDADES,
  unidadesCompativeis,
  type Unidade,
} from '../validacao.js';

export const ingredientesRouter = Router();

const SELECT = `
  SELECT i.*,
         (SELECT COUNT(DISTINCT ri.receita_id)::int
            FROM receita_ingredientes ri
           WHERE ri.ingrediente_id = i.id) AS usado_em
    FROM ingredientes i`;

async function lerIngrediente(body: unknown) {
  const b = corpo(body);
  const medida_id = idOpcional(b.medida_id);
  // Com medida personalizada, a unidade básica vem da própria medida
  const medida = (await carregarMedidas(pool, [medida_id])).get(medida_id ?? 0);
  return {
    nome: texto(b, 'nome', 'Nome', { max: 120 }),
    unidade: medida ? medida.unidade : opcao(b, 'unidade', 'Unidade', UNIDADES),
    medida_id,
    quantidade_padrao: numero(b, 'quantidade_padrao', 'Quantidade padrão', { maiorQueZero: true }),
    preco: numero(b, 'preco', 'Preço', { min: 0 }),
  };
}

async function buscar(ingredienteId: number) {
  const { rows } = await pool.query(`${SELECT} WHERE i.id = $1`, [ingredienteId]);
  return rows[0];
}

ingredientesRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`${SELECT} ORDER BY i.nome`);
  res.json(rows);
});

ingredientesRouter.get('/:id', async (req, res) => {
  const ingrediente = await buscar(id(req.params.id));
  if (!ingrediente) throw new HttpError(404, 'Ingrediente não encontrado.');
  res.json(ingrediente);
});

ingredientesRouter.post('/', async (req, res) => {
  const ing = await lerIngrediente(req.body);
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO ingredientes (nome, unidade, medida_id, quantidade_padrao, preco)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [ing.nome, ing.unidade, ing.medida_id, ing.quantidade_padrao, ing.preco],
  );
  res.status(201).json(await buscar(rows[0].id));
});

ingredientesRouter.put('/:id', async (req, res) => {
  const ingredienteId = id(req.params.id);
  const ing = await lerIngrediente(req.body);

  // Impede trocar para uma unidade de outro tipo (ex.: kg -> un) se o ingrediente já estiver em receitas.
  const usos = await pool.query<{ unidade: Unidade }>(
    'SELECT DISTINCT unidade FROM receita_ingredientes WHERE ingrediente_id = $1',
    [ingredienteId],
  );
  if (usos.rows.some((u) => !unidadesCompativeis(u.unidade, ing.unidade))) {
    throw new HttpError(
      409,
      'Este ingrediente já é usado em receitas com uma unidade de outro tipo. ' +
        'Escolha uma unidade compatível (g/kg, ml/l ou un) ou ajuste as receitas antes.',
    );
  }

  const { rowCount } = await pool.query(
    `UPDATE ingredientes
        SET nome = $1, unidade = $2, medida_id = $3, quantidade_padrao = $4, preco = $5, atualizado_em = now()
      WHERE id = $6`,
    [ing.nome, ing.unidade, ing.medida_id, ing.quantidade_padrao, ing.preco, ingredienteId],
  );
  if (!rowCount) throw new HttpError(404, 'Ingrediente não encontrado.');
  res.json(await buscar(ingredienteId));
});

ingredientesRouter.delete('/:id', async (req, res) => {
  const ingredienteId = id(req.params.id);
  const usos = await pool.query<{ nome: string }>(
    `SELECT DISTINCT r.nome
       FROM receita_ingredientes ri
       JOIN receitas r ON r.id = ri.receita_id
      WHERE ri.ingrediente_id = $1
      ORDER BY r.nome`,
    [ingredienteId],
  );
  if (usos.rows.length > 0) {
    throw new HttpError(
      409,
      `Não é possível excluir: o ingrediente é usado nas receitas ${usos.rows.map((r) => `"${r.nome}"`).join(', ')}.`,
    );
  }
  const { rowCount } = await pool.query('DELETE FROM ingredientes WHERE id = $1', [ingredienteId]);
  if (!rowCount) throw new HttpError(404, 'Ingrediente não encontrado.');
  res.status(204).end();
});
