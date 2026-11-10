import { ChevronRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { balanceOf, urgencyOf } from '../lib/domain';
import { brl, relativeDue } from '../lib/format';
import type { OrderFull } from '../types';
import { LineIcon, StatusBadge } from './ui';

const URGENCY_STYLE = {
  atrasada: 'border-l-state-late',
  hoje: 'border-l-state-today',
  amanha: 'border-l-state-tomorrow',
  proximas: 'border-l-text-faint',
  pronta: 'border-l-state-ready',
  fechada: 'border-l-border',
} as const;

const DUE_STYLE = {
  atrasada: 'text-red-400 font-bold',
  hoje: 'text-blue-400 font-bold',
  amanha: 'text-purple-400 font-semibold',
  proximas: 'text-text-soft',
  pronta: 'text-green-400 font-semibold',
  fechada: 'text-text-soft',
} as const;

export function OrderRow({ o, now = new Date() }: { o: OrderFull; now?: Date }) {
  const u = urgencyOf(o, now);
  const saldo = balanceOf(o);
  return (
    <Link
      to={`/app/ordens/${o.id}`}
      className={`flex items-center gap-3 rounded-card border border-l-4 border-border bg-card p-3 shadow-card transition duration-150 ease-out hover:-translate-y-0.5 hover:bg-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-4 sm:p-4 ${URGENCY_STYLE[u]}`}
    >
      <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-field text-primary sm:flex">
        <LineIcon line={o.line} size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-sm font-bold text-text-soft">#{o.number}</span>
          <span className="truncate text-base font-bold text-text-strong sm:text-lg">{o.customer.name}</span>
          <StatusBadge status={o.status} />
        </div>
        <p className="truncate text-sm text-text-soft sm:text-base">{o.description || '—'}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className={DUE_STYLE[u]}>{u === 'fechada' ? 'Encerrada' : u === 'pronta' ? 'Pronta para retirar' : relativeDue(o.due_at, now)}</span>
          <span className="inline-flex items-center gap-1 text-text-soft">
            <User size={14} /> {o.assignee?.name ?? 'sem responsável'}
          </span>
          {saldo > 0 && o.status !== 'cancelado' && <span className="font-semibold text-text-soft">Saldo {brl(saldo)}</span>}
        </div>
      </div>
      <ChevronRight className="shrink-0 text-text-faint" />
    </Link>
  );
}
