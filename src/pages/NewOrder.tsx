import { Car, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { CustomerSearch } from '../components/CustomerSearch';
import { useAction } from '../components/Toast';
import { LineIcon, PageTitle } from '../components/ui';
import { emptyVehicle, VehicleFields, vehicleFromDraft, vehicleLabel, type VehicleDraft } from '../components/VehicleForm';
import { LINE_KEYS, LINES, PAYMENT_METHODS } from '../lib/domain';
import { addDays, formatPhone, fromLocalInput, parseMoney, toLocalInput } from '../lib/format';
import type { Customer, PaymentMethod, Profile, ServiceLine, Vehicle } from '../types';

function quickDue(): { label: string; date: Date }[] {
  const now = new Date();
  const at = (d: Date, h: number, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
  const inHour = new Date(now.getTime() + 60 * 60_000);
  inHour.setMinutes(Math.ceil(inHour.getMinutes() / 15) * 15, 0, 0);
  const opts = [
    { label: 'Em 1 hora', date: inHour },
    { label: 'Hoje 18h', date: at(now, 18) },
    { label: 'Hoje 21h', date: at(now, 21) },
    { label: 'Amanhã 12h', date: at(addDays(now, 1), 12) },
    { label: 'Amanhã 18h', date: at(addDays(now, 1), 18) },
    { label: 'Em 3 dias', date: at(addDays(now, 3), 18) },
  ];
  return opts.filter((o) => o.date.getTime() > now.getTime());
}

export function NewOrder() {
  const { user } = useAuth();
  const nav = useNavigate();
  const run = useAction();
  const [params] = useSearchParams();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [line, setLine] = useState<ServiceLine | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string | 'novo' | ''>('');
  const [vehicleDraft, setVehicleDraft] = useState<VehicleDraft>(emptyVehicle);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>('pix');
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState(user?.id ?? '');
  const [staff, setStaff] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(false);
  const chips = useMemo(quickDue, []);

  useEffect(() => {
    void api.listProfiles().then((p) => setStaff(p.filter((x) => x.active)));
    const cid = params.get('cliente');
    if (cid) void api.getCustomer(cid).then((c) => c && setCustomer(c));
  }, [params]);

  useEffect(() => {
    if (!customer) {
      setVehicles([]);
      setVehicleId('');
      return;
    }
    void api.listVehicles(customer.id).then((vs) => {
      setVehicles(vs);
      setVehicleId(vs.length === 1 ? vs[0].id : vs.length ? '' : 'novo');
    });
  }, [customer]);

  const hasCustomer = !!customer || (!!newCustomer && newCustomer.name.trim().length > 1);
  const valid = hasCustomer && line && due && assignee;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !line) return;
    setBusy(true);
    const order = await run(async () => {
      const c = customer ?? (await api.saveCustomer({ name: newCustomer!.name.trim(), phone: newCustomer!.phone }));
      let vid: string | null = null;
      if (line === 'automotiva') {
        if (vehicleId === 'novo' || (!vehicleId && !vehicles.length)) {
          const d = vehicleFromDraft(vehicleDraft);
          if (d.brand || d.model || d.plate) vid = (await api.saveVehicle({ ...d, customer_id: c.id })).id;
        } else vid = vehicleId || null;
      }
      return api.createOrder({
        customer_id: c.id,
        vehicle_id: vid,
        line,
        description: description.trim(),
        price: parseMoney(price),
        due_at: fromLocalInput(due),
        assignee_id: assignee,
        deposit: parseMoney(deposit),
        deposit_method: depositMethod,
      });
    }, 'Ordem aberta!');
    setBusy(false);
    if (order) nav(`/app/ordens/${order.id}?nova=1`, { replace: true });
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5 pb-28">
      <PageTitle>Nova ordem de serviço</PageTitle>

      <section className="card">
        <h2 className="section-title">1 · Cliente</h2>
        {customer ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <div>
              <p className="text-lg font-bold">{customer.name}</p>
              <p className="text-slate-600">{formatPhone(customer.phone)}</p>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setCustomer(null)}>
              <X size={16} /> Trocar
            </button>
          </div>
        ) : newCustomer ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="cname">Nome</label>
                <input id="cname" className="input" autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="cphone">WhatsApp</label>
                <input id="cphone" className="input" inputMode="tel" placeholder="(11) 99999-0000" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
              </div>
            </div>
            <button type="button" className="text-sm font-semibold text-slate-600 underline" onClick={() => setNewCustomer(null)}>
              Buscar cliente existente
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <CustomerSearch autoFocus onPick={(h) => setCustomer(h.customer)} placeholder="Nome, telefone ou placa do cliente" />
            <button type="button" className="btn-secondary w-full" onClick={() => setNewCustomer({ name: '', phone: '' })}>
              <UserPlus size={20} /> Cliente novo
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">2 · Frente de serviço</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {LINE_KEYS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLine(l)}
              aria-pressed={line === l}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center font-semibold transition ${line === l ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}
            >
              <LineIcon line={l} size={26} />
              <span className="text-sm leading-tight">{LINES[l].label}</span>
            </button>
          ))}
        </div>

        {line === 'automotiva' && (
          <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-3">
            <p className="flex items-center gap-2 font-bold"><Car size={18} /> Veículo</p>
            {vehicles.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {vehicles.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => setVehicleId(v.id)}
                    className={`rounded-xl border-2 p-3 text-left ${vehicleId === v.id ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white'}`}
                  >
                    <p className="font-bold">{vehicleLabel(v)}</p>
                    <p className="text-sm text-slate-600">{v.key_type || '—'} · Transponder: {v.transponder || '—'}</p>
                  </button>
                ))}
                <button type="button" onClick={() => setVehicleId('novo')} className={`rounded-xl border-2 border-dashed p-3 font-semibold ${vehicleId === 'novo' ? 'border-slate-900' : 'border-slate-300'}`}>
                  + Outro veículo
                </button>
              </div>
            )}
            {(vehicleId === 'novo' || vehicles.length === 0) && <VehicleFields v={vehicleDraft} onChange={setVehicleDraft} />}
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">3 · Serviço, valor e prazo</h2>
        <div>
          <label className="label" htmlFor="desc">O que será feito</label>
          <textarea id="desc" className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: 3 cópias tetra, 1 controle portão…" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="price">Valor total (R$)</label>
            <input id="price" className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label className="label" htmlFor="dep">Sinal pago (R$)</label>
            <input id="dep" className="input" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0,00" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="depm">Forma do sinal</label>
            <select id="depm" className="input" value={depositMethod} onChange={(e) => setDepositMethod(e.target.value as PaymentMethod)}>
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Prazo prometido ao cliente</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {chips.map((c) => {
              const v = toLocalInput(c.date.toISOString());
              return (
                <button key={c.label} type="button" onClick={() => setDue(v)} className={`rounded-full border-2 px-4 py-2 text-sm font-semibold ${due === v ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white'}`}>
                  {c.label}
                </button>
              );
            })}
          </div>
          <input aria-label="Prazo" type="datetime-local" className="input" value={due} onChange={(e) => setDue(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="assignee">Responsável</label>
          <select id="assignee" className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)} required>
            {staff.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.id === user?.id ? ' (eu)' : ''}</option>
            ))}
          </select>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2">
          <button type="button" className="btn-secondary" onClick={() => nav(-1)}>Cancelar</button>
          <button className="btn-primary flex-1 text-lg" disabled={!valid || busy}>
            {busy ? 'Salvando…' : !hasCustomer ? 'Escolha o cliente' : !line ? 'Escolha a frente' : !due ? 'Defina o prazo' : 'Abrir ordem'}
          </button>
        </div>
      </div>
    </form>
  );
}
