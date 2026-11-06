import { ChevronRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { balanceOf, urgencyOf } from '../lib/domain';
import { brl, relativeDue } from '../lib/format';
import type { OrderFull } from '../types';
import { LineIcon, StatusBadge } from './ui';

const URGENCY_STYLE = {
  atrasada: 'border-l-red-600 bg-red-50',
  hoje: 'border-l-amber-400 bg-amber-50',
  amanha: 'border-l-sky-400 bg-white',
  proximas: 'border-l-slate-300 bg-white',
  pronta: 'border-l-green-600 bg-white',
  fechada: 'border-l-slate-200 bg-white',
} as const;

const DUE_STYLE = {
  atrasada: 'text-red-700 font-bold',
  hoje: 'text-amber-700 font-bold',
  amanha: 'text-sky-700 font-semibold',
  proximas: 'text-slate-600',
  pronta: 'text-green-700 font-semibold',
  fechada: 'text-slate-500',
} as const;

export function OrderRow({ o, now = new Date() }: { o: OrderFull; now?: Date }) {
  const u = urgencyOf(o, now);
  const saldo = balanceOf(o);
  return (
    <Link
      to={`/app/ordens/${o.id}`}
      className={`flex items-center gap-3 rounded-xl border border-l-[6px] border-slate-200 p-3 transition hover:shadow-md sm:gap-4 sm:p-4 ${URGENCY_STYLE[u]}`}
    >
      <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-brand-400 sm:flex">
        <LineIcon line={o.line} size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-sm font-bold text-slate-500">#{o.number}</span>
          <span className="truncate text-base font-bold text-slate-900 sm:text-lg">{o.customer.name}</span>
          <StatusBadge status={o.status} />
        </div>
        <p className="truncate text-sm text-slate-700 sm:text-base">{o.description || '—'}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className={DUE_STYLE[u]}>{u === 'fechada' ? 'Encerrada' : u === 'pronta' ? 'Pronta para retirar' : relativeDue(o.due_at, now)}</span>
          <span className="inline-flex items-center gap-1 text-slate-600">
            <User size={14} /> {o.assignee?.name ?? 'sem responsável'}
          </span>
          {saldo > 0 && o.status !== 'cancelado' && <span className="font-semibold text-slate-700">Saldo {brl(saldo)}</span>}
        </div>
      </div>
      <ChevronRight className="shrink-0 text-slate-400" />
    </Link>
  );
}
