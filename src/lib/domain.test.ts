import { describe, expect, it } from 'vitest';
import { canTransition, groupForPanel, isOnTime, renderTemplate, urgencyOf } from './domain';
import { normalizePlate, parseMoney, relativeDue } from './format';
import { toWhatsAppNumber, waLink } from './messaging';

const now = new Date(2026, 10, 5, 14, 0); // 05/11/2026 14:00
const at = (d: number, h: number) => new Date(2026, 10, 5 + d, h, 0).toISOString();

describe('urgência do painel', () => {
  it('classifica atrasada, hoje, amanhã e próximas', () => {
    expect(urgencyOf({ status: 'recebido', due_at: at(0, 10) }, now)).toBe('atrasada');
    expect(urgencyOf({ status: 'em_andamento', due_at: at(0, 18) }, now)).toBe('hoje');
    expect(urgencyOf({ status: 'recebido', due_at: at(1, 9) }, now)).toBe('amanha');
    expect(urgencyOf({ status: 'aguardando_peca', due_at: at(4, 9) }, now)).toBe('proximas');
  });
  it('pronta e encerradas não contam como atrasadas', () => {
    expect(urgencyOf({ status: 'pronto', due_at: at(-2, 9) }, now)).toBe('pronta');
    expect(urgencyOf({ status: 'entregue', due_at: at(-2, 9) }, now)).toBe('fechada');
    expect(urgencyOf({ status: 'cancelado', due_at: at(-2, 9) }, now)).toBe('fechada');
  });
  it('agrupa e ordena por prazo', () => {
    const g = groupForPanel(
      [
        { status: 'recebido', due_at: at(0, 20) },
        { status: 'recebido', due_at: at(0, 16) },
        { status: 'recebido', due_at: at(-1, 9) },
      ] as const,
      now,
    );
    expect(g.atrasada).toHaveLength(1);
    expect(g.hoje.map((o) => o.due_at)).toEqual([at(0, 16), at(0, 20)]);
  });
});

describe('transições de status', () => {
  it('segue o fluxo permitido', () => {
    expect(canTransition('recebido', 'em_andamento')).toBe(true);
    expect(canTransition('pronto', 'entregue')).toBe(true);
    expect(canTransition('entregue', 'recebido')).toBe(false);
    expect(canTransition('recebido', 'entregue')).toBe(false);
    expect(canTransition('cancelado', 'recebido')).toBe(true);
  });
});

describe('cumprimento de prazo', () => {
  it('considera o momento em que ficou pronta', () => {
    expect(isOnTime({ status: 'entregue', due_at: at(0, 18), ready_at: at(0, 17), delivered_at: at(1, 10) })).toBe(true);
    expect(isOnTime({ status: 'pronto', due_at: at(0, 18), ready_at: at(0, 19), delivered_at: null })).toBe(false);
    expect(isOnTime({ status: 'em_andamento', due_at: at(0, 18), ready_at: null, delivered_at: null })).toBeNull();
  });
});

describe('mensagens', () => {
  it('preenche variáveis e mantém as desconhecidas', () => {
    expect(renderTemplate('Olá, {cliente}! Nº {numero} {x}', { cliente: 'Maria', numero: '1001' })).toBe('Olá, Maria! Nº 1001 {x}');
  });
  it('normaliza telefone para wa.me', () => {
    expect(toWhatsAppNumber('(11) 98765-4321')).toBe('5511987654321');
    expect(toWhatsAppNumber('+55 11 98765-4321')).toBe('5511987654321');
    expect(toWhatsAppNumber('123')).toBeNull();
    expect(waLink('11987654321', 'oi tudo bem?')).toBe('https://wa.me/5511987654321?text=oi%20tudo%20bem%3F');
  });
});

describe('formatação', () => {
  it('entende valores em reais', () => {
    expect(parseMoney('1.234,56')).toBe(1234.56);
    expect(parseMoney('35,5')).toBe(35.5);
    expect(parseMoney('35.50')).toBe(35.5);
    expect(parseMoney('')).toBe(0);
  });
  it('normaliza placa', () => {
    expect(normalizePlate('abc-1d23')).toBe('ABC1D23');
  });
  it('descreve prazo relativo', () => {
    expect(relativeDue(at(0, 11), now)).toBe('atrasada há 3h');
    expect(relativeDue(at(0, 18), now)).toMatch(/^hoje às 18:00/);
    expect(relativeDue(at(1, 10), now)).toMatch(/^amanhã às 10:00/);
  });
});
