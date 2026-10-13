import type { Gasto, Ingrediente, Receita, UnidadeRef } from './types';
import { quantidadeBase, type MapaMedidas } from './unidades';

type DadosPreco = Pick<Ingrediente, 'unidade' | 'medida_id' | 'quantidade_padrao' | 'preco'>;

/** Custo de 1 unidade base (1 g, 1 ml ou 1 un) do ingrediente. */
export function custoPorUnidadeBase(ing: DadosPreco, medidas: MapaMedidas): number {
  const base = quantidadeBase(ing.quantidade_padrao, ing, medidas);
  return base > 0 ? ing.preco / base : 0;
}

/** Custo de uma quantidade de ingrediente usada na receita. */
export function custoItem(ing: DadosPreco, quantidade: number, ref: UnidadeRef, medidas: MapaMedidas): number {
  return quantidadeBase(quantidade, ref, medidas) * custoPorUnidadeBase(ing, medidas);
}

export interface LinhaGasto {
  gasto: Gasto;
  valor: number;
}

export interface Precificacao {
  custoIngredientes: number;
  gastos: LinhaGasto[];
  custoGastos: number;
  custoTotal: number;
  margem: number;
  lucro: number;
  precoVenda: number;
  precoUnitario: number;
  custoUnitario: number;
}

interface EntradaItem extends UnidadeRef {
  ingrediente: Ingrediente | undefined;
  quantidade: number;
}

/**
 * Calcula o preço de uma receita:
 *   custo total = ingredientes + gastos gerais
 *   preço de venda = custo total × (1 + margem%)
 */
export function precificar(
  itens: EntradaItem[],
  gastos: Gasto[],
  margem: number,
  rendimento: number,
  medidas: MapaMedidas,
): Precificacao {
  const custoIngredientes = itens.reduce((soma, item) => {
    if (!item.ingrediente || !(item.quantidade > 0)) return soma;
    return soma + custoItem(item.ingrediente, item.quantidade, item, medidas);
  }, 0);

  const linhas: LinhaGasto[] = gastos
    .filter((g) => g.ativo)
    .map((gasto) => ({
      gasto,
      valor: gasto.tipo === 'fixo' ? gasto.valor : (custoIngredientes * gasto.valor) / 100,
    }));
  const custoGastos = linhas.reduce((s, l) => s + l.valor, 0);

  const custoTotal = custoIngredientes + custoGastos;
  const lucro = (custoTotal * margem) / 100;
  const precoVenda = custoTotal + lucro;
  const div = rendimento > 0 ? rendimento : 1;

  return {
    custoIngredientes,
    gastos: linhas,
    custoGastos,
    custoTotal,
    margem,
    lucro,
    precoVenda,
    precoUnitario: precoVenda / div,
    custoUnitario: custoTotal / div,
  };
}

/** Atalho para precificar uma receita já salva. */
export function precificarReceita(
  receita: Receita,
  ingredientesPorId: Map<number, Ingrediente>,
  gastos: Gasto[],
  margemPadrao: number,
  medidas: MapaMedidas,
): Precificacao {
  return precificar(
    receita.itens.map((item) => ({
      ingrediente: ingredientesPorId.get(item.ingrediente_id),
      quantidade: item.quantidade,
      unidade: item.unidade,
      medida_id: item.medida_id,
    })),
    gastos,
    receita.margem_lucro ?? margemPadrao,
    receita.rendimento,
    medidas,
  );
}
