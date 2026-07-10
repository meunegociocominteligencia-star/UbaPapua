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
    <div id="cart-drawer-overlay" className="fixed inset-0 z-50 flex justify-end bg-[#1B3322]/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md h-full bg-white border-l border-[#E3DCD2] flex flex-col justify-between shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#E3DCD2] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#1E5E3A]" />
            <h2 className="text-lg font-serif italic text-[#1B3322] font-bold">Sua Sacola</h2>
          </div>
          <button
            id="close-cart-button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#F4EFE6] border border-[#E3DCD2] flex items-center justify-center text-[#706558] hover:text-[#1B3322] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isOffline && (
            <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 flex gap-3 text-orange-800">
              <WifiOff className="h-5 w-5 flex-shrink-0 animate-bounce mt-0.5 text-orange-600" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Modo de Pedido Offline</h4>
                <p className="text-[11px] text-orange-700 leading-normal mt-1">
                  Você está desconectado. Seu pedido será saved localmente e enviado automaticamente para a cozinha assim que sua internet voltar!
                </p>
              </div>
            </div>
          )}

          {cartDetails.items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="text-5xl">🥥</div>
              <h4 className="text-sm font-bold text-[#9C8E7B]">Sua sacola está vazia</h4>
              <p className="text-xs text-[#706558] max-w-xs mx-auto">
                Dê uma olhada no cardápio e adicione bebidas frescas e deliciosas porções!
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-[#F4EFE6] border border-[#E3DCD2] hover:bg-[#1E5E3A] hover:text-white text-[#1E5E3A] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Voltar ao Cardápio
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#9C8E7B] uppercase tracking-[0.15em] pl-1">
                Itens Adicionados
              </h3>
              
              <div className="space-y-3">
                {cartDetails.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#FCFBF9] border border-[#E3DCD2] rounded-2xl flex gap-3.5 relative group"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F4EFE6] border border-[#E3DCD2] flex-shrink-0">
                      <img src={item.imagem} alt={item.nome} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-[#1B3322] truncate pr-6">
                          {item.nome}
                        </h4>
                        <p className="text-xs text-[#1E5E3A] font-bold mt-0.5">
                          R$ {item.preco.toFixed(2)}
                        </p>
                      </div>

                      {/* Quantity Editor inside Cart */}
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUpdateCartQuantity(item.id, item.quantidade - 1)}
                            className="w-6 h-6 rounded bg-[#F4EFE6] border border-[#E3DCD2] flex items-center justify-center text-[#706558] hover:text-[#1B3322] transition-colors cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs font-bold text-[#1B3322] w-4 text-center">
                            {item.quantidade}
                          </span>
                          <button
                            onClick={() => onUpdateCartQuantity(item.id, item.quantidade + 1)}
                            className="w-6 h-6 rounded bg-[#1E5E3A] flex items-center justify-center text-white hover:bg-opacity-90 transition-colors cursor-pointer shadow-sm shadow-green-100"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-xs font-extrabold text-[#1B3322]">
                          R$ {item.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Trash Delete */}
                    <button
                      onClick={() => onRemoveFromCart(item.id)}
                      className="absolute top-2 right-2 text-[#9C8E7B] hover:text-red-600 transition-colors p-1.5 rounded hover:bg-[#F4EFE6] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cartDetails.items.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#E3DCD2]">
              <label className="text-xs font-bold text-[#9C8E7B] uppercase tracking-wider pl-1 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#1E5E3A]" />
                <span>Observações do Pedido</span>
              </label>
              <textarea
                id="order-notes-textarea"
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Trazer limão e gelo extra, sem cebola na porção..."
                className="w-full p-3 bg-[#FCFBF9] border border-[#E3DCD2] rounded-2xl text-[#1B3322] placeholder-[#9C8E7B] focus:outline-none focus:border-[#1E5E3A] focus:ring-1 focus:ring-[#1E5E3A] text-xs font-medium resize-none leading-relaxed shadow-inner-sm"
              />
            </div>
          )}
        </div>

        {/* Footer Billing Details */}
        {cartDetails.items.length > 0 && (
          <div className="bg-[#F4EFE6] border-t border-[#E3DCD2] p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#706558]">
                <span>Subtotal</span>
                <span>R$ {cartDetails.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#706558]">
                <span>Taxa de Serviço ({config.taxa_servico}%)</span>
                <span>R$ {cartDetails.taxa.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-black text-[#1B3322] pt-2 border-t border-[#E3DCD2]">
                <span>Total Geral</span>
                <span className="text-xl text-[#1E5E3A] font-extrabold">R$ {cartDetails.total.toFixed(2)}</span>
              </div>
            </div>

            <button
              id="confirm-checkout-button"
              onClick={handleSubmit}
              className="w-full bg-[#1E5E3A] hover:bg-opacity-95 text-white font-extrabold rounded-2xl py-4 flex items-center justify-center gap-2 shadow-xl shadow-green-100 cursor-pointer transition-all active:scale-[0.98]"
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
