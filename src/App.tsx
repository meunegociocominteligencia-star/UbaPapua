/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingBag, ClipboardList, Database, LogIn, RefreshCw, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Categoria, Produto, Pedido, ConfigEstabelecimento, OrderStatus, PedidoItem } from './types';
import { DEFAULT_PRODUTOS, DEFAULT_CATEGORIAS, DEFAULT_CONFIG } from './lib/establishment';
import { offlineDB } from './lib/db';
import { getSupabase, hasSupabaseConfig } from './lib/supabase';
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

export default function App() {
  // Session / Router state
  const [clienteNome, setClienteNome] = useState<string | null>(
    localStorage.getItem('cliente_nome')
  );
  const [clienteQuiosque, setClienteQuiosque] = useState<string | null>(
    localStorage.getItem('cliente_quiosque')
  );
  const [activeView, setActiveView] = useState<'identification' | 'cardapio' | 'orders_status' | 'admin'>(
    localStorage.getItem('cliente_nome') ? 'cardapio' : 'identification'
  );

  // Core content states
  const [produtos, setProdutos] = useState<Produto[]>(DEFAULT_PRODUTOS);
  const [categorias, setCategorias] = useState<Categoria[]>(DEFAULT_CATEGORIAS);
  const [config, setConfig] = useState<ConfigEstabelecimento>(DEFAULT_CONFIG);
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Interactive controls
  const [cart, setCart] = useState<{ [id: string]: number }>(() => {
    try {
      const saved = localStorage.getItem('cart');
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
    localStorage.setItem('cart', JSON.stringify(cart));
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

          const { data: orderData } = await realSupabase.from('pedidos').select('*, pedido_itens(*)').order('created_at', { ascending: false });
          if (orderData) {
            const mappedOrders = orderData.map((o: any) => ({
              id: o.id,
              cliente_nome: o.cliente_nome,
              quiosque: o.quiosque,
              status: o.status,
              valor_total: parseFloat(o.valor_total),
              taxa_servico: parseFloat(o.taxa_servico),
              valor_final: parseFloat(o.valor_final),
              observacoes: o.observacoes,
              created_at: o.created_at,
              itens: o.pedido_itens.map((it: any) => ({
                produto_id: it.produto_id,
                produto_nome: it.produto_nome,
                quantidade: it.quantidade,
                valor: parseFloat(it.valor)
              }))
            }));
            setOrders(mappedOrders);
          }
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
          fetchSupabaseInitial();
          showToast('Lista de pedidos atualizada na nuvem!', 'info');
        })
        .subscribe();

      return () => {
        productsSub.unsubscribe();
        ordersSub.unsubscribe();
      };
    } else {
      // Setup Server-Sent Events stream from the local Express server (unconfigured Supabase fallback)
      setSupabaseStatus('unconfigured');
      const eventSource = new EventSource('/api/orders/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'init') {
            setOrders(data.pedidos);
            setProdutos(data.produtos);
            setCategorias(data.categorias);
            setConfig(data.config);
            // Save cache
            offlineDB.saveProdutos(data.produtos);
            offlineDB.saveCategorias(data.categorias);
          } else if (data.type === 'order_created') {
            setOrders((prev) => [data.order, ...prev]);
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
          } else if (data.type === 'product_created' || data.type === 'product_updated' || data.type === 'product_deleted') {
            // Refetch or update products
            fetch('/api/products')
              .then((res) => res.json())
              .then((prods) => {
                setProdutos(prods);
                offlineDB.saveProdutos(prods);
              });
          } else if (data.type === 'category_created' || data.type === 'category_updated' || data.type === 'category_deleted') {
            fetch('/api/categories')
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
          const res = await fetch('/api/orders', {
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
  const handleIdentify = (nome: string, quiosque: string) => {
    setClienteNome(nome);
    setClienteQuiosque(quiosque);
    localStorage.setItem('cliente_nome', nome);
    localStorage.setItem('cliente_quiosque', quiosque);
    setActiveView('cardapio');
    showToast(`Bem-vindo, ${nome}! Boas compras.`, 'success');
  };

  // Log out or change kiosk table session
  const handleLogout = () => {
    setClienteNome(null);
    setClienteQuiosque(null);
    localStorage.removeItem('cliente_nome');
    localStorage.removeItem('cliente_quiosque');
    setCart({});
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
      quiosque: clienteQuiosque || 'Quiosque',
      status: 'Recebido',
      valor_total: subtotal,
      taxa_servico: taxAmount,
      valor_final: finalAmount,
      observacoes: observacoes.trim(),
      created_at: new Date().toISOString(),
      itens: orderItens,
      synced: networkStatus === 'online'
    };

    // Store in all historic tracker local for tracking status
    await offlineDB.saveOrderHistory(newOrder);

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
              quiosque: newOrder.quiosque,
              status: newOrder.status,
              valor_total: newOrder.valor_total,
              taxa_servico: newOrder.taxa_servico,
              valor_final: newOrder.valor_final,
              observacoes: newOrder.observacoes,
              created_at: newOrder.created_at
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

            syncedSuccessfully = true;
          } catch (supabaseErr) {
            console.error('Failed to submit to Supabase, falling back to Express:', supabaseErr);
          }
        }

        if (!syncedSuccessfully) {
          // Express Post
          const res = await fetch('/api/orders', {
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

  // ADMIN OPERATIONS (CRUD & status updates)
  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        await realSupabase.from('pedidos').update({ status }).eq('id', id);
      } else {
        await fetch(`/api/orders/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
      }
      showToast(`Pedido status atualizado para ${status}.`, 'success');
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAddProduct = async (prod: Omit<Produto, 'id'>) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        await realSupabase.from('produtos').insert(prod);
      } else {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prod)
        });
      }
      showToast(`Produto "${prod.nome}" adicionado com sucesso.`, 'success');
    } catch (err) {
      console.error('Failed to add product:', err);
    }
  };

  const handleUpdateProduct = async (id: string, prod: Partial<Produto>) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        await realSupabase.from('produtos').update(prod).eq('id', id);
      } else {
        await fetch(`/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prod)
        });
      }
      showToast('Produto atualizado com sucesso.', 'success');
    } catch (err) {
      console.error('Failed to update product:', err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        await realSupabase.from('produtos').delete().eq('id', id);
      } else {
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
      }
      showToast('Produto removido com sucesso.', 'info');
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  const handleAddCategory = async (nome: string) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        await realSupabase.from('categorias').insert({ nome });
      } else {
        await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome })
        });
      }
      showToast(`Categoria "${nome}" criada com sucesso.`, 'success');
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  const handleUpdateCategory = async (id: string, nome: string) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        await realSupabase.from('categorias').update({ nome }).eq('id', id);
      } else {
        await fetch(`/api/categories/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome })
        });
      }
      showToast('Categoria atualizada com sucesso.', 'success');
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        await realSupabase.from('categorias').delete().eq('id', id);
      } else {
        await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      }
      showToast('Categoria removida do cardápio.', 'info');
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const handleUpdateConfig = async (conf: ConfigEstabelecimento) => {
    try {
      const realSupabase = getSupabase();
      if (realSupabase && hasSupabaseConfig) {
        // Since config is stored locally in preview mock on unconfigured, we just save to memory.
        // For real Supabase, you'd have a config table.
        setConfig(conf);
      } else {
        await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conf)
        });
      }
      showToast('Configurações salvas com sucesso.', 'success');
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  };

  // Client historical tracking filter helper
  const [localOrderHistoryList, setLocalOrderHistoryList] = useState<Pedido[]>([]);
  useEffect(() => {
    const fetchLocalHistories = async () => {
      const cachedHistories = await offlineDB.getOrderHistories();
      // Combine with active orders matching customer's name and table location
      const matchingActive = orders.filter(
        (o) => o.cliente_nome === clienteNome && o.quiosque === clienteQuiosque
      );

      // Unique-fy based on order ID
      const allMerged = [...matchingActive, ...cachedHistories];
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
  }, [orders, clienteNome, clienteQuiosque]);

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
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onUpdateConfig={handleUpdateConfig}
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
