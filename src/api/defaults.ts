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
  // Chaves e Controles
  { line: 'copia', title: 'Cópia de Chave Simples', description: 'Cópia de chave comum (tipo Yale)', price_from: 15, price_type: 'fixo', whatsapp: '', sort: 1, active: true },
  { line: 'controle', title: 'Controle para Portão', description: 'Controle remoto para portão eletrônico', price_from: 50, price_type: 'a_partir_de', whatsapp: '', sort: 2, active: true },
  { line: 'copia', title: 'Cópia de Chave Tetra', description: 'Necessita avaliação do atendimento', price_from: null, price_type: 'sob_consulta', whatsapp: '', sort: 3, active: true },
  { line: 'copia', title: 'Cópia de Chave Gorge', description: 'Necessita avaliação do atendimento', price_from: null, price_type: 'sob_consulta', whatsapp: '', sort: 4, active: true },
  { line: 'copia', title: 'Cópia de Chave Codificada', description: 'Necessita avaliação do atendimento', price_from: null, price_type: 'sob_consulta', whatsapp: '', sort: 5, active: true },
  { line: 'copia', title: 'Cópia de Chave Multiponto', description: 'Necessita avaliação do atendimento', price_from: null, price_type: 'sob_consulta', whatsapp: '', sort: 6, active: true },
  { line: 'automotiva', title: 'Chave automotiva', description: 'Chave canivete, codificada e com transponder para diversas marcas.', price_from: 150, price_type: 'a_partir_de', whatsapp: '', sort: 7, active: true },
  { line: 'abertura', title: 'Abertura de portas e carros', description: 'Atendimento rápido para portas residenciais e veículos.', price_from: 90, price_type: 'a_partir_de', whatsapp: '', sort: 8, active: true },
  { line: 'carimbo', title: 'Carimbos', description: 'Carimbos automáticos e personalizados para empresas e profissionais.', price_from: 50, price_type: 'a_partir_de', whatsapp: '', sort: 9, active: true },
];
