import { Router } from 'express';
import { pool, transacao } from '../db.js';
import { corpo, HttpError, id, numero, opcao, texto, UNIDADES, unidadesCompativeis, type Unidade } from '../validacao.js';

export const medidasRouter = Router();

const SELECT = `
  SELECT m.*,
         ((SELECT COUNT(*) FROM ingredientes i WHERE i.medida_id = m.id) +
          (SELECT COUNT(*) FROM receita_ingredientes ri WHERE ri.medida_id = m.id))::int AS usado_em
    FROM medidas m`;

function lerMedida(body: unknown) {
  const b = corpo(body);
  return {
    nome: texto(b, 'nome', 'Nome', { max: 60 }),
    sigla: texto(b, 'sigla', 'Sigla', { max: 10 }),
    quantidade: numero(b, 'quantidade', 'Quantidade', { maiorQueZero: true }),
    unidade: opcao(b, 'unidade', 'Unidade', UNIDADES),
  };
}

async function buscar(medidaId: number) {
  const { rows } = await pool.query(`${SELECT} WHERE m.id = $1`, [medidaId]);
  return rows[0];
}

medidasRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`${SELECT} ORDER BY m.nome, m.unidade, m.quantidade`);
  res.json(rows);
});

medidasRouter.post('/', async (req, res) => {
  const m = lerMedida(req.body);
  const { rows } = await pool.query<{ id: number }>(
    'INSERT INTO medidas (nome, sigla, quantidade, unidade) VALUES ($1, $2, $3, $4) RETURNING id',
    [m.nome, m.sigla, m.quantidade, m.unidade],
  );
  res.status(201).json(await buscar(rows[0].id));
});

medidasRouter.put('/:id', async (req, res) => {
  const medidaId = id(req.params.id);
  const m = lerMedida(req.body);

  await transacao(async (client) => {
    const atual = await client.query<{ unidade: Unidade }>('SELECT unidade FROM medidas WHERE id = $1 FOR UPDATE', [
      medidaId,
    ]);
    if (!atual.rows[0]) throw new HttpError(404, 'Medida não encontrada.');

    const emUso = await client.query(
      `SELECT 1 FROM ingredientes WHERE medida_id = $1
       UNION ALL SELECT 1 FROM receita_ingredientes WHERE medida_id = $1 LIMIT 1`,
      [medidaId],
    );
    if (emUso.rows.length > 0 && !unidadesCompativeis(atual.rows[0].unidade, m.unidade)) {
      throw new HttpError(
        409,
        'Esta medida já está em uso. Só é possível trocar para uma unidade do mesmo tipo (g/kg, ml/l ou un).',
      );
    }

    await client.query('UPDATE medidas SET nome = $1, sigla = $2, quantidade = $3, unidade = $4 WHERE id = $5', [
      m.nome,
      m.sigla,
      m.quantidade,
      m.unidade,
      medidaId,
    ]);
    // Mantém a unidade básica sincronizada onde a medida é usada
    await client.query('UPDATE ingredientes SET unidade = $1 WHERE medida_id = $2', [m.unidade, medidaId]);
    await client.query('UPDATE receita_ingredientes SET unidade = $1 WHERE medida_id = $2', [m.unidade, medidaId]);
  });

  res.json(await buscar(medidaId));
});

medidasRouter.delete('/:id', async (req, res) => {
  const medidaId = id(req.params.id);
  const usos = await pool.query<{ nome: string }>(
    `SELECT nome FROM ingredientes WHERE medida_id = $1
     UNION
     SELECT r.nome FROM receita_ingredientes ri JOIN receitas r ON r.id = ri.receita_id WHERE ri.medida_id = $1
     ORDER BY nome`,
    [medidaId],
  );
  if (usos.rows.length > 0) {
    throw new HttpError(
      409,
      `Não é possível excluir: a medida é usada em ${usos.rows.map((r) => `"${r.nome}"`).join(', ')}.`,
    );
  }
  const { rowCount } = await pool.query('DELETE FROM medidas WHERE id = $1', [medidaId]);
  if (!rowCount) throw new HttpError(404, 'Medida não encontrada.');
  res.status(204).end();
});
