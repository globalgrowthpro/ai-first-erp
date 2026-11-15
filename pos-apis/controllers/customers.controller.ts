/**
 * POS Customers & Loyalty Controller
 * Handles customer lookup by phone, quick checkout registration, and loyalty point updates.
 * Author: Hafez ERP Engineering
 */

import { posDb } from "../database.ts";
import type { PosCustomerRecord, ApiResponse } from "../types.ts";

export class CustomersController {
  /**
   * GET /api/pos/customers
   */
  static async listCustomers(query: Record<string, string>): Promise<ApiResponse<PosCustomerRecord[]>> {
    const search = (query.search || query.phone || "").trim().toLowerCase();
    let list = Array.from(posDb.customers.values());

    if (search) {
      list = list.filter(c => c.phone.includes(search) || c.name.toLowerCase().includes(search));
    }

    return {
      success: true,
      data: list,
      meta: { total: list.length },
    };
  }

  /**
   * GET /api/pos/customers/:id
   */
  static async getCustomerById(idOrPhone: string): Promise<ApiResponse<PosCustomerRecord>> {
    let customer = posDb.customers.get(idOrPhone);
    if (!customer) {
      customer = Array.from(posDb.customers.values()).find(c => c.phone === idOrPhone);
    }

    if (!customer) {
      return { success: false, error: `Customer '${idOrPhone}' not found` };
    }

    return { success: true, data: customer };
  }

  /**
   * POST /api/pos/customers
   */
  static async createCustomer(payload: Partial<PosCustomerRecord>): Promise<ApiResponse<PosCustomerRecord>> {
    if (!payload.name || !payload.phone) {
      return { success: false, error: "Customer name and phone number are required" };
    }

    const cleanPhone = payload.phone.trim();
    const existing = Array.from(posDb.customers.values()).find(c => c.phone === cleanPhone);
    if (existing) {
      return { success: true, message: "Customer already registered", data: existing };
    }

    const id = `c-${Date.now().toString(36)}`;
    const newCust: PosCustomerRecord = {
      id,
      name: payload.name.trim(),
      phone: cleanPhone,
      email: payload.email?.trim() || "",
      address: payload.address?.trim() || "",
      loyaltyPoints: Number(payload.loyaltyPoints) || 50, // Welcome points
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    };

    posDb.customers.set(id, newCust);
    return { success: true, message: "Customer registered successfully", data: newCust };
  }

  /**
   * PUT /api/pos/customers/:id
   */
  static async updateCustomer(id: string, payload: Partial<PosCustomerRecord>): Promise<ApiResponse<PosCustomerRecord>> {
    const customer = posDb.customers.get(id);
    if (!customer) return { success: false, error: `Customer '${id}' not found` };

    if (payload.name) customer.name = payload.name;
    if (payload.phone) customer.phone = payload.phone;
    if (payload.email !== undefined) customer.email = payload.email;
    if (payload.address !== undefined) customer.address = payload.address;

    posDb.customers.set(id, customer);
    return { success: true, message: "Customer updated", data: customer };
  }

  /**
   * PATCH /api/pos/customers/:id/loyalty
   */
  static async patchLoyalty(id: string, payload: { pointsDelta: number; reason?: string }): Promise<ApiResponse<PosCustomerRecord>> {
    const customer = posDb.customers.get(id);
    if (!customer) return { success: false, error: `Customer '${id}' not found` };

    customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints + (Number(payload.pointsDelta) || 0));
    posDb.customers.set(id, customer);

    return {
      success: true,
      message: `Loyalty points adjusted (${payload.pointsDelta >= 0 ? "+" : ""}${payload.pointsDelta}). New balance: ${customer.loyaltyPoints}`,
      data: customer,
    };
  }

  /**
   * DELETE /api/pos/customers/:id
   */
  static async deleteCustomer(id: string): Promise<ApiResponse<{ deletedId: string }>> {
    const customer = posDb.customers.get(id);
    if (!customer) return { success: false, error: `Customer '${id}' not found` };

    posDb.customers.delete(id);
    return { success: true, message: "Customer removed", data: { deletedId: id } };
  }
}
