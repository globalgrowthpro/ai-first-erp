import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Plus,
  Save,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn } from "@/components/kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  Partner,
  PartnerType,
  PartnerGroup,
  PaymentTerms,
} from "@/lib/partners-store";

interface PartnerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (partner: Omit<Partner, "id" | "createdAt" | "transactions">) => void;
  editingPartner?: Partner | null;
}

export function PartnerFormModal({
  open,
  onClose,
  onSubmit,
  editingPartner,
}: PartnerFormModalProps) {
  const { t, pick, dir } = useI18n();

  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [type, setType] = useState<PartnerType>("customer");
  const [group, setGroup] = useState<PartnerGroup>("hotels");
  const [taxNumber, setTaxNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressAr, setAddressAr] = useState("");
  const [addressEn, setAddressEn] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [creditLimit, setCreditLimit] = useState<number>(50000);
  const [balance, setBalance] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>("30_days");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editingPartner) {
      setCode(editingPartner.code);
      setNameAr(editingPartner.name.ar);
      setNameEn(editingPartner.name.en);
      setType(editingPartner.type);
      setGroup(editingPartner.group);
      setTaxNumber(editingPartner.taxNumber);
      setPhone(editingPartner.phone);
      setEmail(editingPartner.email);
      setAddressAr(editingPartner.address.ar);
      setAddressEn(editingPartner.address.en);
      setContactPerson(editingPartner.contactPerson);
      setCreditLimit(editingPartner.creditLimit);
      setBalance(editingPartner.balance);
      setPaymentTerms(editingPartner.paymentTerms);
      setStatus(editingPartner.status);
      setNotes(editingPartner.notes || "");
    } else {
      const prefix = type === "customer" ? "CUST" : "SUPP";
      setCode(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
      setNameAr("");
      setNameEn("");
      setType("customer");
      setGroup("hotels");
      setTaxNumber("");
      setPhone("+20 ");
      setEmail("");
      setAddressAr("");
      setAddressEn("");
      setContactPerson("");
      setCreditLimit(50000);
      setBalance(0);
      setPaymentTerms("30_days");
      setStatus("active");
      setNotes("");
    }
  }, [editingPartner, open, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      code,
      name: { ar: nameAr.trim(), en: nameEn.trim() || nameAr.trim() },
      type,
      group,
      taxNumber,
      phone,
      email,
      address: { ar: addressAr.trim(), en: addressEn.trim() || addressAr.trim() },
      contactPerson,
      creditLimit: Number(creditLimit),
      balance: Number(balance),
      paymentTerms,
      status,
      notes,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        dir={dir}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-4" />
            </div>
            <span>
              {editingPartner
                ? pick("تعديل بيانات العميل / المورد", "Edit Customer / Supplier")
                : pick("إضافة شريك جديد (عميل / مورد)", "Add New Customer or Supplier")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Type Switcher (Customer vs Supplier) */}
          <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-secondary/80 border border-border/80">
            <button
              type="button"
              onClick={() => setType("customer")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                type === "customer"
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="size-3.5" />
              <span>{pick("عميل تجاري (Customer)", "Customer")}</span>
            </button>
            <button
              type="button"
              onClick={() => setType("supplier")}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                type === "supplier"
                  ? "bg-gold text-gold-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="size-3.5" />
              <span>{pick("مورد خامات / تغليف (Supplier)", "Supplier")}</span>
            </button>
          </div>

          {/* Code & Group */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("كود الشريك في الدليل", "Partner Code")}
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
                {pick("تصنيف النشاط / الفئة", "Business Classification")}
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value as PartnerGroup)}
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
              >
                {type === "customer" ? (
                  <>
                    <option value="hotels">{pick("فنادق ومنتجعات (Hotels)", "Hotels & Resorts")}</option>
                    <option value="restaurants">{pick("مطاعم وكافيهات (Restaurants)", "Restaurants & Cafes")}</option>
                    <option value="catering">{pick("تنظيم مناسبات وحفلات (Catering)", "Catering & Events")}</option>
                    <option value="retail">{pick("أفراد ومستهلك مباشر (Retail)", "Retail")}</option>
                  </>
                ) : (
                  <>
                    <option value="raw_ingredients">{pick("خامات غذائية وألبان (Raw Ingredients)", "Ingredients & Dairy")}</option>
                    <option value="packaging">{pick("كرتون وتغليف ومطبوعات (Packaging)", "Packaging & Boxes")}</option>
                    <option value="services">{pick("خدمات ولوجستيات (Logistics & Services)", "Logistics & Services")}</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Names */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("الاسم التجاري (بالعربية)", "Commercial Name (Arabic)")}
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder="مثال: فندق الفورسيزونز نايل بلازا"
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("الاسم التجاري (بالإنجليزية)", "Commercial Name (English)")}
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Four Seasons Nile Plaza"
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Tax Number & Contact Person */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("رقم التسجيل الضريبي / السجل التجاري", "Tax Registration / VAT Number")}
              </label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="xxx-xxx-xxx"
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("الشخص المسؤول / جهة الاتصال", "Contact Person / Rep")}
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="مثال: أ. محمود سامي (مدير المشتريات)"
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
              />
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("رقم الهاتف المحمول / واتساب", "Phone / WhatsApp")}
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("البريد الإلكتروني للمراسلات", "Official Email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="procurement@company.com"
                className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-mono"
              />
            </div>
          </div>

          {/* Credit Limit & Balance & Payment Terms */}
          <div className="grid gap-3 sm:grid-cols-3 bg-secondary/40 p-3 rounded-xl border border-border/70">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("الحد الائتماني المسموح", "Credit Limit")}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground font-semibold">ج.م</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("الرصيد الافتتاحي / الحالي", "Current Balance")}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-muted-foreground font-semibold">ج.م</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {pick("فترة وشروط السداد", "Payment Terms")}
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium"
              >
                <option value="immediate">{pick("فوري عند التسليم", "Immediate")}</option>
                <option value="15_days">{pick("آجل خلال 15 يوماً", "Net 15 Days")}</option>
                <option value="30_days">{pick("آجل خلال 30 يوماً", "Net 30 Days")}</option>
                <option value="45_days">{pick("آجل خلال 45 يوماً", "Net 45 Days")}</option>
                <option value="60_days">{pick("آجل خلال 60 يوماً", "Net 60 Days")}</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {pick("العنوان الجغرافي ومقر التسليم", "Delivery / Factory Address")}
            </label>
            <input
              type="text"
              value={addressAr}
              onChange={(e) => setAddressAr(e.target.value)}
              placeholder="مثال: الحي المالي، العاصمة الإدارية الجديدة، مبنى 4A"
              className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {pick("ملاحظات وشروط خاصة", "Special Notes & Conditions")}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={pick("أي اشتراطات في توريد الفواتير، نسب الخصم المعتمدة...", "Discounts, invoicing cycles...")}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Btn variant="outline" type="button" onClick={onClose}>
              {t("cancel")}
            </Btn>
            <Btn variant="solid" type="submit" className="gap-1.5">
              <Save className="size-4" />
              <span>
                {editingPartner
                  ? pick("تحديث البيانات", "Update Partner")
                  : pick("حفظ وإضافة الشريك", "Save Partner")}
              </span>
            </Btn>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
