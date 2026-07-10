/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ClipboardList, CheckCircle2, Clock, Flame, GlassWater, ChevronRight, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { Pedido, OrderStatus } from '../types';

interface PedidosStatusProps {
  orders: Pedido[];
  onBackToMenu: () => void;
}

export function PedidosStatus({ orders, onBackToMenu }: PedidosStatusProps) {
  const steps: { label: OrderStatus; desc: string; color: string }[] = [
    { label: 'Recebido', desc: 'Pedido enviado para a cozinha', color: 'sky' },
    { label: 'Em preparo', desc: 'Preparando seus pratos ou drinks', color: 'amber' },
    { label: 'Pronto', desc: 'Pronto! O garçom está levando', color: 'emerald' },
    { label: 'Entregue', desc: 'Pedido entregue. Bom apetite!', color: 'slate' }
  ];

  const getStepIndex = (status: OrderStatus) => {
    if (status === 'Cancelado') return -1;
    return steps.findIndex((step) => step.label === status);
  };

  return (
    <div id="orders-status-screen" className="min-h-screen bg-[#FDFBF7] pb-32 text-[#1A2E35] p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#0077BE]" />
            <h2 className="text-lg font-serif italic font-bold text-[#1A2E35]">Acompanhar Pedidos</h2>
          </div>
          <button
            id="back-to-menu-button"
            onClick={onBackToMenu}
            className="text-xs font-bold text-[#0077BE] hover:text-white transition-all py-1.5 px-3 bg-[#F5F2ED] border border-[#E8E2D9] rounded-xl cursor-pointer hover:bg-[#0077BE]"
          >
            Fazer Novo Pedido
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-white border border-[#E8E2D9] rounded-[32px] p-8 shadow-sm">
            <div className="text-5xl">🥥</div>
            <h4 className="text-sm font-bold text-[#A89F91]">Nenhum pedido feito ainda</h4>
            <p className="text-xs text-[#5C6B73] max-w-xs mx-auto leading-relaxed">
              Seus pedidos concluídos nesta sessão serão exibidos em tempo real aqui. Toque no botão acima para escolher algo gostoso!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order, orderIdx) => {
              const currentStepIdx = getStepIndex(order.status);
              const isCancelled = order.status === 'Cancelado';

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: orderIdx * 0.1 }}
                  className="bg-white border border-[#E8E2D9] rounded-[32px] p-5 shadow-sm space-y-5 relative overflow-hidden"
                >
                  {/* Decorative background pulse for active orders */}
                  {(order.status === 'Em preparo' || order.status === 'Pronto') && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#0077BE]/5 rounded-full blur-xl animate-pulse pointer-events-none" />
                  )}

                  {/* Order Meta Header */}
                  <div className="flex items-center justify-between border-b border-[#F5F2ED] pb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#A89F91]">Pedido #{order.id.slice(-4).toUpperCase()}</span>
                        {order.synced === false && (
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black rounded-full uppercase tracking-wider animate-pulse">
                            Pendência Offline
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#5C6B73] mt-0.5">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        isCancelled
                          ? 'bg-red-50 border border-red-200 text-red-700'
                          : order.status === 'Entregue'
                          ? 'bg-[#F5F2ED] border border-[#E8E2D9] text-[#5C6B73]'
                          : order.status === 'Pronto'
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 animate-pulse'
                          : order.status === 'Em preparo'
                          ? 'bg-amber-50 border border-amber-200 text-amber-700'
                          : 'bg-blue-50 border border-blue-100 text-[#0077BE]'
                      }`}
                    >
                      {order.status}
                    </div>
                  </div>

                  {/* Order Items Summary */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-[#A89F91] uppercase tracking-widest pl-0.5">
                      Itens do Pedido
                    </h4>
                    <div className="space-y-1.5 bg-[#FDFBF7] border border-[#E8E2D9] rounded-2xl p-4">
                      {order.itens.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-[#1A2E35]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-[#0077BE] flex-shrink-0">{item.quantidade}x</span>
                            <span className="truncate font-medium">{item.produto_nome}</span>
                          </div>
                          <span className="font-semibold text-[#5C6B73] flex-shrink-0">
                            R$ {(item.valor * item.quantidade).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {order.observacoes && (
                        <p className="text-[11px] text-[#5C6B73] mt-2.5 pt-2 border-t border-[#E8E2D9] leading-relaxed italic">
                          Obs: "{order.observacoes}"
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs font-bold text-[#1A2E35] pt-2 border-t border-[#E8E2D9] mt-2.5">
                        <span>Total Pago</span>
                        <span className="text-sm font-extrabold text-[#0077BE]">R$ {order.valor_final.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Progress Stepper (Only if not cancelled) */}
                  {!isCancelled ? (
                    <div className="space-y-4 pt-1">
                      <h4 className="text-[10px] font-black text-[#A89F91] uppercase tracking-widest pl-0.5">
                        Progresso de Entrega
                      </h4>
                      <div className="relative pl-6 space-y-4">
                        {/* Line connector */}
                        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-[#E8E2D9]" />
                        
                        {steps.map((step, sIdx) => {
                          const isDone = sIdx <= currentStepIdx;
                          const isCurrent = sIdx === currentStepIdx;

                          return (
                            <div key={sIdx} className="flex items-start gap-3.5 relative">
                              {/* Indicator Dot */}
                              <div
                                className={`absolute left-[-23px] w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                                  isDone
                                    ? 'bg-[#0077BE] border-[#0077BE] text-white'
                                    : 'bg-white border-[#E8E2D9] text-[#A89F91]'
                                }`}
                              >
                                {isDone ? (
                                  <Check className="h-3 w-3 stroke-[3]" />
                                ) : (
                                  <span className="text-[9px] font-bold">{sIdx + 1}</span>
                                )}
                              </div>

                              <div className="min-w-0">
                                <h5
                                  className={`text-xs font-bold transition-colors ${
                                    isCurrent
                                      ? 'text-[#0077BE] font-extrabold'
                                      : isDone
                                      ? 'text-[#1A2E35]'
                                      : 'text-[#A89F91]'
                                  }`}
                                >
                                  {step.label}
                                </h5>
                                <p className={`text-[10px] mt-0.5 leading-normal ${
                                  isCurrent ? 'text-[#5C6B73]' : 'text-[#A89F91]'
                                }`}>
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-center text-red-700 text-xs font-medium leading-relaxed">
                      Este pedido foi cancelado pelo estabelecimento. Caso tenha dúvidas, chame nosso garçom pelo botão de atendimento.
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
