import { Car, DoorOpen, KeyRound, Radio, Stamp, type LucideProps } from 'lucide-react';
import { LINES, STATUS_META } from '../lib/domain';
import type { OrderStatus, ServiceLine } from '../types';

const LINE_ICONS: Record<ServiceLine, (p: LucideProps) => JSX.Element> = {
  copia: (p) => <KeyRound {...p} />,
  controle: (p) => <Radio {...p} />,
  automotiva: (p) => <Car {...p} />,
  abertura: (p) => <DoorOpen {...p} />,
  carimbo: (p) => <Stamp {...p} />,
};

export function LineIcon({ line, ...p }: { line: ServiceLine } & LucideProps) {
  return LINE_ICONS[line](p);
}

export function LineTag({ line }: { line: ServiceLine }) {
  return (
    <span className="chip bg-field text-text-soft">
      <LineIcon line={line} size={14} />
      {LINES[line].short}
    </span>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status];
  return <span className={`chip ${m.badge}`}>{m.label}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border-2 border-dashed border-border p-6 text-center text-text-soft">{children}</p>;
}

export function Loading() {
  return <p className="p-6 text-center text-text-soft">Carregando…</p>;
}

export function ErrorBox({ error }: { error: Error | null }) {
  if (!error) return null;
  return <p className="rounded-xl bg-state-late/10 p-4 font-semibold text-red-400">Erro: {error.message}</p>;
}

export function PageTitle({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{children}</h1>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
