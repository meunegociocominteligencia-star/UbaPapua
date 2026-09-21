/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { X, Minus, Plus, Trash2, FileText, ShoppingBag, WifiOff, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { Produto, ConfigEstabelecimento } from '../types';

interface CarrinhoProps {
  cart: { [id: string]: number };
  produtos: Produto[];
  config: ConfigEstabelecimento;
  onUpdateCartQuantity: (id: string, qty: number) => void;
  onRemoveFromCart: (id: string) => void;
  onClose: () => void;
  onSubmitOrder: (observacoes: string) => void;
  isOffline: boolean;
}

export function Carrinho({
  cart,
  produtos,
  config,
  onUpdateCartQuantity,
  onRemoveFromCart,
  onClose,
  onSubmitOrder,
  isOffline
}: CarrinhoProps) {
  const [observacoes, setObservacoes] = useState('');

  // Calculate prices
  const cartDetails = useMemo(() => {
    let subtotal = 0;
    const items = Object.entries(cart).map(([prodId, qty]) => {
      const product = produtos.find((p) => p.id === prodId);
      const valorTotalItem = product ? product.preco * qty : 0;
      subtotal += valorTotalItem;
      return {
        id: prodId,
        nome: product?.nome || 'Produto Desconhecido',
        imagem: product?.imagem || '',
        preco: product?.preco || 0,
        quantidade: qty,
        total: valorTotalItem
      };
    }).filter(item => item.quantidade > 0);

    const taxa = (subtotal * config.taxa_servico) / 100;
    const total = subtotal + taxa;

    return {
      items,
      subtotal,
      taxa,
      total
    };
  }, [cart, produtos, config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartDetails.items.length === 0) return;
    onSubmitOrder(observacoes);
  };

  return (
    <div id="cart-drawer-overlay" className="fixed inset-0 z-50 flex justify-end bg-[#0F172A]/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md h-full bg-white border-l border-[#E2E8F0] flex flex-col justify-between shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#0284C7]" />
            <h2 className="text-lg font-serif italic text-[#0F2B5C] font-bold">Sua Sacola de Pedidos</h2>
          </div>
          <button
            id="close-cart-button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#F0F9FF] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#0F2B5C] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isOffline && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex gap-3 text-amber-800">
              <WifiOff className="h-5 w-5 flex-shrink-0 animate-bounce mt-0.5 text-amber-600" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Modo de Pedido Offline</h4>
                <p className="text-[11px] text-amber-700 leading-normal mt-1">
                  Você está desconectado. Seu pedido será salvo localmente e enviado automaticamente para a cozinha assim que sua internet voltar!
                </p>
              </div>
            </div>
          )}

          {cartDetails.items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="text-5xl">🌊</div>
              <h4 className="text-sm font-bold text-[#64748B]">Sua sacola está vazia</h4>
              <p className="text-xs text-[#64748B] max-w-xs mx-auto">
                Dê uma olhada no cardápio e adicione bebidas frescas e deliciosas porções!
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-[#F0F9FF] border border-[#BAE6FD] hover:bg-[#0284C7] hover:text-white text-[#0284C7] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Voltar ao Cardápio
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-[0.15em] pl-1">
                Itens Adicionados
              </h3>
              
              <div className="space-y-3">
                {cartDetails.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl flex gap-3.5 relative group"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F0F9FF] border border-[#E2E8F0] flex-shrink-0">
                      <img src={item.imagem} alt={item.nome} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#0F172A] truncate pr-6">
                          {item.nome}
                        </h4>
                        <p className="text-xs text-[#0284C7] font-bold mt-0.5">
                          R$ {item.preco.toFixed(2)}
                        </p>
                      </div>

                      {/* Quantity Editor inside Cart */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUpdateCartQuantity(item.id, item.quantidade - 1)}
                            className="w-6 h-6 rounded bg-[#F0F9FF] border border-[#BAE6FD] flex items-center justify-center text-[#64748B] hover:text-[#0F2B5C] transition-colors cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold text-[#0F172A] w-4 text-center">
                            {item.quantidade}
                          </span>
                          <button
                            onClick={() => onUpdateCartQuantity(item.id, item.quantidade + 1)}
                            className="w-6 h-6 rounded bg-[#0284C7] flex items-center justify-center text-white hover:bg-[#0369A1] transition-colors cursor-pointer shadow-sm shadow-sky-200"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-xs font-extrabold text-[#0F2B5C]">
                          R$ {item.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Trash Delete */}
                    <button
                      onClick={() => onRemoveFromCart(item.id)}
                      className="absolute top-2 right-2 text-[#94A3B8] hover:text-red-600 transition-colors p-1.5 rounded hover:bg-[#FEE2E2] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cartDetails.items.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#E2E8F0]">
              <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider pl-1 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#0284C7]" />
                <span>Observações do Pedido</span>
              </label>
              <textarea
                id="order-notes-textarea"
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Trazer limão e gelo extra, sem cebola na porção..."
                className="w-full p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] text-xs font-medium resize-none leading-relaxed shadow-inner-sm"
              />
            </div>
          )}
        </div>

        {/* Footer Billing Details */}
        {cartDetails.items.length > 0 && (
          <div className="bg-[#F0F9FF] border-t border-[#BAE6FD]/60 p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>Subtotal</span>
                <span className="font-semibold text-[#0F172A]">R$ {cartDetails.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#64748B]">
                <span>Taxa de Serviço ({config.taxa_servico}%)</span>
                <span className="font-semibold text-[#0F172A]">R$ {cartDetails.taxa.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-black text-[#0F2B5C] pt-2 border-t border-[#BAE6FD]/60">
                <span>Total Geral</span>
                <span className="text-xl text-[#0284C7] font-extrabold">R$ {cartDetails.total.toFixed(2)}</span>
              </div>
            </div>

            <button
              id="confirm-checkout-button"
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-[#0284C7] to-[#1D4ED8] hover:from-[#0369A1] hover:to-[#1E40AF] text-white font-extrabold rounded-2xl py-4 flex items-center justify-center gap-2 shadow-xl shadow-sky-200 cursor-pointer transition-all active:scale-[0.98]"
            >
              <Send className="h-5 w-5" />
              <span>{isOffline ? 'Salvar Pedido Offline' : 'Enviar Pedido para Cozinha'}</span>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
