import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Loading } from '../components/ui';
import { vehicleLabel } from '../components/VehicleForm';
import { balanceOf, LINES, PAYMENT_METHODS, STATUS_META, trackingUrl } from '../lib/domain';
import { brl, fmtDateTime, formatPhone } from '../lib/format';
import { useAsync } from '../lib/useAsync';

/** Comprovante para impressora térmica (80mm) ou A4 — "Salvar como PDF" no diálogo de impressão. */
export function Receipt() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [size, setSize] = useState<'80mm' | 'a4'>('80mm');
  const { data } = useAsync(async () => {
    const [o, payments, store] = await Promise.all([api.getOrder(id), api.listPayments(id), api.getStore()]);
    return { o, payments, store };
  }, [id]);
  if (!data) return <Loading />;
  const { o, payments, store } = data;
  if (!o) return <p>Ordem não encontrada.</p>;
  const link = trackingUrl(o.code);

  return (
    <div className="min-h-screen py-6 print:bg-white print:py-0">
      <style>{`@page { size: ${size === '80mm' ? '80mm auto' : 'A4'}; margin: ${size === '80mm' ? '4mm' : '15mm'}; }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-xl flex-wrap justify-center gap-2 px-4">
        <button className="btn-secondary" onClick={() => nav(-1)}>← Voltar</button>
        <select className="input w-auto" value={size} onChange={(e) => setSize(e.target.value as '80mm' | 'a4')} aria-label="Tamanho">
          <option value="80mm">Bobina 80mm</option>
          <option value="a4">Folha A4</option>
        </select>
        <button className="btn-primary" onClick={() => window.print()}><Printer size={18} /> Imprimir / PDF</button>
      </div>

      <div className={`mx-auto bg-white p-5 font-mono text-[13px] leading-snug text-black shadow print:shadow-none ${size === '80mm' ? 'w-[80mm] print:w-full print:p-0' : 'max-w-2xl print:p-0'}`}>
        <div className="text-center">
          <p className="text-base font-bold">{store.name}</p>
          <p>{store.address}</p>
          <p>{store.mall_location}</p>
          <p>WhatsApp {formatPhone(store.whatsapp)}</p>
        </div>
        <hr className="my-3 border-dashed border-black" />
        <p className="text-center text-base font-bold">ORDEM DE SERVIÇO Nº {o.number}</p>
        <p className="text-center">Código: <b>{o.code}</b></p>
        <hr className="my-3 border-dashed border-black" />
        <p>Cliente: {o.customer.name}</p>
        <p>Telefone: {formatPhone(o.customer.phone)}</p>
        <p>Serviço: {LINES[o.line].label}</p>
        {o.vehicle && (
          <p>Veículo: {vehicleLabel(o.vehicle)} {o.vehicle.transponder && `· ${o.vehicle.transponder}`}</p>
        )}
        <p className="mt-1 whitespace-pre-wrap">{o.description}</p>
        <hr className="my-3 border-dashed border-black" />
        <p>Aberta: {fmtDateTime(o.created_at)}</p>
        <p className="font-bold">Prazo: {fmtDateTime(o.due_at)}</p>
        <p>Atendente: {o.assignee?.name}</p>
        <p>Status: {STATUS_META[o.status].label}</p>
        <hr className="my-3 border-dashed border-black" />
        <div className="flex justify-between"><span>Total</span><span>{brl(o.price)}</span></div>
        {payments.map((p) => (
          <div key={p.id} className="flex justify-between">
            <span>{p.kind === 'sinal' ? 'Sinal' : 'Pago'} ({PAYMENT_METHODS[p.method]})</span>
            <span>-{brl(p.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold"><span>Saldo</span><span>{brl(balanceOf(o))}</span></div>
        <hr className="my-3 border-dashed border-black" />
        <div className="flex flex-col items-center gap-2 text-center">
          <QRCodeSVG value={link} size={120} />
          <p>Acompanhe seu serviço:</p>
          <p className="break-all">{link}</p>
        </div>
        <hr className="my-3 border-dashed border-black" />
        <p className="text-center text-[11px]">Apresente este comprovante na retirada. Serviços não retirados em 90 dias poderão ser descartados.</p>
      </div>
    </div>
  );
}
