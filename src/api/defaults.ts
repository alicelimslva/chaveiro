import type { MessageTemplate, ShowcaseService, StoreSettings } from '../types';

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    key: 'recebido',
    title: 'Ordem recebida',
    body: 'Olá, {cliente}! Recebemos seu serviço de {servico} (ordem nº {numero}). Prazo: {prazo}. Acompanhe por aqui: {link}\n{loja} — {local}',
  },
  {
    key: 'em_andamento',
    title: 'Em andamento',
    body: 'Olá, {cliente}! Seu serviço nº {numero} ({servico}) já está em andamento. Previsão: {prazo}. Acompanhe: {link}',
  },
  {
    key: 'aguardando_peca',
    title: 'Aguardando peça',
    body: 'Olá, {cliente}! Seu serviço nº {numero} está aguardando a chegada de uma peça. Avisaremos assim que chegar. Acompanhe: {link}',
  },
  {
    key: 'pronto',
    title: 'Pronto para retirar',
    body: 'Olá, {cliente}! Seu serviço nº {numero} ({servico}) está PRONTO. Saldo a pagar: {saldo}. Retire em {loja} — {local}. {link}',
  },
  {
    key: 'entregue',
    title: 'Entregue / agradecimento',
    body: 'Obrigado pela preferência, {cliente}! Se puder, avalie a {loja} no Google — isso ajuda muito a gente. 🙏',
  },
  {
    key: 'cancelado',
    title: 'Cancelado',
    body: 'Olá, {cliente}. A ordem nº {numero} foi cancelada. Qualquer dúvida, é só responder esta mensagem.',
  },
  {
    key: 'lembrete',
    title: 'Lembrete de retirada',
    body: 'Olá, {cliente}! Seu serviço nº {numero} continua pronto aguardando retirada em {loja} — {local}. Saldo: {saldo}.',
  },
];

export const DEFAULT_STORE: StoreSettings = {
  name: 'Chaveiro do Shopping',
  tagline: 'Chaves, controles e carimbos na hora — dentro do shopping',
  city: 'São Paulo - SP',
  address: 'Av. Exemplo, 1000 — Shopping Central',
  mall_location: 'Piso térreo, corredor B, ao lado da praça de alimentação',
  hours: 'Seg a sáb 10h–22h · Dom e feriados 14h–20h',
  whatsapp: '11999990000',
  instagram: '',
  google_maps_url: '',
  google_business_url: '',
  about: 'Mais de 10 anos fazendo cópias de chaves, controles de portão, chaves automotivas com transponder, aberturas e carimbos personalizados.',
};

export const DEFAULT_SERVICES: Omit<ShowcaseService, 'id'>[] = [
  { line: 'copia', title: 'Cópia de chaves', description: 'Residenciais, tetra, gorges e cadeados. Na hora.', price_from: 12, whatsapp: '', sort: 1, active: true },
  { line: 'controle', title: 'Controles de portão e alarme', description: 'Cópia e programação de controles de portão, garagem e alarme.', price_from: 45, whatsapp: '', sort: 2, active: true },
  { line: 'automotiva', title: 'Chave automotiva', description: 'Chave canivete, codificada e com transponder para diversas marcas.', price_from: 150, whatsapp: '', sort: 3, active: true },
  { line: 'abertura', title: 'Abertura de portas e carros', description: 'Atendimento rápido para portas residenciais e veículos.', price_from: 90, whatsapp: '', sort: 4, active: true },
  { line: 'carimbo', title: 'Carimbos', description: 'Carimbos automáticos e personalizados para empresas e profissionais.', price_from: 40, whatsapp: '', sort: 5, active: true },
];
