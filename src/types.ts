/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Categoria {
  id: string;
  nome: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  categoria: string; // we can map directly to category name or ID
  preco: number;
  imagem: string;
  ativo: boolean; // available or unavailable
  ordem?: number;
  estoque?: number; // stock level, if undefined or null, it represents no stock control (like food and snacks)
  created_at?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  quiosque: string;
  celular?: string;
  telefone?: string;
  created_at?: string;
}

export type OrderStatus = 'Recebido' | 'Em preparo' | 'Pronto' | 'Entregue' | 'Cancelado';

export interface PedidoItem {
  id?: string;
  pedido_id?: string;
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  valor: number; // unit price
}

export interface Pedido {
  id: string;
  cliente_id?: string;
  cliente_nome: string;
  cliente_telefone?: string;
  quiosque: string;
  status: OrderStatus;
  valor_total: number;
  taxa_servico: number;
  valor_final: number;
  observacoes?: string;
  created_at: string;
  itens: PedidoItem[];
  synced?: boolean; // tracking offline synchronization status
  conta_solicitada?: boolean;
}

export interface ConfigEstabelecimento {
  nome: string;
  logo: string;
  telefone: string;
  endereco: string;
  taxa_servico: number; // percentage, e.g., 10 for 10%
  mensagem_inicial: string;
  horario_funcionamento: string;
}

export interface UsuarioAdmin {
  id: string;
  nome: string;
  usuario: string;
  senha?: string;
  regra: 'admin' | 'garcom';
  created_at?: string;
}
