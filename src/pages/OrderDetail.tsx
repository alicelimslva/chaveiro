import { ArrowRight, Car, Copy, ExternalLink, MessageCircle, Pencil, Printer } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAction, useToast } from '../components/Toast';
import { ErrorBox, LineTag, Loading, StatusBadge } from '../components/ui';
import { vehicleLabel } from '../components/VehicleForm';
import { balanceOf, LINE_KEYS, LINES, nextStatuses, orderMessageVars, PAYMENT_METHODS, renderTemplate, STATUS_META, trackingUrl, urgencyOf } from '../lib/domain';
import { brl, fmtDateTime, formatPhone, fromLocalInput, parseMoney, relativeDue, toLocalInput } from '../lib/format';
import { messageChannel } from '../lib/messaging';
import { useAsync } from '../lib/useAsync';
import type { OrderStatus, PaymentKind, PaymentMethod, ServiceLine } from '../types';

const STATUS_BTN: Partial<Record<OrderStatus, string>> = {
  em_andamento: 'btn bg-blue-600 text-white hover:bg-blue-700',
  aguardando_peca: 'btn bg-purple-600 text-white hover:bg-purple-700',
  pronto: 'btn bg-green-600 text-white hover:bg-green-700',
  entregue: 'btn-primary',
  cancelado: 'btn-secondary text-red-400',
  recebido: 'btn-secondary',
};

export function OrderDetail() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const run = useAction();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [order, events, payments, templates, store, staff] = await Promise.all([
      api.getOrder(id),
      api.listEvents(id),
      api.listPayments(id),
      api.listTemplates(),
      api.getStore(),
      api.listProfiles(),
    ]);
    return { order, events, payments, templates, store, staff };
  }, [id]);

  const [notify, setNotify] = useState<{ key: string; text: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [pay, setPay] = useState({ amount: '', method: 'pix' as PaymentMethod });

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { order: o, events, payments, templates, store, staff } = data!;
  if (!o) return <p className="card">Ordem não encontrada.</p>;

  const link = trackingUrl(o.code);
  const saldo = balanceOf(o);
  const u = urgencyOf(o);
  const isNew = params.get('nova') === '1';

  const openNotify = (key: string) => {
    const t = templates.find((x) => x.key === key) ?? templates.find((x) => x.key === o.status);
    if (!t) return toast('Nenhum modelo de mensagem cadastrado.', 'erro');
    setNotify({ key: t.key, text: renderTemplate(t.body, orderMessageVars(o, store, link)) });
  };

  const changeStatus = async (to: OrderStatus) => {
    if (to === 'cancelado' && !confirm('Cancelar esta ordem?')) return;
    if (to === 'entregue' && saldo > 0 && !confirm(`Ainda há saldo de ${brl(saldo)}. Entregar mesmo assim?`)) return;
    const ok = await run(() => api.changeStatus(o.id, to, statusNote), `Status: ${STATUS_META[to].label}`);
    if (ok !== undefined) {
      setStatusNote('');
      await reload();
      if (['pronto', 'aguardando_peca', 'entregue', 'cancelado'].includes(to)) openNotify(to);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <button onClick={() => nav(-1)} className="no-print text-sm font-semibold text-text-soft hover:underline">← Voltar</button>

      {isNew && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-state-ready/30 bg-state-ready/10">
          <p className="font-semibold text-green-400">Ordem #{o.number} aberta. Envie o link de acompanhamento ao cliente:</p>
          <div className="flex gap-2">
            <button className="btn-whatsapp" onClick={() => openNotify('recebido')}><MessageCircle size={20} /> Avisar cliente</button>
            <button className="btn-secondary" onClick={() => setParams({})}>Depois</button>
          </div>
        </div>
      )}

      <div className={`card border-l-[6px] ${u === 'atrasada' ? 'border-l-red-600' : u === 'hoje' ? 'border-l-amber-400' : u === 'pronta' ? 'border-l-green-600' : 'border-l-slate-300'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm font-bold text-text-soft">Ordem #{o.number} · código {o.code}</p>
            <h1 className="text-2xl font-extrabold">
              <Link to={`/app/clientes/${o.customer.id}`} className="hover:underline">{o.customer.name}</Link>
            </h1>
            <p className="text-text-soft">{formatPhone(o.customer.phone)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={o.status} />
              <LineTag line={o.line} />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-text-soft">Prazo prometido</p>
            <p className="text-lg font-bold">{fmtDateTime(o.due_at)}</p>
            {u !== 'fechada' && u !== 'pronta' && (
              <p className={`font-bold ${u === 'atrasada' ? 'text-red-400' : u === 'hoje' ? 'text-amber-300' : 'text-text-soft'}`}>{relativeDue(o.due_at)}</p>
            )}
          </div>
        </div>

        {nextStatuses(o.status).length > 0 && (
          <div className="no-print mt-5 border-t border-border pt-4">
            <p className="label">Mover para</p>
            <div className="flex flex-wrap gap-2">
              {nextStatuses(o.status).map((s) => (
                <button key={s} className={STATUS_BTN[s]} onClick={() => void changeStatus(s)}>
                  <ArrowRight size={18} /> {STATUS_META[s].label}
                </button>
              ))}
            </div>
            <input className="input mt-2" placeholder="Observação da mudança (opcional) — ex.: peça chega quinta" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
          </div>
        )}

        <div className="no-print mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <button className="btn-whatsapp" onClick={() => openNotify(o.status)}><MessageCircle size={20} /> Avisar cliente</button>
          <button className="btn-secondary" onClick={() => void navigator.clipboard.writeText(link).then(() => toast('Link copiado!'))}><Copy size={18} /> Copiar link</button>
          <a className="btn-secondary" href={link} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Ver como cliente</a>
          <Link className="btn-secondary" to={`/app/ordens/${o.id}/comprovante`}><Printer size={18} /> Comprovante</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title mb-0">Serviço</h2>
            {!editing && o.status !== 'entregue' && o.status !== 'cancelado' && (
              <button className="btn-secondary btn-sm" onClick={() => setEditing(true)}><Pencil size={14} /> Editar</button>
            )}
          </div>
          {editing ? (
            <EditOrder
              initial={{ description: o.description, price: String(o.price).replace('.', ','), due: toLocalInput(o.due_at), assignee: o.assignee_id, line: o.line }}
              staff={staff.filter((s) => s.active)}
              onCancel={() => setEditing(false)}
              onSave={async (v) => {
                const r = await run(
                  () => api.updateOrder(o.id, { description: v.description, price: parseMoney(v.price), due_at: fromLocalInput(v.due), assignee_id: v.assignee, line: v.line }),
                  'Ordem atualizada',
                );
                if (r !== undefined) {
                  if (v.due !== toLocalInput(o.due_at)) await api.addOrderNote(o.id, `Prazo alterado de ${fmtDateTime(o.due_at)} para ${fmtDateTime(fromLocalInput(v.due))}`);
                  if (v.assignee !== o.assignee_id) await api.addOrderNote(o.id, `Responsável alterado para ${staff.find((s) => s.id === v.assignee)?.name}`);
                  setEditing(false);
                  void reload();
                }
              }}
            />
          ) : (
            <dl className="space-y-2">
              <Row label="Descrição">{o.description || '—'}</Row>
              <Row label="Responsável">{o.assignee?.name ?? '—'}</Row>
              <Row label="Aberta em">{fmtDateTime(o.created_at)}</Row>
              {o.ready_at && <Row label="Pronta em">{fmtDateTime(o.ready_at)}</Row>}
              {o.delivered_at && <Row label="Entregue em">{fmtDateTime(o.delivered_at)}</Row>}
            </dl>
          )}
          {o.vehicle && (
            <div className="mt-4 rounded-xl bg-field p-3">
              <p className="flex items-center gap-2 font-bold"><Car size={18} /> {vehicleLabel(o.vehicle)}</p>
              <p className="text-sm text-text-soft">Chave: {o.vehicle.key_type || '—'} · Transponder: {o.vehicle.transponder || '—'}</p>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="section-title">Pagamento</h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Money label="Total" value={o.price} />
            <Money label="Pago" value={o.paid} tone="text-green-400" />
            <Money label="Saldo" value={saldo} tone={saldo > 0 ? 'text-red-400' : 'text-text-strong'} />
          </div>
          {payments.length > 0 && (
            <ul className="mt-3 divide-y divide-border text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <span>{fmtDateTime(p.created_at)} · {PAYMENT_METHODS[p.method]} {p.kind === 'sinal' && <b>(sinal)</b>}</span>
                  <span className="font-semibold">{brl(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          {saldo > 0 && o.status !== 'cancelado' && (
            <form
              className="no-print mt-3 flex flex-wrap gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const kind: PaymentKind = o.paid === 0 && o.status !== 'pronto' ? 'sinal' : 'pagamento';
                const r = await run(() => api.addPayment(o.id, parseMoney(pay.amount), pay.method, kind), 'Pagamento registrado');
                if (r !== undefined) {
                  setPay({ ...pay, amount: '' });
                  void reload();
                }
              }}
            >
              <input className="input w-32 flex-1" inputMode="decimal" placeholder={brl(saldo)} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} aria-label="Valor recebido" />
              <select className="input w-36" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as PaymentMethod })} aria-label="Forma de pagamento">
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="btn-primary" disabled={!pay.amount}>Receber</button>
              <button type="button" className="btn-secondary" onClick={() => setPay({ ...pay, amount: String(saldo).replace('.', ',') })}>Saldo total</button>
            </form>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="section-title">Histórico</h2>
        <ol className="relative space-y-4 border-l-2 border-border pl-6">
          {[...events].reverse().map((e) => (
            <li key={e.id} className="relative">
              <span className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-card ${STATUS_META[e.to_status].dot}`} />
              <p className="font-semibold">
                {e.from_status === null ? 'Ordem aberta' : e.from_status === e.to_status ? 'Anotação' : `${STATUS_META[e.from_status].label} → ${STATUS_META[e.to_status].label}`}
              </p>
              <p className="text-sm text-text-soft">{fmtDateTime(e.created_at)} · {e.user_name ?? 'sistema'}</p>
              {e.note && e.from_status !== null && <p className="mt-1 text-text-soft">{e.note}</p>}
            </li>
          ))}
        </ol>
      </section>

      {notify && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setNotify(null)}>
          <div className="w-full max-w-lg rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold">Avisar {o.customer.name.split(' ')[0]} pelo WhatsApp</h3>
            <select
              className="input mt-3"
              value={notify.key}
              onChange={(e) => {
                const t = templates.find((x) => x.key === e.target.value)!;
                setNotify({ key: t.key, text: renderTemplate(t.body, orderMessageVars(o, store, link)) });
              }}
            >
              {templates.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
            </select>
            <textarea className="input mt-3 min-h-[160px]" value={notify.text} onChange={(e) => setNotify({ ...notify, text: e.target.value })} />
            {!o.customer.phone && <p className="mt-2 font-semibold text-red-400">Cliente sem telefone cadastrado.</p>}
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary" onClick={() => setNotify(null)}>Fechar</button>
              <button
                className="btn-whatsapp flex-1"
                disabled={!o.customer.phone}
                onClick={async () => {
                  await messageChannel.send(o.customer.phone, notify.text);
                  const title = templates.find((t) => t.key === notify.key)?.title ?? '';
                  await api.addOrderNote(o.id, `Cliente avisado pelo ${messageChannel.label}: ${title}`).catch(() => {});
                  setNotify(null);
                  setParams({});
                  void reload();
                }}
              >
                <MessageCircle size={20} /> Abrir WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-sm font-semibold text-text-soft">{label}</dt>
      <dd className="text-text-strong">{children}</dd>
    </div>
  );
}

function Money({ label, value, tone = 'text-text-strong' }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl bg-field p-3">
      <p className="text-xs font-bold uppercase text-text-soft">{label}</p>
      <p className={`text-lg font-extrabold ${tone}`}>{brl(value)}</p>
    </div>
  );
}

interface EditValues {
  description: string;
  price: string;
  due: string;
  assignee: string;
  line: ServiceLine;
}

function EditOrder({ initial, staff, onSave, onCancel }: { initial: EditValues; staff: { id: string; name: string }[]; onSave: (v: EditValues) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
      <div>
        <label className="label">Frente</label>
        <select className="input" value={v.line} onChange={(e) => setV({ ...v, line: e.target.value as ServiceLine })}>
          {LINE_KEYS.map((l) => <option key={l} value={l}>{LINES[l].label}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Descrição</label>
        <textarea className="input" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Valor (R$)</label>
          <input className="input" inputMode="decimal" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} />
        </div>
        <div>
          <label className="label">Responsável</label>
          <select className="input" value={v.assignee} onChange={(e) => setV({ ...v, assignee: e.target.value })}>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Prazo</label>
        <input type="datetime-local" className="input" value={v.due} onChange={(e) => setV({ ...v, due: e.target.value })} required />
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary flex-1">Salvar</button>
      </div>
    </form>
  );
}
