/**
 * POS API Unified Router
 * Matches incoming HTTP paths and methods, invoking the appropriate controller action.
 * Enforces Cryptographic Bearer Token authentication and RBAC authorization.
 * Supports: GET, POST, PUT, PATCH, DELETE, OPTIONS
 * Author: Hafez ERP Engineering
 */

import { OrdersController } from "../controllers/orders.controller.ts";
import { ShiftsController } from "../controllers/shifts.controller.ts";
import { ProductsController } from "../controllers/products.controller.ts";
import { CustomersController } from "../controllers/customers.controller.ts";
import { BranchesController } from "../controllers/branches.controller.ts";
import { SyncController } from "../controllers/sync.controller.ts";
import { AuthController } from "../controllers/auth.controller.ts";
import { posSecurity, type PosSession } from "../security.ts";
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
  const q = req.query || {};
  const b = req.body || {};
  const headers = req.headers || {};

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

  // 2. Health & Diagnostics (Public)
  if (path === "/health" || path === "" || path === "/sync/health") {
    if (method === "GET") {
      const res = await SyncController.health();
      return { status: 200, body: res };
    }
  }

  // 3. Authentication Routes (Public Login Endpoints)
  if (path === "/auth/pin-verify" || path === "/auth/pin") {
    if (method === "POST") {
      const res = await AuthController.pinLogin(b);
      return { status: res.success ? 200 : 401, body: res };
    }
  }

  if (path === "/auth/login") {
    if (method === "POST") {
      const res = await AuthController.passwordLogin(b);
      return { status: res.success ? 200 : 401, body: res };
    }
  }

  // Extract Authorization Header (supports Authorization or authorization)
  const authHeader = headers["authorization"] || headers["Authorization"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  // Verify Session for Protected Endpoints
  let currentSession: PosSession | null = null;
  if (token) {
    currentSession = posSecurity.getSession(token);
  }

  // Authentication Guard for Protected Endpoints
  // Endpoints that require a valid session token
  const isPublic = path === "/health" || path === "/sync/health" || path === "/auth/pin-verify" || path === "/auth/pin" || path === "/auth/login";

  if (!isPublic && !currentSession) {
    return {
      status: 401,
      body: {
        success: false,
        error: "Unauthorized: Missing, expired, or invalid Bearer authentication token",
        meta: {
          timestamp: new Date().toISOString(),
          hint: "Authenticate via POST /api/pos/auth/pin-verify or POST /api/pos/auth/login and include 'Authorization: Bearer <token>'",
        },
      },
    };
  }

  // 4. Authenticated Auth & Session Management Routes
  if (path === "/auth/session") {
    if (method === "GET") {
      const res = await AuthController.getSession(authHeader);
      return { status: res.success ? 200 : 401, body: res };
    }
  }

  if (path === "/auth/refresh") {
    if (method === "POST") {
      const res = await AuthController.refresh(authHeader);
      return { status: res.success ? 200 : 401, body: res };
    }
  }

  if (path === "/auth/logout") {
    if (method === "POST") {
      const res = await AuthController.logout(authHeader);
      return { status: 200, body: res };
    }
  }

  if (path === "/auth/permissions") {
    if (method === "GET") {
      const res = await AuthController.getPermissions(authHeader);
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
      // Role Authorization Check: Voiding an order requires supervisor or admin
      if (currentSession && !posSecurity.hasPermission(currentSession, "orders:void")) {
        return {
          status: 403,
          body: {
            success: false,
            error: "Forbidden: Supervisor or Administrator privilege required to void/delete orders",
            meta: { requiredPermission: "orders:void", currentRole: currentSession.role },
          },
        };
      }
      const res = await OrdersController.deleteOrder(id);
      return { status: res.success ? 200 : 404, body: res };
    }
  }

  // PATCH /orders/:id/status
  const statusMatch = path.match(/^\/orders\/([^/]+)\/status$/);
  if (statusMatch && method === "PATCH") {
    const id = decodeURIComponent(statusMatch[1]);
    const res = await OrdersController.patchOrderStatus(id, b);
    return { status: res.success ? 200 : 400, body: res };
  }

  // POST /orders/:id/refund
  const refundMatch = path.match(/^\/orders\/([^/]+)\/refund$/);
  if (refundMatch && method === "POST") {
    const id = decodeURIComponent(refundMatch[1]);
    // Role Authorization Check: Refund requires refund permission
    if (currentSession && !posSecurity.hasPermission(currentSession, "orders:refund")) {
      return {
        status: 403,
        body: {
          success: false,
          error: "Forbidden: Refund authorization required (Senior Cashier, Supervisor or Admin)",
          meta: { requiredPermission: "orders:refund", currentRole: currentSession.role },
        },
      };
    }
    const res = await OrdersController.refundOrder(id, b);
    return { status: res.success ? 200 : 400, body: res };
  }

  // POST /orders/:id/pay
  const payMatch = path.match(/^\/orders\/([^/]+)\/pay$/);
  if (payMatch && method === "POST") {
    const id = decodeURIComponent(payMatch[1]);
    const res = await OrdersController.updateOrder(id, { paymentMethod: b.paymentMethod || "cash" } as any);
    return { status: res.success ? 200 : 400, body: res };
  }

  // ==========================================
  // SHIFTS ENDPOINTS
  // ==========================================

  // GET /shifts (list shifts)
  if (path === "/shifts") {
    if (method === "GET") {
      const res = await ShiftsController.listShifts(q);
      return { status: 200, body: res };
    }
  }

  // GET /shifts/current or /shifts/active (get currently open shift for cashier/branch)
  if (path === "/shifts/current" || path === "/shifts/active") {
    if (method === "GET") {
      const res = await ShiftsController.getCurrentShift(q);
      return { status: 200, body: res };
    }
  }

  // POST /shifts/open
  if (path === "/shifts/open") {
    if (method === "POST") {
      const payload = {
        cashierId: b.cashierId || currentSession?.cashierId,
        cashierName: b.cashierName || currentSession?.cashierName,
        branchId: b.branchId || currentSession?.branchId,
        terminalId: b.terminalId || currentSession?.terminalId,
        ...b,
      };
      const res = await ShiftsController.openShift(payload);
      return { status: res.success ? 201 : 400, body: res };
    }
  }

  // POST /shifts/close
  if (path === "/shifts/close") {
    if (method === "POST") {
      const shiftId = b.shiftId || "shift-korba-today";
      const res = await ShiftsController.closeShift(shiftId, b);
      return { status: res.success ? 200 : 400, body: res };
    }
  }

  // POST /shifts/cash-movement (drop or add)
  if (path === "/shifts/cash-movement") {
    if (method === "POST") {
      const res = await ShiftsController.recordCashMovement(b);
      return { status: res.success ? 201 : 400, body: res };
    }
  }

  // GET /shifts/:id/z-report
  const zReportMatch = path.match(/^\/shifts\/([^/]+)\/z-report$/);
  if (zReportMatch && method === "GET") {
    const shiftId = decodeURIComponent(zReportMatch[1]);
    const res = await ShiftsController.getShiftZReport(shiftId);
    return { status: res.success ? 200 : 404, body: res };
  }

  // GET /shifts/:id
  const shiftIdMatch = path.match(/^\/shifts\/([^/]+)$/);
  if (shiftIdMatch && method === "GET") {
    const shiftId = decodeURIComponent(shiftIdMatch[1]);
    const res = await ShiftsController.listShifts({ id: shiftId });
    return { status: res.success ? 200 : 404, body: res };
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

  if (path === "/products/categories") {
    if (method === "GET") {
      const res = await ProductsController.listCategories();
      return { status: 200, body: res };
    }
  }

  // GET /products/barcode/:code
  const barcodeMatch = path.match(/^\/products\/barcode\/([^/]+)$/);
  if (barcodeMatch && method === "GET") {
    const code = decodeURIComponent(barcodeMatch[1]);
    const res = await ProductsController.getProductByBarcode(code);
    return { status: res.success ? 200 : 404, body: res };
  }

  // Products by ID: GET /products/:id, PUT /products/:id, DELETE /products/:id
  const prodMatch = path.match(/^\/products\/([^/]+)$/);
  if (prodMatch) {
    const id = decodeURIComponent(prodMatch[1]);
    if (method === "GET") {
      const res = await ProductsController.getProductById(id);
      return { status: res.success ? 200 : 404, body: res };
    }
    if (method === "PUT") {
      const res = await ProductsController.updateProduct(id, b);
      return { status: res.success ? 200 : 400, body: res };
    }
    if (method === "DELETE") {
      const res = await ProductsController.deleteProduct(id);
      return { status: res.success ? 200 : 404, body: res };
    }
  }

  // PATCH /products/:id/stock
  const stockMatch = path.match(/^\/products\/([^/]+)\/stock$/);
  if (stockMatch && method === "PATCH") {
    const id = decodeURIComponent(stockMatch[1]);
    const res = await ProductsController.adjustStock(id, b);
    return { status: res.success ? 200 : 400, body: res };
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

  const custPhoneMatch = path.match(/^\/customers\/phone\/([^/]+)$/);
  if (custPhoneMatch && method === "GET") {
    const phone = decodeURIComponent(custPhoneMatch[1]);
    const res = await CustomersController.getCustomerByPhone(phone);
    return { status: res.success ? 200 : 404, body: res };
  }

  const custMatch = path.match(/^\/customers\/([^/]+)$/);
  if (custMatch) {
    const id = decodeURIComponent(custMatch[1]);
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

  const loyaltyMatch = path.match(/^\/customers\/([^/]+)\/loyalty$/);
  if (loyaltyMatch && (method === "POST" || method === "PATCH")) {
    const id = decodeURIComponent(loyaltyMatch[1]);
    const res = await CustomersController.patchLoyalty(id, b);
    return { status: res.success ? 200 : 400, body: res };
  }

  // ==========================================
  // BRANCHES & CONFIGURATION ENDPOINTS
  // ==========================================

  if (path === "/branches") {
    if (method === "GET") {
      const res = await BranchesController.listBranches();
      return { status: 200, body: res };
    }
  }

  const branchMatch = path.match(/^\/branches\/([^/]+)$/);
  if (branchMatch && method === "GET") {
    const id = decodeURIComponent(branchMatch[1]);
    const res = await BranchesController.getBranchById(id);
    return { status: res.success ? 200 : 404, body: res };
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
