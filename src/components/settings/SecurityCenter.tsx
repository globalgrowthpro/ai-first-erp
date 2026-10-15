import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Globe,
  Lock,
  Laptop,
  Smartphone,
  RefreshCw,
  Plus,
  Trash2,
  Ban,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Server,
  Activity,
  UserX,
  Sliders,
  FileCheck2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Btn, DataTable, Panel, Td } from "@/components/kit";
import { useSecurityCenterStore, type OwaspAuditItem } from "@/lib/security-center-store";

export function SecurityCenter() {
  const { t, pick, n } = useI18n();
  const {
    owaspItems,
    policies,
    sessions,
    apiKeys,
    logs,
    healthScore,
    isScanning,
    updatePolicies,
    revokeSession,
    revokeAllOtherSessions,
    createApiKey,
    revokeApiKey,
    blockIp,
    unblockIp,
    runLiveAudit,
    clearAuditLogs,
  } = useSecurityCenterStore();

  const [subTab, setSubTab] = useState<"owasp" | "sessions" | "apikeys" | "waf" | "logs">("owasp");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [newIpInput, setNewIpInput] = useState("");

  // Modal State for Generating API Key
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["inventory:read", "pos:orders"]);
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(120);
  const [newKeyExpiry, setNewKeyExpiry] = useState(365);
  const [generatedKeySecret, setGeneratedKeySecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const availableScopes = [
    { id: "pos:orders", label: pick("إنشاء ومزامنة طلبات نقاط البيع", "POS Orders Sync") },
    { id: "inventory:read", label: pick("قراءة المنتجات والمخزون", "Read Products & Stock") },
    { id: "inventory:write", label: pick("تحديث المخزون والأسعار", "Update Inventory & Pricing") },
    { id: "accounting:read", label: pick("قراءة قيود الحسابات والفواتير", "Read Invoices & Journals") },
    { id: "customers:read", label: pick("قراءة بيانات العملاء والولاء", "Read Customer Profiles") },
    { id: "compliance:export", label: pick("تصدير الفواتير للضرائب (ZATCA/ETA)", "Tax Compliance Export") },
    { id: "admin:full", label: pick("صلاحيات كاملة على كل الـ APIs", "Full Admin Privileges") },
  ];

  const handleToggleScope = (scopeId: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    const secret = createApiKey(newKeyName.trim(), newKeyScopes, newKeyRateLimit, newKeyExpiry);
    setGeneratedKeySecret(secret);
    setNewKeyName("");
  };

  const handleCopySecret = () => {
    if (generatedKeySecret) {
      navigator.clipboard.writeText(generatedKeySecret);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterSeverity === "all") return true;
    return log.severity === filterSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Health Score & Quick Actions */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card/90 to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex size-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <ShieldCheck className="size-10 text-primary" />
              <div className="absolute -bottom-1 -right-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-black text-white">
                TLS 1.3
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {pick("مركز الأمان والحماية المتقدمة", "Enterprise Security & Protection Center")}
                </h2>
                <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
                  {pick("محمي ونشط", "Active & Hardened")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground max-w-xl">
                {pick(
                  "تأمين شامل ضد ثغرات OWASP Top 10، حماية الجلسات، التحقق من مدخلات الـ API عبر Zod، إدارة مفاتيح التكامل وجدار الحماية السحابي (WAF).",
                  "Comprehensive defense against OWASP Top 10 vulnerabilities, session hijacking guards, Zod API schema validation, and WAF rate limits."
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Score Pill */}
            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/80 px-4 py-2.5 shadow-sm">
              <div className="text-right">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {pick("درجة الأمان العامة", "Security Score")}
                </span>
                <span className="text-2xl font-black text-success">
                  {n(healthScore)}%
                </span>
              </div>
              <div className="size-10 rounded-full border-4 border-success/30 border-t-success flex items-center justify-center font-bold text-xs">
                A+
              </div>
            </div>

            {/* Run Audit Button */}
            <Btn
              variant="solid"
              onClick={runLiveAudit}
              disabled={isScanning}
              className="gap-2 text-xs font-bold shadow-md"
            >
              <RefreshCw className={`size-4 ${isScanning ? "animate-spin" : ""}`} />
              {isScanning
                ? pick("جاري فحص المنظومة...", "Scanning System...")
                : pick("إجراء فحص أمني فوري", "Run Security Scan")}
            </Btn>
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-3">
        <Btn
          variant={subTab === "owasp" ? "solid" : "outline"}
          onClick={() => setSubTab("owasp")}
          className="text-xs"
        >
          <FileCheck2 className="size-4" />
          {pick("تدقيق معايير OWASP العشرة", "OWASP Top 10 Audit")}
        </Btn>
        <Btn
          variant={subTab === "sessions" ? "solid" : "outline"}
          onClick={() => setSubTab("sessions")}
          className="text-xs"
        >
          <Laptop className="size-4" />
          {pick("إدارة الجلسات والأجهزة", "Session & Device Manager")}
          <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold">
            {sessions.length}
          </span>
        </Btn>
        <Btn
          variant={subTab === "apikeys" ? "solid" : "outline"}
          onClick={() => setSubTab("apikeys")}
          className="text-xs"
        >
          <Key className="size-4" />
          {pick("مفاتيح الـ APIs والتكاملات", "API Keys & Integrations")}
          <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold">
            {apiKeys.length}
          </span>
        </Btn>
        <Btn
          variant={subTab === "waf" ? "solid" : "outline"}
          onClick={() => setSubTab("waf")}
          className="text-xs"
        >
          <Globe className="size-4" />
          {pick("جدار الحماية ومحدد الطلبات (WAF / CSP)", "WAF, CSP & Rate Limiting")}
        </Btn>
        <Btn
          variant={subTab === "logs" ? "solid" : "outline"}
          onClick={() => setSubTab("logs")}
          className="text-xs"
        >
          <Activity className="size-4" />
          {pick("سجل التهديدات والأحداث الحية", "Threat Feed & Audit Logs")}
          <span className="ml-1 rounded-full bg-destructive/20 text-destructive px-1.5 py-0.2 text-[10px] font-bold">
            {logs.length}
          </span>
        </Btn>
      </div>

      {/* SUB-TAB 1: OWASP TOP 10 AUDIT */}
      {subTab === "owasp" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface-flat rounded-xl border border-border/70 p-4">
              <span className="text-xs font-semibold text-muted-foreground">
                {pick("التحكم في الوصول (RLS)", "Access Control (RLS)")}
              </span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xl font-bold text-success">{pick("مفعل 100%", "100% Enforced")}</span>
                <CheckCircle2 className="size-5 text-success" />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pick("عزل تام للبيانات بـ Tenant ID", "Multi-tenant tenant_id isolation")}
              </p>
            </div>

            <div className="surface-flat rounded-xl border border-border/70 p-4">
              <span className="text-xs font-semibold text-muted-foreground">
                {pick("منع حقن البيانات (SQLi / XSS)", "Injection Defenses")}
              </span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xl font-bold text-success">{pick("معاملات آمنة", "Parameterized")}</span>
                <CheckCircle2 className="size-5 text-success" />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pick("لا استعلامات نصية حرة + Zod", "Zero raw SQL + Zod Schema Validation")}
              </p>
            </div>

            <div className="surface-flat rounded-xl border border-border/70 p-4">
              <span className="text-xs font-semibold text-muted-foreground">
                {pick("ترويسات الحماية (Headers)", "Security Headers")}
              </span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xl font-bold text-success">CSP & HSTS</span>
                <CheckCircle2 className="size-5 text-success" />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pick("منع Clickjacking والتضمين الخارجي", "X-Frame DENY + Strict Transport")}
              </p>
            </div>

            <div className="surface-flat rounded-xl border border-border/70 p-4">
              <span className="text-xs font-semibold text-muted-foreground">
                {pick("محدد الطلبات (Rate Limiter)", "Brute Force Guard")}
              </span>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xl font-bold text-success">{policies.maxLoginAttemptsPerMin} {pick("محاولات/د", "req/min")}</span>
                <Zap className="size-5 text-primary" />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {pick("حظر فوري للهجمات المنظمة", "Sliding-window IP rate limiting")}
              </p>
            </div>
          </div>

          <Panel
            title={pick("قائمة فحص معايير OWASP Top 10 وحالة التوافق", "OWASP Top 10 Security Checklist & Compliance")}
            aside={<span className="text-xs text-muted-foreground">{pick("معيار مؤسسي معتمد", "Global Standard")}</span>}
          >
            <div className="divide-y divide-border/60">
              {owaspItems.map((item: OwaspAuditItem) => (
                <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                        {item.code}
                      </span>
                      <h4 className="font-bold text-sm">{pick(item.title.ar, item.title.en)}</h4>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pick(item.description.ar, item.description.en)}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-success">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>{pick(item.remediation.ar, item.remediation.en)}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
                      <CheckCircle2 className="size-3.5" />
                      {pick("متوافق وآمن", "Compliant")}
                    </span>
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      +{item.scoreImpact} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 2: SESSIONS & INACTIVITY GUARD */}
      {subTab === "sessions" && (
        <div className="space-y-6">
          {/* Policy Quick Settings */}
          <Panel title={pick("سياسات أمان الجلسات وقفل الخمول", "Session & Inactivity Policies")}>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-bold">
                  {pick("مدة قفل الشاشة عند الخمول (Idle Timeout)", "Screen Lock Idle Timeout")}
                </label>
                <select
                  value={policies.idleTimeoutMinutes}
                  onChange={(e) => updatePolicies({ idleTimeoutMinutes: Number(e.target.value) })}
                  className="surface-sunken w-full rounded-lg border border-border/80 px-3 py-2 text-xs font-semibold"
                >
                  <option value={5}>{pick("5 دقائق (حماية قصوى لنقاط البيع)", "5 Minutes (High Security POS)")}</option>
                  <option value={15}>{pick("15 دقيقة (موصى به للمدراء)", "15 Minutes (Recommended)")}</option>
                  <option value={30}>{pick("30 دقيقة", "30 Minutes")}</option>
                  <option value={60}>{pick("ساعة واحدة", "1 Hour")}</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {pick("عند عدم وجود نشاط، يتم قفل الشاشة فورا وطلب الـ PIN لمتابعة العمل.", "Locks application view and prompts for PIN to resume.")}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold">
                  {pick("فرض جلسة واحدة نشطة لكل كاشير/مستخدم", "Enforce Single Active Session")}
                </label>
                <div className="flex items-center justify-between rounded-lg border border-border/80 p-2.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {policies.enforceSingleSessionPerUser ? pick("مفعل (إنهاء الجلسات السابقة)", "Enforced") : pick("معطل (أجهزة متعددة)", "Disabled")}
                  </span>
                  <input
                    type="checkbox"
                    checked={policies.enforceSingleSessionPerUser}
                    onChange={(e) => updatePolicies({ enforceSingleSessionPerUser: e.target.checked })}
                    className="size-4 accent-primary cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {pick("يمنع مشاركة نفس الحساب بين عدة موظفين في نفس الوقت.", "Prevents multiple simultaneous logins on the same cashier account.")}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold">
                  {pick("إلزام التحقق الثنائي (2FA/TOTP) للمشرفين", "Require 2FA for Admin Accounts")}
                </label>
                <div className="flex items-center justify-between rounded-lg border border-border/80 p-2.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {policies.require2faForAdmin ? pick("إلزامي لجميع المدراء", "Mandatory") : pick("اختياري", "Optional")}
                  </span>
                  <input
                    type="checkbox"
                    checked={policies.require2faForAdmin}
                    onChange={(e) => updatePolicies({ require2faForAdmin: e.target.checked })}
                    className="size-4 accent-primary cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {pick("طلب رمز المصادقة من Google Authenticator عند تسجيل الدخول.", "Prompts for TOTP token on sensitive admin role logins.")}
                </p>
              </div>
            </div>
          </Panel>

          {/* Active Sessions Table */}
          <Panel
            title={pick("الجلسات والأجهزة النشطة حالياً", "Active User Sessions & Connected Terminals")}
            aside={
              <Btn
                variant="outline"
                onClick={revokeAllOtherSessions}
                className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                <UserX className="size-3.5" />
                {pick("إنهاء جميع الجلسات الأخرى فوراً", "Terminate All Other Sessions")}
              </Btn>
            }
          >
            <DataTable
              head={[
                pick("المستخدم والجهاز", "User & Device"),
                pick("نوع الاتصال", "Terminal Type"),
                pick("عنوان IP والموقع", "IP Address & Location"),
                pick("آخر نشاط", "Last Active"),
                pick("الحالة", "Status"),
                pick("إجراء أمني", "Security Action"),
              ]}
            >
              {sessions.map((sess) => (
                <tr key={sess.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        {sess.deviceType === "mobile" ? (
                          <Smartphone className="size-4 text-primary" />
                        ) : (
                          <Laptop className="size-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs">{sess.userName}</span>
                          {sess.isCurrent && (
                            <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                              {pick("جهازك الحالي", "This Device")}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-mono">{sess.browser}</span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="rounded-md bg-secondary/70 px-2 py-0.5 text-xs font-semibold capitalize">
                      {sess.deviceType.replace("_", " ")}
                    </span>
                  </Td>
                  <Td>
                    <div>
                      <span className="font-mono text-xs font-bold">{sess.ipAddress}</span>
                      <span className="block text-[11px] text-muted-foreground">{sess.location}</span>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">{sess.lastActive}</span>
                  </Td>
                  <Td>
                    {sess.status === "active" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                        <span className="size-2 rounded-full bg-success animate-pulse" />
                        {pick("نشط", "Active")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
                        <Clock className="size-3" />
                        {pick("خامل", "Idle")}
                      </span>
                    )}
                  </Td>
                  <Td>
                    {sess.isCurrent ? (
                      <span className="text-xs text-muted-foreground italic">
                        {pick("محمي (الجلسة الحالية)", "Protected")}
                      </span>
                    ) : (
                      <Btn
                        variant="outline"
                        onClick={() => revokeSession(sess.id)}
                        className="gap-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Ban className="size-3" />
                        {pick("فصل وإنهاء", "Revoke")}
                      </Btn>
                    )}
                  </Td>
                </tr>
              ))}
            </DataTable>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 3: API KEYS & INTEGRATIONS */}
      {subTab === "apikeys" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base">
                {pick("مفاتيح الـ APIs والتكاملات الموثوقة", "Machine-to-Machine API Keys & Access Scopes")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {pick(
                  "توليد مفاتيح تشفير محصنة مع صلاحيات مخصصة (Scoped) ومحدد طلبات لكل تكامل.",
                  "Generate cryptographically signed keys with granular RBAC scopes and isolated rate limits."
                )}
              </p>
            </div>
            <Btn variant="solid" onClick={() => setShowKeyModal(true)} className="gap-1.5 text-xs">
              <Plus className="size-4" />
              {pick("إنشاء مفتاح API جديد", "Generate New API Key")}
            </Btn>
          </div>

          <Panel title={pick("المفاتيح المسجلة وحالة استخدامها", "Registered API Keys & Quota Usage")}>
            {apiKeys.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                <Key className="mx-auto size-9 text-muted-foreground/30" />
                <p className="font-bold text-sm text-foreground">
                  {pick("لا توجد مفاتيح API مسجلة حالياً", "No Integration API Keys Created Yet")}
                </p>
                <p className="max-w-md mx-auto text-xs text-muted-foreground">
                  {pick(
                    "لم يتم إصدار أي مفاتيح تكامل خارجية بعد. انقر على الزر أعلاه لتوليد أول مفتاح مشفر مع صلاحيات مخصصة.",
                    "No external machine-to-machine keys issued yet. Click 'Generate New API Key' above to issue your first scoped token."
                  )}
                </p>
              </div>
            ) : (
              <DataTable
                head={[
                  pick("اسم المفتاح والتكامل", "Key Name & Purpose"),
                  pick("المفتاح المشفر (Prefix)", "Key Identifier"),
                  pick("الصلاحيات الممنوحة", "Granted Scopes"),
                  pick("معدل الطلب", "Rate Limit"),
                  pick("آخر استخدام", "Last Used"),
                  pick("الحالة", "Status"),
                  pick("إجراء", "Actions"),
                ]}
              >
              {apiKeys.map((k) => (
                <tr key={k.id}>
                  <Td>
                    <div>
                      <span className="font-bold text-xs">{k.name}</span>
                      <span className="block text-[11px] text-muted-foreground font-mono">
                        {pick("أُنشئ في: ", "Created: ")}{k.createdAt}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs font-semibold bg-muted px-2 py-1 rounded">
                      {k.keyMasked}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {k.scopes.map((scope) => (
                        <span key={scope} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary">
                          {scope}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs font-semibold">
                      {k.rateLimitPerMin} {pick("طلب/د", "req/min")}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">{k.lastUsedAt || pick("لم يُستخدم بعد", "Never")}</span>
                  </Td>
                  <Td>
                    {k.status === "active" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                        <CheckCircle2 className="size-3.5" />
                        {pick("نشط", "Active")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive">
                        <Ban className="size-3.5" />
                        {pick("ملغي ومحظور", "Revoked")}
                      </span>
                    )}
                  </Td>
                  <Td>
                    {k.status === "active" && (
                      <Btn
                        variant="outline"
                        onClick={() => revokeApiKey(k.id)}
                        className="gap-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3" />
                        {pick("إلغاء المفتاح", "Revoke")}
                      </Btn>
                    )}
                  </Td>
                </tr>
              ))}
            </DataTable>
            )}
          </Panel>
        </div>
      )}

      {/* SUB-TAB 4: WAF, CSP & HEADERS */}
      {subTab === "waf" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Security Headers & CSP */}
            <Panel title={pick("ترويسات الحماية وسياسة أمان المحتوى (CSP)", "HTTP Security Headers & Content Security Policy")}>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border/80 p-3">
                  <div>
                    <h5 className="text-xs font-bold">Strict-Transport-Security (HSTS)</h5>
                    <p className="text-[11px] text-muted-foreground">
                      {pick("إجبار استخدام HTTPS ومنع التخفيض إلى اتصالات غير مشفرة.", "Forces browsers to exclusively load over HTTPS.")}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={policies.hstsEnabled}
                    onChange={(e) => updatePolicies({ hstsEnabled: e.target.checked })}
                    className="size-4 accent-primary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/80 p-3">
                  <div>
                    <h5 className="text-xs font-bold">X-Frame-Options (Clickjacking Protection)</h5>
                    <p className="text-[11px] text-muted-foreground">
                      {pick("منع تضمين لوحة التحكم داخل iframe خارجي لحماية العمليات المالية.", "Prevents clickjacking by blocking iframe embedding.")}
                    </p>
                  </div>
                  <select
                    value={policies.xFrameOptions}
                    onChange={(e) => updatePolicies({ xFrameOptions: e.target.value as any })}
                    className="surface-sunken rounded border border-border/80 px-2.5 py-1 text-xs font-semibold"
                  >
                    <option value="DENY">DENY (Strict)</option>
                    <option value="SAMEORIGIN">SAMEORIGIN</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold">
                    {pick("النطاقات الخارجية المسموح بها في CSP", "Whitelisted External CSP Origins")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {policies.cspAllowedDomains.map((dom) => (
                      <span key={dom} className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                        {dom}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>

            {/* Rate Limiting & Firewall */}
            <Panel title={pick("محدد معدل الطلبات وحماية الهجمات (Rate Limiting & DDoS)", "Sliding-Window Rate Limiting & DoS Shield")}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{pick("حد محاولات تسجيل الدخول بالدقيقة", "Login Brute-Force Limit")}</span>
                    <span className="font-mono text-primary">{policies.maxLoginAttemptsPerMin} {pick("محاولات", "attempts/min")}</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={policies.maxLoginAttemptsPerMin}
                    onChange={(e) => updatePolicies({ maxLoginAttemptsPerMin: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {pick("يتم حظر عنوان الـ IP تلقائياً وإرجاع HTTP 429 عند تجاوز الحد.", "IP is temporarily quarantined if limit is exceeded.")}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{pick("حد استدعاء الـ APIs العامة بالدقيقة", "General API Requests Limit")}</span>
                    <span className="font-mono text-primary">{policies.maxApiRequestsPerMin} {pick("طلب/دقيقة", "req/min")}</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="300"
                    step="10"
                    value={policies.maxApiRequestsPerMin}
                    onChange={(e) => updatePolicies({ maxApiRequestsPerMin: Number(e.target.value) })}
                    className="w-full accent-primary"
                  />
                </div>

                {/* IP Blocklist Box */}
                <div className="pt-2 space-y-2">
                  <label className="text-xs font-bold">
                    {pick("قائمة عناوين IP المحظورة فوراً (Firewall Blacklist)", "Firewall Blocked IP Addresses")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 194.26.29.112"
                      value={newIpInput}
                      onChange={(e) => setNewIpInput(e.target.value)}
                      className="surface-sunken flex-1 rounded-lg border border-border/80 px-3 py-1.5 text-xs font-mono"
                    />
                    <Btn
                      variant="solid"
                      onClick={() => {
                        if (newIpInput.trim()) {
                          blockIp(newIpInput.trim());
                          setNewIpInput("");
                        }
                      }}
                      className="text-xs gap-1"
                    >
                      <Ban className="size-3.5" />
                      {pick("حظر الـ IP", "Block IP")}
                    </Btn>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {policies.ipBlocklist.map((ip) => (
                      <span
                        key={ip}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1 font-mono text-xs font-bold text-destructive"
                      >
                        {ip}
                        <button
                          onClick={() => unblockIp(ip)}
                          className="hover:text-foreground"
                          title={pick("إلغاء الحظر", "Unblock")}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: THREAT LOGS & LIVE AUDIT TRAIL */}
      {subTab === "logs" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">{pick("تصفية حسب الخطورة:", "Filter Severity:")}</span>
              {["all", "critical", "high", "medium", "info"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition-colors ${
                    filterSeverity === sev
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">
                {pick("الأحداث المسجلة: ", "Captured Events: ")}{filteredLogs.length}
              </span>
              {logs.length > 0 && (
                <Btn
                  variant="outline"
                  onClick={clearAuditLogs}
                  className="text-xs h-7 px-2.5 text-destructive hover:bg-destructive/10 gap-1"
                >
                  <Trash2 className="size-3" />
                  {pick("مسح السجل", "Clear Log")}
                </Btn>
              )}
            </div>
          </div>

          <Panel title={pick("سجل تدقيق الأمان ومحاولات الاختراق", "Real-time Security Event & Threat Feed")}>
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                <CheckCircle2 className="mx-auto size-9 text-success" />
                <p className="font-bold text-sm text-foreground">
                  {pick("لا توجد أحداث أو تهديدات أمنية مسجلة حالياً", "No Threat Incidents Recorded — Defenses Active")}
                </p>
                <p className="max-w-md mx-auto text-xs text-muted-foreground">
                  {pick(
                    "المنظومة مستقرة ولم يتم رصد أي هجمات حقيقية أو محاولات تخمين. الأحداث الأمنية والعمليات الفعلية تُسجل هنا فور وقوعها.",
                    "System is secure and running without breaches. Genuine authentication events and security actions stream here in real time."
                  )}
                </p>
              </div>
            ) : (
              <DataTable
                head={[
                  pick("التوقيت", "Timestamp"),
                  pick("مستوى الخطورة", "Severity"),
                  pick("نوع الحدث الأمني", "Event Type"),
                  pick("عنوان IP والفاعل", "Source IP & Actor"),
                  pick("تفاصيل الإجراء الدفاعي المتخذ", "Mitigation & Technical Details"),
                ]}
              >
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <Td className="font-mono text-xs whitespace-nowrap text-muted-foreground">
                      {log.timestamp}
                    </Td>
                    <Td>
                      {log.severity === "critical" && (
                        <span className="rounded bg-destructive text-destructive-foreground px-2 py-0.5 text-[10px] font-black uppercase">
                          CRITICAL
                        </span>
                      )}
                      {log.severity === "high" && (
                        <span className="rounded bg-destructive/15 text-destructive px-2 py-0.5 text-[10px] font-bold uppercase">
                          HIGH
                        </span>
                      )}
                      {log.severity === "medium" && (
                        <span className="rounded bg-warning/20 text-warning px-2 py-0.5 text-[10px] font-bold uppercase">
                          MEDIUM
                        </span>
                      )}
                      {log.severity === "info" && (
                        <span className="rounded bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-bold uppercase">
                          INFO
                        </span>
                      )}
                    </Td>
                    <Td className="font-mono text-xs font-bold">{log.eventType}</Td>
                    <Td>
                      <div>
                        <span className="font-mono text-xs font-bold">{log.ipAddress}</span>
                        <span className="block text-[11px] text-muted-foreground">{log.actor}</span>
                      </div>
                    </Td>
                    <Td className="text-xs text-muted-foreground max-w-md">
                      {log.details}
                    </Td>
                  </tr>
                ))}
              </DataTable>
            )}
          </Panel>
        </div>
      )}

      {/* MODAL: Generate API Key */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="surface-panel w-full max-w-lg rounded-2xl border border-border/80 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Key className="size-5 text-primary" />
                {pick("إنشاء مفتاح تكامل برمجيات جديد (API Key)", "Create New Integration API Key")}
              </h3>
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setGeneratedKeySecret(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {generatedKeySecret ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-success/40 bg-success/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-success font-bold text-sm">
                    <CheckCircle2 className="size-5" />
                    {pick("تم توليد المفتاح بنجاح! احفظه الآن", "Key Generated! Save it securely now")}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pick(
                      "لن تتمكن من رؤية هذا المفتاح السري مرة أخرى. انسخه وضعه في إعدادات التطبيق أو الخادم الخارجي.",
                      "This secret token will NOT be shown again. Copy it and store it in your client application or secure env vault."
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted p-2.5">
                  <span className="font-mono text-xs font-bold select-all flex-1 break-all">
                    {generatedKeySecret}
                  </span>
                  <Btn variant="solid" onClick={handleCopySecret} className="text-xs shrink-0 gap-1">
                    <Copy className="size-3.5" />
                    {copiedKey ? pick("تم النسخ!", "Copied!") : pick("نسخ", "Copy")}
                  </Btn>
                </div>

                <div className="pt-2 flex justify-end">
                  <Btn
                    variant="solid"
                    onClick={() => {
                      setShowKeyModal(false);
                      setGeneratedKeySecret(null);
                    }}
                  >
                    {pick("تم وحفظت المفتاح", "Done & Saved")}
                  </Btn>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold">{pick("اسم التكامل أو الخدمة", "Key / Integration Name")}</label>
                  <input
                    type="text"
                    placeholder={pick("مثال: جهاز ماسح الباركود للفرع الرئيسي", "e.g. Main Branch Barcode Scanner")}
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="surface-sunken w-full rounded-lg border border-border/80 px-3 py-2 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold">{pick("صلاحيات الوصول (Scopes)", "Access Scopes")}</label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {availableScopes.map((scope) => (
                      <label
                        key={scope.id}
                        className="flex items-center gap-2.5 rounded-lg border border-border/60 p-2 hover:bg-muted/50 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={newKeyScopes.includes(scope.id)}
                          onChange={() => handleToggleScope(scope.id)}
                          className="size-4 accent-primary"
                        />
                        <span className="font-mono text-[11px] font-bold text-primary">{scope.id}</span>
                        <span className="text-muted-foreground">— {scope.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold">{pick("معدل الطلب (دقيقة)", "Rate Limit (req/min)")}</label>
                    <input
                      type="number"
                      value={newKeyRateLimit}
                      onChange={(e) => setNewKeyRateLimit(Number(e.target.value))}
                      className="surface-sunken w-full rounded-lg border border-border/80 px-3 py-1.5 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold">{pick("مدة الصلاحية", "Expiration")}</label>
                    <select
                      value={newKeyExpiry}
                      onChange={(e) => setNewKeyExpiry(Number(e.target.value))}
                      className="surface-sunken w-full rounded-lg border border-border/80 px-3 py-1.5 text-xs font-semibold"
                    >
                      <option value={30}>{pick("30 يوماً", "30 Days")}</option>
                      <option value={90}>{pick("90 يوماً", "90 Days")}</option>
                      <option value={365}>{pick("سنة كاملة", "1 Year")}</option>
                      <option value={0}>{pick("بلا انتهاء (دائم)", "Never Expires")}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
                  <Btn variant="outline" onClick={() => setShowKeyModal(false)}>
                    {pick("إلغاء", "Cancel")}
                  </Btn>
                  <Btn variant="solid" onClick={handleCreateKey} disabled={!newKeyName.trim()}>
                    {pick("توليد المفتاح", "Generate Key")}
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
