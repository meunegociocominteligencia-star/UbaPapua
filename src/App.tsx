/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingBag, ClipboardList, Database, LogIn, RefreshCw, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Categoria, Produto, Pedido, ConfigEstabelecimento, OrderStatus, PedidoItem, Cliente } from './types';
import { DEFAULT_PRODUTOS, DEFAULT_CATEGORIAS, DEFAULT_CONFIG } from './lib/establishment';
import { offlineDB } from './lib/db';
import { getSupabase, hasSupabaseConfig } from './lib/supabase';
import { getApiUrl } from './lib/api';
import { NetworkStatus } from './components/NetworkStatus';
import { ClientIdentification } from './components/ClientIdentification';
import { Cardapio } from './components/Cardapio';
import { Carrinho } from './components/Carrinho';
import { PedidosStatus } from './components/PedidosStatus';
import { AdminPanel } from './components/AdminPanel';

interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidUUID(str: string): boolean {
  if (!str) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regex.test(str);
}

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('localStorage is disabled or blocked in this browser context:', e);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('localStorage is disabled or blocked in this browser context:', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('localStorage is disabled or blocked in this browser context:', e);
    }
  }
};

const normalizeString = (str: string) => {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
};

export default function App() {
  // Session / Router state
  const [clienteNome, setClienteNome] = useState<string | null>(
    safeStorage.getItem('cliente_nome')
  );
  const [clienteQuiosque, setClienteQuiosque] = useState<string | null>(
    safeStorage.getItem('cliente_quiosque')
  );
  const [clienteCelular, setClienteCelular] = useState<string | null>(
    safeStorage.getItem('cliente_celular')
  );
  const [clienteSessionStart, setClienteSessionStart] = useState<string | null>(
    safeStorage.getItem('cliente_session_start')
  );
  const [activeView, setActiveView] = useState<'identification' | 'cardapio' | 'orders_status' | 'admin'>(
    safeStorage.getItem('cliente_nome') ? 'cardapio' : 'identification'
  );

  // Core content states
  const [produtos, setProdutos] = useState<Produto[]>(DEFAULT_PRODUTOS);
  const [categorias, setCategorias] = useState<Categoria[]>(DEFAULT_CATEGORIAS);
  const [config, setConfig] = useState<ConfigEstabelecimento>(() => {
    try {
      const saved = safeStorage.getItem('establishment_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao ler establishment_config do cache:', e);
    }
    return DEFAULT_CONFIG;
  });
  
  useEffect(() => {
    try {
      safeStorage.setItem('establishment_config', JSON.stringify(config));
    } catch (e) {
      console.warn('Erro ao salvar establishment_config no cache:', e);
    }
  }, [config]);

  const [orders, setOrders] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Interactive controls
  const [cart, setCart] = useState<{ [id: string]: number }>(() => {
    try {
      const saved = safeStorage.getItem('cart');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [showCart, setShowCart] = useState(false);

  // Network & Cloud Database status tracking
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline' | 'syncing'>('online');
  const [supabaseStatus, setSupabaseStatus] = useState<'unconfigured' | 'connected' | 'disconnected'>('unconfigured');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast dispatch utility
  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Persist cart
  useEffect(() => {
    safeStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  // Synchronize local states with online/offline triggers
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus('syncing');
      showToast('Conexão restabelecida! Sincronizando pedidos pendentes...', 'success');
      syncPendingOrders();
    };

    const handleOffline = () => {
      setNetworkStatus('offline');
      showToast('Você está offline. O cardápio continuará funcionando!', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setNetworkStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Initialize Local Databases (IndexedDB & Mock Loaders)
  useEffect(() => {
    const initLocalDBs = async () => {
      try {
        await offlineDB.init();
        
        // Cache initial mock items if none exist locally
        const cachedProducts = await offlineDB.getProdutos();
        if (cachedProducts.length > 0) {
          setProdutos(cachedProducts);
        } else {
          await offlineDB.saveProdutos(DEFAULT_PRODUTOS);
        }

        const cachedCats = await offlineDB.getCategorias();
        if (cachedCats.length > 0) {
          setCategorias(cachedCats);
        } else {
          await offlineDB.saveCategorias(DEFAULT_CATEGORIAS);
        }

        // Fetch configuration from local Express server on mount
        try {
          const res = await fetch(getApiUrl('/api/config'));
          if (res.ok) {
            const data = await res.json();
            setConfig(data);
          }
        } catch (err) {
          console.warn('Erro ao carregar configuração do servidor:', err);
        }

        // Check for unsynced queue length on mount
        const unsynced = await offlineDB.getPendingOrders();
        setPendingCount(unsynced.length);
        if (unsynced.length > 0 && navigator.onLine) {
          setNetworkStatus('syncing');
          syncPendingOrders();
        }
      } catch (err) {
        console.error('Failed to initialize local IndexedDB:', err);
      }
    };
    initLocalDBs();
  }, []);

  // Fetch orders from either Supabase or local server (REST fallback)
  const fetchOrders = useCallback(async () => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        const { data: orderData, error } = await realSupabase
          .from('pedidos')
          .select('*, pedido_itens(*)')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (orderData) {
          const mappedOrders = orderData.map((o: any) => ({
            id: o.id,
            cliente_nome: o.cliente_nome,
            cliente_telefone: o.cliente_telefone || '',
            quiosque: o.quiosque,
            status: o.status,
            valor_total: parseFloat(o.valor_total),
            taxa_servico: parseFloat(o.taxa_servico),
            valor_final: parseFloat(o.valor_final),
            observacoes: o.observacoes,
            created_at: o.created_at,
            conta_solicitada: !!o.conta_solicitada,
            pago: !!o.pago,
            itens: o.pedido_itens.map((it: any) => ({
              produto_id: it.produto_id,
              produto_nome: it.produto_nome,
              quantidade: it.quantidade,
              valor: parseFloat(it.valor)
            }))
          }));
          setOrders(mappedOrders);
        }
      } else {
        const res = await fetch(getApiUrl('/api/orders'));
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  }, []);

  // Fetch clients from either Supabase or local server (REST fallback)
  const fetchClientes = useCallback(async () => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        const { data: clientData, error } = await realSupabase
          .from('clientes')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (clientData) {
          setClientes(clientData.map((c: any) => ({
            id: c.telefone || c.celular || 'c_' + Math.random().toString(36).substr(2, 9),
            ...c
          })));
        }
      } else {
        const res = await fetch(getApiUrl('/api/clients'));
        if (res.ok) {
          const data = await res.json();
          setClientes(data);
        }
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  }, []);

  // Periodic background status check fallback for mobile/tablet browsers and admin dashboard
  useEffect(() => {
    if (activeView !== 'orders_status' && activeView !== 'admin') return;

    // Fetch immediately when entering Meus Pedidos or Admin Panel
    fetchOrders();
    if (activeView === 'admin') {
      fetchClientes();
    }

    // Set up a 3-second interval for constant real-time delivery progress updates
    const interval = setInterval(() => {
      fetchOrders();
      if (activeView === 'admin') {
        fetchClientes();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeView, fetchOrders, fetchClientes]);

  // real-time data sync handler (SSE or Supabase Realtime)
  useEffect(() => {
    const realSupabase = getSupabase();

    if (realSupabase && hasSupabaseConfig) {
      setSupabaseStatus('connected');
      
      // Fetch initial data from Supabase
      const fetchSupabaseInitial = async () => {
        try {
          const { data: catData } = await realSupabase.from('categorias').select('*');
          if (catData) {
            setCategorias(catData);
            await offlineDB.saveCategorias(catData);
          }

          const { data: prodData } = await realSupabase.from('produtos').select('*').order('ordem');
          if (prodData) {
            const mappedProds = prodData.map((p: any) => ({
              id: p.id,
              nome: p.nome,
              descricao: p.descricao,
              categoria: p.categoria,
              preco: parseFloat(p.preco),
              imagem: p.imagem,
              ativo: p.ativo,
              ordem: p.ordem
            }));
            setProdutos(mappedProds);
            await offlineDB.saveProdutos(mappedProds);
          }

          const { data: clientData } = await realSupabase.from('clientes').select('*').order('created_at', { ascending: false });
          if (clientData) {
            setClientes(clientData.map((c: any) => ({
              id: c.telefone || c.celular || 'c_' + Math.random().toString(36).substr(2, 9),
              ...c
            })));
          }

          // Fetch config from Supabase config_estabelecimento
          try {
            const { data: configSupabase, error: configErr } = await realSupabase.from('config_estabelecimento').select('*').eq('id', 1).maybeSingle();
            if (configSupabase) {
              const mappedConfig = {
                nome: configSupabase.nome,
                logo: configSupabase.logo,
                telefone: configSupabase.telefone,
                endereco: configSupabase.endereco,
                taxa_servico: parseFloat(configSupabase.taxa_servico),
                mensagem_inicial: configSupabase.mensagem_inicial,
                horario_funcionamento: configSupabase.horario_funcionamento
              };
              setConfig(mappedConfig);
              // sync to local server backend
              await fetch(getApiUrl('/api/config'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mappedConfig)
              });
            } else if (!configErr) {
              // Row does not exist yet on Supabase, so seed it with current config!
              await realSupabase.from('config_estabelecimento').insert({
                id: 1,
                nome: config.nome,
                logo: config.logo,
                telefone: config.telefone,
                endereco: config.endereco,
                taxa_servico: config.taxa_servico,
                mensagem_inicial: config.mensagem_inicial,
                horario_funcionamento: config.horario_funcionamento
              });
            }
          } catch (configErr) {
            console.warn('Erro ao obter configurações do Supabase:', configErr);
          }

          await fetchOrders();
        } catch (err) {
          console.error('Supabase fetch error:', err);
          setSupabaseStatus('disconnected');
        }
      };

      fetchSupabaseInitial();

      // Subscribe to real-time events on Supabase
      const productsSub = realSupabase
        .channel('public:produtos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, () => {
          fetchSupabaseInitial();
        })
        .subscribe();

      const ordersSub = realSupabase
        .channel('public:pedidos')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
          fetchOrders();
          showToast('Lista de pedidos atualizada na nuvem!', 'info');
        })
        .subscribe();

      const clientsSub = realSupabase
        .channel('public:clientes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => {
          realSupabase.from('clientes').select('*').order('created_at', { ascending: false }).then(({ data }) => {
            if (data) {
              setClientes(data.map((c: any) => ({
                id: c.telefone || c.celular || 'c_' + Math.random().toString(36).substr(2, 9),
                ...c
              })));
            }
          });
        })
        .subscribe();

      const configSub = realSupabase
        .channel('public:config_estabelecimento')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'config_estabelecimento' }, (payload: any) => {
          if (payload.new && payload.new.id === 1) {
            const mappedConfig = {
              nome: payload.new.nome,
              logo: payload.new.logo,
              telefone: payload.new.telefone,
              endereco: payload.new.endereco,
              taxa_servico: parseFloat(payload.new.taxa_servico),
              mensagem_inicial: payload.new.mensagem_inicial,
              horario_funcionamento: payload.new.horario_funcionamento
            };
            setConfig(mappedConfig);
          }
        })
        .subscribe();

      return () => {
        productsSub.unsubscribe();
        ordersSub.unsubscribe();
        clientsSub.unsubscribe();
        configSub.unsubscribe();
      };
    } else {
      // Setup Server-Sent Events stream from the local Express server (unconfigured Supabase fallback)
      setSupabaseStatus('unconfigured');
      const eventSource = new EventSource(getApiUrl('/api/orders/stream'));

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'init') {
            setOrders(data.pedidos);
            setProdutos(data.produtos);
            setCategorias(data.categorias);
            setConfig(data.config);
            if (data.clientes) {
              setClientes(data.clientes);
            }
            // Save cache
            offlineDB.saveProdutos(data.produtos);
            offlineDB.saveCategorias(data.categorias);
          } else if (data.type === 'order_created') {
            setOrders((prev) => [data.order, ...prev]);
            if (data.products) {
              setProdutos(data.products);
              offlineDB.saveProdutos(data.products);
            }
            showToast(`Novo pedido recebido de ${data.order.cliente_nome}!`, 'success');
            // Play a small notification sound or buzz if supported
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          } else if (data.type === 'order_updated') {
            setOrders((prev) =>
              prev.map((o) => (o.id === data.order.id ? data.order : o))
            );
            showToast(`Pedido #${data.order.id.slice(-4).toUpperCase()} está ${data.order.status}!`, 'info');
          } else if (data.type === 'client_created') {
            setClientes((prev) => {
              if (prev.some((c) => c.id === data.client.id)) return prev;
              return [data.client, ...prev];
            });
          } else if (data.type === 'client_updated') {
            setClientes((prev) =>
              prev.map((c) => (c.id === data.client.id ? data.client : c))
            );
          } else if (data.type === 'client_deleted') {
            setClientes((prev) => prev.filter((c) => c.id !== data.id));
          } else if (data.type === 'bill_requested') {
            setOrders((prev) =>
              prev.map((o) => {
                if (
                  o.quiosque.toLowerCase() === data.quiosque.toLowerCase() &&
                  o.cliente_nome.toLowerCase() === data.cliente_nome.toLowerCase() &&
                  o.status !== 'Cancelado'
                ) {
                  return { ...o, conta_solicitada: true };
                }
                return o;
              })
            );
            showToast(`Mesa ${data.quiosque} (${data.cliente_nome}) solicitou o fechamento da conta!`, 'warning');
          } else if (data.type === 'bill_paid') {
            setOrders((prev) =>
              prev.map((o) => {
                if (
                  o.quiosque.toLowerCase() === data.quiosque.toLowerCase() &&
                  o.cliente_nome.toLowerCase() === data.cliente_nome.toLowerCase()
                ) {
                  return { ...o, status: 'Entregue', conta_solicitada: false };
                }
                return o;
              })
            );
            showToast(`Conta da mesa ${data.quiosque} (${data.cliente_nome}) foi fechada!`, 'success');
          } else if (data.type === 'product_created' || data.type === 'product_updated' || data.type === 'product_deleted') {
            // Refetch or update products
            fetch(getApiUrl('/api/products'))
              .then((res) => res.json())
              .then((prods) => {
                setProdutos(prods);
                offlineDB.saveProdutos(prods);
              });
          } else if (data.type === 'category_created' || data.type === 'category_updated' || data.type === 'category_deleted') {
            fetch(getApiUrl('/api/categories'))
              .then((res) => res.json())
              .then((cats) => {
                setCategorias(cats);
                offlineDB.saveCategorias(cats);
              });
          } else if (data.type === 'config_updated') {
            setConfig(data.config);
          }
        } catch (err) {
          console.error('Error parsing Server-Sent Event stream data:', err);
        }
      };

      eventSource.onerror = () => {
        setNetworkStatus('offline');
      };

      return () => {
        eventSource.close();
      };
    }
  }, [showToast]);

  // Sincronização automática de pedidos acumulados offline
  const syncPendingOrders = async () => {
    try {
      const pendingList = await offlineDB.getPendingOrders();
      if (pendingList.length === 0) {
        setNetworkStatus('online');
        return;
      }

      const realSupabase = getSupabase();

      for (const order of pendingList) {
        let syncedSuccessfully = false;

        if (realSupabase && hasSupabaseConfig) {
          try {
            const orderId = isValidUUID(order.id) ? order.id : generateUUID();
            // Push to Supabase
            const { error: orderErr } = await realSupabase
              .from('pedidos')
              .insert({
                id: orderId,
                cliente_nome: order.cliente_nome,
                cliente_telefone: order.cliente_telefone || '',
                quiosque: order.quiosque,
                status: order.status,
                valor_total: order.valor_total,
                taxa_servico: order.taxa_servico,
                valor_final: order.valor_final,
                observacoes: order.observacoes,
                created_at: order.created_at
              });

            if (orderErr) throw orderErr;

            const itemsToInsert = order.itens.map((it) => ({
              pedido_id: orderId,
              produto_id: it.produto_id,
              produto_nome: it.produto_nome,
              quantidade: it.quantidade,
              valor: it.valor
            }));

            const { error: itemsErr } = await realSupabase.from('pedido_itens').insert(itemsToInsert);
            if (itemsErr) throw itemsErr;

            syncedSuccessfully = true;
          } catch (supabaseErr) {
            console.error('Supabase sync failed for order', order.id, supabaseErr);
          }
        }

        if (!syncedSuccessfully) {
          // Push to Express Server Mock Database
          const res = await fetch(getApiUrl('/api/orders'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
          });
          if (!res.ok) {
            throw new Error(`Express server order submission failed with status ${res.status}`);
          }
        }

        // Remove from offline queue and mark as synced in historico
        await offlineDB.removePendingOrder(order.id);
        const updatedOrder = { ...order, synced: true };
        await offlineDB.saveOrderHistory(updatedOrder);
      }

      const updatedPending = await offlineDB.getPendingOrders();
      setPendingCount(updatedPending.length);
      setNetworkStatus('online');
      showToast('Todos os pedidos offline foram sincronizados com a cozinha!', 'success');
    } catch (err) {
      console.error('Offline synchronization failed:', err);
      setNetworkStatus('offline');
      showToast('Falha na sincronização. Tentaremos novamente em instantes.', 'error');
    }
  };

  // Client Identification submit
  const handleIdentify = async (nome: string, quiosque: string, celular: string) => {
    const sessionStart = new Date().toISOString();
    setClienteNome(nome);
    setClienteQuiosque(quiosque);
    setClienteCelular(celular);
    setClienteSessionStart(sessionStart);
    safeStorage.setItem('cliente_nome', nome);
    safeStorage.setItem('cliente_quiosque', quiosque);
    safeStorage.setItem('cliente_celular', celular);
    safeStorage.setItem('cliente_session_start', sessionStart);
  
    // Save to database
    const realSupabase = getSupabase();
    if (realSupabase && hasSupabaseConfig) {
      try {
        await realSupabase.from('clientes').upsert({
          telefone: celular,
          nome,
          quiosque,
          celular,
          created_at: new Date().toISOString()
        }, { onConflict: 'telefone' });
      } catch (err) {
        console.error('Error inserting client into Supabase:', err);
      }
    } else {
      try {
        await fetch(getApiUrl('/api/clients'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, quiosque, celular, telefone: celular })
        });
      } catch (err) {
        console.error('Error registering client locally:', err);
      }
    }

    setActiveView('cardapio');
    showToast(`Bem-vindo, ${nome}! Boas compras.`, 'success');
  };

  // Log out or change kiosk table session
  const handleLogout = async () => {
    setClienteNome(null);
    setClienteQuiosque(null);
    setClienteCelular(null);
    setClienteSessionStart(null);
    safeStorage.removeItem('cliente_nome');
    safeStorage.removeItem('cliente_quiosque');
    safeStorage.removeItem('cliente_celular');
    safeStorage.removeItem('cliente_session_start');
    setCart({});
    try {
      await offlineDB.clearOrderHistories();
    } catch (e) {
      console.warn('Erro ao limpar histórico IndexedDB:', e);
    }
    setLocalOrderHistoryList([]);
    setActiveView('identification');
  };

  // Cart operations
  const handleUpdateCartQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      const newCart = { ...cart };
      delete newCart[productId];
      setCart(newCart);
    } else {
      setCart({ ...cart, [productId]: qty });
    }
  };

  const handleRemoveFromCart = (productId: string) => {
    const newCart = { ...cart };
    delete newCart[productId];
    setCart(newCart);
    showToast('Item removido da sacola.', 'info');
  };

  // Checkout order submission
  const handleSubmitOrder = async (observacoes: string) => {
    if (Object.keys(cart).length === 0) return;

    const subtotal = Object.entries(cart).reduce((total, [prodId, qty]) => {
      const product = produtos.find((p) => p.id === prodId);
      return total + (product ? product.preco * Number(qty) : 0);
    }, 0);

    const taxAmount = (subtotal * config.taxa_servico) / 100;
    const finalAmount = subtotal + taxAmount;

    const orderItens: PedidoItem[] = Object.entries(cart)
      .map(([prodId, qty]) => {
        const product = produtos.find((p) => p.id === prodId);
        return {
          produto_id: prodId,
          produto_nome: product?.nome || 'Produto',
          quantidade: Number(qty),
          valor: product?.preco || 0
        };
      })
      .filter((it) => Number(it.quantidade) > 0);

    const newOrder: Pedido = {
      id: generateUUID(),
      cliente_nome: clienteNome || 'Cliente Anônimo',
      cliente_telefone: clienteCelular || '',
      quiosque: clienteQuiosque || 'Quiosque',
      status: 'Recebido',
      valor_total: subtotal,
      taxa_servico: taxAmount,
      valor_final: finalAmount,
      observacoes: observacoes.trim(),
      created_at: new Date().toISOString(),
      itens: orderItens,
      synced: networkStatus === 'online',
      pago: false
    };

    // Store in all historic tracker local for tracking status
    await offlineDB.saveOrderHistory(newOrder);

    // Update local products stock state
    setProdutos((prev) => {
      const updated = prev.map((p) => {
        const orderItem = orderItens.find((it) => it.produto_id === p.id);
        if (orderItem && p.estoque !== undefined && p.estoque !== null) {
          const newEstoque = Math.max(0, p.estoque - orderItem.quantidade);
          return { ...p, estoque: newEstoque };
        }
        return p;
      });
      offlineDB.saveProdutos(updated);
      return updated;
    });

    if (networkStatus === 'offline') {
      // Queue it in local IndexedDB
      await offlineDB.savePendingOrder(newOrder);
      const pendingList = await offlineDB.getPendingOrders();
      setPendingCount(pendingList.length);
      showToast('Pedido salvo offline! Será enviado automaticamente ao voltar a internet.', 'warning');
    } else {
      // Connect and send to real-time database or server API
      try {
        const realSupabase = getSupabase();
        let syncedSuccessfully = false;

        if (realSupabase && hasSupabaseConfig) {
          try {
            const orderId = isValidUUID(newOrder.id) ? newOrder.id : generateUUID();
            const { error: ordErr } = await realSupabase.from('pedidos').insert({
              id: orderId,
              cliente_nome: newOrder.cliente_nome,
              cliente_telefone: newOrder.cliente_telefone || '',
              quiosque: newOrder.quiosque,
              status: newOrder.status,
              valor_total: newOrder.valor_total,
              taxa_servico: newOrder.taxa_servico,
              valor_final: newOrder.valor_final,
              observacoes: newOrder.observacoes,
              created_at: newOrder.created_at,
              pago: false
            });
            if (ordErr) throw ordErr;

            const itemsToInsert = newOrder.itens.map((it) => ({
              pedido_id: orderId,
              produto_id: it.produto_id,
              produto_nome: it.produto_nome,
              quantidade: it.quantidade,
              valor: it.valor
            }));

            const { error: itemsErr } = await realSupabase.from('pedido_itens').insert(itemsToInsert);
            if (itemsErr) throw itemsErr;

            // Decrement stock in Supabase table
            for (const item of newOrder.itens) {
              const prod = produtos.find((p) => p.id === item.produto_id);
              if (prod && prod.estoque !== undefined && prod.estoque !== null) {
                const newEstoque = Math.max(0, prod.estoque - item.quantidade);
                await realSupabase.from('produtos').update({ estoque: newEstoque }).eq('id', prod.id);
              }
            }

            // Update client status_conta to 'Conta em Aberto' because they placed a new order
            try {
              const clientPhone = (newOrder.cliente_telefone || '').replace(/\D/g, '');
              if (clientPhone) {
                await realSupabase
                  .from('clientes')
                  .update({ status_conta: 'Conta em Aberto' })
                  .eq('telefone', clientPhone);
              } else {
                await realSupabase
                  .from('clientes')
                  .update({ status_conta: 'Conta em Aberto' })
                  .eq('nome', newOrder.cliente_nome)
                  .eq('quiosque', newOrder.quiosque);
              }
            } catch (clientUpdateErr) {
              console.warn('Failed to update client status_conta to Conta em Aberto on order submission:', clientUpdateErr);
            }

            syncedSuccessfully = true;
          } catch (supabaseErr) {
            console.error('Failed to submit to Supabase, falling back to Express:', supabaseErr);
          }
        }

        if (!syncedSuccessfully) {
          // Express Post
          const res = await fetch(getApiUrl('/api/orders'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newOrder)
          });
          if (!res.ok) {
            throw new Error(`Express server order submission failed with status ${res.status}`);
          }
        }
        showToast('Pedido enviado para a cozinha com sucesso!', 'success');
      } catch (err) {
        console.error('Failed to submit order directly:', err);
        // Fallback to offline queue
        await offlineDB.savePendingOrder(newOrder);
        const pendingList = await offlineDB.getPendingOrders();
        setPendingCount(pendingList.length);
        showToast('Erro ao transmitir. Pedido guardado localmente para re-sincronizar.', 'warning');
      }
    }

    // Reset Cart
    setCart({});
    setShowCart(false);
    setActiveView('orders_status');
  };

  // CLIENT OPERATIONS (Cancel & Request Bill)
  const handleCancelOrder = async (orderId: string) => {
    const realSupabase = getSupabase();
    if (realSupabase && hasSupabaseConfig && isValidUUID(orderId)) {
      try {
        await realSupabase
          .from('pedidos')
          .update({ status: 'Cancelado' })
          .eq('id', orderId);
        showToast('Pedido cancelado com sucesso!', 'success');
        fetchOrders();
      } catch (err) {
        console.error('Error cancelling order on Supabase:', err);
        showToast('Erro ao cancelar pedido.', 'error');
      }
    } else {
      try {
        const res = await fetch(getApiUrl(`/api/orders/${orderId}/status`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Cancelado' })
        });
        if (res.ok) {
          showToast('Pedido cancelado com sucesso!', 'success');
        } else {
          showToast('Erro ao cancelar pedido.', 'error');
        }
      } catch (err) {
        console.error('Error cancelling order locally:', err);
        showToast('Erro ao cancelar pedido.', 'error');
      }
    }
  };

  const handleCloseBill = async () => {
    if (!clienteNome || !clienteQuiosque) return;

    const clientCel = safeStorage.getItem('cliente_celular') || clienteCelular || '';
    const clientActiveOrders = orders.filter(o => {
      if (o.status === 'Cancelado' || o.pago) return false;
      
      const orderPhone = (o.cliente_telefone || '').replace(/\D/g, '');
      const clientPhoneNormalized = clientCel.replace(/\D/g, '');
      if (clientPhoneNormalized && orderPhone) {
        if (clientPhoneNormalized === orderPhone || 
            clientPhoneNormalized.endsWith(orderPhone) || 
            orderPhone.endsWith(clientPhoneNormalized)) {
          return true;
        }
      }

      const orderKiosk = normalizeString(o.quiosque);
      const clientKiosk = normalizeString(clienteQuiosque);
      const orderName = normalizeString(o.cliente_nome);
      const clientName = normalizeString(clienteNome);

      if (orderKiosk === clientKiosk) {
        if (orderName === clientName) return true;
        const orderFirstName = orderName.split(' ')[0];
        const clientFirstName = clientName.split(' ')[0];
        if (orderFirstName && clientFirstName && orderFirstName === clientFirstName) {
          return true;
        }
      }
      return false;
    });

    const totalBillAmount = clientActiveOrders.reduce((sum, o) => sum + o.valor_final, 0);

    const realSupabase = getSupabase();
    if (realSupabase && hasSupabaseConfig) {
      try {
        // 1. Update orders in Supabase
        if (clientActiveOrders.length > 0) {
          const ids = clientActiveOrders.map(o => o.id);
          await realSupabase
            .from('pedidos')
            .update({ conta_solicitada: true })
            .in('id', ids);
        }

        // 2. Update client status in Supabase
        if (clientCel) {
          await realSupabase
            .from('clientes')
            .update({ 
              status_conta: 'Aguardando confirmação de Pagamento', 
              valor_total_conta: totalBillAmount 
            })
            .eq('telefone', clientCel);
        } else {
          await realSupabase
            .from('clientes')
            .update({ 
              status_conta: 'Aguardando confirmação de Pagamento', 
              valor_total_conta: totalBillAmount 
            })
            .eq('nome', clienteNome)
            .eq('quiosque', clienteQuiosque);
        }

        showToast('Sua solicitação de fechamento de conta foi enviada ao garçom!', 'success');
        await Promise.all([fetchOrders(), fetchClientes()]);
      } catch (err) {
        console.error('Error closing bill on Supabase:', err);
        showToast('Erro ao solicitar fechamento de conta.', 'error');
      }
    } else {
      try {
        const res = await fetch(getApiUrl('/api/clients/close-bill'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiosque: clienteQuiosque, cliente_nome: clienteNome })
        });
        if (res.ok) {
          showToast('Sua solicitação de fechamento de conta foi enviada ao garçom!', 'success');
          await Promise.all([fetchOrders(), fetchClientes()]);
        } else {
          showToast('Erro ao solicitar fechamento de conta.', 'error');
        }
      } catch (err) {
        console.error('Error requesting bill locally:', err);
        showToast('Erro ao solicitar fechamento de conta.', 'error');
      }
    }
  };

  const handlePayBill = async (quiosque: string, cliNome: string) => {
    const normQuiosque = normalizeString(quiosque);
    const normCliNome = normalizeString(cliNome);

    // Find client in state
    const client = clientes.find(c => {
      const k = normalizeString(c.quiosque);
      const n = normalizeString(c.nome);
      return k === normQuiosque && (n === normCliNome || n.split(' ')[0] === normCliNome.split(' ')[0]);
    });

    const clientPhone = client ? (client.celular || client.telefone || '').replace(/\D/g, '') : '';

    // Calculate which order IDs in local memory match this client
    const localMatchingOrderIds = orders
      .filter(order => {
        if (order.status === 'Cancelado' || order.pago) return false;

        const orderPhone = (order.cliente_telefone || '').replace(/\D/g, '');
        if (clientPhone && orderPhone) {
          if (clientPhone === orderPhone || 
              clientPhone.endsWith(orderPhone) || 
              orderPhone.endsWith(clientPhone)) {
            return true;
          }
        }

        const orderKiosk = normalizeString(order.quiosque);
        const orderName = normalizeString(order.cliente_nome);

        if (orderKiosk === normQuiosque) {
          if (orderName === normCliNome) return true;
          const orderFirstName = orderName.split(' ')[0];
          const clientFirstName = normCliNome.split(' ')[0];
          if (orderFirstName && clientFirstName && orderFirstName === clientFirstName) {
            return true;
          }
        }
        return false;
      })
      .map(o => o.id);

    // OPTIMISTIC UPDATE: Update local React state immediately so UI updates instantly!
    setOrders(prev => prev.map(o => {
      const orderPhone = (o.cliente_telefone || '').replace(/\D/g, '');
      const isPhoneMatch = clientPhone && orderPhone && (clientPhone === orderPhone || clientPhone.endsWith(orderPhone) || orderPhone.endsWith(clientPhone));
      const orderKiosk = normalizeString(o.quiosque);
      const orderName = normalizeString(o.cliente_nome);
      const isNameAndKioskMatch = orderKiosk === normQuiosque && (
        orderName === normCliNome || 
        orderName.split(' ')[0] === normCliNome.split(' ')[0]
      );
      
      if ((isPhoneMatch || isNameAndKioskMatch) && o.status !== 'Cancelado' && !o.pago) {
        return { ...o, status: 'Entregue', conta_solicitada: false, pago: true };
      }
      return o;
    }));

    setClientes(prev => prev.map(c => {
      const k = normalizeString(c.quiosque);
      const n = normalizeString(c.nome);
      if (k === normQuiosque && (n === normCliNome || n.split(' ')[0] === normCliNome.split(' ')[0])) {
        return { ...c, status_conta: 'Conta Paga', valor_total_conta: 0 };
      }
      return c;
    }));

    const realSupabase = getSupabase();
    if (realSupabase && hasSupabaseConfig) {
      try {
        // 1. Gather all potentially matching active orders from the live database
        const { data: dbOrders, error: dbOrdersErr } = await realSupabase
          .from('pedidos')
          .select('*')
          .eq('pago', false);

        if (dbOrdersErr) throw dbOrdersErr;

        // Collect all IDs to update using local robust normalized checks
        const ordersToUpdateIds: string[] = [...localMatchingOrderIds];
        
        if (dbOrders && dbOrders.length > 0) {
          dbOrders.forEach(order => {
            if (order.status === 'Cancelado') return;
            
            const orderPhone = (order.cliente_telefone || '').replace(/\D/g, '');
            const isPhoneMatch = clientPhone && orderPhone && (clientPhone === orderPhone || clientPhone.endsWith(orderPhone) || orderPhone.endsWith(clientPhone));
            const orderKiosk = normalizeString(order.quiosque);
            const orderName = normalizeString(order.cliente_nome);
            const isNameAndKioskMatch = orderKiosk === normQuiosque && (
              orderName === normCliNome || 
              orderName.split(' ')[0] === normCliNome.split(' ')[0]
            );

            if ((isPhoneMatch || isNameAndKioskMatch) && !ordersToUpdateIds.includes(order.id)) {
              ordersToUpdateIds.push(order.id);
            }
          });
        }

        // Apply bulk update on all matched orders
        if (ordersToUpdateIds.length > 0) {
          const { error: orderUpdateErr } = await realSupabase
            .from('pedidos')
            .update({ status: 'Entregue', conta_solicitada: false, pago: true })
            .in('id', ordersToUpdateIds);
          if (orderUpdateErr) throw orderUpdateErr;
        }

        // 2. Fetch all clients from the database to find the exact primary key match (or matching name/kiosk)
        const { data: dbClients, error: dbClientsErr } = await realSupabase
          .from('clientes')
          .select('*');

        if (dbClientsErr) throw dbClientsErr;

        if (dbClients && dbClients.length > 0) {
          const matchingDbClients = dbClients.filter(c => {
            const k = normalizeString(c.quiosque);
            const n = normalizeString(c.nome);
            return k === normQuiosque && (n === normCliNome || n.split(' ')[0] === normCliNome.split(' ')[0]);
          });

          // Update each matched client
          for (const dbCli of matchingDbClients) {
            const { error: clientUpdateErr } = await realSupabase
              .from('clientes')
              .update({ 
                status_conta: 'Conta Paga', 
                valor_total_conta: 0 
              })
              .eq('telefone', dbCli.telefone);
            if (clientUpdateErr) {
              console.warn(`Could not update client status via telefone key ${dbCli.telefone}:`, clientUpdateErr);
            }
          }
        }

        // Fallback updates to guarantee sync
        try {
          if (client && (client.telefone || client.celular)) {
            await realSupabase
              .from('clientes')
              .update({ status_conta: 'Conta Paga', valor_total_conta: 0 })
              .eq('telefone', client.telefone || client.celular);
          }
          await realSupabase
            .from('clientes')
            .update({ status_conta: 'Conta Paga', valor_total_conta: 0 })
            .eq('nome', cliNome)
            .eq('quiosque', quiosque);
        } catch {}

        showToast(`Conta da mesa ${quiosque} finalizada com sucesso!`, 'success');
        // Final refresh to ensure absolute sync
        await Promise.all([fetchOrders(), fetchClientes()]);
      } catch (err) {
        console.error('Error paying bill on Supabase:', err);
        showToast('Erro ao finalizar conta. Verifique se as novas colunas e tabelas foram criadas no Supabase SQL Editor.', 'error');
      }
    } else {
      try {
        const res = await fetch(getApiUrl('/api/clients/pay-bill'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiosque, cliente_nome: cliNome })
        });
        if (res.ok) {
          showToast(`Conta da mesa ${quiosque} finalizada com sucesso!`, 'success');
          await Promise.all([fetchOrders(), fetchClientes()]);
        } else {
          showToast('Erro ao finalizar conta no servidor.', 'error');
        }
      } catch (err) {
        console.error('Error paying bill locally:', err);
        showToast('Erro ao finalizar conta localmente.', 'error');
      }
    }
  };

  // ADMIN OPERATIONS (CRUD & status updates)
  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig && isValidUUID(id)) {
        const { error } = await realSupabase.from('pedidos').update({ status }).eq('id', id);
        if (error) throw error;
        
        // Update local React state immediately
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status } : o))
        );
      } else {
        const res = await fetch(`/api/orders/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (!res.ok) throw new Error('Falha ao atualizar no servidor');
        
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status } : o))
        );
      }
      showToast(`Pedido status atualizado para ${status}.`, 'success');
    } catch (err: any) {
      console.error('Failed to update status:', err);
      showToast(`Erro ao atualizar status: ${err.message || err}`, 'error');
    }
  };

  const handleAddProduct = async (prod: Omit<Produto, 'id'>) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        const { data, error } = await realSupabase.from('produtos').insert(prod).select();
        if (error) throw error;
        
        if (data && data[0]) {
          const newProd: Produto = {
            id: data[0].id,
            nome: data[0].nome,
            descricao: data[0].descricao,
            categoria: data[0].categoria,
            preco: parseFloat(data[0].preco),
            imagem: data[0].imagem,
            ativo: data[0].ativo,
            ordem: data[0].ordem
          };
          setProdutos((prev) => [...prev, newProd]);
          await offlineDB.saveProdutos([...produtos, newProd]);
        } else {
          // Fallback if select doesn't return data (due to some RLS/triggers)
          const { data: allProds } = await realSupabase.from('produtos').select('*').order('ordem');
          if (allProds) {
            const mapped = allProds.map((p: any) => ({
              id: p.id,
              nome: p.nome,
              descricao: p.descricao,
              categoria: p.categoria,
              preco: parseFloat(p.preco),
              imagem: p.imagem,
              ativo: p.ativo,
              ordem: p.ordem
            }));
            setProdutos(mapped);
            await offlineDB.saveProdutos(mapped);
          }
        }
      } else {
        const res = await fetch(getApiUrl('/api/products'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prod)
        });
        if (!res.ok) throw new Error('Falha ao criar produto no servidor');
        const newProd = await res.json();
        
        setProdutos((prev) => {
          if (prev.some((p) => p.id === newProd.id)) return prev;
          const updated = [...prev, newProd];
          offlineDB.saveProdutos(updated);
          return updated;
        });
      }
      showToast(`Produto "${prod.nome}" adicionado com sucesso.`, 'success');
    } catch (err: any) {
      console.error('Failed to add product:', err);
      showToast(`Erro ao adicionar produto: ${err.message || err}`, 'error');
    }
  };

  const handleUpdateProduct = async (id: string, prod: Partial<Produto>) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig && isValidUUID(id)) {
        const { error } = await realSupabase.from('produtos').update(prod).eq('id', id);
        if (error) throw error;
        
        setProdutos((prev) => {
          const updated = prev.map((p) => (p.id === id ? { ...p, ...prod } : p));
          offlineDB.saveProdutos(updated);
          return updated;
        });
      } else {
        const res = await fetch(getApiUrl(`/api/products/${id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prod)
        });
        if (!res.ok) throw new Error('Falha ao atualizar produto no servidor');
        const updatedProd = await res.json();
        
        setProdutos((prev) => {
          const updated = prev.map((p) => (p.id === id ? { ...p, ...updatedProd } : p));
          offlineDB.saveProdutos(updated);
          return updated;
        });
      }
      showToast('Produto atualizado com sucesso.', 'success');
    } catch (err: any) {
      console.error('Failed to update product:', err);
      showToast(`Erro ao atualizar produto: ${err.message || err}`, 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig && isValidUUID(id)) {
        const { error } = await realSupabase.from('produtos').delete().eq('id', id);
        if (error) throw error;
        
        setProdutos((prev) => {
          const updated = prev.filter((p) => p.id !== id);
          offlineDB.saveProdutos(updated);
          return updated;
        });
      } else {
        const res = await fetch(getApiUrl(`/api/products/${id}`), { method: 'DELETE' });
        if (!res.ok) throw new Error('Falha ao remover produto no servidor');
        
        setProdutos((prev) => {
          const updated = prev.filter((p) => p.id !== id);
          offlineDB.saveProdutos(updated);
          return updated;
        });
      }
      showToast('Produto removido com sucesso.', 'info');
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      showToast(`Erro ao remover produto: ${err.message || err}`, 'error');
    }
  };

  const handleAddCategory = async (nome: string) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        const { data, error } = await realSupabase.from('categorias').insert({ nome }).select();
        if (error) throw error;
        
        if (data && data[0]) {
          const newCat: Categoria = {
            id: data[0].id,
            nome: data[0].nome
          };
          setCategorias((prev) => [...prev, newCat]);
          await offlineDB.saveCategorias([...categorias, newCat]);
        } else {
          const { data: allCats } = await realSupabase.from('categorias').select('*');
          if (allCats) {
            setCategorias(allCats);
            await offlineDB.saveCategorias(allCats);
          }
        }
      } else {
        const res = await fetch(getApiUrl('/api/categories'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome })
        });
        if (!res.ok) throw new Error('Falha ao criar categoria no servidor');
        const newCat = await res.json();
        
        setCategorias((prev) => {
          if (prev.some((c) => c.id === newCat.id)) return prev;
          const updated = [...prev, newCat];
          offlineDB.saveCategorias(updated);
          return updated;
        });
      }
      showToast(`Categoria "${nome}" criada com sucesso.`, 'success');
    } catch (err: any) {
      console.error('Failed to add category:', err);
      showToast(`Erro ao adicionar categoria: ${err.message || err}`, 'error');
    }
  };

  const handleUpdateCategory = async (id: string, nome: string) => {
    try {
      const realSupabase = getSupabase();
      const oldCat = categorias.find((c) => c.id === id);
      
      if (realSupabase && hasSupabaseConfig && isValidUUID(id)) {
        const { error } = await realSupabase.from('categorias').update({ nome }).eq('id', id);
        if (error) throw error;
        
        setCategorias((prev) => {
          const updated = prev.map((c) => (c.id === id ? { ...c, nome } : c));
          offlineDB.saveCategorias(updated);
          return updated;
        });

        if (oldCat) {
          // Cascade category update to products table in Supabase
          await realSupabase.from('produtos').update({ categoria: nome }).eq('categoria', oldCat.nome);
          setProdutos((prev) => {
            const updated = prev.map((p) => p.categoria === oldCat.nome ? { ...p, categoria: nome } : p);
            offlineDB.saveProdutos(updated);
            return updated;
          });
        }
      } else {
        const res = await fetch(getApiUrl(`/api/categories/${id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome })
        });
        if (!res.ok) throw new Error('Falha ao atualizar categoria no servidor');
        const updatedCat = await res.json();
        
        setCategorias((prev) => {
          const updated = prev.map((c) => (c.id === id ? updatedCat : c));
          offlineDB.saveCategorias(updated);
          return updated;
        });

        if (oldCat) {
          setProdutos((prev) => {
            const updated = prev.map((p) => p.categoria === oldCat.nome ? { ...p, categoria: nome } : p);
            offlineDB.saveProdutos(updated);
            return updated;
          });
        }
      }
      showToast('Categoria atualizada com sucesso.', 'success');
    } catch (err: any) {
      console.error('Failed to update category:', err);
      showToast(`Erro ao atualizar categoria: ${err.message || err}`, 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const realSupabase = getSupabase();
      const oldCat = categorias.find((c) => c.id === id);
      
      if (realSupabase && hasSupabaseConfig && isValidUUID(id)) {
        if (oldCat) {
          // Cascade delete products in this category in Supabase FIRST to avoid FK constraint violation
          const { error: prodErr } = await realSupabase.from('produtos').delete().eq('categoria', oldCat.nome);
          if (prodErr) throw prodErr;
          
          setProdutos((prev) => {
            const updated = prev.filter((p) => p.categoria !== oldCat.nome);
            offlineDB.saveProdutos(updated);
            return updated;
          });
        }

        const { error } = await realSupabase.from('categorias').delete().eq('id', id);
        if (error) throw error;
        
        setCategorias((prev) => {
          const updated = prev.filter((c) => c.id !== id);
          offlineDB.saveCategorias(updated);
          return updated;
        });
      } else {
        const res = await fetch(getApiUrl(`/api/categories/${id}`), { method: 'DELETE' });
        if (!res.ok) throw new Error('Falha ao remover categoria do servidor');
        
        setCategorias((prev) => {
          const updated = prev.filter((c) => c.id !== id);
          offlineDB.saveCategorias(updated);
          return updated;
        });

        if (oldCat) {
          setProdutos((prev) => {
            const updated = prev.filter((p) => p.categoria !== oldCat.nome);
            offlineDB.saveProdutos(updated);
            return updated;
          });
        }
      }
      showToast('Categoria removida do cardápio.', 'info');
    } catch (err: any) {
      console.error('Failed to delete category:', err);
      showToast(`Erro ao remover categoria: ${err.message || err}`, 'error');
    }
  };

  const handleAddClient = async (cli: Omit<Cliente, 'id'>) => {
    try {
      const realSupabase = getSupabase();
      const clientData = {
        ...cli,
        telefone: cli.telefone || cli.celular
      };
      if (realSupabase && hasSupabaseConfig) {
        const { data, error } = await realSupabase.from('clientes').insert(clientData).select();
        if (error) throw error;
        
        if (data && data[0]) {
          const mappedNew = {
            id: data[0].telefone || data[0].celular || 'c_' + Math.random().toString(36).substr(2, 9),
            ...data[0]
          };
          setClientes((prev) => [mappedNew, ...prev]);
        } else {
          const { data: allClis } = await realSupabase.from('clientes').select('*').order('created_at', { ascending: false });
          if (allClis) {
            setClientes(allClis.map((c: any) => ({
              id: c.telefone || c.celular || 'c_' + Math.random().toString(36).substr(2, 9),
              ...c
            })));
          }
        }
      } else {
        const res = await fetch(getApiUrl('/api/clients'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
        if (!res.ok) throw new Error('Falha ao cadastrar cliente no servidor');
        const newCli = await res.json();
        
        setClientes((prev) => {
          if (prev.some((c) => c.id === newCli.id)) return prev;
          return [newCli, ...prev];
        });
      }
      showToast('Cliente cadastrado com sucesso.', 'success');
    } catch (err: any) {
      console.error('Failed to add client:', err);
      showToast(`Erro ao cadastrar cliente: ${err.message || err}`, 'error');
    }
  };

  const handleUpdateClient = async (id: string, cli: Partial<Cliente>) => {
    try {
      const realSupabase = getSupabase();
      const clientData = {
        ...cli,
        telefone: cli.telefone || cli.celular
      };
      if (realSupabase && hasSupabaseConfig) {
        const { error } = await realSupabase.from('clientes').update({
          nome: clientData.nome,
          quiosque: clientData.quiosque,
          celular: clientData.celular,
          telefone: clientData.telefone
        }).eq('telefone', id);
        if (error) throw error;
        
        setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, ...clientData } : c)));
      } else {
        const res = await fetch(getApiUrl(`/api/clients/${id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
        if (!res.ok) throw new Error('Falha ao atualizar cliente no servidor');
        const updatedCli = await res.json();
        
        setClientes((prev) => prev.map((c) => (c.id === id ? updatedCli : c)));
      }
      showToast('Perfil do cliente updated com sucesso.', 'success');
    } catch (err: any) {
      console.error('Failed to update client:', err);
      showToast(`Erro ao atualizar cliente: ${err.message || err}`, 'error');
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        const { error } = await realSupabase.from('clientes').delete().eq('telefone', id);
        if (error) throw error;
        
        setClientes((prev) => prev.filter((c) => c.id !== id));
      } else {
        const res = await fetch(getApiUrl(`/api/clients/${id}`), { method: 'DELETE' });
        if (!res.ok) throw new Error('Falha ao remover cliente no servidor');
        
        setClientes((prev) => prev.filter((c) => c.id !== id));
      }
      showToast('Cliente removido com sucesso.', 'info');
    } catch (err: any) {
      console.error('Failed to delete client:', err);
      showToast(`Erro ao remover cliente: ${err.message || err}`, 'error');
    }
  };

  const handleUpdateConfig = async (conf: ConfigEstabelecimento) => {
    try {
      // 1. Update React state
      setConfig(conf);

      // 2. Always persist to local Express server
      await fetch(getApiUrl('/api/config'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conf)
      });

      // 3. Persist to Supabase config_estabelecimento if connected
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        const { error } = await realSupabase
          .from('config_estabelecimento')
          .upsert({
            id: 1,
            nome: conf.nome,
            logo: conf.logo,
            telefone: conf.telefone,
            endereco: conf.endereco,
            taxa_servico: conf.taxa_servico,
            mensagem_inicial: conf.mensagem_inicial,
            horario_funcionamento: conf.horario_funcionamento,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
        
        if (error) {
          console.warn('Erro ao salvar no Supabase config_estabelecimento:', error);
        }
      }

      showToast('Configurações salvas com sucesso.', 'success');
    } catch (err: any) {
      console.error('Failed to update config:', err);
      showToast(`Erro ao atualizar configurações: ${err.message || err}`, 'error');
    }
  };

  const handleSyncLocalToSupabase = async () => {
    try {
      const realSupabase = getSupabase();
      if (!realSupabase || !hasSupabaseConfig) {
        showToast('Supabase não configurado ou desconectado. Verifique as credenciais.', 'warning');
        return;
      }

      showToast('Iniciando sincronização dos dados locais com o Supabase...', 'info');

      // 1. Sincronizar Categorias
      for (const cat of categorias) {
        const { error: catErr } = await realSupabase
          .from('categorias')
          .upsert({ nome: cat.nome }, { onConflict: 'nome' });
        if (catErr) {
          console.error('Erro ao sincronizar categoria:', cat.nome, catErr);
          throw catErr;
        }
      }

      // 2. Buscar produtos já existentes no Supabase para evitar duplicidade
      const { data: existingProds, error: fetchErr } = await realSupabase
        .from('produtos')
        .select('*');
      
      if (fetchErr) throw fetchErr;

      // 3. Sincronizar Produtos
      for (const prod of produtos) {
        const matched = existingProds?.find((p: any) => p.nome === prod.nome);
        if (matched) {
          // Atualizar produto existente
          const { error: updateErr } = await realSupabase
            .from('produtos')
            .update({
              descricao: prod.descricao,
              categoria: prod.categoria,
              preco: prod.preco,
              imagem: prod.imagem,
              ativo: prod.ativo,
              ordem: prod.ordem
            })
            .eq('id', matched.id);
          if (updateErr) {
            console.error('Erro ao atualizar produto:', prod.nome, updateErr);
            throw updateErr;
          }
        } else {
          // Inserir novo produto
          const { error: insertErr } = await realSupabase
            .from('produtos')
            .insert({
              nome: prod.nome,
              descricao: prod.descricao,
              categoria: prod.categoria,
              preco: prod.preco,
              imagem: prod.imagem,
              ativo: prod.ativo,
              ordem: prod.ordem
            });
          if (insertErr) {
            console.error('Erro ao inserir produto:', prod.nome, insertErr);
            throw insertErr;
          }
        }
      }

      // 4. Recarregar dados do Supabase para atualizar o estado local
      const { data: updatedCats } = await realSupabase.from('categorias').select('*');
      if (updatedCats) {
        setCategorias(updatedCats);
        await offlineDB.saveCategorias(updatedCats);
      }

      const { data: updatedProds } = await realSupabase.from('produtos').select('*').order('ordem');
      if (updatedProds) {
        const mappedProds = updatedProds.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao,
          categoria: p.categoria,
          preco: parseFloat(p.preco),
          imagem: p.imagem,
          ativo: p.ativo,
          ordem: p.ordem
        }));
        setProdutos(mappedProds);
        await offlineDB.saveProdutos(mappedProds);
      }

      showToast('Banco de dados local sincronizado com sucesso com o Supabase!', 'success');
    } catch (err: any) {
      console.error('Falha na sincronização completa:', err);
      showToast(`Erro na sincronização: ${err.message || 'Verifique se as tabelas foram criadas no SQL Editor.'}`, 'error');
    }
  };

  // Synchronize payment status changes of our orders to offlineDB histories
  useEffect(() => {
    const syncHistoriesToOfflineDB = async () => {
      try {
        const cachedHistories = await offlineDB.getOrderHistories();
        for (const order of orders) {
          const cached = cachedHistories.find(c => c.id === order.id);
          if (cached && cached.pago !== order.pago) {
            await offlineDB.saveOrderHistory({ ...cached, pago: order.pago, status: order.status });
          } else if (!cached && (order.cliente_telefone === clienteCelular || (order.cliente_nome === clienteNome && order.quiosque === clienteQuiosque))) {
            await offlineDB.saveOrderHistory(order);
          }
        }
      } catch (err) {
        console.error('Error syncing histories to offline DB:', err);
      }
    };
    if (orders.length > 0) {
      syncHistoriesToOfflineDB();
    }
  }, [orders, clienteCelular, clienteNome, clienteQuiosque]);

  // Client historical tracking filter helper
  const [localOrderHistoryList, setLocalOrderHistoryList] = useState<Pedido[]>([]);
  useEffect(() => {
    const fetchLocalHistories = async () => {
      const cachedHistories = await offlineDB.getOrderHistories();
      
      // Filter cached history list and include matching orders from current session start
      const filteredCached = cachedHistories.filter(
        (o) => {
          const isMatchingClient = o.cliente_telefone === clienteCelular || (o.cliente_nome === clienteNome && o.quiosque === clienteQuiosque);
          if (!isMatchingClient) return false;
          
          if (clienteSessionStart) {
            return new Date(o.created_at).getTime() >= new Date(clienteSessionStart).getTime();
          }
          return !o.pago; // Fallback to avoid older paid ones if session start is missing
        }
      );

      // Combine with active orders from current session start
      const matchingActive = orders.filter((o) => {
        let isMatchingClient = false;
        if (clienteCelular && o.cliente_telefone) {
          isMatchingClient = o.cliente_telefone === clienteCelular;
        } else {
          isMatchingClient = o.cliente_nome === clienteNome && o.quiosque === clienteQuiosque;
        }
        if (!isMatchingClient) return false;

        if (clienteSessionStart) {
          return new Date(o.created_at).getTime() >= new Date(clienteSessionStart).getTime();
        }
        return !o.pago; // Fallback to avoid older paid ones if session start is missing
      });

      // Unique-fy based on order ID
      const allMerged = [...matchingActive, ...filteredCached];
      const unique = allMerged.filter(
        (value, index, self) => self.findIndex((o) => o.id === value.id) === index
      );

      // Sort by latest
      unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setLocalOrderHistoryList(unique);
    };

    if (clienteNome && clienteQuiosque) {
      fetchLocalHistories();
    }
  }, [orders, clienteNome, clienteQuiosque, clienteCelular, clienteSessionStart]);

  return (
    <div className="relative min-h-screen bg-[#FDFBF7] text-[#1A2E35] font-sans selection:bg-[#0077BE] selection:text-white pb-16">
      {/* Floating toast notification manager */}
      <div id="toast-notification-region" className="fixed top-6 right-6 z-50 space-y-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="p-4 rounded-2xl shadow-xl flex items-center justify-between border pointer-events-auto backdrop-blur-md"
              style={{
                background: 'rgba(253, 251, 247, 0.95)',
                borderColor:
                  toast.type === 'success'
                    ? '#0077BE'
                    : toast.type === 'warning'
                    ? '#F27D26'
                    : '#E8E2D9',
                color: '#1A2E35'
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">
                  {toast.type === 'success' ? '✅' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}
                </span>
                <span className="text-xs font-bold leading-normal">{toast.text}</span>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-[#A89F91] hover:text-[#0077BE] ml-4 font-black text-xs cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Unified Routing Layouts */}
      <AnimatePresence mode="wait">
        {activeView === 'identification' && (
          <ClientIdentification
            config={config}
            onIdentify={handleIdentify}
            onEnterAdmin={() => setActiveView('admin')}
          />
        )}

        {activeView === 'cardapio' && (
          <motion.div
            key="cardapio-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Cardapio
              produtos={produtos}
              categorias={categorias}
              config={config}
              cart={cart}
              onUpdateCartQuantity={handleUpdateCartQuantity}
              onOpenCart={() => setShowCart(true)}
              clienteNome={clienteNome || ''}
              clienteQuiosque={clienteQuiosque || ''}
              onLogout={handleLogout}
            />

            {/* Quick access bottom tabs for Client Cardapio vs Active orders Status */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E8E2D9] py-3 px-6 flex justify-around items-center z-30 shadow-lg">
              <button
                onClick={() => setActiveView('cardapio')}
                className="flex flex-col items-center gap-1 text-[#0077BE] font-extrabold text-[10px] cursor-pointer transition-colors"
              >
                <Smartphone className="h-5 w-5" />
                <span>Ver Cardápio</span>
              </button>
              <button
                onClick={() => setActiveView('orders_status')}
                className="flex flex-col items-center gap-1 text-[#5C6B73] hover:text-[#0077BE] font-bold text-[10px] cursor-pointer transition-colors relative"
              >
                <ClipboardList className="h-5 w-5" />
                <span>Meus Pedidos</span>
                {localOrderHistoryList.length > 0 && (
                  <span className="absolute top-[-4px] right-2 bg-[#0077BE] text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    {localOrderHistoryList.length}
                  </span>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {activeView === 'orders_status' && (
          <motion.div
            key="orders-status-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PedidosStatus
              orders={localOrderHistoryList}
              onBackToMenu={() => setActiveView('cardapio')}
              onRefresh={fetchOrders}
              onCancelOrder={handleCancelOrder}
              onCloseBill={handleCloseBill}
              onClearSession={handleLogout}
            />

            {/* Same quick access bottom navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E8E2D9] py-3 px-6 flex justify-around items-center z-30 shadow-lg">
              <button
                onClick={() => setActiveView('cardapio')}
                className="flex flex-col items-center gap-1 text-[#5C6B73] hover:text-[#0077BE] font-bold text-[10px] cursor-pointer transition-colors"
              >
                <Smartphone className="h-5 w-5" />
                <span>Ver Cardápio</span>
              </button>
              <button
                onClick={() => setActiveView('orders_status')}
                className="flex flex-col items-center gap-1 text-[#0077BE] font-extrabold text-[10px] cursor-pointer transition-colors"
              >
                <ClipboardList className="h-5 w-5" />
                <span>Meus Pedidos</span>
              </button>
            </div>
          </motion.div>
        )}

        {activeView === 'admin' && (
          <motion.div
            key="admin-panel-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AdminPanel
              orders={orders}
              products={produtos}
              categorias={categorias}
              config={config}
              clientes={clientes}
              onPayBill={handlePayBill}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onUpdateConfig={handleUpdateConfig}
              onSyncLocalToSupabase={handleSyncLocalToSupabase}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              onRefreshData={async () => {
                await Promise.all([fetchOrders(), fetchClientes()]);
              }}
              supabaseStatus={supabaseStatus}
              onClose={() => {
                if (clienteNome) {
                  setActiveView('cardapio');
                } else {
                  setActiveView('identification');
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating network status widget */}
      <NetworkStatus status={networkStatus} pendingCount={pendingCount} />

      {/* Slide-in Carrinho Drawer Overlay */}
      <AnimatePresence>
        {showCart && (
          <Carrinho
            cart={cart}
            produtos={produtos}
            config={config}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onRemoveFromCart={handleRemoveFromCart}
            onClose={() => setShowCart(false)}
            onSubmitOrder={handleSubmitOrder}
            isOffline={networkStatus === 'offline'}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
