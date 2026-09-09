import { useState, useEffect } from "react";
import {
  Factory,
  ChefHat,
  Boxes,
  Calendar,
  UserCheck,
  AlertCircle,
  Plus,
  X,
  Layers,
  Sparkles,
  Calculator,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useInventoryStore,
  type InventoryBom,
  type InventoryWarehouse,
  type InventoryProduct,
} from "@/lib/inventory-store";
import type {
  ManufacturingOrder,
  OrderPriority,
  OrderComponentRequirement,
} from "@/lib/manufacturing-store";

interface WorkOrderFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (order: Omit<ManufacturingOrder, "id">) => void;
  editingOrder?: ManufacturingOrder | null;
}

export function WorkOrderFormModal({
  open,
  onClose,
  onSubmit,
  editingOrder,
}: WorkOrderFormModalProps) {
  const { t, pick, money, dir, lang } = useI18n();
  const { boms, products, warehouses, units } = useInventoryStore();

  const [code, setCode] = useState("");
  const [selectedBomId, setSelectedBomId] = useState("");
  const [targetQty, setTargetQty] = useState<number>(100);
  const [sourceWarehouseId, setSourceWarehouseId] = useState("wh-1");
  const [destWarehouseId, setDestWarehouseId] = useState("wh-2");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [supervisor, setSupervisor] = useState(
    "شيف إبراهيم البدري (كبير حلوانية)"
  );
  const [priority, setPriority] = useState<OrderPriority>("normal");
  const [overheadCost, setOverheadCost] = useState<number>(500);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editingOrder) {
      setCode(editingOrder.code);
      setSelectedBomId(editingOrder.bomId);
      setTargetQty(editingOrder.targetQty);
      setSourceWarehouseId(editingOrder.sourceWarehouseId);
      setDestWarehouseId(editingOrder.destWarehouseId);
      setStartDate(editingOrder.startDate);
      setDueDate(editingOrder.dueDate);
      setSupervisor(editingOrder.supervisor);
      setPriority(editingOrder.priority);
      setOverheadCost(editingOrder.overheadCost);
      setNotes(editingOrder.notes || "");
    } else {
      setCode(`MO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      if (boms.length > 0 && !selectedBomId && boms[0]) {
        setSelectedBomId(boms[0].id);
      }
    }
  }, [editingOrder, open, boms]);

  const selectedBom = boms.find((b) => b.id === selectedBomId) || (boms.length > 0 ? boms[0] : null);
  const finishedProduct = products.find(
    (p) => p.id === selectedBom?.finishedProductId
  );

  // Compute components requirements based on yield multiplier
  const yieldRatio =
    selectedBom && selectedBom.outputYield > 0
      ? targetQty / selectedBom.outputYield
      : 1;

  const componentsRequired: OrderComponentRequirement[] =
    selectedBom?.components.map((comp) => {
      const rawProduct = products.find(
        (p) => p.id === comp.componentProductId || p.id === comp.rawMaterialProductId
      );
      const reqQty = Math.round(comp.quantity * yieldRatio * 100) / 100;
      const unitObj = units.find((u) => u.id === comp.unitId);
      const unitName = unitObj
        ? pick(unitObj.name.ar, unitObj.name.en)
        : "وحدة";
      const unitCost = comp.unitCost || rawProduct?.costPrice || 20;

      return {
        productId: comp.componentProductId || comp.rawMaterialProductId || "raw",
        productName: rawProduct?.name || { ar: "خام مخصص", en: "Custom Raw Material" },
        requiredQty: reqQty,
        unitName,
        unitCost,
        availableStock: rawProduct?.qty ?? 50,
        allocated: true,
      };
    }) || [];

  const estimatedMaterialCost = componentsRequired.reduce(
    (sum, c) => sum + c.requiredQty * c.unitCost,
    0
  );
  const totalEstimatedCost = estimatedMaterialCost + overheadCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBom || !finishedProduct) return;

    const unitObj = units.find((u) => u.id === selectedBom.outputUnitId);
    const unitName = unitObj
      ? unitObj.name
      : { ar: "قطعة", en: "Piece" };

    onSubmit({
      code,
      bomId: selectedBom.id,
      finishedProductId: finishedProduct.id,
      finishedProductName: finishedProduct.name,
      targetQty,
      producedQty: 0,
      unitName,
      sourceWarehouseId,
      destWarehouseId,
      startDate,
      dueDate,
      supervisor,
      estimatedMaterialCost,
      overheadCost,
      totalCost: totalEstimatedCost,
      status: "draft",
      priority,
      componentsRequired,
      qcPassed: false,
      notes,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        dir={dir}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Factory className="size-4" />
            </div>
            <span>
              {editingOrder
                ? pick("تعديل أمر تشغيل وإنتاج", "Edit Manufacturing Order")
                : pick("إصدار أمر تشغيل وإنتاج جديد", "Create Manufacturing Work Order")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Top Bar: Code, Priority, Dates */}
          <div className="grid gap-3 sm:grid-cols-3 bg-secondary/40 p-3 rounded-xl border border-border/70">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("كود أمر الإنتاج", "Work Order Code")}
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("مستوى الأولوية", "Priority Level")}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as OrderPriority)}
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
              >
                <option value="normal">{pick("عادية (Normal)", "Normal")}</option>
                <option value="high">{pick("مرتفعة (High)", "High")}</option>
                <option value="urgent">{pick("عاجلة جداً (Urgent)", "Urgent")}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("المشرف المسؤول", "Production Supervisor")}
              </label>
              <input
                type="text"
                required
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
              />
            </div>
          </div>

          {/* BOM Selection & Target Output */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("قائمة مواد الصنف / الوصفة المعتمدة (BOM)", "Bill of Materials Recipe (BOM)")}
              </label>
              <select
                value={selectedBomId}
                onChange={(e) => setSelectedBomId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold"
              >
                {boms.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {pick(b.name.ar, b.name.en)}
                  </option>
                ))}
              </select>
              {selectedBom && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {pick(
                    `الوجبة القياسية تنتج ${selectedBom.outputYield} حصة`,
                    `Standard batch yields ${selectedBom.outputYield} portions`
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("الكمية المستهدف إنتاجها", "Target Production Quantity")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  required
                  value={targetQty}
                  onChange={(e) => setTargetQty(Math.max(1, Number(e.target.value)))}
                  className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold"
                />
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  {selectedBom
                    ? pick(
                        units.find((u) => u.id === selectedBom.outputUnitId)?.name.ar || "وحدة",
                        units.find((u) => u.id === selectedBom.outputUnitId)?.name.en || "Unit"
                      )
                    : "وحدة"}
                </span>
              </div>
            </div>
          </div>

          {/* Warehouses & Dates */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("مستودع سحب الخامات (المصدر)", "Raw Materials Source Warehouse")}
              </label>
              <select
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {pick(wh.name.ar, wh.name.en)} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("مستودع استلام المنتج التام (الوجهة)", "Finished Goods Destination Warehouse")}
              </label>
              <select
                value={destWarehouseId}
                onChange={(e) => setDestWarehouseId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {pick(wh.name.ar, wh.name.en)} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("تاريخ بدء التشغيل المجدول", "Scheduled Start Date")}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("موعد التسليم المتوقع", "Expected Delivery Date")}
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
              />
            </div>
          </div>

          {/* Components Requirements Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Boxes className="size-3.5 text-primary" />
                <span>
                  {pick(
                    "المكونات والخامات المطلوبة لهذه الدفعة",
                    "Required Ingredients & Components for Batch"
                  )}
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                {componentsRequired.length} {pick("صنف خام", "components")}
              </span>
            </div>

            <div className="rounded-xl border border-border/70 overflow-hidden bg-card text-xs">
              <table className="w-full text-start border-collapse">
                <thead>
                  <tr className="bg-secondary/60 border-b border-border/70 text-[11px] text-muted-foreground">
                    <th className="p-2.5 text-start">{pick("المكون الخام", "Raw Ingredient")}</th>
                    <th className="p-2.5 text-center">{pick("الكمية المطلوبة", "Required")}</th>
                    <th className="p-2.5 text-center">{pick("المخزون المتوفر", "In Stock")}</th>
                    <th className="p-2.5 text-end">{pick("التكلفة التقديرية", "Est. Cost")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {componentsRequired.map((comp, idx) => {
                    const hasShortage = comp.availableStock < comp.requiredQty;
                    return (
                      <tr key={idx} className="hover:bg-secondary/30">
                        <td className="p-2.5 font-medium">
                          {pick(comp.productName.ar, comp.productName.en)}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-foreground">
                          {comp.requiredQty} {comp.unitName}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              hasShortage
                                ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            }`}
                          >
                            {comp.availableStock} {comp.unitName}
                          </span>
                        </td>
                        <td className="p-2.5 text-end font-mono font-bold text-foreground">
                          {money(comp.requiredQty * comp.unitCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost Summary Box */}
          <div className="rounded-xl border border-border/80 bg-secondary/50 p-3 grid gap-3 sm:grid-cols-3 text-xs">
            <div>
              <p className="text-muted-foreground text-[11px]">
                {pick("تكلفة المواد الخام", "Raw Materials Cost")}
              </p>
              <p className="text-sm font-bold font-mono text-foreground">
                {money(estimatedMaterialCost)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">
                {pick("المصاريف غير المباشرة (عمالة وطاقة)", "Overhead & Energy")}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  value={overheadCost}
                  onChange={(e) => setOverheadCost(Number(e.target.value))}
                  className="w-24 rounded border border-border bg-card px-2 py-0.5 font-mono font-bold text-xs"
                />
                <span className="text-[10px] text-muted-foreground">ج.م</span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">
                {pick("إجمالي تكلفة أمر التشغيل", "Total Batch Estimated Cost")}
              </p>
              <p className="text-base font-extrabold font-mono text-primary">
                {money(totalEstimatedCost)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {pick("ملاحظات التشغيل والتحضير", "Production Notes & Special Instructions")}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={pick(
                "أي تعليمات خاصة بدرجات الحرارة، أو التزيين، أو التعبئة والتغليف...",
                "Any special instructions for temperatures, decoration, or packing..."
              )}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Btn variant="outline" type="button" onClick={onClose}>
              {t("cancel")}
            </Btn>
            <Btn variant="solid" type="submit" className="gap-1.5">
              <Plus className="size-4" />
              <span>
                {editingOrder
                  ? pick("حفظ التعديلات", "Save Changes")
                  : pick("تأكيد وإصدار أمر التشغيل", "Confirm & Issue Work Order")}
              </span>
            </Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
