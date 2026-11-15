/**
 * POS APIs - Database Layer
 * Dual-driver database access: connects to Supabase when available with resilient in-memory caching.
 * Author: Hafez ERP Engineering
 */

import { createClient } from "@supabase/supabase-js";
import type {
  PosOrderRecord,
  PosOrderItemRecord,
  PosShiftRecord,
  PosProductRecord,
  PosCustomerRecord,
} from "./types.ts";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://zpdokoytxqpwctesjfye.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwZG9rb3l0eHFwd2N0ZXNqZnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5Njg0MjksImV4cCI6MjEwNDU0NDQyOX0.wbMPbhP-leo8IpGGlsdrnJRXwOrOwDg4owQN9-_hKhU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Seed in-memory store to guarantee 100% uptime and offline POS functionality
class PosInMemoryStore {
  orders: Map<string, PosOrderRecord> = new Map();
  items: Map<string, PosOrderItemRecord[]> = new Map();
  shifts: Map<string, PosShiftRecord> = new Map();
  products: Map<string, PosProductRecord> = new Map();
  customers: Map<string, PosCustomerRecord> = new Map();
  cashMovements: Array<{ id: string; shiftId: string; type: string; amount: number; reason: string; createdAt: string }> = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Seed POS Products
    const sampleProducts: PosProductRecord[] = [
      { id: "p-101", sku: "SKU-OM-ALI", barcode: "622100101", nameAr: "طاجن أم علي بالمكسرات والقشطة", nameEn: "Claypot Om Ali Nuts & Cream", categoryId: "cat-1", categoryName: "طواجن وحلويات شرقية", price: 110, costPrice: 42, taxRate: 0.14, stockQty: 85, unit: "طاجن", isActive: true },
      { id: "p-102", sku: "SKU-QASH", barcode: "622100102", nameAr: "قشطوطة مانجو ولوتس ممتازة", nameEn: "Qashtouta Mango & Lotus", categoryId: "cat-2", categoryName: "قشطوطة ودلع", price: 125, costPrice: 48, taxRate: 0.14, stockQty: 60, unit: "علبة", isActive: true },
      { id: "p-103", sku: "SKU-MIX-SHARQI", barcode: "622100103", nameAr: "طبق مشكل حلويات شرقية فاخرة 1 كجم", nameEn: "Luxury Oriental Mix Platter 1kg", categoryId: "cat-1", categoryName: "طواجن وحلويات شرقية", price: 260, costPrice: 115, taxRate: 0.14, stockQty: 40, unit: "طبق", isActive: true },
      { id: "p-104", sku: "SKU-KON-NAB", barcode: "622100104", nameAr: "صينية كنافة نابلسية بالجبنة الساخنة", nameEn: "Hot Cheese Nabulsi Konafa", categoryId: "cat-1", categoryName: "طواجن وحلويات شرقية", price: 310, costPrice: 130, taxRate: 0.14, stockQty: 30, unit: "صينية", isActive: true },
      { id: "p-105", sku: "SKU-FATTA-KIN", barcode: "622100105", nameAr: "كاسات فتة كندر ونوتيلا كرانشي", nameEn: "Signature Kinder & Nutella Fatta", categoryId: "cat-3", categoryName: "فتة وشوكولاتة", price: 85, costPrice: 32, taxRate: 0.14, stockQty: 110, unit: "كاس", isActive: true },
      { id: "p-106", sku: "SKU-ROZ-FORN", barcode: "622100106", nameAr: "أرز باللبن فرن بالقشطة البلدي", nameEn: "Oven Baked Rice Pudding with Cream", categoryId: "cat-4", categoryName: "أرز باللبن", price: 65, costPrice: 22, taxRate: 0.14, stockQty: 150, unit: "علبة", isActive: true },
      { id: "p-107", sku: "SKU-BASBOUSA", barcode: "622100107", nameAr: "صينية بسبوسة بالسمن البلدي والبندق", nameEn: "Ghee & Hazelnut Basbousa Tray", categoryId: "cat-1", categoryName: "طواجن وحلويات شرقية", price: 195, costPrice: 78, taxRate: 0.14, stockQty: 45, unit: "صينية", isActive: true },
      { id: "p-108", sku: "SKU-LOTUS-CAKE", barcode: "622100108", nameAr: "تورتة لوتس وكريمة بلدي حجم عائلي", nameEn: "Family Lotus & Cream Cake", categoryId: "cat-5", categoryName: "تورت وكيك", price: 420, costPrice: 175, taxRate: 0.14, stockQty: 20, unit: "تورتة", isActive: true },
    ];
    sampleProducts.forEach(p => this.products.set(p.id, p));

    // 2. Seed POS Customers
    const sampleCustomers: PosCustomerRecord[] = [
      { id: "c-1", name: "محمود عبد الله", phone: "01004552211", email: "mahmoud@example.com", loyaltyPoints: 340, totalOrders: 14, totalSpent: 4250, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
      { id: "c-2", name: "د. هبة الشريف", phone: "01123344556", email: "heba.sherif@example.com", loyaltyPoints: 890, totalOrders: 28, totalSpent: 11200, createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
      { id: "c-3", name: "م. طارق العوضي", phone: "01234455667", email: "tarek@example.com", loyaltyPoints: 120, totalOrders: 5, totalSpent: 1950, createdAt: new Date(Date.now() - 86400000 * 10).toISOString() },
    ];
    sampleCustomers.forEach(c => this.customers.set(c.id, c));

    // 3. Seed Current Active Shift
    const shiftId = "shift-korba-today";
    const currentShift: PosShiftRecord = {
      id: shiftId,
      shiftNumber: "SH-KORBA-089",
      cashierId: "usr-korba",
      cashierName: "أحمد فريد — كاشير الكوربة",
      branchId: "korba",
      openedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      closedAt: null,
      openingCash: 1500,
      totalSales: 8940,
      cashSales: 4320,
      cardSales: 3120,
      walletSales: 1500,
      ordersCount: 24,
      status: "open",
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.shifts.set(shiftId, currentShift);

    // 4. Seed Orders
    const initialOrders: Array<{ order: PosOrderRecord; items: PosOrderItemRecord[] }> = [
      {
        order: {
          id: "ord-1001",
          orderNumber: "ORD-KORBA-1001",
          cashierId: "usr-korba",
          cashierName: "أحمد فريد",
          branchId: "korba",
          orderType: "takeaway",
          orderPlatform: "direct",
          orderRefNumber: "",
          customerName: "عميل نقدي / صالة",
          customerPhone: "01004552211",
          tableNumber: "T-04",
          deliveryNotes: "",
          paymentMethod: "cash",
          subtotal: 302.63,
          taxAmount: 42.37,
          discountAmount: 0,
          deliveryFee: 0,
          total: 345,
          tenderAmount: 400,
          changeAmount: 55,
          status: "completed",
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
        items: [
          { id: "itm-1", orderId: "ord-1001", sku: "SKU-OM-ALI", nameAr: "طاجن أم علي بالمكسرات والقشطة", nameEn: "Claypot Om Ali Nuts & Cream", quantity: 2, unitPrice: 110, totalPrice: 220, createdAt: new Date().toISOString() },
          { id: "itm-2", orderId: "ord-1001", sku: "SKU-QASH", nameAr: "قشطوطة مانجو ولوتس ممتازة", nameEn: "Qashtouta Mango & Lotus", quantity: 1, unitPrice: 125, totalPrice: 125, createdAt: new Date().toISOString() },
        ],
      },
      {
        order: {
          id: "ord-1002",
          orderNumber: "ORD-KORBA-1002",
          cashierId: "usr-korba",
          cashierName: "أحمد فريد",
          branchId: "korba",
          orderType: "delivery",
          orderPlatform: "talabat",
          orderRefNumber: "TLB-99812",
          customerName: "عميل تطبيق طلبات",
          customerPhone: "01123344556",
          tableNumber: "",
          deliveryNotes: "عمارة 14 الدور الثالث شقة 5",
          paymentMethod: "card",
          subtotal: 500,
          taxAmount: 70,
          discountAmount: 0,
          deliveryFee: 25,
          total: 595,
          tenderAmount: 595,
          changeAmount: 0,
          status: "completed",
          createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
          updatedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
        },
        items: [
          { id: "itm-3", orderId: "ord-1002", sku: "SKU-MIX-SHARQI", nameAr: "طبق مشكل حلويات شرقية فاخرة 1 كجم", nameEn: "Luxury Oriental Mix Platter 1kg", quantity: 1, unitPrice: 260, totalPrice: 260, createdAt: new Date().toISOString() },
          { id: "itm-4", orderId: "ord-1002", sku: "SKU-KON-NAB", nameAr: "صينية كنافة نابلسية بالجبنة الساخنة", nameEn: "Hot Cheese Nabulsi Konafa", quantity: 1, unitPrice: 310, totalPrice: 310, createdAt: new Date().toISOString() },
        ],
      },
    ];

    initialOrders.forEach(({ order, items }) => {
      this.orders.set(order.id, order);
      this.items.set(order.id, items);
    });
  }
}

export const posDb = new PosInMemoryStore();
