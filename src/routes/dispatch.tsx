import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Truck,
  Plus,
  Eye,
  Edit2,
  Trash2,
  ReceiptText,
  ShoppingCart,
  Download,
  Upload,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader, Panel, DataTable, Td, StatusPill, Btn, TablePagination, usePagination } from "@/components/kit";
import { useDispatchStore, type DispatchOrder } from "@/lib/dispatch-store";
import { useInventoryStore } from "@/lib/inventory-store";
import { DispatchImportModal } from "@/components/dispatch/DispatchImportModal";
import {
  exportDispatchToExcel,
  generateDispatchBlankTemplate,
  safeDownloadWorkbook,
} from "@/lib/excel-utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch Orders — Hafez ERP" },
      { name: "description", content: "Manage loading orders and logistics." },
    ],
  }),
  component: DispatchPage,
});

function DispatchPage() {
  const { t, pick, money } = useI18n();
  const { orders, addOrder, updateOrder, deleteOrder, nextId, markStatus, importOrders } = useDispatchStore();
  const { branches } = useInventoryStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DispatchOrder | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Import / Export state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const importDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        importDropdownRef.current &&
        !importDropdownRef.current.contains(event.target as Node)
      ) {
        setIsImportDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Export handler
  const handleExportExcel = () => {
    try {
      const ok = exportDispatchToExcel(orders);
      if (ok) {
        toast.success(
          pick(
            `تم تصدير ${orders.length} أمر تحميل إلى Excel بنجاح`,
            `Successfully exported ${orders.length} dispatch orders to Excel`
          )
        );
      }
    } catch (err: any) {
      toast.error(err.message || pick("فشل تصدير أوامر التحميل", "Failed to export dispatch orders"));
    }
  };

  // Download template handler
  const handleDownloadTemplate = () => {
    setIsImportDropdownOpen(false);
    try {
      const wb = generateDispatchBlankTemplate({ branches });
      safeDownloadWorkbook(wb, "نموذج_استيراد_أوامر_التحميل_Dispatch_Orders_Template.xlsx");
      toast.success(
        pick(
          "تم تنزيل نموذج استيراد أوامر التحميل بنجاح!",
          "Dispatch orders Excel template downloaded successfully!"
        )
      );
    } catch (err: any) {
      toast.error(err.message || pick("فشل تنزيل النموذج", "Failed to download template"));
    }
  };

  // Open import modal
  const handleOpenImportModal = () => {
    setIsImportDropdownOpen(false);
    setIsImportModalOpen(true);
  };

  const activeOrder = editing ? orders.find(o => o.id === editing.id) || editing : null;

  const {
    currentPage: dispatchPage,
    setCurrentPage: setDispatchPage,
    paginatedItems: paginatedDispatchOrders,
  } = usePagination(orders, 30);

  return (
    <div className="space-y-6">
      <PageHeader
        title={pick("أوامر التحميل", "Dispatch Orders")}
        subtitle={pick("إدارة تحميل البضائع والشحنات", "Manage cargo loading and shipments")}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export to Excel */}
            <Btn
              type="button"
              variant="outline"
              className="text-xs font-bold gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shadow-xs cursor-pointer"
              onClick={handleExportExcel}
              title={pick("تصدير أوامر التحميل إلى ملف Excel", "Export Dispatch Orders to Excel")}
            >
              <Download className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{pick("تصدير إلى EXCEL", "Export to EXCEL")}</span>
            </Btn>

            {/* Import Dropdown */}
            <div className="relative" ref={importDropdownRef}>
              <Btn
                type="button"
                variant="outline"
                className={cn(
                  "text-xs font-bold gap-1.5 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 shadow-xs cursor-pointer",
                  isImportDropdownOpen && "bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-500"
                )}
                onClick={() => setIsImportDropdownOpen((prev) => !prev)}
                title={pick("خيارات استيراد أوامر التحميل: تحميل النموذج أو استيراد ملف Excel", "Import options: Download template or import Excel")}
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{pick("استيراد من EXCEL", "Import from EXCEL")}</span>
                <ChevronDown className={cn("size-3 transition-transform text-emerald-600 dark:text-emerald-400", isImportDropdownOpen && "rotate-180")} />
              </Btn>

              {isImportDropdownOpen && (
                <div className="absolute end-0 top-full mt-1.5 w-72 rounded-xl border border-border bg-popover/95 backdrop-blur-md shadow-xl p-1.5 z-50 text-start animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-1 mb-1 border-b border-border/50">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                      {pick("خيارات الاستيراد من الإكسيل", "Excel Import Options")}
                    </p>
                  </div>

                  {/* Option 1: Template */}
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-emerald-500/10 transition-colors text-start cursor-pointer group"
                  >
                    <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Download className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>{pick("تحميل النموذج الفارغ (Template)", "Download Template (.xlsx)")}</span>
                        <span className="text-[8.5px] font-bold px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          XLSX
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        {pick(
                          "نموذج Excel جاهز بكافة أعمدة الشحنات والفروع وأرقام التتبع",
                          "Blank template with all shipment columns, branches, and tracking IDs"
                        )}
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Upload Excel File */}
                  <button
                    type="button"
                    onClick={handleOpenImportModal}
                    className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-emerald-500/10 transition-colors text-start cursor-pointer group mt-0.5"
                  >
                    <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Upload className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-foreground">
                        {pick("استيراد وجدولة الشحنات من ملف", "Import Shipments from File")}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                        {pick(
                          "رفع ملف Excel لإضافة وجدولة شحنات النقل للفروع مباشرة",
                          "Upload Excel file to add & schedule dispatch cargo shipments"
                        )}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <Btn onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="size-4" />
              {pick("أمر تحميل جديد", "New Dispatch Order")}
            </Btn>
          </div>
        }
      />

      <Panel title={pick("أوامر التحميل الأخيرة", "Recent Dispatch Orders")}>
        <DataTable
          head={[
            pick("أمر التحميل", "Dispatch Order"),
            pick("المرجع", "Reference"),
            pick("التاريخ", "Date"),
            pick("الوجهة/الفرع", "Destination/Branch"),
            pick("إجمالي العناصر", "Total Items"),
            t("status"),
            pick("إجراءات", "Actions"),
          ]}
        >
          {paginatedDispatchOrders.map((order) => (
            <tr key={order.id} className="hover:bg-secondary/70 transition-colors">
              <Td className="num font-bold text-primary">{order.id}</Td>
              <Td>
                {order.linkedDoc.type === "sales" ? (
                  <Link to="/sales/$invoiceId" params={{ invoiceId: order.linkedDoc.id }} className="inline-flex items-center gap-1.5 text-xs font-bold hover:text-primary hover:underline transition-colors text-foreground">
                    <ReceiptText className="size-3.5 text-muted-foreground" />
                    <span className="num">{order.linkedDoc.id}</span>
                  </Link>
                ) : order.linkedDoc.type === "purchase" ? (
                  <Link to="/purchases/$orderId" params={{ orderId: order.linkedDoc.id }} className="inline-flex items-center gap-1.5 text-xs font-bold hover:text-brand hover:underline transition-colors text-foreground">
                    <ShoppingCart className="size-3.5 text-muted-foreground" />
                    <span className="num">{order.linkedDoc.id}</span>
                  </Link>
                ) : (
                  <span className="text-muted-foreground text-xs font-mono">{order.linkedDoc.id}</span>
                )}
              </Td>
              <Td className="num text-muted-foreground">{order.date}</Td>
              <Td className="font-semibold">{pick(order.branch.ar, order.branch.en)}</Td>
              <Td className="num">{order.totalItems}</Td>
              <Td>
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  {order.status === "shipped" && <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-md">{pick("تم الشحن", "Shipped")}</span>}
                  {order.status === "delivered" && <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md">{pick("تم التوصيل", "Delivered")}</span>}
                  {order.status === "draft" && <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-md">{pick("مسودة", "Draft")}</span>}
                  {order.status === "cancelled" && <span className="bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-md">{pick("ملغي", "Cancelled")}</span>}
                  {order.status === "partial" && <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md">{pick("جزئي", "Partial")}</span>}
                </div>
              </Td>
              <Td>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => { setEditing(order); setFormOpen(true); }} className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors">
                    <Edit2 className="size-4" />
                  </button>
                  <button type="button" onClick={() => setDeleting(order.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                {pick("لا توجد أوامر تحميل", "No dispatch orders found")}
              </td>
            </tr>
          )}
        </DataTable>
        <TablePagination
          currentPage={dispatchPage}
          totalItems={orders.length}
          pageSize={30}
          onPageChange={setDispatchPage}
          itemLabel={{ ar: "أمر تحميل", en: "Orders" }}
        />
      </Panel>

      {/* Form Modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md" dir={pick("rtl", "ltr")}>
          <DialogHeader>
            <div className="flex flex-col gap-3 border-b border-border/40 pb-3 mb-1">
              <div className="flex items-center justify-between">
                <DialogTitle>{activeOrder ? pick(`أمر تحميل ${activeOrder.id}`, `Dispatch Order ${activeOrder.id}`) : pick("أمر تحميل جديد", "New Dispatch Order")}</DialogTitle>
                {activeOrder && (
                  <div className="text-[11px] font-bold">
                    {activeOrder.status === "shipped" && <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-md">{pick("تم الشحن", "Shipped")}</span>}
                    {activeOrder.status === "delivered" && <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md">{pick("تم التوصيل", "Delivered")}</span>}
                    {activeOrder.status === "draft" && <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-md">{pick("مسودة", "Draft")}</span>}
                    {activeOrder.status === "cancelled" && <span className="bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-md">{pick("ملغي", "Cancelled")}</span>}
                    {activeOrder.status === "partial" && <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-md">{pick("جزئي", "Partial")}</span>}
                  </div>
                )}
              </div>
              
              {activeOrder && (
                <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border border-border/50">
                  {activeOrder.status === "draft" && (
                    <Btn type="button" size="sm" variant="solid" className="h-7 text-xs" onClick={() => markStatus(activeOrder.id, "shipped")}>
                      {pick("تأكيد وشحن", "Confirm & Ship")}
                    </Btn>
                  )}
                  {activeOrder.status === "shipped" && (
                    <Btn type="button" size="sm" variant="solid" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-transparent" onClick={() => markStatus(activeOrder.id, "delivered")}>
                      {pick("تأكيد التوصيل", "Mark Delivered")}
                    </Btn>
                  )}
                  {activeOrder.status !== "cancelled" && activeOrder.status !== "delivered" && (
                    <Btn type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => markStatus(activeOrder.id, "cancelled")}>
                      {pick("إلغاء الأمر", "Cancel Order")}
                    </Btn>
                  )}
                  {activeOrder.status === "cancelled" && (
                    <Btn type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => markStatus(activeOrder.id, "draft")}>
                      {pick("إعادة كمسودة", "Reset to Draft")}
                    </Btn>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const branchAr = formData.get("branchAr") as string;
              const branchEn = formData.get("branchEn") as string;
              const docType = formData.get("docType") as "sales" | "purchase" | "none";
              const docId = formData.get("docId") as string;
              const status = formData.get("status") as any;

              const docData = {
                date: new Date().toISOString().slice(0, 10),
                branch: { ar: branchAr || branchEn, en: branchEn || branchAr },
                linkedDoc: { type: docType, id: docId || "N/A" },
                status,
                totalItems: Number(formData.get("totalItems")) || 0,
                items: editing?.items || [],
              };

              if (editing) {
                updateOrder(editing.id, docData);
              } else {
                addOrder(docData);
              }
              setFormOpen(false);
            }}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{pick("نوع المرجع", "Ref Type")}</label>
                <select name="docType" defaultValue={activeOrder?.linkedDoc.type || "sales"} className="w-full rounded-lg border border-border bg-card p-2 text-sm outline-none focus:border-primary">
                  <option value="sales">{pick("مبيعات (Sales)", "Sales")}</option>
                  <option value="purchase">{pick("مشتريات (Purchase)", "Purchase")}</option>
                  <option value="none">{pick("بدون (None)", "None")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{pick("رقم المرجع", "Ref ID")}</label>
                <input name="docId" required defaultValue={activeOrder?.linkedDoc.id || ""} placeholder={pick("مثال: INV-100", "e.g. INV-100")} className="w-full rounded-lg border border-border bg-card p-2 text-sm outline-none focus:border-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{pick("الفرع/الوجهة (عربي)", "Destination (AR)")}</label>
                <input name="branchAr" required defaultValue={activeOrder?.branch.ar || ""} placeholder={pick("مستودع الشرق", "East Warehouse")} className="w-full rounded-lg border border-border bg-card p-2 text-sm outline-none focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{pick("الفرع/الوجهة (إنجليزي)", "Destination (EN)")}</label>
                <input name="branchEn" required defaultValue={activeOrder?.branch.en || ""} placeholder="East Warehouse" className="w-full rounded-lg border border-border bg-card p-2 text-sm outline-none focus:border-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{pick("إجمالي العناصر الموزنة/القطع", "Total Items (Qty)")}</label>
                <input name="totalItems" type="number" required defaultValue={activeOrder?.totalItems || 0} className="w-full rounded-lg border border-border bg-card p-2 text-sm outline-none focus:border-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">{t("status")}</label>
                <select name="status" value={activeOrder?.status || "draft"} onChange={(e) => { if (activeOrder) markStatus(activeOrder.id, e.target.value as any) }} className="w-full rounded-lg border border-border bg-card p-2 text-sm outline-none focus:border-primary">
                  <option value="draft">{pick("مسودة (قيد التجهيز)", "Draft (Staging)")}</option>
                  <option value="shipped">{pick("تم الشحن", "Shipped")}</option>
                  <option value="delivered">{pick("تم التوصيل", "Delivered")}</option>
                  <option value="partial">{pick("توصيل جزئي", "Partial")}</option>
                  <option value="cancelled">{pick("ملغي", "Cancelled")}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border/40 mt-4">
              <Btn variant="ghost" type="button" onClick={() => setFormOpen(false)}>{t("cancel")}</Btn>
              <Btn variant="solid" type="submit">{t("save")}</Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-sm" dir={pick("rtl", "ltr")}>
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="size-5" />
              <span>{t("confirm")}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">{pick(`هل أنت متأكد من حذف أمر التحميل ${deleting}؟`, `Are you sure you want to delete dispatch order ${deleting}?`)}</p>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setDeleting(null)}>{t("cancel")}</Btn>
              <Btn variant="danger" onClick={() => { if (deleting) { deleteOrder(deleting); setDeleting(null); } }}>{t("confirm")}</Btn>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Excel Import Modal */}
      <DispatchImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        existingOrders={orders}
        branches={branches}
        onImportSuccess={async (imported, mode) => {
          await importOrders(imported, mode);
        }}
      />
    </div>
  );
}
