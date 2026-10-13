import { Link } from 'react-router-dom';
import { formatarMoeda, formatarNumero } from '../lib/formato';
import type { Precificacao } from '../lib/precificacao';

interface Props {
  preco: Precificacao;
  rendimento: number;
  unidadeRendimento: string;
}

export function ResumoPreco({ preco, rendimento, unidadeRendimento }: Props) {
  return (
    <div className="card resumo">
      <h2>Precificação</h2>

      <dl className="linhas">
        <div>
          <dt>Ingredientes</dt>
          <dd>{formatarMoeda(preco.custoIngredientes)}</dd>
        </div>
        {preco.gastos.map(({ gasto, valor }) => (
          <div key={gasto.id} className="sub">
            <dt>
              {gasto.nome}
              <span className="muted">
                {gasto.tipo === 'percentual' ? ` (${formatarNumero(gasto.valor, 2)}%)` : ' (fixo)'}
              </span>
            </dt>
            <dd>{formatarMoeda(valor)}</dd>
          </div>
        ))}
        {preco.gastos.length === 0 && (
          <div className="sub">
            <dt className="muted">
              Nenhum gasto geral ativo. <Link to="/custos">Cadastrar</Link>
            </dt>
            <dd />
          </div>
        )}
        <div className="total">
          <dt>Custo total</dt>
          <dd>{formatarMoeda(preco.custoTotal)}</dd>
        </div>
        <div>
          <dt>Lucro ({formatarNumero(preco.margem, 2)}%)</dt>
          <dd className="positivo">+ {formatarMoeda(preco.lucro)}</dd>
        </div>
      </dl>

      <div className="preco-final">
        <span>Preço de venda da receita</span>
        <strong>{formatarMoeda(preco.precoVenda)}</strong>
      </div>

      <div className="preco-unidade">
        <div>
          <span>Preço por {unidadeSingular(unidadeRendimento)}</span>
          <strong>{formatarMoeda(preco.precoUnitario)}</strong>
        </div>
        <div>
          <span>Custo por {unidadeSingular(unidadeRendimento)}</span>
          <strong className="muted">{formatarMoeda(preco.custoUnitario)}</strong>
        </div>
      </div>
      <p className="dica">
        Rendimento: {formatarNumero(rendimento, 2)} {unidadeRendimento}
      </p>
    </div>
  );
}

function unidadeSingular(unidade: string): string {
  const u = unidade.trim().toLowerCase();
  if (!u || u === 'unidades') return 'unidade';
  if (u.endsWith('ões')) return u.slice(0, -3) + 'ão';
  if (u.endsWith('s')) return u.slice(0, -1);
  return u;
}
