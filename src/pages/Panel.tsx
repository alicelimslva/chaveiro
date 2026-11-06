import { AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { OrderRow } from '../components/OrderRow';
import { ErrorBox, Loading } from '../components/ui';
import { groupForPanel, OPEN_STATUSES } from '../lib/domain';
import { useAsync } from '../lib/useAsync';

export function Panel() {
  const { user } = useAuth();
  const [mine, setMine] = useState(false);
  const [now, setNow] = useState(new Date());
  const { data, loading, error, reload } = useAsync(() => api.listOrders({ statuses: OPEN_STATUSES }));

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

  const sections = [
    { key: 'atrasada', title: 'Atrasadas', icon: <AlertTriangle size={18} className="text-red-600" />, items: g.atrasada, empty: 'Nenhuma ordem atrasada. 👏' },
    { key: 'hoje', title: 'Vencem hoje', icon: <Clock size={18} className="text-amber-500" />, items: g.hoje, empty: 'Nada vencendo hoje.' },
    { key: 'amanha', title: 'Amanhã', icon: <CalendarDays size={18} className="text-sky-600" />, items: g.amanha, empty: 'Nada para amanhã.' },
    { key: 'pronta', title: 'Prontas para retirar', icon: <CheckCircle2 size={18} className="text-green-600" />, items: g.pronta, empty: 'Nenhuma aguardando retirada.' },
    { key: 'proximas', title: 'Próximos dias', icon: <CalendarClock size={18} className="text-slate-500" />, items: g.proximas, empty: 'Nada agendado.' },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Painel do dia</h1>
          <p className="text-slate-600">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 p-1 text-sm font-semibold">
          <button onClick={() => setMine(false)} className={`rounded-lg px-4 py-2 ${!mine ? 'bg-white shadow' : 'text-slate-600'}`}>Todas</button>
          <button onClick={() => setMine(true)} className={`rounded-lg px-4 py-2 ${mine ? 'bg-white shadow' : 'text-slate-600'}`}>Minhas</button>
        </div>
      </div>
      <ErrorBox error={error} />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Atrasadas" value={g.atrasada.length} tone="red" />
        <Stat label="Vencem hoje" value={g.hoje.length} tone="amber" />
        <Stat label="Amanhã" value={g.amanha.length} tone="sky" />
        <Stat label="Prontas" value={g.pronta.length} tone="green" />
      </div>

      <div className="space-y-7">
        {sections.map((s) => (
          <section key={s.key} aria-label={s.title}>
            <h2 className="section-title">
              {s.icon} {s.title} <span className="text-slate-400">({s.items.length})</span>
            </h2>
            {s.items.length === 0 ? (
              <p className="px-1 text-slate-400">{s.empty}</p>
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
          <Link to="/app/ordens/nova" className="btn-accent">Abrir a primeira ordem</Link>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'red' | 'amber' | 'sky' | 'green' }) {
  const tones = {
    red: value ? 'bg-red-600 text-white' : 'bg-white text-slate-900',
    amber: value ? 'bg-amber-400 text-slate-900' : 'bg-white text-slate-900',
    sky: 'bg-white text-slate-900',
    green: 'bg-white text-slate-900',
  };
  return (
    <div className={`rounded-2xl border border-slate-200 p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-3xl font-extrabold">{value}</p>
      <p className="text-sm font-semibold opacity-80">{label}</p>
    </div>
  );
}
