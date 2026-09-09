import { useState } from "react";
import {
  Factory,
  ChefHat,
  Boxes,
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Printer,
  Sparkles,
  AlertTriangle,
  Layers,
  Check,
  X,
  FileCheck,
  TrendingUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useInventoryStore } from "@/lib/inventory-store";
import type {
  ManufacturingOrder,
  ProductionStage,
} from "@/lib/manufacturing-store";

interface WorkOrderDetailModalProps {
  order: ManufacturingOrder | null;
  open: boolean;
  onClose: () => void;
  onTransitionStage: (
    id: string,
    nextStage: ProductionStage,
    options?: { qcPassed?: boolean; notes?: string }
  ) => void;
}

const STAGES: { key: ProductionStage; labelAr: string; labelEn: string }[] = [
  { key: "draft", labelAr: "مسودة وتخطيط", labelEn: "Draft" },
  { key: "confirmed", labelAr: "حجز الخامات", labelEn: "Material Check" },
  { key: "in_progress", labelAr: "قيد التشغيل بالمطبخ", labelEn: "In Production" },
  { key: "qc_check", labelAr: "فحص الجودة (QC)", labelEn: "Quality Check" },
  { key: "completed", labelAr: "تم الإنتاج والإضافة", labelEn: "Completed" },
];

export function WorkOrderDetailModal({
  order,
  open,
  onClose,
  onTransitionStage,
}: WorkOrderDetailModalProps) {
  const { t, pick, money, dir, lang } = useI18n();
  const { warehouses, adjustStock } = useInventoryStore();

  const [qcNotes, setQcNotes] = useState("");
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  if (!order) return null;

  const currentStageIndex = STAGES.findIndex((s) => s.key === order.status);
  const sourceWh = warehouses.find((w) => w.id === order.sourceWarehouseId);
  const destWh = warehouses.find((w) => w.id === order.destWarehouseId);

  const handleNextStage = () => {
    if (currentStageIndex >= STAGES.length - 1) return;
    const next = STAGES[currentStageIndex + 1].key;

    // If transitioning to completed, simulate stock movement
    if (next === "completed") {
      // 1. Deduct raw materials from source warehouse
      order.componentsRequired.forEach((comp) => {
        if (comp.productId && comp.requiredQty > 0) {
          adjustStock(comp.productId, -comp.requiredQty);
        }
      });
      // 2. Add finished goods to dest warehouse
      if (order.finishedProductId && order.targetQty > 0) {
        adjustStock(order.finishedProductId, order.targetQty);
      }
    }

    onTransitionStage(order.id, next, {
      qcPassed: next === "completed" || next === "qc_check" ? true : undefined,
      notes: qcNotes || order.notes,
    });

    setIsSuccessToast(true);
    setTimeout(() => setIsSuccessToast(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        dir={dir}
      >
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <ChefHat className="size-5" />
              </div>
              <div>
                <span className="font-mono text-primary mr-1">
                  {order.code}
                </span>
                <span>— {pick(order.finishedProductName.ar, order.finishedProductName.en)}</span>
              </div>
            </DialogTitle>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-secondary/50 text-xs font-semibold hover:bg-secondary transition-colors"
            >
              <Printer className="size-3.5" />
              <span>{pick("طباعة بطاقة التشغيل", "Print Ticket")}</span>
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Workflow Stepper Bar */}
          <div className="rounded-2xl border border-border/80 bg-secondary/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5" />
                <span>{pick("مسار مراحل التصنيع والتشغيل", "Manufacturing Production Workflow")}</span>
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  order.status === "completed"
                    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                    : order.status === "in_progress"
                    ? "bg-amber-500/15 text-amber-600 border-amber-500/30 animate-pulse"
                    : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                }`}
              >
                {pick(
                  STAGES[currentStageIndex]?.labelAr || "",
                  STAGES[currentStageIndex]?.labelEn || ""
                )}
              </span>
            </div>

            {/* Stepper Dots & Line */}
            <div className="relative flex items-center justify-between pt-3 pb-1">
              <div className="absolute top-1/2 left-4 right-4 h-0.5 -translate-y-1/2 bg-border z-0" />
              {STAGES.map((s, idx) => {
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <div
                    key={s.key}
                    className="relative z-10 flex flex-col items-center gap-1"
                  >
                    <div
                      className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                        isPassed
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-card border-2 border-border text-muted-foreground"
                      }`}
                    >
                      {isPassed ? <Check className="size-3.5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] font-semibold text-center max-w-[70px] leading-tight ${
                        isCurrent
                          ? "text-primary font-bold"
                          : isPassed
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {pick(s.labelAr, s.labelEn)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {isSuccessToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                {pick(
                  "تم تحديث مرحلة التشغيل وتحديث الأرصدة بنجاح!",
                  "Stage updated and inventory balances refreshed successfully!"
                )}
              </span>
            </div>
          )}

          {/* Key Metric Highlights */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <p className="text-[11px] text-muted-foreground font-medium">
                {pick("الكمية المستهدفة", "Target Quantity")}
              </p>
              <p className="text-base font-extrabold font-mono mt-0.5">
                {order.targetQty} {pick(order.unitName.ar, order.unitName.en)}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3">
              <p className="text-[11px] text-muted-foreground font-medium">
                {pick("الكمية المنجزة فعلياً", "Produced Quantity")}
              </p>
              <p className="text-base font-extrabold font-mono text-primary mt-0.5">
                {order.producedQty} {pick(order.unitName.ar, order.unitName.en)}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3">
              <p className="text-[11px] text-muted-foreground font-medium">
                {pick("إجمالي التكلفة التقديرية", "Total Batch Cost")}
              </p>
              <p className="text-base font-extrabold font-mono text-emerald-600 mt-0.5">
                {money(order.totalCost)}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3">
              <p className="text-[11px] text-muted-foreground font-medium">
                {pick("فحص الجودة (QC)", "Quality Check")}
              </p>
              <p className="text-xs font-bold mt-1 flex items-center gap-1">
                {order.qcPassed ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" />
                    {pick("مطابق للمواصفات", "Passed QC")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {pick("بانتظار الفحص", "Pending QC")}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Operational Details Grid */}
          <div className="rounded-xl border border-border/70 bg-card p-4 text-xs space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground font-medium">
                  {pick("المشرف المسؤول:", "Supervisor:")}
                </span>{" "}
                <span className="font-bold text-foreground">{order.supervisor}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">
                  {pick("مستوى الأولوية:", "Priority:")}
                </span>{" "}
                <span
                  className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
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
              <div>
                <span className="text-muted-foreground font-medium">
                  {pick("مستودع الخامات:", "Source Warehouse:")}
                </span>{" "}
                <span className="font-bold">
                  {sourceWh ? pick(sourceWh.name.ar, sourceWh.name.en) : order.sourceWarehouseId}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">
                  {pick("مستودع التسليم:", "Destination:")}
                </span>{" "}
                <span className="font-bold">
                  {destWh ? pick(destWh.name.ar, destWh.name.en) : order.destWarehouseId}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">
                  {pick("تاريخ البدء المجدول:", "Scheduled Start:")}
                </span>{" "}
                <span className="font-mono font-semibold">{order.startDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">
                  {pick("تاريخ الإنجاز المطلوب:", "Target Due Date:")}
                </span>{" "}
                <span className="font-mono font-semibold text-primary">{order.dueDate}</span>
              </div>
            </div>

            {order.notes && (
              <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50 text-muted-foreground leading-relaxed">
                <span className="font-bold text-foreground block mb-0.5">
                  {pick("تعليمات وملاحظات التحضير:", "Preparation Instructions:")}
                </span>
                {order.notes}
              </div>
            )}
          </div>

          {/* Raw Materials & Components Consumption Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Boxes className="size-3.5 text-primary" />
              <span>
                {pick("مكونات الوصفة المسحوبة من المطبخ المركزي", "Batch Ingredients Consumed")}
              </span>
            </h4>

            <div className="rounded-xl border border-border/70 overflow-hidden bg-card text-xs">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-secondary/60 border-b border-border/70 text-[11px] text-muted-foreground">
                    <th className="p-2.5 text-start">{pick("المكون الخام", "Ingredient")}</th>
                    <th className="p-2.5 text-center">{pick("الكمية المطلوبة", "Required")}</th>
                    <th className="p-2.5 text-center">{pick("حالة الحجز", "Allocation")}</th>
                    <th className="p-2.5 text-end">{pick("التكلفة", "Cost")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {order.componentsRequired.map((comp, idx) => (
                    <tr key={idx} className="hover:bg-secondary/30">
                      <td className="p-2.5 font-medium">
                        {pick(comp.productName.ar, comp.productName.en)}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        {comp.requiredQty} {comp.unitName}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          <Check className="size-3" />
                          {pick("محجوز ومؤكد", "Allocated")}
                        </span>
                      </td>
                      <td className="p-2.5 text-end font-mono font-semibold">
                        {money(comp.requiredQty * comp.unitCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workflow Stage Transition Control Bar */}
          {order.status !== "completed" && order.status !== "cancelled" && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">
                  {pick("المرحلة التالية الموصى بها:", "Recommended Next Stage:")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {currentStageIndex < STAGES.length - 1
                    ? pick(
                        `الانتقال إلى: ${STAGES[currentStageIndex + 1].labelAr}`,
                        `Advance to: ${STAGES[currentStageIndex + 1].labelEn}`
                      )
                    : ""}
                </p>
              </div>

              <Btn
                variant="solid"
                onClick={handleNextStage}
                className="gap-2 font-bold shadow-md w-full sm:w-auto"
              >
                <span>
                  {currentStageIndex === STAGES.length - 2
                    ? pick("إتمام الدفعة وإضافة المخزون", "Complete & Credit Stock")
                    : pick("ترقية لمرحلة الإنتاج التالية", "Advance to Next Stage")}
                </span>
                <ArrowRight className="size-4" />
              </Btn>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
