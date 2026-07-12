/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Server-authoritative in-memory state (resets on server restart, synced on client IndexedDB)
let categorias = [
  { id: '1', nome: 'Refeições' },
  { id: '2', nome: 'Prato Regional' },
  { id: '3', nome: 'Petisco' },
  { id: '4', nome: 'Não Alcoólicos' },
  { id: '5', nome: 'Drinks' },
  { id: '6', nome: 'Bebidas' }
];

let produtos = [
  // --- REFEIÇÕES (Serve 02 pessoas) ---
  {
    id: 'r1',
    nome: 'Dourada (Refeição p/ 2)',
    descricao: 'Tradicional Dourada assada ou frita, servida bem quente com acompanhamentos regionais. Serve 2 pessoas.',
    categoria: 'Refeições',
    preco: 65.00,
    imagem: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 1
  },
  {
    id: 'r2',
    nome: 'Pirarucu (Refeição p/ 2)',
    descricao: 'O gigante da Amazônia grelhado ou frito, macio e saboroso com acompanhamentos. Serve 2 pessoas.',
    categoria: 'Refeições',
    preco: 80.00,
    imagem: 'https://images.unsplash.com/photo-1559847844-5315685d8cb6?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 2
  },
  {
    id: 'r3',
    nome: 'Filé de Gó (Refeição p/ 2)',
    descricao: 'Filé do peixe Gó preparado na chapa ou frito, perfeito para saborear em dupla. Serve 2 pessoas.',
    categoria: 'Refeições',
    preco: 65.00,
    imagem: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 3
  },
  {
    id: 'r4',
    nome: 'Filhote (Refeição p/ 2)',
    descricao: 'Nobre e suculento filhote preparado com carinho, servido com arroz, vinagrete e farofa. Serve 2 pessoas.',
    categoria: 'Refeições',
    preco: 65.00,
    imagem: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 4
  },
  {
    id: 'r5',
    nome: 'Pescada (Refeição p/ 2)',
    descricao: 'Pescada fresca dourada na chapa ou frita, muito saborosa. Acompanha arroz, farofa e vinagrete. Serve 2 pessoas.',
    categoria: 'Refeições',
    preco: 65.00,
    imagem: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 5
  },
  {
    id: 'r6',
    nome: 'Bisteca Bovina (Boi) (Refeição p/ 2)',
    descricao: 'Generosa bisteca bovina grelhada na brasa, macia e suculenta com acompanhamentos. Serve 2 pessoas.',
    categoria: 'Refeições',
    preco: 65.00,
    imagem: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 6
  },
  {
    id: 'r7',
    nome: 'Filé de Dourada (Refeição p/ 2)',
    descricao: 'Nobre filé de dourada limpo, grelhado com azeite de oliva e servido com acompanhamentos finos. Serve 2 pessoas.',
    categoria: 'Refeições',
    preco: 80.00,
    imagem: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 7
  },
  {
    id: 'r8',
    nome: 'Filé de Carne (Refeição p/ 2)',
    descricao: 'Delicioso filé de carne grelhado ao ponto do cliente, guarnecido de acompanhamentos. Serve 2 pessoas.',
    categoria: 'Refeições',
    preco: 80.00,
    imagem: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 8
  },
  {
    id: 'r9',
    nome: 'Frango Frito (Refeição p/ 2)',
    descricao: 'Pedaços selecionados de frango crocantes por fora e macios por dentro, acompanhados de fritas ou arroz. Serve 2 pessoas.',
    categoria: 'Refeições',
    preco: 65.00,
    imagem: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 9
  },

  // --- PRATO REGIONAL ---
  {
    id: 'pr1',
    nome: 'Dourada (Prato Regional)',
    descricao: 'Prato individual de dourada fresca grelhada com arroz branco, feijão regional e farinha d\'água.',
    categoria: 'Prato Regional',
    preco: 40.00,
    imagem: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 10
  },
  {
    id: 'pr2',
    nome: 'Pirarucu (Prato Regional)',
    descricao: 'Delicioso pirarucu grelhado, acompanhado de arroz, feijão e farofa crocante.',
    categoria: 'Prato Regional',
    preco: 40.00,
    imagem: 'https://images.unsplash.com/photo-1559847844-5315685d8cb6?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 11
  },
  {
    id: 'pr3',
    nome: 'Filé de Gó (Prato Regional)',
    descricao: 'Delicado filé de Gó servido com guarnições regionais quentes.',
    categoria: 'Prato Regional',
    preco: 40.00,
    imagem: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 12
  },
  {
    id: 'pr4',
    nome: 'Bisteca Bovina (Prato Regional)',
    descricao: 'Corte saboroso de bisteca grelhada na chapa com acompanhamentos tradicionais.',
    categoria: 'Prato Regional',
    preco: 40.00,
    imagem: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 13
  },
  {
    id: 'pr5',
    nome: 'Filé de Carne (Prato Regional)',
    descricao: 'Filé bovino grelhado individual, servido com arroz, feijão e farofa.',
    categoria: 'Prato Regional',
    preco: 40.00,
    imagem: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 14
  },
  {
    id: 'pr6',
    nome: 'Frango (Prato Regional)',
    descricao: 'Frango grelhado ou frito individual, servido quentinho com guarnições regionais.',
    categoria: 'Prato Regional',
    preco: 40.00,
    imagem: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 15
  },

  // --- PETISCO ---
  {
    id: 'pe1',
    nome: 'Azeitona',
    descricao: 'Porção de azeitonas verdes temperadas com azeite de oliva e orégano.',
    categoria: 'Petisco',
    preco: 20.00,
    imagem: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 16
  },
  {
    id: 'pe2',
    nome: 'Macaxeira Frita',
    descricao: 'Porção de macaxeira (mandioca) frita, dourada e muito crocante.',
    categoria: 'Petisco',
    preco: 25.00,
    imagem: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 17
  },
  {
    id: 'pe3',
    nome: 'Queijo Coalho',
    descricao: 'Deliciosos cubos ou espetos de queijo coalho grelhados na chapa.',
    categoria: 'Petisco',
    preco: 25.00,
    imagem: 'https://images.unsplash.com/photo-1552763442-159ac9a24dce?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 18
  },
  {
    id: 'pe4',
    nome: 'Isca de Peixe',
    descricao: 'Deliciosas iscas de peixe local empanadas e fritas. Acompanha molho tártaro ou limão.',
    categoria: 'Petisco',
    preco: 50.00,
    imagem: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 19
  },
  {
    id: 'pe5',
    nome: 'Calabresa',
    descricao: 'Porção de calabresa acebolada frita, ideal para acompanhar uma bebida bem gelada.',
    categoria: 'Petisco',
    preco: 30.00,
    imagem: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 20
  },
  {
    id: 'pe6',
    nome: 'Batata Frita',
    descricao: 'Porção de batatas fritas crocantes com sal.',
    categoria: 'Petisco',
    preco: 25.00,
    imagem: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 21
  },
  {
    id: 'pe7',
    nome: 'Petisco: 02 Opções',
    descricao: 'Monte seu prato de petiscos escolhendo duas opções da casa.',
    categoria: 'Petisco',
    preco: 40.00,
    imagem: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 22
  },
  {
    id: 'pe8',
    nome: 'Petisco: 03 Opções',
    descricao: 'Monte seu prato de petiscos escolhendo três opções da casa.',
    categoria: 'Petisco',
    preco: 50.00,
    imagem: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 23
  },

  // --- NÃO ALCOÓLICOS ---
  {
    id: 'na1',
    nome: 'Coca-Cola 2L',
    descricao: 'Garrafa pet de 2 Litros, bem gelada para toda a mesa.',
    categoria: 'Não Alcoólicos',
    preco: 14.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 24
  },
  {
    id: 'na2',
    nome: 'Coca-Cola 1L',
    descricao: 'Garrafa pet de 1 Litro, ideal para dividir.',
    categoria: 'Não Alcoólicos',
    preco: 9.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 25
  },
  {
    id: 'na3',
    nome: 'Coca-Cola 600ml',
    descricao: 'Tamanho perfeito para matar a sua sede individual.',
    categoria: 'Não Alcoólicos',
    preco: 8.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 26
  },
  {
    id: 'na4',
    nome: 'Fanta Laranja 2L',
    descricao: 'Garrafa pet de 2 Litros gelada.',
    categoria: 'Não Alcoólicos',
    preco: 12.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 27
  },
  {
    id: 'na5',
    nome: 'Fanta Laranja 1L',
    descricao: 'Garrafa pet de 1 Litro gelada.',
    categoria: 'Não Alcoólicos',
    preco: 8.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 28
  },
  {
    id: 'na6',
    nome: 'Pepsi 2L',
    descricao: 'Garrafa pet de 2 Litros gelada.',
    categoria: 'Não Alcoólicos',
    preco: 12.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 29
  },
  {
    id: 'na7',
    nome: 'Tuchaua 2L',
    descricao: 'O refrigerante sabor guaraná mais tradicional da região norte. Garrafa pet 2L.',
    categoria: 'Não Alcoólicos',
    preco: 12.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 30
  },
  {
    id: 'na8',
    nome: 'Tuchaua 1L',
    descricao: 'Refrigerante guaraná regional do norte. Garrafa pet 1L.',
    categoria: 'Não Alcoólicos',
    preco: 8.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 31
  },
  {
    id: 'na9',
    nome: 'Sukita 2L',
    descricao: 'Refrigerante Sukita de laranja, garrafa pet de 2 Litros.',
    categoria: 'Não Alcoólicos',
    preco: 12.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 32
  },
  {
    id: 'na10',
    nome: 'Sukita 1L',
    descricao: 'Refrigerante Sukita de laranja, garrafa pet de 1 Litro.',
    categoria: 'Não Alcoólicos',
    preco: 8.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 33
  },
  {
    id: 'na11',
    nome: 'Refrigerante Lata',
    descricao: 'Refrigerante em lata (Coca-Cola, Fanta, Guaraná, Sukita). Escolha o sabor com o atendente.',
    categoria: 'Não Alcoólicos',
    preco: 6.00,
    imagem: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 34
  },

  // --- EXTRAS BEBIDAS & DRINKS ---
  {
    id: 'p1',
    nome: 'Água de Coco Natural',
    descricao: 'Gelada e colhida na hora, direto da fruta.',
    categoria: 'Bebidas',
    preco: 10.00,
    imagem: 'https://images.unsplash.com/photo-1525385133375-80955641da08?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 35
  },
  {
    id: 'p2',
    nome: 'Caipirinha de Limão Tradicional',
    descricao: 'Feita com cachaça artesanal de alambique, limão taiti fresco e gelo.',
    categoria: 'Drinks',
    preco: 22.00,
    imagem: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 36
  },
  {
    id: 'p5',
    nome: 'Cerveja Heineken Long Neck',
    descricao: 'Puro malte, estupidamente gelada.',
    categoria: 'Bebidas',
    preco: 12.00,
    imagem: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 37
  },
  {
    id: 'p6',
    nome: 'Gin Tônica Tropical',
    descricao: 'Gin premium, água tônica, fatias de laranja e maracujá fresco.',
    categoria: 'Drinks',
    preco: 28.00,
    imagem: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80',
    ativo: true,
    ordem: 38
  }
];

const CONFIG_FILE_PATH = path.join(process.cwd(), 'config.json');

let config = {
  nome: 'Ubá Papuá',
  logo: '🌴',
  telefone: '(91) 98765-4321',
  endereco: 'Orla de Belém, Quiosque Ubá Papuá - Belém/PA',
  taxa_servico: 10,
  mensagem_inicial: 'Bem-vindo ao Ubá Papuá! Saboreie o melhor da culinária regional e petiscos deliciosos à beira-rio. Faça seu pedido diretamente aqui!',
  horario_funcionamento: 'Terça a Domingo, das 11h às 22h'
};

if (fs.existsSync(CONFIG_FILE_PATH)) {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf-8'));
    config = { ...config, ...savedConfig };
  } catch (err) {
    console.error('Erro ao ler config.json:', err);
  }
}

// Initial demo orders for gorgeous UI state
let pedidos: any[] = [
  {
    id: 'demo-1',
    cliente_nome: 'Mariana Silva',
    quiosque: 'Mesa 05',
    status: 'Em preparo',
    valor_total: 32.00,
    taxa_servico: 3.20,
    valor_final: 35.20,
    observacoes: 'Hambúrguer bem passado e Coca sem gelo.',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    itens: [
      { produto_id: 'p7', produto_nome: 'Hambúrguer Classic Beach', quantidade: 1, valor: 32.00 }
    ]
  },
  {
    id: 'demo-2',
    cliente_nome: 'Carlos Eduardo',
    quiosque: 'Espreguiçadeira 12',
    status: 'Recebido',
    valor_total: 32.00,
    taxa_servico: 3.20,
    valor_final: 35.20,
    observacoes: 'Caprichar no limão.',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    itens: [
      { produto_id: 'p1', produto_nome: 'Água de Coco Natural', quantidade: 1, valor: 10.00 },
      { produto_id: 'p2', produto_nome: 'Caipirinha de Limão Tradicional', quantidade: 1, valor: 22.00 }
    ]
  }
];

// Registered Clients in-memory state
let clientes: any[] = [
  { id: 'c-demo-1', nome: 'Mariana Silva', quiosque: 'Mesa 05', celular: '(91) 98888-7777', telefone: '(91) 98888-7777', status_conta: 'Conta Paga', valor_total_conta: 0.00, created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
  { id: 'c-demo-2', nome: 'Carlos Eduardo', quiosque: 'Espreguiçadeira 12', celular: '(91) 97777-6666', telefone: '(91) 97777-6666', status_conta: 'Conta Paga', valor_total_conta: 0.00, created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() }
];

// Admin and Waiter users in-memory state
let usuariosAdmin: any[] = [
  { id: 'u-1', nome: 'Administrador Principal', usuario: 'admin', senha: '123', regra: 'admin', created_at: new Date().toISOString() },
  { id: 'u-2', nome: 'Garçom Padrão', usuario: 'garcom', senha: '123', regra: 'garcom', created_at: new Date().toISOString() }
];

// Active Server-Sent Events (SSE) connections for real-time updates
let clients: any[] = [];

function broadcastSSE(data: any) {
  clients.forEach((client) => {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API: Real-time Event Stream (SSE)
  app.get('/api/orders/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // Send initial list of orders, products, and registered clients on connect
    res.write(`data: ${JSON.stringify({ type: 'init', pedidos, produtos, categorias, config, clientes })}\n\n`);

    req.on('close', () => {
      clients = clients.filter((client) => client.id !== clientId);
    });
  });

  // API: Products Endpoints
  app.get('/api/products', (req, res) => {
    res.json(produtos);
  });

  app.post('/api/products', (req, res) => {
    const newProd = {
      ...req.body,
      id: req.body.id || 'p_' + Math.random().toString(36).substr(2, 9),
      ativo: req.body.ativo ?? true,
      ordem: produtos.length + 1
    };
    produtos.push(newProd);
    broadcastSSE({ type: 'product_created', product: newProd });
    res.status(201).json(newProd);
  });

  app.put('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const index = produtos.findIndex((p) => p.id === id);
    if (index !== -1) {
      produtos[index] = { ...produtos[index], ...req.body };
      broadcastSSE({ type: 'product_updated', product: produtos[index] });
      res.json(produtos[index]);
    } else {
      res.status(404).json({ error: 'Produto não encontrado' });
    }
  });

  app.delete('/api/products/:id', (req, res) => {
    const { id } = req.params;
    produtos = produtos.filter((p) => p.id !== id);
    broadcastSSE({ type: 'product_deleted', id });
    res.json({ success: true });
  });

  // API: Categories Endpoints
  app.get('/api/categories', (req, res) => {
    res.json(categorias);
  });

  app.post('/api/categories', (req, res) => {
    try {
      const nomeVal = (req.body && req.body.nome) ? String(req.body.nome).trim() : '';
      if (!nomeVal) {
        res.status(400).json({ error: 'Nome da categoria é obrigatório' });
        return;
      }

      const newCat = {
        id: req.body.id || 'c_' + Math.random().toString(36).substr(2, 9),
        nome: nomeVal
      };

      const exists = categorias.some(c => {
        const cNome = c && c.nome ? String(c.nome).toLowerCase().trim() : '';
        return cNome === nomeVal.toLowerCase();
      });

      if (exists) {
        res.status(400).json({ error: 'Categoria já existe' });
        return;
      }

      categorias.push(newCat);
      broadcastSSE({ type: 'category_created', category: newCat });
      res.status(201).json(newCat);
    } catch (err: any) {
      console.error('Error in POST /api/categories:', err);
      res.status(500).json({ error: 'Erro interno ao cadastrar categoria' });
    }
  });

  app.put('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const index = categorias.findIndex((c) => c.id === id);
    if (index !== -1) {
      const oldName = categorias[index].nome;
      categorias[index] = { ...categorias[index], nome: req.body.nome };
      
      // Cascade rename category in products
      produtos.forEach(p => {
        if (p.categoria === oldName) {
          p.categoria = req.body.nome;
        }
      });

      broadcastSSE({ type: 'category_updated', category: categorias[index], products: produtos });
      res.json(categorias[index]);
    } else {
      res.status(404).json({ error: 'Categoria não encontrada' });
    }
  });

  app.delete('/api/categories/:id', (req, res) => {
    const { id } = req.params;
    const cat = categorias.find(c => c.id === id);
    if (cat) {
      categorias = categorias.filter((c) => c.id !== id);
      // Delete or set category to general in products
      produtos = produtos.filter((p) => p.categoria !== cat.nome);
      broadcastSSE({ type: 'category_deleted', id, products: produtos });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Categoria não encontrada' });
    }
  });

  // API: Config Endpoints
  app.get('/api/config', (req, res) => {
    res.json(config);
  });

  app.put('/api/config', (req, res) => {
    config = { ...config, ...req.body };
    try {
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erro ao salvar config.json:', err);
    }
    broadcastSSE({ type: 'config_updated', config });
    res.json(config);
  });

  // API: Orders Endpoints
  app.get('/api/orders', (req, res) => {
    res.json(pedidos);
  });

  app.post('/api/orders', (req, res) => {
    const newOrder = {
      ...req.body,
      id: req.body.id || 'o_' + Math.random().toString(36).substr(2, 9),
      created_at: req.body.created_at || new Date().toISOString(),
      status: req.body.status || 'Recebido'
    };
    pedidos.unshift(newOrder); // Add to the beginning so latest appears first

    // Decrement stock for ordered products if applicable
    if (Array.isArray(newOrder.itens)) {
      newOrder.itens.forEach((item: any) => {
        const prod = produtos.find((p) => p.id === item.produto_id) as any;
        if (prod && prod.estoque !== undefined && prod.estoque !== null) {
          prod.estoque = Math.max(0, prod.estoque - item.quantidade);
        }
      });
    }

    broadcastSSE({ type: 'order_created', order: newOrder, products: produtos });
    res.status(201).json(newOrder);
  });

  app.put('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const index = pedidos.findIndex((p) => p.id === id);
    if (index !== -1) {
      pedidos[index].status = status;
      broadcastSSE({ type: 'order_updated', order: pedidos[index] });
      res.json(pedidos[index]);
    } else {
      res.status(404).json({ error: 'Pedido não encontrado' });
    }
  });

  // API: Clients Endpoints
  app.get('/api/clients', (req, res) => {
    res.json(clientes);
  });

  app.post('/api/clients', (req, res) => {
    try {
      const nomeVal = (req.body && req.body.nome) ? String(req.body.nome).trim() : '';
      const quiosqueVal = (req.body && req.body.quiosque) ? String(req.body.quiosque).trim() : '';
      const telefoneVal = (req.body && (req.body.telefone || req.body.celular)) ? String(req.body.telefone || req.body.celular).trim() : '';

      if (!nomeVal) {
        res.status(400).json({ error: 'Nome do cliente é obrigatório' });
        return;
      }

      if (!telefoneVal) {
        res.status(400).json({ error: 'Telefone do cliente é obrigatório' });
        return;
      }

      const cleanTel = telefoneVal.replace(/\D/g, '');

      // Check if duplicate safely based on the cleaned phone number
      const existingIndex = clientes.findIndex(c => {
        const cTel = String(c.telefone || c.celular || '').replace(/\D/g, '');
        return cTel === cleanTel;
      });

      const newClient = {
        id: cleanTel || 'c_' + Math.random().toString(36).substr(2, 9),
        nome: nomeVal,
        quiosque: quiosqueVal,
        celular: telefoneVal,
        telefone: telefoneVal,
        status_conta: 'Conta Paga',
        valor_total_conta: 0.00,
        created_at: req.body.created_at || new Date().toISOString()
      };

      if (existingIndex !== -1) {
        // Update existing client table or name session preserving status and total if present
        clientes[existingIndex] = { 
          status_conta: 'Conta Paga',
          valor_total_conta: 0.00,
          ...clientes[existingIndex], 
          ...newClient 
        };
        broadcastSSE({ type: 'client_updated', client: clientes[existingIndex] });
        res.status(200).json(clientes[existingIndex]);
      } else {
        clientes.unshift(newClient);
        broadcastSSE({ type: 'client_created', client: newClient });
        res.status(201).json(newClient);
      }
    } catch (err: any) {
      console.error('Error in POST /api/clients:', err);
      res.status(500).json({ error: 'Erro interno ao cadastrar cliente' });
    }
  });

  app.put('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    const index = clientes.findIndex((c) => c.id === id);
    if (index !== -1) {
      clientes[index] = { 
        ...clientes[index], 
        ...req.body,
        telefone: req.body.telefone || req.body.celular || clientes[index].telefone
      };
      broadcastSSE({ type: 'client_updated', client: clientes[index] });
      res.json(clientes[index]);
    } else {
      res.status(404).json({ error: 'Cliente não encontrado' });
    }
  });

  app.delete('/api/clients/:id', (req, res) => {
    const { id } = req.params;
    clientes = clientes.filter((c) => c.id !== id);
    broadcastSSE({ type: 'client_deleted', id });
    res.json({ success: true });
  });

  app.post('/api/clients/close-bill', (req, res) => {
    const { quiosque, cliente_nome } = req.body;
    let count = 0;
    let totalBill = 0;
    pedidos.forEach(p => {
      if (
        p.quiosque.toLowerCase() === quiosque.toLowerCase() &&
        p.cliente_nome.toLowerCase() === cliente_nome.toLowerCase() &&
        p.status !== 'Cancelado' &&
        !p.pago
      ) {
        p.conta_solicitada = true;
        totalBill += p.valor_final;
        count++;
      }
    });

    // Update in-memory client
    const cliIndex = clientes.findIndex(c => c.quiosque.toLowerCase() === quiosque.toLowerCase() && c.nome.toLowerCase() === cliente_nome.toLowerCase());
    if (cliIndex !== -1) {
      clientes[cliIndex].status_conta = 'Conta em Aberto';
      clientes[cliIndex].valor_total_conta = totalBill;
      broadcastSSE({ type: 'client_updated', client: clientes[cliIndex] });
    } else {
      // Create a client if they aren't registered yet
      const newClient = {
        id: 'c_' + Math.random().toString(36).substr(2, 9),
        nome: cliente_nome,
        quiosque: quiosque,
        celular: '',
        telefone: '',
        status_conta: 'Conta em Aberto',
        valor_total_conta: totalBill,
        created_at: new Date().toISOString()
      };
      clientes.unshift(newClient);
      broadcastSSE({ type: 'client_created', client: newClient });
    }
    
    broadcastSSE({ type: 'bill_requested', quiosque, cliente_nome, pedidos, clientes });
    res.json({ success: true, count, total: totalBill });
  });

  app.post('/api/clients/pay-bill', (req, res) => {
    const { quiosque, cliente_nome } = req.body;
    pedidos.forEach(p => {
      if (p.quiosque.toLowerCase() === quiosque.toLowerCase() && p.cliente_nome.toLowerCase() === cliente_nome.toLowerCase()) {
        p.status = 'Entregue';
        p.conta_solicitada = false;
        p.pago = true;
      }
    });

    // Update in-memory client
    const cliIndex = clientes.findIndex(c => c.quiosque.toLowerCase() === quiosque.toLowerCase() && c.nome.toLowerCase() === cliente_nome.toLowerCase());
    if (cliIndex !== -1) {
      clientes[cliIndex].status_conta = 'Conta Paga';
      clientes[cliIndex].valor_total_conta = 0.00;
      broadcastSSE({ type: 'client_updated', client: clientes[cliIndex] });
    }

    broadcastSSE({ type: 'bill_paid', quiosque, cliente_nome, pedidos, clientes });
    res.json({ success: true });
  });

  // --- API endpoints for user authentication and team management ---
  app.post('/api/admin/login', (req, res) => {
    try {
      const { usuario, senha } = req.body;
      if (!usuario || !senha) {
        res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
        return;
      }
      const user = usuariosAdmin.find(
        (u) => u.usuario.trim().toLowerCase() === usuario.trim().toLowerCase() && u.senha === senha
      );
      if (user) {
        res.json({
          success: true,
          user: {
            id: user.id,
            nome: user.nome,
            usuario: user.usuario,
            regra: user.regra
          }
        });
      } else {
        res.status(401).json({ error: 'Usuário ou senha incorretos' });
      }
    } catch (err) {
      console.error('Error in POST /api/admin/login:', err);
      res.status(500).json({ error: 'Erro interno ao realizar login' });
    }
  });

  app.get('/api/admin/users', (req, res) => {
    res.json(usuariosAdmin);
  });

  app.post('/api/admin/users', (req, res) => {
    try {
      const { nome, usuario, senha, regra } = req.body;
      if (!nome || !usuario || !senha || !regra) {
        res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        return;
      }
      const exists = usuariosAdmin.some((u) => u.usuario.trim().toLowerCase() === usuario.trim().toLowerCase());
      if (exists) {
        res.status(400).json({ error: 'Este nome de usuário já está cadastrado' });
        return;
      }
      const newUser = {
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        nome,
        usuario: usuario.trim().toLowerCase(),
        senha,
        regra,
        created_at: new Date().toISOString()
      };
      usuariosAdmin.push(newUser);
      broadcastSSE({ type: 'user_created', user: newUser });
      res.status(201).json(newUser);
    } catch (err) {
      console.error('Error in POST /api/admin/users:', err);
      res.status(500).json({ error: 'Erro interno ao cadastrar usuário' });
    }
  });

  app.put('/api/admin/users/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { nome, usuario, senha, regra } = req.body;
      const index = usuariosAdmin.findIndex((u) => u.id === id);
      if (index === -1) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }
      // Check for unique username
      if (usuario) {
        const dup = usuariosAdmin.some((u) => u.id !== id && u.usuario.trim().toLowerCase() === usuario.trim().toLowerCase());
        if (dup) {
          res.status(400).json({ error: 'Este nome de usuário já está cadastrado' });
          return;
        }
      }
      usuariosAdmin[index] = {
        ...usuariosAdmin[index],
        nome: nome || usuariosAdmin[index].nome,
        usuario: usuario ? usuario.trim().toLowerCase() : usuariosAdmin[index].usuario,
        senha: senha !== undefined ? senha : usuariosAdmin[index].senha,
        regra: regra || usuariosAdmin[index].regra
      };
      broadcastSSE({ type: 'user_updated', user: usuariosAdmin[index] });
      res.json(usuariosAdmin[index]);
    } catch (err) {
      console.error('Error in PUT /api/admin/users/:id:', err);
      res.status(500).json({ error: 'Erro interno ao atualizar usuário' });
    }
  });

  app.delete('/api/admin/users/:id', (req, res) => {
    try {
      const { id } = req.params;
      usuariosAdmin = usuariosAdmin.filter((u) => u.id !== id);
      broadcastSSE({ type: 'user_deleted', id });
      res.json({ success: true });
    } catch (err) {
      console.error('Error in DELETE /api/admin/users/:id:', err);
      res.status(500).json({ error: 'Erro interno ao excluir usuário' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
