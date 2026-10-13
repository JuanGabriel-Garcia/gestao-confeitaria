import { Router } from 'express';
import type { PoolClient } from 'pg';
import { pool, transacao } from '../db.js';
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

export const receitasRouter = Router();

const CATEGORIAS = ['bolacha', 'bolo', 'docinho'] as const;

const SELECT = `
  SELECT r.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id', ri.id,
               'ingrediente_id', ri.ingrediente_id,
               'quantidade', ri.quantidade,
               'unidade', ri.unidade,
               'medida_id', ri.medida_id
             ) ORDER BY ri.id
           ) FILTER (WHERE ri.id IS NOT NULL),
           '[]'
         ) AS itens
    FROM receitas r
    LEFT JOIN receita_ingredientes ri ON ri.receita_id = r.id`;

interface Item {
  ingrediente_id: number;
  quantidade: number;
  unidade: Unidade;
  medida_id: number | null;
}

function lerReceita(body: unknown) {
  const b = corpo(body);
  const margemBruta = b.margem_lucro;
  const margem_lucro =
    margemBruta === null || margemBruta === undefined || margemBruta === ''
      ? null
      : numero(b, 'margem_lucro', 'Margem de lucro', { min: 0 });

  if (!Array.isArray(b.itens) || b.itens.length === 0) {
    throw new HttpError(400, 'A receita precisa ter pelo menos um ingrediente.');
  }
  const itens: Item[] = b.itens.map((bruto: unknown, i: number) => {
    const item = corpo(bruto);
    const pos = `Ingrediente ${i + 1}`;
    return {
      ingrediente_id: id(item.ingrediente_id),
      quantidade: numero(item, 'quantidade', `${pos}: quantidade`, { maiorQueZero: true }),
      // Se for medida personalizada, a unidade é corrigida em salvarItens
      unidade: item.medida_id ? 'un' : opcao(item, 'unidade', `${pos}: unidade`, UNIDADES),
      medida_id: idOpcional(item.medida_id),
    };
  });

  return {
    nome: texto(b, 'nome', 'Nome', { max: 150 }),
    categoria: opcao(b, 'categoria', 'Categoria', CATEGORIAS),
    modo_preparo: texto(b, 'modo_preparo', 'Modo de preparo', { obrigatorio: false }),
    rendimento: numero(b, 'rendimento', 'Rendimento', { maiorQueZero: true }),
    unidade_rendimento:
      texto(b, 'unidade_rendimento', 'Unidade do rendimento', { obrigatorio: false, max: 30 }) || 'unidades',
    margem_lucro,
    itens,
  };
}

async function salvarItens(client: PoolClient, receitaId: number, itens: Item[]) {
  const ids = [...new Set(itens.map((i) => i.ingrediente_id))];
  const { rows } = await client.query<{ id: number; nome: string; unidade: Unidade }>(
    'SELECT id, nome, unidade FROM ingredientes WHERE id = ANY($1)',
    [ids],
  );
  const porId = new Map(rows.map((r) => [r.id, r]));
  const medidas = await carregarMedidas(client, itens.map((i) => i.medida_id));

  for (const item of itens) {
    const medida = item.medida_id ? medidas.get(item.medida_id) : undefined;
    if (medida) item.unidade = medida.unidade;
    const ing = porId.get(item.ingrediente_id);
    if (!ing) throw new HttpError(400, `O ingrediente #${item.ingrediente_id} não existe.`);
    if (!unidadesCompativeis(ing.unidade, item.unidade)) {
      throw new HttpError(
        400,
        `A unidade "${medida ? medida.sigla : item.unidade}" não é compatível com "${ing.nome}" (medido em ${ing.unidade}).`,
      );
    }
    await client.query(
      `INSERT INTO receita_ingredientes (receita_id, ingrediente_id, quantidade, unidade, medida_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [receitaId, item.ingrediente_id, item.quantidade, item.unidade, item.medida_id],
    );
  }
}

async function buscar(receitaId: number) {
  const { rows } = await pool.query(`${SELECT} WHERE r.id = $1 GROUP BY r.id`, [receitaId]);
  return rows[0];
}

receitasRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query(`${SELECT} GROUP BY r.id ORDER BY r.nome`);
  res.json(rows);
});

receitasRouter.get('/:id', async (req, res) => {
  const receita = await buscar(id(req.params.id));
  if (!receita) throw new HttpError(404, 'Receita não encontrada.');
  res.json(receita);
});

receitasRouter.post('/', async (req, res) => {
  const r = lerReceita(req.body);
  const novoId = await transacao(async (client) => {
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO receitas (nome, categoria, modo_preparo, rendimento, unidade_rendimento, margem_lucro)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [r.nome, r.categoria, r.modo_preparo, r.rendimento, r.unidade_rendimento, r.margem_lucro],
    );
    await salvarItens(client, rows[0].id, r.itens);
    return rows[0].id;
  });
  res.status(201).json(await buscar(novoId));
});

receitasRouter.put('/:id', async (req, res) => {
  const receitaId = id(req.params.id);
  const r = lerReceita(req.body);
  await transacao(async (client) => {
    const { rowCount } = await client.query(
      `UPDATE receitas
          SET nome = $1, categoria = $2, modo_preparo = $3, rendimento = $4,
              unidade_rendimento = $5, margem_lucro = $6, atualizado_em = now()
        WHERE id = $7`,
      [r.nome, r.categoria, r.modo_preparo, r.rendimento, r.unidade_rendimento, r.margem_lucro, receitaId],
    );
    if (!rowCount) throw new HttpError(404, 'Receita não encontrada.');
    await client.query('DELETE FROM receita_ingredientes WHERE receita_id = $1', [receitaId]);
    await salvarItens(client, receitaId, r.itens);
  });
  res.json(await buscar(receitaId));
});

receitasRouter.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM receitas WHERE id = $1', [id(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Receita não encontrada.');
  res.status(204).end();
});
