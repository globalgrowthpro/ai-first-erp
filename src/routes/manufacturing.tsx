import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Factory,
  ChefHat,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
  ArrowRight,
  Eye,
  Edit2,
  Trash2,
  Sparkles,
  Calendar,
  Filter,
  Flame,
  Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, KpiCard, PageHeader, Panel } from "@/components/kit";
import {
  useManufacturingStore,
  type ManufacturingOrder,
  type ProductionStage,
} from "@/lib/manufacturing-store";
import { useInventoryStore } from "@/lib/inventory-store";
import { WorkOrderFormModal } from "@/components/manufacturing/WorkOrderFormModal";
import { WorkOrderDetailModal } from "@/components/manufacturing/WorkOrderDetailModal";
import { BomTab } from "@/components/inventory/BomTab";

export const Route = createFileRoute("/manufacturing")({
  head: () => ({
    meta: [
      { title: "Manufacturing & Work Orders — Wazeer ERP" },
      {
        name: "description",
        content:
          "Central kitchen confectionery manufacturing orders, recipe BOM management, raw material components, and production workflow.",
      },
      { property: "og:title", content: "Manufacturing — Wazeer ERP" },
      {
        property: "og:description",
        content:
          "Batch production orders, ingredients consumption and quality control workflow.",
      },
    ],
  }),
  component: ManufacturingPage,
});

function ManufacturingPage() {
  const { t, pick, money, n, lang } = useI18n();
  const {
    orders,
    addOrder,
    updateOrder,
    deleteOrder,
    transitionStage,
  } = useManufacturingStore();

  const {
    boms,
    products,
    units,
    warehouses,
    addBom,
    updateBom,
    deleteBom,
  } = useInventoryStore();

  const [activeTab, setActiveTab] = useState<"orders" | "boms" | "kanban">("orders");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<ManufacturingOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<ManufacturingOrder | null>(null);

  // Statistics
  const activeOrders = orders.filter(
    (o) => o.status === "in_progress" || o.status === "confirmed" || o.status === "qc_check"
  ).length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const totalProductionValue = orders.reduce((sum, o) => sum + o.totalCost, 0);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = order.code.toLowerCase().includes(q);
        const nameMatch =
          order.finishedProductName.ar.toLowerCase().includes(q) ||
          order.finishedProductName.en.toLowerCase().includes(q);
        const supMatch = order.supervisor.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !supMatch) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={pick("إدارة التصنيع والتشغيل (المطبخ المركزي)", "Central Kitchen Manufacturing & Work Orders")}
        subtitle={pick(
          "أوامر تشغيل الحلويات، قوائم المواد (BOM)، حجز الخامات، ومتابعة مراحل الطهي والجودة",
          "Production work orders, recipe bill of materials, ingredients allocation, and 5-stage kitchen workflow"
        )}
        actions={
          <div className="flex items-center gap-2">
            <Btn
              variant="solid"
              onClick={() => {
                setEditingOrder(null);
                setIsCreateModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="size-4" />
              <span>{pick("أمر تشغيل جديد", "New Work Order")}</span>
            </Btn>
          </div>
        }
      />

      {/* Top KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={pick("إجمالي أوامر الإنتاج", "Total Work Orders")}
          value={String(orders.length)}
          accent="primary"
        />
        <KpiCard
          label={pick("قيد التشغيل بالمطبخ", "In Active Production")}
          value={String(activeOrders)}
          accent="brand"
        />
        <KpiCard
          label={pick("دفعات تم إنجازها", "Completed Batches")}
          value={String(completedOrders)}
          accent="gold"
        />
        <KpiCard
          label={pick("إجمالي تكلفة التشغيل", "Total Production Cost")}
          value={money(totalProductionValue)}
          accent="ink"
        />
      </div>

      {/* Top Module Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-3">
        <Btn
          variant={activeTab === "orders" ? "solid" : "outline"}
          onClick={() => setActiveTab("orders")}
          className="text-xs gap-1.5"
        >
          <Factory className="size-4" />
          <span>{pick("أوامر التشغيل والإنتاج", "Work Orders")}</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-primary-foreground/20 text-[10px] font-mono">
            {orders.length}
          </span>
        </Btn>

        <Btn
          variant={activeTab === "boms" ? "solid" : "outline"}
          onClick={() => setActiveTab("boms")}
          className="text-xs gap-1.5"
        >
          <ChefHat className="size-4" />
          <span>{pick("قوائم المواد والوصفات (BOM)", "Bill of Materials & Recipes")}</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-secondary text-foreground text-[10px] font-mono">
            {boms.length}
          </span>
        </Btn>

        <Btn
          variant={activeTab === "kanban" ? "solid" : "outline"}
          onClick={() => setActiveTab("kanban")}
          className="text-xs gap-1.5"
        >
          <Layers className="size-4" />
          <span>{pick("لوحة مسار التشغيل (Kanban)", "Production Workflow Board")}</span>
        </Btn>
      </div>

      {/* TAB 1: WORK ORDERS LIST */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/70">
            {/* Status pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {[
                { id: "all", label: pick("الكل", "All") },
                { id: "draft", label: pick("مسودة", "Draft") },
                { id: "confirmed", label: pick("محجوز الخامات", "Reserved") },
                { id: "in_progress", label: pick("قيد التشغيل", "In Production") },
                { id: "qc_check", label: pick("فحص الجودة", "QC Check") },
                { id: "completed", label: pick("مكتمل", "Completed") },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === pill.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={pick("بحث برقم الأمر أو الصنف...", "Search code or product...")}
                className="w-full rounded-lg border border-border bg-secondary/50 ps-9 pe-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-card transition-colors"
              />
            </div>
          </div>

          {/* Orders Table */}
          <Panel title={pick("سجل أوامر التشغيل بالمصنع والمطبخ", "Manufacturing Work Orders Directory")}>
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/70 bg-secondary/40 text-[11px] font-semibold text-muted-foreground">
                    <th className="p-3 text-start">{pick("كود الأمر", "Order Code")}</th>
                    <th className="p-3 text-start">{pick("الصنف تام الصنع", "Finished Product")}</th>
                    <th className="p-3 text-center">{pick("الكمية المستهدفة", "Target Qty")}</th>
                    <th className="p-3 text-start">{pick("المشرف والمسار", "Supervisor")}</th>
                    <th className="p-3 text-center">{pick("تاريخ التسليم", "Due Date")}</th>
                    <th className="p-3 text-center">{pick("مستوى الأولوية", "Priority")}</th>
                    <th className="p-3 text-center">{pick("المرحلة الحالية", "Stage")}</th>
                    <th className="p-3 text-end">{pick("التكلفة الإجمالية", "Total Cost")}</th>
                    <th className="p-3 text-center">{pick("الإجراءات", "Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">
                        {pick("لا توجد أوامر تشغيل مطابقة لمعايير البحث", "No work orders matching search criteria")}
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      return (
                        <tr key={order.id} className="hover:bg-secondary/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-primary">
                            {order.code}
                          </td>
                          <td className="p-3 font-semibold text-foreground">
                            {pick(order.finishedProductName.ar, order.finishedProductName.en)}
                          </td>
                          <td className="p-3 text-center font-mono font-bold">
                            {order.targetQty} {pick(order.unitName.ar, order.unitName.en)}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            <span className="block font-medium text-foreground">{order.supervisor}</span>
                            <span className="text-[10px]">
                              {warehouses.find((w) => w.id === order.destWarehouseId)
                                ? pick(
                                    warehouses.find((w) => w.id === order.destWarehouseId)!.name.ar,
                                    warehouses.find((w) => w.id === order.destWarehouseId)!.name.en
                                  )
                                : ""}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-muted-foreground">
                            {order.dueDate}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                order.priority === "urgent"
                                  ? "bg-rose-500/15 text-rose-600 border border-rose-500/20"
                                  : order.priority === "high"
                                  ? "bg-amber-500/15 text-amber-600 border border-amber-500/20"
                                  : "bg-blue-500/15 text-blue-600 border border-blue-500/20"
                              }`}
                            >
                              {order.priority}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                order.status === "completed"
                                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                  : order.status === "in_progress"
                                  ? "bg-amber-500/15 text-amber-600 border-amber-500/30 animate-pulse"
                                  : order.status === "qc_check"
                                  ? "bg-purple-500/15 text-purple-600 border-purple-500/30"
                                  : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                              }`}
                            >
                              {order.status === "completed" && <CheckCircle2 className="size-3" />}
                              {order.status === "in_progress" && <Flame className="size-3" />}
                              {order.status === "qc_check" && <Check className="size-3" />}
                              <span>
                                {order.status === "draft" && pick("مسودة", "Draft")}
                                {order.status === "confirmed" && pick("حجز الخامات", "Reserved")}
                                {order.status === "in_progress" && pick("قيد الطهي", "In Production")}
                                {order.status === "qc_check" && pick("فحص الجودة", "QC Check")}
                                {order.status === "completed" && pick("تم الإنجاز", "Completed")}
                              </span>
                            </span>
                          </td>
                          <td className="p-3 text-end font-mono font-bold text-foreground">
                            {money(order.totalCost)}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedOrderForDetail(order)}
                                title={pick("عرض مسار التشغيل والتفاصيل", "View workflow & details")}
                                className="size-7 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                              >
                                <Eye className="size-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingOrder(order);
                                  setIsCreateModalOpen(true);
                                }}
                                title={pick("تعديل", "Edit")}
                                className="size-7 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Edit2 className="size-3.5" />
                              </button>
                              <button
                                onClick={() => deleteOrder(order.id)}
                                title={pick("حذف", "Delete")}
                                className="size-7 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-rose-600 transition-colors"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 2: BILL OF MATERIALS & RECIPES */}
      {activeTab === "boms" && (
        <BomTab
          boms={boms}
          products={products}
          units={units}
          onAddBom={addBom}
          onUpdateBom={updateBom}
          onDeleteBom={deleteBom}
        />
      )}

      {/* TAB 3: KANBAN PRODUCTION WORKFLOW */}
      {activeTab === "kanban" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { key: "draft", labelAr: "1. مسودة وتخطيط", labelEn: "1. Draft", color: "border-blue-500/40 bg-blue-500/5" },
            { key: "confirmed", labelAr: "2. تأكيد حجز الخامات", labelEn: "2. Reserved", color: "border-indigo-500/40 bg-indigo-500/5" },
            { key: "in_progress", labelAr: "3. قيد التشغيل بالمطبخ", labelEn: "3. In Production", color: "border-amber-500/40 bg-amber-500/5" },
            { key: "qc_check", labelAr: "4. فحص الجودة (QC)", labelEn: "4. QC Check", color: "border-purple-500/40 bg-purple-500/5" },
            { key: "completed", labelAr: "5. تم الإنتاج والإيداع", labelEn: "5. Completed", color: "border-emerald-500/40 bg-emerald-500/5" },
          ].map((col) => {
            const colOrders = orders.filter((o) => o.status === col.key);
            return (
              <div
                key={col.key}
                className={`rounded-2xl border p-3 flex flex-col gap-3 min-h-[450px] ${col.color}`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <h4 className="text-xs font-bold text-foreground">
                    {pick(col.labelAr, col.labelEn)}
                  </h4>
                  <span className="size-5 rounded-full bg-card border border-border flex items-center justify-center text-[10px] font-bold font-mono">
                    {colOrders.length}
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {colOrders.length === 0 ? (
                    <div className="h-32 flex items-center justify-center text-muted-foreground text-[11px] italic">
                      {pick("لا توجد دفعات", "No orders")}
                    </div>
                  ) : (
                    colOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrderForDetail(order)}
                        className="p-3 rounded-xl border border-border/70 bg-card shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-primary">
                            {order.code}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              order.priority === "urgent"
                                ? "bg-rose-500/15 text-rose-600"
                                : order.priority === "high"
                                ? "bg-amber-500/15 text-amber-600"
                                : "bg-blue-500/15 text-blue-600"
                            }`}
                          >
                            {order.priority}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-foreground line-clamp-1">
                          {pick(order.finishedProductName.ar, order.finishedProductName.en)}
                        </p>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>
                            {order.targetQty} {pick(order.unitName.ar, order.unitName.en)}
                          </span>
                          <span className="font-mono font-semibold text-foreground">
                            {money(order.totalCost)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{order.dueDate}</span>
                          <span className="text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            <span>{pick("عرض", "View")}</span>
                            <ArrowRight className="size-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <WorkOrderFormModal
        open={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingOrder(null);
        }}
        onSubmit={(orderData) => {
          if (editingOrder) {
            updateOrder(editingOrder.id, orderData);
          } else {
            addOrder(orderData);
          }
        }}
        editingOrder={editingOrder}
      />

      <WorkOrderDetailModal
        order={selectedOrderForDetail}
        open={!!selectedOrderForDetail}
        onClose={() => setSelectedOrderForDetail(null)}
        onTransitionStage={transitionStage}
      />
    </div>
  );
}
