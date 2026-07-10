/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Settings,
  Database,
  Coffee,
  Check,
  X,
  FileCode,
  ArrowLeft,
  ChevronDown,
  Percent,
  MapPin,
  Phone,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pedido, Produto, Categoria, ConfigEstabelecimento, OrderStatus } from '../types';
import { SUPABASE_SQL_SETUP, hasSupabaseConfig } from '../lib/supabase';

interface AdminPanelProps {
  orders: Pedido[];
  products: Produto[];
  categorias: Categoria[];
  config: ConfigEstabelecimento;
  onUpdateOrderStatus: (id: string, status: OrderStatus) => void;
  onAddProduct: (prod: Omit<Produto, 'id'>) => void;
  onUpdateProduct: (id: string, prod: Partial<Produto>) => void;
  onDeleteProduct: (id: string) => void;
  onAddCategory: (nome: string) => void;
  onUpdateCategory: (id: string, nome: string) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateConfig: (conf: ConfigEstabelecimento) => void;
  onClose: () => void;
  supabaseStatus: 'connected' | 'disconnected' | 'unconfigured';
}

export function AdminPanel({
  orders,
  products,
  categorias,
  config,
  onUpdateOrderStatus,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateConfig,
  onClose,
  supabaseStatus
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'categories' | 'settings' | 'supabase'>('orders');

  // Dashboard Stats
  const stats = useMemo(() => {
    let salesTotal = 0;
    let totalCount = 0;
    let pendingCount = 0;
    let prepCount = 0;
    let readyCount = 0;
    let deliveredCount = 0;

    orders.forEach((o) => {
      if (o.status !== 'Cancelado') {
        salesTotal += o.valor_final;
        totalCount++;
      }
      if (o.status === 'Recebido') pendingCount++;
      else if (o.status === 'Em preparo') prepCount++;
      else if (o.status === 'Pronto') readyCount++;
      else if (o.status === 'Entregue') deliveredCount++;
    });

    return {
      salesTotal,
      totalCount,
      pendingCount,
      prepCount,
      readyCount,
      deliveredCount
    };
  }, [orders]);

  // Products CRUD State
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [prodForm, setProdForm] = useState({
    nome: '',
    descricao: '',
    preco: '',
    categoria: '',
    imagem: '',
    ativo: true
  });

  // Category CRUD State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);

  // Settings State
  const [settingsForm, setSettingsForm] = useState({ ...config });

  // SQL Copy feedback
  const [sqlCopied, setSqlCopied] = useState(false);

  // Open Edit Product Modal
  const handleEditProductClick = (prod: Produto) => {
    setEditingProduct(prod);
    setProdForm({
      nome: prod.nome,
      descricao: prod.descricao,
      preco: prod.preco.toString(),
      categoria: prod.categoria,
      imagem: prod.imagem,
      ativo: prod.ativo
    });
    setIsAddingProduct(false);
  };

  const handleAddProductClick = () => {
    setIsAddingProduct(true);
    setEditingProduct(null);
    setProdForm({
      nome: '',
      descricao: '',
      preco: '',
      categoria: categorias[0]?.nome || 'Bebidas',
      imagem: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
      ativo: true
    });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(prodForm.preco);
    if (!prodForm.nome.trim() || isNaN(priceNum)) return;

    const payload = {
      nome: prodForm.nome.trim(),
      descricao: prodForm.descricao.trim(),
      preco: priceNum,
      categoria: prodForm.categoria,
      imagem: prodForm.imagem.trim(),
      ativo: prodForm.ativo
    };

    if (editingProduct) {
      onUpdateProduct(editingProduct.id, payload);
    } else {
      onAddProduct(payload);
    }

    setIsAddingProduct(false);
    setEditingProduct(null);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    if (editingCategory) {
      onUpdateCategory(editingCategory.id, newCatName.trim());
    } else {
      onAddCategory(newCatName.trim());
    }

    setIsAddingCategory(false);
    setEditingCategory(null);
    setNewCatName('');
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(settingsForm);
  };

  const copySqlSetup = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  return (
    <div id="admin-panel-container" className="min-h-screen bg-[#FDFBF7] text-[#1A2E35] flex flex-col md:flex-row pb-12">
      {/* Navigation Sidebar */}
      <aside className="w-full md:w-64 bg-[#F5F2ED] border-b md:border-b-0 md:border-r border-[#E8E2D9] flex flex-col justify-between flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 border-b border-[#E8E2D9] pb-5 mb-5 justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{config.logo || '🌊'}</span>
              <div>
                <h2 className="text-sm font-serif font-bold italic tracking-tight text-[#1A2E35]">Dashboard</h2>
                <p className="text-[10px] text-[#A89F91]">Gestão do Estabelecimento</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-2 rounded-xl bg-white border border-[#E8E2D9] text-[#5C6B73] hover:text-[#1A2E35]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#0077BE] text-white shadow-sm shadow-blue-100'
                  : 'text-[#5C6B73] hover:text-[#1A2E35] hover:bg-[#E8E2D9]/30'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Pedidos em Aberto</span>
              {stats.pendingCount + stats.prepCount > 0 && (
                <span className="ml-auto bg-amber-500 text-white font-black px-2 py-0.5 rounded-full text-[9px] animate-pulse">
                  {stats.pendingCount + stats.prepCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-[#0077BE] text-white shadow-sm shadow-blue-100'
                  : 'text-[#5C6B73] hover:text-[#1A2E35] hover:bg-[#E8E2D9]/30'
              }`}
            >
              <Coffee className="h-4 w-4" />
              <span>Menu de Produtos</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-[#0077BE] text-white shadow-sm shadow-blue-100'
                  : 'text-[#5C6B73] hover:text-[#1A2E35] hover:bg-[#E8E2D9]/30'
              }`}
            >
              <ChevronDown className="h-4 w-4" />
              <span>Categorias</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#0077BE] text-white shadow-sm shadow-blue-100'
                  : 'text-[#5C6B73] hover:text-[#1A2E35] hover:bg-[#E8E2D9]/30'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </button>

            <button
              onClick={() => setActiveTab('supabase')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'supabase'
                  ? 'bg-[#0077BE] text-white shadow-sm shadow-blue-100'
                  : 'text-[#5C6B73] hover:text-[#1A2E35] hover:bg-[#E8E2D9]/30'
              }`}
            >
              <Database className="h-4 w-4" />
              <span>Supabase Cloud Integration</span>
              <span
                className={`ml-auto w-2 h-2 rounded-full ${
                  supabaseStatus === 'connected'
                    ? 'bg-emerald-500'
                    : supabaseStatus === 'disconnected'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
                }`}
              />
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-[#E8E2D9] hidden md:block">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-white border border-[#E8E2D9] hover:bg-[#FDFBF7] text-[#1A2E35] font-bold text-xs rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Cardápio</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Statistics Widgets Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E8E2D9] p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#0077BE]/10 flex items-center justify-center text-[#0077BE] flex-shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#A89F91] uppercase">Faturamento de Hoje</p>
              <h3 className="text-base font-extrabold text-[#0077BE]">R$ {stats.salesTotal.toFixed(2)}</h3>
            </div>
          </div>

          <div className="bg-white border border-[#E8E2D9] p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#A89F91] uppercase">Pedidos em Preparo</p>
              <h3 className="text-base font-extrabold text-[#1A2E35]">{stats.prepCount}</h3>
            </div>
          </div>

          <div className="bg-white border border-[#E8E2D9] p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#A89F91] uppercase">Pedidos Entregues</p>
              <h3 className="text-base font-extrabold text-[#1A2E35]">{stats.deliveredCount}</h3>
            </div>
          </div>

          <div className="bg-white border border-[#E8E2D9] p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#A89F91] uppercase">Pedidos Pendentes</p>
              <h3 className="text-base font-extrabold text-[#1A2E35]">{stats.pendingCount}</h3>
            </div>
          </div>
        </div>

        {/* Tab content conditional rendering */}
        <div className="space-y-6">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-3">
                <div>
                  <h2 className="text-lg font-serif italic font-bold text-[#1A2E35]">Painel de Pedidos em Tempo Real</h2>
                  <p className="text-xs text-[#5C6B73]">Ordene e atualize o status dos pedidos instantaneamente</p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white border border-[#E8E2D9] rounded-[32px] p-12 text-center space-y-3 shadow-sm">
                  <div className="text-4xl">🏝️</div>
                  <h4 className="text-sm font-bold text-[#A89F91]">Nenhum pedido recebido ainda</h4>
                  <p className="text-xs text-[#5C6B73] max-w-xs mx-auto">
                    Assim que os clientes começarem a pedir, eles aparecerão aqui instantaneamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <motion.div
                      key={order.id}
                      layout
                      className={`p-5 bg-white border rounded-2xl shadow-sm transition-all ${
                        order.status === 'Recebido'
                          ? 'border-blue-200 bg-blue-50/25'
                          : order.status === 'Em preparo'
                          ? 'border-amber-200 bg-amber-50/25'
                          : order.status === 'Pronto'
                          ? 'border-emerald-200 bg-emerald-50/25'
                          : 'border-[#E8E2D9] bg-[#FDFBF7]'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                        {/* Order info */}
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#1A2E35] font-serif">{order.cliente_nome}</span>
                            <span className="text-[#A89F91]">•</span>
                            <span className="font-extrabold text-xs text-[#0077BE] bg-[#F5F2ED] px-2.5 py-0.5 rounded-lg border border-[#E8E2D9]">
                              {order.quiosque}
                            </span>
                            <span className="text-xs text-[#A89F91] ml-auto md:ml-0">
                              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Items list */}
                          <div className="bg-[#FDFBF7] rounded-xl p-3 border border-[#E8E2D9] max-w-xl">
                            <ul className="space-y-1 text-xs">
                              {order.itens.map((item: any, idx: number) => (
                                <li key={idx} className="flex items-center justify-between text-[#1A2E35]">
                                  <span>
                                    <strong className="text-[#0077BE]">{item.quantidade}x</strong> {item.produto_nome}
                                  </span>
                                  <span className="text-[#5C6B73]">R$ {(item.valor * item.quantidade).toFixed(2)}</span>
                                </li>
                              ))}
                            </ul>
                            {order.observacoes && (
                              <p className="text-[10px] text-orange-800 bg-orange-50 border border-orange-100 rounded-lg p-2.5 mt-2 font-medium">
                                Obs: "{order.observacoes}"
                              </p>
                            )}
                          </div>

                          <div className="text-xs font-semibold text-[#5C6B73] flex items-center gap-1.5 pl-0.5">
                            <span>Subtotal: R$ {order.valor_total.toFixed(2)}</span>
                            <span className="text-[#E8E2D9]">|</span>
                            <span className="text-[#0077BE] font-extrabold">Total Geral (c/ taxa): R$ {order.valor_final.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Status controls */}
                        <div className="flex flex-wrap md:flex-col gap-2 items-stretch justify-end w-full md:w-auto">
                          <div className="flex items-center gap-2 mb-2 w-full md:justify-end">
                            <span className="text-[10px] font-bold text-[#A89F91] uppercase tracking-wider">Status:</span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                order.status === 'Cancelado'
                                  ? 'bg-red-50 text-red-700'
                                  : order.status === 'Entregue'
                                  ? 'bg-[#F5F2ED] text-[#5C6B73] border border-[#E8E2D9]'
                                  : order.status === 'Pronto'
                                  ? 'bg-emerald-50 text-emerald-700 animate-pulse'
                                  : order.status === 'Em preparo'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-blue-50 text-[#0077BE]'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>

                          <div className="flex gap-1.5 w-full">
                            {order.status === 'Recebido' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'Em preparo')}
                                className="flex-1 bg-[#0077BE] hover:bg-opacity-95 text-white font-bold text-[10px] px-3 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-blue-100"
                              >
                                Aceitar / Preparar
                              </button>
                            )}

                            {order.status === 'Em preparo' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'Pronto')}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                              >
                                Pronto para Servir
                              </button>
                            )}

                            {order.status === 'Pronto' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'Entregue')}
                                className="flex-1 bg-[#0077BE] hover:bg-opacity-95 text-white font-bold text-[10px] px-3 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-blue-100"
                              >
                                Marcar Entregue
                              </button>
                            )}

                            {order.status !== 'Entregue' && order.status !== 'Cancelado' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'Cancelado')}
                                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-[10px] px-3 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-100">Cardápio de Produtos</h2>
                  <p className="text-xs text-slate-500">Cadastre, edite e controle a disponibilidade dos itens</p>
                </div>
                <button
                  onClick={handleAddProductClick}
                  className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/10"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Produto</span>
                </button>
              </div>

              {/* Form Modal for Add/Edit Product */}
              {(isAddingProduct || editingProduct) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-200">
                      {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                    </h3>
                    <button
                      onClick={() => {
                        setIsAddingProduct(false);
                        setEditingProduct(null);
                      }}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Produto</label>
                      <input
                        type="text"
                        required
                        value={prodForm.nome}
                        onChange={(e) => setProdForm({ ...prodForm, nome: e.target.value })}
                        placeholder="Ex: Iscas de Peixe Crocante"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Preço (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={prodForm.preco}
                        onChange={(e) => setProdForm({ ...prodForm, preco: e.target.value })}
                        placeholder="Ex: 65.00"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Categoria</label>
                      <select
                        value={prodForm.categoria}
                        onChange={(e) => setProdForm({ ...prodForm, categoria: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                      >
                        {categorias.map((cat) => (
                          <option key={cat.id} value={cat.nome}>
                            {cat.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Imagem (Unsplash URL)</label>
                      <input
                        type="url"
                        value={prodForm.imagem}
                        onChange={(e) => setProdForm({ ...prodForm, imagem: e.target.value })}
                        placeholder="Ex: https://images.unsplash.com/..."
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição Curta</label>
                      <textarea
                        rows={2}
                        value={prodForm.descricao}
                        onChange={(e) => setProdForm({ ...prodForm, descricao: e.target.value })}
                        placeholder="Ex: Filé de pescada fresca em tiras fritas crocantes. Acompanha tártaro."
                        className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 py-2 md:col-span-2">
                      <input
                        type="checkbox"
                        id="prod-ativo-checkbox"
                        checked={prodForm.ativo}
                        onChange={(e) => setProdForm({ ...prodForm, ativo: e.target.checked })}
                        className="rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-sky-500"
                      />
                      <label htmlFor="prod-ativo-checkbox" className="text-xs font-semibold text-slate-300">
                        Produto disponível no cardápio
                      </label>
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-2 border-t border-slate-800 pt-3 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingProduct(false);
                          setEditingProduct(null);
                        }}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-sky-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-sky-400 transition-all cursor-pointer"
                      >
                        {editingProduct ? 'Salvar Alterações' : 'Cadastrar'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Product list grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex gap-4 items-center justify-between"
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0">
                        <img src={prod.imagem} alt={prod.nome} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-100 truncate">{prod.nome}</h4>
                        <p className="text-[10px] text-slate-400">{prod.categoria} • R$ {prod.preco.toFixed(2)}</p>
                        <span
                          className={`inline-block mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            prod.ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {prod.ativo ? 'Disponível' : 'Indisponível'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleEditProductClick(prod)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 border border-slate-700/60 cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(prod.id)}
                        className="p-2 bg-red-950/20 hover:bg-red-900 border border-red-900/30 hover:border-red-600 rounded-xl text-red-400 cursor-pointer"
                        title="Deletar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-100">Gerenciar Categorias</h2>
                  <p className="text-xs text-slate-500">Crie, edite e ordene categorias no cardápio</p>
                </div>
                <button
                  onClick={() => {
                    setIsAddingCategory(true);
                    setEditingCategory(null);
                    setNewCatName('');
                  }}
                  className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/10"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nova Categoria</span>
                </button>
              </div>

              {/* Add/Edit Category Form */}
              {(isAddingCategory || editingCategory) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-2xl"
                >
                  <form onSubmit={handleSaveCategory} className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 space-y-1.5 w-full">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Nome da Categoria</label>
                      <input
                        type="text"
                        required
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Ex: Espetinhos, Sobremesas Premium"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs font-semibold"
                      />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(false);
                          setEditingCategory(null);
                        }}
                        className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 md:flex-initial px-5 py-2.5 bg-sky-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-sky-400 transition-all cursor-pointer"
                      >
                        {editingCategory ? 'Salvar' : 'Adicionar'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Categories list */}
              <div className="max-w-xl space-y-2.5">
                {categorias.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl flex items-center justify-between"
                  >
                    <span className="text-xs font-bold text-slate-200">{cat.nome}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setNewCatName(cat.nome);
                          setIsAddingCategory(false);
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onDeleteCategory(cat.id)}
                        className="p-2 bg-red-950/20 hover:bg-red-900 border border-red-900/30 hover:border-red-600 rounded-xl text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-lg font-extrabold text-slate-100">Configurações do Quiosque</h2>
                <p className="text-xs text-slate-500">Personalize a identidade visual e as taxas do estabelecimento</p>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Estabelecimento</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={settingsForm.nome}
                        onChange={(e) => setSettingsForm({ ...settingsForm, nome: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Logotipo Emoji/Ícone</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.logo}
                      onChange={(e) => setSettingsForm({ ...settingsForm, logo: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone de Atendimento</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-600 pointer-events-none">
                        <Phone className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={settingsForm.telefone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, telefone: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Taxa de Serviço (%)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-600 pointer-events-none">
                        <Percent className="h-4 w-4" />
                      </span>
                      <input
                        type="number"
                        value={settingsForm.taxa_servico}
                        onChange={(e) => setSettingsForm({ ...settingsForm, taxa_servico: parseInt(e.target.value) || 0 })}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Endereço de Localização</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-600 pointer-events-none">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={settingsForm.endereco}
                        onChange={(e) => setSettingsForm({ ...settingsForm, endereco: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Mensagem Inicial de Boas-vindas</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 pt-2.5 text-slate-600 pointer-events-none">
                        <MessageSquare className="h-4 w-4" />
                      </span>
                      <textarea
                        rows={2}
                        value={settingsForm.mensagem_inicial}
                        onChange={(e) => setSettingsForm({ ...settingsForm, mensagem_inicial: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Horário de Funcionamento</label>
                    <input
                      type="text"
                      value={settingsForm.horario_funcionamento}
                      onChange={(e) => setSettingsForm({ ...settingsForm, horario_funcionamento: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Salvar Configurações
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-lg font-extrabold text-slate-100">Supabase Integration Setup</h2>
                <p className="text-xs text-slate-500">Instruções para salvar dados persistentemente na nuvem com PostgreSQL</p>
              </div>

              {/* Status card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Status da Conexão</h3>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3.5 h-3.5 rounded-full ${
                        supabaseStatus === 'connected'
                          ? 'bg-emerald-400'
                          : supabaseStatus === 'disconnected'
                          ? 'bg-red-400'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-sm font-bold text-slate-100">
                      {supabaseStatus === 'connected'
                        ? 'Conectado com Supabase Cloud Database'
                        : supabaseStatus === 'disconnected'
                        ? 'Desconectado / Erro de Conexão'
                        : 'Modo Local Simulado (Sem Chaves Configuradas)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {supabaseStatus === 'unconfigured'
                      ? 'O sistema está rodando em modo local/offline inteligente auto-reparável com Server-Sent Events em tempo real para fins de demonstração imediata.'
                      : 'O sistema está conectado diretamente à sua instância na nuvem do Supabase, realizando mutações persistentes e escutando transmissões em tempo real.'}
                  </p>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Variáveis de Ambiente</h3>
                  <div className="space-y-1 text-[11px] text-slate-300 font-mono">
                    <p>VITE_SUPABASE_URL: <span className="text-sky-400">{hasSupabaseConfig ? 'Configurado' : 'Não Configurado'}</span></p>
                    <p>VITE_SUPABASE_ANON_KEY: <span className="text-sky-400">{hasSupabaseConfig ? 'Configurado' : 'Não Configurado'}</span></p>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Adicione estas variáveis no arquivo <strong>.env</strong> localmente ou através da aba de Configurações no AI Studio para conectar seu próprio banco.
                  </p>
                </div>
              </div>

              {/* SQL Migration Script Copy Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-5 w-5 text-sky-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">Script de Criação de Tabelas SQL</h3>
                  </div>
                  <button
                    onClick={copySqlSetup}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer flex items-center gap-1.5"
                  >
                    {sqlCopied ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    <span>{sqlCopied ? 'Copiado!' : 'Copiar SQL Setup'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-normal">
                  Copie o script abaixo e cole-o no menu <strong>SQL Editor</strong> dentro do seu painel do Supabase. Ele criará as tabelas de <strong>produtos, categorias, pedidos, pedido_itens e políticas de RLS</strong> necessárias para o projeto.
                </p>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto">
                  <pre className="text-[10px] text-emerald-400 font-mono leading-relaxed select-all max-h-60 overflow-y-auto">
                    {SUPABASE_SQL_SETUP}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
