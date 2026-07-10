/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NetworkStatusProps {
  status: 'online' | 'offline' | 'syncing';
  pendingCount: number;
}

export function NetworkStatus({ status, pendingCount }: NetworkStatusProps) {
  return (
    <AnimatePresence>
      <motion.div
        id="network-status-indicator"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium shadow-xl backdrop-blur-md"
        style={{
          background:
            status === 'online'
              ? 'rgba(16, 185, 129, 0.15)'
              : status === 'syncing'
              ? 'rgba(14, 165, 233, 0.15)'
              : 'rgba(249, 115, 22, 0.15)',
          border:
            status === 'online'
              ? '1px solid rgba(16, 185, 129, 0.3)'
              : status === 'syncing'
              ? '1px solid rgba(14, 165, 233, 0.3)'
              : '1px solid rgba(249, 115, 22, 0.3)',
          color:
            status === 'online'
              ? '#10B981'
              : status === 'syncing'
              ? '#38BDF8'
              : '#F97316',
        }}
      >
        {status === 'online' && (
          <>
            <Wifi className="h-4 w-4 animate-pulse" />
            <span>Online</span>
          </>
        )}
        {status === 'syncing' && (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Sincronizando...</span>
          </>
        )}
        {status === 'offline' && (
          <>
            <WifiOff className="h-4 w-4 animate-bounce" />
            <span>Modo Offline</span>
          </>
        )}
        {pendingCount > 0 && (
          <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white shadow-md animate-pulse">
            {pendingCount}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
