export type Unidade = 'g' | 'kg' | 'ml' | 'l' | 'un';
export type Categoria = 'bolacha' | 'bolo' | 'docinho';
export type TipoGasto = 'fixo' | 'percentual';

/** Medida personalizada, ex.: Caixa (cx) = 240 ml */
export interface Medida {
  id: number;
  nome: string;
  sigla: string;
  quantidade: number;
  unidade: Unidade;
  /** Quantos ingredientes/itens de receita usam a medida */
  usado_em: number;
}

export type MedidaInput = Pick<Medida, 'nome' | 'sigla' | 'quantidade' | 'unidade'>;

/** Unidade usada numa quantidade: básica (g, kg...) ou medida personalizada. */
export interface UnidadeRef {
  /** Unidade básica (quando há medida, é a unidade da medida) */
  unidade: Unidade;
  medida_id: number | null;
}

export interface Ingrediente {
  id: number;
  nome: string;
  unidade: Unidade;
  medida_id: number | null;
  /** Quantidade da embalagem/medida padrão (ex.: 1 kg, 395 g, 12 un) */
  quantidade_padrao: number;
  /** Preço pago pela quantidade padrão */
  preco: number;
  /** Em quantas receitas o ingrediente é usado */
  usado_em: number;
  atualizado_em: string;
}

export type IngredienteInput = Pick<Ingrediente, 'nome' | 'unidade' | 'medida_id' | 'quantidade_padrao' | 'preco'>;

export interface ItemReceita {
  id?: number;
  ingrediente_id: number;
  quantidade: number;
  unidade: Unidade;
  medida_id: number | null;
}

export interface Receita {
  id: number;
  nome: string;
  categoria: Categoria;
  modo_preparo: string;
  rendimento: number;
  unidade_rendimento: string;
  /** null = usa a margem padrão das configurações */
  margem_lucro: number | null;
  itens: ItemReceita[];
  atualizado_em: string;
}

export type ReceitaInput = Omit<Receita, 'id' | 'atualizado_em'>;

export interface Gasto {
  id: number;
  nome: string;
  tipo: TipoGasto;
  valor: number;
  ativo: boolean;
}

export type GastoInput = Omit<Gasto, 'id'>;

export interface Configuracoes {
  margem_lucro: number;
}
