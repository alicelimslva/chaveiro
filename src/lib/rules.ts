// Regras de negócio puras (camada de domínio).
// Não importam React, Supabase nem o navegador: valem para qualquer adaptador
// e são testadas sem banco de dados.
import type { NewOrderInput, Profile } from '../types';

/** Erro de regra de negócio: a mensagem já está pronta para mostrar ao usuário. */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

const fail = (msg: string): never => {
  throw new DomainError(msg);
};

const isPositive = (n: number) => Number.isFinite(n) && n > 0;

export function assertCustomer(c: { name: string }) {
  if (!c.name?.trim()) fail('Informe o nome do cliente.');
}

export function assertNewOrder(o: NewOrderInput) {
  if (!o.customer_id) fail('Escolha o cliente da ordem.');
  if (!o.assignee_id) fail('Toda ordem precisa de um responsável.');
  if (!o.due_at || Number.isNaN(Date.parse(o.due_at))) fail('Informe o prazo prometido.');
  if (!(Number.isFinite(o.price) && o.price >= 0)) fail('O valor do serviço não pode ser negativo.');
  if (!(Number.isFinite(o.deposit) && o.deposit >= 0)) fail('O sinal não pode ser negativo.');
}

export function assertOrderPatch(p: { assignee_id?: string; price?: number; due_at?: string }) {
  if (p.assignee_id !== undefined && !p.assignee_id) fail('Toda ordem precisa de um responsável.');
  if (p.price !== undefined && !(Number.isFinite(p.price) && p.price >= 0)) fail('O valor do serviço não pode ser negativo.');
  if (p.due_at !== undefined && Number.isNaN(Date.parse(p.due_at))) fail('Informe o prazo prometido.');
}

export function assertPayment(amount: number) {
  if (!isPositive(amount)) fail('Informe um valor maior que zero.');
}

/** O administrador não pode tirar o próprio acesso (evita ficar sem nenhum admin). */
export const MIN_PASSWORD = 6;

export function assertNewPassword(current: string, next: string) {
  if (!current) fail('Informe a senha atual.');
  if ((next ?? '').length < MIN_PASSWORD) fail(`A senha nova precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
  if (next === current) fail('A senha nova precisa ser diferente da atual.');
}

export function assertProfileChange(actorId: string | undefined, targetId: string, patch: Partial<Pick<Profile, 'role' | 'active'>>) {
  if (actorId === targetId && (patch.role === 'atendente' || patch.active === false)) {
    fail('Você não pode remover o próprio acesso de administrador.');
  }
}
