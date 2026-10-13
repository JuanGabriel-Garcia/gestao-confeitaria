import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResumoPreco } from '../components/ResumoPreco';
import { Alerta, Cabecalho, Campo, Carregando } from '../components/ui';
import { useCarregar } from '../hooks/useCarregar';
import { api, carregarDadosDePreco } from '../lib/api';
import { formatarMoeda, formatarNumero, lerDecimal, paraCampo } from '../lib/formato';
import { custoItem, precificar } from '../lib/precificacao';
import type { Categoria } from '../lib/types';
import {
  CATEGORIAS,
  chaveUnidade,
  formatarQuantidade,
  lerChaveUnidade,
  opcoesUnidade,
  unidadeSugerida,
} from '../lib/unidades';

interface LinhaForm {
  chave: number;
  ingredienteId: number | '';
  quantidade: string;
  /** 'g', 'kg', ... ou 'm<id>' para medida personalizada */
  unidade: string;
}

let proximaChave = 1;
const novaLinha = (): LinhaForm => ({ chave: proximaChave++, ingredienteId: '', quantidade: '', unidade: 'g' });

export function ReceitaFormPage() {
  const { id } = useParams();
  const editando = id !== undefined;
  const navigate = useNavigate();

  const { dados, erro: erroCarga, carregando } = useCarregar(async () => {
    const [base, receita] = await Promise.all([
      carregarDadosDePreco(),
      editando ? api.receitas.obter(Number(id)) : Promise.resolve(null),
    ]);
    return { ...base, receita };
  }, [id]);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('bolo');
  const [rendimento, setRendimento] = useState('1');
  const [unidadeRendimento, setUnidadeRendimento] = useState('unidades');
  const [modoPreparo, setModoPreparo] = useState('');
  const [margemPersonalizada, setMargemPersonalizada] = useState(false);
  const [margem, setMargem] = useState('');
  const [linhas, setLinhas] = useState<LinhaForm[]>([novaLinha()]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const preenchido = useRef(false);

  // Preenche o formulário ao editar
  useEffect(() => {
    if (!dados || preenchido.current) return;
    preenchido.current = true;
    setMargem(paraCampo(dados.configuracoes.margem_lucro));
    const r = dados.receita;
    if (!r) return;
    setNome(r.nome);
    setCategoria(r.categoria);
    setRendimento(paraCampo(r.rendimento));
    setUnidadeRendimento(r.unidade_rendimento);
    setModoPreparo(r.modo_preparo);
    setMargemPersonalizada(r.margem_lucro !== null);
    if (r.margem_lucro !== null) setMargem(paraCampo(r.margem_lucro));
    setLinhas(
      r.itens.map((item) => ({
        chave: proximaChave++,
        ingredienteId: item.ingrediente_id,
        quantidade: paraCampo(item.quantidade),
        unidade: chaveUnidade(item),
      })),
    );
  }, [dados]);

  const porId = useMemo(() => new Map((dados?.ingredientes ?? []).map((i) => [i.id, i])), [dados]);
  const medidas = useMemo(() => dados?.medidas ?? new Map(), [dados]);

  const margemEfetiva = margemPersonalizada ? lerDecimal(margem) : (dados?.configuracoes.margem_lucro ?? 30);
  const rendimentoNum = lerDecimal(rendimento);

  const preco = useMemo(
    () =>
      precificar(
        linhas.map((l) => ({
          ingrediente: l.ingredienteId === '' ? undefined : porId.get(l.ingredienteId),
          quantidade: lerDecimal(l.quantidade),
          ...lerChaveUnidade(l.unidade, medidas),
        })),
        dados?.gastos ?? [],
        Number.isFinite(margemEfetiva) ? margemEfetiva : 0,
        rendimentoNum,
        medidas,
      ),
    [linhas, porId, dados, medidas, margemEfetiva, rendimentoNum],
  );

  function alterarLinha(chave: number, mudanca: Partial<LinhaForm>) {
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
  }

  function escolherIngrediente(chave: number, valor: string) {
    if (!valor) return alterarLinha(chave, { ingredienteId: '' });
    const ing = porId.get(Number(valor));
    if (ing) alterarLinha(chave, { ingredienteId: ing.id, unidade: chaveUnidade(unidadeSugerida(ing)) });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) return setErro('Informe o nome da receita.');
    if (!(rendimentoNum > 0)) return setErro('O rendimento deve ser maior que zero.');
    if (margemPersonalizada && !(lerDecimal(margem) >= 0)) return setErro('Informe uma margem de lucro válida.');
    const preenchidas = linhas.filter((l) => l.ingredienteId !== '' || l.quantidade.trim());
    if (preenchidas.length === 0) return setErro('Adicione pelo menos um ingrediente.');
    for (const [i, l] of preenchidas.entries()) {
      if (l.ingredienteId === '') return setErro(`Escolha o ingrediente da linha ${i + 1}.`);
      if (!(lerDecimal(l.quantidade) > 0)) return setErro(`Informe a quantidade de "${porId.get(l.ingredienteId)?.nome}".`);
    }

    setSalvando(true);
    try {
      const dadosReceita = {
        nome: nome.trim(),
        categoria,
        modo_preparo: modoPreparo,
        rendimento: rendimentoNum,
        unidade_rendimento: unidadeRendimento.trim() || 'unidades',
        margem_lucro: margemPersonalizada ? lerDecimal(margem) : null,
        itens: preenchidas.map((l) => ({
          ingrediente_id: l.ingredienteId as number,
          quantidade: lerDecimal(l.quantidade),
          ...lerChaveUnidade(l.unidade, medidas),
        })),
      };
      const salva = editando
        ? await api.receitas.atualizar(Number(id), dadosReceita)
        : await api.receitas.criar(dadosReceita);
      navigate(`/receitas/${salva.id}`);
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  }

  if (carregando && !dados) return <Carregando />;
  if (erroCarga || !dados) return <Alerta>{erroCarga ?? 'Erro ao carregar dados.'}</Alerta>;

  const semIngredientes = dados.ingredientes.length === 0;
  const usados = new Set(linhas.map((l) => l.ingredienteId));

  return (
    <>
      <Cabecalho
        titulo={editando ? 'Editar receita' : 'Nova receita'}
        descricao="Escolha os ingredientes cadastrados e ajuste as quantidades. O preço é calculado em tempo real."
        acoes={
          <Link to={editando ? `/receitas/${id}` : '/receitas'} className="btn btn-secundario">
            <ArrowLeft size={18} /> Voltar
          </Link>
        }
      />

      {semIngredientes && (
        <Alerta tipo="info">
          Você ainda não tem ingredientes cadastrados. <Link to="/ingredientes/novo">Cadastre um ingrediente</Link> antes de
          montar a receita.
        </Alerta>
      )}

      <form className="layout-receita" onSubmit={salvar}>
        <div className="coluna">
          <div className="card form">
            <h2>Dados da receita</h2>
            <Campo rotulo="Nome da receita" htmlFor="nome">
              <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Bolo de cenoura com cobertura" maxLength={150} />
            </Campo>

            <div className="grade-3">
              <Campo rotulo="Categoria" htmlFor="categoria">
                <select id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
                  {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIAS[c].nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Rendimento" htmlFor="rendimento" dica="Quanto a receita rende">
                <input id="rendimento" inputMode="decimal" value={rendimento} onChange={(e) => setRendimento(e.target.value)} />
              </Campo>
              <Campo rotulo="Unidade do rendimento" htmlFor="unidadeRendimento">
                <input
                  id="unidadeRendimento"
                  list="sugestoes-rendimento"
                  value={unidadeRendimento}
                  onChange={(e) => setUnidadeRendimento(e.target.value)}
                  maxLength={30}
                />
                <datalist id="sugestoes-rendimento">
                  <option value="unidades" />
                  <option value="fatias" />
                  <option value="bolos" />
                  <option value="docinhos" />
                  <option value="bolachas" />
                  <option value="kg" />
                </datalist>
              </Campo>
            </div>
          </div>

          <div className="card sem-padding">
            <h2 className="card-titulo">Ingredientes</h2>
            <div className="tabela-container">
              <table className="tabela tabela-form">
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th style={{ width: 130 }}>Quantidade</th>
                    <th style={{ width: 170 }}>Medida</th>
                    <th className="num" style={{ width: 110 }}>
                      Custo
                    </th>
                    <th style={{ width: 48 }} />
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha) => {
                    const ing = linha.ingredienteId === '' ? undefined : porId.get(linha.ingredienteId);
                    const qtd = lerDecimal(linha.quantidade);
                    const ref = lerChaveUnidade(linha.unidade, medidas);
                    return (
                      <tr key={linha.chave}>
                        <td>
                          <select
                            value={linha.ingredienteId}
                            onChange={(e) => escolherIngrediente(linha.chave, e.target.value)}
                            aria-label="Ingrediente"
                          >
                            <option value="">Selecione...</option>
                            {dados.ingredientes.map((i) => (
                              <option key={i.id} value={i.id} disabled={usados.has(i.id) && i.id !== linha.ingredienteId}>
                                {i.nome} ({formatarMoeda(i.preco)} / {formatarQuantidade(i.quantidade_padrao, i, medidas)})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            inputMode="decimal"
                            placeholder="0"
                            value={linha.quantidade}
                            onChange={(e) => alterarLinha(linha.chave, { quantidade: e.target.value })}
                            aria-label="Quantidade"
                          />
                        </td>
                        <td>
                          <select
                            value={linha.unidade}
                            onChange={(e) => alterarLinha(linha.chave, { unidade: e.target.value })}
                            disabled={!ing}
                            aria-label="Unidade"
                          >
                            {(ing
                              ? opcoesUnidade(dados.listaMedidas, ing.unidade)
                              : [{ chave: linha.unidade, rotulo: linha.unidade }]
                            ).map((o) => (
                              <option key={o.chave} value={o.chave}>
                                {o.rotulo}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="num">{ing && qtd > 0 ? formatarMoeda(custoItem(ing, qtd, ref, medidas)) : '-'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-icone perigo"
                            title="Remover"
                            onClick={() => setLinhas((atual) => atual.filter((l) => l.chave !== linha.chave))}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card-rodape">
              <button
                type="button"
                className="btn btn-secundario"
                onClick={() => setLinhas((atual) => [...atual, novaLinha()])}
                disabled={semIngredientes || linhas.length >= dados.ingredientes.length}
              >
                <Plus size={18} /> Adicionar ingrediente
              </button>
            </div>
          </div>

          <div className="card form">
            <h2>Modo de preparo</h2>
            <textarea
              rows={8}
              value={modoPreparo}
              onChange={(e) => setModoPreparo(e.target.value)}
              placeholder={'1. Bata os ovos com o açúcar...\n2. Acrescente a farinha...\n3. Asse por 40 minutos a 180 °C...'}
            />
          </div>
        </div>

        <aside className="coluna-lateral">
          <div className="card form">
            <h2>Margem de lucro</h2>
            <label className="check">
              <input type="checkbox" checked={margemPersonalizada} onChange={(e) => setMargemPersonalizada(e.target.checked)} />
              Usar margem personalizada nesta receita
            </label>
            {margemPersonalizada ? (
              <Campo rotulo="Margem (%)" htmlFor="margem">
                <input id="margem" inputMode="decimal" value={margem} onChange={(e) => setMargem(e.target.value)} />
              </Campo>
            ) : (
              <p className="dica">
                Usando a margem padrão de <strong>{formatarNumero(dados.configuracoes.margem_lucro, 2)}%</strong>. Altere em{' '}
                <Link to="/custos">Gastos gerais e margem</Link>.
              </p>
            )}
          </div>

          <ResumoPreco preco={preco} rendimento={rendimentoNum > 0 ? rendimentoNum : 1} unidadeRendimento={unidadeRendimento || 'unidades'} />

          {erro && <Alerta>{erro}</Alerta>}
          <button type="submit" className="btn btn-primario largo" disabled={salvando || semIngredientes}>
            <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar receita'}
          </button>
        </aside>
      </form>
    </>
  );
}
