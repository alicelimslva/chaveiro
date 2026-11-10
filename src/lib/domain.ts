import type { Order, OrderFull, OrderStatus, PaymentMethod, ServiceLine, StoreSettings } from '../types';
import { brl, dayDiff, fmtDateTime } from './format';

export const LINES: Record<ServiceLine, { label: string; short: string }> = {
  copia: { label: 'Cópia de chaves', short: 'Cópia' },
  controle: { label: 'Controles', short: 'Controle' },
  automotiva: { label: 'Chave automotiva', short: 'Automotiva' },
  abertura: { label: 'Abertura de portas e carros', short: 'Abertura' },
  carimbo: { label: 'Carimbos', short: 'Carimbo' },
};
export const LINE_KEYS = Object.keys(LINES) as ServiceLine[];

export const STATUS_FLOW: OrderStatus[] = ['recebido', 'em_andamento', 'aguardando_peca', 'pronto', 'entregue'];
export const ALL_STATUSES: OrderStatus[] = [...STATUS_FLOW, 'cancelado'];
export const OPEN_STATUSES: OrderStatus[] = ['recebido', 'em_andamento', 'aguardando_peca', 'pronto'];

export const STATUS_META: Record<OrderStatus, { label: string; badge: string; dot: string }> = {
  recebido: { label: 'Recebido', badge: 'bg-field text-text-strong', dot: 'bg-text-faint' },
  em_andamento: { label: 'Em andamento', badge: 'bg-state-today/15 text-blue-300', dot: 'bg-blue-600' },
  aguardando_peca: { label: 'Aguardando peça', badge: 'bg-state-tomorrow/15 text-purple-300', dot: 'bg-purple-600' },
  pronto: { label: 'Pronto', badge: 'bg-state-ready/15 text-green-400', dot: 'bg-green-600' },
  entregue: { label: 'Entregue', badge: 'bg-field text-text-soft border border-border', dot: 'bg-text-faint' },
  cancelado: { label: 'Cancelado', badge: 'bg-state-late/15 text-red-400', dot: 'bg-red-500' },
};

export const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_debito: 'Débito',
  cartao_credito: 'Crédito',
};

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  recebido: ['em_andamento', 'aguardando_peca', 'pronto', 'cancelado'],
  em_andamento: ['aguardando_peca', 'pronto', 'cancelado'],
  aguardando_peca: ['em_andamento', 'pronto', 'cancelado'],
  pronto: ['entregue', 'em_andamento', 'cancelado'],
  entregue: [],
  cancelado: ['recebido'],
};
export const nextStatuses = (s: OrderStatus) => TRANSITIONS[s];
export const canTransition = (from: OrderStatus, to: OrderStatus) => TRANSITIONS[from].includes(to);

export type Urgency = 'atrasada' | 'hoje' | 'amanha' | 'proximas' | 'pronta' | 'fechada';

export function urgencyOf(o: Pick<Order, 'status' | 'due_at'>, now = new Date()): Urgency {
  if (o.status === 'entregue' || o.status === 'cancelado') return 'fechada';
  if (o.status === 'pronto') return 'pronta';
  const due = new Date(o.due_at);
  if (due.getTime() < now.getTime()) return 'atrasada';
  const d = dayDiff(due, now);
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanha';
  return 'proximas';
}

export function groupForPanel<T extends Pick<Order, 'status' | 'due_at'>>(orders: T[], now = new Date()) {
  const g: Record<Urgency, T[]> = { atrasada: [], hoje: [], amanha: [], proximas: [], pronta: [], fechada: [] };
  for (const o of orders) g[urgencyOf(o, now)].push(o);
  for (const k of Object.keys(g) as Urgency[]) g[k].sort((a, b) => a.due_at.localeCompare(b.due_at));
  return g;
}

/** No prazo = ficou pronta (ou foi entregue) até o horário prometido. null = ainda não concluída. */
export function isOnTime(o: Pick<Order, 'status' | 'due_at' | 'ready_at' | 'delivered_at'>): boolean | null {
  const done = o.ready_at ?? o.delivered_at;
  if (!done || o.status === 'cancelado') return null;
  return new Date(done).getTime() <= new Date(o.due_at).getTime();
}

export const balanceOf = (o: Pick<OrderFull, 'price' | 'paid'>) => Math.max(0, Math.round((o.price - o.paid) * 100) / 100);

export function generateCode(len = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const arr = new Uint32Array(len);
  globalThis.crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join('');
}

export const TEMPLATE_VARS = ['cliente', 'numero', 'servico', 'descricao', 'prazo', 'valor', 'saldo', 'link', 'loja', 'local'] as const;

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

export function orderMessageVars(o: OrderFull, store: StoreSettings, link: string): Record<string, string> {
  return {
    cliente: o.customer.name.split(' ')[0],
    numero: String(o.number),
    servico: LINES[o.line].label,
    descricao: o.description,
    prazo: fmtDateTime(o.due_at),
    valor: brl(o.price),
    saldo: brl(balanceOf(o)),
    link,
    loja: store.name,
    local: store.mall_location,
  };
}

export function trackingUrl(code: string): string {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env;
  const base = env?.VITE_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/$/, '')}/acompanhar/${code}`;
}
