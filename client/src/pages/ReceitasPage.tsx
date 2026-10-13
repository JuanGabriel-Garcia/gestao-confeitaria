import { BookOpen, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alerta, BadgeCategoria, Cabecalho, Carregando, EstadoVazio } from '../components/ui';
import { useCarregar } from '../hooks/useCarregar';
import { api, carregarDadosDePreco } from '../lib/api';
import { formatarMoeda, formatarNumero } from '../lib/formato';
import { precificarReceita } from '../lib/precificacao';
import type { Categoria } from '../lib/types';
import { CATEGORIAS } from '../lib/unidades';

type Filtro = Categoria | 'todas';

export function ReceitasPage() {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busca, setBusca] = useState('');

  const { dados, erro, carregando } = useCarregar(async () => {
    const [receitas, base] = await Promise.all([api.receitas.listar(), carregarDadosDePreco()]);
    return { receitas, ...base };
  });

  const linhas = useMemo(() => {
    if (!dados) return [];
    const porId = new Map(dados.ingredientes.map((i) => [i.id, i]));
    return dados.receitas.map((receita) => ({
      receita,
      preco: precificarReceita(receita, porId, dados.gastos, dados.configuracoes.margem_lucro, dados.medidas),
    }));
  }, [dados]);

  const filtradas = linhas.filter(
    ({ receita }) =>
      (filtro === 'todas' || receita.categoria === filtro) &&
      receita.nome.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  const contagem = (c: Filtro) => (c === 'todas' ? linhas.length : linhas.filter((l) => l.receita.categoria === c).length);

  return (
    <>
      <Cabecalho
        titulo="Receitas"
        descricao={
          dados ? (
            <>
              Preços calculados com os valores atuais dos ingredientes, gastos gerais e margem padrão de{' '}
              <strong>{formatarNumero(dados.configuracoes.margem_lucro, 2)}%</strong>.
            </>
          ) : undefined
        }
        acoes={
          <Link to="/receitas/nova" className="btn btn-primario">
            <Plus size={18} /> Nova receita
          </Link>
        }
      />

      {erro && <Alerta>{erro}</Alerta>}
      {carregando && !dados && <Carregando />}

      {dados && linhas.length === 0 && (
        <EstadoVazio
          icone={<BookOpen size={28} />}
          titulo="Nenhuma receita cadastrada"
          texto={
            dados.ingredientes.length === 0
              ? 'Primeiro cadastre seus ingredientes, depois monte as receitas com eles.'
              : 'Monte sua primeira receita escolhendo os ingredientes cadastrados.'
          }
          acao={
            dados.ingredientes.length === 0 ? (
              <Link to="/ingredientes/novo" className="btn btn-primario">
                <Plus size={18} /> Cadastrar ingrediente
              </Link>
            ) : (
              <Link to="/receitas/nova" className="btn btn-primario">
                <Plus size={18} /> Criar receita
              </Link>
            )
          }
        />
      )}

      {linhas.length > 0 && (
        <div className="card sem-padding">
          <div className="barra-ferramentas">
            <div className="abas">
              {(['todas', 'bolacha', 'bolo', 'docinho'] as Filtro[]).map((c) => (
                <button key={c} className={`aba ${filtro === c ? 'ativa' : ''}`} onClick={() => setFiltro(c)}>
                  {c === 'todas' ? 'Todas' : CATEGORIAS[c].plural}
                  <span className="contador">{contagem(c)}</span>
                </button>
              ))}
            </div>
            <div className="busca">
              <Search size={16} />
              <input placeholder="Buscar receita..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>

          <div className="tabela-container">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Receita</th>
                  <th>Categoria</th>
                  <th className="num">Rendimento</th>
                  <th className="num">Custo total</th>
                  <th className="num">Preço de venda</th>
                  <th className="num">Preço unitário</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(({ receita, preco }) => (
                  <tr key={receita.id} className="clicavel" onClick={() => navigate(`/receitas/${receita.id}`)}>
                    <td className="forte">{receita.nome}</td>
                    <td>
                      <BadgeCategoria categoria={receita.categoria} />
                    </td>
                    <td className="num">
                      {formatarNumero(receita.rendimento, 2)} <span className="muted">{receita.unidade_rendimento}</span>
                    </td>
                    <td className="num muted">{formatarMoeda(preco.custoTotal)}</td>
                    <td className="num destaque">{formatarMoeda(preco.precoVenda)}</td>
                    <td className="num">{formatarMoeda(preco.precoUnitario)}</td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted centro">
                      Nenhuma receita encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
