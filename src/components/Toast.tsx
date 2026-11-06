import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Kind = 'ok' | 'erro';
interface Toast {
  id: number;
  text: string;
  kind: Kind;
}

const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Kind = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, text, kind }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-xl px-5 py-3 text-base font-semibold shadow-lg ${t.kind === 'ok' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

/** Executa uma ação mostrando erro amigável se falhar. */
export function useAction() {
  const toast = useToast();
  return useCallback(
    /** Sucesso: devolve o resultado (ou `true` se a ação não retorna nada). Falha: mostra o erro e devolve undefined. */
    async <T,>(fn: () => Promise<T>, okMsg?: string): Promise<(T extends void ? true : T) | undefined> => {
      try {
        const r = await fn();
        if (okMsg) toast(okMsg);
        return (r === undefined ? true : r) as T extends void ? true : T;
      } catch (e) {
        toast((e as Error).message || 'Algo deu errado', 'erro');
        return undefined;
      }
    },
    [toast],
  );
}
