import { formatarNumero } from './formato';
import type { Categoria, Medida, Unidade, UnidadeRef } from './types';

type Dimensao = 'massa' | 'volume' | 'contagem';

interface InfoUnidade {
  sigla: Unidade;
  nome: string;
  dimensao: Dimensao;
  /** Fator para converter para a unidade base da dimensão (g, ml ou un) */
  fator: number;
}

export const UNIDADES: Record<Unidade, InfoUnidade> = {
  g: { sigla: 'g', nome: 'gramas (g)', dimensao: 'massa', fator: 1 },
  kg: { sigla: 'kg', nome: 'quilos (kg)', dimensao: 'massa', fator: 1000 },
  ml: { sigla: 'ml', nome: 'mililitros (ml)', dimensao: 'volume', fator: 1 },
  l: { sigla: 'l', nome: 'litros (l)', dimensao: 'volume', fator: 1000 },
  un: { sigla: 'un', nome: 'unidades (un)', dimensao: 'contagem', fator: 1 },
};

export const LISTA_UNIDADES = Object.values(UNIDADES);

export type MapaMedidas = Map<number, Medida>;

/** Unidade base de cada dimensão, usada para mostrar o custo unitário (R$/g, R$/ml, R$/un). */
export function unidadeBase(unidade: Unidade): Unidade {
  const dim = UNIDADES[unidade].dimensao;
  return dim === 'massa' ? 'g' : dim === 'volume' ? 'ml' : 'un';
}

/**
 * Converte uma quantidade para a unidade base (g, ml ou un).
 * Ex.: 2 cx (240 ml) -> 480 ml; 1,5 kg -> 1500 g.
 */
export function quantidadeBase(quantidade: number, ref: UnidadeRef, medidas: MapaMedidas): number {
  const medida = ref.medida_id !== null ? medidas.get(ref.medida_id) : undefined;
  if (medida) return quantidade * medida.quantidade * UNIDADES[medida.unidade].fator;
  return quantidade * UNIDADES[ref.unidade].fator;
}

// ---------- Opções de unidade em formulários ----------
// Cada opção é identificada por uma "chave": 'g', 'kg', ... ou 'm12' para a medida personalizada #12.

export function chaveUnidade(ref: UnidadeRef): string {
  return ref.medida_id !== null ? `m${ref.medida_id}` : ref.unidade;
}

export function lerChaveUnidade(chave: string, medidas: MapaMedidas): UnidadeRef {
  if (chave.startsWith('m')) {
    const medida = medidas.get(Number(chave.slice(1)));
    if (medida) return { unidade: medida.unidade, medida_id: medida.id };
  }
  return { unidade: chave as Unidade, medida_id: null };
}

/** Ex.: "cx (240 ml)" */
export function rotuloMedida(m: Pick<Medida, 'sigla' | 'quantidade' | 'unidade'>): string {
  return `${m.sigla} (${formatarNumero(m.quantidade)} ${m.unidade})`;
}

/** Texto curto da unidade: "g" ou "cx (240 ml)". */
export function rotuloUnidade(ref: UnidadeRef, medidas: MapaMedidas): string {
  const medida = ref.medida_id !== null ? medidas.get(ref.medida_id) : undefined;
  return medida ? rotuloMedida(medida) : ref.unidade;
}

/** Ex.: "2 cx (240 ml)" ou "300 g" */
export function formatarQuantidade(quantidade: number, ref: UnidadeRef, medidas: MapaMedidas): string {
  return `${formatarNumero(quantidade)} ${rotuloUnidade(ref, medidas)}`;
}

export interface OpcaoUnidade {
  chave: string;
  rotulo: string;
  personalizada: boolean;
}

/** Unidades básicas + medidas personalizadas. Se `unidade` for informada, só as do mesmo tipo. */
export function opcoesUnidade(medidas: Medida[], unidade?: Unidade): OpcaoUnidade[] {
  const dim = unidade ? UNIDADES[unidade].dimensao : null;
  const basicas = LISTA_UNIDADES.filter((u) => !dim || u.dimensao === dim).map((u) => ({
    chave: u.sigla as string,
    rotulo: unidade ? u.sigla : u.nome,
    personalizada: false,
  }));
  const personalizadas = medidas
    .filter((m) => !dim || UNIDADES[m.unidade].dimensao === dim)
    .map((m) => ({
      chave: chaveUnidade({ unidade: m.unidade, medida_id: m.id }),
      rotulo: unidade ? rotuloMedida(m) : `${m.nome} - ${rotuloMedida(m)}`,
      personalizada: true,
    }));
  return [...basicas, ...personalizadas];
}

/** Unidade sugerida ao adicionar um ingrediente numa receita. */
export function unidadeSugerida(ref: UnidadeRef): UnidadeRef {
  if (ref.medida_id !== null) return ref;
  if (ref.unidade === 'kg') return { unidade: 'g', medida_id: null };
  if (ref.unidade === 'l') return { unidade: 'ml', medida_id: null };
  return ref;
}

export const CATEGORIAS: Record<Categoria, { nome: string; plural: string }> = {
  bolacha: { nome: 'Bolacha', plural: 'Bolachas' },
  bolo: { nome: 'Bolo', plural: 'Bolos' },
  docinho: { nome: 'Docinho', plural: 'Docinhos' },
};
