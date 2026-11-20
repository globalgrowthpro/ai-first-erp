/**
 * Hafez ERP — Offline POS Cashier Shift Excel Exporter
 * Generates an Excel spreadsheet (.xlsx) for each cashier's shift orders.
 * File Name: وردية_[اسم_الكاشير]_[التاريخ].xlsx
 * Completely offline capable using SheetJS (xlsx).
 */

import * as XLSX from "xlsx";

export interface CashierShiftOrderRow {
  id: string;
  time?: string;
  date?: string;
  itemsSummary: string;
  totalQty?: number;
  total: number;
  payMethod: string;
  payMethodLabel?: string;
  isSynced?: boolean;
  cashierName?: string;
}

export function exportCashierShiftToExcel(
  orders: CashierShiftOrderRow[],
  cashierName: string,
  branchName: string = "فرع الكوربة — مصر الجديدة",
  targetDate?: string
): boolean {
  try {
    const todayStr = targetDate || new Date().toISOString().slice(0, 10);
    const cleanCashier = cashierName.replace(/[\/\\:*?"<>|]/g, "_").trim();
    const filename = `وردية_${cleanCashier}_${todayStr}.xlsx`;

    // 1. Prepare Rows Data
    let totalSales = 0;
    let totalCash = 0;
    let totalCard = 0;
    let totalPcs = 0;

    const rows = orders.map((o, idx) => {
      const amount = Number(o.total) || 0;
      totalSales += amount;
      const isCash = o.payMethod === "cash" || (o.payMethodLabel && o.payMethodLabel.includes("كاش"));
      if (isCash) totalCash += amount;
      else totalCard += amount;

      const qty = o.totalQty || 1;
      totalPcs += qty;

      return {
        "م": idx + 1,
        "اسم الكاشير": o.cashierName || cashierName,
        "رقم الفاتورة": o.id,
        "الوقت": o.time || new Date().toLocaleTimeString("ar-EG"),
        "الأصناف والبيان": o.itemsSummary || "أصناف حلويات",
        "الكمية": qty,
        "المبلغ (ج.م)": amount,
        "طريقة الدفع": o.payMethodLabel || (isCash ? "نقداً (كاش) 💵" : "فيزا / بطاقة 💳"),
        "حالة السداد والمزامنة": o.isSynced ? "مدفوع ومتزامن سحابياً 🟢" : "مدفوع ومحفوظ محلياً (Offline) 🟠",
      };
    });

    // 2. Add Shift Summary Row
    rows.push({
      "م": rows.length + 1,
      "اسم الكاشير": "=== إجمالي الوردية ===",
      "رقم الفاتورة": `${orders.length} فاتورة`,
      "الوقت": "-",
      "الأصناف والبيان": `كاش: ${totalCash.toFixed(2)} ج.م | فيزا: ${totalCard.toFixed(2)} ج.م`,
      "الكمية": totalPcs,
      "المبلغ (ج.م)": totalSales,
      "طريقة الدفع": "-",
      "حالة السداد والمزامنة": "خزينة مطابقة ومغلقة",
    });

    // 3. Create Worksheet and Book
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set Column Widths for Arabic Readability
    ws["!cols"] = [
      { wch: 6 },  // م
      { wch: 26 }, // اسم الكاشير
      { wch: 18 }, // رقم الفاتورة
      { wch: 14 }, // الوقت
      { wch: 45 }, // الأصناف والبيان
      { wch: 10 }, // الكمية
      { wch: 16 }, // المبلغ
      { wch: 20 }, // طريقة الدفع
      { wch: 32 }, // حالة السداد
    ];

    const wb = XLSX.utils.book_new();
    const sheetName = `وردية_${todayStr}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 4. Download file
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    }, 200);

    return true;
  } catch (err) {
    console.error("[exportCashierShiftToExcel error]:", err);
    return false;
  }
}
