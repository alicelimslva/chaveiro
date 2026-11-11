import { describe, expect, it } from 'vitest';
import type { NewOrderInput } from '../types';
import { assertCustomer, assertNewOrder, assertNewPassword, assertOrderPatch, assertPayment, assertProfileChange, DomainError } from './rules';

const order = (over: Partial<NewOrderInput> = {}): NewOrderInput => ({
  customer_id: 'c1', vehicle_id: null, line: 'copia', description: '', price: 30,
  due_at: new Date().toISOString(), assignee_id: 'u1', deposit: 0, deposit_method: 'pix', ...over,
});

describe('regras de negócio', () => {
  it('senha nova: exige a atual, mínimo de 6 e diferente da atual', () => {
    expect(() => assertNewPassword('', 'nova123')).toThrow(/senha atual/);
    expect(() => assertNewPassword('velha1', '12345')).toThrow(/pelo menos 6/);
    expect(() => assertNewPassword('velha1', 'velha1')).toThrow(/diferente/);
    expect(() => assertNewPassword('velha1', 'nova123')).not.toThrow();
  });

  it('cliente precisa de nome', () => {
    expect(() => assertCustomer({ name: '  ' })).toThrow(DomainError);
    expect(() => assertCustomer({ name: 'Ana' })).not.toThrow();
  });

  it('ordem precisa de cliente, responsável e prazo válido', () => {
    expect(() => assertNewOrder(order())).not.toThrow();
    expect(() => assertNewOrder(order({ customer_id: '' }))).toThrow(/cliente/);
    expect(() => assertNewOrder(order({ assignee_id: '' }))).toThrow(/responsável/);
    expect(() => assertNewOrder(order({ due_at: 'amanhã' }))).toThrow(/prazo/);
  });

  it('valores não podem ser negativos', () => {
    expect(() => assertNewOrder(order({ price: -1 }))).toThrow(/negativo/);
    expect(() => assertNewOrder(order({ deposit: -5 }))).toThrow(/negativo/);
    expect(() => assertNewOrder(order({ price: 0 }))).not.toThrow();
  });

  it('edição não pode tirar o responsável', () => {
    expect(() => assertOrderPatch({ assignee_id: '' })).toThrow(/responsável/);
    expect(() => assertOrderPatch({ description: 'x' } as never)).not.toThrow();
  });

  it('pagamento precisa ser maior que zero', () => {
    expect(() => assertPayment(0)).toThrow(/maior que zero/);
    expect(() => assertPayment(Number.NaN)).toThrow(DomainError);
    expect(() => assertPayment(10)).not.toThrow();
  });

  it('admin não remove o próprio acesso, mas pode alterar outros', () => {
    expect(() => assertProfileChange('a', 'a', { active: false })).toThrow(/próprio/);
    expect(() => assertProfileChange('a', 'a', { role: 'atendente' })).toThrow(/próprio/);
    expect(() => assertProfileChange('a', 'b', { active: false })).not.toThrow();
  });
});
