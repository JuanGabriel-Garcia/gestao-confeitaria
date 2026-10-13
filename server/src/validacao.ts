export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const UNIDADES = ['g', 'kg', 'ml', 'l', 'un'] as const;
export type Unidade = (typeof UNIDADES)[number];

const DIMENSAO: Record<Unidade, string> = { g: 'massa', kg: 'massa', ml: 'volume', l: 'volume', un: 'contagem' };

export function unidadesCompativeis(a: Unidade, b: Unidade): boolean {
  return DIMENSAO[a] === DIMENSAO[b];
}

type Corpo = Record<string, unknown>;

export function corpo(valor: unknown): Corpo {
  if (!valor || typeof valor !== 'object') throw new HttpError(400, 'Corpo da requisição inválido.');
  return valor as Corpo;
}

export function texto(
  obj: Corpo,
  campo: string,
  rotulo: string,
  opcoes: { obrigatorio?: boolean; max?: number } = {},
): string {
  const { obrigatorio = true, max = 10000 } = opcoes;
  const valor = obj[campo];
  const str = typeof valor === 'string' ? valor.trim() : '';
  if (obrigatorio && !str) throw new HttpError(400, `O campo "${rotulo}" é obrigatório.`);
  if (str.length > max) throw new HttpError(400, `O campo "${rotulo}" deve ter no máximo ${max} caracteres.`);
  return str;
}

export function numero(
  obj: Corpo,
  campo: string,
  rotulo: string,
  opcoes: { min?: number; maiorQueZero?: boolean } = {},
): number {
  const bruto = obj[campo];
  const valor = Number(bruto);
  if (bruto === null || bruto === undefined || bruto === '' || !Number.isFinite(valor)) {
    throw new HttpError(400, `O campo "${rotulo}" deve ser um número.`);
  }
  if (opcoes.maiorQueZero && valor <= 0) throw new HttpError(400, `O campo "${rotulo}" deve ser maior que zero.`);
  if (opcoes.min !== undefined && valor < opcoes.min) {
    throw new HttpError(400, `O campo "${rotulo}" deve ser no mínimo ${opcoes.min}.`);
  }
  return valor;
}

export function opcao<T extends string>(obj: Corpo, campo: string, rotulo: string, permitidos: readonly T[]): T {
  const valor = obj[campo];
  if (typeof valor !== 'string' || !permitidos.includes(valor as T)) {
    throw new HttpError(400, `O campo "${rotulo}" deve ser um destes: ${permitidos.join(', ')}.`);
  }
  return valor as T;
}

export function id(valor: unknown): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'Identificador inválido.');
  return n;
}

/** Identificador opcional: null/undefined/'' viram null. */
export function idOpcional(valor: unknown): number | null {
  return valor === null || valor === undefined || valor === '' ? null : id(valor);
}

export interface MedidaBase {
  id: number;
  sigla: string;
  unidade: Unidade;
}

interface Consultavel {
  query: <R extends object>(sql: string, params?: unknown[]) => Promise<{ rows: R[] }>;
}

/** Busca as medidas personalizadas indicadas, falhando se alguma não existir. */
export async function carregarMedidas(db: Consultavel, ids: (number | null)[]): Promise<Map<number, MedidaBase>> {
  const unicos = [...new Set(ids.filter((i): i is number => i !== null))];
  if (unicos.length === 0) return new Map();
  const { rows } = await db.query<MedidaBase>('SELECT id, sigla, unidade FROM medidas WHERE id = ANY($1)', [unicos]);
  const mapa = new Map(rows.map((m) => [m.id, m]));
  const faltando = unicos.find((i) => !mapa.has(i));
  if (faltando) throw new HttpError(400, `A medida #${faltando} não existe.`);
  return mapa;
}
