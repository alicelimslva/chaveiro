import { Check, KeyRound, MessageCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Loading } from '../components/ui';
import { LINES, STATUS_META } from '../lib/domain';
import { brl, fmtDateTime } from '../lib/format';
import { waLink } from '../lib/messaging';
import { useAsync } from '../lib/useAsync';
import type { OrderStatus } from '../types';

const STEPS: { status: OrderStatus; label: string; hint: string }[] = [
  { status: 'recebido', label: 'Recebido', hint: 'Seu serviço foi registrado' },
  { status: 'em_andamento', label: 'Em andamento', hint: 'Estamos trabalhando nele' },
  { status: 'pronto', label: 'Pronto para retirar', hint: 'Pode passar na loja' },
  { status: 'entregue', label: 'Entregue', hint: 'Obrigado pela preferência!' },
];
const rank = (s: OrderStatus) => (s === 'aguardando_peca' ? 1 : STEPS.findIndex((x) => x.status === s));

/** Página pública de acompanhamento (sem login), estilo rastreio de pedido. */
export function Track() {
  const { code = '' } = useParams();
  const { data, loading, reload } = useAsync(async () => {
    const [order, store] = await Promise.all([api.getPublicOrder(code), api.getStore()]);
    return { order, store };
  }, [code]);

  useEffect(() => {
    const t = setInterval(() => void reload(), 60_000);
    return () => clearInterval(t);
  }, [reload]);

  useEffect(() => {
    document.title = 'Acompanhe seu serviço';
  }, []);

  if (loading && !data) return <Loading />;
  const o = data?.order;
  const store = data?.store;

  if (!o)
    return (
      <Shell storeName={store?.name}>
        <div className="card text-center">
          <p className="text-xl font-extrabold">Código não encontrado</p>
          <p className="mt-1 text-text-soft">Confira o código no seu comprovante.</p>
          <CodeForm />
        </div>
      </Shell>
    );

  const current = rank(o.status);
  const eventAt = (s: OrderStatus) => [...o.events].reverse().find((e) => e.to_status === s)?.created_at;
  const saldo = Math.max(0, o.price - o.paid);

  return (
    <Shell storeName={store?.name}>
      <div className="card">
        <p className="text-sm font-semibold text-text-soft">Olá, {o.customer_first_name}!</p>
        <h1 className="text-2xl font-extrabold">{LINES[o.line].label}</h1>
        <p className="text-text-soft">{o.description}</p>
        <p className="mt-1 font-mono text-sm text-text-soft">Ordem nº {o.number} · {o.code}</p>

        {o.status === 'cancelado' ? (
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-state-late/10 p-4 text-red-400">
            <XCircle /> <span className="font-bold">Esta ordem foi cancelada.</span>
          </div>
        ) : (
          <>
            <div className={`mt-5 rounded-xl p-4 ${o.status === 'pronto' ? 'bg-green-600 text-white' : 'bg-card text-text-strong border border-border'}`}>
              <p className="text-sm opacity-80">Situação atual</p>
              <p className="text-2xl font-extrabold">{STATUS_META[o.status].label}</p>
              {o.status !== 'entregue' && o.status !== 'pronto' && <p className="mt-1">Previsão: <b>{fmtDateTime(o.due_at)}</b></p>}
              {o.status === 'aguardando_peca' && <p className="mt-1 text-sm opacity-90">Estamos aguardando uma peça chegar. Avisaremos você.</p>}
            </div>

            <ol className="mt-6 space-y-0">
              {STEPS.map((s, i) => {
                const done = i <= current;
                const at = eventAt(s.status) ?? (i === 1 && o.status === 'aguardando_peca' ? eventAt('aguardando_peca') : undefined);
                return (
                  <li key={s.status} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < STEPS.length - 1 && <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-1 rounded ${i < current ? 'bg-green-600' : 'bg-field'}`} />}
                    <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? 'bg-green-600 text-white' : 'border-2 border-border bg-card'}`}>
                      {done && <Check size={18} strokeWidth={3} />}
                    </span>
                    <div>
                      <p className={`font-bold ${done ? 'text-text-strong' : 'text-text-faint'}`}>{s.label}</p>
                      <p className={`text-sm ${done ? 'text-text-soft' : 'text-text-faint'}`}>{at ? fmtDateTime(at) : s.hint}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {saldo > 0 && o.status !== 'cancelado' && (
          <p className="mt-5 rounded-xl bg-primary/10 p-3 text-amber-300">Saldo a pagar na retirada: <b>{brl(saldo)}</b></p>
        )}
      </div>

      {store && (
        <div className="card space-y-2">
          <p className="font-bold">{store.name}</p>
          <p className="text-text-soft">{store.mall_location}</p>
          <p className="text-text-soft">{store.hours}</p>
          <a className="btn-whatsapp w-full" href={waLink(store.whatsapp, `Olá! Tenho uma dúvida sobre a ordem nº ${o.number} (${o.code}).`)} target="_blank" rel="noreferrer">
            <MessageCircle size={20} /> Falar com a loja
          </a>
        </div>
      )}
    </Shell>
  );
}

function CodeForm() {
  const [v, setV] = useState('');
  const nav = useNavigate();
  return (
    <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (v.trim()) nav(`/acompanhar/${v.trim().toUpperCase()}`); }}>
      <input className="input uppercase" placeholder="Código" value={v} onChange={(e) => setV(e.target.value)} aria-label="Código" />
      <button className="btn-primary">Ver</button>
    </form>
  );
}

function Shell({ children, storeName }: { children: React.ReactNode; storeName?: string }) {
  return (
    <div className="min-h-screen bg-field">
      <header className="bg-sidebar px-4 py-4 text-white">
        <Link to="/" className="mx-auto flex max-w-lg items-center gap-2 font-extrabold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-ink"><KeyRound size={20} /></span>
          {storeName ?? 'Chaveiro'}
        </Link>
      </header>
      <main className="mx-auto max-w-lg space-y-4 p-4">{children}</main>
    </div>
  );
}
