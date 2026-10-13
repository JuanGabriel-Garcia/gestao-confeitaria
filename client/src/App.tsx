import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { EstadoVazio } from './components/ui';
import { CustosPage } from './pages/CustosPage';
import { IngredienteFormPage } from './pages/IngredienteFormPage';
import { IngredientesPage } from './pages/IngredientesPage';
import { MedidasPage } from './pages/MedidasPage';
import { ReceitaDetalhePage } from './pages/ReceitaDetalhePage';
import { ReceitaFormPage } from './pages/ReceitaFormPage';
import { ReceitasPage } from './pages/ReceitasPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/receitas" replace />} />

        <Route path="receitas" element={<ReceitasPage />} />
        <Route path="receitas/nova" element={<ReceitaFormPage key="nova" />} />
        <Route path="receitas/:id" element={<ReceitaDetalhePage />} />
        <Route path="receitas/:id/editar" element={<ReceitaFormPage key="editar" />} />

        <Route path="ingredientes" element={<IngredientesPage />} />
        <Route path="ingredientes/novo" element={<IngredienteFormPage key="novo" />} />
        <Route path="ingredientes/:id/editar" element={<IngredienteFormPage key="editar" />} />

        <Route path="medidas" element={<MedidasPage />} />
        <Route path="custos" element={<CustosPage />} />

        <Route
          path="*"
          element={
            <EstadoVazio
              icone="?"
              titulo="Página não encontrada"
              texto="O endereço acessado não existe."
              acao={
                <Link to="/receitas" className="btn btn-primario">
                  Ir para receitas
                </Link>
              }
            />
          }
        />
      </Route>
    </Routes>
  );
}
