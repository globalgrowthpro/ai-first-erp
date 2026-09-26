import { useEffect, useState, useMemo, useRef } from "react";
import {
  FileText,
  Building2,
  Store,
  Check,
  Phone,
  Plus,
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Package,
  Download,
  Upload,
  CreditCard,
  Wallet,
  Coins,
  Percent,
} from "lucide-react";
import * as XLSX from "xlsx";
import { safeDownloadWorkbook } from "@/lib/excel-utils";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BizDocument, DocumentStatus, InvoiceItem } from "@/lib/documents-store";
import { usePartnersStore } from "@/lib/partners-store";
import { useInventoryStore } from "@/lib/inventory-store";

interface DocumentFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: BizDocument | null;
  suggestedCode: string;
  kind: "sales" | "purchases";
  onSave: (doc: Omit<BizDocument, "id"> & { id?: string }) => void;
}

export interface FormLineItem {
  id: string;
  productId?: string;
  sku: string;
  name: { ar: string; en: string };
  quantity: number;
  unit: { ar: string; en: string };
  unitPrice: number;
  total: number;
}

export function DocumentFormModal({
  open,
  onOpenChange,
  editing,
  suggestedCode,
  kind,
  onSave,
}: DocumentFormModalProps) {
  const { pick, money, dir } = useI18n();
  const { partners } = usePartnersStore();
  const { warehouses, products, units } = useInventoryStore();

  const [code, setCode] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [partyAr, setPartyAr] = useState("");
  const [partyEn, setPartyEn] = useState("");
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<FormLineItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [status, setStatus] = useState<DocumentStatus>("draft");
  const [notes, setNotes] = useState("");
  const [importMsg, setImportMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const relevantPartners = useMemo(() => {
    return partners.filter((p) =>
      kind === "sales" ? p.type === "customer" : p.type === "supplier"
    );
  }, [partners, kind]);

  const activePartner = useMemo(() => {
    return partners.find((p) => p.id === partnerId);
  }, [partners, partnerId]);

  // Recalculate amount, paidAmount, and balance from line items
  const recalcTotal = (currentItems: FormLineItem[], currentStatus: DocumentStatus = status, currentTaxRate: number = taxRate) => {
    const sum = currentItems.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
    const roundedSubtotal = Math.round(sum * 100) / 100;
    setSubtotal(roundedSubtotal);

    const calcTax = roundedSubtotal * (currentTaxRate / 100);
    const roundedTax = Math.max(0, Math.round(calcTax * 100) / 100);
    setTaxAmount(roundedTax);

    const roundedTotal = Math.max(0, Math.round((roundedSubtotal + roundedTax) * 100) / 100);
    setAmount(roundedTotal);

    if (currentStatus === "paid") {
      setPaidAmount(roundedTotal);
      setBalance(0);
    } else if (currentStatus === "draft" || currentStatus === "overdue") {
      setPaidAmount(0);
      setBalance(roundedTotal);
    } else {
      // Partial: maintain paid ratio or clamp paid to total
      setPaidAmount((prevPaid) => {
        const clamped = Math.min(prevPaid, roundedTotal);
        setBalance(Math.max(0, Math.round((roundedTotal - clamped) * 100) / 100));
        return clamped;
      });
    }
  };

  useEffect(() => {
    if (!open) return;
    setImportMsg(null);
    if (editing) {
      setCode(editing.id);
      setPartyAr(editing.party.ar);
      setPartyEn(editing.party.en);
      setDate(editing.date);
      setSubtotal(editing.subtotal ?? editing.amount);
      setTaxRate(editing.taxRate ?? 0);
      setTaxAmount(editing.taxAmount ?? 0);
      setAmount(editing.amount);
      setBalance(editing.balance);
      const existingPaid = Math.max(0, Math.round((editing.amount - editing.balance) * 100) / 100);
      setPaidAmount(existingPaid);
      setPaymentMethod(editing.paymentMethod || "cash");
      setStatus(editing.status);
      setNotes(editing.notes ?? "");

      // Load existing items or build from editing
      if (editing.items && editing.items.length > 0) {
        setItems(
          editing.items.map((it, idx) => {
            const foundProd = products.find(
              (p) => p.sku === it.sku || p.name.ar === it.name.ar || p.name.en === it.name.en
            );
            return {
              id: it.id || `itm-${idx + 1}`,
              productId: foundProd?.id || "",
              sku: it.sku,
              name: it.name,
              quantity: it.quantity,
              unit: it.unit,
              unitPrice: it.unitPrice,
              total: it.total || it.quantity * it.unitPrice,
            };
          })
        );
      } else {
        setItems([
          {
            id: `itm-init-1`,
            sku: `SKU-${editing.id}`,
            name: { ar: editing.party.ar, en: editing.party.en },
            quantity: 1,
            unit: { ar: "طلب", en: "order" },
            unitPrice: editing.amount,
            total: editing.amount,
          },
        ]);
      }

      // Match Partner ID
      if (editing.partnerId) {
        setPartnerId(editing.partnerId);
      } else {
        const found = partners.find(
          (p) => p.name.ar === editing.party.ar || p.name.en === editing.party.en
        );
        setPartnerId(found ? found.id : "");
      }

      // Match Branch ID
      if (editing.branch?.ar) {
        const foundB = warehouses.find(
          (w) => w.name.ar === editing.branch?.ar || w.name.en === editing.branch?.en
        );
        setBranchId(foundB ? foundB.id : warehouses[0]?.id || "");
      } else {
        setBranchId(warehouses[0]?.id || "");
      }
    } else {
      setCode(suggestedCode);
      setPartnerId("");
      setPartyAr("");
      setPartyEn("");
      setDate(new Date().toISOString().slice(0, 10));
      setStatus("draft");
      setPaymentMethod("cash");
      setNotes("");

      // Default branch: retail for sales, kitchen/store for purchases
      const defaultB =
        kind === "sales"
          ? warehouses.find((w) => w.type === "retail") || warehouses[0]
          : warehouses.find((w) => w.type === "kitchen" || w.type === "dry_storage") || warehouses[0];
      setBranchId(defaultB?.id || "");

      // Initialize with 1 default product from catalog
      const initialProd =
        kind === "sales"
          ? products.find((p) => !p.isRawMaterial && p.sellingPrice > 0) || products[0]
          : products.find((p) => p.isRawMaterial && p.costPrice > 0) || products[0];

      if (initialProd) {
        const u = units.find((x) => x.id === initialProd.unitId || x.code === initialProd.unitId);
        const price = kind === "sales" ? initialProd.sellingPrice : initialProd.costPrice;
        const initialItems: FormLineItem[] = [
          {
            id: `itm-${Date.now()}-1`,
            productId: initialProd.id,
            sku: initialProd.sku,
            name: { ar: initialProd.name.ar, en: initialProd.name.en },
            quantity: 1,
            unit: u ? u.name : { ar: "قطعة", en: "pcs" },
            unitPrice: price,
            total: price,
          },
        ];
        setItems(initialItems);
        setSubtotal(price);
        setTaxRate(0);
        setTaxAmount(0);
        setAmount(price);
        setPaidAmount(0);
        setBalance(price);
      } else {
        setItems([]);
        setSubtotal(0);
        setTaxRate(0);
        setTaxAmount(0);
        setAmount(0);
        setPaidAmount(0);
        setBalance(0);
      }
    }
  }, [open, editing, suggestedCode, partners, warehouses, products, units, kind]);

  // When selecting a client/supplier from the directory
  const handlePartnerSelect = (pId: string) => {
    setPartnerId(pId);
    if (!pId) return;
    const selected = partners.find((p) => p.id === pId);
    if (selected) {
      setPartyAr(selected.name.ar);
      setPartyEn(selected.name.en);
    }
  };

  // Add line item
  const handleAddItem = () => {
    const defaultProd =
      kind === "sales"
        ? products.find((p) => !p.isRawMaterial && p.sellingPrice > 0) || products[0]
        : products.find((p) => p.isRawMaterial && p.costPrice > 0) || products[0];

    const u = defaultProd
      ? units.find((x) => x.id === defaultProd.unitId || x.code === defaultProd.unitId)
      : null;
    const price = defaultProd ? (kind === "sales" ? defaultProd.sellingPrice : defaultProd.costPrice) : 0;

    const newItem: FormLineItem = {
      id: `itm-${Date.now()}-${items.length + 1}`,
      productId: defaultProd?.id || "",
      sku: defaultProd?.sku || `SKU-${items.length + 1}`,
      name: defaultProd?.name || { ar: "صنف جديد", en: "New Item" },
      quantity: 1,
      unit: u ? u.name : { ar: "قطعة", en: "pcs" },
      unitPrice: price,
      total: price,
    };

    const updated = [...items, newItem];
    setItems(updated);
    recalcTotal(updated);
  };

  // Remove line item
  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
    recalcTotal(updated);
  };

  // Change product on line item
  const handleProductChange = (index: number, selectedProdId: string) => {
    const current = items[index];
    if (!current) return;
    const newItems = [...items];
    const prod = products.find((p) => p.id === selectedProdId || p.sku === selectedProdId);

    if (prod) {
      const matchedUnit = units.find((u) => u.id === prod.unitId || u.code === prod.unitId);
      const price = kind === "sales" ? (prod.sellingPrice || prod.costPrice * 1.5) : prod.costPrice;
      const qty = current.quantity > 0 ? current.quantity : 1;
      newItems[index] = {
        ...current,
        productId: prod.id,
        sku: prod.sku,
        name: { ar: prod.name.ar, en: prod.name.en },
        unitPrice: price,
        quantity: qty,
        unit: matchedUnit ? matchedUnit.name : { ar: "قطعة", en: "pcs" },
        total: Math.round(qty * price * 100) / 100,
      };
    } else {
      // Custom item
      newItems[index] = {
        ...current,
        productId: "",
        sku: `CUSTOM-${index + 1}`,
        name: { ar: "", en: "" },
      };
    }

    setItems(newItems);
    recalcTotal(newItems);
  };

  // Quantity change
  const handleQtyChange = (index: number, val: number) => {
    const current = items[index];
    if (!current) return;
    const newItems = [...items];
    const q = Math.max(0, val);
    const p = current.unitPrice || 0;
    newItems[index] = {
      ...current,
      quantity: q,
      total: Math.round(q * p * 100) / 100,
    };
    setItems(newItems);
    recalcTotal(newItems);
  };

  // Unit price change
  const handlePriceChange = (index: number, val: number) => {
    const current = items[index];
    if (!current) return;
    const newItems = [...items];
    const p = Math.max(0, val);
    const q = current.quantity || 0;
    newItems[index] = {
      ...current,
      unitPrice: p,
      total: Math.round(q * p * 100) / 100,
    };
    setItems(newItems);
    recalcTotal(newItems);
  };

  // Payment and Settlement Handlers
  const handlePaidAmountChange = (val: number) => {
    const p = Math.max(0, Math.round(val * 100) / 100);
    setPaidAmount(p);
    const rem = Math.max(0, Math.round((amount - p) * 100) / 100);
    setBalance(rem);
    if (p >= amount && amount > 0) {
      setStatus("paid");
    } else if (p > 0 && p < amount) {
      setStatus("partial");
    } else if (p === 0) {
      setStatus("draft");
    }
  };

  const handleBalanceChange = (val: number) => {
    const b = Math.max(0, Math.round(val * 100) / 100);
    setBalance(b);
    const p = Math.max(0, Math.round((amount - b) * 100) / 100);
    setPaidAmount(p);
    if (b === 0 && amount > 0) {
      setStatus("paid");
    } else if (b > 0 && b < amount) {
      setStatus("partial");
    } else if (b >= amount) {
      setStatus("draft");
    }
  };

  const handleStatusChange = (newStatus: DocumentStatus) => {
    setStatus(newStatus);
    if (newStatus === "paid") {
      setPaidAmount(amount);
      setBalance(0);
    } else if (newStatus === "draft" || newStatus === "overdue") {
      setPaidAmount(0);
      setBalance(amount);
    } else if (newStatus === "partial") {
      const half = Math.round((amount / 2) * 100) / 100;
      setPaidAmount(half);
      setBalance(Math.round((amount - half) * 100) / 100);
    }
  };

  const setQuickFullPaid = () => {
    setPaidAmount(amount);
    setBalance(0);
    setStatus("paid");
  };

  const setQuickPartialPaid = () => {
    const half = Math.round((amount / 2) * 100) / 100;
    setPaidAmount(half);
    setBalance(Math.round((amount - half) * 100) / 100);
    setStatus("partial");
  };

  const setQuickUnpaid = () => {
    setPaidAmount(0);
    setBalance(amount);
    setStatus("draft");
  };

  // Download Excel template for line items
  const handleDownloadTemplate = () => {
    const sampleRows = (products.length > 0 ? products.slice(0, 5) : []).map((p, idx) => ({
      "كود_الصنف_SKU": p.sku || `SKU-${1000 + idx}`,
      "اسم_الصنف_Name": pick(p.name.ar, p.name.en),
      "الكمية_Quantity": idx === 0 ? 10 : 5,
      "سعر_الوحدة_Price": kind === "sales" ? (p.sellingPrice || 50) : (p.costPrice || 35),
      "الوحدة_Unit": pick(units.find((u) => u.id === p.unitId)?.name.ar || "قطعة", "pcs"),
      "ملاحظات_Notes": idx === 0 ? "طلب عاجل" : "",
    }));

    if (sampleRows.length === 0) {
      sampleRows.push({
        "كود_الصنف_SKU": "SKU-10025",
        "اسم_الصنف_Name": "طاجن كشري حلو نوتيلا لوتس",
        "الكمية_Quantity": 10,
        "سعر_الوحدة_Price": 100,
        "الوحدة_Unit": "طبق",
        "ملاحظات_Notes": "صنف جاهز",
      });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws["!cols"] = [
      { wch: 18 },
      { wch: 32 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "بنود_الفاتورة_Items");
    const filename = kind === "sales" ? "نموذج_بنود_فاتورة_المبيعات.xlsx" : "نموذج_بنود_أمر_الشراء.xlsx";
    safeDownloadWorkbook(wb, filename);
  };

  // Import items from Excel file
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          setImportMsg({ type: "error", text: pick("الملف لا يحتوي على أوراق عمل", "File has no sheets") });
          return;
        }
        const sheet = wb.Sheets[firstSheetName];
        if (!sheet) return;
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

        if (!rawRows || rawRows.length === 0) {
          setImportMsg({ type: "error", text: pick("لم يتم العثور على أي صفوف في ملف الإكسيل", "No rows found in Excel sheet") });
          return;
        }

        const importedItems: FormLineItem[] = [];

        rawRows.forEach((row, idx) => {
          const rawSku = String(
            row["كود_الصنف_SKU"] ?? row["كود الصنف"] ?? row["كود_الصنف"] ?? row["SKU"] ?? row["sku"] ?? row["Code"] ?? ""
          ).trim();

          const rawName = String(
            row["اسم_الصنف_Name"] ?? row["اسم الصنف"] ?? row["اسم_الصنف"] ?? row["الاسم"] ?? row["Name"] ?? row["Item Name"] ?? ""
          ).trim();

          const rawQty = Number(
            row["الكمية_Quantity"] ?? row["الكمية"] ?? row["كمية"] ?? row["Qty"] ?? row["Quantity"] ?? 1
          ) || 1;

          const rawPrice = Number(
            row["سعر_الوحدة_Price"] ?? row["سعر الوحدة"] ?? row["السعر"] ?? row["Price"] ?? row["Unit Price"] ?? 0
          );

          const rawUnit = String(
            row["الوحدة_Unit"] ?? row["الوحدة"] ?? row["وحدة"] ?? row["Unit"] ?? "قطعة"
          ).trim();

          const matchedProd = products.find(
            (p) => (rawSku && p.sku.toLowerCase() === rawSku.toLowerCase()) ||
                   (rawName && (p.name.ar === rawName || p.name.en.toLowerCase() === rawName.toLowerCase()))
          );

          const unitObj = matchedProd
            ? (units.find((u) => u.id === matchedProd.unitId)?.name || { ar: rawUnit || "قطعة", en: rawUnit || "pcs" })
            : { ar: rawUnit || "قطعة", en: rawUnit || "pcs" };

          const price = rawPrice > 0
            ? rawPrice
            : matchedProd
              ? (kind === "sales" ? matchedProd.sellingPrice : matchedProd.costPrice)
              : 0;

          importedItems.push({
            id: `imp-${Date.now()}-${idx + 1}`,
            productId: matchedProd?.id || "",
            sku: matchedProd?.sku || rawSku || `SKU-${idx + 1}`,
            name: matchedProd ? matchedProd.name : { ar: rawName || `صنف مستورد ${idx + 1}`, en: rawName || `Imported Item ${idx + 1}` },
            quantity: Math.max(0.1, rawQty),
            unit: unitObj,
            unitPrice: price,
            total: Math.round(rawQty * price * 100) / 100,
          });
        });

        if (importedItems.length > 0) {
          setItems(importedItems);
          recalcTotal(importedItems);
          setImportMsg({
            type: "success",
            text: pick(
              `تم استيراد ${importedItems.length} صنف بنجاح من ملف Excel!`,
              `Successfully imported ${importedItems.length} items from Excel!`
            ),
          });
          setTimeout(() => setImportMsg(null), 4500);
        }
      } catch (err) {
        console.error("Excel import error:", err);
        setImportMsg({
          type: "error",
          text: pick("حدث خطأ أثناء قراءة ملف الإكسيل. تأكد من صحة تنسيق الملف.", "Error reading Excel file."),
        });
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyAr.trim() && !partyEn.trim()) return;
    const trimmedNotes = notes.trim();

    const selectedBranch = warehouses.find((w) => w.id === branchId);
    const branchObj = selectedBranch
      ? { ar: selectedBranch.name.ar, en: selectedBranch.name.en }
      : undefined;

    const formattedItems: InvoiceItem[] = items.map((it, idx) => ({
      id: it.id || `itm-${idx + 1}`,
      sku: it.sku || `SKU-${idx + 1}`,
      name: {
        ar: it.name.ar || "بند مبيعات",
        en: it.name.en || "Sales Item",
      },
      quantity: Number(it.quantity) || 1,
      unit: {
        ar: it.unit.ar || "قطعة",
        en: it.unit.en || "pcs",
      },
      unitPrice: Number(it.unitPrice) || 0,
      total: Number(it.total) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
    }));

    onSave({
      id: code.trim(),
      partnerId: partnerId || undefined,
      party: {
        ar: partyAr.trim() || partyEn.trim(),
        en: partyEn.trim() || partyAr.trim(),
      },
      branch: branchObj,
      date: date || new Date().toISOString().slice(0, 10),
      items: formattedItems,
      subtotal: Number(subtotal) || 0,
      taxRate: Number(taxRate) || 0,
      taxAmount: Number(taxAmount) || 0,
      amount: Number(amount) || 0,
      balance: Number(balance) || 0,
      paymentMethod,
      status,
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    });
    onOpenChange(false);
  };

  const partyLabel =
    kind === "sales"
      ? pick({ ar: "العميل", en: "Customer" })
      : pick({ ar: "المورد", en: "Supplier" });

  const title = editing
    ? kind === "sales"
      ? pick({ ar: "تعديل فاتورة بيع", en: "Edit Sales Invoice" })
      : pick({ ar: "تعديل أمر شراء", en: "Edit Purchase Order" })
    : kind === "sales"
      ? pick({ ar: "فاتورة بيع جديدة", en: "New Sales Invoice" })
      : pick({ ar: "أمر شراء جديد", en: "New Purchase Order" });

  const inputCls =
    "w-full h-9 px-2.5 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary";

  const tableInputCls =
    "w-full h-8 px-2 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary transition-all";

  // Check overall stock deficit in sales mode
  const deficitItemsCount =
    kind === "sales"
      ? items.filter((it) => {
          const p = products.find((x) => x.id === it.productId || x.sku === it.sku);
          return p && typeof p.qty === "number" && it.quantity > p.qty;
        }).length
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-y-auto border-0 shadow-2xl p-5 sm:p-6" dir={dir}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <FileText className="w-5 h-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2 text-xs">
          {/* Top Row: Document No. & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">
                {pick({ ar: "رقم المستند", en: "Document No." })}
              </label>
              <input
                type="text"
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${inputCls} font-mono font-bold`}
              />
            </div>

            {/* Branch Selection */}
            <div>
              <label className="block font-medium mb-1 text-muted-foreground flex items-center gap-1.5">
                <Store className="size-3.5 text-primary" />
                <span>{pick("الفرع / منفذ العمليات", "Branch / Operating Facility")} *</span>
              </label>
              <select
                required
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className={`${inputCls} font-semibold`}
              >
                <option value="">-- {pick("اختر الفرع أو المستودع", "Select Branch")} --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    [{w.code}] {pick(w.name.ar, w.name.en)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Fetch Client / Supplier from Directory */}
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Building2 className="size-3.5 text-primary" />
                <span>
                  {kind === "sales"
                    ? pick("اختيار العميل من السجل (Fetch Client)", "Select Client from Records")
                    : pick("اختيار المورد من السجل (Fetch Supplier)", "Select Supplier from Records")}
                </span>
              </label>
              {activePartner && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="size-3" />
                  <span>{pick("تم ربط العميل", "Client linked")}</span>
                </span>
              )}
            </div>

            <select
              value={partnerId}
              onChange={(e) => handlePartnerSelect(e.target.value)}
              className={`${inputCls} font-medium bg-card`}
            >
              <option value="">
                --{" "}
                {kind === "sales"
                  ? pick("اختر عميلاً من المسجلين (أو اكتب أدناه)...", "Select registered client (or type below)...")
                  : pick("اختر مورداً من المسجلين (أو اكتب أدناه)...", "Select registered supplier (or type below)...")}{" "}
                --
              </option>
              {relevantPartners.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {pick(p.name.ar, p.name.en)} {p.phone ? `(${p.phone})` : ""}
                </option>
              ))}
            </select>

            {activePartner && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[10px] text-muted-foreground">
                {activePartner.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3 text-muted-foreground" />
                    <span dir="ltr">{activePartner.phone}</span>
                  </span>
                )}
                {activePartner.taxNumber && (
                  <span>
                    {pick("الضريبي:", "Tax:")}{" "}
                    <strong className="font-mono text-foreground">{activePartner.taxNumber}</strong>
                  </span>
                )}
                {typeof activePartner.balance === "number" && (
                  <span>
                    {pick("الرصيد:", "Balance:")}{" "}
                    <strong className="font-mono text-foreground">{money(activePartner.balance)}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Party Names: Arabic & English */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">
                {partyLabel} ({pick({ ar: "عربي", en: "AR" })}) *
              </label>
              <input
                type="text"
                required
                dir="rtl"
                placeholder={pick("الاسم بالعربية", "Arabic Name")}
                value={partyAr}
                onChange={(e) => setPartyAr(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block font-medium mb-1 text-muted-foreground">
                {partyLabel} ({pick({ ar: "إنجليزي", en: "EN" })})
              </label>
              <input
                type="text"
                dir="ltr"
                placeholder={pick("الاسم بالإنجليزية", "English Name")}
                value={partyEn}
                onChange={(e) => setPartyEn(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Multi-Items Section with Real-Time Stock Availability Checking */}
          <div className="space-y-2.5 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-primary" />
                <span className="font-bold text-foreground text-xs">
                  {kind === "sales"
                    ? pick("بنود ومحتويات الفاتورة (Line Items)", "Invoice Line Items")
                    : pick("بنود ومحتويات أمر الشراء", "Purchase Order Items")}
                </span>
                <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-secondary text-foreground">
                  {items.length} {pick("بند", "items")}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImportExcel}
                />
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-bold transition-colors cursor-pointer"
                >
                  <Download className="size-3.5" />
                  <span>{pick("نموذج إكسيل", "Excel Template")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Upload className="size-3.5" />
                  <span>{pick("استيراد", "Import")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>{pick("إضافة بند", "Add Item")}</span>
                </button>
              </div>
            </div>

            {importMsg && (
              <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${importMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'}`}>
                {importMsg.type === 'success' ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                <span>{importMsg.text}</span>
              </div>
            )}

            {/* Line Items Table */}
            <div className="rounded-xl border border-border overflow-hidden bg-card/60">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-secondary/60 border-b border-border text-[11px] text-muted-foreground font-bold">
                      <th className="p-2 text-center w-8">#</th>
                      <th className="p-2 text-start min-w-[220px]">{pick("الصنف والمنتج (فحص المخزون)", "Item & Availability")}</th>
                      <th className="p-2 text-center w-24">{pick("سعر الوحدة", "Price")}</th>
                      <th className="p-2 text-center w-20">{pick("الكمية", "Qty")}</th>
                      <th className="p-2 text-center w-20">{pick("الوحدة", "Unit")}</th>
                      <th className="p-2 text-end w-28">{pick("الإجمالي", "Total")}</th>
                      <th className="p-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {items.map((item, idx) => {
                      const linkedProd = products.find(
                        (p) => p.id === item.productId || p.sku === item.sku
                      );
                      const stockQty = linkedProd ? linkedProd.qty : undefined;
                      const isOverStock =
                        kind === "sales" &&
                        typeof stockQty === "number" &&
                        item.quantity > stockQty;
                      const isZeroStock =
                        kind === "sales" &&
                        typeof stockQty === "number" &&
                        stockQty <= 0;
                      const isHealthyStock =
                        kind === "sales" &&
                        typeof stockQty === "number" &&
                        stockQty >= item.quantity &&
                        stockQty > 0;

                      return (
                        <tr key={item.id || idx} className="hover:bg-secondary/30 transition-colors align-top">
                          {/* Row Number */}
                          <td className="p-2 align-top text-muted-foreground font-mono text-center text-[10px]">
                            <div className="h-8 flex items-center justify-center font-bold">
                              {idx + 1}
                            </div>
                          </td>

                          {/* Product select & Availability */}
                          <td className="p-2 align-top">
                            <select
                              value={item.productId || ""}
                              onChange={(e) => handleProductChange(idx, e.target.value)}
                              className={`${tableInputCls} text-[11px] font-medium`}
                            >
                              <option value="">
                                -- {pick("اختر صنفاً من المخزون", "Select Product from Inventory")} --
                              </option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  [{p.sku}] {pick(p.name.ar, p.name.en)} | {pick(`متاح: ${p.qty}`, `Stock: ${p.qty}`)} | {money(p.sellingPrice)}
                                </option>
                              ))}
                              <option value="CUSTOM">+ {pick("صنف مخصص / يدوي", "Custom / Manual Item")}</option>
                            </select>

                            {/* Item Availability Indicator */}
                            {kind === "sales" && linkedProd && (
                              <div className="mt-1.5 flex items-center">
                                {isZeroStock ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                                    <AlertCircle className="size-3 shrink-0" />
                                    <span>{pick("الصنف غير متوفر تماماً (رصيد المخزن 0)", "Out of stock (0 in inventory)")}</span>
                                  </span>
                                ) : isOverStock ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                    <AlertTriangle className="size-3 shrink-0" />
                                    <span>
                                      {pick(
                                        `عجز بالمخزون: المتاح (${stockQty})، العجز المطلوبة تغطيته (${(item.quantity - stockQty).toFixed(0)})`,
                                        `Stock shortage: only (${stockQty}) available`
                                      )}
                                    </span>
                                  </span>
                                ) : isHealthyStock ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                                    <CheckCircle2 className="size-3 shrink-0" />
                                    <span>
                                      {pick(
                                        `متوفر بالمخزن (${stockQty} ${pick(item.unit.ar, item.unit.en)} متاح)`,
                                        `In Stock (${stockQty} available)`
                                      )}
                                    </span>
                                  </span>
                                ) : null}
                              </div>
                            )}

                            {/* If custom product, allow typing custom name */}
                            {!item.productId && (
                              <input
                                type="text"
                                placeholder={pick("اكتب اسم الصنف المخصص...", "Type custom item name...")}
                                value={item.name.ar}
                                onChange={(e) => {
                                  setItems((prev) => {
                                    const copy = [...prev];
                                    const target = copy[idx];
                                    if (target) {
                                      copy[idx] = { ...target, name: { ar: e.target.value, en: e.target.value } };
                                    }
                                    return copy;
                                  });
                                }}
                                className={`${tableInputCls} text-[11px] mt-1.5`}
                              />
                            )}
                          </td>

                          {/* Unit Price */}
                          <td className="p-2 align-top">
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={item.unitPrice}
                              onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                              className={`${tableInputCls} text-center font-mono text-[11px]`}
                            />
                          </td>

                          {/* Quantity */}
                          <td className="p-2 align-top">
                            <input
                              type="number"
                              min={0.1}
                              step={1}
                              value={item.quantity}
                              onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                              className={`${tableInputCls} text-center font-mono text-[11px] font-bold`}
                            />
                          </td>

                          {/* Unit */}
                          <td className="p-2 align-top">
                            <input
                              type="text"
                              value={item.unit.ar}
                              onChange={(e) => {
                                setItems((prev) => {
                                  const copy = [...prev];
                                  const target = copy[idx];
                                  if (target) {
                                    copy[idx] = { ...target, unit: { ar: e.target.value, en: e.target.value } };
                                  }
                                  return copy;
                                });
                              }}
                              className={`${tableInputCls} text-center text-[10px]`}
                            />
                          </td>

                          {/* Line Total */}
                          <td className="p-2 align-top">
                            <div className="h-8 flex items-center justify-end font-mono font-bold text-foreground text-xs px-1">
                              {money(item.total)}
                            </div>
                          </td>

                          {/* Delete Action */}
                          <td className="p-2 align-top text-center">
                            <div className="h-8 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                                title={pick("حذف هذا البند", "Remove Item")}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {items.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  <p>
                    {pick(
                      "لا توجد بنود مضافة بعد. انقر على 'إضافة بند جديد' لإدراج أصناف الفاتورة.",
                      "No line items added. Click 'Add Item' to insert invoice items."
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Total items calculation & Deficit alert */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-secondary/40 border border-border text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">
                  {pick("مجموع البنود الإجمالي:", "Total Items Amount:")}
                </span>
                <span className="font-mono font-black text-sm text-foreground">
                  {money(items.reduce((s, it) => s + (it.total || 0), 0))}
                </span>
              </div>

              {deficitItemsCount > 0 && (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5" />
                  <span>
                    {pick(
                      `يوجد ${deficitItemsCount} صنف يتجاوز المخزون الفعلي المتاح`,
                      `${deficitItemsCount} items exceed current stock`
                    )}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Payment & Settlement Section */}
          <div className="space-y-3 pt-4 border-t border-border/80">
            <h3 className="text-xs font-bold flex items-center gap-2 text-foreground">
              <Wallet className="size-4 text-primary" />
              <span>{pick("تفاصيل السداد والتحصيل", "Payment & Settlement Details")}</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "التاريخ", en: "Date" })}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "طريقة الدفع", en: "Payment Method" })}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className={inputCls}
                >
                  <option value="cash">{pick("نقدي (Cash)", "Cash")}</option>
                  <option value="card">{pick("بطاقة (Card/POS)", "Card/POS")}</option>
                  <option value="bank_transfer">{pick("حوالة بنكية", "Bank Transfer")}</option>
                  <option value="check">{pick("شيك", "Check")}</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "حالة السداد", en: "Payment Status" })}
                </label>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as DocumentStatus)}
                  className={`${inputCls} font-bold`}
                >
                  <option value="draft">{pick({ ar: "مسودة (غير مسدد)", en: "Draft (Unpaid)" })}</option>
                  <option value="partial">{pick({ ar: "سداد جزئي", en: "Partial" })}</option>
                  <option value="paid">{pick({ ar: "مسدد بالكامل", en: "Paid in Full" })}</option>
                  <option value="overdue">{pick({ ar: "متأخر السداد", en: "Overdue" })}</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "المجموع الفرعي", en: "Subtotal" })}
                </label>
                <div className={`${inputCls} flex items-center bg-secondary/30 font-mono text-muted-foreground cursor-not-allowed`}>
                  {money(subtotal)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "نسبة الضريبة %", en: "Tax Rate %" })}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate === 0 ? "" : taxRate}
                  onChange={(e) => {
                    const newRate = Number(e.target.value) || 0;
                    setTaxRate(newRate);
                    recalcTotal(items, status, newRate);
                  }}
                  className={`${inputCls} font-mono`}
                  placeholder="15"
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  {pick({ ar: "قيمة الضريبة", en: "Tax Amount" })}
                </label>
                <div className={`${inputCls} flex items-center bg-secondary/30 font-mono text-muted-foreground cursor-not-allowed`}>
                  {money(taxAmount)}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-primary">
                  {pick({ ar: "إجمالي الفاتورة", en: "Total Amount" })}
                </label>
                <div className={`${inputCls} flex items-center bg-primary/10 border-primary/30 font-mono font-black text-primary cursor-not-allowed`}>
                  {money(amount)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-primary/5 border border-primary/20 rounded-xl p-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Coins className="size-3.5" />
                    <span>{pick("المبلغ المدفوع (Paid)", "Paid Amount")}</span>
                  </label>
                  <div className="flex gap-1">
                    <button type="button" onClick={setQuickFullPaid} className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/30 transition-colors">
                      {pick("الكل", "Full")}
                    </button>
                    <button type="button" onClick={setQuickPartialPaid} className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-500/30 transition-colors">
                      {pick("نصف", "Half")}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paidAmount || ''}
                    onChange={(e) => handlePaidAmountChange(Number(e.target.value))}
                    className={`${inputCls} font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm pl-8 text-left`}
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                    {pick("ج.م", "EGP")}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="size-3.5" />
                    <span>{pick("المبلغ المتبقي (Balance Due)", "Balance Due")}</span>
                  </label>
                  <button type="button" onClick={setQuickUnpaid} className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-400 text-[10px] font-bold hover:bg-rose-500/30 transition-colors">
                    {pick("تصفير الدفع", "Unpaid")}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={balance || ''}
                    onChange={(e) => handleBalanceChange(Number(e.target.value))}
                    className={`${inputCls} font-mono font-black text-rose-700 dark:text-rose-400 text-sm pl-8 text-left`}
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                    {pick("ج.م", "EGP")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium mb-1 text-muted-foreground">
              {pick({ ar: "ملاحظات الفاتورة", en: "Invoice Notes" })}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={pick("أي تعليمات خاصة بالتحصيل أو تسليم الطلبية...", "Any delivery or collection instructions...")}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Btn type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {pick({ ar: "إلغاء", en: "Cancel" })}
            </Btn>
            <Btn type="submit" size="sm">
              {editing
                ? pick({ ar: "حفظ التعديل", en: "Save changes" })
                : pick({ ar: "إصدار وحفظ الفاتورة", en: "Create & Save Invoice" })}
            </Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => void;
}) {
  const { pick, dir } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-0 shadow-xl" dir={dir}>
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-destructive">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">{message}</p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Btn variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {pick({ ar: "إلغاء", en: "Cancel" })}
          </Btn>
          <Btn variant="danger" size="sm" onClick={onConfirm}>
            {pick({ ar: "حذف نهائي", en: "Delete" })}
          </Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}
