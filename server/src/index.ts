import express, { type NextFunction, type Request, type Response } from 'express';
import { inicializarBanco, pool } from './db.js';
import { configuracoesRouter } from './routes/configuracoes.js';
import { gastosRouter } from './routes/gastos.js';
import { ingredientesRouter } from './routes/ingredientes.js';
import { medidasRouter } from './routes/medidas.js';
import { receitasRouter } from './routes/receitas.js';
import { HttpError } from './validacao.js';

const app = express();
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, banco: 'conectado' });
  } catch {
    res.status(503).json({ ok: false, erro: 'Sem conexão com o banco de dados.' });
  }
});

app.use('/api/ingredientes', ingredientesRouter);
app.use('/api/receitas', receitasRouter);
app.use('/api/gastos', gastosRouter);
app.use('/api/medidas', medidasRouter);
app.use('/api/configuracoes', configuracoesRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Tratamento central de erros
app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (erro instanceof HttpError) {
    res.status(erro.status).json({ erro: erro.message });
    return;
  }
  const codigo = (erro as { code?: string }).code;
  if (codigo === '23505') {
    const medida = (erro as { constraint?: string }).constraint?.startsWith('medidas_');
    res.status(409).json({
      erro: medida ? 'Já existe uma medida com essa sigla e esse tamanho.' : 'Já existe um registro com esse nome.',
    });
    return;
  }
  if (codigo === '23503') {
    res.status(409).json({ erro: 'Este registro está em uso e não pode ser alterado/excluído.' });
    return;
  }
  if ((erro as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ erro: 'JSON inválido.' });
    return;
  }
  console.error(erro);
  const semBanco = ['ECONNREFUSED', '28P01', '3D000', 'ENOTFOUND', '42P01'].includes(codigo ?? '');
  res.status(semBanco ? 503 : 500).json({
    erro: semBanco
      ? 'Sem conexão com o banco de dados. Verifique o arquivo server/.env e reinicie a API.'
      : 'Erro interno do servidor.',
  });
});

const PORT = Number(process.env.PORT ?? 3001);

try {
  await inicializarBanco();
  console.log('Banco de dados conectado e tabelas verificadas.');
} catch (erro) {
  console.error(
    '\n[AVISO] Não foi possível conectar ao banco de dados:',
    (erro as Error).message,
    '\nA API vai iniciar mesmo assim. Confira server/.env e o GUIA_BANCO_DE_DADOS.md.\n',
  );
}

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
