import { Car, MessageCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { isAdmin, useAuth } from '../auth/AuthContext';
import { useAction } from '../components/Toast';
import { ErrorBox, LineIcon, Loading, StatusBadge } from '../components/ui';
import { emptyVehicle, VehicleFields, vehicleFromDraft, vehicleLabel, type VehicleDraft } from '../components/VehicleForm';
import { balanceOf, LINES } from '../lib/domain';
import { brl, fmtDateTime, formatPhone } from '../lib/format';
import { waLink } from '../lib/messaging';
import { useAsync } from '../lib/useAsync';
import type { Vehicle } from '../types';

/** Ficha do cliente: dados, veículos, linha do tempo de atendimentos, valores pagos e pendências. */
export function CustomerDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const run = useAction();
  const { data, loading, error, reload } = useAsync(async () => {
    const [customer, vehicles, orders] = await Promise.all([api.getCustomer(id), api.listVehicles(id), api.listOrders({ customerId: id })]);
    return { customer, vehicles, orders };
  }, [id]);
  const [edit, setEdit] = useState<null | { name: string; phone: string; email: string; notes: string }>(null);
  const [vehicleForm, setVehicleForm] = useState<{ id?: string; draft: VehicleDraft } | null>(null);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { customer: c, vehicles, orders } = data!;
  if (!c) return <p className="card">Cliente não encontrado.</p>;

  const valid = orders.filter((o) => o.status !== 'cancelado');
  const totalPaid = valid.reduce((s, o) => s + o.paid, 0);
  const pending = valid.reduce((s, o) => s + balanceOf(o), 0);
  const open = valid.filter((o) => o.status !== 'entregue');

  const toDraft = (v: Vehicle): VehicleDraft => ({ brand: v.brand, model: v.model, year: v.year ? String(v.year) : '', plate: v.plate, key_type: v.key_type, transponder: v.transponder });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="card">
        {edit ? (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await run(() => api.saveCustomer({ id: c.id, ...edit, email: edit.email || null, notes: edit.notes || null }), 'Cliente atualizado');
              if (r) {
                setEdit(null);
                void reload();
              }
            }}
          >
            <div><label className="label">Nome</label><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></div>
            <div><label className="label">WhatsApp</label><input className="input" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            <div><label className="label">E-mail</label><input className="input" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
            <div><label className="label">Observações</label><input className="input" value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" className="btn-secondary" onClick={() => setEdit(null)}>Cancelar</button>
              <button className="btn-primary flex-1">Salvar</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold">{c.name}</h1>
              <p className="text-lg text-slate-700">{formatPhone(c.phone)}</p>
              {c.email && <p className="text-slate-600">{c.email}</p>}
              {c.notes && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">{c.notes}</p>}
              <p className="mt-2 text-sm text-slate-500">Cliente desde {new Date(c.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {c.phone && <a className="btn-whatsapp" href={waLink(c.phone)} target="_blank" rel="noreferrer"><MessageCircle size={20} /> WhatsApp</a>}
              <button className="btn-secondary" onClick={() => setEdit({ name: c.name, phone: c.phone, email: c.email ?? '', notes: c.notes ?? '' })}><Pencil size={18} /> Editar</button>
              <Link className="btn-accent" to={`/app/ordens/nova?cliente=${c.id}`}><Plus size={20} /> Nova ordem</Link>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Atendimentos" value={String(valid.length)} />
        <Kpi label="Total pago" value={brl(totalPaid)} tone="text-green-700" />
        <Kpi label="Pendente" value={brl(pending)} tone={pending > 0 ? 'text-red-700' : undefined} />
      </div>

      {open.length > 0 && (
        <div className="card border-amber-200 bg-amber-50">
          <p className="font-bold text-amber-900">{open.length} ordem(ns) em aberto</p>
          <ul className="mt-1 text-amber-900">
            {open.map((o) => <li key={o.id}><Link className="underline" to={`/app/ordens/${o.id}`}>#{o.number} — {o.description || LINES[o.line].label}</Link></li>)}
          </ul>
        </div>
      )}

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title mb-0"><Car size={16} /> Veículos</h2>
          {!vehicleForm && <button className="btn-secondary btn-sm" onClick={() => setVehicleForm({ draft: emptyVehicle })}><Plus size={14} /> Adicionar</button>}
        </div>
        {vehicleForm && (
          <form
            className="mb-4 space-y-3 rounded-xl bg-slate-50 p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await run(() => api.saveVehicle({ id: vehicleForm.id, customer_id: c.id, ...vehicleFromDraft(vehicleForm.draft) }), 'Veículo salvo');
              if (r) {
                setVehicleForm(null);
                void reload();
              }
            }}
          >
            <VehicleFields v={vehicleForm.draft} onChange={(draft) => setVehicleForm({ ...vehicleForm, draft })} />
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setVehicleForm(null)}>Cancelar</button>
              <button className="btn-primary flex-1">Salvar veículo</button>
            </div>
          </form>
        )}
        {vehicles.length === 0 && !vehicleForm && <p className="text-slate-500">Nenhum veículo cadastrado.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {vehicles.map((v) => (
            <div key={v.id} className="flex items-start justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <p className="font-bold">{vehicleLabel(v)}</p>
                <p className="text-sm text-slate-600">Chave: {v.key_type || '—'}</p>
                <p className="text-sm text-slate-600">Transponder: {v.transponder || '—'}</p>
              </div>
              <div className="flex gap-1">
                <button className="rounded-lg p-2 hover:bg-slate-100" aria-label="Editar veículo" onClick={() => setVehicleForm({ id: v.id, draft: toDraft(v) })}><Pencil size={16} /></button>
                {isAdmin(user) && (
                  <button
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                    aria-label="Excluir veículo"
                    onClick={async () => {
                      if (confirm('Excluir este veículo?')) {
                        await run(() => api.deleteVehicle(v.id), 'Veículo excluído');
                        void reload();
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Linha do tempo de atendimentos</h2>
        {orders.length === 0 ? (
          <p className="text-slate-500">Nenhum atendimento ainda.</p>
        ) : (
          <ol className="relative space-y-5 border-l-2 border-slate-200 pl-6">
            {orders.map((o) => (
              <li key={o.id} className="relative">
                <span className="absolute -left-[37px] flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-brand-400">
                  <LineIcon line={o.line} size={13} />
                </span>
                <Link to={`/app/ordens/${o.id}`} className="block rounded-xl p-2 hover:bg-slate-50">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-500">{fmtDateTime(o.created_at)}</span>
                    <span className="font-mono text-sm font-bold">#{o.number}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="font-semibold">{LINES[o.line].label}: {o.description || '—'}</p>
                  <p className="text-sm text-slate-600">
                    {brl(o.price)} · pago {brl(o.paid)}
                    {balanceOf(o) > 0 && o.status !== 'cancelado' && <b className="text-red-700"> · falta {brl(balanceOf(o))}</b>}
                    {o.vehicle && ` · ${vehicleLabel(o.vehicle)}`}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="card p-3 text-center sm:p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className={`text-lg font-extrabold sm:text-2xl ${tone ?? ''}`}>{value}</p>
    </div>
  );
}
