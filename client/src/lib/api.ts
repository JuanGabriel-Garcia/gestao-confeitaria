import type {
  Configuracoes,
  Gasto,
  GastoInput,
  Ingrediente,
  IngredienteInput,
  Medida,
  MedidaInput,
  Receita,
  ReceitaInput,
} from './types';

async function requisicao<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      ...opcoes,
      headers: { 'Content-Type': 'application/json', ...opcoes.headers },
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique se a API está rodando.');
  }

  if (resposta.status === 204) return undefined as T;
  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    if (dados?.erro) throw new Error(dados.erro);
    if (resposta.status >= 500) {
      throw new Error('Não foi possível conectar ao servidor. Verifique se a API (npm run dev) está rodando.');
    }
    throw new Error(`Erro ${resposta.status}`);
  }
  return dados as T;
}

const json = (corpo: unknown) => JSON.stringify(corpo);

export const api = {
  saude: () => requisicao<{ ok: boolean }>('/health'),

  ingredientes: {
    listar: () => requisicao<Ingrediente[]>('/ingredientes'),
    obter: (id: number) => requisicao<Ingrediente>(`/ingredientes/${id}`),
    criar: (dados: IngredienteInput) => requisicao<Ingrediente>('/ingredientes', { method: 'POST', body: json(dados) }),
    atualizar: (id: number, dados: IngredienteInput) =>
      requisicao<Ingrediente>(`/ingredientes/${id}`, { method: 'PUT', body: json(dados) }),
    excluir: (id: number) => requisicao<void>(`/ingredientes/${id}`, { method: 'DELETE' }),
  },

  receitas: {
    listar: () => requisicao<Receita[]>('/receitas'),
    obter: (id: number) => requisicao<Receita>(`/receitas/${id}`),
    criar: (dados: ReceitaInput) => requisicao<Receita>('/receitas', { method: 'POST', body: json(dados) }),
    atualizar: (id: number, dados: ReceitaInput) =>
      requisicao<Receita>(`/receitas/${id}`, { method: 'PUT', body: json(dados) }),
    excluir: (id: number) => requisicao<void>(`/receitas/${id}`, { method: 'DELETE' }),
  },

  gastos: {
    listar: () => requisicao<Gasto[]>('/gastos'),
    criar: (dados: GastoInput) => requisicao<Gasto>('/gastos', { method: 'POST', body: json(dados) }),
    atualizar: (id: number, dados: GastoInput) =>
      requisicao<Gasto>(`/gastos/${id}`, { method: 'PUT', body: json(dados) }),
    excluir: (id: number) => requisicao<void>(`/gastos/${id}`, { method: 'DELETE' }),
  },

  medidas: {
    listar: () => requisicao<Medida[]>('/medidas'),
    criar: (dados: MedidaInput) => requisicao<Medida>('/medidas', { method: 'POST', body: json(dados) }),
    atualizar: (id: number, dados: MedidaInput) =>
      requisicao<Medida>(`/medidas/${id}`, { method: 'PUT', body: json(dados) }),
    excluir: (id: number) => requisicao<void>(`/medidas/${id}`, { method: 'DELETE' }),
  },

  configuracoes: {
    obter: () => requisicao<Configuracoes>('/configuracoes'),
    salvar: (dados: Configuracoes) =>
      requisicao<Configuracoes>('/configuracoes', { method: 'PUT', body: json(dados) }),
  },
};

export function mapaMedidas(lista: Medida[]): Map<number, Medida> {
  return new Map(lista.map((m) => [m.id, m]));
}

/** Tudo o que é necessário para calcular preços de receitas. */
export async function carregarDadosDePreco() {
  const [ingredientes, gastos, configuracoes, listaMedidas] = await Promise.all([
    api.ingredientes.listar(),
    api.gastos.listar(),
    api.configuracoes.obter(),
    api.medidas.listar(),
  ]);
  return { ingredientes, gastos, configuracoes, listaMedidas, medidas: mapaMedidas(listaMedidas) };
}
