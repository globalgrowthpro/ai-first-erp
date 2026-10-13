# AI-First ERP — Data Persistence & Storage Audit

> **Generated on:** 2026-10-12  
> **Updated on:** 2026-10-13  
> **Author / Lead Developer:** Mr. Hafez Rahim  
> **System Scope:** AI-First ERP for Wazeer El-Helw & Central Kitchen Operations  

This document provides a comprehensive architectural audit of the application's data persistence mechanisms, verifying the complete elimination of static demo data and local browser storage in favor of **live Supabase database tables**.

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

## 3. Dynamic Live Logic & Supabase Enhancements (Zero Static Demo Data)

1. **AI Agents & Modules Configuration** ([`src/lib/ai-modules-store.ts`](../src/lib/ai-modules-store.ts)):
   - Loads and synchronizes directly with the Supabase `ai_modules` table on mount.
   - Automatically seeds the database on initial deployment and preserves all model/agent edits across reloads.
2. **Accounting Journal & General Ledger** ([`src/lib/accounting-store.ts`](../src/lib/accounting-store.ts)):
   - Operational journals aggregate dynamically from `pos_orders`, `pos_shifts`, and `stock_moves`.
   - `addEntries()` writes manual journal vouchers directly to `journal_entries` and `journal_lines` in Supabase.
3. **HR Staffing, Payroll & GL Accruals** ([`src/lib/hr-store.ts`](../src/lib/hr-store.ts)):
   - `bulkAddEmployees()` writes directly into Supabase `employees`.
   - `postPayrollToGl()` generates real balanced journal vouchers directly in `journal_entries` and `journal_lines` upon GL posting.
4. **Manufacturing Recipe BOM Breakdown & Costing** ([`src/lib/manufacturing-store.ts`](../src/lib/manufacturing-store.ts)):
   - Work orders dynamically compute component allocations, ingredient quantities, and material costs by joining `work_orders` with Supabase `boms`, `bom_lines`, and `products`.
5. **Custom BI Reports Studio** ([`src/lib/reports-store.ts`](../src/lib/reports-store.ts)):
   - Custom report definitions are saved and synchronized across sessions into Supabase `company_settings.branding.custom_reports`.
6. **Main Executive Dashboard** ([`src/routes/index.tsx`](../src/routes/index.tsx)):
   - All 10 KPI summary cards, the 7-day sales trend chart, pending approvals, and AI operational insights are calculated 100% dynamically from live Supabase stores (`usePosOrdersStore`, `useSalesStore`, `usePurchasesStore`, `useAccountsStore`, `useInventoryStore`, `useHrStore`, `useManufacturingStore`).
7. **Sales & Procurement Portals** ([`src/routes/sales.tsx`](../src/routes/sales.tsx) & [`src/routes/purchases.tsx`](../src/routes/purchases.tsx)):
   - Eliminated static demo fallbacks. Receivables, payables, and order volumes are computed dynamically from live database rows.
8. **Reports & BI Center** ([`src/routes/reports.tsx`](../src/routes/reports.tsx)):
   - Executive AI briefing and CEO report blocks pull live numbers from database stores.

---

## 4. Fully Connected Supabase Tables

| Module | Supabase Tables / Realtime Channels | Status |
| :--- | :--- | :--- |
| **Authentication & Profiles** | `profiles`, `user_roles`, `supabase.auth` | Fully connected |
| **Inventory & Warehouses** | `categories`, `warehouses`, `units`, `products`, `stock_levels`, `stock_moves`, `branches`, `boms`, `bom_lines` | Fully connected |
| **POS Orders & Shifts** | `pos_orders`, `pos_order_items`, `pos_shifts`, `audit_log` | Fully connected with Realtime |
| **Invoices & Purchases** | `sales_invoices`, `sales_invoice_lines` | Fully connected with Realtime |
| **Partners Directory** | `partners` (customers, suppliers & balance updates) | Fully connected |
| **Accounting & General Ledger** | `accounts`, `journal_entries`, `journal_lines` | Fully connected |
| **Manufacturing & Work Orders** | `work_orders`, `boms`, `bom_lines`, `products` | Fully connected |
| **HR & Payroll** | `employees`, `attendance`, `leave_requests`, `payroll_runs` | Fully connected |
| **Branding & Settings** | `company_settings` (including `security_matrix`, `custom_reports` & branding) | Fully connected |
| **AI Modules & Agents** | `ai_modules`, `ai_runs` | Fully connected |
| **Helpdesk & Dispatch** | `helpdesk_tickets`, `helpdesk_ticket_responses`, `dispatch_shipments` | Fully connected |
| **Organization Structure** | `departments`, `positions`, `profiles`, `user_roles` | Fully connected |
| **Presence & Telemetry** | `presence-store` via Supabase Realtime Channels (`online_erp_presence`) | Fully connected |
