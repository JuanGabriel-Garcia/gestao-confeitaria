import { Trash2 } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface OpcoesConfirmacao {
  titulo: string;
  mensagem: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
}

type Confirmar = (opcoes: OpcoesConfirmacao) => Promise<boolean>;

const ContextoConfirmacao = createContext<Confirmar>(() => Promise.resolve(false));

/** Abre a janela de confirmação e devolve true se o usuário confirmar. */
export function useConfirmar(): Confirmar {
  return useContext(ContextoConfirmacao);
}

interface Pendente extends OpcoesConfirmacao {
  responder: (confirmado: boolean) => void;
}

export function ConfirmacaoProvider({ children }: { children: ReactNode }) {
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const botaoCancelar = useRef<HTMLButtonElement>(null);

  const confirmar = useCallback<Confirmar>(
    (opcoes) => new Promise((resolve) => setPendente({ ...opcoes, responder: resolve })),
    [],
  );

  const fechar = useCallback(
    (confirmado: boolean) => {
      pendente?.responder(confirmado);
      setPendente(null);
    },
    [pendente],
  );

  useEffect(() => {
    if (!pendente) return;
    botaoCancelar.current?.focus();
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar(false);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [pendente, fechar]);

  return (
    <ContextoConfirmacao.Provider value={confirmar}>
      {children}
      {pendente && (
        <div className="modal-fundo" onMouseDown={() => fechar(false)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="modal-titulo"
            aria-describedby="modal-mensagem"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-icone">
              <Trash2 size={22} />
            </div>
            <h2 id="modal-titulo">{pendente.titulo}</h2>
            <div id="modal-mensagem" className="modal-mensagem">
              {pendente.mensagem}
            </div>
            <div className="modal-acoes">
              <button ref={botaoCancelar} type="button" className="btn btn-secundario" onClick={() => fechar(false)}>
                {pendente.textoCancelar ?? 'Cancelar'}
              </button>
              <button type="button" className="btn btn-perigo-cheio" onClick={() => fechar(true)}>
                <Trash2 size={16} /> {pendente.textoConfirmar ?? 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ContextoConfirmacao.Provider>
  );
}
