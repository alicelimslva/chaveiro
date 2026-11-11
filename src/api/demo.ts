import type {
  Customer,
  MessageTemplate,
  Order,
  OrderEvent,
  OrderFull,
  Payment,
  Profile,
  ShowcasePhoto,
  ShowcaseService,
  StoreSettings,
  Vehicle,
} from '../types';
import { canTransition, generateCode } from '../lib/domain';
import { normalizePlate, onlyDigits } from '../lib/format';
import { blobToDataUrl, compressImage } from '../lib/image';
import type { Api } from './types';
import { DEFAULT_SERVICES, DEFAULT_STORE, DEFAULT_TEMPLATES } from './defaults';

/**
 * MODO DEMO: todos os dados ficam no navegador (localStorage).
 * Serve para testar o sistema sem configurar o Supabase.
 * Regras de permissão são verificadas aqui do mesmo jeito que a RLS faz no banco.
 */

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

interface DemoUser extends Profile {
  password: string;
}

interface DemoDB {
  users: DemoUser[];
  customers: Customer[];
  vehicles: Vehicle[];
  orders: Order[];
  events: OrderEvent[];
  payments: Payment[];
  templates: MessageTemplate[];
  store: StoreSettings;
  services: ShowcaseService[];
  photos: ShowcasePhoto[];
  seq: number;
}

const DB_KEY = 'chaveiro-demo-db-v1';
const SESSION_KEY = 'chaveiro-demo-session';
const uid = () => globalThis.crypto.randomUUID();

export function memoryKV(): KV {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

export function seedDemo(now = new Date()): DemoDB {
  const h = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();
  const at = (dayOffset: number, hour: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, 0).toISOString();

  const admin: DemoUser = { id: uid(), name: 'Carlos (dono)', email: 'dono@demo.com', role: 'admin', active: true, password: 'demo123' };
  const ana: DemoUser = { id: uid(), name: 'Ana', email: 'ana@demo.com', role: 'atendente', active: true, password: 'demo123' };
  const bruno: DemoUser = { id: uid(), name: 'Bruno', email: 'bruno@demo.com', role: 'atendente', active: true, password: 'demo123' };
  const julia: DemoUser = { id: uid(), name: 'Júlia', email: 'julia@demo.com', role: 'atendente', active: true, password: 'demo123' };

  const c = (name: string, phone: string, notes: string | null = null): Customer => ({
    id: uid(), name, phone, email: null, notes, created_at: h(-24 * 30),
  });
  const maria = c('Maria Souza', '11987654321', 'Prefere contato à tarde.');
  const joao = c('João Pereira', '11912345678');
  const padaria = c('Padaria Pão Quente', '1133334444', 'Cliente empresa — carimbos com CNPJ.');
  const rafa = c('Rafael Lima', '11955556666');
  const lu = c('Luciana Alves', '11944443333');

  const gol: Vehicle = { id: uid(), customer_id: joao.id, brand: 'Volkswagen', model: 'Gol', year: 2016, plate: 'FBR3A21', key_type: 'Canivete', transponder: 'ID48', notes: null };
  const onix: Vehicle = { id: uid(), customer_id: rafa.id, brand: 'Chevrolet', model: 'Onix', year: 2020, plate: 'GHI4B56', key_type: 'Canivete com telecomando', transponder: 'ID46 (PCF7941)', notes: 'Já fez 1 cópia em 2024.' };

  const db: DemoDB = {
    users: [admin, ana, bruno, julia],
    customers: [maria, joao, padaria, rafa, lu],
    vehicles: [gol, onix],
    orders: [],
    events: [],
    payments: [],
    templates: DEFAULT_TEMPLATES.map((t) => ({ ...t })),
    store: { ...DEFAULT_STORE },
    services: DEFAULT_SERVICES.map((s) => ({ ...s, id: uid() })),
    photos: [],
    seq: 1000,
  };

  const mk = (
    customer: Customer, line: Order['line'], description: string, price: number, due: string,
    assignee: DemoUser, status: Order['status'], createdHoursAgo: number, deposit = 0, vehicle: Vehicle | null = null,
  ) => {
    const created = h(-createdHoursAgo);
    const o: Order = {
      id: uid(), number: ++db.seq, code: generateCode(), customer_id: customer.id, vehicle_id: vehicle?.id ?? null,
      line, description, price, due_at: due, assignee_id: assignee.id, status, created_by: assignee.id,
      created_at: created, updated_at: created, ready_at: null, delivered_at: null,
    };
    db.orders.push(o);
    db.events.push({ id: uid(), order_id: o.id, from_status: null, to_status: 'recebido', user_id: assignee.id, user_name: assignee.name, note: 'Ordem aberta', created_at: created });
    if (status !== 'recebido') {
      const t = h(-createdHoursAgo / 2);
      db.events.push({ id: uid(), order_id: o.id, from_status: 'recebido', to_status: status, user_id: assignee.id, user_name: assignee.name, note: null, created_at: t });
      if (status === 'pronto' || status === 'entregue') o.ready_at = t;
      if (status === 'entregue') o.delivered_at = t;
    }
    if (deposit > 0) db.payments.push({ id: uid(), order_id: o.id, amount: deposit, method: 'pix', kind: 'sinal', created_by: assignee.id, created_at: created });
    if (status === 'entregue' && price - deposit > 0)
      db.payments.push({ id: uid(), order_id: o.id, amount: price - deposit, method: 'cartao_debito', kind: 'pagamento', created_by: assignee.id, created_at: o.delivered_at! });
    return o;
  };

  mk(rafa, 'automotiva', 'Cópia chave canivete Onix com telecomando', 380, h(-5), bruno, 'aguardando_peca', 50, 150, onix);
  mk(padaria, 'carimbo', 'Carimbo automático CNPJ 38x14mm', 85, h(-2), julia, 'em_andamento', 26, 40);
  // "Hoje": algumas horas à frente, sem passar da meia-noite.
  const today = (hours: number) => {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 50).getTime();
    return new Date(Math.min(now.getTime() + hours * 3_600_000, Math.max(end, now.getTime() + 5 * 60_000))).toISOString();
  };
  mk(maria, 'controle', '2 controles portão Garen 433MHz', 120, today(3), ana, 'recebido', 3, 60);
  mk(lu, 'copia', '6 cópias tetra + 2 gorges', 96, today(5), ana, 'em_andamento', 1);
  mk(joao, 'automotiva', 'Chave reserva Gol com transponder ID48', 290, at(1, 15), bruno, 'recebido', 2, 100, gol);
  mk(padaria, 'carimbo', 'Carimbo de bolso nome + CRN', 60, at(3, 12), julia, 'recebido', 1);
  mk(maria, 'copia', '3 cópias residenciais', 36, h(-1), ana, 'pronto', 4);
  mk(rafa, 'abertura', 'Abertura porta residencial', 150, h(-48), bruno, 'entregue', 60, 0);
  mk(lu, 'controle', 'Controle alarme Positron', 70, h(-30), ana, 'entregue', 72, 0);
  mk(joao, 'copia', '2 cópias cadeado', 24, h(-100), julia, 'entregue', 120, 0);
  return db;
}

export function createDemoApi(storage: KV): Api {
  const load = (): DemoDB => {
    const raw = storage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw) as DemoDB;
    const db = seedDemo();
    storage.setItem(DB_KEY, JSON.stringify(db));
    return db;
  };
  const save = (db: DemoDB) => storage.setItem(DB_KEY, JSON.stringify(db));
  const strip = ({ password: _p, ...p }: DemoUser): Profile => p;

  const me = (db: DemoDB): Profile | null => {
    const id = storage.getItem(SESSION_KEY);
    const u = db.users.find((x) => x.id === id);
    return u ? strip(u) : null;
  };
  const staff = (db: DemoDB) => {
    const u = me(db);
    if (!u || !u.active) throw new Error('Sem permissão: faça login com um usuário ativo.');
    return u;
  };
  const admin = (db: DemoDB) => {
    const u = staff(db);
    if (u.role !== 'admin') throw new Error('Apenas o administrador pode fazer isso.');
    return u;
  };

  const full = (db: DemoDB, o: Order): OrderFull => ({
    ...o,
    customer: db.customers.find((c) => c.id === o.customer_id)!,
    vehicle: db.vehicles.find((v) => v.id === o.vehicle_id) ?? null,
    assignee: (() => {
      const u = db.users.find((x) => x.id === o.assignee_id);
      return u ? strip(u) : null;
    })(),
    paid: db.payments.filter((p) => p.order_id === o.id).reduce((s, p) => s + p.amount, 0),
  });

  const addEvent = (db: DemoDB, o: Order, from: Order['status'] | null, to: Order['status'], user: Profile, note: string | null) =>
    db.events.push({ id: uid(), order_id: o.id, from_status: from, to_status: to, user_id: user.id, user_name: user.name, note, created_at: new Date().toISOString() });

  return {
    mode: 'demo',

    async currentUser() {
      return me(load());
    },
    async signIn(email, password) {
      const db = load();
      const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
      if (!u) throw new Error('E-mail ou senha inválidos.');
      storage.setItem(SESSION_KEY, u.id);
      return strip(u);
    },
    async signUp(name, email, password) {
      const db = load();
      if (db.users.some((x) => x.email.toLowerCase() === email.toLowerCase())) throw new Error('Já existe um usuário com este e-mail.');
      db.users.push({ id: uid(), name, email, password, role: 'atendente', active: false });
      save(db);
      return { needsApproval: true, needsEmailConfirm: false };
    },
    async signOut() {
      storage.removeItem(SESSION_KEY);
    },
    async changePassword(current, next) {
      const db = load();
      const u = db.users.find((x) => x.id === staff(db).id)!;
      if (u.password !== current) throw new Error('Senha atual incorreta.');
      u.password = next;
      save(db);
    },

    async listProfiles() {
      const db = load();
      staff(db);
      return db.users.map(strip);
    },
    async updateProfile(id, patch) {
      const db = load();
      admin(db);
      const target = db.users.find((x) => x.id === id);
      if (!target) throw new Error('Usuário não encontrado.');
      Object.assign(target, patch);
      save(db);
    },

    async searchCustomers(q) {
      const db = load();
      staff(db);
      const term = q.trim().toLowerCase();
      if (!term) return [];
      const digits = onlyDigits(term);
      const plate = normalizePlate(term);
      const hits = new Map<string, string | null>();
      for (const c of db.customers) {
        if (c.name.toLowerCase().includes(term) || (digits.length >= 3 && onlyDigits(c.phone).includes(digits))) hits.set(c.id, null);
      }
      if (plate.length >= 3) for (const v of db.vehicles) if (normalizePlate(v.plate).includes(plate)) hits.set(v.customer_id, v.plate);
      return [...hits.entries()].slice(0, 8).map(([id, matchedPlate]) => ({ customer: db.customers.find((c) => c.id === id)!, matchedPlate }));
    },
    async listCustomers() {
      const db = load();
      staff(db);
      return [...db.customers].sort((a, b) => a.name.localeCompare(b.name));
    },
    async getCustomer(id) {
      const db = load();
      staff(db);
      return db.customers.find((c) => c.id === id) ?? null;
    },
    async saveCustomer(input) {
      const db = load();
      staff(db);
      if (input.id) {
        const c = db.customers.find((x) => x.id === input.id)!;
        Object.assign(c, input);
        save(db);
        return c;
      }
      const c: Customer = { email: null, notes: null, ...input, id: uid(), created_at: new Date().toISOString() };
      db.customers.push(c);
      save(db);
      return c;
    },
    async listVehicles(customerId) {
      const db = load();
      staff(db);
      return db.vehicles.filter((v) => v.customer_id === customerId);
    },
    async saveVehicle(input) {
      const db = load();
      staff(db);
      const data = { ...input, plate: normalizePlate(input.plate ?? '') };
      if (input.id) {
        const v = db.vehicles.find((x) => x.id === input.id)!;
        Object.assign(v, data);
        save(db);
        return v;
      }
      const v: Vehicle = { brand: '', model: '', year: null, key_type: '', transponder: '', notes: null, ...data, id: uid() };
      db.vehicles.push(v);
      save(db);
      return v;
    },
    async deleteVehicle(id) {
      const db = load();
      admin(db);
      db.vehicles = db.vehicles.filter((v) => v.id !== id);
      db.orders.forEach((o) => o.vehicle_id === id && (o.vehicle_id = null));
      save(db);
    },

    async listOrders(filter = {}) {
      const db = load();
      staff(db);
      return db.orders
        .filter((o) => !filter.statuses || filter.statuses.includes(o.status))
        .filter((o) => !filter.customerId || o.customer_id === filter.customerId)
        .filter((o) => !filter.since || o.created_at >= filter.since)
        .map((o) => full(db, o))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async getOrder(id) {
      const db = load();
      staff(db);
      const o = db.orders.find((x) => x.id === id);
      return o ? full(db, o) : null;
    },
    async createOrder(input) {
      const db = load();
      const u = staff(db);
      const now = new Date().toISOString();
      const { deposit, deposit_method, ...rest } = input;
      const o: Order = { ...rest, id: uid(), number: ++db.seq, code: generateCode(), status: 'recebido', created_by: u.id, created_at: now, updated_at: now, ready_at: null, delivered_at: null };
      db.orders.push(o);
      addEvent(db, o, null, 'recebido', u, 'Ordem aberta');
      if (deposit > 0) db.payments.push({ id: uid(), order_id: o.id, amount: deposit, method: deposit_method, kind: 'sinal', created_by: u.id, created_at: now });
      save(db);
      return o;
    },
    async updateOrder(id, patch) {
      const db = load();
      staff(db);
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new Error('Ordem não encontrada.');
      Object.assign(o, patch, { updated_at: new Date().toISOString() });
      save(db);
    },
    async changeStatus(id, to, note) {
      const db = load();
      const u = staff(db);
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new Error('Ordem não encontrada.');
      if (!canTransition(o.status, to)) throw new Error('Mudança de status não permitida.');
      const from = o.status;
      const now = new Date().toISOString();
      o.status = to;
      o.updated_at = now;
      if (to === 'pronto' && !o.ready_at) o.ready_at = now;
      if (to === 'entregue') {
        o.delivered_at = now;
        o.ready_at ??= now;
      }
      addEvent(db, o, from, to, u, note?.trim() || null);
      save(db);
    },
    async addOrderNote(id, note) {
      const db = load();
      const u = staff(db);
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new Error('Ordem não encontrada.');
      addEvent(db, o, o.status, o.status, u, note);
      save(db);
    },
    async listEvents(orderId) {
      const db = load();
      staff(db);
      return db.events.filter((e) => e.order_id === orderId).sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    async listPayments(orderId) {
      const db = load();
      staff(db);
      return db.payments.filter((p) => p.order_id === orderId).sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    async listPaymentsSince(since) {
      const db = load();
      admin(db);
      return db.payments
        .filter((p) => p.created_at >= since)
        .map((p) => ({ ...p, line: db.orders.find((o) => o.id === p.order_id)!.line }));
    },
    async addPayment(orderId, amount, method, kind) {
      const db = load();
      const u = staff(db);
      db.payments.push({ id: uid(), order_id: orderId, amount, method, kind, created_by: u.id, created_at: new Date().toISOString() });
      save(db);
    },

    async getPublicOrder(code) {
      const db = load();
      const o = db.orders.find((x) => x.code === code.trim().toUpperCase());
      if (!o) return null;
      const f = full(db, o);
      return {
        code: o.code, number: o.number, line: o.line, description: o.description, status: o.status,
        due_at: o.due_at, created_at: o.created_at, ready_at: o.ready_at, delivered_at: o.delivered_at,
        price: o.price, paid: f.paid, customer_first_name: f.customer.name.split(' ')[0],
        events: db.events
          .filter((e) => e.order_id === o.id && e.from_status !== e.to_status)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((e) => ({ to_status: e.to_status, created_at: e.created_at })),
      };
    },

    async listTemplates() {
      const db = load();
      staff(db);
      return db.templates;
    },
    async saveTemplate(t) {
      const db = load();
      admin(db);
      const i = db.templates.findIndex((x) => x.key === t.key);
      if (i >= 0) db.templates[i] = t;
      else db.templates.push(t);
      save(db);
    },

    async getStore() {
      return load().store;
    },
    async saveStore(s) {
      const db = load();
      admin(db);
      db.store = s;
      save(db);
    },
    async listShowcaseServices(includeInactive = false) {
      return load().services.filter((s) => includeInactive || s.active).sort((a, b) => a.sort - b.sort);
    },
    async saveShowcaseService(s) {
      const db = load();
      admin(db);
      if (s.id) Object.assign(db.services.find((x) => x.id === s.id)!, s);
      else db.services.push({ description: '', price_from: null, whatsapp: '', sort: db.services.length + 1, active: true, ...s, id: uid() });
      save(db);
    },
    async deleteShowcaseService(id) {
      const db = load();
      admin(db);
      db.services = db.services.filter((s) => s.id !== id);
      save(db);
    },
    async listPhotos() {
      return [...load().photos].sort((a, b) => a.sort - b.sort);
    },
    async uploadPhoto(file, caption) {
      const db = load();
      admin(db);
      const blob = await compressImage(file, 1000, 0.75);
      const url = await blobToDataUrl(blob);
      db.photos.push({ id: uid(), url, caption, sort: db.photos.length + 1 });
      try {
        save(db);
      } catch {
        throw new Error('Espaço do modo demo esgotado. No Supabase as fotos vão para o Storage.');
      }
    },
    async deletePhoto(id) {
      const db = load();
      admin(db);
      db.photos = db.photos.filter((p) => p.id !== id);
      save(db);
    },
  };
}

export function resetDemo(storage: KV) {
  storage.removeItem(DB_KEY);
  storage.removeItem(SESSION_KEY);
}
