/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sunset, ArrowRight, User, MapPin, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import { ConfigEstabelecimento } from '../types';

interface ClientIdentificationProps {
  config: ConfigEstabelecimento;
  onIdentify: (nome: string, quiosque: string, celular: string) => void;
  onEnterAdmin: () => void;
}

export function ClientIdentification({ config, onIdentify, onEnterAdmin }: ClientIdentificationProps) {
  const [nome, setNome] = useState('');
  const [quiosque, setQuiosque] = useState('');
  const [celular, setCelular] = useState('');
  const [error, setError] = useState('');

  const handleCelularChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const digits = input.replace(/\D/g, '');
    let masked = '';
    
    if (digits.length > 0) {
      masked += `(${digits.substring(0, 2)}`;
    }
    if (digits.length > 2) {
      masked += `) ${digits.substring(2, 7)}`;
    }
    if (digits.length > 7) {
      masked += `-${digits.substring(7, 11)}`;
    }
    
    setCelular(masked);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }
    if (!quiosque.trim()) {
      setError('Por favor, informe seu Quiosque, Mesa ou Guarda-sol.');
      return;
    }
    const rawCelular = celular.replace(/\D/g, '');
    if (!rawCelular || rawCelular.length < 10) {
      setError('Por favor, informe seu celular com DDD (Ex: 91 99999-9999).');
      return;
    }
    setError('');
    onIdentify(nome.trim(), quiosque.trim(), celular.trim());
  };

  return (
    <div id="identification-screen" className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-[#F8FAFC]">
      {/* Premium ambient decorative blurred background circles - water blue theme */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0284C7]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#1D4ED8]/10 blur-[120px] pointer-events-none" />
      
      {/* Decorative Wave Lines */}
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 100 Q 250 50 500 100 T 1000 100 T 1500 100 T 2000 100" fill="none" stroke="#BAE6FD" strokeWidth="2" />
          <path d="M 0 200 Q 250 150 500 200 T 1000 200 T 1500 200 T 2000 200" fill="none" stroke="#BAE6FD" strokeWidth="2" />
          <path d="M 0 300 Q 250 250 500 300 T 1000 300 T 1500 300 T 2000 300" fill="none" stroke="#BAE6FD" strokeWidth="2" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-[32px] p-8 shadow-xl shadow-sky-100/50 relative z-10"
      >
         <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-36 h-20 rounded-[20px] bg-white border border-[#BAE6FD] p-2 mb-4 shadow-sm overflow-hidden">
            {config.logo && (config.logo.startsWith('http') || config.logo.startsWith('data:image') || config.logo.startsWith('/') || config.logo.includes('.svg') || config.logo.includes('.png') || config.logo.includes('.jpg')) ? (
              <img src={config.logo} alt="Moju Park" className="w-full h-full object-contain" />
            ) : (
              <span className="text-3xl">{config.logo || '🌊'}</span>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#0284C7] font-bold block">Bem-vindo ao</span>
          <h1 className="text-3xl font-serif italic text-[#0F2B5C] mt-1 font-bold">
            {config.nome}
          </h1>
          <p className="text-xs text-[#475569] mt-2 font-medium max-w-xs mx-auto leading-relaxed">
            {config.mensagem_inicial}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#0F2B5C] uppercase tracking-wider block">
              Seu Nome Completo ou Apelido
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748B] pointer-events-none">
                <User className="h-5 w-5 text-[#0284C7]" />
              </span>
              <input
                id="customer-name-input"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Mariana Silva"
                className="w-full pl-11 pr-4 py-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all font-medium text-base shadow-inner-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#0F2B5C] uppercase tracking-wider block">
              Mesa / Área ou Quiosque
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748B] pointer-events-none">
                <MapPin className="h-5 w-5 text-[#0284C7]" />
              </span>
              <input
                id="kiosk-number-input"
                type="text"
                value={quiosque}
                onChange={(e) => setQuiosque(e.target.value)}
                placeholder="Ex: Mesa 04, Área Piscina 15"
                className="w-full pl-11 pr-4 py-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all font-medium text-base shadow-inner-sm"
              />
            </div>
            <p className="text-[11px] text-[#64748B] pl-1 leading-normal">
              * Nosso garçom entregará seus pedidos diretamente nesta localização.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#0F2B5C] uppercase tracking-wider block">
              Seu Celular / WhatsApp
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#64748B] pointer-events-none">
                <Phone className="h-5 w-5 text-[#0284C7]" />
              </span>
              <input
                id="customer-celular-input"
                type="tel"
                value={celular}
                onChange={handleCelularChange}
                placeholder="Ex: (91) 99999-9999"
                className="w-full pl-11 pr-4 py-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7] transition-all font-medium text-base shadow-inner-sm"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5"
            >
              {error}
            </motion.div>
          )}

          <button
            id="start-ordering-button"
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-[#0284C7] to-[#1D4ED8] hover:from-[#0369A1] hover:to-[#1E40AF] text-white font-bold rounded-2xl shadow-lg shadow-sky-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Acessar Cardápio</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#E2E8F0] flex flex-col items-center gap-3">
          <p className="text-[11px] text-[#64748B] text-center leading-relaxed">
            {config.horario_funcionamento} • {config.endereco}
          </p>
          <button
            id="admin-access-trigger"
            onClick={onEnterAdmin}
            className="text-xs font-semibold text-[#64748B] hover:text-[#0284C7] transition-colors py-1 px-3 rounded-full hover:bg-[#F0F9FF] cursor-pointer"
          >
            Acesso Administrativo / Garçom
          </button>
        </div>
      </motion.div>
    </div>
  );
}
