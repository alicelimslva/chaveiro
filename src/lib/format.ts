export const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

export const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatPhone(phone: string): string {
  let d = onlyDigits(phone);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

export const normalizePlate = (p: string) => (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
export const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);

/** Texto curto para o prazo: "atrasada há 3h", "hoje às 18:00", "amanhã às 10:00". */
export function relativeDue(iso: string, now = new Date()): string {
  const due = new Date(iso);
  const diffMs = due.getTime() - now.getTime();
  const days = dayDiff(due, now);
  if (diffMs < 0) {
    const mins = Math.round(-diffMs / 60000);
    if (mins < 60) return `atrasada há ${mins} min`;
    const h = Math.round(mins / 60);
    if (h < 24) return `atrasada há ${h}h`;
    const d = Math.round(h / 24);
    return `atrasada há ${d} dia${d > 1 ? 's' : ''}`;
  }
  if (days === 0) return `hoje às ${fmtTime(iso)}`;
  if (days === 1) return `amanhã às ${fmtTime(iso)}`;
  return due.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** Converte ISO para o formato do <input type="datetime-local">. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const fromLocalInput = (v: string) => new Date(v).toISOString();

/** Aceita "1.234,56", "35,5" ou "35.50". */
export function parseMoney(v: string | number): number {
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  const s = String(v).trim();
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
