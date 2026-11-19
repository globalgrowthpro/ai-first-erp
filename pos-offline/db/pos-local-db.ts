/**
 * Hafez ERP — POS Offline Local Database (IndexedDB Native Engine)
 * No external dependencies required (zero-bloat, 100% native browser IndexedDB).
 *
 * Stores:
 * 1. pending_orders  - Outbox queue for offline transactions awaiting server synchronization
 * 2. products_cache  - Fast in-browser product catalog with stock, barcode, and pricing
 * 3. categories_cache- Product categories with Arabic labels
 * 4. active_shifts   - Cashier shift state, opening balance, and live financial totals
 * 5. cashiers_auth   - Encrypted SHA-256 PIN credentials and roles for offline login
 * 6. sync_audit_log  - Telemetry and history of all sync attempts and server replies
 * 7. terminal_config - Device settings (Branch ID, Terminal ID, Printer name, Receipt prefix)
 */

export interface OfflineOrderRecord {
  id: string; // Format: {branchId}-{terminalId}-{timestamp}-{random}
  orderNumber: string; // e.g. INV-KB-1051
  branchId: string;
  branchNameAr: string;
  terminalId: string;
  cashierId: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  orderType: "takeaway" | "dine_in" | "delivery";
  tableNumber?: string;
  items: Array<{
    sku: string;
    nameAr: string;
    nameEn?: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    notes?: string;
  }>;
  subtotal: number;
  vatAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: "cash" | "card" | "wallet" | "split";
  tenderAmount: number;
  changeAmount: number;
  status: "completed" | "parked" | "cancelled";
  createdOffline: boolean;
  createdAt: string; // ISO 8601
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  syncAttempts: number;
  lastSyncAttempt?: string;
  syncError?: string;
  serverId?: string;
  checksum: string;
}

export interface OfflineProductRecord {
  sku: string;
  barcode?: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  categoryNameAr?: string;
  price: number;
  costPrice?: number;
  stock: number;
  unit: string;
  image?: string;
  badge?: string;
  isAvailable: boolean;
  updatedAt: string;
}

export interface OfflineCategoryRecord {
  id: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
}

export interface OfflineShiftRecord {
  shiftId: string; // e.g. SHIFT-KB-20261119-01
  branchId: string;
  terminalId: string;
  cashierId: string;
  cashierName: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCashActual?: number;
  closingCashCalculated?: number;
  cashDifference?: number;
  totalSales: number;
  cashSales: number;
  cardSales: number;
  orderCount: number;
  syncStatus: "pending" | "synced";
}

export interface OfflineCashierAuth {
  cashierId: string;
  branchId: string;
  nameAr: string;
  pinHash: string; // SHA-256
  role: "pos_cashier" | "pos_supervisor" | "branch_manager";
  permissions: string[];
  expiresAt: string;
}

export interface SyncAuditRecord {
  id?: number;
  timestamp: string;
  entityType: "order" | "shift" | "catalog_pull";
  entityId: string;
  action: "enqueue" | "sync_attempt" | "synced" | "conflict_resolved" | "failed";
  statusCode?: number;
  message: string;
  payload?: any;
}

export interface TerminalConfigRecord {
  key: string;
  value: any;
  updatedAt: string;
}

const DB_NAME = "HafezPOS_LocalDB";
const DB_VERSION = 1;

class PosLocalDatabase {
  private db: IDBDatabase | null = null;
  private isInitializing: Promise<IDBDatabase> | null = null;

  /**
   * Initialize and upgrade IndexedDB database schema
   */
  public async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.isInitializing) return this.isInitializing;

    this.isInitializing = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        reject(new Error("IndexedDB is not supported in this runtime environment."));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Pending Orders Outbox Store
        if (!db.objectStoreNames.contains("pending_orders")) {
          const orderStore = db.createObjectStore("pending_orders", { keyPath: "id" });
          orderStore.createIndex("branchId", "branchId", { unique: false });
          orderStore.createIndex("syncStatus", "syncStatus", { unique: false });
          orderStore.createIndex("createdAt", "createdAt", { unique: false });
          orderStore.createIndex("orderNumber", "orderNumber", { unique: false });
        }

        // 2. Products Catalog Store
        if (!db.objectStoreNames.contains("products_cache")) {
          const prodStore = db.createObjectStore("products_cache", { keyPath: "sku" });
          prodStore.createIndex("categoryId", "categoryId", { unique: false });
          prodStore.createIndex("barcode", "barcode", { unique: false });
          prodStore.createIndex("nameAr", "nameAr", { unique: false });
        }

        // 3. Categories Store
        if (!db.objectStoreNames.contains("categories_cache")) {
          db.createObjectStore("categories_cache", { keyPath: "id" });
        }

        // 4. Active Shifts Store
        if (!db.objectStoreNames.contains("active_shifts")) {
          const shiftStore = db.createObjectStore("active_shifts", { keyPath: "shiftId" });
          shiftStore.createIndex("branchId", "branchId", { unique: false });
          shiftStore.createIndex("status", "status", { unique: false });
        }

        // 5. Cashier Offline Auth Store
        if (!db.objectStoreNames.contains("cashiers_auth")) {
          const cashierStore = db.createObjectStore("cashiers_auth", { keyPath: "cashierId" });
          cashierStore.createIndex("branchId", "branchId", { unique: false });
          cashierStore.createIndex("pinHash", "pinHash", { unique: false });
        }

        // 6. Sync Telemetry & Audit Log Store
        if (!db.objectStoreNames.contains("sync_audit_log")) {
          const auditStore = db.createObjectStore("sync_audit_log", { keyPath: "id", autoIncrement: true });
          auditStore.createIndex("entityId", "entityId", { unique: false });
          auditStore.createIndex("timestamp", "timestamp", { unique: false });
          auditStore.createIndex("action", "action", { unique: false });
        }

        // 7. Terminal Hardware & Identification Store
        if (!db.objectStoreNames.contains("terminal_config")) {
          db.createObjectStore("terminal_config", { keyPath: "key" });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        this.isInitializing = null;
        resolve(this.db);
      };

      request.onerror = (event) => {
        this.isInitializing = null;
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.isInitializing;
  }

  /**
   * Request persistent storage from browser so local IndexedDB is never wiped by OS
   */
  public async ensurePersistentStorage(): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist();
        return isPersisted;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Estimate local storage usage and quota
   */
  public async getStorageEstimate(): Promise<{ usageMb: number; quotaMb: number; percent: number }> {
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMb = Math.round((estimate.usage || 0) / (1024 * 1024) * 100) / 100;
        const quotaMb = Math.round((estimate.quota || 0) / (1024 * 1024) * 100) / 100;
        const percent = quotaMb > 0 ? Math.round((usageMb / quotaMb) * 1000) / 10 : 0;
        return { usageMb, quotaMb, percent };
      } catch {
        return { usageMb: 0, quotaMb: 0, percent: 0 };
      }
    }
    return { usageMb: 0, quotaMb: 0, percent: 0 };
  }

  // ==========================================================================
  // Generic Transaction Wrappers
  // ==========================================================================

  public async put<T>(storeName: string, item: T): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async putBulk<T>(storeName: string, items: T[]): Promise<void> {
    if (!items.length) return;
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? (req.result as T) : null);
      req.onerror = () => reject(req.error);
    });
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async getAllByIndex<T>(storeName: string, indexName: string, query: IDBValidKey | IDBKeyRange): Promise<T[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const req = index.getAll(query);
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  public async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async count(storeName: string, indexName?: string, query?: IDBValidKey | IDBKeyRange): Promise<number> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const target = indexName ? store.index(indexName) : store;
      const req = query !== undefined ? target.count(query) : target.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  }

  public async clearStore(storeName: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

// Singleton database instance
export const posLocalDb = new PosLocalDatabase();
