export type Role = 'admin' | 'atendente';
export type ServiceLine = 'copia' | 'controle' | 'automotiva' | 'abertura' | 'carimbo';
export type OrderStatus = 'recebido' | 'em_andamento' | 'aguardando_peca' | 'pronto' | 'entregue' | 'cancelado';
export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito';
export type PaymentKind = 'sinal' | 'pagamento';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  brand: string;
  model: string;
  year: number | null;
  plate: string;
  key_type: string;
  transponder: string;
  notes: string | null;
}

export interface Order {
  id: string;
  number: number;
  code: string;
  customer_id: string;
  vehicle_id: string | null;
  line: ServiceLine;
  description: string;
  price: number;
  due_at: string;
  assignee_id: string;
  status: OrderStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  ready_at: string | null;
  delivered_at: string | null;
}

export interface OrderFull extends Order {
  customer: Customer;
  vehicle: Vehicle | null;
  assignee: Profile | null;
  paid: number;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  user_id: string | null;
  user_name: string | null;
  note: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  kind: PaymentKind;
  created_by: string | null;
  created_at: string;
}

export interface MessageTemplate {
  key: string;
  title: string;
  body: string;
}

export interface StoreSettings {
  name: string;
  tagline: string;
  city: string;
  address: string;
  mall_location: string;
  hours: string;
  whatsapp: string;
  instagram: string;
  google_maps_url: string;
  google_business_url: string;
  about: string;
}

export interface ShowcaseService {
  id: string;
  line: ServiceLine;
  title: string;
  description: string;
  price_from: number | null;
  whatsapp: string;
  sort: number;
  active: boolean;
}

export interface ShowcasePhoto {
  id: string;
  url: string;
  caption: string;
  sort: number;
}

export interface PublicOrder {
  code: string;
  number: number;
  line: ServiceLine;
  description: string;
  status: OrderStatus;
  due_at: string;
  created_at: string;
  ready_at: string | null;
  delivered_at: string | null;
  price: number;
  paid: number;
  customer_first_name: string;
  events: { to_status: OrderStatus; created_at: string }[];
}

export interface NewOrderInput {
  customer_id: string;
  vehicle_id: string | null;
  line: ServiceLine;
  description: string;
  price: number;
  due_at: string;
  assignee_id: string;
  deposit: number;
  deposit_method: PaymentMethod;
}

export interface CustomerHit {
  customer: Customer;
  matchedPlate: string | null;
}
