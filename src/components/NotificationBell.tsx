import { Bell, BellRing } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { OPEN_STATUSES, urgencyOf } from '../lib/domain';
import { relativeDue } from '../lib/format';
import type { OrderFull } from '../types';

const NOTIFIED_KEY = 'chaveiro-notified-overdue';

/** Central de avisos: ordens atrasadas e vencendo hoje. Opcionalmente avisa pelo sistema (Notification API). */
export function NotificationBell() {
  const [items, setItems] = useState<{ o: OrderFull; kind: 'atrasada' | 'hoje' }[]>([]);
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const orders = await api.listOrders({ statuses: OPEN_STATUSES }).catch(() => []);
      if (!alive) return;
      const now = new Date();
      const list = orders
        .map((o) => ({ o, kind: urgencyOf(o, now) }))
        .filter((x): x is { o: OrderFull; kind: 'atrasada' | 'hoje' } => x.kind === 'atrasada' || x.kind === 'hoje')
        .sort((a, b) => a.o.due_at.localeCompare(b.o.due_at));
      setItems(list);

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        let seen: string[] = [];
        try {
          seen = JSON.parse(sessionStorage.getItem(NOTIFIED_KEY) || '[]');
        } catch {
          /* ignora */
        }
        const fresh = list.filter((x) => x.kind === 'atrasada' && !seen.includes(x.o.id));
        for (const x of fresh) new Notification(`Ordem #${x.o.number} atrasada`, { body: `${x.o.customer.name} — ${x.o.description}`, tag: x.o.id });
        sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify([...seen, ...fresh.map((x) => x.o.id)]));
      }
    };
    void tick();
    const t = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const late = items.filter((i) => i.kind === 'atrasada').length;

  return (
    <div className="relative" ref={box}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-12 w-12 items-center justify-center rounded-xl text-white hover:bg-slate-800"
        aria-label={`Avisos: ${items.length}`}
      >
        {items.length ? <BellRing /> : <Bell />}
        {items.length > 0 && (
          <span className={`absolute right-1 top-1 min-w-[20px] rounded-full px-1 text-xs font-bold ${late ? 'bg-red-600 text-white' : 'bg-amber-400 text-slate-900'}`}>
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <div className="border-b border-slate-100 px-4 py-3 font-bold">Avisos</div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && <p className="px-4 py-6 text-center text-slate-500">Nada atrasado nem vencendo hoje. 👍</p>}
            {items.map(({ o, kind }) => (
              <Link key={o.id} to={`/app/ordens/${o.id}`} onClick={() => setOpen(false)} className="block border-b border-slate-50 px-4 py-3 hover:bg-slate-50">
                <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${kind === 'atrasada' ? 'bg-red-600' : 'bg-amber-400'}`} />
                <span className="font-semibold">#{o.number} {o.customer.name}</span>
                <span className={`block pl-5 text-sm ${kind === 'atrasada' ? 'text-red-700' : 'text-amber-700'}`}>{relativeDue(o.due_at)}</span>
              </Link>
            ))}
          </div>
          {perm === 'default' && (
            <button
              className="w-full bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              onClick={async () => setPerm(await Notification.requestPermission())}
            >
              Ativar alertas no computador
            </button>
          )}
        </div>
      )}
    </div>
  );
}
