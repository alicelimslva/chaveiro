import type {
  Customer,
  CustomerHit,
  MessageTemplate,
  NewOrderInput,
  Order,
  OrderEvent,
  OrderFull,
  OrderStatus,
  Payment,
  PaymentKind,
  PaymentMethod,
  Profile,
  PublicOrder,
  ShowcasePhoto,
  ShowcaseService,
  StoreSettings,
  Vehicle,
} from '../types';

export interface OrderFilter {
  statuses?: OrderStatus[];
  customerId?: string;
  /** ISO: só ordens criadas a partir desta data */
  since?: string;
}

export type CustomerInput = Partial<Customer> & { name: string; phone: string };
export type VehicleInput = Partial<Vehicle> & { customer_id: string };
export type OrderPatch = Partial<Pick<Order, 'description' | 'price' | 'due_at' | 'assignee_id' | 'vehicle_id' | 'line'>>;

/** Contrato único de dados — implementado pelo modo demo (navegador) e pelo Supabase. */
export interface Api {
  mode: 'demo' | 'supabase';

  // Autenticação
  currentUser(): Promise<Profile | null>;
  signIn(email: string, password: string): Promise<Profile>;
  signUp(name: string, email: string, password: string): Promise<{ needsApproval: boolean; needsEmailConfirm: boolean }>;
  signOut(): Promise<void>;
  /** Troca a senha de quem está logado; confere a senha atual antes. */
  changePassword(current: string, next: string): Promise<void>;

  // Usuários / permissões
  listProfiles(): Promise<Profile[]>;
  updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'role' | 'active'>>): Promise<void>;

  // Clientes e veículos
  searchCustomers(q: string): Promise<CustomerHit[]>;
  listCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | null>;
  saveCustomer(c: CustomerInput): Promise<Customer>;
  listVehicles(customerId: string): Promise<Vehicle[]>;
  saveVehicle(v: VehicleInput): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;

  // Ordens de serviço
  listOrders(filter?: OrderFilter): Promise<OrderFull[]>;
  getOrder(id: string): Promise<OrderFull | null>;
  createOrder(input: NewOrderInput): Promise<Order>;
  updateOrder(id: string, patch: OrderPatch): Promise<void>;
  changeStatus(id: string, to: OrderStatus, note?: string): Promise<void>;
  addOrderNote(id: string, note: string): Promise<void>;
  listEvents(orderId: string): Promise<OrderEvent[]>;
  listPayments(orderId: string): Promise<Payment[]>;
  listPaymentsSince(sinceIso: string): Promise<(Payment & { line: Order['line'] })[]>;
  addPayment(orderId: string, amount: number, method: PaymentMethod, kind: PaymentKind): Promise<void>;

  // Acompanhamento público (sem login)
  getPublicOrder(code: string): Promise<PublicOrder | null>;

  // Modelos de mensagem
  listTemplates(): Promise<MessageTemplate[]>;
  saveTemplate(t: MessageTemplate): Promise<void>;

  // Loja / vitrine (leitura pública)
  getStore(): Promise<StoreSettings>;
  saveStore(s: StoreSettings): Promise<void>;
  listShowcaseServices(includeInactive?: boolean): Promise<ShowcaseService[]>;
  saveShowcaseService(s: Partial<ShowcaseService> & Pick<ShowcaseService, 'line' | 'title'>): Promise<void>;
  deleteShowcaseService(id: string): Promise<void>;
  listPhotos(): Promise<ShowcasePhoto[]>;
  uploadPhoto(file: File, caption: string): Promise<void>;
  deletePhoto(id: string): Promise<void>;
}
