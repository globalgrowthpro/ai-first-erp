/**
 * POS Sync & Offline Controller
 * Handles batch syncing of offline orders queued during internet interruption.
 * Author: Hafez ERP Engineering
 */

import { OrdersController } from "./orders.controller.ts";
import type { BatchSyncRequest, ApiResponse } from "../types.ts";

export class SyncController {
  /**
   * POST /api/pos/sync/batch
   * Process and save a batch of offline orders created during disconnection
   */
  static async batchSync(payload: BatchSyncRequest): Promise<ApiResponse<any>> {
    if (!payload.orders || !Array.isArray(payload.orders)) {
      return { success: false, error: "orders array is required" };
    }

    const syncedResults: any[] = [];
    const failedResults: any[] = [];

    for (const orderInput of payload.orders) {
      try {
        const res = await OrdersController.createOrder({
          ...orderInput,
          branchId: orderInput.branchId || payload.branchId,
        });

        if (res.success && res.data) {
          syncedResults.push({
            orderNumber: res.data.orderNumber,
            id: res.data.id,
            status: "synced",
          });
        } else {
          failedResults.push({
            orderNumber: orderInput.orderNumber,
            error: res.error || "Failed to process",
          });
        }
      } catch (err: any) {
        failedResults.push({
          orderNumber: orderInput.orderNumber,
          error: err.message,
        });
      }
    }

    return {
      success: failedResults.length === 0,
      message: `Batch sync complete: ${syncedResults.length} synced, ${failedResults.length} failed`,
      data: {
        syncedCount: syncedResults.length,
        failedCount: failedResults.length,
        syncedOrders: syncedResults,
        failedOrders: failedResults,
        serverTime: new Date().toISOString(),
      },
    };
  }

  /**
   * GET /api/pos/sync/health
   */
  static async health(): Promise<ApiResponse<any>> {
    return {
      success: true,
      data: {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        cloudSyncEnabled: true,
      },
    };
  }
}
