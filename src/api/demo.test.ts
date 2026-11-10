import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoApi, memoryKV } from './demo';
import type { Api } from './types';
import { withRules } from './withRules';

let api: Api;

beforeEach(() => {
  // Mesma montagem do app: regras de negócio por cima do adaptador.
  api = withRules(createDemoApi(memoryKV()));
});

describe('API demo', () => {
  it('exige login para ler ordens', async () => {
    await expect(api.listOrders()).rejects.toThrow(/permissão/);
  });

  it('cria ordem com sinal, registra histórico e bloqueia transição inválida', async () => {
    const me = await api.signIn('ana@demo.com', 'demo123');
    const c = await api.saveCustomer({ name: 'Cliente Teste', phone: '11900001111' });
    const o = await api.createOrder({
      customer_id: c.id, vehicle_id: null, line: 'copia', description: '2 cópias', price: 30,
      due_at: new Date(Date.now() + 3_600_000).toISOString(), assignee_id: me.id, deposit: 10, deposit_method: 'pix',
    });

    const full = await api.getOrder(o.id);
    expect(full?.paid).toBe(10);
    expect(full?.status).toBe('recebido');

    await api.changeStatus(o.id, 'em_andamento');
    await api.changeStatus(o.id, 'pronto', 'Feito');
    await expect(api.changeStatus(o.id, 'recebido')).rejects.toThrow(/não permitida/);

    const events = await api.listEvents(o.id);
    expect(events.map((e) => [e.from_status, e.to_status])).toEqual([
      [null, 'recebido'],
      ['recebido', 'em_andamento'],
      ['em_andamento', 'pronto'],
    ]);
    expect(events[2]).toMatchObject({ user_name: 'Ana', note: 'Feito' });
    expect((await api.getOrder(o.id))?.ready_at).not.toBeNull();
  });

  it('acompanhamento público mostra só o necessário', async () => {
    await api.signIn('ana@demo.com', 'demo123');
    const [o] = await api.listOrders();
    await api.signOut();
    const pub = await api.getPublicOrder(o.code.toLowerCase());
    expect(pub?.number).toBe(o.number);
    expect(pub?.customer_first_name).toBe(o.customer.name.split(' ')[0]);
    expect(pub).not.toHaveProperty('customer_id');
    expect(await api.getPublicOrder('NAOEXISTE')).toBeNull();
  });

  it('atendente não edita mensagens nem usuários; admin sim', async () => {
    await api.signIn('ana@demo.com', 'demo123');
    await expect(api.saveTemplate({ key: 'pronto', title: 'x', body: 'y' })).rejects.toThrow(/administrador/);
    const users = await api.listProfiles();
    await expect(api.updateProfile(users[1].id, { active: false })).rejects.toThrow(/administrador/);

    await api.signIn('dono@demo.com', 'demo123');
    await api.saveTemplate({ key: 'pronto', title: 'Pronto', body: 'Oi {cliente}' });
    expect((await api.listTemplates()).find((t) => t.key === 'pronto')?.body).toBe('Oi {cliente}');
  });

  it('busca cliente por placa', async () => {
    await api.signIn('ana@demo.com', 'demo123');
    const hits = await api.searchCustomers('fbr-3a');
    expect(hits[0]?.customer.name).toBe('João Pereira');
    expect(hits[0]?.matchedPlate).toBe('FBR3A21');
  });

  it('novo cadastro fica pendente até o admin liberar', async () => {
    const r = await api.signUp('Novo', 'novo@demo.com', 'segredo1');
    expect(r.needsApproval).toBe(true);
    const u = await api.signIn('novo@demo.com', 'segredo1');
    expect(u.active).toBe(false);
    await expect(api.listOrders()).rejects.toThrow(/permissão/);
  });
});
