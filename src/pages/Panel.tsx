import { CalendarClock, CalendarDays, ChevronRight, CircleCheck, Clock, Handshake, KeyRound, ShieldCheck, ShoppingCart, Zap, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { BrandGradient } from '../components/brand-gradient';
import { OrderRow } from '../components/OrderRow';
import { ErrorBox, Loading } from '../components/ui';
import { imagemServico, SERVICOS, type Servico } from '../data/servicos';
import { groupForPanel, OPEN_STATUSES } from '../lib/domain';
import { brl } from '../lib/format';
import { waLink } from '../lib/messaging';
import { useAsync } from '../lib/useAsync';

const HERO_IMG = imagemServico('hero-chaves.webp');

export function Panel() {
  const { user } = useAuth();
  const [mine, setMine] = useState(false);
  const [now, setNow] = useState(new Date());
  const { data, loading, error, reload } = useAsync(() => api.listOrders({ statuses: OPEN_STATUSES }));
  const { data: store } = useAsync(() => api.getStore().catch(() => null));

  // Atualiza o painel a cada minuto (atrasos mudam com o tempo).
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      void reload();
    }, 60_000);
    return () => clearInterval(t);
  }, [reload]);

  if (loading && !data) return <Loading />;
  const orders = (data ?? []).filter((o) => !mine || o.assignee_id === user?.id);
  const g = groupForPanel(orders, now);
  const firstName = user?.name?.trim().split(/\s+/)[0];

  const sections = [
    { key: 'atrasada', title: 'Atrasadas', icon: <KeyRound size={20} className="text-primary" />, bar: 'bg-state-late', items: g.atrasada, empty: 'Nenhuma ordem atrasada. 👏' },
    { key: 'hoje', title: 'Vencem hoje', icon: <Clock size={20} className="text-state-today" />, bar: 'bg-state-today', items: g.hoje, empty: 'Nada vencendo hoje.' },
    { key: 'amanha', title: 'Amanhã', icon: <CalendarDays size={20} className="text-state-tomorrow" />, bar: 'bg-state-tomorrow', items: g.amanha, empty: 'Nada para amanhã.' },
    { key: 'pronta', title: 'Prontas para retirar', icon: <CircleCheck size={20} className="text-state-ready" />, bar: 'bg-state-ready', items: g.pronta, empty: 'Nenhuma aguardando retirada.' },
    { key: 'proximas', title: 'Próximos dias', icon: <CalendarClock size={20} className="text-text-soft" />, bar: 'bg-text-faint', items: g.proximas, empty: 'Nada agendado.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate -mx-4 h-[240px] overflow-hidden px-4 pt-4 md:-mx-8 md:h-[280px] md:px-8 md:pt-6">
        <BrandGradient fade="hero" />
        <HeroArt />
        <div className="relative z-10 max-w-[480px]">
          <h1 className="eyebrow">Painel do dia</h1>
          <p className="mt-3 text-[32px] font-extrabold leading-[40px] text-text-strong md:text-[44px] md:leading-[52px]">
            Olá, <em className="text-primary">{firstName ? `${firstName}!` : 'seja bem-vindo!'}</em>
          </p>
          <p className="mt-3 text-base leading-7 text-text-soft md:text-xl md:leading-[30px]">
            Gerencie suas ordens e atenda com agilidade.{' '}
            {capitalize(now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }))}.
          </p>
          <Link
            to="/app/ordens/nova"
            className="btn-primary mt-6 hidden h-[52px] rounded-full px-7 text-lg hover:shadow-glow-lg md:inline-flex"
          >
            Nova ordem <ChevronRight size={22} />
          </Link>
        </div>
      </section>

      <ErrorBox error={error} />

      {/* Métricas (sobrepõem a base do hero) */}
      <div className="relative z-10 -mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        <Metric href="#sec-atrasada" label="Atrasadas" value={g.atrasada.length} bar="bg-state-late" Icon={KeyRound} iconCls="text-primary" filled />
        <Metric href="#sec-hoje" label="Vencem hoje" value={g.hoje.length} bar="bg-state-today" Icon={Clock} iconCls="text-state-today" />
        <Metric href="#sec-amanha" label="Amanhã" value={g.amanha.length} bar="bg-state-tomorrow" Icon={CalendarDays} iconCls="text-state-tomorrow" />
        <Metric href="#sec-pronta" label="Prontas" value={g.pronta.length} bar="bg-state-ready" Icon={CircleCheck} iconCls="text-state-ready" />
      </div>

      {/* Serviços */}
      <section className="mt-10" aria-labelledby="servicos-title">
        <SectionTitle id="servicos-title" title="Nossos Serviços">
          <Link to="/" className="btn h-11 rounded-full border border-border bg-field px-5 py-0 text-base font-medium text-text-strong hover:bg-card-hover">
            <span className="hidden sm:inline">Ver todos os serviços</span>
            <span className="sm:hidden">Ver todos</span>
            <ChevronRight size={18} />
          </Link>
        </SectionTitle>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {SERVICOS.map((s) => (
            <ServiceCard key={s.slug} s={s} />
          ))}
        </div>
      </section>

      {/* Ordens do dia */}
      <section className="mt-12" aria-labelledby="ordens-title">
        <SectionTitle id="ordens-title" title="Ordens do dia">
          <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-field p-1 text-sm font-semibold">
            <button onClick={() => setMine(false)} className={`rounded-full px-4 py-2 transition ${!mine ? 'bg-primary text-ink' : 'text-text-soft hover:text-text-strong'}`}>Todas</button>
            <button onClick={() => setMine(true)} className={`rounded-full px-4 py-2 transition ${mine ? 'bg-primary text-ink' : 'text-text-soft hover:text-text-strong'}`}>Minhas</button>
          </div>
        </SectionTitle>
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.key} id={`sec-${s.key}`} aria-label={s.title} className="scroll-mt-6">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-text-strong">
                {s.icon} {s.title} <span className="font-medium text-text-faint">({s.items.length})</span>
              </h2>
              {s.items.length === 0 ? (
                <p className="px-1 text-text-soft">{s.empty}</p>
              ) : (
                <div className="space-y-2">
                  {s.items.map((o) => (
                    <OrderRow key={o.id} o={o} now={now} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
        {orders.length === 0 && (
          <div className="mt-6 text-center">
            <Link to="/app/ordens/nova" className="btn-primary rounded-full">Abrir a primeira ordem</Link>
          </div>
        )}
      </section>

      {/* Rodapé de benefícios */}
      <footer className="mt-12 flex flex-col gap-6 border-t border-border pt-8 lg:flex-row lg:items-center lg:gap-8">
        <Benefit Icon={ShieldCheck} l1="Qualidade garantida" l2="em todos os serviços" />
        <span className="hidden h-14 w-px bg-border lg:block" />
        <Benefit Icon={Zap} l1="Atendimento rápido" l2="e eficiente" filled />
        <span className="hidden h-14 w-px bg-border lg:block" />
        <Benefit Icon={Handshake} l1="10+ anos" l2="de experiência" />
        {store?.whatsapp && (
          <a
            href={waLink(store.whatsapp)}
            target="_blank"
            rel="noreferrer"
            aria-label="Fale conosco no WhatsApp"
            className="btn-primary fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full p-0 hover:shadow-glow-lg md:static md:ml-auto md:h-[52px] md:w-auto md:px-7 md:text-lg"
          >
            <WhatsAppIcon />
            <span className="hidden md:inline">Fale conosco no WhatsApp</span>
            <ChevronRight size={22} className="hidden md:block" />
          </a>
        )}
      </footer>
    </div>
  );
}

function SectionTitle({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <span className="h-8 w-1.5 rounded-full bg-primary" aria-hidden />
        <h2 id={id} className="text-[22px] font-bold leading-8 text-text-strong md:text-[26px]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Metric({ href, label, value, bar, Icon, iconCls, filled }: { href: string; label: string; value: number; bar: string; Icon: LucideIcon; iconCls: string; filled?: boolean }) {
  return (
    <a
      href={href}
      className="relative flex h-[80px] items-center gap-3 overflow-hidden rounded-card border border-border bg-card pl-5 pr-3 shadow-card transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-[92px] md:gap-5 md:pl-7 md:pr-5"
    >
      <span className={`absolute bottom-3 left-0 top-3 w-1 rounded-full ${bar}`} aria-hidden />
      <Icon strokeWidth={2} className={`h-8 w-8 shrink-0 md:h-10 md:w-10 ${iconCls}`} fill={filled ? 'currentColor' : 'none'} fillOpacity={filled ? 0.25 : undefined} aria-hidden />
      <span className="min-w-0">
        <span className="block text-[26px] font-extrabold leading-8 tabular-nums text-text-strong md:text-[34px] md:leading-10">{value}</span>
        <span className="block truncate text-sm text-text-soft md:text-lg md:leading-6">{label}</span>
      </span>
    </a>
  );
}

function ServiceCard({ s }: { s: Servico }) {
  const img = imagemServico(s.imagem);
  const Icon = s.icone;
  return (
    <article className="group flex min-h-[150px] items-stretch gap-4 rounded-card border border-border bg-card p-2.5 pr-4 shadow-card transition duration-150 ease-out hover:-translate-y-0.5 hover:border-border/80 hover:bg-card-hover md:gap-5">
      <div className="w-[112px] shrink-0 overflow-hidden rounded-[0.875rem] bg-field md:w-[132px]">
        {img ? (
          <img src={img} alt={s.alt} loading="lazy" className="aspect-square h-full w-full object-cover transition duration-150 ease-out group-hover:scale-[1.03]" />
        ) : (
          <div className="flex aspect-square h-full w-full items-center justify-center" aria-hidden>
            <Icon size={48} strokeWidth={2} className="text-text-faint" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-3">
        <h3 className="line-clamp-2 text-lg font-bold leading-6 text-text-strong md:text-xl">{s.titulo}</h3>
        <p className="mt-1.5 line-clamp-2 text-[15px] leading-5 text-text-soft">{s.descricao}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <p className="text-[15px] font-semibold leading-5 text-text-strong">
            <span className="block text-xs font-normal text-text-soft">A partir de</span>
            <span className="tabular-nums">{brl(s.aPartirDe)}</span>
          </p>
          <Link
            to="/app/ordens/nova"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-ink shadow-glow transition duration-150 hover:bg-[hsl(var(--primary-hover))] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            aria-label={`Solicitar ${s.titulo}`}
          >
            <ShoppingCart size={16} /> Solicitar
          </Link>
        </div>
      </div>
    </article>
  );
}

function Benefit({ Icon, l1, l2, filled }: { Icon: LucideIcon; l1: string; l2: string; filled?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <Icon size={40} strokeWidth={2} className="shrink-0 text-primary" fill={filled ? 'currentColor' : 'none'} aria-hidden />
      <p className="text-base leading-[22px] text-text-soft">
        {l1}
        <br />
        {l2}
      </p>
    </div>
  );
}

/** Foto das chaves (se existir em src/assets/servicos/hero-chaves.webp) + curva amarela. */
function HeroArt() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {HERO_IMG ? (
        <img
          src={HERO_IMG}
          alt=""
          className="absolute inset-y-0 right-0 hidden h-full w-[62%] object-cover md:block"
          style={{ maskImage: 'linear-gradient(to right, transparent, black 30%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)' }}
        />
      ) : (
        <div
          className="absolute inset-y-0 right-0 hidden w-[55%] items-center justify-center md:flex"
          style={{ maskImage: 'linear-gradient(to right, transparent, black 40%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%)' }}
        >
          <KeyRound className="h-[220px] w-[220px] -rotate-12 text-field" strokeWidth={1.25} />
        </div>
      )}
      <svg viewBox="0 0 600 280" preserveAspectRatio="none" className="glow-curve absolute bottom-0 right-0 h-[40%] w-[30%] text-primary opacity-90 md:h-full md:w-[55%]">
        <path d="M600 0 L600 22 C 470 40, 380 120, 330 280 L 296 280 C 350 110, 450 18, 600 0 Z" fill="currentColor" />
      </svg>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.86 9.86 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.24 8.24 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
