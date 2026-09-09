import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  Plus,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Wrench,
  Play,
  CheckCircle2,
  Cpu,
  Sparkles,
  Search,
  Sliders,
  Send,
  RefreshCw,
  X,
  Code2,
  Copy,
  Check,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/kit";
import { aiModules as initialAiModules, type AiModuleItem } from "@/lib/demo-data";

export const Route = createFileRoute("/ai-modules")({
  head: () => ({
    meta: [
      { title: "AI Modules & Autonomous Agents — Hafez ERP" },
      {
        name: "description",
        content: "Configure AI models, API keys, system prompts, and assign specialized agent roles.",
      },
      { property: "og:title", content: "AI Modules & Autonomous Agents — Hafez ERP" },
      { property: "og:description", content: "Manage enterprise AI modules, API keys, and autonomous agents." },
    ],
  }),
  component: AiModulesPage,
});

const AVAILABLE_TOOLS = [
  { id: "create_invoice", name: { ar: "إصدار فواتير بيع", en: "Create Invoices" }, icon: "🧾" },
  { id: "check_stock", name: { ar: "فحص رصيد المخزون", en: "Check Stock Levels" }, icon: "📦" },
  { id: "predict_shortages", name: { ar: "التنبؤ بنقص الخامات", en: "Predict Shortages" }, icon: "📊" },
  { id: "draft_purchase_order", name: { ar: "مسودة أمر شراء خامات", en: "Draft Purchase Order" }, icon: "🛒" },
  { id: "validate_journal", name: { ar: "مراجعة توازن القيود", en: "Validate Journal" }, icon: "⚖️" },
  { id: "calculate_vat", name: { ar: "احتساب ضريبة 14%", en: "Calculate VAT" }, icon: "🧮" },
  { id: "scan_audit_log", name: { ar: "فحص سجل العمليات الحساسة", en: "Scan Audit Log" }, icon: "🔍" },
  { id: "flag_suspicious_entry", name: { ar: "الإبلاغ عن حركة مشبوهة", en: "Flag Suspicious Entry" }, icon: "🚨" },
  { id: "generate_ceo_brief", name: { ar: "صياغة التقرير التنفيذي", en: "Generate CEO Brief" }, icon: "📑" },
];

const AGENT_ROLES = [
  {
    role: "orchestrator" as const,
    label: { ar: "منسق العمليات العام", en: "Executive Orchestrator" },
    desc: { ar: "إدارة الاستفسارات وتفويض المهام للوكلاء المتخصصين", en: "Coordinates queries and delegates to specialized agents" },
  },
  {
    role: "sales" as const,
    label: { ar: "أخصائي مبيعات وحفلات وتوريد", en: "Sales & Catering Specialist" },
    desc: { ar: "تسعير الطلبيات، الفواتير، وحساب الخصومات", en: "Pricing, invoicing, and contract discount calculations" },
  },
  {
    role: "kitchen" as const,
    label: { ar: "مراقب تصنيع المطبخ وخامات الحلويات", en: "Kitchen Batch & Stock Monitor" },
    desc: { ar: "متابعة استهلاك النوتيلا والبستاشيو وخامات الإنتاج", en: "Tracks pastry batches, recipes, and ingredient stock" },
  },
  {
    role: "finance" as const,
    label: { ar: "مراقب القيود والضرائب وشجرة الحسابات", en: "Ledger & Tax Auditor" },
    desc: { ar: "مراجعة توازن القيود وضريبة القيمة المضافة ومطابقة البنوك", en: "Validates ledger balance, 14% VAT, and bank reconciliation" },
  },
  {
    role: "audit" as const,
    label: { ar: "حارس الرقابة والأمان وكشف التلاعب", en: "Audit & Risk Sentinel" },
    desc: { ar: "فحص العمليات الشاذة والفواتير الملغاة والمدفوعات الكبيرة", en: "Monitors suspicious activities and policy violations" },
  },
];

function AiModulesPage() {
  const { lang, t, pick, n } = useI18n();

  const [modules, setModules] = useState<AiModuleItem[]>(initialAiModules);
  const [showAddModal, setShowAddModal] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Filter / Search
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // New Module Form State
  const [newMod, setNewMod] = useState({
    nameAr: "",
    nameEn: "",
    provider: "openai" as AiModuleItem["provider"],
    model: "gpt-4o",
    apiKey: "",
    agentRole: "sales" as AiModuleItem["agentRole"],
    roleLabelAr: "أخصائي مبيعات حلويات",
    roleLabelEn: "Sweets Sales Agent",
    systemPrompt: "أنت وكيل ذكي معتمد لسلسلة حلويات وزير الحلو، متخصص في مساعدة مسؤولي المبيعات.",
    allowedTools: ["create_invoice", "check_stock"],
    temperature: 0.2,
  });

  // Sandbox State
  const [activeSandboxModule, setActiveSandboxModule] = useState<AiModuleItem>(initialAiModules[0]!);
  const [sandboxPrompt, setSandboxPrompt] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [sandboxLogs, setSandboxLogs] = useState<
    Array<{ role: "user" | "assistant" | "system"; text: string; tools?: string[]; time: string }>
  >([
    {
      role: "system",
      text:
        lang === "ar"
          ? "الوكيل النشط: حافظ — منسق العمليات العام (GPT-4o). جاهز لاستقبال الأوامر والتحليلات."
          : "Active Agent: Hafez — Executive Orchestrator (GPT-4o). Ready for commands.",
      time: "10:00 AM",
    },
  ]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      const matchQuery =
        m.name.ar.toLowerCase().includes(search.toLowerCase()) ||
        m.name.en.toLowerCase().includes(search.toLowerCase()) ||
        m.model.toLowerCase().includes(search.toLowerCase()) ||
        m.provider.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || m.agentRole === roleFilter;
      return matchQuery && matchRole;
    });
  }, [modules, search, roleFilter]);

  // Toggle Reveal Key
  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy Key
  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Add Module Submit
  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMod.nameAr || !newMod.apiKey) return;

    const created: AiModuleItem = {
      id: `mod-${Date.now()}`,
      name: { ar: newMod.nameAr, en: newMod.nameEn || newMod.nameAr },
      provider: newMod.provider,
      model: newMod.model,
      apiKey: newMod.apiKey,
      agentRole: newMod.agentRole,
      roleLabel: { ar: newMod.roleLabelAr, en: newMod.roleLabelEn || newMod.roleLabelAr },
      systemPrompt: newMod.systemPrompt,
      allowedTools: newMod.allowedTools,
      temperature: newMod.temperature,
      status: "active",
      totalRuns: 0,
    };

    setModules((prev) => [created, ...prev]);
    setShowAddModal(false);
    setNewMod({
      nameAr: "",
      nameEn: "",
      provider: "openai",
      model: "gpt-4o",
      apiKey: "",
      agentRole: "sales",
      roleLabelAr: "أخصائي مبيعات حلويات",
      roleLabelEn: "Sweets Sales Agent",
      systemPrompt: "أنت وكيل ذكي معتمد لسلسلة حلويات وزير الحلو، متخصص في مساعدة مسؤولي المبيعات.",
      allowedTools: ["create_invoice", "check_stock"],
      temperature: 0.2,
    });
  };

  // Sandbox Simulation
  const handleRunSandbox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxPrompt.trim() || isSimulating) return;

    const userText = sandboxPrompt;
    setSandboxPrompt("");
    const now = new Date().toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    setSandboxLogs((prev) => [...prev, { role: "user", text: userText, time: now }]);
    setIsSimulating(true);

    setTimeout(() => {
      let reply = "";
      const toolsUsed: string[] = [];

      if (userText.includes("نوتيلا") || userText.includes("بستاشيو") || userText.includes("مخزون") || userText.includes("stock")) {
        toolsUsed.push("check_stock", "predict_shortages");
        reply =
          lang === "ar"
            ? "تم فحص أرصدة الخامات في المطبخ المركزي: رصيد النوتيلا الحالي 4 عبوات (تحت الحد الأدنى 12 عبوة). مقترح إصدار أمر شراء توريد عاجل من شركة فيريرو بقيمة 45,500 ج.م لضمان عدم توقف إنتاج شاورما النوتيلا وفتة النوتيلا."
            : "Central kitchen inventory scanned: Nutella current stock is 4 tubs (below min threshold 12). Proposed urgent PO to Ferrero Egypt for 45,500 EGP to sustain Nutella Shawarma production.";
      } else if (userText.includes("فاتورة") || userText.includes("ماسة") || userText.includes("حفلة") || userText.includes("invoice")) {
        toolsUsed.push("create_invoice", "calculate_vat");
        reply =
          lang === "ar"
            ? "تم تجهيز مسودة فاتورة مبيعات لحساب فندق الماسة: 50 طاجن أم علي قشطة (3,500 ج.م) + 100 رز بلبن نوتيلا (5,000 ج.م) = الإجمالي 8,500 ج.م قبل الضريبة. ضريبة القيمة المضافة 14% (1,190 ج.م). الإجمالي النهائي 9,690 ج.م. جاهزة للاعتماد والإرسال."
            : "Draft sales invoice prepared for Al-Masa Hotel: 50 Om Ali + 100 Rice Pudding Nutella. Subtotal: 8,500 EGP + 14% VAT (1,190 EGP) = Total: 9,690 EGP ready for authorization.";
      } else if (userText.includes("قيد") || userText.includes("حسابات") || userText.includes("ضريبة") || userText.includes("tax")) {
        toolsUsed.push("validate_journal", "calculate_vat");
        reply =
          lang === "ar"
            ? "تمت مراجعة القيود المحاسبية لليوم: جميع القيود متوازنة بدقة (إجمالي المدين = الدائن 258,400 ج.م). تم احتساب ضريبة القيمة المضافة وتوجيهها لحساب مصلحة الضرائب المصرية رقم 2130 بنجاح."
            : "Accounting journals validated: debits equal credits at 258,400 EGP. 14% VAT accurately routed to Tax Authority account #2130.";
      } else {
        toolsUsed.push("generate_ceo_brief");
        reply =
          lang === "ar"
            ? `بناءً على التوجيهات المحددة للوكيل (${pick(activeSandboxModule.name.ar, activeSandboxModule.name.en)}): تم استلام الطلب ومعالجة سياق سلسلة حلويات وزير الحلو بنجاح عبر نموذج ${activeSandboxModule.model}. كافة المؤشرات التشغيلية ضمن النطاق الطبيعي.`
            : `Execution completed by ${pick(activeSandboxModule.name.ar, activeSandboxModule.name.en)} (${activeSandboxModule.model}): Context analyzed under Wazeer El-Helw confectionery policies.`;
      }

      setSandboxLogs((prev) => [
        ...prev,
        {
          role: "assistant",
          text: reply,
          tools: toolsUsed,
          time: new Date().toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      setIsSimulating(false);
    }, 900);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("aiModules")}
        subtitle={pick(
          "إدارة موديلات الذكاء الاصطناعي، مفاتيح الربط (API Keys)، وتعيين الوكلاء المتخصصين للعمليات",
          "Configure enterprise LLM modules, API credentials, system prompts, and autonomous agent assignments"
        )}
      />

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="surface-panel rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-muted-foreground">
              {lang === "ar" ? "الوكلاء المتصلون" : "Active AI Agents"}
            </span>
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-black mt-2">{modules.length}</p>
          <span className="text-xs text-emerald-600 font-bold">
            {modules.filter((m) => m.status === "active").length} {lang === "ar" ? "يعمل بكفاءة" : "Online"}
          </span>
        </div>

        <div className="surface-panel rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-muted-foreground">
              {lang === "ar" ? "إجمالي المهام المنجزة" : "Total Tasks Executed"}
            </span>
            <Cpu className="w-5 h-5 text-accent" />
          </div>
          <p className="text-2xl font-black mt-2">
            {n(modules.reduce((acc, m) => acc + m.totalRuns, 0))}
          </p>
          <span className="text-xs text-muted-foreground font-semibold">
            {lang === "ar" ? "تشغيل آلي ناجح" : "Successful Agent Runs"}
          </span>
        </div>

        <div className="surface-panel rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-muted-foreground">
              {t("provider")}
            </span>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-black mt-2">
            {new Set(modules.map((m) => m.provider)).size}
          </p>
          <span className="text-xs text-muted-foreground font-semibold">OpenAI, Gemini, Claude, DeepSeek</span>
        </div>

        <div className="surface-panel rounded-xl p-4.5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-muted-foreground">
              {t("allowedTools")}
            </span>
            <Wrench className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black mt-2">{AVAILABLE_TOOLS.length}</p>
          <span className="text-xs text-muted-foreground font-semibold">
            {lang === "ar" ? "أدوات مدمجة بقاعدة البيانات" : "Integrated ERP Tools"}
          </span>
        </div>
      </div>

      {/* Main Grid: Left is Modules Directory, Right is Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: AI Modules List (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-sm uppercase">
                {lang === "ar" ? "دليل وكلاء وموديلات الذكاء" : "AI Agents & Models Directory"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-xs shadow-sm hover:opacity-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("addAiModule")}
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2 bg-card rounded-xl p-2.5 border border-border/60 shadow-sm">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "ar" ? "بحث باسم الوكيل أو النموذج..." : "Search agent name or model..."}
                className="w-full ps-9 pe-3 py-1 text-xs bg-secondary/50 rounded-lg border border-border/60 focus:bg-card focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1 text-xs bg-secondary/50 rounded-lg border border-border/60 font-bold focus:outline-none"
            >
              <option value="all">{lang === "ar" ? "كل الأدوار والوكلاء" : "All Roles"}</option>
              {AGENT_ROLES.map((r) => (
                <option key={r.role} value={r.role}>
                  {pick(r.label.ar, r.label.en)}
                </option>
              ))}
            </select>
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {filteredModules.map((mod) => {
              const isRevealed = !!revealedKeys[mod.id];
              const isCopied = copiedKeyId === mod.id;
              const isSelectedForSandbox = activeSandboxModule.id === mod.id;

              return (
                <div
                  key={mod.id}
                  className={`surface-panel rounded-xl p-5 transition-all ${
                    isSelectedForSandbox ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center font-bold text-lg">
                        {mod.provider === "openai" && "🟢"}
                        {mod.provider === "gemini" && "🔵"}
                        {mod.provider === "anthropic" && "🟣"}
                        {mod.provider === "deepseek" && "🔷"}
                        {mod.provider === "ollama" && "🦙"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm">
                            {pick(mod.name.ar, mod.name.en)}
                          </h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-secondary text-secondary-foreground">
                            {mod.provider}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono bg-muted px-1.5 py-0.2 rounded text-[11px]">
                            {mod.model}
                          </span>
                          <span>•</span>
                          <span className="text-primary font-bold">
                            {pick(mod.roleLabel.ar, mod.roleLabel.en)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveSandboxModule(mod)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                          isSelectedForSandbox
                            ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                            : "bg-card border-border hover:bg-secondary"
                        }`}
                      >
                        <Play className="w-3.5 h-3.5" />
                        {lang === "ar" ? "اختبار في الساندبوكس" : "Test"}
                      </button>
                    </div>
                  </div>

                  {/* API Key Row */}
                  <div className="py-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 text-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-bold text-muted-foreground">{t("apiKey")}:</span>
                      <span className="font-mono bg-secondary px-2 py-0.5 rounded text-xs font-medium">
                        {isRevealed
                          ? mod.apiKey
                          : `${mod.apiKey.slice(0, 7)}••••••••••••••••`}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleReveal(mod.id)}
                        className="p-1 hover:bg-secondary rounded text-muted-foreground transition-colors"
                        title={isRevealed ? "Hide" : "Show"}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyKey(mod.id, mod.apiKey)}
                        className="p-1 hover:bg-secondary rounded text-muted-foreground transition-colors"
                        title="Copy"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        temp: <b className="text-foreground">{mod.temperature}</b>
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        runs: <b className="text-foreground">{n(mod.totalRuns)}</b>
                      </span>
                    </div>
                  </div>

                  {/* System Prompt Snippet */}
                  <div className="py-2.5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase mb-1">
                      {t("systemPrompt")} ({t("workOnAsAgent")}):
                    </p>
                    <p className="text-xs bg-secondary/50 p-2.5 border border-border/80 rounded-lg font-serif italic text-foreground/90 leading-relaxed">
                      "{mod.systemPrompt}"
                    </p>
                  </div>

                  {/* Allowed Agent Tools Badges */}
                  <div className="pt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase me-1">
                      {t("allowedTools")}:
                    </span>
                    {mod.allowedTools.map((toolId) => {
                      const meta = AVAILABLE_TOOLS.find((t) => t.id === toolId);
                      return (
                        <span
                          key={toolId}
                          className="px-2.5 py-1 bg-secondary text-secondary-foreground rounded-md text-xs font-medium flex items-center gap-1"
                        >
                          <span>{meta?.icon || "⚙️"}</span>
                          <span>{meta ? pick(meta.name.ar, meta.name.en) : toolId}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Agent Sandbox / Playground (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="surface-panel rounded-xl p-5 sticky top-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-bold text-sm uppercase">{t("testAgent")}</h3>
                  <p className="text-[11px] text-muted-foreground font-bold">
                    {pick(activeSandboxModule.name.ar, activeSandboxModule.name.en)} ({activeSandboxModule.model})
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-700 rounded text-[10px] font-bold uppercase">
                {lang === "ar" ? "جاهز للتجربة" : "Sandbox Live"}
              </span>
            </div>

            {/* Quick Prompts Pills for easy testing */}
            <div className="py-3 border-b border-border/50 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">
                {lang === "ar" ? "أمثلة استفسارات سريعة لوزير الحلو:" : "Sample Prompts:"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setSandboxPrompt(
                      lang === "ar"
                        ? "احسب تكلفة وأصدر مسودة فاتورة 50 طاجن أم علي و100 رز بلبن لفندق الماسة"
                        : "Calculate cost and draft invoice for 50 Om Ali & 100 Rice Pudding for Al-Masa"
                    )
                  }
                  className="px-2.5 py-1 text-xs bg-secondary hover:bg-primary/10 rounded-lg text-start font-medium border border-border/60 transition-colors"
                >
                  {lang === "ar" ? "🧾 فاتورة حفلة الماسة" : "🧾 Al-Masa Catering"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSandboxPrompt(
                      lang === "ar"
                        ? "هل يوجد نقص في خامات النوتيلا والبستاشيو للمطبخ المركزي؟"
                        : "Are there ingredient shortages for Nutella and Pistachio in the central kitchen?"
                    )
                  }
                  className="px-2.5 py-1 text-xs bg-secondary hover:bg-primary/10 rounded-lg text-start font-medium border border-border/60 transition-colors"
                >
                  {lang === "ar" ? "📦 جرد خامات النوتيلا" : "📦 Nutella Shortage"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSandboxPrompt(
                      lang === "ar"
                        ? "تأكد من توازن قيود اليومية واحتساب ضريبة القيمة المضافة 14%"
                        : "Verify today's ledger balance and calculate 14% VAT"
                    )
                  }
                  className="px-2.5 py-1 text-xs bg-secondary hover:bg-primary/10 rounded-lg text-start font-medium border border-border/60 transition-colors"
                >
                  {lang === "ar" ? "⚖️ مراجعة توازن القيود" : "⚖️ Verify Ledger"}
                </button>
              </div>
            </div>

            {/* Chat Sandbox Log Stream */}
            <div className="h-[340px] overflow-y-auto p-3 bg-secondary/30 rounded-xl border border-border/60 my-3 space-y-3">
              {sandboxLogs.map((log, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border text-xs ${
                    log.role === "user"
                      ? "bg-accent/10 border-accent/40 ms-4"
                      : log.role === "assistant"
                      ? "bg-card border-border/70 shadow-sm me-4"
                      : "bg-muted text-muted-foreground text-center text-[11px] border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-[10px] uppercase">
                      {log.role === "user"
                        ? lang === "ar"
                          ? "أنت (المسؤول)"
                          : "You (Admin)"
                        : log.role === "assistant"
                        ? pick(activeSandboxModule.name.ar, activeSandboxModule.name.en)
                        : "SYSTEM"}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">{log.time}</span>
                  </div>

                  <p className="leading-relaxed whitespace-pre-wrap">{log.text}</p>

                  {log.tools && log.tools.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground">
                        {lang === "ar" ? "الأدوات المنفذة:" : "Tools Called:"}
                      </span>
                      {log.tools.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 bg-secondary text-primary rounded font-mono text-[9px] font-bold"
                        >
                          {t}()
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isSimulating && (
                <div className="p-3 border border-border/70 bg-card rounded-lg flex items-center gap-2 text-xs font-bold animate-pulse me-4 shadow-sm">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>
                    {lang === "ar"
                      ? "الوكيل يفكر ويستدعي أدوات قاعدة البيانات..."
                      : "Agent thinking and querying ERP tools..."}
                  </span>
                </div>
              )}
            </div>

            {/* Prompt Input Form */}
            <form onSubmit={handleRunSandbox} className="space-y-2">
              <div className="relative">
                <textarea
                  rows={3}
                  value={sandboxPrompt}
                  onChange={(e) => setSandboxPrompt(e.target.value)}
                  placeholder={
                    lang === "ar"
                      ? "اكتب أمراً أو استفساراً لاختبار استجابة الوكيل الذكي..."
                      : "Type an instruction to test the agent's behavior..."
                  }
                  className="w-full p-3 text-xs bg-background rounded-lg border border-border/70 focus:border-primary focus:outline-none resize-none transition-colors"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setSandboxLogs([
                      {
                        role: "system",
                        text:
                          lang === "ar"
                            ? "تم مسح المحادثة. الساندبوكس جاهز."
                            : "Sandbox chat cleared.",
                        time: new Date().toLocaleTimeString(),
                      },
                    ])
                  }
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground underline"
                >
                  {lang === "ar" ? "مسح المحادثة" : "Clear Chat"}
                </button>
                <button
                  type="submit"
                  disabled={!sandboxPrompt.trim() || isSimulating}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-xs uppercase shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  {lang === "ar" ? "إرسال للوكيل" : "Execute Prompt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* MODAL: ADD NEW AI MODULE */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl border border-border/80 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <h2 className="font-bold text-base">{t("addAiModule")}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="hover:opacity-80 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddModule} className="p-6 space-y-6">
              {/* Name & Provider */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {lang === "ar" ? "اسم الوكيل / الموديل (عربي) *" : "Agent Name (Arabic) *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={newMod.nameAr}
                    onChange={(e) => setNewMod({ ...newMod, nameAr: e.target.value })}
                    placeholder="مثال: وكيل خدمة عملاء الفروع والتوصيل"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {lang === "ar" ? "اسم الوكيل (إنجليزي)" : "Agent Name (English)"}
                  </label>
                  <input
                    type="text"
                    value={newMod.nameEn}
                    onChange={(e) => setNewMod({ ...newMod, nameEn: e.target.value })}
                    placeholder="e.g. Branch Delivery & Customer Support"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background focus:border-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {t("provider")}
                  </label>
                  <select
                    value={newMod.provider}
                    onChange={(e) => {
                      const prov = e.target.value as AiModuleItem["provider"];
                      let defaultModel = "gpt-4o";
                      if (prov === "gemini") defaultModel = "gemini-1.5-pro";
                      if (prov === "anthropic") defaultModel = "claude-3-5-sonnet-20241022";
                      if (prov === "deepseek") defaultModel = "deepseek-chat";
                      if (prov === "ollama") defaultModel = "llama3.2";
                      setNewMod({ ...newMod, provider: prov, model: defaultModel });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-bold focus:border-primary focus:outline-none"
                  >
                    <option value="openai">OpenAI (ChatGPT)</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="deepseek">DeepSeek AI</option>
                    <option value="ollama">Local Ollama LLM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase mb-1">
                    {t("model")}
                  </label>
                  <input
                    type="text"
                    required
                    value={newMod.model}
                    onChange={(e) => setNewMod({ ...newMod, model: e.target.value })}
                    placeholder="gpt-4o, gemini-1.5-pro, claude-3-5-sonnet"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono font-bold focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  {t("apiKey")} *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={newMod.apiKey}
                    onChange={(e) => setNewMod({ ...newMod, apiKey: e.target.value })}
                    placeholder="sk-proj-..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background font-mono focus:border-primary focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {lang === "ar"
                    ? "يتم تشفير وتأمين مفتاح API محلياً ولا يتم مشاركته خارج بيئة العمل."
                    : "Your API key is securely handled locally and never transmitted to untrusted endpoints."}
                </p>
              </div>

              {/* Work On As Agent & Role Assignment */}
              <div className="rounded-xl border border-border/60 p-4 bg-secondary/30 space-y-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-accent" />
                  <h3 className="font-bold text-xs uppercase">{t("workOnAsAgent")}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AGENT_ROLES.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() =>
                        setNewMod({
                          ...newMod,
                          agentRole: r.role,
                          roleLabelAr: r.label.ar,
                          roleLabelEn: r.label.en,
                        })
                      }
                      className={`p-3 text-start rounded-lg border transition-all ${
                        newMod.agentRole === r.role
                          ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                          : "bg-card border-border hover:bg-secondary"
                      }`}
                    >
                      <p className="font-bold text-xs">{pick(r.label.ar, r.label.en)}</p>
                      <p className="text-[10px] opacity-80 mt-1">{pick(r.desc.ar, r.desc.en)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* System Prompt Instructions */}
              <div>
                <label className="block text-xs font-bold uppercase mb-1">
                  {t("systemPrompt")} *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newMod.systemPrompt}
                  onChange={(e) => setNewMod({ ...newMod, systemPrompt: e.target.value })}
                  placeholder="حدد دور وتعليمات الوكيل، وحدود صلاحياته..."
                  className="w-full p-3 text-xs rounded-lg border border-border/70 bg-background font-serif leading-relaxed focus:border-primary focus:outline-none"
                />
              </div>

              {/* Allowed Tools */}
              <div>
                <label className="block text-xs font-bold uppercase mb-2">
                  {t("allowedTools")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AVAILABLE_TOOLS.map((tool) => {
                    const isChecked = newMod.allowedTools.includes(tool.id);
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => {
                          setNewMod((prev) => ({
                            ...prev,
                            allowedTools: isChecked
                              ? prev.allowedTools.filter((t) => t !== tool.id)
                              : [...prev.allowedTools, tool.id],
                          }));
                        }}
                        className={`p-2 rounded-lg border text-xs flex items-center justify-between text-start transition-colors ${
                          isChecked ? "bg-primary/10 font-bold border-primary/40 text-primary" : "bg-card border-border/70 hover:bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{tool.icon}</span>
                          <span>{pick(tool.name.ar, tool.name.en)}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked ? "bg-primary text-primary-foreground border-primary" : "border-border/80 bg-background"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Temperature Slider */}
              <div className="flex items-center justify-between gap-4 p-3 bg-secondary/40 rounded-xl border border-border/60">
                <div>
                  <span className="font-bold text-xs uppercase block">
                    {lang === "ar" ? "درجة الإبداع / الدقة (Temperature)" : "Creativity (Temperature)"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {newMod.temperature <= 0.2
                      ? lang === "ar"
                        ? "دقة وحسم عالي للعمليات المالية والمخازن"
                        : "Strict determinism for finance & stock"
                      : lang === "ar"
                      ? "مرونة إبداعية للمبيعات والتسويق"
                      : "Creative for customer sales"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={newMod.temperature}
                    onChange={(e) => setNewMod({ ...newMod, temperature: parseFloat(e.target.value) })}
                    className="w-28"
                  />
                  <span className="font-mono font-bold text-xs bg-card px-2 py-0.5 rounded border border-border">
                    {newMod.temperature}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-border bg-card text-xs font-bold hover:bg-secondary transition-colors"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase shadow-sm hover:opacity-95 transition-all"
                >
                  {t("addAiModule")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
