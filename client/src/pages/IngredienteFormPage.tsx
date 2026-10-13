import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alerta, Cabecalho, Campo, Carregando } from '../components/ui';
import { api, mapaMedidas } from '../lib/api';
import { formatarMoedaPrecisa, lerDecimal, paraCampo } from '../lib/formato';
import { custoPorUnidadeBase } from '../lib/precificacao';
import type { Ingrediente, Medida } from '../lib/types';
import { chaveUnidade, lerChaveUnidade, opcoesUnidade, unidadeBase } from '../lib/unidades';

export function IngredienteFormPage() {
  const { id } = useParams();
  const editando = id !== undefined;
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [chave, setChave] = useState('kg');
  const [quantidade, setQuantidade] = useState('1');
  const [preco, setPreco] = useState('');
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [original, setOriginal] = useState<Ingrediente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.medidas.listar(), editando ? api.ingredientes.obter(Number(id)) : Promise.resolve(null)])
      .then(([listaMedidas, ing]) => {
        setMedidas(listaMedidas);
        if (!ing) return;
        setOriginal(ing);
        setNome(ing.nome);
        setChave(chaveUnidade(ing));
        setQuantidade(paraCampo(ing.quantidade_padrao));
        setPreco(paraCampo(ing.preco));
      })
      .catch((e: Error) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [editando, id]);

  const mapa = mapaMedidas(medidas);
  const ref = lerChaveUnidade(chave, mapa);
  const opcoes = opcoesUnidade(medidas);
  const qtdNum = lerDecimal(quantidade);
  const precoNum = lerDecimal(preco);
  const previaValida = qtdNum > 0 && precoNum >= 0;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) return setErro('Informe o nome do ingrediente.');
    if (!(qtdNum > 0)) return setErro('A quantidade padrão deve ser um número maior que zero.');
    if (!(precoNum >= 0)) return setErro('Informe um preço válido.');

    const dados = { nome: nome.trim(), ...ref, quantidade_padrao: qtdNum, preco: precoNum };
    setSalvando(true);
    try {
      if (editando) await api.ingredientes.atualizar(Number(id), dados);
      else await api.ingredientes.criar(dados);
      navigate('/ingredientes');
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <>
      <Cabecalho
        titulo={editando ? 'Editar ingrediente' : 'Novo ingrediente'}
        descricao="Informe a medida que você compra e quanto paga por ela. Ex.: Farinha de trigo, 1 kg, R$ 6,50 ou Creme de leite, 1 cx (200 g), R$ 3,90."
        acoes={
          <Link to="/ingredientes" className="btn btn-secundario">
            <ArrowLeft size={18} /> Voltar
          </Link>
        }
      />

      <form className="card form estreito" onSubmit={salvar}>
        {erro && <Alerta>{erro}</Alerta>}
        {original && original.usado_em > 0 && (
          <Alerta tipo="info">
            Este ingrediente é usado em {original.usado_em} receita(s). Alterar o preço atualiza o valor de todas elas.
          </Alerta>
        )}

        <Campo rotulo="Nome" htmlFor="nome">
          <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Leite condensado" autoFocus maxLength={120} />
        </Campo>

        <div className="grade-3">
          <Campo rotulo="Quantidade padrão" htmlFor="quantidade" dica="Quantas unidades da medida você compra">
            <input id="quantidade" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="1" />
          </Campo>
          <div className="campo">
            <div className="unidade-com-link">
              <label htmlFor="unidade">Medida</label>
              <Link to="/medidas">+ nova medida</Link>
            </div>
            <select id="unidade" value={chave} onChange={(e) => setChave(e.target.value)}>
              <optgroup label="Unidades básicas">
                {opcoes
                  .filter((o) => !o.personalizada)
                  .map((o) => (
                    <option key={o.chave} value={o.chave}>
                      {o.rotulo}
                    </option>
                  ))}
              </optgroup>
              {medidas.length > 0 && (
                <optgroup label="Medidas personalizadas">
                  {opcoes
                    .filter((o) => o.personalizada)
                    .map((o) => (
                      <option key={o.chave} value={o.chave}>
                        {o.rotulo}
                      </option>
                    ))}
                </optgroup>
              )}
            </select>
          </div>
          <Campo rotulo="Preço (R$)" htmlFor="preco" dica="Valor pago pela quantidade padrão">
            <input id="preco" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="0,00" />
          </Campo>
        </div>

        {previaValida && (
          <div className="previa">
            Custo por {unidadeBase(ref.unidade)}:{' '}
            <strong>
              {formatarMoedaPrecisa(custoPorUnidadeBase({ ...ref, quantidade_padrao: qtdNum, preco: precoNum }, mapa))}
            </strong>
          </div>
        )}

        <div className="form-acoes">
          <Link to="/ingredientes" className="btn btn-secundario">
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primario" disabled={salvando}>
            <Save size={18} /> {salvando ? 'Salvando...' : 'Salvar ingrediente'}
          </button>
        </div>
      </form>
    </>
  );
}
