import { BookOpen, CakeSlice, Carrot, PlusCircle, Ruler, Settings2, Wheat } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../lib/api';

const grupos = [
  {
    titulo: 'Receitas',
    links: [
      { to: '/receitas', rotulo: 'Listar receitas', icone: BookOpen, end: true },
      { to: '/receitas/nova', rotulo: 'Nova receita', icone: PlusCircle },
    ],
  },
  {
    titulo: 'Ingredientes',
    links: [
      { to: '/ingredientes', rotulo: 'Listar ingredientes', icone: Wheat, end: true },
      { to: '/ingredientes/novo', rotulo: 'Novo ingrediente', icone: Carrot },
      { to: '/medidas', rotulo: 'Medidas', icone: Ruler },
    ],
  },
  {
    titulo: 'Custos',
    links: [{ to: '/custos', rotulo: 'Gastos gerais e margem', icone: Settings2 }],
  },
];

export function Layout() {
  const [semBanco, setSemBanco] = useState(false);

  useEffect(() => {
    api
      .saude()
      .then(() => setSemBanco(false))
      .catch(() => setSemBanco(true));
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="marca">
          <span className="marca-icone">
            <CakeSlice size={20} />
          </span>
          <div>
            <strong>Confeitaria</strong>
            <small>Gestão e precificação</small>
          </div>
        </div>
        <nav>
          {grupos.map((grupo) => (
            <div className="nav-grupo" key={grupo.titulo}>
              <span className="nav-titulo">{grupo.titulo}</span>
              {grupo.links.map(({ to, rotulo, icone: Icone, end }) => (
                <NavLink key={to} to={to} end={end} className="nav-link">
                  <Icone size={18} />
                  <span>{rotulo}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="conteudo">
        {semBanco && (
          <div className="alerta alerta-erro faixa">
            <strong>Sem conexão com o banco de dados.</strong> Verifique se a API está rodando e se o arquivo{' '}
            <code>server/.env</code> está configurado. Veja o <code>GUIA_BANCO_DE_DADOS.md</code>.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
