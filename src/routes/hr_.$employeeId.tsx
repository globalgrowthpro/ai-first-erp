import { useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, User, Briefcase, FileText, Calendar, AlertTriangle,
  Package, CreditCard, Phone, Mail, MapPin, Building2, Hash, Clock,
  Download, Printer, Edit2, Award, Banknote, ShieldCheck, Plus,
  Trash2, Eye, Upload, HeartPulse, FileSignature, IdCard,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useHrStore, getDefaultAvatar } from "@/lib/hr-store";
import { EmployeeFormModal } from "@/components/hr/EmployeeFormModal";

export const Route = createFileRoute("/hr_/$employeeId")({
  head: () => ({
    meta: [
      { title: "Employee Profile \u2014 Hafez ERP" },
      { name: "description", content: "Full employee dossier with overview, recruitment, custody, leaves, penalties, documents, and ID card." },
    ],
  }),
  component: EmployeeDetailPage,
});

type TabId = "overview" | "recruitment" | "custody" | "leaves" | "penalties" | "documents" | "idcard";

const TABS: { id: TabId; labelAr: string; labelEn: string; icon: React.ElementType }[] = [
  { id: "overview",    labelAr: "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629",     labelEn: "Overview",    icon: User },
  { id: "recruitment", labelAr: "\u0627\u0644\u062a\u0648\u0638\u064a\u0641 \u0648\u0627\u0644\u0639\u0642\u062f", labelEn: "Recruitment", icon: FileSignature },
  { id: "custody",     labelAr: "\u0627\u0644\u0639\u0647\u062f\u0629",          labelEn: "Custody",     icon: Package },
  { id: "leaves",      labelAr: "\u0627\u0644\u0625\u062c\u0627\u0632\u0627\u062a",        labelEn: "Leaves",      icon: Calendar },
  { id: "penalties",   labelAr: "\u0627\u0644\u062c\u0632\u0627\u0621\u0627\u062a",        labelEn: "Penalties",   icon: AlertTriangle },
  { id: "documents",   labelAr: "\u0627\u0644\u0648\u062b\u0627\u0626\u0642",         labelEn: "Documents",   icon: FileText },
  { id: "idcard",      labelAr: "\u0627\u0644\u0647\u0648\u064a\u0629 \u0627\u0644\u0648\u0638\u064a\u0641\u064a\u0629", labelEn: "ID Card",     icon: IdCard },
];

function fmt(n: number) { return new Intl.NumberFormat("en-EG").format(n) + " EGP"; }
function fmtDate(d: string) {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function statusBadge(s: string) {
  const m: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20",
    on_leave: "bg-blue-500/15 text-blue-600 border border-blue-500/20",
    probation: "bg-amber-500/15 text-amber-700 border border-amber-500/20",
    suspended: "bg-rose-500/15 text-rose-600 border border-rose-500/20",
    terminated: "bg-slate-500/15 text-slate-600 border border-slate-500/20",
  };
  return m[s] ?? "bg-muted text-muted-foreground";
}
function statusLabel(s: string, pick: (a: string, b: string) => string) {
  const m: Record<string, [string, string]> = {
    active: ["\u0639\u0644\u0649 \u0631\u0623\u0633 \u0627\u0644\u0639\u0645\u0644", "Active"],
    on_leave: ["\u0641\u064a \u0625\u062c\u0627\u0632\u0629", "On Leave"],
    probation: ["\u0641\u062a\u0631\u0629 \u0627\u062e\u062a\u0628\u0627\u0631", "Probation"],
    suspended: ["\u0645\u0648\u0642\u0648\u0641", "Suspended"],
    terminated: ["\u0645\u0646\u062a\u0647\u064a \u0627\u0644\u062e\u062f\u0645\u0629", "Terminated"],
  };
  const [ar, en] = m[s] ?? ["\u2014", "\u2014"];
  return pick(ar, en);
}

const SAMPLE_CUSTODY = [
  { id: "c1", item: "\u0644\u0627\u0628\u062a\u0648\u0628 Dell XPS 15", itemEn: "Dell XPS 15 Laptop", serial: "DX15-92881", dateIssued: "2023-02-01" },
  { id: "c2", item: "\u0647\u0627\u062a\u0641 iPhone 14 Pro", itemEn: "iPhone 14 Pro", serial: "IPH14-44210", dateIssued: "2023-02-01" },
  { id: "c3", item: "\u0633\u064a\u0627\u0631\u0629 Toyota Corolla", itemEn: "Company Car Toyota Corolla", serial: "VHC-2023-14", dateIssued: "2023-03-10" },
];
const SAMPLE_PENALTIES = [
  { id: "p1", date: "2024-05-12", type: "\u062a\u0623\u062e\u0631 \u0645\u062a\u0643\u0631\u0631", typeEn: "Repeated Tardiness", amount: 500, notes: "\u062a\u0623\u062e\u0631 3 \u0645\u0631\u0627\u062a \u0641\u064a \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u0623\u0648\u0644 \u0645\u0646 \u0645\u0627\u064a\u0648" },
  { id: "p2", date: "2025-01-20", type: "\u0645\u062e\u0627\u0644\u0641\u0629 \u0625\u062c\u0631\u0627\u0621\u0627\u062a", typeEn: "Procedure Violation", amount: 1000, notes: "\u0639\u062f\u0645 \u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645 \u0628\u0625\u062c\u0631\u0627\u0621\u0627\u062a \u0627\u0644\u0633\u0644\u0627\u0645\u0629" },
];
const SAMPLE_DOCS = [
  { id: "d1", name: "\u0639\u0642\u062f \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0623\u0635\u0644\u064a", nameEn: "Original Employment Contract", type: "PDF", date: "2023-01-10", size: "420 KB" },
  { id: "d2", name: "\u0635\u0648\u0631\u0629 \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0642\u0648\u0645\u064a", nameEn: "National ID Copy", type: "JPG", date: "2023-01-10", size: "185 KB" },
  { id: "d3", name: "\u0627\u0644\u0634\u0647\u0627\u062f\u0629 \u0627\u0644\u0635\u062d\u064a\u0629", nameEn: "Health Certificate", type: "PDF", date: "2026-01-05", size: "310 KB" },
  { id: "d4", name: "\u0627\u0644\u0645\u0624\u0647\u0644 \u0627\u0644\u062f\u0631\u0627\u0633\u064a", nameEn: "Academic Certificate", type: "PDF", date: "2023-01-10", size: "540 KB" },
];
const REC = {
  applicationDate: "2022-12-01", offerDate: "2023-01-02", startDate: "2023-01-10",
  probationEnd: "2023-07-10", interviewScore: 88, referredBy: "\u0645. \u062d\u0627\u0641\u0638 \u0631\u062d\u064a\u0645",
  source: "LinkedIn", previousEmployer: "\u0641\u0646\u062f\u0642 \u0645\u0627\u0631\u064a\u0648\u062a \u2014 \u0627\u0644\u0642\u0627\u0647\u0631\u0629",
  previousTitle: "\u0645\u0633\u0627\u0639\u062f \u0645\u062f\u064a\u0631 \u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629", noticePeriod: "\u0634\u0647\u0631 \u0648\u0627\u062d\u062f",
};

function QrPlaceholder({ size, value }: { size: number; value: string }) {
  const cells = 9; const cell = size / cells;
  const hash = value.split("").reduce((a, c, i) => a + c.charCodeAt(0) * (i + 7), 0);
  const bits = Array.from({ length: cells * cells }, (_, i) => ((hash * (i + 3)) & (1 << (i % 8))) !== 0);
  const corners = new Set<number>();
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    corners.add(r * cells + c); corners.add(r * cells + (cells - 1 - c));
    corners.add((cells - 1 - r) * cells + c);
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: 4 }}>
      <rect width={size} height={size} fill="white" rx="3" />
      {bits.map((on, i) => {
        const row = Math.floor(i / cells); const col = i % cells; const isC = corners.has(i);
        return (on || isC) ? <rect key={i} x={col*cell+1} y={row*cell+1} width={cell-1} height={cell-1} fill={isC ? "#312e81" : "#0f172a"} rx="0.5" /> : null;
      })}
    </svg>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
        <Icon className="size-3.5 text-primary" />
        <span className="text-xs font-bold text-foreground">{title}</span>
      </div>
      <div className="p-4 space-y-2.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className={`text-[11px] font-semibold text-foreground text-end break-all ${mono ? "font-mono" : ""}`}>{value || "\u2014"}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, titleAr, titleEn, subtitleAr, subtitleEn }: {
  icon: React.ElementType; titleAr: string; titleEn: string; subtitleAr: string; subtitleEn: string;
}) {
  const { pick } = useI18n();
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-center">
      <div className="size-14 rounded-full bg-muted flex items-center justify-center"><Icon className="size-7 text-muted-foreground" /></div>
      <p className="text-sm font-semibold text-foreground">{pick(titleAr, titleEn)}</p>
      <p className="text-xs text-muted-foreground max-w-xs">{pick(subtitleAr, subtitleEn)}</p>
    </div>
  );
}

function EmployeeDetailPage() {
  const { employeeId } = Route.useParams();
  const { employees, leaves, updateEmployee } = useHrStore();
  const { pick } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [editOpen, setEditOpen] = useState(false);
  const idCardRef = useRef<HTMLDivElement>(null);

  const emp = employees.find((e) => e.id === employeeId);

  if (!emp) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="size-20 rounded-full bg-rose-500/10 flex items-center justify-center">
          <User className="size-10 text-rose-500" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{pick("\u0627\u0644\u0645\u0648\u0638\u0641 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f", "Employee Not Found")}</p>
          <p className="text-sm text-muted-foreground mt-1">{pick("\u0642\u062f \u064a\u0643\u0648\u0646 \u0627\u0644\u0645\u0648\u0638\u0641 \u0645\u062d\u0630\u0648\u0641\u0627\u064b \u0623\u0648 \u0627\u0644\u0631\u0627\u0628\u0637 \u062e\u0627\u0637\u0626\u0627\u064b", "Employee may have been deleted or the link is incorrect")}</p>
        </div>
        <Link to="/hr" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {pick("\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0648\u0627\u0631\u062f \u0627\u0644\u0628\u0634\u0631\u064a\u0629", "Back to HR")}
        </Link>
      </div>
    );
  }

  const avatarSrc = emp.avatarUrl || getDefaultAvatar(emp.gender, emp.code);
  const totalGross = emp.compensation.basicSalary + emp.compensation.housingAllowance + emp.compensation.transportAllowance + emp.compensation.foodAllowance + emp.compensation.kpiBonus;
  const netSalary = totalGross - totalGross * emp.compensation.socialInsuranceRate - totalGross * emp.compensation.taxRate;
  const empLeaves = leaves.filter((l) => l.employeeId === emp.id);
  const annualRemaining = emp.leaveBalances.annualTotal - emp.leaveBalances.annualUsed;

  const handlePrint = () => {
    if (!idCardRef.current) return;
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(`<html><head><title>ID Card</title><style>body{margin:0;padding:20px;background:#f0f4f8;display:flex;justify-content:center;align-items:center;font-family:system-ui,sans-serif}</style></head><body>${idCardRef.current.outerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 500);
  };

  return (
    <div className="space-y-4">
      {/* Top Return Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/hr"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shadow-xs group"
        >
          <ArrowLeft className="size-3.5 rtl:rotate-180 group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 transition-transform" />
          <span>{pick("العودة إلى الموارد البشرية", "Back to HR Directory")}</span>
        </Link>
        <span className="text-xs font-mono text-muted-foreground">
          {emp.code}
        </span>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl mb-6" style={{ background: "linear-gradient(135deg, hsl(var(--primary)/0.12) 0%, hsl(var(--primary)/0.04) 100%)", border: "1px solid hsl(var(--primary)/0.15)" }}>
        <div className="absolute top-0 end-0 size-64 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
        <div className="relative p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <div className="relative shrink-0">
            <div className="size-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
              <img src={avatarSrc} alt={pick(emp.name.ar, emp.name.en)} className="size-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; const s = e.currentTarget.nextElementSibling as HTMLElement; if (s) s.style.display = "flex"; }} />
              <div style={{ display: "none" }} className={`size-full bg-gradient-to-br ${emp.avatarBg} text-white items-center justify-center font-bold text-2xl`}>{emp.avatarInitials}</div>
            </div>
            <span className={`absolute -bottom-1 -end-1 size-5 rounded-full border-2 border-background ${emp.status === "active" ? "bg-emerald-500" : emp.status === "on_leave" ? "bg-blue-500" : "bg-amber-500"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">{emp.code}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(emp.status)}`}>{statusLabel(emp.status, pick)}</span>
              <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">{emp.gender === "male" ? pick("\u0630\u0643\u0631", "Male") : pick("\u0623\u0646\u062b\u0649", "Female")}</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground truncate">{pick(emp.name.ar, emp.name.en)}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{pick(emp.positionName.ar, emp.positionName.en)}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="size-3.5" />{pick(emp.departmentName.ar, emp.departmentName.en)}</span>
              <span className="flex items-center gap-1"><MapPin className="size-3.5" />{pick(emp.branchName.ar, emp.branchName.en)}</span>
              <span className="flex items-center gap-1"><Clock className="size-3.5" />{pick("\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0639\u064a\u064a\u0646:", "Hired:")} {fmtDate(emp.hireDate)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0 shrink-0">
            <button onClick={() => setEditOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background/80 text-xs font-medium text-foreground hover:bg-accent transition-colors">
              <Edit2 className="size-3.5" />{pick("\u062a\u0639\u062f\u064a\u0644", "Edit")}
            </button>
            <button onClick={() => setActiveTab("idcard")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
              <IdCard className="size-3.5" />{pick("\u0627\u0644\u0647\u0648\u064a\u0629 \u0627\u0644\u0648\u0638\u064a\u0641\u064a\u0629", "ID Card")}
            </button>
          </div>
        </div>
        <div className="border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/40 rtl:divide-x-reverse">
          {[
            { labelAr: "\u0627\u0644\u0631\u0627\u062a\u0628 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a", labelEn: "Gross Salary", value: fmt(totalGross), Icon: Banknote, color: "text-emerald-600" },
            { labelAr: "\u0635\u0627\u0641\u064a \u0627\u0644\u0631\u0627\u062a\u0628", labelEn: "Net Salary", value: fmt(netSalary), Icon: CreditCard, color: "text-blue-600" },
            { labelAr: "\u0631\u0635\u064a\u062f \u0627\u0644\u0625\u062c\u0627\u0632\u0629", labelEn: "Leave Balance", value: `${annualRemaining} ${pick("\u064a\u0648\u0645", "days")}`, Icon: Calendar, color: "text-violet-600" },
            {
              labelAr: "\u0627\u0644\u0634\u0647\u0627\u062f\u0629 \u0627\u0644\u0635\u062d\u064a\u0629", labelEn: "Health Cert",
              value: emp.healthCert.status === "valid" ? pick("\u0633\u0627\u0631\u064a\u0629", "Valid") : emp.healthCert.status === "expiring_soon" ? pick("\u062a\u0646\u062a\u0647\u064a \u0642\u0631\u064a\u0628\u0627\u064b", "Expiring") : pick("\u0645\u0646\u062a\u0647\u064a\u0629", "Expired"),
              Icon: HeartPulse,
              color: emp.healthCert.status === "valid" ? "text-emerald-600" : emp.healthCert.status === "expiring_soon" ? "text-amber-600" : "text-rose-600",
            },
          ].map((s) => (
            <div key={s.labelEn} className="px-4 py-3 flex items-center gap-3">
              <s.Icon className={`size-5 shrink-0 ${s.color}`} />
              <div>
                <p className="text-[10px] text-muted-foreground">{pick(s.labelAr, s.labelEn)}</p>
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 mb-4">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <tab.icon className="size-3.5" />
              {pick(tab.labelAr, tab.labelEn)}
            </button>
          );
        })}
      </div>

      <div>
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <InfoCard title={pick("\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0634\u062e\u0635\u064a\u0629", "Personal Information")} icon={User}>
              <InfoRow label={pick("\u0627\u0644\u0627\u0633\u0645 (\u0639\u0631\u0628\u064a)", "Full Name (AR)")} value={emp.name.ar} />
              <InfoRow label={pick("\u0627\u0644\u0627\u0633\u0645 (\u0625\u0646\u062c\u0644\u064a\u0632\u064a)", "Full Name (EN)")} value={emp.name.en} />
              <InfoRow label={pick("\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0642\u0648\u0645\u064a", "National ID")} value={emp.nationalId} mono />
              <InfoRow label={pick("\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a", "Email")} value={emp.email} />
              <InfoRow label={pick("\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641", "Phone")} value={emp.phone} mono />
              <InfoRow label={pick("\u062c\u0647\u0629 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0627\u0644\u0637\u0627\u0631\u0626", "Emergency Contact")} value={`${emp.emergencyContact.name} \u2014 ${emp.emergencyContact.phone}`} />
              <InfoRow label={pick("\u0635\u0644\u0629 \u0627\u0644\u0642\u0631\u0627\u0628\u0629", "Relation")} value={pick(emp.emergencyContact.relation.ar, emp.emergencyContact.relation.en)} />
            </InfoCard>
            <InfoCard title={pick("\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0648\u0638\u064a\u0641\u0629", "Employment Details")} icon={Briefcase}>
              <InfoRow label={pick("\u0627\u0644\u0625\u062f\u0627\u0631\u0629", "Department")} value={pick(emp.departmentName.ar, emp.departmentName.en)} />
              <InfoRow label={pick("\u0627\u0644\u0645\u0633\u0645\u0649 \u0627\u0644\u0648\u0638\u064a\u0641\u064a", "Position")} value={pick(emp.positionName.ar, emp.positionName.en)} />
              <InfoRow label={pick("\u0627\u0644\u0641\u0631\u0639 / \u0627\u0644\u0645\u0648\u0642\u0639", "Branch")} value={pick(emp.branchName.ar, emp.branchName.en)} />
              <InfoRow label={pick("\u0627\u0644\u0645\u062f\u064a\u0631 \u0627\u0644\u0645\u0628\u0627\u0634\u0631", "Direct Manager")} value={emp.directManager} />
              <InfoRow label={pick("\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0639\u064a\u064a\u0646", "Hire Date")} value={fmtDate(emp.hireDate)} />
              <InfoRow label={pick("\u0646\u0648\u0639 \u0627\u0644\u062a\u0639\u0627\u0642\u062f", "Contract Type")} value={emp.contractType} />
              <InfoRow label={pick("\u0646\u0648\u0639 \u0627\u0644\u062f\u0648\u0627\u0645", "Employment Type")} value={emp.employmentType.replace("_", " ")} />
            </InfoCard>
            <InfoCard title={pick("\u0627\u0644\u0631\u0627\u062a\u0628 \u0648\u0627\u0644\u0628\u0646\u0643", "Compensation & Banking")} icon={Banknote}>
              <InfoRow label={pick("\u0627\u0644\u0631\u0627\u062a\u0628 \u0627\u0644\u0623\u0633\u0627\u0633\u064a", "Basic Salary")} value={fmt(emp.compensation.basicSalary)} mono />
              <InfoRow label={pick("\u0628\u062f\u0644 \u0627\u0644\u0633\u0643\u0646", "Housing")} value={fmt(emp.compensation.housingAllowance)} mono />
              <InfoRow label={pick("\u0628\u062f\u0644 \u0627\u0644\u0645\u0648\u0627\u0635\u0644\u0627\u062a", "Transport")} value={fmt(emp.compensation.transportAllowance)} mono />
              <InfoRow label={pick("\u0628\u062f\u0644 \u0627\u0644\u063a\u0630\u0627\u0621", "Food")} value={fmt(emp.compensation.foodAllowance)} mono />
              <InfoRow label={pick("\u0645\u0643\u0627\u0641\u0623\u0629 \u0627\u0644\u0623\u062f\u0627\u0621", "KPI Bonus")} value={fmt(emp.compensation.kpiBonus)} mono />
              <div className="border-t border-border/50 pt-2 mt-1">
                <InfoRow label={pick("\u0627\u0644\u0628\u0646\u0643", "Bank")} value={emp.bank.bankName} />
                <InfoRow label={pick("\u0631\u0642\u0645 \u0627\u0644\u062d\u0633\u0627\u0628", "Account #")} value={emp.bank.accountNumber} mono />
                <InfoRow label="IBAN" value={emp.bank.iban} mono />
                {emp.bank.walletNumber && <InfoRow label={pick("\u0645\u062d\u0641\u0638\u0629 \u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a\u0629", "E-Wallet")} value={emp.bank.walletNumber} mono />}
              </div>
            </InfoCard>
            <div className="lg:col-span-3">
              <InfoCard title={pick("\u0623\u0631\u0635\u062f\u0629 \u0627\u0644\u0625\u062c\u0627\u0632\u0627\u062a", "Leave Balances")} icon={Calendar}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  {[
                    { labelAr: "\u0625\u062c\u0627\u0632\u0629 \u0633\u0646\u0648\u064a\u0629", labelEn: "Annual Leave", total: emp.leaveBalances.annualTotal, used: emp.leaveBalances.annualUsed, color: "#6366f1" },
                    { labelAr: "\u0625\u062c\u0627\u0632\u0629 \u0645\u0631\u0636\u064a\u0629", labelEn: "Sick Leave", total: emp.leaveBalances.sickTotal, used: emp.leaveBalances.sickUsed, color: "#f59e0b" },
                    { labelAr: "\u0625\u062c\u0627\u0632\u0629 \u0637\u0627\u0631\u0626\u0629", labelEn: "Emergency", total: emp.leaveBalances.emergencyTotal, used: emp.leaveBalances.emergencyUsed, color: "#ef4444" },
                  ].map((lb) => {
                    const pct = lb.total > 0 ? Math.round((lb.used / lb.total) * 100) : 0;
                    return (
                      <div key={lb.labelEn} className="p-4 rounded-xl bg-muted/40 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-foreground">{pick(lb.labelAr, lb.labelEn)}</span>
                          <span className="text-xs font-mono text-muted-foreground">{lb.used}/{lb.total}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: lb.color }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">{pick("\u0645\u062a\u0628\u0642\u064a", "Remaining")}: <span className="font-bold text-foreground">{lb.total - lb.used} {pick("\u064a\u0648\u0645", "days")}</span></p>
                      </div>
                    );
                  })}
                </div>
              </InfoCard>
            </div>
          </div>
        )}

        {/* RECRUITMENT */}
        {activeTab === "recruitment" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InfoCard title={pick("\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062a\u0642\u062f\u064a\u0645 \u0648\u0627\u0644\u062a\u0648\u0638\u064a\u0641", "Application & Hiring Info")} icon={FileSignature}>
              <InfoRow label={pick("\u0645\u0635\u062f\u0631 \u0627\u0644\u062a\u0642\u062f\u064a\u0645", "Source")} value={REC.source} />
              <InfoRow label={pick("\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0642\u062f\u064a\u0645", "Application Date")} value={fmtDate(REC.applicationDate)} />
              <InfoRow label={pick("\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0639\u0631\u0636", "Offer Date")} value={fmtDate(REC.offerDate)} />
              <InfoRow label={pick("\u062a\u0627\u0631\u064a\u062e \u0628\u062f\u0621 \u0627\u0644\u0639\u0645\u0644", "Start Date")} value={fmtDate(REC.startDate)} />
              <InfoRow label={pick("\u0646\u0647\u0627\u064a\u0629 \u0641\u062a\u0631\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631", "Probation Ends")} value={fmtDate(REC.probationEnd)} />
              <InfoRow label={pick("\u0645\u0631\u0634\u062d \u0645\u0646 \u0642\u0650\u0628\u064e\u0644", "Referred By")} value={REC.referredBy} />
              <InfoRow label={pick("\u0641\u062a\u0631\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631", "Notice Period")} value={REC.noticePeriod} />
            </InfoCard>
            <InfoCard title={pick("\u0627\u0644\u062e\u0644\u0641\u064a\u0629 \u0627\u0644\u0645\u0647\u0646\u064a\u0629", "Professional Background")} icon={Award}>
              <InfoRow label={pick("\u0635\u0627\u062d\u0628 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u0633\u0627\u0628\u0642", "Previous Employer")} value={REC.previousEmployer} />
              <InfoRow label={pick("\u0627\u0644\u0645\u0633\u0645\u0649 \u0627\u0644\u0633\u0627\u0628\u0642", "Previous Title")} value={REC.previousTitle} />
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">{pick("\u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0645\u0642\u0627\u0628\u0644\u0629", "Interview Score")}</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500" style={{ width: `${REC.interviewScore}%` }} />
                  </div>
                  <span className="text-sm font-bold text-primary">{REC.interviewScore}/100</span>
                </div>
              </div>
            </InfoCard>
            <div className="lg:col-span-2">
              <InfoCard title={pick("\u0628\u0646\u0648\u062f \u0627\u0644\u0639\u0642\u062f \u0648\u0627\u0644\u062a\u0639\u0627\u0642\u062f", "Contract Terms")} icon={FileText}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  {[
                    { labelAr: "\u0646\u0648\u0639 \u0627\u0644\u0639\u0642\u062f", labelEn: "Contract Type", value: emp.contractType },
                    { labelAr: "\u0646\u0648\u0639 \u0627\u0644\u062f\u0648\u0627\u0645", labelEn: "Employment Type", value: emp.employmentType.replace("_", " ") },
                    { labelAr: "\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062a\u0639\u064a\u064a\u0646", labelEn: "Hire Date", value: fmtDate(emp.hireDate) },
                  ].map((c) => (
                    <div key={c.labelEn} className="p-4 rounded-xl bg-muted/40 border border-border/50">
                      <p className="text-[10px] text-muted-foreground mb-1">{pick(c.labelAr, c.labelEn)}</p>
                      <p className="text-sm font-semibold text-foreground">{c.value}</p>
                    </div>
                  ))}
                </div>
              </InfoCard>
            </div>
          </div>
        )}

        {/* CUSTODY */}
        {activeTab === "custody" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Package className="size-4 text-primary" />{pick("\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0647\u062f\u0629 \u0648\u0627\u0644\u0623\u0635\u0648\u0644 \u0627\u0644\u0645\u062e\u0635\u0635\u0629", "Assigned Assets & Custody Items")}</h2>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"><Plus className="size-3.5" />{pick("\u0625\u0636\u0627\u0641\u0629 \u0639\u0647\u062f\u0629", "Add Item")}</button>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {[pick("\u0627\u0644\u0628\u0646\u062f", "Item"), pick("\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u062a\u0633\u0644\u0633\u0644\u064a", "Serial #"), pick("\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0633\u062a\u0644\u0627\u0645", "Date Issued"), pick("\u0627\u0644\u062d\u0627\u0644\u0629", "Condition"), ""].map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-start text-[11px] font-bold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {SAMPLE_CUSTODY.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Package className="size-4 text-primary" /></div><span className="text-xs font-semibold text-foreground">{pick(c.item, c.itemEn)}</span></div></td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.serial}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(c.dateIssued)}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">{pick("\u062c\u064a\u062f", "Good")}</span></td>
                      <td className="px-4 py-3"><button className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"><Trash2 className="size-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LEAVES */}
        {activeTab === "leaves" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Calendar className="size-4 text-primary" />{pick("\u0633\u062c\u0644 \u0627\u0644\u0625\u062c\u0627\u0632\u0627\u062a", "Leave History")}</h2>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"><Plus className="size-3.5" />{pick("\u0637\u0644\u0628 \u0625\u062c\u0627\u0632\u0629", "Request Leave")}</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { labelAr: "\u0625\u062c\u0627\u0632\u0629 \u0633\u0646\u0648\u064a\u0629", labelEn: "Annual Leave", total: emp.leaveBalances.annualTotal, used: emp.leaveBalances.annualUsed, color: "from-violet-500 to-indigo-600" },
                { labelAr: "\u0625\u062c\u0627\u0632\u0629 \u0645\u0631\u0636\u064a\u0629", labelEn: "Sick Leave", total: emp.leaveBalances.sickTotal, used: emp.leaveBalances.sickUsed, color: "from-amber-500 to-orange-600" },
                { labelAr: "\u0625\u062c\u0627\u0632\u0629 \u0637\u0627\u0631\u0626\u0629", labelEn: "Emergency", total: emp.leaveBalances.emergencyTotal, used: emp.leaveBalances.emergencyUsed, color: "from-rose-500 to-pink-600" },
              ].map((lb) => (
                <div key={lb.labelEn} className={`p-4 rounded-xl text-white bg-gradient-to-br ${lb.color}`}>
                  <p className="text-xs font-semibold opacity-80">{pick(lb.labelAr, lb.labelEn)}</p>
                  <p className="text-3xl font-black mt-1">{lb.total - lb.used}</p>
                  <p className="text-xs opacity-70">{pick("\u0645\u0646 \u0623\u0635\u0644", "of")} {lb.total} {pick("\u064a\u0648\u0645", "days")}</p>
                </div>
              ))}
            </div>
            {empLeaves.length === 0 ? (
              <EmptyState icon={Calendar} titleAr="\u0644\u0627 \u062a\u0648\u062c\u062f \u0637\u0644\u0628\u0627\u062a \u0625\u062c\u0627\u0632\u0629" titleEn="No leave requests yet" subtitleAr="\u0633\u062a\u0638\u0647\u0631 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0625\u062c\u0627\u0632\u0629 \u0647\u0646\u0627 \u0639\u0646\u062f \u0631\u0641\u0639\u0647\u0627" subtitleEn="Leave requests will appear here when submitted" />
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      {[pick("\u0646\u0648\u0639 \u0627\u0644\u0625\u062c\u0627\u0632\u0629", "Type"), pick("\u0645\u0646", "From"), pick("\u0625\u0644\u0649", "To"), pick("\u0627\u0644\u0623\u064a\u0627\u0645", "Days"), pick("\u0627\u0644\u062d\u0627\u0644\u0629", "Status")].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-start text-[11px] font-bold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {empLeaves.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-foreground">{l.leaveType}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(l.startDate)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(l.endDate)}</td>
                        <td className="px-4 py-3 text-xs font-bold text-foreground">{l.daysCount}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.status === "approved" ? "bg-emerald-500/10 text-emerald-600" : l.status === "rejected" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}>
                            {l.status === "approved" ? pick("\u0645\u0648\u0627\u0641\u0642", "Approved") : l.status === "rejected" ? pick("\u0645\u0631\u0641\u0648\u0636", "Rejected") : pick("\u0642\u064a\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0629", "Pending")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PENALTIES */}
        {activeTab === "penalties" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><AlertTriangle className="size-4 text-rose-500" />{pick("\u0633\u062c\u0644 \u0627\u0644\u062c\u0632\u0627\u0621\u0627\u062a \u0648\u0627\u0644\u0645\u062e\u0627\u0644\u0641\u0627\u062a", "Disciplinary & Penalty Records")}</h2>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-600 text-xs font-medium hover:bg-rose-500/10 transition-colors"><Plus className="size-3.5" />{pick("\u0625\u0636\u0627\u0641\u0629 \u062c\u0632\u0627\u0621", "Add Penalty")}</button>
            </div>
            <div className="space-y-3">
              {SAMPLE_PENALTIES.map((p) => (
                <div key={p.id} className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="size-9 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0"><AlertTriangle className="size-4 text-rose-500" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-foreground">{pick(p.type, p.typeEn)}</span>
                      <span className="text-[10px] text-muted-foreground">{fmtDate(p.date)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.notes}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="text-[10px] text-muted-foreground">{pick("\u0627\u0644\u062e\u0635\u0645", "Deduction")}</p>
                    <p className="text-sm font-bold text-rose-600">{"\u2212"}{fmt(p.amount)}</p>
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{pick("\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062c\u0632\u0627\u0621\u0627\u062a", "Total Penalties")}</span>
                <span className="text-sm font-black text-rose-600">{"\u2212"}{fmt(SAMPLE_PENALTIES.reduce((s, p) => s + p.amount, 0))}</span>
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTS */}
        {activeTab === "documents" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><FileText className="size-4 text-primary" />{pick("\u0627\u0644\u0648\u062b\u0627\u0626\u0642 \u0648\u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062a \u0627\u0644\u0631\u0633\u0645\u064a\u0629", "Official Documents & Attachments")}</h2>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"><Upload className="size-3.5" />{pick("\u0631\u0641\u0639 \u0648\u062b\u064a\u0642\u0629", "Upload Document")}</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SAMPLE_DOCS.map((doc) => (
                <div key={doc.id} className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/30 hover:bg-primary/5 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors"><FileText className="size-5 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{pick(doc.name, doc.nameEn)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{doc.type} {"\xb7"} {doc.size} {"\xb7"} {fmtDate(doc.date)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Eye className="size-3.5" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"><Download className="size-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ID CARD */}
        {activeTab === "idcard" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><IdCard className="size-4 text-primary" />{pick("\u0627\u0644\u0647\u0648\u064a\u0629 \u0627\u0644\u0648\u0638\u064a\u0641\u064a\u0629", "Employee ID Card")}</h2>
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-accent transition-colors">
                <Printer className="size-3.5" />{pick("\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0647\u0648\u064a\u0629", "Print Card")}
              </button>
            </div>
            <div className="flex flex-col items-center gap-8 py-6">
              <div className="w-full max-w-md">
                <p className="text-[11px] font-semibold text-muted-foreground text-center mb-3 uppercase tracking-widest">{pick("\u0627\u0644\u0648\u062c\u0647 \u0627\u0644\u0623\u0645\u0627\u0645\u064a", "Front")}</p>
                <div ref={idCardRef} className="relative w-full rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: "1.586", background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #312e81 100%)" }}>
                  <div className="absolute top-0 end-0 size-48 rounded-full opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle, white, transparent)", transform: "translate(40%,-40%)" }} />
                  <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
                  <div className="absolute inset-y-0 start-0 w-1.5" style={{ background: "linear-gradient(180deg, #6366f1, #8b5cf6, #a78bfa, #6366f1)" }} />
                  <div className="relative h-full p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-white font-black text-base leading-tight">HAFEZ ERP</p>
                        <p className="text-white/50 text-[9px] uppercase tracking-widest">Employee Identification Card</p>
                      </div>
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                        <div className={`size-1.5 rounded-full ${emp.status === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
                        <span className="text-[9px] font-bold text-white/80 uppercase">{emp.status}</span>
                      </div>
                    </div>
                    <div className="flex items-stretch gap-4 flex-1">
                      <div className="shrink-0">
                        <div className="rounded-xl overflow-hidden border-2 border-white/30 shadow-lg" style={{ width: 72, height: 86 }}>
                          <img src={avatarSrc} alt="" className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; const s = e.currentTarget.nextElementSibling as HTMLElement; if (s) s.style.display = "flex"; }} />
                          <div style={{ display: "none", width: 72, height: 86 }} className={`bg-gradient-to-br ${emp.avatarBg} text-white items-center justify-center font-black text-xl`}>{emp.avatarInitials}</div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h2 className="text-white font-black text-[15px] leading-tight truncate">{pick(emp.name.ar, emp.name.en)}</h2>
                          <p className="text-white/70 text-[10px] mt-0.5 truncate">{pick(emp.positionName.ar, emp.positionName.en)}</p>
                          <div className="mt-2 space-y-0.5">
                            <p className="text-white/60 text-[9px] flex items-center gap-1"><Building2 className="size-2.5 shrink-0" /><span className="truncate">{pick(emp.departmentName.ar, emp.departmentName.en)}</span></p>
                            <p className="text-white/60 text-[9px] flex items-center gap-1"><MapPin className="size-2.5 shrink-0" /><span className="truncate">{pick(emp.branchName.ar, emp.branchName.en)}</span></p>
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/20 self-start mt-2">
                          <Hash className="size-2.5 text-white/60" />
                          <span className="font-mono text-[10px] font-bold text-white">{emp.code}</span>
                        </div>
                      </div>
                      <div className="shrink-0 self-end"><QrPlaceholder size={54} value={emp.code} /></div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                      <p className="text-white/40 text-[8px] font-mono uppercase">{emp.id.toUpperCase()}</p>
                      <p className="text-white/40 text-[8px]">Hired: {fmtDate(emp.hireDate)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full max-w-md">
                <p className="text-[11px] font-semibold text-muted-foreground text-center mb-3 uppercase tracking-widest">{pick("\u0627\u0644\u0648\u062c\u0647 \u0627\u0644\u062e\u0644\u0641\u064a", "Back")}</p>
                <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: "1.586", background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)" }}>
                  <div className="absolute top-8 inset-x-0 h-10 bg-black/70" />
                  <div className="relative h-full p-5 flex flex-col justify-end gap-3">
                    <div className="bg-white/10 border border-white/20 rounded-lg p-3">
                      <p className="text-white/40 text-[8px] uppercase tracking-widest mb-1">{pick("\u062a\u0648\u0642\u064a\u0639 \u0627\u0644\u0645\u0648\u0638\u0641", "Employee Signature")}</p>
                      <div className="h-6 border-b border-white/20" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5"><Phone className="size-2.5 text-white/40 shrink-0" /><span className="text-[8px] text-white/60 font-mono truncate">{emp.phone}</span></div>
                      <div className="flex items-center gap-1.5"><Mail className="size-2.5 text-white/40 shrink-0" /><span className="text-[8px] text-white/60 truncate">{emp.email}</span></div>
                    </div>
                    <p className="text-white/30 text-[7px] text-center">{pick("\u0625\u0630\u0627 \u0639\u062b\u0631\u062a \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0628\u0637\u0627\u0642\u0629\u060c \u064a\u064f\u0631\u062c\u0649 \u0625\u0639\u0627\u062f\u062a\u0647\u0627 \u0625\u0644\u0649:", "If found, please return to:")} info@hafez-erp.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <EmployeeFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={emp}
        onSave={(empData) => updateEmployee(emp.id, empData)}
      />
    </div>
  );
}
