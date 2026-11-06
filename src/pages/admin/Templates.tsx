import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useAction } from '../../components/Toast';
import { Loading, PageTitle } from '../../components/ui';
import { renderTemplate, TEMPLATE_VARS } from '../../lib/domain';
import { useAsync } from '../../lib/useAsync';
import type { MessageTemplate } from '../../types';

const SAMPLE: Record<string, string> = {
  cliente: 'Maria', numero: '1042', servico: 'Controles', descricao: '2 controles portão', prazo: '05/11/26 18:00',
  valor: 'R$ 120,00', saldo: 'R$ 60,00', link: 'https://seusite.com/acompanhar/K7M2Q9XA', loja: 'Chaveiro do Shopping', local: 'Piso térreo, corredor B',
};

export function Templates() {
  const run = useAction();
  const { data, loading, reload } = useAsync(() => api.listTemplates());
  const [sel, setSel] = useState<MessageTemplate | null>(null);

  useEffect(() => {
    if (data && !sel) setSel(data[0] ?? null);
  }, [data, sel]);

  if (loading && !data) return <Loading />;

  const insert = (v: string) => {
    if (!sel) return;
    const el = document.getElementById('tpl-body') as HTMLTextAreaElement | null;
    const pos = el?.selectionStart ?? sel.body.length;
    setSel({ ...sel, body: sel.body.slice(0, pos) + `{${v}}` + sel.body.slice(pos) });
  };

  return (
    <div>
      <PageTitle>Modelos de mensagem do WhatsApp</PageTitle>
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {(data ?? []).map((t) => (
            <button
              key={t.key}
              onClick={() => setSel(t)}
              className={`whitespace-nowrap rounded-xl px-4 py-3 text-left font-semibold ${sel?.key === t.key ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-200'}`}
            >
              {t.title}
            </button>
          ))}
        </nav>
        {sel && (
          <div className="card space-y-4">
            <div>
              <label className="label">Título</label>
              <input className="input" value={sel.title} onChange={(e) => setSel({ ...sel, title: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="tpl-body">Mensagem</label>
              <textarea id="tpl-body" className="input min-h-[150px]" value={sel.body} onChange={(e) => setSel({ ...sel, body: e.target.value })} />
              <div className="mt-2 flex flex-wrap gap-1">
                {TEMPLATE_VARS.map((v) => (
                  <button key={v} type="button" onClick={() => insert(v)} className="chip bg-slate-100 font-mono text-slate-700 hover:bg-slate-200">{`{${v}}`}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="label">Prévia</p>
              <div className="whitespace-pre-wrap rounded-2xl rounded-tl-none bg-green-100 p-4 text-slate-900">{renderTemplate(sel.body, SAMPLE)}</div>
            </div>
            <button
              className="btn-primary w-full"
              onClick={async () => {
                const r = await run(() => api.saveTemplate(sel), 'Modelo salvo');
                if (r !== undefined) void reload();
              }}
            >
              Salvar modelo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
