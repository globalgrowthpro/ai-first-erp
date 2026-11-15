/**
 * POS API Unified Router
 * Matches incoming HTTP paths and methods, invoking the appropriate controller action.
 * Supports: GET, POST, PUT, PATCH, DELETE, OPTIONS
 * Author: Hafez ERP Engineering
 */

import { OrdersController } from "../controllers/orders.controller.ts";
import { ShiftsController } from "../controllers/shifts.controller.ts";
import { ProductsController } from "../controllers/products.controller.ts";
import { CustomersController } from "../controllers/customers.controller.ts";
import { BranchesController } from "../controllers/branches.controller.ts";
import { SyncController } from "../controllers/sync.controller.ts";
import type { ApiResponse } from "../types.ts";

export interface ApiRequest {
  method: string;
  url: string;
  pathname: string;
  query: Record<string, string>;
  body: any;
  headers: Record<string, string>;
}

export async function handlePosApiRequest(req: ApiRequest): Promise<{ status: number; body: ApiResponse }> {
  const method = req.method.toUpperCase();
  const rawPath = req.pathname.replace(/\/+$/, ""); // strip trailing slash
  const q = req.query;
  const b = req.body || {};

  // Standard API base prefix support: both /api/pos/... and /pos/...
  const path = rawPath.startsWith("/api/pos")
    ? rawPath.replace("/api/pos", "")
    : (rawPath.startsWith("/pos") ? rawPath.replace("/pos", "") : rawPath);

  // 1. CORS Preflight
  if (method === "OPTIONS") {
    return {
      status: 204,
      body: { success: true, message: "CORS preflight OK" },
    };
  }

  // 2. Health & Diagnostics
  if (path === "/health" || path === "" || path === "/sync/health") {
    if (method === "GET") {
      const res = await SyncController.health();
      return { status: 200, body: res };
    }
  }

  // ==========================================
  // ORDERS ENDPOINTS
  // ==========================================

  // GET /orders (list)
  // POST /orders (create)
  if (path === "/orders") {
    if (method === "GET") {
      const res = await OrdersController.listOrders(q);
      return { status: 200, body: res };
    }
    if (method === "POST") {
      const res = await OrdersController.createOrder(b);
      return { status: res.success ? 201 : 400, body: res };
    }
  }

  // POST /orders/park (park order)
  // GET /orders/parked (list parked orders)
  if (path === "/orders/park") {
    if (method === "POST") {
      const res = await OrdersController.parkOrder(b);
      return { status: res.success ? 201 : 400, body: res };
    }
  }
  if (path === "/orders/parked") {
    if (method === "GET") {
      const res = await OrdersController.getParkedOrders(q);
      return { status: 200, body: res };
    }
  }

  // Orders Parametric Routes: /orders/:id...
  const orderMatch = path.match(/^\/orders\/([^/]+)$/);
  if (orderMatch) {
    const id = decodeURIComponent(orderMatch[1]);
    if (method === "GET") {
      const res = await OrdersController.getOrderById(id);
      return { status: res.success ? 200 : 404, body: res };
    }
    if (method === "PUT") {
      const res = await OrdersController.updateOrder(id, b);
      return { status: res.success ? 200 : 400, body: res };
    }
    if (method === "DELETE") {
      const res = await OrdersController.deleteOrder(id);
      return { status: res.success ? 200 : 404, body: res };
    }
  }

  // PATCH /orders/:id/status
  const orderStatusMatch = path.match(/^\/orders\/([^/]+)\/status$/);
  if (orderStatusMatch) {
    const id = decodeURIComponent(orderStatusMatch[1]);
    if (method === "PATCH") {
      const res = await OrdersController.patchOrderStatus(id, b);
      return { status: res.success ? 200 : 400, body: res };
    }
  }

  // POST /orders/:id/refund
  const orderRefundMatch = path.match(/^\/orders\/([^/]+)\/refund$/);
  if (orderRefundMatch) {
    const id = decodeURIComponent(orderRefundMatch[1]);
    if (method === "POST") {
      const res = await OrdersController.refundOrder(id, b);
      return { status: res.success ? 200 : 400, body: res };
    }
  }

  // ==========================================
  // SHIFTS ENDPOINTS
  // ==========================================

  // GET /shifts
  if (path === "/shifts") {
    if (method === "GET") {
      const res = await ShiftsController.listShifts(q);
      return { status: 200, body: res };
    }
  }

  // GET /shifts/current
  if (path === "/shifts/current") {
    if (method === "GET") {
      const res = await ShiftsController.getCurrentShift(q);
      return { status: 200, body: res };
    }
  }

  // POST /shifts/open
  if (path === "/shifts/open") {
    if (method === "POST") {
      const res = await ShiftsController.openShift(b);
      return { status: res.success ? 201 : 400, body: res };
    }
  }

  // POST /shifts/close
  if (path === "/shifts/close") {
    if (method === "POST") {
      const res = await ShiftsController.closeShift(b.shiftId || b.id || "", b);
      return { status: res.success ? 200 : 400, body: res };
    }
  }

  // POST /shifts/cash-movement
  if (path === "/shifts/cash-movement") {
    if (method === "POST") {
      const res = await ShiftsController.recordCashMovement(b);
      return { status: res.success ? 201 : 400, body: res };
    }
  }

  // Parametric shift routes: /shifts/:id...
  const shiftZMatch = path.match(/^\/shifts\/([^/]+)\/z-report$/);
  if (shiftZMatch) {
    const id = decodeURIComponent(shiftZMatch[1]);
    if (method === "GET") {
      const res = await ShiftsController.getShiftZReport(id);
      return { status: res.success ? 200 : 404, body: res };
    }
  }

  const shiftMatch = path.match(/^\/shifts\/([^/]+)$/);
  if (shiftMatch) {
    const id = decodeURIComponent(shiftMatch[1]);
    if (method === "PUT") {
      const res = await ShiftsController.updateShift(id, b);
      return { status: res.success ? 200 : 400, body: res };
    }
    if (method === "DELETE") {
      const res = await ShiftsController.deleteShift(id);
      return { status: res.success ? 200 : 404, body: res };
    }
  }

  // ==========================================
  // PRODUCTS & CATALOG ENDPOINTS
  // ==========================================

  if (path === "/products") {
    if (method === "GET") {
      const res = await ProductsController.listProducts(q);
      return { status: 200, body: res };
    }
    if (method === "POST") {
      const res = await ProductsController.createProduct(b);
      return { status: res.success ? 201 : 400, body: res };
    }
  }

  if (path === "/categories") {
    if (method === "GET") {
      const res = await ProductsController.listCategories();
      return { status: 200, body: res };
    }
  }

  const barcodeMatch = path.match(/^\/products\/barcode\/([^/]+)$/);
  if (barcodeMatch) {
    const barcode = decodeURIComponent(barcodeMatch[1]);
    if (method === "GET") {
      const res = await ProductsController.getProductByBarcode(barcode);
      return { status: res.success ? 200 : 404, body: res };
    }
  }

  const productStockMatch = path.match(/^\/products\/([^/]+)\/stock$/);
  if (productStockMatch) {
    const id = decodeURIComponent(productStockMatch[1]);
    if (method === "PATCH") {
      const res = await ProductsController.adjustStock(id, b);
      return { status: res.success ? 200 : 400, body: res };
    }
  }

  const productMatch = path.match(/^\/products\/([^/]+)$/);
  if (productMatch) {
    const id = decodeURIComponent(productMatch[1]);
    if (method === "PUT") {
      const res = await ProductsController.updateProduct(id, b);
      return { status: res.success ? 200 : 400, body: res };
    }
    if (method === "DELETE") {
      const res = await ProductsController.deleteProduct(id);
      return { status: res.success ? 200 : 404, body: res };
    }
  }

  // ==========================================
  // CUSTOMERS & LOYALTY ENDPOINTS
  // ==========================================

  if (path === "/customers") {
    if (method === "GET") {
      const res = await CustomersController.listCustomers(q);
      return { status: 200, body: res };
    }
    if (method === "POST") {
      const res = await CustomersController.createCustomer(b);
      return { status: res.success ? 201 : 400, body: res };
    }
  }

  const customerLoyaltyMatch = path.match(/^\/customers\/([^/]+)\/loyalty$/);
  if (customerLoyaltyMatch) {
    const id = decodeURIComponent(customerLoyaltyMatch[1]);
    if (method === "PATCH") {
      const res = await CustomersController.patchLoyalty(id, b);
      return { status: res.success ? 200 : 400, body: res };
    }
  }

  const customerMatch = path.match(/^\/customers\/([^/]+)$/);
  if (customerMatch) {
    const id = decodeURIComponent(customerMatch[1]);
    if (method === "GET") {
      const res = await CustomersController.getCustomerById(id);
      return { status: res.success ? 200 : 404, body: res };
    }
    if (method === "PUT") {
      const res = await CustomersController.updateCustomer(id, b);
      return { status: res.success ? 200 : 400, body: res };
    }
    if (method === "DELETE") {
      const res = await CustomersController.deleteCustomer(id);
      return { status: res.success ? 200 : 404, body: res };
    }
  }

  // ==========================================
  // BRANCHES & AUTH ENDPOINTS
  // ==========================================

  if (path === "/branches") {
    if (method === "GET") {
      const res = await BranchesController.listBranches();
      return { status: 200, body: res };
    }
  }

  const branchMatch = path.match(/^\/branches\/([^/]+)$/);
  if (branchMatch) {
    const id = decodeURIComponent(branchMatch[1]);
    if (method === "GET") {
      const res = await BranchesController.getBranchById(id);
      return { status: res.success ? 200 : 404, body: res };
    }
  }

  if (path === "/auth/pin-verify" || path === "/auth/pin") {
    if (method === "POST") {
      const res = await BranchesController.verifyPin(b);
      return { status: res.success ? 200 : 401, body: res };
    }
  }

  if (path === "/terminals") {
    if (method === "GET") {
      const res = await BranchesController.listTerminals(q);
      return { status: 200, body: res };
    }
  }

  // ==========================================
  // OFFLINE BATCH SYNC ENDPOINTS
  // ==========================================

  if (path === "/sync/batch") {
    if (method === "POST") {
      const res = await SyncController.batchSync(b);
      return { status: res.success ? 200 : 207, body: res };
    }
  }

  // 404 Not Found
  return {
    status: 404,
    body: {
      success: false,
      error: `Endpoint not found: [${method}] ${req.pathname}`,
      meta: { timestamp: new Date().toISOString() },
    },
  };
}
