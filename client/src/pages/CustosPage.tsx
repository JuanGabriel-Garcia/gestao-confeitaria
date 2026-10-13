import { Check, Pencil, Percent, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useConfirmar } from '../components/Confirmacao';
import { Alerta, Cabecalho, Campo, Carregando } from '../components/ui';
import { useCarregar } from '../hooks/useCarregar';
import { api } from '../lib/api';
import { formatarMoeda, formatarNumero, lerDecimal, paraCampo } from '../lib/formato';
import type { Gasto, TipoGasto } from '../lib/types';

interface Rascunho {
  nome: string;
  tipo: TipoGasto;
  valor: string;
}

const vazio: Rascunho = { nome: '', tipo: 'fixo', valor: '' };

function validar(r: Rascunho): string | null {
  if (!r.nome.trim()) return 'Informe o nome do gasto.';
  if (!(lerDecimal(r.valor) >= 0)) return 'Informe um valor válido.';
  return null;
}

export function CustosPage() {
  const { dados, setDados, erro, carregando } = useCarregar(async () => {
    const [gastos, configuracoes] = await Promise.all([api.gastos.listar(), api.configuracoes.obter()]);
    return { gastos, configuracoes };
  });

  const [margem, setMargem] = useState('');
  const [msgMargem, setMsgMargem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [novo, setNovo] = useState<Rascunho>(vazio);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [edicao, setEdicao] = useState<Rascunho>(vazio);
  const [erroGasto, setErroGasto] = useState<string | null>(null);
  const confirmar = useConfirmar();

  useEffect(() => {
    if (dados) setMargem(paraCampo(dados.configuracoes.margem_lucro));
  }, [dados?.configuracoes.margem_lucro]); // eslint-disable-line react-hooks/exhaustive-deps

  function atualizarGastos(fn: (gastos: Gasto[]) => Gasto[]) {
    setDados((d) => (d ? { ...d, gastos: fn(d.gastos) } : d));
  }

  async function salvarMargem(e: FormEvent) {
    e.preventDefault();
    const valor = lerDecimal(margem);
    if (!(valor >= 0)) return setMsgMargem({ tipo: 'erro', texto: 'Informe uma margem válida.' });
    try {
      const configuracoes = await api.configuracoes.salvar({ margem_lucro: valor });
      setDados((d) => (d ? { ...d, configuracoes } : d));
      setMsgMargem({ tipo: 'sucesso', texto: 'Margem atualizada. Todas as receitas sem margem personalizada foram recalculadas.' });
    } catch (e) {
      setMsgMargem({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const problema = validar(novo);
    if (problema) return setErroGasto(problema);
    setErroGasto(null);
    try {
      const gasto = await api.gastos.criar({ nome: novo.nome.trim(), tipo: novo.tipo, valor: lerDecimal(novo.valor), ativo: true });
      atualizarGastos((g) => [...g, gasto].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNovo(vazio);
    } catch (e) {
      setErroGasto((e as Error).message);
    }
  }

  async function salvarEdicao(gasto: Gasto) {
    const problema = validar(edicao);
    if (problema) return setErroGasto(problema);
    setErroGasto(null);
    try {
      const atualizado = await api.gastos.atualizar(gasto.id, {
        nome: edicao.nome.trim(),
        tipo: edicao.tipo,
        valor: lerDecimal(edicao.valor),
        ativo: gasto.ativo,
      });
      atualizarGastos((g) => g.map((x) => (x.id === gasto.id ? atualizado : x)));
      setEditandoId(null);
    } catch (e) {
      setErroGasto((e as Error).message);
    }
  }

  async function alternarAtivo(gasto: Gasto) {
    try {
      const atualizado = await api.gastos.atualizar(gasto.id, { ...gasto, ativo: !gasto.ativo });
      atualizarGastos((g) => g.map((x) => (x.id === gasto.id ? atualizado : x)));
    } catch (e) {
      setErroGasto((e as Error).message);
    }
  }

  async function excluir(gasto: Gasto) {
    const ok = await confirmar({
      titulo: 'Excluir gasto geral?',
      mensagem: (
        <>
          O gasto <strong>{gasto.nome}</strong> será removido e deixará de entrar no custo das receitas. Se quiser apenas
          pausá-lo, use o botão "Ativo".
        </>
      ),
    });
    if (!ok) return;
    try {
      await api.gastos.excluir(gasto.id);
      atualizarGastos((g) => g.filter((x) => x.id !== gasto.id));
    } catch (e) {
      setErroGasto((e as Error).message);
    }
  }

  if (carregando && !dados) return <Carregando />;
  if (erro || !dados) return <Alerta>{erro ?? 'Erro ao carregar.'}</Alerta>;

  return (
    <>
      <Cabecalho
        titulo="Gastos gerais e margem"
        descricao="Gastos como água, luz e gás são incluídos automaticamente no custo de todas as receitas."
      />

      <div className="grade-custos">
        <form className="card form" onSubmit={salvarMargem}>
          <h2>Margem de lucro padrão</h2>
          <p className="dica">
            Aplicada sobre o custo total (ingredientes + gastos gerais). Com 30%, uma receita que custa R$ 10,00 é vendida
            por R$ 13,00.
          </p>
          <Campo rotulo="Margem (%)" htmlFor="margem">
            <div className="input-sufixo">
              <input id="margem" inputMode="decimal" value={margem} onChange={(e) => setMargem(e.target.value)} />
              <Percent size={16} />
            </div>
          </Campo>
          {msgMargem && <Alerta tipo={msgMargem.tipo}>{msgMargem.texto}</Alerta>}
          <div className="form-acoes">
            <button type="submit" className="btn btn-primario">
              <Save size={18} /> Salvar margem
            </button>
          </div>
        </form>

        <div className="card sem-padding">
          <h2 className="card-titulo">Gastos gerais</h2>
          <div className="explicacao">
            <p>
              <strong>Valor fixo (R$):</strong> somado ao custo de cada receita. Ex.: gás gasto numa fornada ≈ R$ 2,50.
            </p>
            <p>
              <strong>Percentual (%):</strong> calculado sobre o custo dos ingredientes. Ex.: luz = 5% do custo dos
              ingredientes.
            </p>
          </div>

          {erroGasto && (
            <div className="padding-x">
              <Alerta>{erroGasto}</Alerta>
            </div>
          )}

          <div className="tabela-container">
            <table className="tabela tabela-form">
              <thead>
                <tr>
                  <th>Gasto</th>
                  <th style={{ width: 150 }}>Tipo</th>
                  <th className="num" style={{ width: 140 }}>
                    Valor
                  </th>
                  <th style={{ width: 90 }}>Ativo</th>
                  <th style={{ width: 96 }} />
                </tr>
              </thead>
              <tbody>
                {dados.gastos.map((gasto) =>
                  editandoId === gasto.id ? (
                    <tr key={gasto.id}>
                      <td>
                        <input value={edicao.nome} onChange={(e) => setEdicao({ ...edicao, nome: e.target.value })} aria-label="Nome" autoFocus />
                      </td>
                      <td>
                        <select value={edicao.tipo} onChange={(e) => setEdicao({ ...edicao, tipo: e.target.value as TipoGasto })} aria-label="Tipo">
                          <option value="fixo">Valor fixo (R$)</option>
                          <option value="percentual">Percentual (%)</option>
                        </select>
                      </td>
                      <td>
                        <input inputMode="decimal" value={edicao.valor} onChange={(e) => setEdicao({ ...edicao, valor: e.target.value })} aria-label="Valor" />
                      </td>
                      <td />
                      <td className="acoes">
                        <button type="button" className="btn-icone sucesso" title="Salvar" onClick={() => salvarEdicao(gasto)}>
                          <Check size={16} />
                        </button>
                        <button type="button" className="btn-icone" title="Cancelar" onClick={() => setEditandoId(null)}>
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={gasto.id} className={gasto.ativo ? '' : 'inativo'}>
                      <td className="forte">{gasto.nome}</td>
                      <td>{gasto.tipo === 'fixo' ? 'Valor fixo' : 'Percentual'}</td>
                      <td className="num">
                        {gasto.tipo === 'fixo' ? formatarMoeda(gasto.valor) : `${formatarNumero(gasto.valor, 2)}%`}
                      </td>
                      <td>
                        <label className="interruptor" title={gasto.ativo ? 'Desativar' : 'Ativar'}>
                          <input type="checkbox" checked={gasto.ativo} onChange={() => alternarAtivo(gasto)} />
                          <span />
                        </label>
                      </td>
                      <td className="acoes">
                        <button
                          type="button"
                          className="btn-icone"
                          title="Editar"
                          onClick={() => {
                            setEditandoId(gasto.id);
                            setEdicao({ nome: gasto.nome, tipo: gasto.tipo, valor: paraCampo(gasto.valor) });
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button type="button" className="btn-icone perigo" title="Excluir" onClick={() => excluir(gasto)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ),
                )}
                {dados.gastos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted centro">
                      Nenhum gasto cadastrado. Adicione água, luz, gás... abaixo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form className="linha-adicionar" onSubmit={adicionar}>
            <input placeholder="Nome (ex.: Gás)" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} aria-label="Nome do novo gasto" />
            <select value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value as TipoGasto })} aria-label="Tipo do novo gasto">
              <option value="fixo">Valor fixo (R$)</option>
              <option value="percentual">Percentual (%)</option>
            </select>
            <input
              inputMode="decimal"
              placeholder={novo.tipo === 'fixo' ? 'R$ 0,00' : '0 %'}
              value={novo.valor}
              onChange={(e) => setNovo({ ...novo, valor: e.target.value })}
              aria-label="Valor do novo gasto"
            />
            <button type="submit" className="btn btn-primario">
              <Plus size={18} /> Adicionar
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
