import { Check, Pencil, Plus, Ruler, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useConfirmar } from '../components/Confirmacao';
import { Alerta, Cabecalho, Carregando } from '../components/ui';
import { useCarregar } from '../hooks/useCarregar';
import { api } from '../lib/api';
import { formatarNumero, lerDecimal, paraCampo } from '../lib/formato';
import type { Medida, MedidaInput, Unidade } from '../lib/types';
import { LISTA_UNIDADES } from '../lib/unidades';

interface Rascunho {
  nome: string;
  sigla: string;
  quantidade: string;
  unidade: Unidade;
}

const vazio: Rascunho = { nome: '', sigla: '', quantidade: '', unidade: 'ml' };

function converter(r: Rascunho): MedidaInput | string {
  if (!r.nome.trim()) return 'Informe o nome da medida (ex.: Caixa).';
  if (!r.sigla.trim()) return 'Informe a sigla da medida (ex.: cx).';
  const quantidade = lerDecimal(r.quantidade);
  if (!(quantidade > 0)) return 'Informe quanto a medida equivale (um número maior que zero).';
  return { nome: r.nome.trim(), sigla: r.sigla.trim(), quantidade, unidade: r.unidade };
}

function CamposMedida({ valor, onChange, autoFocus, form }: { valor: Rascunho; onChange: (r: Rascunho) => void; autoFocus?: boolean; form?: string }) {
  return (
    <>
      <td>
        <input placeholder="Ex.: Caixa" value={valor.nome} onChange={(e) => onChange({ ...valor, nome: e.target.value })} aria-label="Nome" autoFocus={autoFocus} form={form} maxLength={60} />
      </td>
      <td>
        <input placeholder="cx" value={valor.sigla} onChange={(e) => onChange({ ...valor, sigla: e.target.value })} aria-label="Sigla" maxLength={10} form={form} />
      </td>
      <td>
        <div className="equivale">
          <input inputMode="decimal" placeholder="240" value={valor.quantidade} onChange={(e) => onChange({ ...valor, quantidade: e.target.value })} aria-label="Quantidade" form={form} />
          <select value={valor.unidade} onChange={(e) => onChange({ ...valor, unidade: e.target.value as Unidade })} aria-label="Unidade" form={form}>
            {LISTA_UNIDADES.map((u) => (
              <option key={u.sigla} value={u.sigla}>
                {u.sigla}
              </option>
            ))}
          </select>
        </div>
      </td>
    </>
  );
}

export function MedidasPage() {
  const { dados, setDados, erro, carregando } = useCarregar(api.medidas.listar);
  const [novo, setNovo] = useState<Rascunho>(vazio);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [edicao, setEdicao] = useState<Rascunho>(vazio);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const confirmar = useConfirmar();

  const ordenar = (lista: Medida[]) =>
    [...lista].sort((a, b) => a.nome.localeCompare(b.nome) || a.unidade.localeCompare(b.unidade) || a.quantidade - b.quantidade);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    const dadosMedida = converter(novo);
    if (typeof dadosMedida === 'string') return setErroAcao(dadosMedida);
    setErroAcao(null);
    try {
      const medida = await api.medidas.criar(dadosMedida);
      setDados((atual) => ordenar([...(atual ?? []), medida]));
      setNovo({ ...vazio, unidade: novo.unidade });
    } catch (e) {
      setErroAcao((e as Error).message);
    }
  }

  async function salvarEdicao(id: number) {
    const dadosMedida = converter(edicao);
    if (typeof dadosMedida === 'string') return setErroAcao(dadosMedida);
    setErroAcao(null);
    try {
      const medida = await api.medidas.atualizar(id, dadosMedida);
      setDados((atual) => ordenar((atual ?? []).map((m) => (m.id === id ? medida : m))));
      setEditandoId(null);
    } catch (e) {
      setErroAcao((e as Error).message);
    }
  }

  async function excluir(medida: Medida) {
    const ok = await confirmar({
      titulo: 'Excluir medida?',
      mensagem: (
        <>
          A medida{' '}
          <strong>
            {medida.nome} ({medida.sigla} = {formatarNumero(medida.quantidade)} {medida.unidade})
          </strong>{' '}
          será removida permanentemente.
        </>
      ),
    });
    if (!ok) return;
    setErroAcao(null);
    try {
      await api.medidas.excluir(medida.id);
      setDados((atual) => (atual ?? []).filter((m) => m.id !== medida.id));
    } catch (e) {
      setErroAcao((e as Error).message);
    }
  }

  if (carregando && !dados) return <Carregando />;
  if (erro || !dados) return <Alerta>{erro ?? 'Erro ao carregar.'}</Alerta>;

  return (
    <>
      <Cabecalho
        titulo="Medidas"
        descricao="Cadastre medidas próprias, como caixa, lata ou xícara, dizendo quanto cada uma equivale. Elas podem ser usadas nos ingredientes e nas receitas, e o preço é convertido automaticamente."
      />

      {erroAcao && <Alerta>{erroAcao}</Alerta>}

      <div className="card sem-padding">
        <div className="explicacao topo">
          <p>
            <strong>Exemplos:</strong> Caixa (cx) = 240 ml · Caixa (cx) = 500 ml · Lata (lt) = 395 g · Xícara (xíc) = 120 g ·
            Dúzia (dz) = 12 un
          </p>
          <p>Você pode ter várias medidas com o mesmo nome e tamanhos diferentes.</p>
        </div>

        <div className="tabela-container">
          <table className="tabela tabela-form">
            <thead>
              <tr>
                <th>Nome</th>
                <th style={{ width: 120 }}>Sigla</th>
                <th style={{ width: 210 }}>Equivale a</th>
                <th className="num" style={{ width: 90 }}>
                  Em uso
                </th>
                <th style={{ width: 96 }} />
              </tr>
            </thead>
            <tbody>
              {dados.map((medida) =>
                editandoId === medida.id ? (
                  <tr key={medida.id}>
                    <CamposMedida valor={edicao} onChange={setEdicao} autoFocus />
                    <td className="num">{medida.usado_em}</td>
                    <td className="acoes">
                      <button type="button" className="btn-icone sucesso" title="Salvar" onClick={() => salvarEdicao(medida.id)}>
                        <Check size={16} />
                      </button>
                      <button type="button" className="btn-icone" title="Cancelar" onClick={() => setEditandoId(null)}>
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={medida.id}>
                    <td className="forte">{medida.nome}</td>
                    <td>{medida.sigla}</td>
                    <td>
                      {formatarNumero(medida.quantidade)} {medida.unidade}
                    </td>
                    <td className="num">{medida.usado_em}</td>
                    <td className="acoes">
                      <button
                        type="button"
                        className="btn-icone"
                        title="Editar"
                        onClick={() => {
                          setEditandoId(medida.id);
                          setEdicao({ nome: medida.nome, sigla: medida.sigla, quantidade: paraCampo(medida.quantidade), unidade: medida.unidade });
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button type="button" className="btn-icone perigo" title="Excluir" onClick={() => excluir(medida)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ),
              )}
              {dados.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted centro">
                    <Ruler size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Nenhuma medida personalizada cadastrada. Adicione a primeira abaixo.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="linha-nova">
              <tr>
                <CamposMedida valor={novo} onChange={setNovo} form="form-nova-medida" />
                <td colSpan={2} className="acoes">
                  <button type="submit" className="btn btn-primario" form="form-nova-medida">
                    <Plus size={18} /> Adicionar
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <form id="form-nova-medida" onSubmit={adicionar} />
      </div>
    </>
  );
}
