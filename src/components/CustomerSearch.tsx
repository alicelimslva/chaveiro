import { Car, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { formatPhone } from '../lib/format';
import type { CustomerHit } from '../types';

/** Busca de cliente sempre visível (nome, telefone ou placa). Atalho: tecla "/". */
export function CustomerSearch({ onPick, autoFocus = false, placeholder }: { onPick?: (h: CustomerHit) => void; autoFocus?: boolean; placeholder?: string }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const global = !onPick;

  useEffect(() => {
    if (!global) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [global]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      const r = await api.searchCustomers(q).catch(() => []);
      if (alive) {
        setHits(r);
        setActive(0);
      }
    }, 180);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const pick = (h: CustomerHit) => {
    setOpen(false);
    setQ('');
    if (onPick) onPick(h);
    else nav(`/app/clientes/${h.customer.id}`);
  };

  return (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
      <input
        ref={ref}
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, hits.length - 1));
          if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
          if (e.key === 'Enter' && hits[active]) {
            e.preventDefault();
            pick(hits[active]);
          }
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder ?? 'Buscar cliente: nome, telefone ou placa  ( / )'}
        className="input pl-10"
        aria-label="Buscar cliente"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {hits.length === 0 && <p className="px-4 py-3 text-slate-500">Nenhum cliente encontrado.</p>}
          {hits.map((h, i) => (
            <button
              key={h.customer.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(h)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${i === active ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
            >
              <span>
                <span className="block font-semibold text-slate-900">{h.customer.name}</span>
                <span className="text-sm text-slate-500">{formatPhone(h.customer.phone)}</span>
              </span>
              {h.matchedPlate && (
                <span className="chip bg-slate-900 text-white">
                  <Car size={12} /> {h.matchedPlate}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
