import { ChevronRight, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAction } from '../components/Toast';
import { Empty, Loading, PageTitle } from '../components/ui';
import { formatPhone, onlyDigits } from '../lib/format';
import { useAsync } from '../lib/useAsync';

export function Customers() {
  const { data, loading } = useAsync(() => api.listCustomers());
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const run = useAction();
  const nav = useNavigate();

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const d = onlyDigits(t);
    return (data ?? []).filter((c) => !t || c.name.toLowerCase().includes(t) || (d.length > 2 && onlyDigits(c.phone).includes(d)));
  }, [data, q]);

  if (loading) return <Loading />;
  return (
    <div>
      <PageTitle actions={<button className="btn-accent" onClick={() => setCreating(true)}><UserPlus size={20} /> Novo cliente</button>}>Clientes</PageTitle>
      {creating && (
        <form
          className="card mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            const c = await run(() => api.saveCustomer(form), 'Cliente cadastrado');
            if (c) nav(`/app/clientes/${c.id}`);
          }}
        >
          <input className="input" autoFocus placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" inputMode="tel" placeholder="WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <button className="btn-primary">Salvar</button>
        </form>
      )}
      <input className="input mb-4" placeholder="Filtrar por nome ou telefone (placa: use a busca no topo)" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length === 0 ? (
        <Empty>Nenhum cliente.</Empty>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {list.map((c) => (
            <Link key={c.id} to={`/app/clientes/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-card-hover">
              <span>
                <span className="block font-bold">{c.name}</span>
                <span className="text-sm text-text-soft">{formatPhone(c.phone)}</span>
              </span>
              <ChevronRight className="text-text-faint" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
