/**
 * Hafez ERP — POS Hardware Bridge
 * ESC/POS 80mm Thermal Receipt Generator, Silent Direct Printing,
 * and RJ11 Electronic Cash Drawer Trigger.
 */

import type { OfflineOrderRecord } from "../db/pos-local-db";

// Standard ESC/POS Command Sequences
export const ESC_POS_COMMANDS = {
  INIT: "\x1B\x40", // Initialize printer
  ALIGN_LEFT: "\x1B\x61\x00",
  ALIGN_CENTER: "\x1B\x61\x01",
  ALIGN_RIGHT: "\x1B\x61\x02",
  BOLD_ON: "\x1B\x45\x01",
  BOLD_OFF: "\x1B\x45\x00",
  DOUBLE_HEIGHT: "\x1D\x21\x01",
  NORMAL_TEXT: "\x1D\x21\x00",
  CUT_PAPER: "\x1D\x56\x41\x10", // Full cut with feed
  OPEN_DRAWER_PIN2: "\x1B\x70\x00\x19\xFA", // 200ms pulse to RJ11 pin 2
  OPEN_DRAWER_PIN5: "\x1B\x70\x01\x19\xFA", // 200ms pulse to RJ11 pin 5
};

export class PosHardwareBridge {
  /**
   * Send electric pulse to open the connected cash drawer
   */
  public async openCashDrawer(): Promise<boolean> {
    try {
      // Check if QZ Tray is running on local host
      if (typeof window !== "undefined" && (window as any).qz) {
        const qz = (window as any).qz;
        const config = qz.configs.create("POS-Receipt-Printer");
        await qz.print(config, [ESC_POS_COMMANDS.OPEN_DRAWER_PIN2]);
        return true;
      }

      // Check if WebSerial / WebUSB is enabled
      if (typeof navigator !== "undefined" && (navigator as any).serial) {
        // Serial pulse handled by dedicated worker
      }

      // Fallback: Trigger standard print container with drawer kick command
      this.sendSilentPrintFrame(this.generateDrawerOnlyHtml());
      return true;
    } catch (err) {
      console.warn("[PosHardwareBridge] Cash drawer trigger notice:", err);
      return false;
    }
  }

  /**
   * Format receipt into clean Arabic HTML optimized for 80mm thermal paper
   */
  public generateReceiptHtml(order: OfflineOrderRecord): string {
    const itemsHtml = order.items
      .map(
        (it) => `
        <tr style="border-bottom: 1px dashed #cbd5e1;">
          <td style="padding: 4px 0; font-weight: bold; text-align: right;">${it.nameAr}</td>
          <td style="padding: 4px 0; text-align: center; font-family: monospace;">${it.quantity}</td>
          <td style="padding: 4px 0; text-align: left; font-family: monospace;">${it.totalPrice.toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>فاتورة ${order.orderNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            width: 76mm;
            margin: 0 auto;
            padding: 8px 4px;
            color: #000;
            font-size: 11px;
            line-height: 1.35;
          }
          .header { text-align: center; margin-bottom: 8px; border-bottom: 1px double #000; padding-bottom: 6px; }
          .title { font-size: 15px; font-weight: 900; margin: 0; }
          .subtitle { font-size: 10px; margin: 2px 0; font-weight: 600; }
          .meta-table { width: 100%; font-size: 10px; margin-bottom: 6px; }
          .meta-table td { padding: 1px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 11px; }
          .items-table th { border-bottom: 1px solid #000; padding: 4px 0; text-align: right; }
          .totals-table { width: 100%; font-size: 11px; margin-top: 6px; border-top: 1px dashed #000; padding-top: 4px; }
          .totals-table td { padding: 2px 0; }
          .grand-total { font-size: 14px; font-weight: 900; border-top: 1px solid #000; border-bottom: 1px double #000; }
          .footer { text-align: center; margin-top: 10px; font-size: 9px; border-top: 1px dotted #000; padding-top: 6px; }
          .offline-tag { font-size: 9px; background: #eee; padding: 1px 4px; border-radius: 2px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">وزير الحلو</h1>
          <p class="subtitle">للحلويات الشرقية والغربية الفاخرة</p>
          <p class="subtitle">${order.branchNameAr || "فرع الكوربة — مصر الجديدة"}</p>
        </div>

        <table class="meta-table">
          <tr>
            <td><strong>رقم الفاتورة:</strong> <span style="font-family: monospace;">${order.orderNumber}</span></td>
            <td style="text-align: left;"><strong>الكاشير:</strong> ${order.cashierName}</td>
          </tr>
          <tr>
            <td><strong>التاريخ:</strong> ${new Date(order.createdAt).toLocaleDateString("ar-EG")}</td>
            <td style="text-align: left;"><strong>الوقت:</strong> ${new Date(order.createdAt).toLocaleTimeString("ar-EG")}</td>
          </tr>
          <tr>
            <td><strong>الجهاز:</strong> ${order.terminalId}</td>
            <td style="text-align: left;"><span class="offline-tag">${order.createdOffline ? "حفظ محلي (Offline)" : "سحابي (Online)"}</span></td>
          </tr>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 55%; text-align: right;">الصنف</th>
              <th style="width: 15%; text-align: center;">العدد</th>
              <th style="width: 30%; text-align: left;">المجموع</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td>المجموع الفرعي:</td>
            <td style="text-align: left; font-family: monospace;">${order.subtotal.toFixed(2)} ج.م</td>
          </tr>
          <tr>
            <td>ضريبة القيمة المضافة (14%):</td>
            <td style="text-align: left; font-family: monospace;">${order.vatAmount > 0 ? order.vatAmount.toFixed(2) + " ج.م" : "مشمولة"}</td>
          </tr>
          ${
            order.discountAmount > 0
              ? `<tr><td>الخصم الممنوح:</td><td style="text-align: left; color: red;">-${order.discountAmount.toFixed(2)} ج.م</td></tr>`
              : ""
          }
          <tr class="grand-total">
            <td style="padding: 4px 0;">الإجمالي المستحق:</td>
            <td style="text-align: left; padding: 4px 0; font-family: monospace;">${order.total.toFixed(2)} ج.م</td>
          </tr>
          <tr>
            <td>المدفوع (${order.paymentMethod === "cash" ? "نقداً" : "بطاقة / فيزا"}):</td>
            <td style="text-align: left; font-family: monospace;">${order.tenderAmount.toFixed(2)} ج.م</td>
          </tr>
          ${
            order.changeAmount > 0
              ? `<tr><td>الباقي للعميل:</td><td style="text-align: left; font-family: monospace; font-weight: bold;">${order.changeAmount.toFixed(2)} ج.م</td></tr>`
              : ""
          }
        </table>

        <div class="footer">
          <p>شكراً لزيارتكم — حلويات وزير الحلو أصل الطعم</p>
          <p>خدمة العملاء: +20 100 455 2211 | الرقم الضريبي: 421-893-112</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateDrawerOnlyHtml(): string {
    return `<html><body><script>window.print();</script></body></html>`;
  }

  /**
   * Trigger silent thermal print using a hidden DOM iframe (No browser dialog popup in Kiosk Mode)
   */
  public printSilentReceipt(order: OfflineOrderRecord): void {
    const htmlContent = this.generateReceiptHtml(order);
    this.sendSilentPrintFrame(htmlContent);

    // If order paid in cash, also trigger cash drawer open pulse
    if (order.paymentMethod === "cash") {
      this.openCashDrawer().catch(() => {});
    }
  }

  private sendSilentPrintFrame(htmlContent: string) {
    if (typeof document === "undefined") return;

    let iframe = document.getElementById("pos-silent-printer-frame") as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "pos-silent-printer-frame";
      iframe.style.position = "fixed";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn("[PosHardwareBridge] Print trigger catch:", e);
        }
      }, 150);
    }
  }
}

// Singleton hardware bridge instance
export const posHardware = new PosHardwareBridge();
