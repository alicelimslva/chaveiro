import { BarChart3, ClipboardList, Globe, KeyRound, LayoutDashboard, LogOut, MessageSquareText, Plus, Users, UserCog } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api, storage } from '../api';
import { resetDemo } from '../api/demo';
import { isAdmin, useAuth } from '../auth/AuthContext';
import { CustomerSearch } from './CustomerSearch';
import { NotificationBell } from './NotificationBell';

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'}`;

export function AppLayout() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const admin = isAdmin(user);

  return (
    <div className="min-h-screen">
      {api.mode === 'demo' && (
        <div className="no-print flex flex-wrap items-center justify-center gap-x-3 bg-brand-400 px-4 py-1.5 text-center text-sm font-semibold text-slate-900">
          Modo demonstração — os dados ficam só neste navegador.
          <button
            className="underline"
            onClick={() => {
              if (confirm('Apagar os dados de demonstração e começar de novo?')) {
                resetDemo(storage);
                location.href = '/app/login';
              }
            }}
          >
            Reiniciar demo
          </button>
        </div>
      )}
      <header className="no-print sticky top-0 z-30 bg-slate-900 text-white shadow">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-4">
          <NavLink to="/app" className="flex shrink-0 items-center gap-2 font-extrabold">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-400 text-slate-900">
              <KeyRound size={22} />
            </span>
            <span className="hidden text-lg lg:inline">Chaveiro</span>
          </NavLink>
          <div className="min-w-0 flex-1 text-slate-900">
            <CustomerSearch />
          </div>
          <button onClick={() => nav('/app/ordens/nova')} className="btn-accent shrink-0 px-3 sm:px-4" title="Nova ordem (N)">
            <Plus size={22} /> <span className="hidden sm:inline">Nova ordem</span>
          </button>
          <NotificationBell />
        </div>
      </header>
      <nav className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-3 py-2 sm:px-4">
          <NavLink end to="/app" className={linkCls}>
            <LayoutDashboard size={18} /> Painel do dia
          </NavLink>
          <NavLink to="/app/ordens" end className={linkCls}>
            <ClipboardList size={18} /> Ordens
          </NavLink>
          <NavLink to="/app/clientes" className={linkCls}>
            <Users size={18} /> Clientes
          </NavLink>
          {admin && (
            <>
              <span className="mx-1 h-6 w-px bg-slate-200" />
              <NavLink to="/app/admin/relatorios" className={linkCls}>
                <BarChart3 size={18} /> Relatórios
              </NavLink>
              <NavLink to="/app/admin/mensagens" className={linkCls}>
                <MessageSquareText size={18} /> Mensagens
              </NavLink>
              <NavLink to="/app/admin/vitrine" className={linkCls}>
                <Globe size={18} /> Vitrine
              </NavLink>
              <NavLink to="/app/admin/usuarios" className={linkCls}>
                <UserCog size={18} /> Usuários
              </NavLink>
            </>
          )}
          <div className="ml-auto flex items-center gap-2 pl-3">
            <span className="hidden whitespace-nowrap text-sm text-slate-600 md:inline">
              {user?.name} · <b>{user?.role === 'admin' ? 'Administrador' : 'Atendente'}</b>
            </span>
            <button
              onClick={async () => {
                await signOut();
                nav('/app/login');
              }}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}
