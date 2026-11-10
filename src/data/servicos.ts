import { Car, DoorOpen, KeyRound, RadioReceiver, Sparkles, Stamp, type LucideIcon } from 'lucide-react';

/** Serviços exibidos no Painel do dia (seção "Nossos Serviços"). Conteúdo estático, só visual. */
export type Servico = {
  slug: string;
  titulo: string;
  descricao: string;
  aPartirDe: number;
  /** Nome do arquivo em src/assets/servicos/. Se não existir, mostra o ícone. */
  imagem: string;
  alt: string;
  icone: LucideIcon;
};

export const SERVICOS: Servico[] = [
  { slug: 'chave-automotiva', titulo: 'Chave automotiva', descricao: 'Chave canivete, codificada e com transponder.', aPartirDe: 150, imagem: 'chave-automotiva.webp', alt: 'Chave canivete automotiva com três botões', icone: Car },
  { slug: 'abertura', titulo: 'Abertura de portas e carros', descricao: 'Atendimento rápido para portas residenciais e veículos.', aPartirDe: 90, imagem: 'abertura.webp', alt: 'Ferramentas de abertura sobre fechadura', icone: DoorOpen },
  { slug: 'carimbos', titulo: 'Carimbos', descricao: 'Carimbos automáticos e personalizados.', aPartirDe: 40, imagem: 'carimbos.webp', alt: 'Carimbo automático personalizado', icone: Stamp },
  { slug: 'copia', titulo: 'Cópia de chaves', descricao: 'Residenciais, tetra, gorjas e codificadas. Na hora.', aPartirDe: 12, imagem: 'copia.webp', alt: 'Chaves residenciais copiadas', icone: KeyRound },
  { slug: 'controles', titulo: 'Controles de portão e alarme', descricao: 'Cópia e programação de controles.', aPartirDe: 45, imagem: 'controles.webp', alt: 'Controles remotos de portão', icone: RadioReceiver },
  { slug: 'chaves-especiais', titulo: 'Chaves especiais', descricao: 'Chaves com transponder, smart keys e mais.', aPartirDe: 150, imagem: 'chaves-especiais.webp', alt: 'Smart key de presença', icone: Sparkles },
];

// Carrega as fotos que existirem em src/assets/servicos/ (basta soltar os .webp lá).
const arquivos = import.meta.glob('../assets/servicos/*.{webp,png,jpg,jpeg}', { eager: true, import: 'default' }) as Record<string, string>;

export function imagemServico(nome: string): string | undefined {
  const base = nome.replace(/\.[a-z]+$/i, '');
  const chave = Object.keys(arquivos).find((k) => k.split('/').pop()!.replace(/\.[a-z]+$/i, '') === base);
  return chave ? arquivos[chave] : undefined;
}
