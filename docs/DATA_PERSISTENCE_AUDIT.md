# AI-First ERP — Data Persistence & Storage Audit

> **Generated on:** 2026-10-12  
> **Updated on:** 2026-10-13  
> **Author / Lead Developer:** Mr. Hafez Rahim  
> **System Scope:** AI-First ERP for Wazeer El-Helw & Central Kitchen Operations  

This document provides a deep architectural audit of the application's data persistence mechanisms, tracking what was migrated from local client storage to **Supabase**.

---

## 1. LocalStorage Migration Status: ✅ 100% Migrated to Supabase

All previous `localStorage` keys have been eliminated and redirected to live Supabase database tables:

| Previous Key | Previous File | New Supabase Architecture | Status |
| :--- | :--- | :--- | :--- |
| `hafez_provisioned_accounts` | [`src/lib/auth-store.ts`](../src/lib/auth-store.ts) | Directly synchronizes provisioned accounts into Supabase `profiles` & `user_roles` tables, with memory caching. | **Migrated to Supabase** ✅ |
| `hafez_active_user_session` | [`src/lib/auth-store.ts`](../src/lib/auth-store.ts) | Managed live via `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()`. | **Migrated to Supabase** ✅ |
| `hafez_erp_compact_mode` | [`src/lib/ui-prefs.ts`](../src/lib/ui-prefs.ts) | Reads and writes directly to Supabase `profiles.sidebar_visible`. | **Migrated to Supabase** ✅ |
| `erp-lang` | [`src/lib/i18n.tsx`](../src/lib/i18n.tsx) | Synchronizes preferred language (`defaultLanguage`) with Supabase `company_settings.branding` JSON column. | **Migrated to Supabase** ✅ |

---

## 2. Browser `sessionStorage` (Persisted per Browser Tab)

These items are isolated per browser tab for realtime presence:

| Storage Key | Source File | Purpose |
| :--- | :--- | :--- |
| `hafez_erp_presence_tab_id` | [`src/lib/presence-store.ts`](../src/lib/presence-store.ts) | Unique tab session ID for multi-tab realtime user presence tracking on Supabase Realtime Channels (`online_erp_presence`). |
| `hafez_erp_presence_connected_at` | [`src/lib/presence-store.ts`](../src/lib/presence-store.ts) | Connection timestamp for user telemetry. |

---

## 3. In-Memory State & Supabase Enhancements

1. **Partner Transactions & Payments** ([`src/lib/partners-store.ts`](../src/lib/partners-store.ts)):
   - Partner directory profiles save to `partners`.
   - `recordPayment()` now directly updates the partner's live balance in the Supabase `partners` table.
2. **Manufacturing Work Order BOM Breakdown & Costs** ([`src/lib/manufacturing-store.ts`](../src/lib/manufacturing-store.ts)):
   - Orders sync basic state to the `work_orders` table.
3. **HR Employee Management** ([`src/lib/hr-store.ts`](../src/lib/hr-store.ts)):
   - Core employee records, departments, positions, and leaves sync with Supabase tables.
4. **Custom Role Definitions** ([`src/lib/org-store.ts`](../src/lib/org-store.ts)):
   - User assignments map to `user_roles` in Supabase.

---

## 4. Fully Connected Supabase Tables

| Module | Supabase Tables / Realtime Channels | Status |
| :--- | :--- | :--- |
| **Authentication & Profiles** | `profiles`, `user_roles`, `supabase.auth` | Fully connected |
| **Inventory & Warehouses** | `categories`, `warehouses`, `units`, `products`, `stock_levels`, `stock_moves`, `branches`, `boms`, `bom_lines` | Fully connected |
| **POS Orders & Shifts** | `pos_orders`, `pos_order_items`, `pos_shifts`, `audit_log` | Fully connected with Realtime |
| **Invoices & Purchases** | `sales_invoices`, `sales_invoice_lines` | Fully connected |
| **Partners Directory** | `partners` (customers, suppliers & balance updates) | Fully connected |
| **Branding & Settings** | `company_settings` (including `security_matrix` permissions & language preferences) | Fully connected |
| **Helpdesk & Dispatch** | `helpdesk_tickets`, `helpdesk_ticket_responses`, `dispatch_shipments` | Fully connected |
| **Organization Structure** | `departments`, `positions`, `profiles`, `user_roles` | Fully connected |
| **Presence & Telemetry** | `presence-store` via Supabase Realtime Channels (`online_erp_presence`) | Fully connected |
