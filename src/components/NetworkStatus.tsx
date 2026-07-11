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
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-3 right-3 z-50 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md backdrop-blur-md transition-all"
        style={{
          background:
            status === 'online'
              ? 'rgba(16, 185, 129, 0.12)'
              : status === 'syncing'
              ? 'rgba(14, 165, 233, 0.12)'
              : 'rgba(249, 115, 22, 0.12)',
          border:
            status === 'online'
              ? '1px solid rgba(16, 185, 129, 0.25)'
              : status === 'syncing'
              ? '1px solid rgba(14, 165, 233, 0.25)'
              : '1px solid rgba(249, 115, 22, 0.25)',
          color:
            status === 'online'
              ? '#10B981'
              : status === 'syncing'
              ? '#0284C7'
              : '#EA580C',
        }}
      >
        {status === 'online' && (
          <>
            <Wifi className="h-3 w-3 animate-pulse" />
            <span>Online</span>
          </>
        )}
        {status === 'syncing' && (
          <>
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Sincronizando</span>
          </>
        )}
        {status === 'offline' && (
          <>
            <WifiOff className="h-3 w-3 animate-bounce" />
            <span>Offline</span>
          </>
        )}
        {pendingCount > 0 && (
          <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-black text-white shadow-sm animate-pulse">
            {pendingCount}
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
