/**
 * POS Products & Catalog Controller
 * Handles menu item fetching, fast barcode scanning, stock checks and updates.
 * Author: Hafez ERP Engineering
 */

import { posDb, supabase } from "../database.ts";
import type { PosProductRecord, ApiResponse } from "../types.ts";

export class ProductsController {
  /**
   * GET /api/pos/products
   */
  static async listProducts(query: Record<string, string>): Promise<ApiResponse<PosProductRecord[]>> {
    const categoryId = query.categoryId || query.category_id;
    const search = (query.search || "").toLowerCase().trim();
    const barcode = query.barcode;

    let items = Array.from(posDb.products.values()).filter(p => p.isActive);

    if (barcode) {
      items = items.filter(p => p.barcode === barcode);
    }
    if (categoryId) {
      items = items.filter(p => p.categoryId === categoryId);
    }
    if (search) {
      items = items.filter(p =>
        p.nameAr.toLowerCase().includes(search) ||
        p.nameEn.toLowerCase().includes(search) ||
        p.sku.toLowerCase().includes(search) ||
        p.barcode.includes(search)
      );
    }

    return {
      success: true,
      data: items,
      meta: { total: items.length },
    };
  }

  /**
   * GET /api/pos/products/barcode/:barcode
   */
  static async getProductByBarcode(barcode: string): Promise<ApiResponse<PosProductRecord>> {
    const cleanBarcode = barcode.trim();
    const product = Array.from(posDb.products.values()).find(
      p => p.barcode === cleanBarcode || p.sku.toLowerCase() === cleanBarcode.toLowerCase()
    );

    if (!product) {
      return { success: false, error: `No POS product matching barcode or SKU '${cleanBarcode}'` };
    }

    return {
      success: true,
      data: product,
    };
  }

  /**
   * GET /api/pos/categories
   */
  static async listCategories(): Promise<ApiResponse<Array<{ id: string; nameAr: string; nameEn: string; itemsCount: number }>>> {
    const categoriesMap: Record<string, { id: string; nameAr: string; nameEn: string; itemsCount: number }> = {};

    Array.from(posDb.products.values()).forEach(p => {
      if (!categoriesMap[p.categoryId]) {
        categoriesMap[p.categoryId] = {
          id: p.categoryId,
          nameAr: p.categoryName,
          nameEn: p.categoryName,
          itemsCount: 0,
        };
      }
      categoriesMap[p.categoryId].itemsCount += 1;
    });

    return {
      success: true,
      data: Object.values(categoriesMap),
    };
  }

  /**
   * PATCH /api/pos/products/:id/stock
   */
  static async adjustStock(id: string, payload: { deltaQty: number; reason?: string }): Promise<ApiResponse<PosProductRecord>> {
    const product = posDb.products.get(id);
    if (!product) {
      return { success: false, error: `Product '${id}' not found` };
    }

    product.stockQty += Number(payload.deltaQty) || 0;
    posDb.products.set(id, product);

    return {
      success: true,
      message: `Stock updated for '${product.nameAr}'. New balance: ${product.stockQty}`,
      data: product,
    };
  }

  /**
   * POST /api/pos/products
   */
  static async createProduct(payload: Partial<PosProductRecord>): Promise<ApiResponse<PosProductRecord>> {
    const id = payload.id || `p-${Date.now()}`;
    const newProd: PosProductRecord = {
      id,
      sku: payload.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: payload.barcode || String(Date.now()).slice(-8),
      nameAr: payload.nameAr || "صنف جديد",
      nameEn: payload.nameEn || "New Product",
      categoryId: payload.categoryId || "cat-1",
      categoryName: payload.categoryName || "حلويات عامة",
      price: Math.max(0, Number(payload.price) || 0),
      costPrice: Math.max(0, Number(payload.costPrice) || 0),
      taxRate: Number(payload.taxRate) || 0.14,
      stockQty: Number(payload.stockQty) || 0,
      unit: payload.unit || "قطعة",
      isActive: payload.isActive ?? true,
    };

    posDb.products.set(id, newProd);
    return { success: true, message: "Product created successfully", data: newProd };
  }

  /**
   * PUT /api/pos/products/:id
   */
  static async updateProduct(id: string, payload: Partial<PosProductRecord>): Promise<ApiResponse<PosProductRecord>> {
    const product = posDb.products.get(id);
    if (!product) return { success: false, error: `Product '${id}' not found` };

    Object.assign(product, payload);
    posDb.products.set(id, product);
    return { success: true, message: "Product updated", data: product };
  }

  /**
   * DELETE /api/pos/products/:id
   */
  static async deleteProduct(id: string): Promise<ApiResponse<{ deletedId: string }>> {
    const product = posDb.products.get(id);
    if (!product) return { success: false, error: `Product '${id}' not found` };

    product.isActive = false; // soft delete for audit
    posDb.products.set(id, product);
    return { success: true, message: "Product deactivated", data: { deletedId: id } };
  }
}
