import { ExternalLink, ImagePlus, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { useAction } from '../../components/Toast';
import { Loading, PageTitle } from '../../components/ui';
import { LINE_KEYS, LINES } from '../../lib/domain';
import { parseMoney } from '../../lib/format';
import { useAsync } from '../../lib/useAsync';
import type { ShowcaseService, StoreSettings } from '../../types';

const STORE_FIELDS: { key: keyof StoreSettings; label: string; long?: boolean; hint?: string }[] = [
  { key: 'name', label: 'Nome da loja' },
  { key: 'tagline', label: 'Frase de destaque' },
  { key: 'city', label: 'Cidade', hint: 'Ex.: Campinas - SP (importante para a busca local)' },
  { key: 'address', label: 'Endereço do shopping' },
  { key: 'mall_location', label: 'Localização dentro do shopping' },
  { key: 'hours', label: 'Horário' },
  { key: 'whatsapp', label: 'WhatsApp principal (com DDD)' },
  { key: 'instagram', label: 'Instagram (@usuario)' },
  { key: 'google_maps_url', label: 'Link do Google Maps' },
  { key: 'google_business_url', label: 'Link para avaliar no Google (Perfil da Empresa)' },
  { key: 'about', label: 'Sobre a loja', long: true },
];

export function ShowcaseAdmin() {
  const run = useAction();
  const { data, loading, reload } = useAsync(async () => {
    const [store, services, photos] = await Promise.all([api.getStore(), api.listShowcaseServices(true), api.listPhotos()]);
    return { store, services, photos };
  });
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) setStore(data.store);
  }, [data]);

  if (loading && !data) return <Loading />;
  if (!data || !store) return null;

  return (
    <div className="space-y-5">
      <PageTitle actions={<a href="/" target="_blank" className="btn-secondary"><ExternalLink size={18} /> Ver vitrine</a>}>Vitrine e dados da loja</PageTitle>

      <section className="card">
        <h2 className="section-title">Dados da loja</h2>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await run(() => api.saveStore(store), 'Dados da loja salvos');
          }}
        >
          {STORE_FIELDS.map((f) => (
            <div key={f.key} className={f.long ? 'sm:col-span-2' : ''}>
              <label className="label">{f.label}</label>
              {f.long ? (
                <textarea className="input" value={store[f.key]} onChange={(e) => setStore({ ...store, [f.key]: e.target.value })} />
              ) : (
                <input className="input" value={store[f.key]} onChange={(e) => setStore({ ...store, [f.key]: e.target.value })} />
              )}
              {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
            </div>
          ))}
          <button className="btn-primary sm:col-span-2">Salvar dados da loja</button>
        </form>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title mb-0">Serviços e preços</h2>
          <button
            className="btn-secondary btn-sm"
            onClick={async () => {
              await run(() => api.saveShowcaseService({ line: 'copia', title: 'Novo serviço', sort: data.services.length + 1 }));
              void reload();
            }}
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>
        <div className="space-y-3">
          {data.services.map((s) => (
            <ServiceEditor
              key={s.id}
              s={s}
              onSave={async (v) => {
                await run(() => api.saveShowcaseService(v), 'Serviço salvo');
                void reload();
              }}
              onDelete={async () => {
                if (!confirm('Excluir este serviço da vitrine?')) return;
                await run(() => api.deleteShowcaseService(s.id), 'Serviço excluído');
                void reload();
              }}
            />
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Fotos da vitrine</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          <input className="input flex-1" placeholder="Legenda (opcional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setUploading(true);
              await run(() => api.uploadPhoto(f, caption), 'Foto enviada');
              setUploading(false);
              setCaption('');
              e.target.value = '';
              void reload();
            }}
          />
          <button className="btn-primary" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <ImagePlus size={20} /> {uploading ? 'Enviando…' : 'Enviar foto'}
          </button>
        </div>
        {data.photos.length === 0 ? (
          <p className="text-slate-500">Nenhuma foto ainda. Fotos da fachada e de trabalhos feitos ajudam muito no Google.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {data.photos.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-xl">
                <img src={p.url} alt={p.caption} className="aspect-square w-full object-cover" />
                <button
                  aria-label="Excluir foto"
                  className="absolute right-2 top-2 rounded-lg bg-white/90 p-2 text-red-600 shadow"
                  onClick={async () => {
                    if (!confirm('Excluir esta foto?')) return;
                    await run(() => api.deletePhoto(p.id), 'Foto excluída');
                    void reload();
                  }}
                >
                  <Trash2 size={16} />
                </button>
                {p.caption && <p className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-xs text-white">{p.caption}</p>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ServiceEditor({ s, onSave, onDelete }: { s: ShowcaseService; onSave: (s: ShowcaseService) => void; onDelete: () => void }) {
  const [v, setV] = useState({ ...s, price: s.price_from == null ? '' : String(s.price_from).replace('.', ',') });
  return (
    <form
      className={`grid gap-2 rounded-xl border-2 p-3 sm:grid-cols-6 ${v.active ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-70'}`}
      onSubmit={(e) => {
        e.preventDefault();
        const { price, ...rest } = v;
        onSave({ ...rest, price_from: price.trim() ? parseMoney(price) : null });
      }}
    >
      <select className="input sm:col-span-2" value={v.line} onChange={(e) => setV({ ...v, line: e.target.value as ShowcaseService['line'] })} aria-label="Frente">
        {LINE_KEYS.map((l) => <option key={l} value={l}>{LINES[l].label}</option>)}
      </select>
      <input className="input sm:col-span-4" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} aria-label="Título" />
      <input className="input sm:col-span-6" placeholder="Descrição" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} aria-label="Descrição" />
      <input className="input sm:col-span-2" placeholder="Preço a partir de" inputMode="decimal" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} aria-label="Preço a partir de" />
      <input className="input sm:col-span-2" placeholder="WhatsApp deste serviço (opcional)" value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} aria-label="WhatsApp do serviço" />
      <label className="flex items-center gap-2 font-semibold sm:col-span-2">
        <input type="checkbox" className="h-5 w-5" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> Visível
      </label>
      <div className="flex gap-2 sm:col-span-6">
        <button type="button" className="btn-secondary btn-sm text-red-700" onClick={onDelete}><Trash2 size={14} /> Excluir</button>
        <button className="btn-primary btn-sm flex-1">Salvar</button>
      </div>
    </form>
  );
}
