/**
 * POS APIs - Comprehensive Test Suite
 * Executes tests against ALL HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS).
 * Run with: node pos-apis/test-runner.mjs
 */

import http from "node:http";
import { posApiHttpHandler } from "./server.ts";

async function runTests() {
  console.log("=================================================");
  console.log("🧪 Starting Comprehensive POS APIs Test Suite...");
  console.log("=================================================\n");

  // Spin up temporary in-process HTTP test server
  const testServer = http.createServer(posApiHttpHandler);
  const TEST_PORT = 3999;

  await new Promise((resolve) => testServer.listen(TEST_PORT, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${TEST_PORT}/api/pos`;

  async function api(path, method = "GET", body = undefined) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
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

    // 2. GET Method (Health Check)
    const tHealth = await api("/health", "GET");
    assert(tHealth.status === 200 && tHealth.json.success === true, "GET /api/pos/health");

    // 3. GET Method (List Products)
    const tProds = await api("/products", "GET");
    assert(tProds.status === 200 && Array.isArray(tProds.json.data) && tProds.json.data.length > 0, "GET /api/pos/products (Catalog)");

    // 4. GET Method (Barcode Lookup)
    const tBarcode = await api("/products/barcode/622100101", "GET");
    assert(tBarcode.status === 200 && tBarcode.json.data.sku === "SKU-OM-ALI", "GET /api/pos/products/barcode/:barcode");

    // 5. POST Method (Cashier PIN Verification)
    const tPin = await api("/auth/pin-verify", "POST", { pin: "1234", branchId: "korba" });
    assert(tPin.status === 200 && tPin.json.data.authenticated === true, "POST /api/pos/auth/pin-verify");

    // 6. GET Method (List Branches)
    const tBranches = await api("/branches", "GET");
    assert(tBranches.status === 200 && tBranches.json.data.length >= 8, "GET /api/pos/branches");

    // 7. POST Method (Create Order / Checkout)
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
    const tCreateOrder = await api("/orders", "POST", newOrderPayload);
    assert(tCreateOrder.status === 201 && tCreateOrder.json.success === true, "POST /api/pos/orders (Create Order)");
    const createdOrderId = tCreateOrder.json.data?.id;

    // 8. GET Method (Get Order by ID)
    const tGetOrder = await api(`/orders/${createdOrderId}`, "GET");
    assert(tGetOrder.status === 200 && tGetOrder.json.data.id === createdOrderId, "GET /api/pos/orders/:id");

    // 9. PUT Method (Full Update Order)
    const tPutOrder = await api(`/orders/${createdOrderId}`, "PUT", {
      customerName: "الأستاذ كريم المصري",
      tableNumber: "T-VIP-01",
      deliveryNotes: "حساب مؤتمر خاص",
    });
    assert(tPutOrder.status === 200 && tPutOrder.json.data.customerName === "الأستاذ كريم المصري", "PUT /api/pos/orders/:id (Update Order)");

    // 10. PATCH Method (Update Order Status)
    const tPatchStatus = await api(`/orders/${createdOrderId}/status`, "PATCH", { status: "paid" });
    assert(tPatchStatus.status === 200 && tPatchStatus.json.data.status === "paid", "PATCH /api/pos/orders/:id/status (Patch Status)");

    // 11. POST Method (Park / Hold Order)
    const tPark = await api("/orders/park", "POST", newOrderPayload);
    assert(tPark.status === 201 && tPark.json.data.status === "parked", "POST /api/pos/orders/park (Park Order)");

    // 12. GET Method (List Parked Orders)
    const tGetParked = await api("/orders/parked", "GET");
    assert(tGetParked.status === 200 && tGetParked.json.data.length > 0, "GET /api/pos/orders/parked");

    // 13. POST Method (Refund Order)
    const tRefund = await api(`/orders/${createdOrderId}/refund`, "POST", {
      reason: "تغيير طلب من العميل",
      cashierId: "usr-korba",
      cashierName: "أحمد فريد",
    });
    assert(tRefund.status === 200 && tRefund.json.data.status === "refunded", "POST /api/pos/orders/:id/refund");

    // 14. DELETE Method (Delete / Void Order)
    const tDeleteOrder = await api(`/orders/${createdOrderId}`, "DELETE");
    assert(tDeleteOrder.status === 200 && tDeleteOrder.json.data.deletedId === createdOrderId, "DELETE /api/pos/orders/:id (Void Order)");

    // 15. GET Method (Current Active Shift)
    const tCurrentShift = await api("/shifts/current?branchId=korba", "GET");
    assert(tCurrentShift.status === 200 && tCurrentShift.json.data !== null, "GET /api/pos/shifts/current");

    // 16. POST Method (Cash Movement / Drop)
    const tCashDrop = await api("/shifts/cash-movement", "POST", {
      shiftId: tCurrentShift.json.data?.id || "shift-korba-today",
      type: "safe_drop",
      amount: 2000,
      reason: "توريد نقدية لخزينة الفرع الرئيسية",
    });
    assert(tCashDrop.status === 201 && tCashDrop.json.success === true, "POST /api/pos/shifts/cash-movement");

    // 17. GET Method (Shift Z-Report)
    const tZReport = await api(`/shifts/${tCurrentShift.json.data?.id || "shift-korba-today"}/z-report`, "GET");
    assert(tZReport.status === 200 && tZReport.json.data.financials.grossSales >= 0, "GET /api/pos/shifts/:id/z-report (Z-Report)");

    // 18. POST Method (Close Shift)
    const tCloseShift = await api("/shifts/close", "POST", {
      shiftId: tCurrentShift.json.data?.id,
      actualCash: 5820,
      closingNotes: "جرد مطابق لليومية",
    });
    assert(tCloseShift.status === 200 && tCloseShift.json.data.status === "closed", "POST /api/pos/shifts/close (Close Shift)");

    // 19. POST Method (Quick Register Customer)
    const tCust = await api("/customers", "POST", {
      name: "أحمد توفيق",
      phone: `0100${Math.floor(1000000 + Math.random() * 9000000)}`,
      loyaltyPoints: 100,
    });
    assert((tCust.status === 200 || tCust.status === 201) && tCust.json.data.id !== undefined, "POST /api/pos/customers (Create Customer)");

    // 20. PATCH Method (Adjust Loyalty Points)
    const tPatchCust = await api(`/customers/${tCust.json.data.id}/loyalty`, "PATCH", { pointsDelta: 25 });
    assert(tPatchCust.status === 200 && tPatchCust.json.data.loyaltyPoints === 125, "PATCH /api/pos/customers/:id/loyalty");

    // 21. POST Method (Batch Sync Offline Orders)
    const tBatchSync = await api("/sync/batch", "POST", {
      branchId: "korba",
      terminalId: "term-01",
      orders: [newOrderPayload],
    });
    assert(tBatchSync.status === 200 && tBatchSync.json.data.syncedCount === 1, "POST /api/pos/sync/batch (Batch Offline Sync)");

    console.log("\n=================================================");
    console.log(`📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log("=================================================\n");

    if (failed > 0) process.exit(1);
  } finally {
    testServer.close();
  }
}

runTests();
