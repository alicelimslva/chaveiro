import { useState } from 'react';
import { api } from '../../api';
import { ErrorBox, LineIcon, Loading, PageTitle } from '../../components/ui';
import { isOnTime, LINE_KEYS, LINES, OPEN_STATUSES, PAYMENT_METHODS, urgencyOf } from '../../lib/domain';
import { brl } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { PaymentMethod } from '../../types';

const PERIODS = [7, 30, 90] as const;

export function Dashboard() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const { data, loading, error } = useAsync(async () => {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const [orders, payments, open] = await Promise.all([api.listOrders({ since }), api.listPaymentsSince(since), api.listOrders({ statuses: OPEN_STATUSES })]);
    return { orders, payments, open };
  }, [days]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { orders, payments, open } = data!;

  const valid = orders.filter((o) => o.status !== 'cancelado');
  const judged = valid.map(isOnTime).filter((x): x is boolean => x !== null);
  const onTimePct = judged.length ? Math.round((judged.filter(Boolean).length / judged.length) * 100) : null;
  const revenue = payments.reduce((s, p) => s + p.amount, 0);
  const ticket = valid.length ? valid.reduce((s, o) => s + o.price, 0) / valid.length : 0;
  const lateNow = open.filter((o) => urgencyOf(o) === 'atrasada').length;
  const noAssignee = open.filter((o) => !o.assignee_id).length;

  const byLine = LINE_KEYS.map((l) => ({
    line: l,
    revenue: payments.filter((p) => p.line === l).reduce((s, p) => s + p.amount, 0),
    count: valid.filter((o) => o.line === l).length,
  })).sort((a, b) => b.revenue - a.revenue);
  const maxLine = Math.max(1, ...byLine.map((x) => x.revenue));

  const byMethod = (Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => ({ m, v: payments.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0) }));

  const people = new Map<string, { name: string; total: number; judged: number; ok: number }>();
  for (const o of valid) {
    const k = o.assignee_id;
    const p = people.get(k) ?? { name: o.assignee?.name ?? '—', total: 0, judged: 0, ok: 0 };
    p.total++;
    const t = isOnTime(o);
    if (t !== null) {
      p.judged++;
      if (t) p.ok++;
    }
    people.set(k, p);
  }

  return (
    <div className="space-y-5">
      <PageTitle
        actions={
          <div className="flex gap-1 rounded-xl bg-field p-1 text-sm font-semibold">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setDays(p)} className={`rounded-lg px-4 py-2 ${days === p ? 'bg-card shadow' : 'text-text-soft'}`}>{p} dias</button>
            ))}
          </div>
        }
      >
        Relatórios
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Entregues no prazo" value={onTimePct === null ? '—' : `${onTimePct}%`} hint={`meta: acima de 90% · ${judged.length} concluídas`} tone={onTimePct === null ? '' : onTimePct >= 90 ? 'text-green-400' : 'text-red-400'} />
        <Kpi label="Faturamento recebido" value={brl(revenue)} hint={`${payments.length} pagamentos`} />
        <Kpi label="Ordens abertas no período" value={String(valid.length)} hint={`ticket médio ${brl(ticket)}`} />
        <Kpi label="Atrasadas agora" value={String(lateNow)} hint={noAssignee ? `${noAssignee} sem responsável!` : 'todas com responsável'} tone={lateNow ? 'text-red-400' : 'text-green-400'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h2 className="section-title">Faturamento por frente</h2>
          <ul className="space-y-3">
            {byLine.map((x) => (
              <li key={x.line}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-semibold"><LineIcon line={x.line} size={16} /> {LINES[x.line].label}</span>
                  <span className="font-bold">{brl(x.revenue)} <span className="font-normal text-text-soft">· {x.count} ordens</span></span>
                </div>
                <div className="h-3 rounded-full bg-field">
                  <div className="h-3 rounded-full bg-primary" style={{ width: `${(x.revenue / maxLine) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="section-title">Prazo por responsável</h2>
          <table className="w-full text-left">
            <thead className="text-sm text-text-soft">
              <tr><th className="pb-2">Responsável</th><th className="pb-2 text-right">Ordens</th><th className="pb-2 text-right">No prazo</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...people.values()].sort((a, b) => b.total - a.total).map((p) => {
                const pct = p.judged ? Math.round((p.ok / p.judged) * 100) : null;
                return (
                  <tr key={p.name}>
                    <td className="py-2 font-semibold">{p.name}</td>
                    <td className="py-2 text-right">{p.total}</td>
                    <td className={`py-2 text-right font-bold ${pct === null ? '' : pct >= 90 ? 'text-green-400' : 'text-red-400'}`}>{pct === null ? '—' : `${pct}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <h2 className="section-title mt-6">Recebido por forma de pagamento</h2>
          <div className="grid grid-cols-2 gap-2">
            {byMethod.map(({ m, v }) => (
              <div key={m} className="flex justify-between rounded-lg bg-field px-3 py-2 text-sm">
                <span>{PAYMENT_METHODS[m]}</span>
                <b>{brl(v)}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, tone = '' }: { label: string; value: string; hint: string; tone?: string }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold text-text-soft">{label}</p>
      <p className={`text-2xl font-extrabold sm:text-3xl ${tone}`}>{value}</p>
      <p className="text-xs text-text-soft">{hint}</p>
    </div>
  );
}
