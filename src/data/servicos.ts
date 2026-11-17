import { Car, DoorOpen, KeyRound, RadioReceiver, Sparkles, Stamp, type LucideIcon } from 'lucide-react';
import type { PriceType } from '../types';

/** Serviços exibidos no Painel do dia (seção "Nossos Serviços"). Conteúdo estático, só visual. */
export type Servico = {
  slug: string;
  titulo: string;
  descricao: string;
  /** Valor de referência; ignorado quando `tipoPreco` é `sob_consulta`. */
  preco: number | null;
  tipoPreco: PriceType;
  /** Nome do arquivo em src/assets/servicos/. Se não existir, mostra o ícone. */
  imagem: string;
  alt: string;
  icone: LucideIcon;
};

export const SERVICOS: Servico[] = [
  { slug: 'chave-automotiva', titulo: 'Chave automotiva', descricao: 'Chave canivete, codificada e com transponder.', preco: 150, tipoPreco: 'a_partir_de', imagem: 'chave-automotiva.webp', alt: 'Chave canivete automotiva com três botões', icone: Car },
  { slug: 'abertura', titulo: 'Abertura de portas e carros', descricao: 'Atendimento rápido para portas residenciais e veículos.', preco: 90, tipoPreco: 'a_partir_de', imagem: 'abertura.webp', alt: 'Ferramentas de abertura sobre fechadura', icone: DoorOpen },
  { slug: 'carimbos', titulo: 'Carimbos', descricao: 'Carimbos automáticos e personalizados.', preco: 50, tipoPreco: 'a_partir_de', imagem: 'carimbos.webp', alt: 'Carimbo automático personalizado', icone: Stamp },
  { slug: 'chaves-especiais', titulo: 'Chaves especiais', descricao: 'Chaves com transponder, smart keys e mais.', preco: 150, tipoPreco: 'a_partir_de', imagem: 'chaves-especiais.webp', alt: 'Smart key de presença', icone: Sparkles },
  // Chaves e Controles (sem foto ainda: o card mostra o ícone como placeholder)
  { slug: 'copia', titulo: 'Cópia de Chave Simples', descricao: 'Cópia de chave comum (tipo Yale)', preco: 15, tipoPreco: 'fixo', imagem: 'copia.webp', alt: 'Chaves residenciais copiadas', icone: KeyRound },
  { slug: 'controles', titulo: 'Controle para Portão', descricao: 'Controle remoto para portão eletrônico', preco: 50, tipoPreco: 'a_partir_de', imagem: 'controles.webp', alt: 'Controles remotos de portão', icone: RadioReceiver },
  { slug: 'copia-tetra', titulo: 'Cópia de Chave Tetra', descricao: 'Necessita avaliação do atendimento', preco: null, tipoPreco: 'sob_consulta', imagem: 'copia-tetra.webp', alt: 'Chave tetra', icone: KeyRound },
  { slug: 'copia-gorge', titulo: 'Cópia de Chave Gorge', descricao: 'Necessita avaliação do atendimento', preco: null, tipoPreco: 'sob_consulta', imagem: 'copia-gorge.webp', alt: 'Chave gorge', icone: KeyRound },
  { slug: 'copia-codificada', titulo: 'Cópia de Chave Codificada', descricao: 'Necessita avaliação do atendimento', preco: null, tipoPreco: 'sob_consulta', imagem: 'copia-codificada.webp', alt: 'Chave codificada', icone: KeyRound },
  { slug: 'copia-multiponto', titulo: 'Cópia de Chave Multiponto', descricao: 'Necessita avaliação do atendimento', preco: null, tipoPreco: 'sob_consulta', imagem: 'copia-multiponto.webp', alt: 'Chave multiponto', icone: KeyRound },
];

// Carrega as fotos que existirem em src/assets/servicos/ (basta soltar os .webp lá).
const arquivos = import.meta.glob('../assets/servicos/*.{webp,png,jpg,jpeg}', { eager: true, import: 'default' }) as Record<string, string>;

export function imagemServico(nome: string): string | undefined {
  const base = nome.replace(/\.[a-z]+$/i, '');
  const chave = Object.keys(arquivos).find((k) => k.split('/').pop()!.replace(/\.[a-z]+$/i, '') === base);
  return chave ? arquivos[chave] : undefined;
}
