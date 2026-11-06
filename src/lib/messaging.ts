import { onlyDigits } from './format';

/**
 * Canal de mensagens. Hoje: links wa.me (sem custo e sem risco de banimento).
 * Um robô de WhatsApp (roadmap) pode implementar a mesma interface no futuro.
 */
export interface MessageChannel {
  id: string;
  label: string;
  send(phone: string, text: string): void | Promise<void>;
}

/** Normaliza para o formato internacional do wa.me (Brasil: 55 + DDD + número). */
export function toWhatsAppNumber(phone: string): string | null {
  const d = onlyDigits(phone);
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return null;
}

export function waLink(phone: string, text?: string): string {
  const n = toWhatsAppNumber(phone) ?? onlyDigits(phone);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export const whatsappLinkChannel: MessageChannel = {
  id: 'whatsapp-link',
  label: 'WhatsApp',
  send(phone, text) {
    window.open(waLink(phone, text), '_blank', 'noopener');
  },
};

export const messageChannel: MessageChannel = whatsappLinkChannel;
