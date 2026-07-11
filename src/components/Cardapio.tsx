/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Minus, ShoppingBag, Eye, HelpCircle, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Produto, Categoria, ConfigEstabelecimento } from '../types';

interface CardapioProps {
  produtos: Produto[];
  categorias: Categoria[];
  config: ConfigEstabelecimento;
  cart: { [id: string]: number };
  onUpdateCartQuantity: (id: string, qty: number) => void;
  onOpenCart: () => void;
  clienteNome: string;
  clienteQuiosque: string;
  onLogout: () => void;
}

export function Cardapio({
  produtos,
  categorias,
  config,
  cart,
  onUpdateCartQuantity,
  onOpenCart,
  clienteNome,
  clienteQuiosque,
  onLogout
}: CardapioProps) {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Count items in cart
  const cartItemCount = useMemo(() => {
    return Object.values(cart).reduce((acc, curr) => acc + curr, 0);
  }, [cart]);

  // Filter products based on search query and category
  const filteredProdutos = useMemo(() => {
    return produtos.filter((p) => {
      const matchesCategory =
        selectedCategory === 'Todos' || p.categoria === selectedCategory;
      const matchesSearch =
        p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.descricao.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [produtos, selectedCategory, searchQuery]);

  return (
    <div id="client-menu-container" className="min-h-screen bg-[#FCFBF9] pb-32 text-[#1B3322]">
      {/* Top Welcome Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E3DCD2] px-4 py-3.5 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#F4EFE6] border border-[#E3DCD2] flex items-center justify-center text-xl shadow-sm">
              {config.logo || '🥥'}
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-[#9C8E7B] font-black leading-none">Quiosque</span>
              <span className="text-xl font-serif italic text-[#1E5E3A] leading-tight font-bold">{config.nome}</span>
            </div>
            <div className="h-6 w-[1px] bg-[#E3DCD2] mx-1 hidden sm:block"></div>
            <div className="flex flex-col hidden sm:flex">
              <span className="text-[9px] uppercase tracking-widest text-[#9C8E7B] font-black leading-none">Mesa / Local</span>
              <span className="text-sm font-bold text-[#1B3322] mt-0.5">{clienteQuiosque}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end sm:hidden">
              <span className="text-[9px] uppercase tracking-widest text-[#9C8E7B] font-black leading-none">Local</span>
              <span className="text-xs font-bold text-[#1B3322]">{clienteQuiosque}</span>
            </div>
            <button
              id="change-identification-button"
              onClick={onLogout}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors px-3 py-1.5 rounded-xl border border-transparent hover:border-red-200 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sair (Logout)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* Banner Card */}
        <div className="relative rounded-[32px] overflow-hidden bg-[#F4EFE6] border border-[#E3DCD2] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 text-center md:text-left">
            <span className="px-3 py-1 bg-[#1E5E3A]/10 text-[#1E5E3A] text-xs font-bold rounded-full border border-[#1E5E3A]/20 uppercase tracking-widest">
              Quiosque & Bar de Praia
            </span>
            <h1 className="text-2xl md:text-3xl font-serif italic text-[#1B3322] mt-2 font-bold">
              Seu pedido à beira-mar
            </h1>
            <p className="text-sm text-[#706558] max-w-md leading-relaxed">
              Peça porções quentes, cervejas estupidamente geladas e drinks autorais sem sair da sua cadeira.
            </p>
          </div>
          <div className="relative w-28 h-28 flex-shrink-0">
            {/* Visual illustrative beach representation */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#1E5E3A] to-[#7F5539] rounded-full blur-xl opacity-20 animate-pulse" />
            <div className="w-full h-full bg-white border border-[#E3DCD2] rounded-full flex items-center justify-center text-5xl shadow-sm">
              🍹
            </div>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#9C8E7B] pointer-events-none">
            <Search className="h-5 w-5 text-[#1E5E3A]" />
          </span>
          <input
            id="product-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar água de coco, batata frita, caipirinha..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E3DCD2] rounded-full text-[#1B3322] placeholder-[#9C8E7B] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] transition-all font-medium shadow-sm"
          />
        </div>

        {/* Categories Horizontal Carousel */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#9C8E7B] uppercase tracking-[0.15em] pl-1">
            Categorias do Cardápio
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4">
            <button
              onClick={() => setSelectedCategory('Todos')}
              className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer snap-start ${
                selectedCategory === 'Todos'
                  ? 'bg-[#1E5E3A] text-white shadow-lg shadow-green-100'
                  : 'bg-transparent border border-[#E3DCD2] hover:bg-white text-[#706558] hover:text-[#1B3322]'
              }`}
            >
              Todos os Itens
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.nome)}
                className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer snap-start ${
                  selectedCategory === cat.nome
                    ? 'bg-[#1E5E3A] text-white shadow-lg shadow-green-100'
                    : 'bg-transparent border border-[#E3DCD2] hover:bg-white text-[#706558] hover:text-[#1B3322]'
                }`}
              >
                {cat.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProdutos.map((prod) => {
              const qtyInCart = cart[prod.id] || 0;
              const isOutOfStock = prod.estoque !== undefined && prod.estoque !== null && prod.estoque <= 0;
              return (
                <motion.div
                  key={prod.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white p-4 rounded-[32px] shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-[#1E5E3A] flex flex-col justify-between group"
                >
                  <div className="flex p-1 gap-4">
                    {/* Lazy-loaded-style premium card Image */}
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-[24px] overflow-hidden bg-[#F4EFE6] border border-[#E3DCD2] flex-shrink-0 relative">
                      <img
                        src={prod.imagem}
                        alt={prod.nome}
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                          !prod.ativo || isOutOfStock ? 'opacity-40 grayscale' : ''
                        }`}
                      />
                      {!prod.ativo && (
                        <div className="absolute inset-0 bg-white/85 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
                            Esgotado
                          </span>
                        </div>
                      )}
                      {prod.ativo && isOutOfStock && (
                        <div className="absolute inset-0 bg-white/85 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider px-2 py-1 bg-red-50 border border-red-200 rounded-lg">
                            Não disponível
                          </span>
                        </div>
                      )}
                      {qtyInCart > 0 && prod.ativo && !isOutOfStock && (
                        <div className="absolute top-1 right-1 bg-[#1E5E3A] text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                          {qtyInCart}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[9px] font-bold text-[#1E5E3A] uppercase tracking-wider">
                            {prod.categoria}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-[#1B3322] mt-0.5 group-hover:text-[#1E5E3A] transition-colors truncate">
                          {prod.nome}
                        </h4>
                        <p className="text-xs text-[#706558] mt-1 line-clamp-2 font-medium leading-relaxed">
                          {prod.descricao}
                        </p>
                      </div>

                      <div className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="text-lg font-extrabold text-[#1E5E3A]">
                          R$ {prod.preco.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity controls / Action button footer */}
                  <div className="px-2 pb-2 pt-2 border-t border-[#F4EFE6] flex items-center justify-end mt-4 bg-transparent">
                    {!prod.ativo ? (
                      <button
                        disabled
                        className="w-full text-xs font-semibold text-[#9C8E7B] text-center py-2.5 bg-[#F4EFE6] rounded-xl"
                      >
                        Indisponível no Momento
                      </button>
                    ) : isOutOfStock ? (
                      <button
                        disabled
                        className="w-full text-xs font-bold text-red-600 text-center py-2.5 bg-red-50 border border-red-200 rounded-xl"
                      >
                        Não disponível (Sem Estoque)
                      </button>
                    ) : qtyInCart > 0 ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onUpdateCartQuantity(prod.id, qtyInCart - 1)}
                          className="w-8 h-8 rounded-xl bg-[#F4EFE6] border border-[#E3DCD2] flex items-center justify-center text-[#706558] hover:text-[#1B3322] hover:bg-[#E3DCD2] transition-all cursor-pointer"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-extrabold w-6 text-center text-[#1B3322]">
                          {qtyInCart}
                        </span>
                        <button
                          onClick={() => onUpdateCartQuantity(prod.id, qtyInCart + 1)}
                          className="w-8 h-8 rounded-xl bg-[#1E5E3A] text-white flex items-center justify-center hover:bg-opacity-90 transition-all cursor-pointer shadow-md shadow-green-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onUpdateCartQuantity(prod.id, 1)}
                        className="w-full py-3 rounded-2xl bg-[#F4EFE6] hover:bg-[#1E5E3A] hover:text-white transition-colors font-bold text-sm text-[#1E5E3A] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Adicionar</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredProdutos.length === 0 && (
            <div className="col-span-1 md:col-span-2 py-16 text-center space-y-3 bg-white border border-[#E3DCD2] rounded-[32px] p-8 shadow-sm">
              <div className="text-5xl">🥥</div>
              <h4 className="text-base font-bold text-[#1B3322]">Nenhum item encontrado</h4>
              <p className="text-xs text-[#706558] max-w-xs mx-auto">
                Tente redefinir a busca ou selecione outra categoria. Estamos abastecidos com águas frescas e ótimos petiscos!
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Cart Button (At the bottom, persistent) */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
          <div className="max-w-md mx-auto">
            <button
              id="view-cart-floating-button"
              onClick={onOpenCart}
              className="w-full bg-[#1E5E3A] text-white font-extrabold rounded-2xl py-4 px-6 flex items-center justify-between shadow-xl shadow-green-100 cursor-pointer hover:bg-opacity-95 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="h-5 w-5 text-white" />
                  <span className="absolute -top-2 -right-2.5 bg-[#7F5539] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-md">
                    {cartItemCount}
                  </span>
                </div>
                <span>Ver Sacola de Pedidos</span>
              </div>
              <span className="text-sm bg-white/15 py-1 px-3 rounded-lg">
                R$ {Object.entries(cart).reduce((total, [prodId, qty]) => {
                  const product = produtos.find((p) => p.id === prodId);
                  return total + (product ? product.preco * Number(qty) : 0);
                }, 0).toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
