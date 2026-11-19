/**
 * Hafez ERP — POS Offline Module Entry Point
 * Comprehensive, standalone Offline-First Point of Sale sub-system.
 *
 * All offline code is encapsulated within this directory (`pos-offline/`)
 * and does not alter or break existing online flows in `src/`.
 */

// 1. Database Layer
export {
  posLocalDb,
  type OfflineOrderRecord,
  type OfflineProductRecord,
  type OfflineCategoryRecord,
  type OfflineShiftRecord,
  type OfflineCashierAuth,
  type SyncAuditRecord,
  type TerminalConfigRecord,
} from "./db/pos-local-db";

// 2. Offline Seed Data
export {
  seedInitialOfflineData,
  OFFLINE_SEED_CATEGORIES,
  OFFLINE_SEED_PRODUCTS,
  OFFLINE_SEED_CASHIERS,
} from "./db/seed-offline-data";

// 3. Hardware & Network Engines
export { networkMonitor, type NetworkHealth, type NetworkState } from "./engine/network-monitor";
export { posHardware, ESC_POS_COMMANDS } from "./engine/hardware-bridge";
export {
  offlinePosEngine,
  type CreateOrderInput,
  type SyncBatchResult,
} from "./engine/offline-pos-engine";

// 4. UI Components
export { OfflinePosView } from "./ui/OfflinePosView";
export { OfflinePosBanner } from "./ui/OfflinePosBanner";
export { OfflineSyncModal } from "./ui/OfflineSyncModal";
export { OfflineTerminalSetup, BRANCH_OPTIONS } from "./ui/OfflineTerminalSetup";
