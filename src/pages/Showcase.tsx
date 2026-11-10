import { Clock, Instagram, KeyRound, MapPin, MessageCircle, Search, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { BrandGradient } from '../components/brand-gradient';
import { LineIcon, Loading } from '../components/ui';
import { brl } from '../lib/format';
import { waLink } from '../lib/messaging';
import { useAsync } from '../lib/useAsync';
import type { ShowcaseService, StoreSettings } from '../types';

/** Vitrine pública: página única, mobile-first, otimizada para busca local. */
export function Showcase() {
  const { data, loading } = useAsync(async () => {
    const [store, services, photos] = await Promise.all([api.getStore(), api.listShowcaseServices(), api.listPhotos()]);
    return { store, services, photos };
  });

  useSeo(data?.store, data?.services);

  if (loading || !data) return <Loading />;
  const { store, services, photos } = data;

  return (
    <div className="min-h-screen">
      <header className="relative isolate overflow-hidden text-white">
        <BrandGradient fade="bottom" />
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg font-extrabold">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-ink"><KeyRound size={22} /></span>
              {store.name}
            </span>
            <Link to="/app" className="text-sm text-text-faint hover:text-white">Área da equipe</Link>
          </div>
          <h1 className="mt-8 text-3xl font-extrabold leading-tight sm:text-4xl">{store.tagline}</h1>
          <p className="mt-3 text-lg text-text-soft">Chaveiro em {store.city}: cópia de chaves, controles, chave automotiva, abertura e carimbos.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <a className="btn-whatsapp text-lg" href={waLink(store.whatsapp, 'Olá! Vim pelo site e gostaria de um orçamento.')} target="_blank" rel="noreferrer">
              <MessageCircle /> Chamar no WhatsApp
            </a>
            {store.google_maps_url && (
              <a className="btn border-2 border-border text-white hover:bg-card-hover" href={store.google_maps_url} target="_blank" rel="noreferrer">
                <MapPin /> Como chegar
              </a>
            )}
          </div>
          <div className="mt-6 grid gap-3 text-text-soft sm:grid-cols-2">
            <p className="flex gap-2"><MapPin className="shrink-0 text-brand-400" /> <span>{store.mall_location}<br /><span className="text-text-faint">{store.address}</span></span></p>
            <p className="flex gap-2"><Clock className="shrink-0 text-brand-400" /> {store.hours}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10">
        <section>
          <h2 className="mb-4 text-2xl font-extrabold">Serviços</h2>
          <div className="space-y-3">
            {services.map((s) => <ServiceCard key={s.id} s={s} store={store} />)}
          </div>
        </section>

        {photos.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-extrabold">Nossa loja e trabalhos</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((p) => (
                <figure key={p.id} className="overflow-hidden rounded-xl bg-field">
                  <img src={p.url} alt={p.caption || `Foto de ${store.name}`} loading="lazy" className="aspect-square w-full object-cover" />
                  {p.caption && <figcaption className="p-2 text-sm text-text-soft">{p.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-field p-5">
          <h2 className="mb-2 text-xl font-extrabold">Sobre</h2>
          <p className="text-text-soft">{store.about}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {store.google_business_url && (
              <a className="btn-secondary" href={store.google_business_url} target="_blank" rel="noreferrer"><Star size={18} /> Avalie no Google</a>
            )}
            {store.instagram && (
              <a className="btn-secondary" href={`https://instagram.com/${store.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"><Instagram size={18} /> {store.instagram}</a>
            )}
          </div>
        </section>

        <TrackBox />
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-text-soft">
        {store.name} · {store.address} · {store.city}
      </footer>
    </div>
  );
}

function ServiceCard({ s, store }: { s: ShowcaseService; store: StoreSettings }) {
  const phone = s.whatsapp || store.whatsapp;
  return (
    <article className="flex flex-col gap-3 rounded-2xl border-2 border-border p-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-field text-primary"><LineIcon line={s.line} size={26} /></span>
        <div>
          <h3 className="text-lg font-bold">{s.title}</h3>
          <p className="text-text-soft">{s.description}</p>
          {s.price_from != null && <p className="mt-1 font-semibold text-text-strong">A partir de {brl(s.price_from)}</p>}
        </div>
      </div>
      <a className="btn-whatsapp shrink-0" href={waLink(phone, `Olá! Gostaria de saber sobre: ${s.title}.`)} target="_blank" rel="noreferrer">
        <MessageCircle size={20} /> WhatsApp
      </a>
    </article>
  );
}

function TrackBox() {
  const [code, setCode] = useState('');
  const nav = useNavigate();
  return (
    <section className="rounded-2xl border-2 border-dashed border-border p-5">
      <h2 className="flex items-center gap-2 text-lg font-extrabold"><Search size={20} /> Já deixou um serviço?</h2>
      <p className="text-text-soft">Digite o código do seu comprovante para acompanhar.</p>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (code.trim()) nav(`/acompanhar/${code.trim().toUpperCase()}`); }}>
        <input className="input uppercase" placeholder="Ex.: K7M2Q9XA" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Código do comprovante" />
        <button className="btn-primary">Acompanhar</button>
      </form>
    </section>
  );
}

/** Título, descrição e dados estruturados (schema.org/Locksmith) para busca local. */
function useSeo(store?: StoreSettings, services?: ShowcaseService[]) {
  useEffect(() => {
    if (!store) return;
    document.title = `${store.name} — Chaveiro em ${store.city}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', `${store.tagline}. ${store.mall_location}. ${store.hours}.`);
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Locksmith',
      name: store.name,
      description: store.about,
      telephone: `+55${store.whatsapp.replace(/\D/g, '')}`,
      address: { '@type': 'PostalAddress', streetAddress: store.address, addressLocality: store.city, addressCountry: 'BR' },
      openingHours: store.hours,
      url: window.location.origin,
      sameAs: [store.google_business_url, store.instagram && `https://instagram.com/${store.instagram.replace('@', '')}`].filter(Boolean),
      makesOffer: (services ?? []).map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: s.description } })),
    };
    let el = document.getElementById('ld-business') as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = 'ld-business';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(ld);
  }, [store, services]);
}
