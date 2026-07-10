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
  MessageSquare,
  Upload,
  Image as ImageIcon,
  BarChart3,
  PieChart as PieIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
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
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'categories' | 'settings' | 'supabase' | 'reports'>('orders');
  const [prodPeriod, setProdPeriod] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [revenuePeriod, setRevenuePeriod] = useState<'daily' | 'monthly' | 'annual'>('daily');

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

  // Reports Detailed Stats & Trends
  const reportsStats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let faturamentoDiario = 0;
    let faturamentoMensal = 0;
    let faturamentoAnual = 0;

    const dailyMap: { [dateStr: string]: number } = {};
    const monthlyMap: { [month: number]: number } = {};
    for (let i = 0; i < 12; i++) {
      monthlyMap[i] = 0;
    }
    const annualMap: { [year: number]: number } = {};

    const productSalesToday: { [prodName: string]: number } = {};
    const productSales7Days: { [prodName: string]: number } = {};
    const productSales30Days: { [prodName: string]: number } = {};
    const productSalesAllTime: { [prodName: string]: number } = {};

    orders.forEach((o) => {
      if (o.status === 'Cancelado') return;

      const orderDate = o.created_at ? new Date(o.created_at) : new Date();
      const orderDateStr = orderDate.toDateString();
      const orderYear = orderDate.getFullYear();
      const orderMonth = orderDate.getMonth();

      const timeDiff = today.getTime() - orderDate.getTime();
      const diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      // Faturamento totals
      if (orderDateStr === todayStr) {
        faturamentoDiario += o.valor_final;
      }
      if (orderMonth === currentMonth && orderYear === currentYear) {
        faturamentoMensal += o.valor_final;
      }
      if (orderYear === currentYear) {
        faturamentoAnual += o.valor_final;
      }

      // Group for daily chart (last 30 days)
      if (diffDays <= 30) {
        const dayFormatted = `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        dailyMap[dayFormatted] = (dailyMap[dayFormatted] || 0) + o.valor_final;
      }

      // Group for monthly chart (current year)
      if (orderYear === currentYear) {
        monthlyMap[orderMonth] = (monthlyMap[orderMonth] || 0) + o.valor_final;
      }

      // Group for annual chart
      annualMap[orderYear] = (annualMap[orderYear] || 0) + o.valor_final;

      // Group product sales
      o.itens.forEach((item) => {
        const prodName = item.produto_nome;
        const qty = item.quantidade;

        productSalesAllTime[prodName] = (productSalesAllTime[prodName] || 0) + qty;

        if (orderDateStr === todayStr) {
          productSalesToday[prodName] = (productSalesToday[prodName] || 0) + qty;
        }
        if (diffDays <= 7) {
          productSales7Days[prodName] = (productSales7Days[prodName] || 0) + qty;
        }
        if (diffDays <= 30) {
          productSales30Days[prodName] = (productSales30Days[prodName] || 0) + qty;
        }
      });
    });

    // Daily trend (last 15 days, including zeros)
    const dailyTrendData = Array.from({ length: 15 }).map((_, idx) => {
      const d = new Date();
      d.setDate(today.getDate() - (14 - idx));
      const dayFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      return {
        name: dayFormatted,
        Valor: Number((dailyMap[dayFormatted] || 0).toFixed(2))
      };
    });

    // Monthly trend (all 12 months)
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyTrendData = monthNames.map((name, idx) => ({
      name,
      Valor: Number((monthlyMap[idx] || 0).toFixed(2))
    }));

    // Annual trend (last 5 years)
    const annualTrendData = Array.from({ length: 5 }).map((_, idx) => {
      const yr = currentYear - (4 - idx);
      return {
        name: String(yr),
        Valor: Number((annualMap[yr] || 0).toFixed(2))
      };
    });

    const getSortedProducts = (map: { [name: string]: number }) => {
      return Object.entries(map)
        .map(([name, value]) => ({ name, Quantidade: value }))
        .sort((a, b) => b.Quantidade - a.Quantidade)
        .slice(0, 8);
    };

    return {
      faturamentoDiario,
      faturamentoMensal,
      faturamentoAnual,
      dailyTrendData,
      monthlyTrendData,
      annualTrendData,
      topProductsToday: getSortedProducts(productSalesToday),
      topProducts7Days: getSortedProducts(productSales7Days),
      topProducts30Days: getSortedProducts(productSales30Days),
      topProductsAllTime: getSortedProducts(productSalesAllTime)
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

  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor, selecione apenas arquivos de imagem.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setUploadError('A imagem deve ter no máximo 4MB para garantir o desempenho.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setProdForm((prev) => ({ ...prev, imagem: e.target!.result as string }));
      }
    };
    reader.onerror = () => {
      setUploadError('Erro ao ler o arquivo de imagem.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

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
    setUploadError(null);
    setImageMode(prod.imagem.startsWith('data:') ? 'upload' : 'url');
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
      imagem: '',
      ativo: true
    });
    setUploadError(null);
    setImageMode('upload');
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
      imagem: prodForm.imagem.trim() || 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
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
    <div id="admin-panel-container" className="min-h-screen bg-[#FCFBF9] text-[#1B3322] flex flex-col md:flex-row pb-12">
      {/* Navigation Sidebar */}
      <aside className="w-full md:w-64 bg-[#F4EFE6] border-b md:border-b-0 md:border-r border-[#E3DCD2] flex flex-col justify-between flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 border-b border-[#E3DCD2] pb-5 mb-5 justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{config.logo || '🥥'}</span>
              <div>
                <h2 className="text-sm font-serif font-bold italic tracking-tight text-[#1B3322]">Dashboard</h2>
                <p className="text-[10px] text-[#9C8E7B]">Gestão do Estabelecimento</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden p-2 rounded-xl bg-white border border-[#E3DCD2] text-[#706558] hover:text-[#1B3322]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-[#1E5E3A] text-white shadow-sm shadow-green-100'
                  : 'text-[#706558] hover:text-[#1B3322] hover:bg-[#E3DCD2]/30'
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
                  ? 'bg-[#1E5E3A] text-white shadow-sm shadow-green-100'
                  : 'text-[#706558] hover:text-[#1B3322] hover:bg-[#E3DCD2]/30'
              }`}
            >
              <Coffee className="h-4 w-4" />
              <span>Menu de Produtos</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-[#1E5E3A] text-white shadow-sm shadow-green-100'
                  : 'text-[#706558] hover:text-[#1B3322] hover:bg-[#E3DCD2]/30'
              }`}
            >
              <ChevronDown className="h-4 w-4" />
              <span>Categorias</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-[#1E5E3A] text-white shadow-sm shadow-green-100'
                  : 'text-[#706558] hover:text-[#1B3322] hover:bg-[#E3DCD2]/30'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Relatórios e Métricas</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#1E5E3A] text-white shadow-sm shadow-green-100'
                  : 'text-[#706558] hover:text-[#1B3322] hover:bg-[#E3DCD2]/30'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </button>

            <button
              onClick={() => setActiveTab('supabase')}
              className={`w-full px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-3 transition-all cursor-pointer ${
                activeTab === 'supabase'
                  ? 'bg-[#1E5E3A] text-white shadow-sm shadow-green-100'
                  : 'text-[#706558] hover:text-[#1B3322] hover:bg-[#E3DCD2]/30'
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

        <div className="p-6 border-t border-[#E3DCD2] hidden md:block">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-white border border-[#E3DCD2] hover:bg-[#FCFBF9] text-[#1B3322] font-bold text-xs rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-sm"
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
          <div className="bg-white border border-[#E3DCD2] p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-[#1E5E3A]/10 flex items-center justify-center text-[#1E5E3A] flex-shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#9C8E7B] uppercase">Faturamento de Hoje</p>
              <h3 className="text-base font-extrabold text-[#1E5E3A]">R$ {stats.salesTotal.toFixed(2)}</h3>
            </div>
          </div>

          <div className="bg-white border border-[#E3DCD2] p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#9C8E7B] uppercase">Pedidos em Preparo</p>
              <h3 className="text-base font-extrabold text-[#1B3322]">{stats.prepCount}</h3>
            </div>
          </div>

          <div className="bg-white border border-[#E3DCD2] p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#9C8E7B] uppercase">Pedidos Entregues</p>
              <h3 className="text-base font-extrabold text-[#1B3322]">{stats.deliveredCount}</h3>
            </div>
          </div>

          <div className="bg-white border border-[#E3DCD2] p-4 rounded-2xl flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#9C8E7B] uppercase">Pedidos Pendentes</p>
              <h3 className="text-base font-extrabold text-[#1B3322]">{stats.pendingCount}</h3>
            </div>
          </div>
        </div>

        {/* Tab content conditional rendering */}
        <div className="space-y-6">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E3DCD2] pb-3">
                <div>
                  <h2 className="text-lg font-serif italic font-bold text-[#1B3322]">Painel de Pedidos em Tempo Real</h2>
                  <p className="text-xs text-[#706558]">Ordene e atualize o status dos pedidos instantaneamente</p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white border border-[#E3DCD2] rounded-[32px] p-12 text-center space-y-3 shadow-sm">
                  <div className="text-4xl">🥥</div>
                  <h4 className="text-sm font-bold text-[#9C8E7B]">Nenhum pedido recebido ainda</h4>
                  <p className="text-xs text-[#706558] max-w-xs mx-auto">
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
                          ? 'border-green-200 bg-green-50/25'
                          : order.status === 'Em preparo'
                          ? 'border-amber-200 bg-amber-50/25'
                          : order.status === 'Pronto'
                          ? 'border-emerald-200 bg-emerald-50/25'
                          : 'border-[#E3DCD2] bg-[#FCFBF9]'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                        {/* Order info */}
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#1B3322] font-serif">{order.cliente_nome}</span>
                            <span className="text-[#9C8E7B]">•</span>
                            <span className="font-extrabold text-xs text-[#1E5E3A] bg-[#F4EFE6] px-2.5 py-0.5 rounded-lg border border-[#E3DCD2]">
                              {order.quiosque}
                            </span>
                            <span className="text-xs text-[#9C8E7B] ml-auto md:ml-0">
                              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Items list */}
                          <div className="bg-[#FCFBF9] rounded-xl p-3 border border-[#E3DCD2] max-w-xl">
                            <ul className="space-y-1 text-xs">
                              {order.itens.map((item: any, idx: number) => (
                                <li key={idx} className="flex items-center justify-between text-[#1B3322]">
                                  <span>
                                    <strong className="text-[#1E5E3A]">{item.quantidade}x</strong> {item.produto_nome}
                                  </span>
                                  <span className="text-[#706558]">R$ {(item.valor * item.quantidade).toFixed(2)}</span>
                                </li>
                              ))}
                            </ul>
                            {order.observacoes && (
                              <p className="text-[10px] text-orange-800 bg-orange-50 border border-orange-100 rounded-lg p-2.5 mt-2 font-medium">
                                Obs: "{order.observacoes}"
                              </p>
                            )}
                          </div>

                          <div className="text-xs font-semibold text-[#706558] flex items-center gap-1.5 pl-0.5">
                            <span>Subtotal: R$ {order.valor_total.toFixed(2)}</span>
                            <span className="text-[#E3DCD2]">|</span>
                            <span className="text-[#1E5E3A] font-extrabold">Total Geral (c/ taxa): R$ {order.valor_final.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Status controls */}
                        <div className="flex flex-wrap md:flex-col gap-2 items-stretch justify-end w-full md:w-auto">
                          <div className="flex items-center gap-2 mb-2 w-full md:justify-end">
                            <span className="text-[10px] font-bold text-[#9C8E7B] uppercase tracking-wider">Status:</span>
                            <span
                               className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                order.status === 'Cancelado'
                                  ? 'bg-red-50 text-red-700'
                                  : order.status === 'Entregue'
                                  ? 'bg-[#F4EFE6] text-[#706558] border border-[#E3DCD2]'
                                  : order.status === 'Pronto'
                                  ? 'bg-emerald-50 text-emerald-700 animate-pulse'
                                  : order.status === 'Em preparo'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-green-50 text-[#1E5E3A]'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>

                          <div className="flex gap-1.5 w-full">
                            {order.status === 'Recebido' && (
                              <button
                                onClick={() => onUpdateOrderStatus(order.id, 'Em preparo')}
                                className="flex-1 bg-[#1E5E3A] hover:bg-opacity-95 text-white font-bold text-[10px] px-3 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-green-100"
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
                                className="flex-1 bg-[#1E5E3A] hover:bg-opacity-95 text-white font-bold text-[10px] px-3 py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-green-100"
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
              <div className="flex items-center justify-between border-b border-[#E3DCD2] pb-3">
                <div>
                  <h2 className="text-lg font-serif italic font-bold text-[#1B3322]">Cardápio de Produtos</h2>
                  <p className="text-xs text-[#706558]">Cadastre, edite e controle a disponibilidade dos itens</p>
                </div>
                <button
                  onClick={handleAddProductClick}
                  className="bg-[#1E5E3A] hover:bg-[#1E5E3A]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-green-100"
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
                  className="bg-white border border-[#E3DCD2] p-6 rounded-2xl space-y-4 shadow-md"
                >
                  <div className="flex items-center justify-between border-b border-[#E3DCD2] pb-3">
                    <h3 className="text-sm font-bold text-[#1B3322]">
                      {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                    </h3>
                    <button
                      onClick={() => {
                        setIsAddingProduct(false);
                        setEditingProduct(null);
                      }}
                      className="text-[#706558] hover:text-[#1B3322]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Nome do Produto</label>
                      <input
                        type="text"
                        required
                        value={prodForm.nome}
                        onChange={(e) => setProdForm({ ...prodForm, nome: e.target.value })}
                        placeholder="Ex: Iscas de Peixe Crocante"
                        className="w-full px-3.5 py-2.5 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Preço (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={prodForm.preco}
                        onChange={(e) => setProdForm({ ...prodForm, preco: e.target.value })}
                        placeholder="Ex: 65.00"
                        className="w-full px-3.5 py-2.5 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Categoria</label>
                      <select
                        value={prodForm.categoria}
                        onChange={(e) => setProdForm({ ...prodForm, categoria: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-medium"
                      >
                        {categorias.map((cat) => (
                          <option key={cat.id} value={cat.nome}>
                            {cat.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-2 border border-[#E3DCD2] p-4 rounded-2xl bg-[#FCFBF9]/50">
                      <div className="flex items-center justify-between border-b border-[#E3DCD2] pb-2">
                        <label className="text-[10px] font-bold text-[#9C8E7B] uppercase tracking-wider">Imagem do Produto</label>
                        <div className="flex gap-1.5 bg-[#F4EFE6] p-0.5 rounded-lg border border-[#E3DCD2]">
                          <button
                            type="button"
                            onClick={() => setImageMode('upload')}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                              imageMode === 'upload'
                                ? 'bg-[#1E5E3A] text-white shadow-sm'
                                : 'text-[#706558] hover:text-[#1B3322]'
                            }`}
                          >
                            Upload de Foto
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageMode('url')}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                              imageMode === 'url'
                                ? 'bg-[#1E5E3A] text-white shadow-sm'
                                : 'text-[#706558] hover:text-[#1B3322]'
                            }`}
                          >
                            URL da Imagem
                          </button>
                        </div>
                      </div>

                      {imageMode === 'upload' ? (
                        <div className="space-y-2">
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('prod-photo-upload')?.click()}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                              isDragging
                                ? 'border-[#1E5E3A] bg-[#1E5E3A]/5'
                                : 'border-[#E3DCD2] bg-white hover:border-[#1E5E3A]/40'
                            }`}
                          >
                            <input
                              type="file"
                              id="prod-photo-upload"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                            {prodForm.imagem && prodForm.imagem.startsWith('data:') ? (
                              <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-[#E3DCD2] shadow-sm">
                                <img src={prodForm.imagem} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                  <span className="text-[9px] text-white font-bold bg-black/60 px-2 py-1 rounded-md">Trocar</span>
                                </div>
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#1E5E3A]/10 flex items-center justify-center text-[#1E5E3A]">
                                <Upload className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold text-[#1B3322]">
                                Arraste e solte uma imagem aqui ou clique para selecionar
                              </p>
                              <p className="text-[10px] text-[#706558] mt-1">
                                Aceita PNG, JPG ou GIF de até 4MB
                              </p>
                            </div>
                          </div>
                          {uploadError && (
                            <p className="text-xs text-red-600 font-semibold">{uploadError}</p>
                          )}
                          {prodForm.imagem && (
                            <div className="flex items-center gap-2 justify-between bg-white border border-[#E3DCD2] p-2 rounded-xl shadow-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-md overflow-hidden border border-[#E3DCD2] bg-slate-50 flex-shrink-0">
                                  <img src={prodForm.imagem} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[10px] text-[#706558] truncate max-w-xs font-semibold font-mono">
                                  {prodForm.imagem.startsWith('data:') ? 'Imagem carregada com sucesso' : prodForm.imagem}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setProdForm((p) => ({ ...p, imagem: '' }))}
                                className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 cursor-pointer transition-all"
                              >
                                Remover
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="url"
                            value={prodForm.imagem}
                            onChange={(e) => setProdForm({ ...prodForm, imagem: e.target.value })}
                            placeholder="Ex: https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600"
                            className="w-full px-3.5 py-2.5 bg-white border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-semibold"
                          />
                          {prodForm.imagem && (
                            <div className="flex items-center gap-2 bg-white border border-[#E3DCD2] p-2 rounded-xl shadow-sm">
                              <div className="w-12 h-12 rounded-lg overflow-hidden border border-[#E3DCD2] bg-slate-50 flex-shrink-0">
                                <img
                                  src={prodForm.imagem}
                                  alt="Preview externa"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80';
                                  }}
                                />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-[#1B3322]">Visualização da Imagem Externa</p>
                                <p className="text-[9px] text-[#706558] truncate max-w-xs">{prodForm.imagem}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Descrição Curta</label>
                      <textarea
                        rows={2}
                        value={prodForm.descricao}
                        onChange={(e) => setProdForm({ ...prodForm, descricao: e.target.value })}
                        placeholder="Ex: Filé de pescada fresca em tiras fritas crocantes. Acompanha tártaro."
                        className="w-full p-3 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-medium resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 py-2 md:col-span-2">
                      <input
                        type="checkbox"
                        id="prod-ativo-checkbox"
                        checked={prodForm.ativo}
                        onChange={(e) => setProdForm({ ...prodForm, ativo: e.target.checked })}
                        className="rounded border-[#E3DCD2] bg-[#FCFBF9] text-[#1E5E3A] focus:ring-[#1E5E3A]"
                      />
                      <label htmlFor="prod-ativo-checkbox" className="text-xs font-semibold text-[#1B3322]">
                        Produto disponível no cardápio
                      </label>
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-2 border-t border-[#E3DCD2] pt-3 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingProduct(false);
                          setEditingProduct(null);
                        }}
                        className="px-4 py-2 bg-[#F4EFE6] border border-[#E3DCD2] text-[#706558] font-bold text-xs rounded-xl hover:bg-opacity-90 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#1E5E3A] hover:bg-[#1E5E3A]/90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm shadow-green-100"
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
                    className="p-4 bg-white border border-[#E3DCD2] rounded-2xl flex gap-4 items-center justify-between shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex gap-3 items-center min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F4EFE6] border border-[#E3DCD2] flex-shrink-0">
                        <img src={prod.imagem} alt={prod.nome} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#1B3322] truncate">{prod.nome}</h4>
                        <p className="text-[10px] text-[#706558] font-semibold">{prod.categoria} • R$ {prod.preco.toFixed(2)}</p>
                        <span
                          className={`inline-block mt-1 text-[8px] font-bold px-1.5 py-0.5 rounded ${
                            prod.ativo ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {prod.ativo ? 'Disponível' : 'Indisponível'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleEditProductClick(prod)}
                        className="p-2 bg-[#F4EFE6] hover:bg-[#E3DCD2] rounded-xl text-[#706558] border border-[#E3DCD2] cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(prod.id)}
                        className="p-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-red-600 cursor-pointer"
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
              <div className="flex items-center justify-between border-b border-[#E3DCD2] pb-3">
                <div>
                  <h2 className="text-lg font-serif italic font-bold text-[#1B3322]">Gerenciar Categorias</h2>
                  <p className="text-xs text-[#706558]">Crie, edite e ordene categorias no cardápio</p>
                </div>
                <button
                  onClick={() => {
                    setIsAddingCategory(true);
                    setEditingCategory(null);
                    setNewCatName('');
                  }}
                  className="bg-[#1E5E3A] hover:bg-[#1E5E3A]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-green-100"
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
                  className="bg-white border border-[#E3DCD2] p-5 rounded-2xl shadow-sm"
                >
                  <form onSubmit={handleSaveCategory} className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1 space-y-1.5 w-full">
                      <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Nome da Categoria</label>
                      <input
                        type="text"
                        required
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Ex: Espetinhos, Sobremesas Premium"
                        className="w-full px-3.5 py-2.5 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-semibold"
                      />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(false);
                          setEditingCategory(null);
                        }}
                        className="flex-1 md:flex-initial px-4 py-2.5 bg-[#F4EFE6] border border-[#E3DCD2] text-[#706558] font-bold text-xs rounded-xl hover:bg-opacity-90 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 md:flex-initial px-5 py-2.5 bg-[#1E5E3A] hover:bg-[#1E5E3A]/90 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm shadow-green-100"
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
                    className="p-3 bg-white border border-[#E3DCD2] rounded-xl flex items-center justify-between shadow-sm"
                  >
                    <span className="text-xs font-bold text-[#1B3322]">{cat.nome}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setNewCatName(cat.nome);
                          setIsAddingCategory(false);
                        }}
                        className="p-2 bg-[#F4EFE6] hover:bg-[#E3DCD2] rounded-xl text-[#706558] border border-[#E3DCD2] cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onDeleteCategory(cat.id)}
                        className="p-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-red-600 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-8 animate-fade-in">
              <div className="border-b border-[#E3DCD2] pb-3">
                <h2 className="text-lg font-serif italic font-bold text-[#1B3322]">Relatórios & Estatísticas</h2>
                <p className="text-xs text-[#706558]">Acompanhe o desempenho de vendas, faturamento e produtos mais populares</p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white border border-[#E3DCD2] rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1E5E3A]" />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-[#9C8E7B] tracking-wider">Faturamento Hoje</span>
                    <span className="p-1.5 bg-[#1E5E3A]/10 text-[#1E5E3A] rounded-lg">
                      <TrendingUp className="h-4 w-4" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-[#1B3322]">
                      R$ {reportsStats.faturamentoDiario.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <p className="text-[10px] text-[#706558] mt-1">Apenas pedidos concluídos/ativos de hoje</p>
                  </div>
                </div>

                <div className="bg-white border border-[#E3DCD2] rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-[#9C8E7B] tracking-wider">Faturamento Mensal</span>
                    <span className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                      <BarChart3 className="h-4 w-4" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-[#1B3322]">
                      R$ {reportsStats.faturamentoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <p className="text-[10px] text-[#706558] mt-1">Mês corrente ({new Date().toLocaleString('pt-BR', { month: 'long' })})</p>
                  </div>
                </div>

                <div className="bg-white border border-[#E3DCD2] rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600" />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-[#9C8E7B] tracking-wider">Faturamento Anual</span>
                    <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600">
                      <PieIcon className="h-4 w-4" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-[#1B3322]">
                      R$ {reportsStats.faturamentoAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <p className="text-[10px] text-[#706558] mt-1">Ano corrente ({new Date().getFullYear()})</p>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Revenue Over Time Chart */}
                <div className="bg-white border border-[#E3DCD2] rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3DCD2] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#1B3322] font-serif">Fluxo de Faturamento</h3>
                      <p className="text-[10px] text-[#706558]">Visualização do faturamento total por período</p>
                    </div>
                    <div className="flex bg-[#F4EFE6] p-0.5 rounded-lg border border-[#E3DCD2] text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setRevenuePeriod('daily')}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          revenuePeriod === 'daily'
                            ? 'bg-[#1E5E3A] text-white shadow-sm'
                            : 'text-[#706558] hover:text-[#1B3322]'
                        }`}
                      >
                        Diário
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevenuePeriod('monthly')}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          revenuePeriod === 'monthly'
                            ? 'bg-[#1E5E3A] text-white shadow-sm'
                            : 'text-[#706558] hover:text-[#1B3322]'
                        }`}
                      >
                        Mensal
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevenuePeriod('annual')}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          revenuePeriod === 'annual'
                            ? 'bg-[#1E5E3A] text-white shadow-sm'
                            : 'text-[#706558] hover:text-[#1B3322]'
                        }`}
                      >
                        Anual
                      </button>
                    </div>
                  </div>

                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {revenuePeriod === 'daily' ? (
                        <AreaChart
                          data={reportsStats.dailyTrendData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#1E5E3A" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#1E5E3A" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E3DCD2" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#706558' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: '#706558' }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#FCFBF9', borderColor: '#E3DCD2', borderRadius: '12px' }}
                            labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#1B3322' }}
                            itemStyle={{ fontSize: '11px', color: '#1E5E3A' }}
                            formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento']}
                          />
                          <Area type="monotone" dataKey="Valor" stroke="#1E5E3A" strokeWidth={2} fillOpacity={1} fill="url(#colorDaily)" />
                        </AreaChart>
                      ) : revenuePeriod === 'monthly' ? (
                        <BarChart
                          data={reportsStats.monthlyTrendData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E3DCD2" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#706558' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: '#706558' }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#FCFBF9', borderColor: '#E3DCD2', borderRadius: '12px' }}
                            labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#1B3322' }}
                            itemStyle={{ fontSize: '11px', color: '#1E5E3A' }}
                            formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento']}
                          />
                          <Bar dataKey="Valor" fill="#1E5E3A" radius={[4, 4, 0, 0]} maxBarSize={35} />
                        </BarChart>
                      ) : (
                        <BarChart
                          data={reportsStats.annualTrendData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E3DCD2" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#706558' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: '#706558' }} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#FCFBF9', borderColor: '#E3DCD2', borderRadius: '12px' }}
                            labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#1B3322' }}
                            itemStyle={{ fontSize: '11px', color: '#1E5E3A' }}
                            formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento']}
                          />
                          <Bar dataKey="Valor" fill="#1E5E3A" radius={[4, 4, 0, 0]} maxBarSize={45} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Most Sold Products Chart */}
                <div className="bg-white border border-[#E3DCD2] rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3DCD2] pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-[#1B3322] font-serif">Produtos Mais Vendidos</h3>
                      <p className="text-[10px] text-[#706558]">Produtos com maior volume de saídas por período</p>
                    </div>
                    <div className="flex bg-[#F4EFE6] p-0.5 rounded-lg border border-[#E3DCD2] text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setProdPeriod('today')}
                        className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                          prodPeriod === 'today'
                            ? 'bg-[#1E5E3A] text-white shadow-sm'
                            : 'text-[#706558] hover:text-[#1B3322]'
                        }`}
                      >
                        Hoje
                      </button>
                      <button
                        type="button"
                        onClick={() => setProdPeriod('7days')}
                        className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                          prodPeriod === '7days'
                            ? 'bg-[#1E5E3A] text-white shadow-sm'
                            : 'text-[#706558] hover:text-[#1B3322]'
                        }`}
                      >
                        7 Dias
                      </button>
                      <button
                        type="button"
                        onClick={() => setProdPeriod('30days')}
                        className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                          prodPeriod === '30days'
                            ? 'bg-[#1E5E3A] text-white shadow-sm'
                            : 'text-[#706558] hover:text-[#1B3322]'
                        }`}
                      >
                        30 Dias
                      </button>
                      <button
                        type="button"
                        onClick={() => setProdPeriod('all')}
                        className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                          prodPeriod === 'all'
                            ? 'bg-[#1E5E3A] text-white shadow-sm'
                            : 'text-[#706558] hover:text-[#1B3322]'
                        }`}
                      >
                        Tudo
                      </button>
                    </div>
                  </div>

                  <div className="h-72 w-full flex items-center justify-center">
                    {(() => {
                      const currentTopProducts = 
                        prodPeriod === 'today' ? reportsStats.topProductsToday :
                        prodPeriod === '7days' ? reportsStats.topProducts7Days :
                        prodPeriod === '30days' ? reportsStats.topProducts30Days :
                        reportsStats.topProductsAllTime;

                      if (currentTopProducts.length === 0) {
                        return (
                          <div className="text-center py-12 space-y-2">
                            <span className="text-3xl">🥥</span>
                            <p className="text-xs font-bold text-[#9C8E7B]">Sem vendas registradas neste período</p>
                          </div>
                        );
                      }

                      return (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={currentTopProducts}
                            margin={{ top: 10, right: 10, left: 30, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E3DCD2" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 9, fill: '#706558' }} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#1B3322', fontWeight: 'semibold' }} tickLine={false} axisLine={false} width={80} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#FCFBF9', borderColor: '#E3DCD2', borderRadius: '12px' }}
                              itemStyle={{ fontSize: '11px', color: '#1E5E3A' }}
                              formatter={(value: any) => [`${value} unidades`, 'Vendido']}
                            />
                            <Bar dataKey="Quantidade" fill="#D97706" radius={[0, 4, 4, 0]} maxBarSize={18}>
                              {currentTopProducts.map((entry, index) => {
                                const colors = ['#1E5E3A', '#2D7F50', '#41A36B', '#D97706', '#E28C28', '#EAA24C', '#84735E', '#9C8E7B'];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Top Products Table/List for quick scanning */}
              <div className="bg-white border border-[#E3DCD2] rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-[#1B3322] font-serif">Ranking de Popularidade do Menu</h3>
                  <p className="text-[10px] text-[#706558]">Detalhamento de quantidades vendidas acumuladas</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E3DCD2]">
                        <th className="py-2.5 text-[9px] font-black uppercase text-[#9C8E7B] tracking-wider">Produto</th>
                        <th className="py-2.5 text-[9px] font-black uppercase text-[#9C8E7B] tracking-wider text-center">Hoje</th>
                        <th className="py-2.5 text-[9px] font-black uppercase text-[#9C8E7B] tracking-wider text-center">Últimos 7 dias</th>
                        <th className="py-2.5 text-[9px] font-black uppercase text-[#9C8E7B] tracking-wider text-center">Últimos 30 dias</th>
                        <th className="py-2.5 text-[9px] font-black uppercase text-[#9C8E7B] tracking-wider text-center">Total Histórico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((prod) => {
                        const getQty = (arr: { name: string, Quantidade: number }[]) => 
                          arr.find(item => item.name === prod.nome)?.Quantidade || 0;

                        const todayQty = getQty(reportsStats.topProductsToday);
                        const sevenQty = getQty(reportsStats.topProducts7Days);
                        const thirtyQty = getQty(reportsStats.topProducts30Days);
                        const allQty = getQty(reportsStats.topProductsAllTime);

                        return (
                          <tr key={prod.id} className="border-b border-[#E3DCD2]/55 last:border-b-0 hover:bg-[#FCFBF9]/50 transition-all">
                            <td className="py-3 text-xs font-bold text-[#1B3322] flex items-center gap-2">
                              {prod.imagem ? (
                                <img src={prod.imagem} alt={prod.nome} className="w-6 h-6 rounded-md object-cover border border-[#E3DCD2]" />
                              ) : (
                                <div className="w-6 h-6 rounded-md bg-[#1E5E3A]/10 flex items-center justify-center text-[10px]">🥥</div>
                              )}
                              <span>{prod.nome}</span>
                            </td>
                            <td className="py-3 text-xs font-semibold text-[#706558] text-center font-mono">
                              {todayQty > 0 ? (
                                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold">{todayQty}</span>
                              ) : '-'}
                            </td>
                            <td className="py-3 text-xs font-semibold text-[#706558] text-center font-mono">
                              {sevenQty > 0 ? (
                                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold">{sevenQty}</span>
                              ) : '-'}
                            </td>
                            <td className="py-3 text-xs font-semibold text-[#706558] text-center font-mono">
                              {thirtyQty > 0 ? (
                                <span className="bg-slate-50 text-slate-700 px-2 py-0.5 rounded-full font-bold">{thirtyQty}</span>
                              ) : '-'}
                            </td>
                            <td className="py-3 text-xs font-black text-[#1E5E3A] text-center font-mono">
                              {allQty > 0 ? allQty : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="border-b border-[#E3DCD2] pb-3">
                <h2 className="text-lg font-serif italic font-bold text-[#1B3322]">Configurações do Quiosque</h2>
                <p className="text-xs text-[#706558]">Personalize a identidade visual e as taxas do estabelecimento</p>
              </div>

              <form onSubmit={handleSaveSettings} className="bg-white border border-[#E3DCD2] rounded-2xl p-6 space-y-6 max-w-2xl shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Nome do Estabelecimento</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={settingsForm.nome}
                        onChange={(e) => setSettingsForm({ ...settingsForm, nome: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Logotipo Emoji/Ícone</label>
                    <input
                      type="text"
                      required
                      value={settingsForm.logo}
                      onChange={(e) => setSettingsForm({ ...settingsForm, logo: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Telefone de Atendimento</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#706558] pointer-events-none">
                        <Phone className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={settingsForm.telefone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, telefone: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Taxa de Serviço (%)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#706558] pointer-events-none">
                        <Percent className="h-4 w-4" />
                      </span>
                      <input
                        type="number"
                        value={settingsForm.taxa_servico}
                        onChange={(e) => setSettingsForm({ ...settingsForm, taxa_servico: parseInt(e.target.value) || 0 })}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Endereço de Localização</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#706558] pointer-events-none">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={settingsForm.endereco}
                        onChange={(e) => setSettingsForm({ ...settingsForm, endereco: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Mensagem Inicial de Boas-vindas</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 pt-2.5 text-[#706558] pointer-events-none">
                        <MessageSquare className="h-4 w-4" />
                      </span>
                      <textarea
                        rows={2}
                        value={settingsForm.mensagem_inicial}
                        onChange={(e) => setSettingsForm({ ...settingsForm, mensagem_inicial: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs resize-none font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-[#9C8E7B] uppercase">Horário de Funcionamento</label>
                    <input
                      type="text"
                      value={settingsForm.horario_funcionamento}
                      onChange={(e) => setSettingsForm({ ...settingsForm, horario_funcionamento: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#FCFBF9] border border-[#E3DCD2] rounded-xl text-[#1B3322] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-[#E3DCD2]">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#1E5E3A] hover:bg-[#1E5E3A]/90 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shadow-green-100"
                  >
                    Salvar Configurações
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-6">
              <div className="border-b border-[#E3DCD2] pb-3">
                <h2 className="text-lg font-serif italic font-bold text-[#1B3322]">Supabase Integration Setup</h2>
                <p className="text-xs text-[#706558]">Instruções para salvar dados persistentemente na nuvem com PostgreSQL</p>
              </div>

              {/* Status card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-white border border-[#E3DCD2] rounded-2xl space-y-3 shadow-sm">
                  <h3 className="text-xs font-black text-[#1B3322] uppercase tracking-wider">Status da Conexão</h3>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3.5 h-3.5 rounded-full ${
                        supabaseStatus === 'connected'
                          ? 'bg-emerald-500'
                          : supabaseStatus === 'disconnected'
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span className="text-sm font-bold text-[#1B3322]">
                      {supabaseStatus === 'connected'
                        ? 'Conectado com Supabase Cloud Database'
                        : supabaseStatus === 'disconnected'
                        ? 'Desconectado / Erro de Conexão'
                        : 'Modo Local Simulado (Sem Chaves Configuradas)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#706558] leading-normal">
                    {supabaseStatus === 'unconfigured'
                      ? 'O sistema está rodando em modo local/offline inteligente auto-reparável com Server-Sent Events em tempo real para fins de demonstração imediata.'
                      : 'O sistema está conectado diretamente à sua instância na nuvem do Supabase, realizando mutações persistentes e escutando transmissões em tempo real.'}
                  </p>
                </div>

                <div className="p-5 bg-white border border-[#E3DCD2] rounded-2xl space-y-3 shadow-sm">
                  <h3 className="text-xs font-black text-[#1B3322] uppercase tracking-wider">Variáveis de Ambiente</h3>
                  <div className="space-y-1 text-[11px] text-[#1B3322] font-mono">
                    <p>VITE_SUPABASE_URL: <span className="text-[#1E5E3A] font-bold">{hasSupabaseConfig ? 'Configurado' : 'Não Configurado'}</span></p>
                    <p>VITE_SUPABASE_ANON_KEY: <span className="text-[#1E5E3A] font-bold">{hasSupabaseConfig ? 'Configurado' : 'Não Configurado'}</span></p>
                  </div>
                  <p className="text-[11px] text-[#706558] leading-normal">
                    Adicione estas variáveis no arquivo <strong>.env</strong> localmente ou através da aba de Configurações no AI Studio para conectar seu próprio banco.
                  </p>
                </div>
              </div>

              {/* SQL Migration Script Copy Box */}
              <div className="bg-white border border-[#E3DCD2] rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-5 w-5 text-[#1E5E3A]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#1B3322]">Script de Criação de Tabelas SQL</h3>
                  </div>
                  <button
                    onClick={copySqlSetup}
                    className="px-3.5 py-1.5 bg-[#F4EFE6] hover:bg-[#E3DCD2] text-[#1E5E3A] text-xs font-bold rounded-xl border border-[#E3DCD2] cursor-pointer flex items-center gap-1.5"
                  >
                    {sqlCopied ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    <span>{sqlCopied ? 'Copiado!' : 'Copiar SQL Setup'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-[#706558] leading-normal">
                  Copie o script abaixo e cole-o no menu <strong>SQL Editor</strong> dentro do seu painel do Supabase. Ele criará as tabelas de <strong>produtos, categorias, pedidos, pedido_itens e políticas de RLS</strong> necessárias para o projeto.
                </p>

                <div className="bg-[#FCFBF9] p-4 rounded-xl border border-[#E3DCD2] overflow-x-auto">
                  <pre className="text-[10px] text-[#1E5E3A] font-mono leading-relaxed select-all max-h-60 overflow-y-auto">
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
