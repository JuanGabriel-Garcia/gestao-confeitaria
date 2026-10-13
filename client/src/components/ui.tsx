import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { CATEGORIAS } from '../lib/unidades';
import type { Categoria } from '../lib/types';

export function Cabecalho({ titulo, descricao, acoes }: { titulo: string; descricao?: ReactNode; acoes?: ReactNode }) {
  return (
    <header className="cabecalho">
      <div>
        <h1>{titulo}</h1>
        {descricao && <p className="descricao">{descricao}</p>}
      </div>
      {acoes && <div className="cabecalho-acoes">{acoes}</div>}
    </header>
  );
}

export function Alerta({ tipo = 'erro', children }: { tipo?: 'erro' | 'sucesso' | 'info'; children: ReactNode }) {
  const Icone = tipo === 'sucesso' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`alerta alerta-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      <Icone size={18} />
      <div>{children}</div>
    </div>
  );
}

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div className="carregando">
      <Loader2 size={20} className="girar" />
      <span>{texto}</span>
    </div>
  );
}

export function EstadoVazio({ icone, titulo, texto, acao }: { icone: ReactNode; titulo: string; texto: string; acao?: ReactNode }) {
  return (
    <div className="vazio">
      <div className="vazio-icone">{icone}</div>
      <h3>{titulo}</h3>
      <p>{texto}</p>
      {acao}
    </div>
  );
}

export function BadgeCategoria({ categoria }: { categoria: Categoria }) {
  return <span className={`badge badge-${categoria}`}>{CATEGORIAS[categoria].nome}</span>;
}

export function Campo({ rotulo, dica, children, htmlFor }: { rotulo: string; dica?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="campo">
      <label htmlFor={htmlFor}>{rotulo}</label>
      {children}
      {dica && <small className="dica">{dica}</small>}
    </div>
  );
}
