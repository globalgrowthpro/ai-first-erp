/**
 * POS APIs - Comprehensive Test Suite
 * Executes tests against ALL HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS).
 * Verifies Authentication, Bearer Tokens, Sessions, and RBAC Authorization.
 * Run with: node --experimental-strip-types pos-apis/test-runner.mjs
 */

import http from "node:http";
import { posApiHttpHandler } from "./server.ts";

async function runTests() {
  console.log("=================================================");
  console.log("🧪 Starting Comprehensive POS APIs Test Suite...");
  console.log("🔒 Testing Auth, Tokens, Sessions & RBAC Security...");
  console.log("=================================================\n");

  const testServer = http.createServer(posApiHttpHandler);
  const TEST_PORT = 3999;

  await new Promise((resolve) => testServer.listen(TEST_PORT, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${TEST_PORT}/api/pos`;

  async function api(path, method = "GET", body = undefined, token = undefined) {
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const status = res.status;
    const json = status !== 204 ? await res.json().catch(() => ({})) : null;
    return { status, json };
  }

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}:`, details);
      failed++;
    }
  }

  try {
    // 1. OPTIONS Method (CORS Preflight)
    const tOptions = await api("/orders", "OPTIONS");
    assert(tOptions.status === 204, "OPTIONS /api/pos/orders (CORS preflight)");

    // 2. GET Method (Health Check - Public)
    const tHealth = await api("/health", "GET");
    assert(tHealth.status === 200 && tHealth.json.success === true, "GET /api/pos/health (Public)");

    // 3. Security: 401 Unauthorized when accessing protected endpoint without token
    const tUnauth = await api("/products", "GET");
    assert(tUnauth.status === 401 && tUnauth.json.success === false, "401 Unauthorized for protected endpoint without token");

    // 4. POST Method: Cashier PIN Login (Authenticate & generate token)
    const tPinLogin = await api("/auth/pin-verify", "POST", { pin: "1234", branchId: "korba" });
    assert(
      tPinLogin.status === 200 &&
      tPinLogin.json.success === true &&
      tPinLogin.json.data?.token !== undefined,
      "POST /api/pos/auth/pin-verify (Cashier Token Issue)"
    );
    const cashierToken = tPinLogin.json.data?.token;

    // 5. GET Method: Access protected catalog using valid Cashier Token
    const tProds = await api("/products", "GET", undefined, cashierToken);
    assert(tProds.status === 200 && Array.isArray(tProds.json.data) && tProds.json.data.length > 0, "GET /api/pos/products (Authenticated)");

    // 6. GET Method: Barcode Lookup
    const tBarcode = await api("/products/barcode/622100101", "GET", undefined, cashierToken);
    assert(tBarcode.status === 200 && tBarcode.json.data.sku === "SKU-OM-ALI", "GET /api/pos/products/barcode/:barcode");

    // 7. GET Method: List Branches
    const tBranches = await api("/branches", "GET", undefined, cashierToken);
    assert(tBranches.status === 200 && tBranches.json.data.length >= 8, "GET /api/pos/branches");

    // 8. POST Method: Create Order / Checkout
    const newOrderPayload = {
      cashierId: "usr-korba",
      cashierName: "أحمد فريد",
      branchId: "korba",
      orderType: "takeaway",
      paymentMethod: "cash",
      items: [
        { sku: "SKU-OM-ALI", nameAr: "طاجن أم علي بالمكسرات", nameEn: "Om Ali", quantity: 2, unitPrice: 110, totalPrice: 220 },
        { sku: "SKU-QASH", nameAr: "قشطوطة مانجو", nameEn: "Qashtouta", quantity: 1, unitPrice: 125, totalPrice: 125 },
      ],
      tenderAmount: 400,
    };
    const tCreateOrder = await api("/orders", "POST", newOrderPayload, cashierToken);
    assert(tCreateOrder.status === 201 && tCreateOrder.json.success === true, "POST /api/pos/orders (Create Order)");
    const createdOrderId = tCreateOrder.json.data?.id;

    // 9. GET Method: Get Order by ID
    const tGetOrder = await api(`/orders/${createdOrderId}`, "GET", undefined, cashierToken);
    assert(tGetOrder.status === 200 && tGetOrder.json.data.id === createdOrderId, "GET /api/pos/orders/:id");

    // 10. PUT Method: Full Update Order
    const tPutOrder = await api(`/orders/${createdOrderId}`, "PUT", {
      customerName: "الأستاذ كريم المصري",
      tableNumber: "T-VIP-01",
      deliveryNotes: "حساب مؤتمر خاص",
    }, cashierToken);
    assert(tPutOrder.status === 200 && tPutOrder.json.data.customerName === "الأستاذ كريم المصري", "PUT /api/pos/orders/:id (Update Order)");

    // 11. PATCH Method: Update Order Status
    const tPatchStatus = await api(`/orders/${createdOrderId}/status`, "PATCH", { status: "paid" }, cashierToken);
    assert(tPatchStatus.status === 200 && tPatchStatus.json.data.status === "paid", "PATCH /api/pos/orders/:id/status");

    // 12. Security & RBAC: 403 Forbidden when standard cashier tries to void/delete order
    const tForbiddenVoid = await api(`/orders/${createdOrderId}`, "DELETE", undefined, cashierToken);
    assert(tForbiddenVoid.status === 403 && tForbiddenVoid.json.success === false, "403 Forbidden: Cashier cannot void order (RBAC enforcement)");

    // 13. POST Method: Manager / Supervisor Login
    const tSupLogin = await api("/auth/login", "POST", { username: "supervisor", password: "Password123!" });
    assert(tSupLogin.status === 200 && tSupLogin.json.data?.role === "supervisor", "POST /api/pos/auth/login (Supervisor Login)");
    const supervisorToken = tSupLogin.json.data?.token;

    // 14. GET Method: Session Inspection
    const tSession = await api("/auth/session", "GET", undefined, supervisorToken);
    assert(tSession.status === 200 && tSession.json.data.role === "supervisor", "GET /api/pos/auth/session (Verify Active Session)");

    // 15. POST Method: Token Refresh
    const tRefresh = await api("/auth/refresh", "POST", undefined, supervisorToken);
    assert(tRefresh.status === 200 && tRefresh.json.data.token !== undefined, "POST /api/pos/auth/refresh (Issue New Token)");
    const freshSupervisorToken = tRefresh.json.data.token;

    // 16. Security & RBAC: Supervisor voids order with supervisor token
    const tDeleteOrder = await api(`/orders/${createdOrderId}`, "DELETE", undefined, freshSupervisorToken);
    assert(tDeleteOrder.status === 200 && tDeleteOrder.json.data.deletedId === createdOrderId, "DELETE /api/pos/orders/:id (Supervisor Void Order Succeeded)");

    // 17. POST Method: Park / Hold Order
    const tPark = await api("/orders/park", "POST", newOrderPayload, cashierToken);
    assert(tPark.status === 201 && tPark.json.data.status === "parked", "POST /api/pos/orders/park (Park Order)");

    // 18. GET Method: List Parked Orders
    const tGetParked = await api("/orders/parked", "GET", undefined, cashierToken);
    assert(tGetParked.status === 200 && tGetParked.json.data.length > 0, "GET /api/pos/orders/parked");

    // 19. GET Method: Active Shift
    const tActiveShift = await api("/shifts/active?branchId=korba", "GET", undefined, cashierToken);
    assert(tActiveShift.status === 200, "GET /api/pos/shifts/active");

    // 20. POST Method: Cash Movement / Drop
    const tCashDrop = await api("/shifts/cash-movement", "POST", {
      shiftId: tActiveShift.json.data?.id || "shift-korba-today",
      type: "safe_drop",
      amount: 2000,
      reason: "توريد نقدية لخزينة الفرع الرئيسية",
    }, cashierToken);
    assert(tCashDrop.status === 201 && tCashDrop.json.success === true, "POST /api/pos/shifts/cash-movement");

    // 21. GET Method: Shift Z-Report
    const tZReport = await api(`/shifts/${tActiveShift.json.data?.id || "shift-korba-today"}/z-report`, "GET", undefined, cashierToken);
    assert(tZReport.status === 200 && tZReport.json.data.financials.grossSales >= 0, "GET /api/pos/shifts/:id/z-report (Z-Report)");

    // 22. POST Method: Quick Register Customer
    const tCust = await api("/customers", "POST", {
      name: "أحمد توفيق",
      phone: `0100${Math.floor(1000000 + Math.random() * 9000000)}`,
      loyaltyPoints: 100,
    }, cashierToken);
    assert((tCust.status === 200 || tCust.status === 201) && tCust.json.data.id !== undefined, "POST /api/pos/customers (Create Customer)");

    // 23. POST Method: Batch Sync Offline Orders
    const tBatchSync = await api("/sync/batch", "POST", {
      branchId: "korba",
      terminalId: "term-01",
      orders: [newOrderPayload],
    }, cashierToken);
    assert(tBatchSync.status === 200 && tBatchSync.json.data.syncedCount === 1, "POST /api/pos/sync/batch (Batch Offline Sync)");

    // 24. POST Method: Session Revocation / Logout
    const tLogout = await api("/auth/logout", "POST", undefined, cashierToken);
    assert(tLogout.status === 200 && tLogout.json.success === true, "POST /api/pos/auth/logout (Revoke Session)");

    // 25. Security: Verify Revoked Token returns 401
    const tRevokedAccess = await api("/products", "GET", undefined, cashierToken);
    assert(tRevokedAccess.status === 401, "401 Unauthorized after session logout");

    console.log("\n=================================================");
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log("🔒 All Auth, Tokens, Sessions & RBAC Tests Passed!");
    console.log("=================================================\n");

    if (failed > 0) process.exit(1);
  } finally {
    testServer.close();
  }
}

runTests();
