import { Pencil, Plus, Search, Trash2, Wheat } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConfirmar } from '../components/Confirmacao';
import { Alerta, Cabecalho, Carregando, EstadoVazio } from '../components/ui';
import { useCarregar } from '../hooks/useCarregar';
import { api, mapaMedidas } from '../lib/api';
import { formatarData, formatarMoeda, formatarMoedaPrecisa } from '../lib/formato';
import { custoPorUnidadeBase } from '../lib/precificacao';
import type { Ingrediente } from '../lib/types';
import { formatarQuantidade, unidadeBase } from '../lib/unidades';

export function IngredientesPage() {
  const navigate = useNavigate();
  const { dados: carga, setDados: setCarga, erro, carregando } = useCarregar(async () => {
    const [ingredientes, medidas] = await Promise.all([api.ingredientes.listar(), api.medidas.listar()]);
    return { ingredientes, medidas: mapaMedidas(medidas) };
  });
  const dados = carga?.ingredientes ?? null;
  const medidas = carga?.medidas ?? new Map();
  const setDados = (fn: (atual: Ingrediente[] | null) => Ingrediente[]) =>
    setCarga((c) => (c ? { ...c, ingredientes: fn(c.ingredientes) } : c));
  const [busca, setBusca] = useState('');
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const confirmar = useConfirmar();

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (dados ?? []).filter((i) => i.nome.toLowerCase().includes(termo));
  }, [dados, busca]);

  async function excluir(ing: Ingrediente) {
    const ok = await confirmar({
      titulo: 'Excluir ingrediente?',
      mensagem: (
        <>
          O ingrediente <strong>{ing.nome}</strong> será removido permanentemente.
        </>
      ),
    });
    if (!ok) return;
    setErroAcao(null);
    try {
      await api.ingredientes.excluir(ing.id);
      setDados((atual) => (atual ?? []).filter((i) => i.id !== ing.id));
    } catch (e) {
      setErroAcao((e as Error).message);
    }
  }

  return (
    <>
      <Cabecalho
        titulo="Ingredientes"
        descricao="Cadastre o preço de cada ingrediente pela sua medida padrão. Ao alterar um preço, todas as receitas são recalculadas automaticamente."
        acoes={
          <Link to="/ingredientes/novo" className="btn btn-primario">
            <Plus size={18} /> Novo ingrediente
          </Link>
        }
      />

      {erroAcao && <Alerta>{erroAcao}</Alerta>}
      {erro && <Alerta>{erro}</Alerta>}
      {carregando && !dados && <Carregando />}

      {dados && dados.length === 0 && (
        <EstadoVazio
          icone={<Wheat size={28} />}
          titulo="Nenhum ingrediente cadastrado"
          texto="Comece cadastrando os ingredientes que você usa, com a medida e o preço que você paga."
          acao={
            <Link to="/ingredientes/novo" className="btn btn-primario">
              <Plus size={18} /> Cadastrar primeiro ingrediente
            </Link>
          }
        />
      )}

      {dados && dados.length > 0 && (
        <div className="card sem-padding">
          <div className="barra-ferramentas">
            <div className="busca">
              <Search size={16} />
              <input placeholder="Buscar ingrediente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <span className="muted">
              {filtrados.length} de {dados.length}
            </span>
          </div>
          <div className="tabela-container">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Medida padrão</th>
                  <th className="num">Preço</th>
                  <th className="num">Custo unitário</th>
                  <th className="num">Receitas</th>
                  <th>Atualizado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((ing) => (
                  <tr key={ing.id} className="clicavel" onClick={() => navigate(`/ingredientes/${ing.id}/editar`)}>
                    <td className="forte">{ing.nome}</td>
                    <td>{formatarQuantidade(ing.quantidade_padrao, ing, medidas)}</td>
                    <td className="num">{formatarMoeda(ing.preco)}</td>
                    <td className="num muted">
                      {formatarMoedaPrecisa(custoPorUnidadeBase(ing, medidas))} / {unidadeBase(ing.unidade)}
                    </td>
                    <td className="num">{ing.usado_em}</td>
                    <td className="muted">{formatarData(ing.atualizado_em)}</td>
                    <td className="acoes" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/ingredientes/${ing.id}/editar`} className="btn-icone" title="Editar">
                        <Pencil size={16} />
                      </Link>
                      <button className="btn-icone perigo" title="Excluir" onClick={() => excluir(ing)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted centro">
                      Nenhum ingrediente encontrado para "{busca}".
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
