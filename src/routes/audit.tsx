import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ScrollText,
  ShieldCheck,
  ShieldAlert,
  Bot,
  User,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  Filter,
  Terminal,
  Activity,
  Layers,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, KpiCard, PageHeader, Panel, Td } from "@/components/kit";
import {
  useAuditStore,
  type AuditEntry,
  type AuditResult,
  type AuditActorType,
  type AuditCategory,
} from "@/lib/audit-store";
import { AuditPayloadModal } from "@/components/audit/AuditPayloadModal";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Security & AI Audit Trail — Wazeer ERP" },
      {
        name: "description",
        content:
          "Enterprise audit logging of every user action and AI agent execution: timestamp, payload, security policy checks and anomaly detection.",
      },
      { property: "og:title", content: "Audit Trail — Wazeer ERP" },
      {
        property: "og:description",
        content:
          "Full audit trail of user and AI agent actions with deep JSON payload inspection.",
      },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { t, pick } = useI18n();
  const { logs } = useAuditStore();

  const [resultFilter, setResultFilter] = useState<string>("all");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedEntryForPayload, setSelectedEntryForPayload] =
    useState<AuditEntry | null>(null);

  // Metrics
  const totalEvents = logs.length;
  const aiActions = logs.filter((l) => l.actorType === "ai_agent").length;
  const deniedRequests = logs.filter((l) => l.result === "denied").length;
  const flaggedAnomalies = logs.filter((l) => l.result === "flagged").length;

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (resultFilter !== "all" && entry.result !== resultFilter) return false;
      if (actorFilter !== "all" && entry.actorType !== actorFilter) return false;
      if (categoryFilter !== "all" && entry.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const actionMatch =
          entry.action.ar.toLowerCase().includes(q) ||
          entry.action.en.toLowerCase().includes(q);
        const userMatch =
          entry.user.ar.toLowerCase().includes(q) ||
          entry.user.en.toLowerCase().includes(q);
        const agentMatch =
          entry.agent &&
          (entry.agent.ar.toLowerCase().includes(q) ||
            entry.agent.en.toLowerCase().includes(q));
        const resMatch = entry.targetResource.toLowerCase().includes(q);
        if (!actionMatch && !userMatch && !agentMatch && !resMatch) return false;
      }
      return true;
    });
  }, [logs, resultFilter, actorFilter, categoryFilter, searchQuery]);

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `wazeer-audit-trail-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={pick("سجل التدقيق والحماية الرقابية (Audit Trail)", "Security & AI Audit Sentinel")}
        subtitle={pick(
          "تسجيل فوري مشفر لكل إجراء بشري وعملية ذكاء اصطناعي، بما يشمل الطلبات المرفوضة والشبهات",
          "Immutable chronological trace of human actions, AI agent tasks, security policy enforcement, and payload inspection"
        )}
        actions={
          <Btn variant="outline" onClick={handleExportJson} className="gap-1.5">
            <Download className="size-4" />
            <span>{pick("تصدير السجل (JSON)", "Export Audit Log")}</span>
          </Btn>
        }
      />

      {/* Top Security KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={pick("إجمالي العمليات المسجلة", "Total Logged Events")}
          value={String(totalEvents)}
          accent="primary"
        />
        <KpiCard
          label={pick("عمليات وكلاء الذكاء", "AI Agent Tasks")}
          value={String(aiActions)}
          accent="brand"
        />
        <KpiCard
          label={pick("محاولات محظورة أمنياً", "Security Denials")}
          value={String(deniedRequests)}
          accent="ink"
        />
        <KpiCard
          label={pick("تنبيهات رقابية شاذة", "Flagged Anomalies")}
          value={String(flaggedAnomalies)}
          accent="gold"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card p-3.5 rounded-xl border border-border/70 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Result Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: "all", label: pick("كل النتائج", "All Results") },
              { id: "success", label: pick("ناجحة", "Success") },
              { id: "denied", label: pick("محظورة / مرفوضة", "Denied") },
              { id: "flagged", label: pick("تنبيه احتيال", "Flagged") },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setResultFilter(pill.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  resultFilter === pill.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={pick(
                "بحث بالإجراء، المستخدم، الوكيل، أو المورد...",
                "Search action, user, agent, or resource..."
              )}
              className="w-full rounded-lg border border-border bg-secondary/50 ps-9 pe-3 py-1.5 text-xs outline-none focus:border-primary focus:bg-card transition-colors"
            />
          </div>
        </div>

        {/* Secondary Filters: Actor & Category */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">{pick("المنفذ:", "Actor:")}</span>
            <select
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs font-medium text-foreground"
            >
              <option value="all">{pick("الكل (بشر ووكلاء ذكاء)", "All (Human & AI)")}</option>
              <option value="human">{pick("مستخدمون بشريون فقط", "Human Users Only")}</option>
              <option value="ai_agent">{pick("وكلاء الذكاء فقط", "AI Agents Only")}</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold">{pick("التصنيف:", "Category:")}</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs font-medium text-foreground"
            >
              <option value="all">{pick("كل الأقسام", "All Categories")}</option>
              <option value="billing">{pick("الفواتير والمالية (Billing)", "Billing & Finance")}</option>
              <option value="manufacturing">{pick("التصنيع والتشغيل (Manufacturing)", "Manufacturing")}</option>
              <option value="inventory">{pick("المخزون والخامات (Inventory)", "Inventory")}</option>
              <option value="security">{pick("الحماية والسياسات (Security)", "Security & Policy")}</option>
              <option value="settings">{pick("الإعدادات والمستخدمون (Settings)", "Settings")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Data Table */}
      <Panel title={pick("سجل المراقبة والتدقيق الفوري", "Real-Time Audit Log Table")}>
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/70 bg-secondary/40 text-[11px] font-semibold text-muted-foreground">
                <th className="p-3 text-start">{pick("الوقت", "Timestamp")}</th>
                <th className="p-3 text-start">{pick("المستخدم", "User")}</th>
                <th className="p-3 text-start">{pick("وكيل الذكاء / النظام", "AI Agent")}</th>
                <th className="p-3 text-start">{pick("الإجراء المنفذ", "Action")}</th>
                <th className="p-3 text-center">{pick("المورد المستهدف", "Resource")}</th>
                <th className="p-3 text-center">{pick("النتيجة", "Result")}</th>
                <th className="p-3 text-center">{pick("الفحص", "Inspect")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    {pick("لا توجد أحداث تدقيق مطابقة لمعايير البحث", "No audit events match current criteria")}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedEntryForPayload(entry)}
                    className="hover:bg-secondary/40 transition-colors cursor-pointer group"
                  >
                    {/* Timestamp */}
                    <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                      <div>{entry.timestamp.split(" ")[1]}</div>
                      <div className="text-[10px] text-muted-foreground/70">
                        {entry.timestamp.split(" ")[0]}
                      </div>
                    </td>

                    {/* User */}
                    <td className="p-3 font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="size-3.5 text-muted-foreground shrink-0" />
                        <span>{pick(entry.user.ar, entry.user.en)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-normal ps-5">
                        {entry.user.role}
                      </div>
                    </td>

                    {/* Agent */}
                    <td className="p-3 text-muted-foreground">
                      {entry.agent ? (
                        <div className="flex items-center gap-1.5">
                          <Bot className="size-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-foreground">
                            {pick(entry.agent.ar, entry.agent.en)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-muted-foreground">
                          {pick("مباشر (يدوي)", "Direct (Manual)")}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="p-3 font-medium text-foreground">
                      <div className="line-clamp-2 max-w-md">
                        {pick(entry.action.ar, entry.action.en)}
                      </div>
                    </td>

                    {/* Target Resource */}
                    <td className="p-3 text-center font-mono font-bold text-primary">
                      {entry.targetResource}
                    </td>

                    {/* Result */}
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          entry.result === "success"
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                            : entry.result === "denied"
                            ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                            : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                        }`}
                      >
                        {entry.result === "success" && <CheckCircle2 className="size-3" />}
                        {entry.result === "denied" && <XCircle className="size-3" />}
                        {entry.result === "flagged" && <AlertTriangle className="size-3" />}
                        <span>
                          {entry.result === "success" && "SUCCESS"}
                          {entry.result === "denied" && t("denied")}
                          {entry.result === "flagged" && pick("شبهة تكرار", "FLAGGED")}
                          {entry.result === "warning" && "WARNING"}
                        </span>
                      </span>
                    </td>

                    {/* Inspect button */}
                    <td className="p-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntryForPayload(entry);
                        }}
                        title={pick("فحص الحمولة البرمجية JSON", "Inspect Payload")}
                        className="size-7 rounded-lg border border-border bg-card inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                      >
                        <Eye className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Payload Inspector Modal */}
      <AuditPayloadModal
        entry={selectedEntryForPayload}
        open={!!selectedEntryForPayload}
        onClose={() => setSelectedEntryForPayload(null)}
      />
    </div>
  );
}
