import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './auth/AuthContext';
import { AppLayout } from './components/AppLayout';
import { ToastProvider } from './components/Toast';
import { ChangePassword } from './pages/ChangePassword';
import { CustomerDetail } from './pages/CustomerDetail';
import { Customers } from './pages/Customers';
import { Login, Pending } from './pages/Login';
import { NewOrder } from './pages/NewOrder';
import { OrderDetail } from './pages/OrderDetail';
import { Orders } from './pages/Orders';
import { Panel } from './pages/Panel';
import { Receipt } from './pages/Receipt';
import { Showcase } from './pages/Showcase';
import { Track } from './pages/Track';
import { Dashboard } from './pages/admin/Dashboard';
import { ShowcaseAdmin } from './pages/admin/ShowcaseAdmin';
import { Templates } from './pages/admin/Templates';
import { Users } from './pages/admin/Users';

/** Atalho de teclado "N" abre uma nova ordem (fora de campos de texto). */
function Shortcuts() {
  const nav = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        nav('/app/ordens/nova');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Públicas */}
            <Route path="/" element={<Showcase />} />
            <Route path="/acompanhar/:code" element={<Track />} />
            <Route path="/app/login" element={<Login />} />
            <Route path="/app/aguardando" element={<Pending />} />

            {/* Balcão (login) */}
            <Route path="/app/ordens/:id/comprovante" element={<RequireAuth><Receipt /></RequireAuth>} />
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <Shortcuts />
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Panel />} />
              <Route path="ordens" element={<Orders />} />
              <Route path="ordens/nova" element={<NewOrder />} />
              <Route path="ordens/:id" element={<OrderDetail />} />
              <Route path="clientes" element={<Customers />} />
              <Route path="clientes/:id" element={<CustomerDetail />} />
              <Route path="conta/senha" element={<ChangePassword />} />
              {/* Somente administrador */}
              <Route path="admin/relatorios" element={<RequireAuth admin><Dashboard /></RequireAuth>} />
              <Route path="admin/mensagens" element={<RequireAuth admin><Templates /></RequireAuth>} />
              <Route path="admin/vitrine" element={<RequireAuth admin><ShowcaseAdmin /></RequireAuth>} />
              <Route path="admin/usuarios" element={<RequireAuth admin><Users /></RequireAuth>} />
            </Route>
            <Route
              path="*"
              element={
                <div className="p-10 text-center">
                  <p className="text-xl font-bold">Página não encontrada</p>
                  <Link to="/" className="underline">Voltar ao início</Link>
                </div>
              }
            />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
