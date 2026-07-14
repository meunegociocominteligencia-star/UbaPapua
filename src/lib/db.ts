/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Produto, Categoria, Pedido } from '../types';

const DB_NAME = 'BeachKioskOfflineDB';
const DB_VERSION = 1;

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  public async init(): Promise<void> {
    return new Promise((resolve) => {
      try {
        if (typeof window === 'undefined' || !window.indexedDB) {
          console.warn('IndexedDB is not supported/available in this environment.');
          resolve();
          return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('Error opening IndexedDB');
          resolve(); // Resolve to prevent app crash
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = request.result;

          // Store for products cache
          if (!db.objectStoreNames.contains('produtos')) {
            db.createObjectStore('produtos', { keyPath: 'id' });
          }

          // Store for categories cache
          if (!db.objectStoreNames.contains('categorias')) {
            db.createObjectStore('categorias', { keyPath: 'id' });
          }

          // Store for pending unsynced orders
          if (!db.objectStoreNames.contains('pedidos_pendentes')) {
            db.createObjectStore('pedidos_pendentes', { keyPath: 'id' });
          }

          // Store for all order histories (for client track)
          if (!db.objectStoreNames.contains('historico_pedidos')) {
            db.createObjectStore('historico_pedidos', { keyPath: 'id' });
          }
        };
      } catch (err) {
        console.warn('IndexedDB blocked or throws in this browser context:', err);
        resolve(); // Continue gracefully
      }
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore | null {
    if (!this.db) {
      return null;
    }
    try {
      const transaction = this.db.transaction(storeName, mode);
      return transaction.objectStore(storeName);
    } catch (err) {
      console.warn(`Error getting object store ${storeName}:`, err);
      return null;
    }
  }

  // PRODUCTS CACHE
  public async saveProdutos(produtos: Produto[]): Promise<void> {
    return new Promise((resolve) => {
      try {
        const store = this.getStore('produtos', 'readwrite');
        if (!store) {
          resolve();
          return;
        }
        store.clear(); // Clear existing cached products first
        produtos.forEach((prod) => {
          store.put(prod);
        });
        resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getProdutos(): Promise<Produto[]> {
    return new Promise((resolve) => {
      try {
        const store = this.getStore('produtos', 'readonly');
        if (!store) {
          resolve([]);
          return;
        }
        const request = store.getAll();
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  // CATEGORIES CACHE
  public async saveCategorias(categorias: Categoria[]): Promise<void> {
    return new Promise((resolve) => {
      try {
        const store = this.getStore('categorias', 'readwrite');
        if (!store) {
          resolve();
          return;
        }
        store.clear();
        categorias.forEach((cat) => {
          store.put(cat);
        });
        resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getCategorias(): Promise<Categoria[]> {
    return new Promise((resolve) => {
      try {
        const store = this.getStore('categorias', 'readonly');
        if (!store) {
          resolve([]);
          return;
        }
        const request = store.getAll();
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  // PENDING ORDERS
  public async savePendingOrder(pedido: Pedido): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const store = this.getStore('pedidos_pendentes', 'readwrite');
        if (!store) {
          resolve();
          return;
        }
        const request = store.put(pedido);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async getPendingOrders(): Promise<Pedido[]> {
    return new Promise((resolve) => {
      try {
        const store = this.getStore('pedidos_pendentes', 'readonly');
        if (!store) {
          resolve([]);
          return;
        }
        const request = store.getAll();
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public async removePendingOrder(id: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        const store = this.getStore('pedidos_pendentes', 'readwrite');
        if (!store) {
          resolve();
          return;
        }
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // ALL ORDER HISTORIES (For client-side local tracking)
  public async saveOrderHistory(pedido: Pedido): Promise<void> {
    return new Promise((resolve) => {
      try {
        const store = this.getStore('historico_pedidos', 'readwrite');
        if (!store) {
          resolve();
          return;
        }
        store.put(pedido);
        resolve();
      } catch {
        resolve();
      }
    });
  }

  public async getOrderHistories(): Promise<Pedido[]> {
    return new Promise((resolve) => {
      try {
        const store = this.getStore('historico_pedidos', 'readonly');
        if (!store) {
          resolve([]);
          return;
        }
        const request = store.getAll();
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public async clearOrderHistories(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const store = this.getStore('historico_pedidos', 'readwrite');
        if (!store) {
          resolve();
          return;
        }
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const offlineDB = new IndexedDBManager();
