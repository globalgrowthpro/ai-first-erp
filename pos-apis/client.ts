/**
 * POS APIs - TypeScript / JavaScript Client SDK
 * Easy-to-use client SDK for consuming POS APIs across browsers, Node.js, and mobile POS terminals.
 * Author: Hafez ERP Engineering
 */

import type {
  CreateOrderRequest,
  UpdateOrderRequest,
  PatchOrderStatusRequest,
  RefundOrderRequest,
  OpenShiftRequest,
  CloseShiftRequest,
  CashMovementRequest,
  BatchSyncRequest,
  PosOrderRecord,
  PosShiftRecord,
  PosProductRecord,
  PosCustomerRecord,
  ShiftZReport,
  ApiResponse,
} from "./types.ts";

export class PosApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(options: { baseUrl?: string; headers?: Record<string, string> } = {}) {
    this.baseUrl = (options.baseUrl || "http://localhost:3001/api/pos").replace(/\/+$/, "");
    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
  }

  private async request<T = any>(
    path: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS",
    body?: any,
    queryParams?: Record<string, any>
  ): Promise<ApiResponse<T>> {
    let url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    if (queryParams) {
      const sp = new URLSearchParams();
      Object.entries(queryParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
      });
      const qs = sp.toString();
      if (qs) url += `?${qs}`;
    }

    const init: RequestInit = {
      method,
      headers: { ...this.defaultHeaders },
    };

    if (body !== undefined && method !== "GET") {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);
    const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;
    return json;
  }

  // ==========================================
  // ORDERS API
  // ==========================================
  orders = {
    list: (params?: Record<string, any>) =>
      this.request<PosOrderRecord[]>("/orders", "GET", undefined, params),

    get: (idOrNumber: string) =>
      this.request<PosOrderRecord>(`/orders/${encodeURIComponent(idOrNumber)}`, "GET"),

    create: (payload: CreateOrderRequest) =>
      this.request<PosOrderRecord>("/orders", "POST", payload),

    update: (idOrNumber: string, payload: UpdateOrderRequest) =>
      this.request<PosOrderRecord>(`/orders/${encodeURIComponent(idOrNumber)}`, "PUT", payload),

    patchStatus: (idOrNumber: string, payload: PatchOrderStatusRequest) =>
      this.request<PosOrderRecord>(`/orders/${encodeURIComponent(idOrNumber)}/status`, "PATCH", payload),

    delete: (idOrNumber: string) =>
      this.request<{ deletedId: string }>(`/orders/${encodeURIComponent(idOrNumber)}`, "DELETE"),

    park: (payload: CreateOrderRequest) =>
      this.request<PosOrderRecord>("/orders/park", "POST", payload),

    getParked: (params?: Record<string, any>) =>
      this.request<PosOrderRecord[]>("/orders/parked", "GET", undefined, params),

    refund: (idOrNumber: string, payload: RefundOrderRequest) =>
      this.request<PosOrderRecord>(`/orders/${encodeURIComponent(idOrNumber)}/refund`, "POST", payload),
  };

  // ==========================================
  // SHIFTS API
  // ==========================================
  shifts = {
    list: (params?: Record<string, any>) =>
      this.request<PosShiftRecord[]>("/shifts", "GET", undefined, params),

    current: (params?: Record<string, any>) =>
      this.request<PosShiftRecord | null>("/shifts/current", "GET", undefined, params),

    open: (payload: OpenShiftRequest) =>
      this.request<PosShiftRecord>("/shifts/open", "POST", payload),

    close: (payload: CloseShiftRequest & { shiftId?: string }) =>
      this.request<PosShiftRecord>("/shifts/close", "POST", payload),

    cashMovement: (payload: CashMovementRequest) =>
      this.request<any>("/shifts/cash-movement", "POST", payload),

    zReport: (shiftIdOrNumber: string) =>
      this.request<ShiftZReport>(`/shifts/${encodeURIComponent(shiftIdOrNumber)}/z-report`, "GET"),

    update: (id: string, payload: Partial<PosShiftRecord>) =>
      this.request<PosShiftRecord>(`/shifts/${encodeURIComponent(id)}`, "PUT", payload),

    delete: (id: string) =>
      this.request<{ deletedId: string }>(`/shifts/${encodeURIComponent(id)}`, "DELETE"),
  };

  // ==========================================
  // PRODUCTS & CATALOG API
  // ==========================================
  products = {
    list: (params?: Record<string, any>) =>
      this.request<PosProductRecord[]>("/products", "GET", undefined, params),

    byBarcode: (barcode: string) =>
      this.request<PosProductRecord>(`/products/barcode/${encodeURIComponent(barcode)}`, "GET"),

    categories: () =>
      this.request<any[]>("/categories", "GET"),

    adjustStock: (id: string, payload: { deltaQty: number; reason?: string }) =>
      this.request<PosProductRecord>(`/products/${encodeURIComponent(id)}/stock`, "PATCH", payload),

    create: (payload: Partial<PosProductRecord>) =>
      this.request<PosProductRecord>("/products", "POST", payload),

    update: (id: string, payload: Partial<PosProductRecord>) =>
      this.request<PosProductRecord>(`/products/${encodeURIComponent(id)}`, "PUT", payload),

    delete: (id: string) =>
      this.request<{ deletedId: string }>(`/products/${encodeURIComponent(id)}`, "DELETE"),
  };

  // ==========================================
  // CUSTOMERS API
  // ==========================================
  customers = {
    list: (params?: Record<string, any>) =>
      this.request<PosCustomerRecord[]>("/customers", "GET", undefined, params),

    get: (idOrPhone: string) =>
      this.request<PosCustomerRecord>(`/customers/${encodeURIComponent(idOrPhone)}`, "GET"),

    create: (payload: Partial<PosCustomerRecord>) =>
      this.request<PosCustomerRecord>("/customers", "POST", payload),

    update: (id: string, payload: Partial<PosCustomerRecord>) =>
      this.request<PosCustomerRecord>(`/customers/${encodeURIComponent(id)}`, "PUT", payload),

    patchLoyalty: (id: string, payload: { pointsDelta: number; reason?: string }) =>
      this.request<PosCustomerRecord>(`/customers/${encodeURIComponent(id)}/loyalty`, "PATCH", payload),

    delete: (id: string) =>
      this.request<{ deletedId: string }>(`/customers/${encodeURIComponent(id)}`, "DELETE"),
  };

  // ==========================================
  // BRANCHES & AUTH API
  // ==========================================
  branches = {
    list: () =>
      this.request<any[]>("/branches", "GET"),

    get: (id: string) =>
      this.request<any>(`/branches/${encodeURIComponent(id)}`, "GET"),

    verifyPin: (payload: { pin: string; branchId?: string }) =>
      this.request<any>("/auth/pin-verify", "POST", payload),

    terminals: (params?: Record<string, any>) =>
      this.request<any[]>("/terminals", "GET", undefined, params),
  };

  // ==========================================
  // SYNC & HEALTH API
  // ==========================================
  sync = {
    batch: (payload: BatchSyncRequest) =>
      this.request<any>("/sync/batch", "POST", payload),

    health: () =>
      this.request<any>("/sync/health", "GET"),
  };
}

export const posApiClient = new PosApiClient();
