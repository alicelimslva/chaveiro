import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Customer, MessageTemplate, Order, OrderEvent, OrderFull, Payment, Profile, PublicOrder, ShowcasePhoto, Vehicle } from '../types';
import { normalizePlate, onlyDigits } from '../lib/format';
import { compressImage } from '../lib/image';
import { DEFAULT_STORE } from './defaults';
import type { Api } from './types';

const BUCKET = 'vitrine';

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const ORDER_SELECT = '*, customer:customers(*), vehicle:vehicles(*), assignee:profiles!orders_assignee_id_fkey(*), payments(amount)';

type OrderRow = Order & { customer: Customer; vehicle: Vehicle | null; assignee: Profile | null; payments: { amount: number }[] };

const toFull = (r: OrderRow): OrderFull => {
  const { payments, ...rest } = r;
  return {
    ...rest,
    price: Number(rest.price),
    paid: (payments ?? []).reduce((s, p) => s + Number(p.amount), 0),
  };
};

export function createSupabaseApi(url: string, anonKey: string): Api {
  const sb: SupabaseClient = createClient(url, anonKey, { auth: { persistSession: true } });

  const profileOf = async (id: string): Promise<Profile | null> =>
    check(await sb.from('profiles').select('*').eq('id', id).maybeSingle()) as Profile | null;

  return {
    mode: 'supabase',

    async currentUser() {
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      return profileOf(data.session.user.id);
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : error.message);
      const p = await profileOf(data.user.id);
      if (!p) {
        await sb.auth.signOut();
        throw new Error('Seu login existe, mas o perfil não foi criado. Peça ao administrador para rodar a migração de correção no Supabase.');
      }
      return p;
    },
    async signUp(name, email, password) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
      if (error) {
        if (/already registered|already exists/i.test(error.message)) throw new Error('Já existe um cadastro com este e-mail. Use "Entrar".');
        throw new Error(error.message);
      }
      // Com confirmação de e-mail ligada, o Supabase não acusa e-mail repetido: devolve um usuário sem identidades.
      if (data.user && data.user.identities?.length === 0) throw new Error('Já existe um cadastro com este e-mail. Use "Entrar".');
      const p = data.user && data.session ? await profileOf(data.user.id) : null;
      return { needsApproval: !p?.active, needsEmailConfirm: !data.session };
    },
    async signOut() {
      await sb.auth.signOut();
    },

    async listProfiles() {
      return check(await sb.from('profiles').select('*').order('name')) as Profile[];
    },
    async updateProfile(id, patch) {
      // Sem .select() o RLS bloqueia em silêncio (0 linhas, sem erro) e a tela mostraria "liberado".
      const rows = check(await sb.from('profiles').update(patch).eq('id', id).select('id')) as { id: string }[];
      if (!rows.length) throw new Error('Não foi possível alterar este usuário. Confirme que você está logado como administrador ativo.');
    },

    async searchCustomers(q) {
      const term = q.trim();
      if (!term) return [];
      const digits = onlyDigits(term);
      const plate = normalizePlate(term);
      const safe = term.replace(/[%,()]/g, ' ');
      const ors = [`name.ilike.%${safe}%`];
      if (digits.length >= 3) ors.push(`phone.ilike.%${digits}%`);
      const [byCustomer, byPlate] = await Promise.all([
        sb.from('customers').select('*').or(ors.join(',')).limit(8),
        plate.length >= 3 ? sb.from('vehicles').select('plate, customer:customers(*)').ilike('plate', `%${plate}%`).limit(8) : Promise.resolve({ data: [], error: null }),
      ]);
      const hits = new Map<string, { customer: Customer; matchedPlate: string | null }>();
      for (const c of (check(byCustomer) ?? []) as Customer[]) hits.set(c.id, { customer: c, matchedPlate: null });
      for (const v of (check(byPlate) ?? []) as unknown as { plate: string; customer: Customer }[])
        if (v.customer) hits.set(v.customer.id, { customer: v.customer, matchedPlate: v.plate });
      return [...hits.values()].slice(0, 8);
    },
    async listCustomers() {
      return check(await sb.from('customers').select('*').order('name')) as Customer[];
    },
    async getCustomer(id) {
      return check(await sb.from('customers').select('*').eq('id', id).maybeSingle()) as Customer | null;
    },
    async saveCustomer(c) {
      const { id, created_at: _c, ...data } = c;
      const q = id ? sb.from('customers').update(data).eq('id', id) : sb.from('customers').insert(data);
      return check(await q.select().single()) as Customer;
    },
    async listVehicles(customerId) {
      return check(await sb.from('vehicles').select('*').eq('customer_id', customerId).order('created_at')) as Vehicle[];
    },
    async saveVehicle(v) {
      const { id, ...data } = v;
      if (data.plate !== undefined) data.plate = normalizePlate(data.plate);
      const q = id ? sb.from('vehicles').update(data).eq('id', id) : sb.from('vehicles').insert(data);
      return check(await q.select().single()) as Vehicle;
    },
    async deleteVehicle(id) {
      check(await sb.from('vehicles').delete().eq('id', id));
    },

    async listOrders(filter = {}) {
      let q = sb.from('orders').select(ORDER_SELECT).order('created_at', { ascending: false }).limit(500);
      if (filter.statuses) q = q.in('status', filter.statuses);
      if (filter.customerId) q = q.eq('customer_id', filter.customerId);
      if (filter.since) q = q.gte('created_at', filter.since);
      return (check(await q) as unknown as OrderRow[]).map(toFull);
    },
    async getOrder(id) {
      const r = check(await sb.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle()) as unknown as OrderRow | null;
      return r ? toFull(r) : null;
    },
    async createOrder(input) {
      const { deposit, deposit_method, ...data } = input;
      const o = check(await sb.from('orders').insert(data).select().single()) as Order;
      if (deposit > 0) check(await sb.from('payments').insert({ order_id: o.id, amount: deposit, method: deposit_method, kind: 'sinal' }));
      return o;
    },
    async updateOrder(id, patch) {
      check(await sb.from('orders').update(patch).eq('id', id));
    },
    async changeStatus(id, to, note) {
      check(await sb.rpc('change_order_status', { p_order_id: id, p_status: to, p_note: note ?? null }));
    },
    async addOrderNote(id, note) {
      check(await sb.rpc('add_order_note', { p_order_id: id, p_note: note }));
    },
    async listEvents(orderId) {
      const rows = check(
        await sb.from('order_events').select('*, user:profiles(name)').eq('order_id', orderId).order('created_at'),
      ) as (Omit<OrderEvent, 'user_name'> & { user: { name: string } | null })[];
      return rows.map(({ user, ...e }) => ({ ...e, user_name: user?.name ?? null }));
    },
    async listPayments(orderId) {
      const rows = check(await sb.from('payments').select('*').eq('order_id', orderId).order('created_at')) as Payment[];
      return rows.map((p) => ({ ...p, amount: Number(p.amount) }));
    },
    async listPaymentsSince(since) {
      const rows = check(await sb.from('payments').select('*, order:orders(line)').gte('created_at', since)) as (Payment & { order: { line: Order['line'] } })[];
      return rows.map(({ order, ...p }) => ({ ...p, amount: Number(p.amount), line: order.line }));
    },
    async addPayment(orderId, amount, method, kind) {
      check(await sb.from('payments').insert({ order_id: orderId, amount, method, kind }));
    },

    async getPublicOrder(code) {
      const data = check(await sb.rpc('get_public_order', { p_code: code })) as PublicOrder | null;
      return data ? { ...data, price: Number(data.price), paid: Number(data.paid) } : null;
    },

    async listTemplates() {
      return (check(await sb.from('message_templates').select('key, title, body').order('key')) ?? []) as MessageTemplate[];
    },
    async saveTemplate(t) {
      check(await sb.from('message_templates').upsert(t));
    },

    async getStore() {
      const s = check(await sb.from('store_settings').select('*').eq('id', 1).maybeSingle());
      return { ...DEFAULT_STORE, ...(s ?? {}) };
    },
    async saveStore(s) {
      check(await sb.from('store_settings').upsert({ id: 1, ...s }));
    },
    async listShowcaseServices(includeInactive = false) {
      let q = sb.from('showcase_services').select('*').order('sort');
      if (!includeInactive) q = q.eq('active', true);
      return (check(await q) as { price_from: number | null }[]).map((s) => ({ ...s, price_from: s.price_from == null ? null : Number(s.price_from) })) as never;
    },
    async saveShowcaseService(s) {
      check(await sb.from('showcase_services').upsert(s));
    },
    async deleteShowcaseService(id) {
      check(await sb.from('showcase_services').delete().eq('id', id));
    },
    async listPhotos() {
      const rows = check(await sb.from('showcase_photos').select('*').order('sort')) as { id: string; path: string; caption: string; sort: number }[];
      return rows.map((r): ShowcasePhoto => ({ id: r.id, caption: r.caption, sort: r.sort, url: sb.storage.from(BUCKET).getPublicUrl(r.path).data.publicUrl }));
    },
    async uploadPhoto(file, caption) {
      const blob = await compressImage(file);
      const path = `fotos/${crypto.randomUUID()}.jpg`;
      check(await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false }));
      check(await sb.from('showcase_photos').insert({ path, caption, sort: Date.now() % 1_000_000 }));
    },
    async deletePhoto(id) {
      const row = check(await sb.from('showcase_photos').select('path').eq('id', id).single()) as { path: string };
      check(await sb.storage.from(BUCKET).remove([row.path]));
      check(await sb.from('showcase_photos').delete().eq('id', id));
    },
  };
}
