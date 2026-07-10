/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Server-authoritative in-memory state (resets on server restart, synced on client IndexedDB)
let categorias = [
  { id: '1', nome: 'Bebidas' },
  { id: '2', nome: 'Drinks' },
  { id: '3', nome: 'Porções' },
  { id: '4', nome: 'Lanches' },
  { id: '5', nome: 'Sobremesas' }
];

let produtos = [
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
  }
];

let config = {
  nome: 'Quiosque Bella Costa',
  logo: '🌊',
  telefone: '(11) 99999-8888',
  endereco: 'Av. Beira Mar, Quiosque 42 - Praia Central, Ubatuba/SP',
  taxa_servico: 10,
  mensagem_inicial: 'Bem-vindo ao Bella Costa! Desfrute de momentos inesquecíveis à beira-mar. Faça seu pedido diretamente por aqui!',
  horario_funcionamento: 'Todos os dias, das 08h às 20h'
};

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

    // Send initial list of orders and products on connect
    res.write(`data: ${JSON.stringify({ type: 'init', pedidos, produtos, categorias, config })}\n\n`);

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
    const newCat = {
      id: req.body.id || 'c_' + Math.random().toString(36).substr(2, 9),
      nome: req.body.nome
    };
    if (categorias.some(c => c.nome.toLowerCase() === newCat.nome.toLowerCase())) {
      res.status(400).json({ error: 'Categoria já existe' });
      return;
    }
    categorias.push(newCat);
    broadcastSSE({ type: 'category_created', category: newCat });
    res.status(201).json(newCat);
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
    broadcastSSE({ type: 'order_created', order: newOrder });
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
