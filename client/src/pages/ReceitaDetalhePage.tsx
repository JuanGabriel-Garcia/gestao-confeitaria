import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResumoPreco } from '../components/ResumoPreco';
import { useConfirmar } from '../components/Confirmacao';
import { Alerta, BadgeCategoria, Cabecalho, Carregando } from '../components/ui';
import { useCarregar } from '../hooks/useCarregar';
import { api, carregarDadosDePreco } from '../lib/api';
import { formatarMoeda, formatarNumero } from '../lib/formato';
import { custoItem, precificarReceita } from '../lib/precificacao';
import { formatarQuantidade } from '../lib/unidades';

export function ReceitaDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const confirmar = useConfirmar();

  const { dados, erro, carregando } = useCarregar(async () => {
    const [receita, base] = await Promise.all([api.receitas.obter(Number(id)), carregarDadosDePreco()]);
    return { receita, ...base };
  }, [id]);

  const calculo = useMemo(() => {
    if (!dados) return null;
    const porId = new Map(dados.ingredientes.map((i) => [i.id, i]));
    return {
      porId,
      preco: precificarReceita(dados.receita, porId, dados.gastos, dados.configuracoes.margem_lucro, dados.medidas),
    };
  }, [dados]);

  async function excluir() {
    if (!dados) return;
    const ok = await confirmar({
      titulo: 'Excluir receita?',
      mensagem: (
        <>
          A receita <strong>{dados.receita.nome}</strong> e a lista de ingredientes dela serão removidas. Esta ação não
          pode ser desfeita.
        </>
      ),
    });
    if (!ok) return;
    try {
      await api.receitas.excluir(dados.receita.id);
      navigate('/receitas');
    } catch (e) {
      setErroAcao((e as Error).message);
    }
  }

  if (carregando && !dados) return <Carregando />;
  if (erro || !dados || !calculo) return <Alerta>{erro ?? 'Receita não encontrada.'}</Alerta>;

  const { receita } = dados;

  return (
    <>
      <Cabecalho
        titulo={receita.nome}
        descricao={
          <span className="linha-meta">
            <BadgeCategoria categoria={receita.categoria} />
            Rende {formatarNumero(receita.rendimento, 2)} {receita.unidade_rendimento}
            {receita.margem_lucro !== null && <span className="muted">· margem personalizada</span>}
          </span>
        }
        acoes={
          <>
            <Link to="/receitas" className="btn btn-secundario">
              <ArrowLeft size={18} /> Voltar
            </Link>
            <Link to={`/receitas/${receita.id}/editar`} className="btn btn-secundario">
              <Pencil size={18} /> Editar
            </Link>
            <button className="btn btn-perigo" onClick={excluir}>
              <Trash2 size={18} /> Excluir
            </button>
          </>
        }
      />
      {erroAcao && <Alerta>{erroAcao}</Alerta>}

      <div className="layout-receita">
        <div className="coluna">
          <div className="card sem-padding">
            <h2 className="card-titulo">Ingredientes</h2>
            <div className="tabela-container">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th className="num">Quantidade</th>
                    <th className="num">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {receita.itens.map((item) => {
                    const ing = calculo.porId.get(item.ingrediente_id);
                    return (
                      <tr key={item.id}>
                        <td className="forte">{ing?.nome ?? 'Ingrediente removido'}</td>
                        <td className="num">{formatarQuantidade(item.quantidade, item, dados.medidas)}</td>
                        <td className="num">
                          {ing ? formatarMoeda(custoItem(ing, item.quantidade, item, dados.medidas)) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total dos ingredientes</td>
                    <td className="num">{formatarMoeda(calculo.preco.custoIngredientes)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>Modo de preparo</h2>
            {receita.modo_preparo ? (
              <p className="preparo">{receita.modo_preparo}</p>
            ) : (
              <p className="muted">Nenhum modo de preparo informado.</p>
            )}
          </div>
        </div>

        <aside className="coluna-lateral">
          <ResumoPreco preco={calculo.preco} rendimento={receita.rendimento} unidadeRendimento={receita.unidade_rendimento} />
        </aside>
      </div>
    </>
  );
}
