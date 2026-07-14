/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ClipboardList, CheckCircle2, Clock, Flame, GlassWater, ChevronRight, Check, RefreshCw, FileText, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { Pedido, OrderStatus } from '../types';

interface PedidosStatusProps {
  orders: Pedido[];
  onBackToMenu: () => void;
  onRefresh?: () => Promise<void>;
  onCancelOrder?: (id: string) => void;
  onCloseBill?: () => void;
  onClearSession?: () => void;
}

export function PedidosStatus({ orders, onBackToMenu, onRefresh, onCancelOrder, onCloseBill, onClearSession }: PedidosStatusProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleManualRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (err) {
      console.error('Manual refresh failed:', err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    }
  };

  const generateReceiptPDF = (ordersToInclude: Pedido[], title: string = 'Recibo de Consumo') => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a6', // compact size, fits receipt look beautifully
      });

      const firstOrder = ordersToInclude[0];
      const clientName = firstOrder?.cliente_nome || 'Cliente';
      const kiosk = firstOrder?.quiosque || 'Balcão';
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Consolidate identical items across orders
      const itemsMap: { [key: string]: { nome: string; qtd: number; valor: number } } = {};
      let subtotal = 0;
      let serviceFee = 0;
      let total = 0;

      ordersToInclude.forEach(o => {
        subtotal += o.valor_total;
        serviceFee += o.taxa_servico;
        total += o.valor_final;

        o.itens.forEach(item => {
          const key = item.produto_id || item.produto_nome;
          if (itemsMap[key]) {
            itemsMap[key].qtd += item.quantidade;
          } else {
            itemsMap[key] = {
              nome: item.produto_nome,
              qtd: item.quantidade,
              valor: item.valor
            };
          }
        });
      });

      const consolidatedItems = Object.values(itemsMap);

      const margin = 8;
      const width = 105; // A6 width in mm
      let y = 12;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(27, 51, 34); // #1B3322 dark green
      doc.text('BARRACA & QUIOSQUE', width / 2, y, { align: 'center' });
      
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(112, 101, 88); // #706558
      doc.text(title, width / 2, y, { align: 'center' });

      y += 6;
      doc.setDrawColor(227, 220, 210); // #E3DCD2 border color
      doc.setLineWidth(0.3);
      doc.line(margin, y, width - margin, y);

      // Customer Details
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(27, 51, 34);
      doc.text('Cliente:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(clientName, margin + 12, y);

      y += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.text('Mesa/Quiosque:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(kiosk, margin + 23, y);

      y += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.text('Data/Hora:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${dateStr} às ${timeStr}`, margin + 16, y);

      y += 4;
      doc.line(margin, y, width - margin, y);

      // Table Header
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(112, 101, 88);
      doc.text('Item', margin, y);
      doc.text('Qtd', width - margin - 22, y, { align: 'right' });
      doc.text('Total', width - margin, y, { align: 'right' });

      y += 3;
      doc.line(margin, y, width - margin, y);

      // Table Items
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(27, 51, 34);

      consolidatedItems.forEach(item => {
        y += 4.5;
        // Check for page overflow
        if (y > 135) {
          doc.addPage();
          y = 12;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(112, 101, 88);
          doc.text('Item (continuação)', margin, y);
          doc.text('Qtd', width - margin - 22, y, { align: 'right' });
          doc.text('Total', width - margin, y, { align: 'right' });
          y += 3;
          doc.line(margin, y, width - margin, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(27, 51, 34);
          y += 4.5;
        }

        let nome = item.nome;
        if (nome.length > 25) {
          nome = nome.substring(0, 23) + '...';
        }

        doc.text(nome, margin, y);
        doc.text(`${item.qtd}x`, width - margin - 22, y, { align: 'right' });
        doc.text(`R$ ${(item.valor * item.qtd).toFixed(2)}`, width - margin, y, { align: 'right' });
      });

      y += 4;
      doc.line(margin, y, width - margin, y);

      // Totals
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', width - margin - 25, y, { align: 'right' });
      doc.text(`R$ ${subtotal.toFixed(2)}`, width - margin, y, { align: 'right' });

      if (serviceFee > 0) {
        y += 4;
        doc.text('Taxa de Serviço:', width - margin - 25, y, { align: 'right' });
        doc.text(`R$ ${serviceFee.toFixed(2)}`, width - margin, y, { align: 'right' });
      }

      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Total Geral:', width - margin - 25, y, { align: 'right' });
      doc.text(`R$ ${total.toFixed(2)}`, width - margin, y, { align: 'right' });

      y += 5;
      doc.line(margin, y, width - margin, y);

      // Footer
      y += 6;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(112, 101, 88);
      doc.text('Obrigado pela preferência! Volte Sempre! 😊', width / 2, y, { align: 'center' });
      y += 3.5;
      doc.setFont('helvetica', 'bold');
      doc.text('CONTA PAGA E CONFIRMADA', width / 2, y, { align: 'center' });

      const fileName = `recibo_conta_${clientName.toLowerCase().replace(/\s+/g, '_')}_${kiosk.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Failed to generate receipt PDF:', err);
      alert('Não foi possível gerar o comprovante em PDF.');
    }
  };

  return (
    <div id="orders-status-screen" className="min-h-screen bg-[#FDFBF7] pb-32 text-[#1A2E35] p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E2D9] pb-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#0077BE]" />
            <div>
              <h2 className="text-sm font-serif italic font-bold text-[#1A2E35] leading-tight">Meus Pedidos</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] text-emerald-600 font-bold tracking-wider uppercase">Em tempo real</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-2 text-[#5C6B73] hover:text-[#0077BE] bg-[#F5F2ED] hover:bg-[#E8E2D9] border border-[#E8E2D9] rounded-xl transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                title="Atualizar Status"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#0077BE]' : ''}`} />
              </button>
            )}
            <button
              id="back-to-menu-button"
              onClick={onBackToMenu}
              className="text-xs font-bold text-[#0077BE] hover:text-white transition-all py-1.5 px-3 bg-[#F5F2ED] border border-[#E8E2D9] rounded-xl cursor-pointer hover:bg-[#0077BE]"
            >
              Fazer Novo Pedido
            </button>
          </div>
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
          <>
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
                          : order.pago
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 font-black'
                          : order.status === 'Entregue'
                          ? 'bg-[#F5F2ED] border border-[#E8E2D9] text-[#5C6B73]'
                          : order.status === 'Pronto'
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 animate-pulse'
                          : order.status === 'Em preparo'
                          ? 'bg-amber-50 border border-amber-200 text-amber-700'
                          : 'bg-blue-50 border border-blue-100 text-[#0077BE]'
                      }`}
                    >
                      {order.pago ? 'Pago ✅' : order.status}
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

                  {/* Cancel button */}
                  {order.status === 'Recebido' && onCancelOrder && (
                    <button
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja cancelar este pedido?')) {
                          onCancelOrder(order.id);
                        }
                      }}
                      className="w-full mt-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-100 hover:border-red-200 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      Cancelar Pedido
                    </button>
                  )}

                  {order.pago && (
                    <button
                      onClick={() => generateReceiptPDF([order], `Recibo do Pedido #${order.id.slice(-4).toUpperCase()}`)}
                      className="w-full mt-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 hover:border-emerald-200 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Baixar Recibo do Pedido (PDF)</span>
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
          
          {/* Resumo de Consumo & Fechar Conta */}
          {(() => {
            const activeUnpaidOrders = orders.filter(o => o.status !== 'Cancelado' && !o.pago);
            const activePaidOrders = orders.filter(o => o.status !== 'Cancelado' && o.pago);
            const totalUnpaidAmount = activeUnpaidOrders.reduce((sum, o) => sum + o.valor_final, 0);
            const totalPaidAmount = activePaidOrders.reduce((sum, o) => sum + o.valor_final, 0);
            
            const isBillAlreadyRequested = activeUnpaidOrders.some(o => o.conta_solicitada);

            if (orders.filter(o => o.status !== 'Cancelado').length === 0) return null;

            const isAllPaid = activeUnpaidOrders.length === 0 && activePaidOrders.length > 0;

            return (
              <div className={`bg-[#FCFBF9] border-t-4 ${isAllPaid ? 'border-emerald-500' : isBillAlreadyRequested ? 'border-amber-500' : 'border-[#0077BE]'} border border-[#E8E2D9] rounded-[32px] p-5 shadow-sm space-y-4 mt-8`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-[#A89F91] uppercase tracking-widest">Resumo de Consumo</h4>
                    <p className="text-[10px] text-[#5C6B73]">
                      {isAllPaid ? 'Sua conta foi finalizada com sucesso!' : 'Soma de todos os seus pedidos ativos'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-[#A89F91] block uppercase font-bold">
                      {isAllPaid ? 'Total Pago' : 'Total Pendente'}
                    </span>
                    <span className={`text-base font-extrabold ${isAllPaid ? 'text-emerald-600' : 'text-[#0077BE]'}`}>
                      R$ {(isAllPaid ? totalPaidAmount : totalUnpaidAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Status da Conta Indicator */}
                <div className="flex items-center justify-between bg-[#F5F2ED] rounded-xl px-4 py-2.5 text-xs font-semibold text-[#1A2E35]">
                  <span className="text-[10px] uppercase font-bold text-[#A89F91]">Status da Conta:</span>
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    isAllPaid 
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : isBillAlreadyRequested
                      ? 'bg-amber-50 border border-amber-200 text-amber-700 animate-pulse'
                      : 'bg-sky-50 border border-sky-200 text-sky-700 font-bold'
                  }`}>
                    {isAllPaid ? 'Conta Paga' : isBillAlreadyRequested ? 'Aguardando confirmação de Pagamento' : 'Conta em Aberto'}
                  </span>
                </div>
                
                {onCloseBill && !isAllPaid && (
                  <button
                    onClick={() => {
                      if (isBillAlreadyRequested) return;
                      if (window.confirm(`Deseja solicitar o fechamento da conta no valor de R$ ${totalUnpaidAmount.toFixed(2)}? Nosso garçom virá à sua mesa.`)) {
                        onCloseBill();
                      }
                    }}
                    disabled={isBillAlreadyRequested}
                    className={`w-full py-3.5 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      isBillAlreadyRequested
                        ? 'bg-amber-50 border border-amber-200 text-amber-700 opacity-90 cursor-not-allowed'
                        : 'bg-[#0077BE] hover:bg-[#005B94] text-white shadow-md hover:shadow-lg'
                    }`}
                  >
                    {isBillAlreadyRequested ? (
                      <>
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                        </span>
                        Fechamento de Conta Solicitado (Aguarde o Garçom)
                      </>
                    ) : (
                      <>
                        💳 Fechar Conta / Pedir Conta
                      </>
                    )}
                  </button>
                )}

                {isAllPaid && (
                  <div className="space-y-3">
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-center py-3 rounded-2xl text-[11px] font-bold">
                      Obrigado pela preferência! Volte sempre! 😊
                    </div>
                    <button
                      type="button"
                      onClick={() => generateReceiptPDF(activePaidOrders, 'Recibo Completo de Consumo')}
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <FileText className="h-4 w-4" />
                      <span>📥 Baixar Comprovante Completo (PDF)</span>
                    </button>
                    {onClearSession && (
                      <button
                        onClick={onClearSession}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                      >
                        🔄 Iniciar Novo Atendimento (Limpar Pedidos)
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          </>
        )}
      </div>
    </div>
  );
}
