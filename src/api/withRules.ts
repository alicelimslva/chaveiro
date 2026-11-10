import { assertCustomer, assertNewOrder, assertOrderPatch, assertPayment, assertProfileChange } from '../lib/rules';
import type { Api } from './types';

/**
 * Casos de uso: aplica as regras de negócio antes de chegar ao adaptador
 * (demo ou Supabase). Assim os dois modos seguem exatamente as mesmas regras,
 * e o usuário recebe a mensagem em português em vez do erro cru do banco.
 */
export function withRules(api: Api): Api {
  return {
    ...api,
    async saveCustomer(c) {
      assertCustomer(c);
      return api.saveCustomer(c);
    },
    async createOrder(input) {
      assertNewOrder(input);
      return api.createOrder(input);
    },
    async updateOrder(id, patch) {
      assertOrderPatch(patch);
      return api.updateOrder(id, patch);
    },
    async addPayment(orderId, amount, method, kind) {
      assertPayment(amount);
      return api.addPayment(orderId, amount, method, kind);
    },
    async updateProfile(id, patch) {
      const me = await api.currentUser();
      assertProfileChange(me?.id, id, patch);
      return api.updateProfile(id, patch);
    },
  };
}
