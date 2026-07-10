/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Categoria, Produto, ConfigEstabelecimento } from '../types';

export const DEFAULT_CATEGORIAS: Categoria[] = [
  { id: '1', nome: 'Bebidas' },
  { id: '2', nome: 'Drinks' },
  { id: '3', nome: 'Porções' },
  { id: '4', nome: 'Lanches' },
  { id: '5', nome: 'Sobremesas' }
];

export const DEFAULT_PRODUTOS: Produto[] = [
  {
    id: 'p1',
    nome: 'Água de Coco Natural',
    descricao: 'Gelada e colhida na hora, direto da fruta.',
    categoria: 'Bebidas',
    preco: 10.00,
    imagem: 'https://images.unsplash.com/photo-1525385133375-80955641da08?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 1
  },
  {
    id: 'p2',
    nome: 'Caipirinha de Limão Tradicional',
    descricao: 'Feita com cachaça artesanal de alambique, limão taiti fresco e gelo.',
    categoria: 'Drinks',
    preco: 22.00,
    imagem: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 2
  },
  {
    id: 'p3',
    nome: 'Porção Isca de Peixe Crocante',
    descricao: 'Filé de pescada em tiras, empanado na farinha panko. Acompanha molho tártaro.',
    categoria: 'Porções',
    preco: 65.00,
    imagem: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 3
  },
  {
    id: 'p4',
    nome: 'Camarão ao Alho e Óleo',
    descricao: 'Camarões médios grelhados com bastante alho dourado e azeite extra virgem.',
    categoria: 'Porções',
    preco: 85.00,
    imagem: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 4
  },
  {
    id: 'p5',
    nome: 'Cerveja Heineken Long Neck',
    descricao: 'Puro malte, estupidamente gelada.',
    categoria: 'Bebidas',
    preco: 12.00,
    imagem: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 5
  },
  {
    id: 'p6',
    nome: 'Gin Tônica Tropical',
    descricao: 'Gin premium, água tônica, fatias de laranja e maracujá fresco.',
    categoria: 'Drinks',
    preco: 28.00,
    imagem: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 6
  },
  {
    id: 'p7',
    nome: 'Hambúrguer Classic Beach',
    descricao: 'Blend bovino 150g grelhado no fogo, queijo prato derretido, alface, tomate e maionese verde artesanal.',
    categoria: 'Lanches',
    preco: 32.00,
    imagem: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 7
  },
  {
    id: 'p8',
    nome: 'Açai Completo na Tigela (500ml)',
    descricao: 'Acompanha banana fatiada, morango fresco, leite condensado, leite em pó e granola crocante.',
    categoria: 'Sobremesas',
    preco: 24.00,
    imagem: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 8
  },
  {
    id: 'p9',
    nome: 'Coca-Cola Zero Lata',
    descricao: 'Refrigerante lata 350ml gelado.',
    categoria: 'Bebidas',
    preco: 7.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 9
  },
  {
    id: 'p10',
    nome: 'Batata Frita Especial',
    descricao: 'Porção grande com cheddar cremoso e bacon crocante salpicado.',
    categoria: 'Porções',
    preco: 45.00,
    imagem: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 10
  }
];

export const DEFAULT_CONFIG: ConfigEstabelecimento = {
  nome: 'UbáPapuá',
  logo: '🥥',
  telefone: '(11) 99999-8888',
  endereco: 'Av. Beira Mar, Quiosque 42 - Praia Central, Ubatuba/SP',
  taxa_servico: 10, // 10%
  mensagem_inicial: 'Bem-vindo ao UbáPapuá! Desfrute de momentos inesquecíveis à beira-mar. Faça seu pedido diretamente por aqui!',
  horario_funcionamento: 'Todos os dias, das 08h às 20h'
};
