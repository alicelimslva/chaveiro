import { BarChart3, ClipboardList, Globe, LayoutGrid, Lock, LogOut, Menu, MessageSquareText, Plus, ShieldCheck, User, UserCog, Users, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api, storage } from '../api';
import { resetDemo } from '../api/demo';
import { isAdmin, useAuth } from '../auth/AuthContext';
import { CustomerSearch } from './CustomerSearch';
import { NotificationBell } from './NotificationBell';

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean; admin?: boolean };

const ITEMS: Item[] = [
  { to: '/app', label: 'Painel', icon: LayoutGrid, end: true },
  { to: '/app/ordens', label: 'Ordens', icon: ClipboardList, end: true },
  { to: '/app/clientes', label: 'Clientes', icon: Users },
  { to: '/app/admin/relatorios', label: 'Relatórios', icon: BarChart3, admin: true },
  { to: '/app/admin/mensagens', label: 'Mensagens', icon: MessageSquareText, admin: true },
  { to: '/app/admin/vitrine', label: 'Vitrine', icon: Globe, admin: true },
  { to: '/app/admin/usuarios', label: 'Usuários', icon: UserCog, admin: true },
];

const sideLink = ({ isActive }: { isActive: boolean }) =>
  `group flex h-[52px] items-center justify-center gap-3.5 rounded-control px-4 text-base font-medium transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary xl:justify-start ${
    isActive ? 'bg-primary font-semibold text-ink shadow-glow' : 'text-text-soft hover:bg-card hover:text-text-strong'
  }`;

export function AppLayout() {
  const { user } = useAuth();
  const nav = useNavigate();
  const admin = isAdmin(user);
  const items = ITEMS.filter((i) => !i.admin || admin);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[80px_1fr] xl:grid-cols-[212px_1fr]">
      {/* Sidebar (≥768px). Entre 768 e 1279px fica só com ícones. */}
      <aside className="no-print sticky top-0 hidden h-screen flex-col overflow-y-auto border-r border-border/60 bg-sidebar px-3 pt-6 md:flex xl:px-4">
        <Logo />
        <nav className="mt-10 flex flex-col gap-1.5" aria-label="Menu principal">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={sideLink} title={label}>
              {({ isActive }) => (
                <>
                  <Icon size={24} strokeWidth={2} className="shrink-0" fill={isActive && Icon === LayoutGrid ? 'currentColor' : 'none'} />
                  <span className="sr-only xl:not-sr-only">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <SecurityCard />
      </aside>

      <div className="min-w-0">
        {api.mode === 'demo' && (
          <div className="no-print flex flex-wrap items-center justify-center gap-x-3 border-b border-primary/30 bg-primary/10 px-4 py-1.5 text-center text-sm font-semibold text-primary">
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

        <header className="no-print relative z-30 flex h-[72px] items-center gap-3 px-4 md:h-[84px] md:gap-5 md:px-8">
          <Link to="/app" className="shrink-0 md:hidden" aria-label="Painel">
            <LockMark size={36} />
          </Link>
          <div className="min-w-0 flex-1">
            <CustomerSearch />
          </div>
          <button
            onClick={() => nav('/app/ordens/nova')}
            className="btn-primary hidden h-[52px] shrink-0 px-6 md:inline-flex"
            title="Nova ordem (N)"
          >
            <Plus size={22} strokeWidth={2.5} /> Nova ordem
          </button>
          <NotificationBell />
          <AccountMenu items={items.filter((i) => i.admin)} />
        </header>

        <main className="px-4 pb-28 md:px-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior (<768px) */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 grid h-16 box-content grid-cols-4 border-t border-border bg-sidebar/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Menu"
      >
        {items.slice(0, 2).map(({ to, label, icon: Icon, end }) => (
          <BottomLink key={to} to={to} end={end} label={label} Icon={Icon} />
        ))}
        <Link to="/app/ordens/nova" className="flex flex-col items-center justify-center py-2" aria-label="Nova ordem">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-ink shadow-glow">
            <Plus size={24} strokeWidth={2.5} />
          </span>
        </Link>
        <BottomLink to={items[2].to} label={items[2].label} Icon={items[2].icon} />
      </nav>
    </div>
  );
}

function BottomLink({ to, end, label, Icon }: { to: string; end?: boolean; label: string; Icon: LucideIcon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${isActive ? 'text-primary' : 'text-text-soft'}`}
    >
      <Icon size={24} />
      {label}
    </NavLink>
  );
}

export function LockMark({ size = 44 }: { size?: number }) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center text-primary" style={{ width: size, height: size }}>
      <Lock size={size} strokeWidth={2} fill="currentColor" className="[&>path]:fill-none" aria-hidden />
      <span className="absolute h-[18%] w-[11%] rounded-full bg-ink" style={{ top: '62%' }} aria-hidden />
    </span>
  );
}

function Logo() {
  return (
    <Link to="/app" className="flex items-center justify-center gap-3 xl:justify-start" aria-label="Chaveiro — Painel">
      <LockMark />
      <span className="hidden leading-tight xl:block">
        <span className="block text-[22px] font-extrabold text-white">Chaveiro</span>
        <span className="block text-xs text-text-soft">Sempre com você</span>
      </span>
    </Link>
  );
}

function SecurityCard() {
  return (
    <div className="relative mt-auto hidden overflow-hidden rounded-t-[1.5rem] border border-b-0 border-border/60 bg-card px-5 pb-14 pt-6 text-center xl:block">
      <ShieldCheck size={48} strokeWidth={2} className="mx-auto text-primary" aria-hidden />
      <p className="mt-3 text-[15px] font-semibold leading-5 text-white">
        Segurança
        <br />e praticidade
        <br />
        <span className="font-normal text-primary">em um só lugar.</span>
      </p>
      <svg aria-hidden viewBox="0 0 200 60" preserveAspectRatio="none" className="glow-curve absolute -left-6 bottom-0 h-14 w-[120%] text-primary">
        <path d="M0 52 C 50 20, 110 62, 200 18 L 200 30 C 120 70, 55 34, 0 62 Z" fill="currentColor" opacity="0.9" />
      </svg>
    </div>
  );
}

function AccountMenu({ items }: { items: Item[] }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  const menuLink = 'flex items-center gap-3 px-4 py-3 text-text-soft hover:bg-card-hover hover:text-text-strong';

  return (
    <div className="relative shrink-0" ref={box}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-text-faint transition hover:text-text-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Conta"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <User size={22} className="hidden md:block" />
        <Menu size={22} className="md:hidden" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-card border border-border bg-card shadow-card">
          <div className="border-b border-border px-4 py-3">
            <p className="font-semibold text-text-strong">{user?.name}</p>
            <p className="text-sm text-text-soft">{user?.role === 'admin' ? 'Administrador' : 'Atendente'}</p>
          </div>
          {/* No celular a sidebar some: os itens de administração ficam aqui. */}
          {items.length > 0 && (
            <div className="border-b border-border py-1 md:hidden">
              {items.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className={menuLink} onClick={() => setOpen(false)} role="menuitem">
                  <Icon size={20} /> {label}
                </Link>
              ))}
            </div>
          )}
          <button
            role="menuitem"
            className={`${menuLink} w-full text-left`}
            onClick={async () => {
              await signOut();
              nav('/app/login');
            }}
          >
            <LogOut size={20} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
