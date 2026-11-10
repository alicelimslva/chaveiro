import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { OrderRow } from '../components/OrderRow';
import { Empty, ErrorBox, Loading, PageTitle } from '../components/ui';
import { ALL_STATUSES, LINE_KEYS, LINES, OPEN_STATUSES, STATUS_META } from '../lib/domain';
import { normalizePlate } from '../lib/format';
import { useAsync } from '../lib/useAsync';
import type { OrderStatus, ServiceLine } from '../types';

type Tab = 'abertas' | OrderStatus | 'todas';

export function Orders() {
  const [tab, setTab] = useState<Tab>('abertas');
  const [line, setLine] = useState<ServiceLine | ''>('');
  const [assignee, setAssignee] = useState('');
  const [q, setQ] = useState('');
  const { data, loading, error } = useAsync(async () => {
    const [orders, staff] = await Promise.all([api.listOrders(), api.listProfiles()]);
    return { orders, staff };
  });

  const list = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.orders
      .filter((o) => (tab === 'todas' ? true : tab === 'abertas' ? OPEN_STATUSES.includes(o.status) : o.status === tab))
      .filter((o) => !line || o.line === line)
      .filter((o) => !assignee || o.assignee_id === assignee)
      .filter(
        (o) =>
          !term ||
          String(o.number).includes(term) ||
          o.code.toLowerCase().includes(term) ||
          o.customer.name.toLowerCase().includes(term) ||
          o.description.toLowerCase().includes(term) ||
          (!!o.vehicle && normalizePlate(o.vehicle.plate).includes(normalizePlate(term))),
      )
      .sort((a, b) => (tab === 'abertas' ? a.due_at.localeCompare(b.due_at) : b.created_at.localeCompare(a.created_at)));
  }, [data, tab, line, assignee, q]);

  if (loading) return <Loading />;
  const count = (s: Tab) =>
    data!.orders.filter((o) => (s === 'todas' ? true : s === 'abertas' ? OPEN_STATUSES.includes(o.status) : o.status === s)).length;

  return (
    <div>
      <PageTitle actions={<Link to="/app/ordens/nova" className="btn-accent"><Plus size={20} /> Nova ordem</Link>}>Ordens de serviço</PageTitle>
      <ErrorBox error={error} />
      <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
        {(['abertas', ...ALL_STATUSES, 'todas'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-primary text-ink shadow-glow' : 'bg-card text-text-soft hover:bg-card-hover'}`}
          >
            {t === 'abertas' ? 'Abertas' : t === 'todas' ? 'Todas' : STATUS_META[t].label} <span className="opacity-60">{count(t)}</span>
          </button>
        ))}
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <input className="input" placeholder="Nº, código, cliente, placa…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filtrar ordens" />
        <select className="input" value={line} onChange={(e) => setLine(e.target.value as ServiceLine | '')} aria-label="Frente">
          <option value="">Todas as frentes</option>
          {LINE_KEYS.map((l) => <option key={l} value={l}>{LINES[l].label}</option>)}
        </select>
        <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Responsável">
          <option value="">Todos os responsáveis</option>
          {data!.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {list.length === 0 ? <Empty>Nenhuma ordem encontrada.</Empty> : <div className="space-y-2">{list.map((o) => <OrderRow key={o.id} o={o} />)}</div>}
    </div>
  );
}
