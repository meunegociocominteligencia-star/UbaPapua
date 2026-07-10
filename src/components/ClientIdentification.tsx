/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sunset, ArrowRight, User, MapPin } from 'lucide-react';
import { motion } from 'motion/react';
import { ConfigEstabelecimento } from '../types';

interface ClientIdentificationProps {
  config: ConfigEstabelecimento;
  onIdentify: (nome: string, quiosque: string) => void;
  onEnterAdmin: () => void;
}

export function ClientIdentification({ config, onIdentify, onEnterAdmin }: ClientIdentificationProps) {
  const [nome, setNome] = useState('');
  const [quiosque, setQuiosque] = useState('');
  const [error, setError] = useState('');

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
    setError('');
    onIdentify(nome.trim(), quiosque.trim());
  };

  return (
    <div id="identification-screen" className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-[#FDFBF7]">
      {/* Premium ambient decorative blurred background circles */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#0077BE]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#F27D26]/5 blur-[120px] pointer-events-none" />
      
      {/* Decorative Beach Waves Lines */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 100 Q 250 50 500 100 T 1000 100 T 1500 100 T 2000 100" fill="none" stroke="#E8E2D9" strokeWidth="2" />
          <path d="M 0 200 Q 250 150 500 200 T 1000 200 T 1500 200 T 2000 200" fill="none" stroke="#E8E2D9" strokeWidth="2" />
          <path d="M 0 300 Q 250 250 500 300 T 1000 300 T 1500 300 T 2000 300" fill="none" stroke="#E8E2D9" strokeWidth="2" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-[#E8E2D9] rounded-[32px] p-8 shadow-xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[24px] bg-[#F5F2ED] border border-[#E8E2D9] mb-4 text-4xl shadow-sm">
            {config.logo || '🌊'}
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#A89F91] font-bold block">Bem-vindo ao</span>
          <h1 className="text-3xl font-serif italic text-[#0077BE] mt-1">
            {config.nome}
          </h1>
          <p className="text-xs text-[#5C6B73] mt-2 font-medium max-w-xs mx-auto leading-relaxed">
            {config.mensagem_inicial}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1A2E35] uppercase tracking-wider block">
              Seu Nome Completo ou Apelido
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#5C6B73] pointer-events-none">
                <User className="h-5 w-5 text-[#0077BE]" />
              </span>
              <input
                id="customer-name-input"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Mariana Silva"
                className="w-full pl-11 pr-4 py-3.5 bg-[#FDFBF7] border border-[#E8E2D9] rounded-2xl text-[#1A2E35] placeholder-[#A89F91] focus:outline-none focus:border-[#0077BE] focus:ring-1 focus:ring-[#0077BE] transition-all font-medium text-base shadow-inner-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1A2E35] uppercase tracking-wider block">
              Mesa / Guarda-sol ou Quiosque
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-[#5C6B73] pointer-events-none">
                <MapPin className="h-5 w-5 text-[#0077BE]" />
              </span>
              <input
                id="kiosk-number-input"
                type="text"
                value={quiosque}
                onChange={(e) => setQuiosque(e.target.value)}
                placeholder="Ex: Mesa 04, Guarda-sol 15"
                className="w-full pl-11 pr-4 py-3.5 bg-[#FDFBF7] border border-[#E8E2D9] rounded-2xl text-[#1A2E35] placeholder-[#A89F91] focus:outline-none focus:border-[#0077BE] focus:ring-1 focus:ring-[#0077BE] transition-all font-medium text-base shadow-inner-sm"
              />
            </div>
            <p className="text-[11px] text-[#5C6B73] pl-1 leading-normal">
              * Nosso garçom entregará seus pedidos diretamente nesta localização.
            </p>
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
            className="w-full py-4 bg-[#0077BE] hover:bg-[#0077BE]/90 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>Acessar Cardápio</span>
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#E8E2D9] flex flex-col items-center gap-3">
          <p className="text-[11px] text-[#5C6B73] text-center leading-relaxed">
            {config.horario_funcionamento} • {config.endereco}
          </p>
          <button
            id="admin-access-trigger"
            onClick={onEnterAdmin}
            className="text-xs font-semibold text-[#A89F91] hover:text-[#0077BE] transition-colors py-1 px-3 rounded-full hover:bg-[#F5F2ED] cursor-pointer"
          >
            Acesso Administrativo / Garçom
          </button>
        </div>
      </motion.div>
    </div>
  );
}
