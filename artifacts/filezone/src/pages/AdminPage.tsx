import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Layers, LogOut, Eye, EyeOff, Star, StarOff, Pencil, Trash2,
  Save, X, ArrowLeft, Settings, BarChart2, RefreshCw, Users,
  FileStack, Plus, TrendingUp, Megaphone, Search, CheckCircle2,
  ExternalLink, Globe, FileText, Copy, Mail, Inbox, Clock, BookOpen, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "/api";

interface Tool {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  route: string;
  usageCount: number;
  isFeatured: boolean;
  isHidden: boolean;
  sortOrder: number;
  inputFormats: string[];
  outputFormats: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  introduction?: string | null;
  features?: string | null;
  benefits?: string | null;
  steps?: string | null;
  faqs?: string | null;
  advantages?: string | null;
  commonErrors?: string | null;
  useCases?: string | null;
  examples?: string | null;
  tips?: string | null;
  version?: string;
  license?: string;
  developer?: string;
  lastUpdated?: string;
}

interface SiteSettings {
  site_title?: string;
  site_description?: string;
  site_keywords?: string;
  admin_password?: string;
  analytics_code?: string;
  adsense_enabled?: string;
  adsense_client?: string;
  adsense_slot_leaderboard?: string;
  adsense_slot_rectangle?: string;
  adsense_slot_responsive?: string;
  maintenance_mode?: string;
  maintenance_message?: string;
  maintenance_paths?: string;
  hidden_pages?: string;
  footer_copyright?: string;
  title_animation?: string;
  website_animations?: string;
  email_contact?: string;
  email_privacy?: string;
  email_legal?: string;
}

interface Contact {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface AdminStats {
  totalFilesProcessed: number;
  totalTools: number;
  hiddenTools: number;
  featuredTools: number;
  totalVisitors: number;
  topTools: { slug: string; name: string; category: string; usageCount: number }[];
  conversionsByCategory: { category: string; count: number }[];
}

const categoryColors: Record<string, string> = {
  pdf: "bg-red-100 text-red-700",
  image: "bg-blue-100 text-blue-700",
  convert: "bg-violet-100 text-violet-700",
  text: "bg-emerald-100 text-emerald-700",
  calculator: "bg-amber-100 text-amber-700",
};

// ----- Login Screen -----
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setError("Wrong password"); return; }
      const data = await res.json();
      onLogin(data.token);
    } catch {
      setError("Connection error");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm bg-card border rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-primary p-1.5 rounded-lg"><Layers className="h-5 w-5 text-primary-foreground" /></div>
          <span className="font-bold text-lg">5toolbox Admin</span>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Admin Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" autoFocus />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Default password: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-foreground">admin123</code>
        </p>
      </div>
    </div>
  );
}

// ----- Helpers & Sub-editors for Tool SEO Admin -----
function safeJsonParse<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

function StringListEditor({
  label,
  items,
  onChange,
  placeholder = "Add item..."
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2 border p-3 rounded-xl bg-muted/10">
      <div className="flex items-center justify-between">
        <Label className="font-semibold text-xs text-foreground">{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onChange([...items, ""])}
        >
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No items added yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <Input
                value={item}
                onChange={e => {
                  const next = [...items];
                  next[idx] = e.target.value;
                  onChange(next);
                }}
                placeholder={placeholder}
                className="h-8 text-xs font-normal"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive shrink-0"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FaqListEditor({
  faqs,
  onChange
}: {
  faqs: { q: string; a: string }[];
  onChange: (faqs: { q: string; a: string }[]) => void;
}) {
  return (
    <div className="space-y-2 border p-3 rounded-xl bg-muted/10">
      <div className="flex items-center justify-between">
        <Label className="font-semibold text-xs text-foreground">Frequently Asked Questions (FAQs)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onChange([...faqs, { q: "", a: "" }])}
        >
          <Plus className="h-3 w-3 mr-1" /> Add FAQ
        </Button>
      </div>
      {faqs.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No FAQs added yet.</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border p-2.5 rounded-lg bg-card relative space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">FAQ #{idx + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive absolute top-1 right-1"
                  onClick={() => onChange(faqs.filter((_, i) => i !== idx))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5 pt-1">
                <Input
                  value={faq.q}
                  onChange={e => {
                    const next = [...faqs];
                    next[idx] = { ...next[idx], q: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Question..."
                  className="h-8 text-xs font-normal"
                />
                <Textarea
                  value={faq.a}
                  onChange={e => {
                    const next = [...faqs];
                    next[idx] = { ...next[idx], a: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Answer..."
                  className="h-14 text-xs font-normal resize-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- Edit Tool Modal -----
function EditToolModal({ tool, token, onSave, onClose }: {
  tool: Tool; token: string;
  onSave: (updated: Tool) => void;
  onClose: () => void;
}) {
  const [modalTab, setModalTab] = useState<"basic" | "seo" | "content" | "details">("basic");
  const [form, setForm] = useState({
    name: tool.name,
    description: tool.description,
    category: tool.category,
    icon: tool.icon,
    inputFormats: tool.inputFormats.join(", "),
    outputFormats: tool.outputFormats.join(", "),
    isFeatured: tool.isFeatured,
    isHidden: tool.isHidden,
    sortOrder: String(tool.sortOrder),
    metaTitle: tool.metaTitle ?? "",
    metaDescription: tool.metaDescription ?? "",
    introduction: tool.introduction ?? "",
    version: tool.version ?? "1.0.0",
    license: tool.license ?? "MIT",
    developer: tool.developer ?? "5toolbox",
    steps: safeJsonParse<string[]>(tool.steps, []),
    features: safeJsonParse<string[]>(tool.features, []),
    benefits: safeJsonParse<string[]>(tool.benefits, []),
    advantages: safeJsonParse<string[]>(tool.advantages, []),
    commonErrors: safeJsonParse<string[]>(tool.commonErrors, []),
    useCases: safeJsonParse<string[]>(tool.useCases, []),
    examples: safeJsonParse<string[]>(tool.examples, []),
    tips: safeJsonParse<string[]>(tool.tips, []),
    faqs: safeJsonParse<{ q: string; a: string }[]>(tool.faqs, []),
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/tools/${tool.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          category: form.category,
          icon: form.icon,
          isFeatured: form.isFeatured,
          isHidden: form.isHidden,
          sortOrder: parseInt(form.sortOrder) || 0,
          inputFormats: form.inputFormats.split(",").map(s => s.trim()).filter(Boolean),
          outputFormats: form.outputFormats.split(",").map(s => s.trim()).filter(Boolean),
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          introduction: form.introduction || null,
          version: form.version,
          license: form.license,
          developer: form.developer,
          steps: form.steps.length > 0 ? JSON.stringify(form.steps.filter(Boolean)) : null,
          features: form.features.length > 0 ? JSON.stringify(form.features.filter(Boolean)) : null,
          benefits: form.benefits.length > 0 ? JSON.stringify(form.benefits.filter(Boolean)) : null,
          advantages: form.advantages.length > 0 ? JSON.stringify(form.advantages.filter(Boolean)) : null,
          commonErrors: form.commonErrors.length > 0 ? JSON.stringify(form.commonErrors.filter(Boolean)) : null,
          useCases: form.useCases.length > 0 ? JSON.stringify(form.useCases.filter(Boolean)) : null,
          examples: form.examples.length > 0 ? JSON.stringify(form.examples.filter(Boolean)) : null,
          tips: form.tips.length > 0 ? JSON.stringify(form.tips.filter(Boolean)) : null,
          faqs: form.faqs.length > 0 ? JSON.stringify(form.faqs.filter(f => f.q.trim() || f.a.trim())) : null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onSave(updated);
      toast({ title: "Tool updated" });
    } catch {
      toast({ title: "Failed to update tool", variant: "destructive" });
    } finally { setSaving(false); }
  }

  function set(k: string, v: any) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/95 border border-slate-800/80 backdrop-blur-lg rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col text-slate-100 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/20">
          <div>
            <h2 className="font-semibold text-lg">Edit: {tool.name}</h2>
            <p className="text-xs text-muted-foreground">Manage all parameters and SEO fields for this tool.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 px-5 py-3 border-b border-slate-800/80 bg-slate-950/20 overflow-x-auto whitespace-nowrap scrollbar-none">
          <Button variant={modalTab === "basic" ? "default" : "ghost"} size="sm" onClick={() => setModalTab("basic")} className={cn("text-xs rounded-xl px-3 py-1.5 font-medium", modalTab === "basic" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200")}>Basic Info</Button>
          <Button variant={modalTab === "seo" ? "default" : "ghost"} size="sm" onClick={() => setModalTab("seo")} className={cn("text-xs rounded-xl px-3 py-1.5 font-medium", modalTab === "seo" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200")}>SEO Meta</Button>
          <Button variant={modalTab === "content" ? "default" : "ghost"} size="sm" onClick={() => setModalTab("content")} className={cn("text-xs rounded-xl px-3 py-1.5 font-medium", modalTab === "content" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200")}>Intro &amp; FAQs</Button>
          <Button variant={modalTab === "details" ? "default" : "ghost"} size="sm" onClick={() => setModalTab("details")} className={cn("text-xs rounded-xl px-3 py-1.5 font-medium", modalTab === "details" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200")}>Details &amp; Tips</Button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {modalTab === "basic" && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} className="resize-none h-20" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select className="w-full border border-slate-800 bg-slate-950/80 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/60" value={form.category} onChange={e => set("category", e.target.value)}>
                    {["pdf", "image", "convert", "text", "calculator"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Icon (Lucide name)</Label><Input value={form.icon} onChange={e => set("icon", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Input Formats (comma sep)</Label><Input value={form.inputFormats} onChange={e => set("inputFormats", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Output Formats (comma sep)</Label><Input value={form.outputFormats} onChange={e => set("outputFormats", e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>Sort Order</Label><Input type="number" value={form.sortOrder} onChange={e => set("sortOrder", e.target.value)} /></div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch id="featured" checked={form.isFeatured} onCheckedChange={v => set("isFeatured", v)} />
                  <Label htmlFor="featured">Featured</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="hidden" checked={form.isHidden} onCheckedChange={v => set("isHidden", v)} />
                  <Label htmlFor="hidden">Hidden</Label>
                </div>
              </div>
            </div>
          )}

          {modalTab === "seo" && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Meta Title (SEO)</Label><Input value={form.metaTitle} onChange={e => set("metaTitle", e.target.value)} placeholder="Google search title..." /></div>
              <div className="space-y-1.5"><Label>Meta Description (SEO)</Label><Textarea value={form.metaDescription} onChange={e => set("metaDescription", e.target.value)} className="resize-none h-20" placeholder="Google snippet description..." /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Version</Label><Input value={form.version} onChange={e => set("version", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>License</Label><Input value={form.license} onChange={e => set("license", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Developer</Label><Input value={form.developer} onChange={e => set("developer", e.target.value)} /></div>
              </div>
            </div>
          )}

          {modalTab === "content" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Introduction Paragraph</Label>
                <Textarea value={form.introduction} onChange={e => set("introduction", e.target.value)} className="resize-none h-24" placeholder="Detailed introduction explaining what the tool is and why users need it..." />
              </div>
              <StringListEditor label="How-To Steps (Ordered)" items={form.steps} onChange={items => set("steps", items)} placeholder="e.g. Select the PDF file you want to compress" />
              <FaqListEditor faqs={form.faqs} onChange={faqs => set("faqs", faqs)} />
            </div>
          )}

          {modalTab === "details" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StringListEditor label="Key Features" items={form.features} onChange={items => set("features", items)} placeholder="e.g. 100% free and secure" />
              <StringListEditor label="Key Benefits" items={form.benefits} onChange={items => set("benefits", items)} placeholder="e.g. Saves local storage space" />
              <StringListEditor label="Advantages" items={form.advantages} onChange={items => set("advantages", items)} placeholder="e.g. Runs fully in your browser" />
              <StringListEditor label="Use Cases" items={form.useCases} onChange={items => set("useCases", items)} placeholder="e.g. Email attachments with size limits" />
              <StringListEditor label="Useful Tips" items={form.tips} onChange={items => set("tips", items)} placeholder="e.g. Check content before formatting" />
              <StringListEditor label="Common Errors &amp; Fixes" items={form.commonErrors} onChange={items => set("commonErrors", items)} placeholder="e.g. Invalid file format - convert first" />
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-800/80 bg-slate-950/20">
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-0 rounded-2xl text-xs py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/10 cursor-pointer">
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1 border-slate-800 hover:bg-slate-900/60 rounded-2xl text-xs text-slate-400 hover:text-slate-250 cursor-pointer">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ----- Add Tool Modal -----
function AddToolModal({ token, onAdd, onClose }: {
  token: string;
  onAdd: (tool: Tool) => void;
  onClose: () => void;
}) {
  const [modalTab, setModalTab] = useState<"basic" | "seo" | "content" | "details">("basic");
  const [form, setForm] = useState({
    slug: "", name: "", description: "", category: "pdf",
    icon: "FileText", inputFormats: "", outputFormats: "",
    isFeatured: false, isHidden: false, sortOrder: "0",
    metaTitle: "", metaDescription: "", introduction: "",
    version: "1.0.0", license: "MIT", developer: "5toolbox",
    steps: [] as string[],
    features: [] as string[],
    benefits: [] as string[],
    advantages: [] as string[],
    commonErrors: [] as string[],
    useCases: [] as string[],
    examples: [] as string[],
    tips: [] as string[],
    faqs: [] as { q: string; a: string }[],
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleAdd() {
    if (!form.slug || !form.name || !form.description) {
      toast({ title: "slug, name and description are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/tools`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          description: form.description,
          category: form.category,
          icon: form.icon,
          isFeatured: form.isFeatured,
          isHidden: form.isHidden,
          sortOrder: parseInt(form.sortOrder) || 0,
          inputFormats: form.inputFormats.split(",").map(s => s.trim()).filter(Boolean),
          outputFormats: form.outputFormats.split(",").map(s => s.trim()).filter(Boolean),
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          introduction: form.introduction || null,
          version: form.version,
          license: form.license,
          developer: form.developer,
          steps: form.steps.length > 0 ? JSON.stringify(form.steps.filter(Boolean)) : null,
          features: form.features.length > 0 ? JSON.stringify(form.features.filter(Boolean)) : null,
          benefits: form.benefits.length > 0 ? JSON.stringify(form.benefits.filter(Boolean)) : null,
          advantages: form.advantages.length > 0 ? JSON.stringify(form.advantages.filter(Boolean)) : null,
          commonErrors: form.commonErrors.length > 0 ? JSON.stringify(form.commonErrors.filter(Boolean)) : null,
          useCases: form.useCases.length > 0 ? JSON.stringify(form.useCases.filter(Boolean)) : null,
          examples: form.examples.length > 0 ? JSON.stringify(form.examples.filter(Boolean)) : null,
          tips: form.tips.length > 0 ? JSON.stringify(form.tips.filter(Boolean)) : null,
          faqs: form.faqs.length > 0 ? JSON.stringify(form.faqs.filter(f => f.q.trim() || f.a.trim())) : null,
        }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      onAdd(created);
      toast({ title: "Tool created" });
    } catch {
      toast({ title: "Failed to create tool", variant: "destructive" });
    } finally { setSaving(false); }
  }

  function set(k: string, v: any) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/20">
          <div>
            <h2 className="font-semibold text-lg">Add New Tool</h2>
            <p className="text-xs text-muted-foreground">Create a new tool and define its SEO, introduction, and FAQs.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 px-5 py-3 border-b border-slate-800/80 bg-slate-950/20 overflow-x-auto whitespace-nowrap scrollbar-none">
          <Button variant={modalTab === "basic" ? "default" : "ghost"} size="sm" onClick={() => setModalTab("basic")} className={cn("text-xs rounded-xl px-3 py-1.5 font-medium", modalTab === "basic" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200")}>Basic Info</Button>
          <Button variant={modalTab === "seo" ? "default" : "ghost"} size="sm" onClick={() => setModalTab("seo")} className={cn("text-xs rounded-xl px-3 py-1.5 font-medium", modalTab === "seo" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200")}>SEO Meta</Button>
          <Button variant={modalTab === "content" ? "default" : "ghost"} size="sm" onClick={() => setModalTab("content")} className={cn("text-xs rounded-xl px-3 py-1.5 font-medium", modalTab === "content" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200")}>Intro &amp; FAQs</Button>
          <Button variant={modalTab === "details" ? "default" : "ghost"} size="sm" onClick={() => setModalTab("details")} className={cn("text-xs rounded-xl px-3 py-1.5 font-medium", modalTab === "details" ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-200")}>Details &amp; Tips</Button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {modalTab === "basic" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Slug <span className="text-destructive">*</span></Label><Input value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="e.g. pdf-compress" /></div>
                <div className="space-y-1.5"><Label>Name <span className="text-destructive">*</span></Label><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Compress PDF" /></div>
              </div>
              <div className="space-y-1.5"><Label>Description <span className="text-destructive">*</span></Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} className="resize-none h-20" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select className="w-full border border-slate-800 bg-slate-950/80 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/60" value={form.category} onChange={e => set("category", e.target.value)}>
                    {["pdf", "image", "convert", "text", "calculator"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Icon (Lucide name)</Label><Input value={form.icon} onChange={e => set("icon", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Input Formats (comma sep)</Label><Input value={form.inputFormats} onChange={e => set("inputFormats", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Output Formats (comma sep)</Label><Input value={form.outputFormats} onChange={e => set("outputFormats", e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>Sort Order</Label><Input type="number" value={form.sortOrder} onChange={e => set("sortOrder", e.target.value)} /></div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2"><Switch checked={form.isFeatured} onCheckedChange={v => set("isFeatured", v)} /><Label>Featured</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.isHidden} onCheckedChange={v => set("isHidden", v)} /><Label>Hidden</Label></div>
              </div>
            </div>
          )}

          {modalTab === "seo" && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Meta Title (SEO)</Label><Input value={form.metaTitle} onChange={e => set("metaTitle", e.target.value)} placeholder="Google search title..." /></div>
              <div className="space-y-1.5"><Label>Meta Description (SEO)</Label><Textarea value={form.metaDescription} onChange={e => set("metaDescription", e.target.value)} className="resize-none h-20" placeholder="Google snippet description..." /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5"><Label>Version</Label><Input value={form.version} onChange={e => set("version", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>License</Label><Input value={form.license} onChange={e => set("license", e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Developer</Label><Input value={form.developer} onChange={e => set("developer", e.target.value)} /></div>
              </div>
            </div>
          )}

          {modalTab === "content" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Introduction Paragraph</Label>
                <Textarea value={form.introduction} onChange={e => set("introduction", e.target.value)} className="resize-none h-24" placeholder="Detailed introduction explaining what the tool is and why users need it..." />
              </div>
              <StringListEditor label="How-To Steps (Ordered)" items={form.steps} onChange={items => set("steps", items)} placeholder="e.g. Select the PDF file you want to compress" />
              <FaqListEditor faqs={form.faqs} onChange={faqs => set("faqs", faqs)} />
            </div>
          )}

          {modalTab === "details" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StringListEditor label="Key Features" items={form.features} onChange={items => set("features", items)} placeholder="e.g. 100% free and secure" />
              <StringListEditor label="Key Benefits" items={form.benefits} onChange={items => set("benefits", items)} placeholder="e.g. Saves local storage space" />
              <StringListEditor label="Advantages" items={form.advantages} onChange={items => set("advantages", items)} placeholder="e.g. Runs fully in your browser" />
              <StringListEditor label="Use Cases" items={form.useCases} onChange={items => set("useCases", items)} placeholder="e.g. Email attachments with size limits" />
              <StringListEditor label="Useful Tips" items={form.tips} onChange={items => set("tips", items)} placeholder="e.g. Check content before formatting" />
              <StringListEditor label="Common Errors &amp; Fixes" items={form.commonErrors} onChange={items => set("commonErrors", items)} placeholder="e.g. Invalid file format - convert first" />
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t">
          <Button onClick={handleAdd} disabled={saving} className="flex-1">
            <Plus className="h-4 w-4 mr-2" />{saving ? "Creating…" : "Create Tool"}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ----- Settings Panel -----
function SettingsPanel({ token, onPasswordChange }: { token: string; onPasswordChange: (pw: string) => void }) {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`${API}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setSettings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...settings };
      if (!payload.admin_password) {
        delete payload.admin_password;
      }
      const res = await fetch(`${API}/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Settings saved" });
      if (settings.admin_password && settings.admin_password !== token) {
        onPasswordChange(settings.admin_password);
      }
      setSettings(prev => {
        const next = { ...prev };
        delete next.admin_password;
        return next;
      });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally { setSaving(false); }
  }

  function set(k: keyof SiteSettings, v: string) {
    setSettings(prev => ({ ...prev, [k]: v }));
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading settings…</p>;

  const isMaintenanceOn = settings.maintenance_mode === "true";

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Maintenance Mode */}
      <div className={`rounded-xl p-4 flex items-start gap-3 ${isMaintenanceOn ? "bg-red-50 border border-red-200" : "bg-muted/50 border"}`}>
        <div className={`p-1.5 rounded-lg shrink-0 ${isMaintenanceOn ? "bg-red-100" : "bg-muted"}`}>
          <Settings className={`h-4 w-4 ${isMaintenanceOn ? "text-red-600" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${isMaintenanceOn ? "text-red-800" : ""}`}>
            {isMaintenanceOn ? "⚠️ Maintenance mode is ON — site shows maintenance page to visitors" : "Maintenance mode is off"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">When enabled, visitors see a maintenance notice. Admins can still access /admin.</p>
        </div>
        <Switch
          checked={isMaintenanceOn}
          onCheckedChange={v => set("maintenance_mode", v ? "true" : "false")}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Maintenance Message (shown to visitors)</Label>
        <Input
          value={settings.maintenance_message ?? ""}
          onChange={e => set("maintenance_message", e.target.value)}
          placeholder="We're performing scheduled maintenance. Back soon!"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Maintenance Pages / Tools (comma-separated slugs/paths)</Label>
        <Input
          value={settings.maintenance_paths ?? ""}
          onChange={e => set("maintenance_paths", e.target.value)}
          placeholder="e.g. compress-pdf, /blog, /tools/split-pdf"
        />
        <p className="text-[11px] text-muted-foreground">
          Leave empty to apply maintenance globally when toggled ON. Specify paths or slugs to put only specific pages/tools under maintenance.
        </p>
      </div>
      <Separator />
      <div className="space-y-1.5">
        <Label>Site Title</Label>
        <Input value={settings.site_title ?? ""} onChange={e => set("site_title", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Meta Description</Label>
        <Textarea value={settings.site_description ?? ""} onChange={e => set("site_description", e.target.value)} className="resize-none h-24" />
      </div>
      <div className="space-y-1.5">
        <Label>Meta Keywords</Label>
        <Input value={settings.site_keywords ?? ""} onChange={e => set("site_keywords", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Analytics / Header Code (HTML)</Label>
        <Textarea value={settings.analytics_code ?? ""} onChange={e => set("analytics_code", e.target.value)} placeholder="<!-- Google Analytics or other scripts -->" className="font-mono text-xs resize-none h-24" />
      </div>
      <Separator />
      <div className="space-y-1.5">
        <Label>Title Animation Style</Label>
        <select
          value={settings.title_animation ?? "none"}
          onChange={e => set("title_animation", e.target.value)}
          className="w-full border border-slate-800 bg-slate-950/80 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500/60"
        >
          <option value="none">Static Title (No Animation)</option>
          <option value="scrolling">Scrolling Title Text</option>
          <option value="typing">Typing Text Effect</option>
          <option value="bounce">Bouncing Promotional Titles</option>
        </select>
        <p className="text-xs text-muted-foreground">Animates the browser tab title text dynamically.</p>
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
        <div>
          <p className="font-medium text-sm">Enable Site-wide Animations</p>
          <p className="text-xs text-muted-foreground mt-0.5">Smooth modern slide-up entrance transitions for pages</p>
        </div>
        <Switch
          checked={settings.website_animations !== "false"}
          onCheckedChange={v => set("website_animations", v ? "true" : "false")}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Footer Copyright Text</Label>
        <Input
          value={settings.footer_copyright ?? ""}
          onChange={e => set("footer_copyright", e.target.value)}
          placeholder="e.g. &copy; 2026 5toolbox. All rights reserved."
        />
        <p className="text-xs text-muted-foreground">Leave blank to use default copyright text.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Contact Email (Email Us)</Label>
        <Input
          value={settings.email_contact ?? ""}
          onChange={e => set("email_contact", e.target.value)}
          placeholder="hello@5toolbox.app"
        />
        <p className="text-xs text-muted-foreground">Displayed on the Contact page. Leave blank to hide the Email Us card.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Privacy Email</Label>
        <Input
          value={settings.email_privacy ?? ""}
          onChange={e => set("email_privacy", e.target.value)}
          placeholder="privacy@5toolbox.app"
        />
        <p className="text-xs text-muted-foreground">Displayed on the Privacy Policy and Cookie Policy pages.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Legal Email</Label>
        <Input
          value={settings.email_legal ?? ""}
          onChange={e => set("email_legal", e.target.value)}
          placeholder="legal@5toolbox.app"
        />
        <p className="text-xs text-muted-foreground">Displayed on the Terms of Service page.</p>
      </div>
      <Separator />
      <div className="space-y-1.5">
        <Label>Change Admin Password</Label>
        <Input type="password" value={settings.admin_password ?? ""} onChange={e => set("admin_password", e.target.value)} placeholder="New password" />
        <p className="text-xs text-muted-foreground">Leave blank to keep current password. You'll be logged out after changing.</p>
      </div>
      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}

// ----- Ads Settings Panel -----
function AdsPanel({ token }: { token: string }) {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`${API}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setSettings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          adsense_enabled: settings.adsense_enabled ?? "false",
          adsense_client: settings.adsense_client ?? "",
          adsense_slot_leaderboard: settings.adsense_slot_leaderboard ?? "",
          adsense_slot_rectangle: settings.adsense_slot_rectangle ?? "",
          adsense_slot_responsive: settings.adsense_slot_responsive ?? "",
        }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Ad settings saved — reload the site to apply" });
    } catch {
      toast({ title: "Failed to save ad settings", variant: "destructive" });
    } finally { setSaving(false); }
  }

  function set(k: keyof SiteSettings, v: string) {
    setSettings(prev => ({ ...prev, [k]: v }));
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading ad settings…</p>;

  const isEnabled = settings.adsense_enabled === "true";
  const hasClient = !!settings.adsense_client && !settings.adsense_client.includes("XXXX");

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Status banner */}
      <div className={`rounded-xl p-4 flex items-start gap-3 ${isEnabled && hasClient ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
        <div className={`p-1.5 rounded-lg ${isEnabled && hasClient ? "bg-green-100" : "bg-amber-100"}`}>
          <Megaphone className={`h-4 w-4 ${isEnabled && hasClient ? "text-green-600" : "text-amber-600"}`} />
        </div>
        <div>
          <p className={`text-sm font-medium ${isEnabled && hasClient ? "text-green-800" : "text-amber-800"}`}>
            {isEnabled && hasClient ? "Ads are live" : isEnabled ? "Ads enabled — set your Publisher ID below" : "Ads are disabled"}
          </p>
          <p className={`text-xs mt-0.5 ${isEnabled && hasClient ? "text-green-600" : "text-amber-600"}`}>
            {isEnabled && hasClient
              ? "AdSense units will render in production. Placeholders show in dev mode."
              : "Enable ads and enter your Google AdSense details to monetize the site."}
          </p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border bg-card">
        <div>
          <p className="font-medium text-sm">Enable Google AdSense</p>
          <p className="text-xs text-muted-foreground mt-0.5">Show ads on category pages, tool pages, and home page</p>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={v => set("adsense_enabled", v ? "true" : "false")}
        />
      </div>

      <Separator />

      {/* Publisher ID */}
      <div className="space-y-1.5">
        <Label>Publisher ID</Label>
        <Input
          value={settings.adsense_client ?? ""}
          onChange={e => set("adsense_client", e.target.value)}
          placeholder="ca-pub-XXXXXXXXXXXXXXXX"
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">Found in your AdSense dashboard → Account → Account information</p>
      </div>

      <Separator />
      <p className="text-sm font-medium text-muted-foreground">Ad Slot IDs — found in AdSense → Ads → By ad unit</p>

      <div className="space-y-4">
        {[
          { key: "adsense_slot_leaderboard" as const, label: "Leaderboard (728×90)", where: "Bottom of category pages" },
          { key: "adsense_slot_rectangle" as const, label: "Rectangle (336×280)", where: "Below tool card on tool pages" },
          { key: "adsense_slot_responsive" as const, label: "Responsive", where: "Home page between sections" },
        ].map(({ key, label, where }) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{label}</Label>
              <span className="text-xs text-muted-foreground">{where}</span>
            </div>
            <Input
              value={settings[key] ?? ""}
              onChange={e => set(key, e.target.value)}
              placeholder="e.g. 1234567890"
              className="font-mono"
            />
          </div>
        ))}
      </div>

      <Separator />

      {/* AdSense script reminder */}
      <div className="rounded-xl bg-muted/50 border p-4 space-y-2">
        <p className="text-sm font-medium">⚡ One more step</p>
        <p className="text-xs text-muted-foreground">Also uncomment the AdSense script in <code className="bg-muted px-1 py-0.5 rounded">artifacts/filezone/index.html</code> and replace the publisher ID there too:</p>
        <pre className="text-[10px] font-mono bg-muted rounded-lg p-3 overflow-x-auto text-muted-foreground whitespace-pre-wrap">
{`<script async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.adsense_client || "ca-pub-XXXXXXXXXXXXXXXX"}"
  crossorigin="anonymous">
</script>`}
        </pre>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save Ad Settings"}
      </Button>
    </div>
  );
}

// ----- Contacts Panel -----
function ContactsPanel({ token }: { token: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/admin/contacts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setContacts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  async function markRead(id: number) {
    await fetch(`${API}/admin/contacts/${id}/read`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setContacts(prev => prev.map(c => c.id === id ? { ...c, isRead: true } : c));
  }

  async function deleteContact(id: number) {
    if (!confirm("Delete this message?")) return;
    await fetch(`${API}/admin/contacts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    setContacts(prev => prev.filter(c => c.id !== id));
    toast({ title: "Message deleted" });
  }

  const unread = contacts.filter(c => !c.isRead).length;

  if (loading) return <p className="text-muted-foreground text-sm p-2">Loading messages…</p>;

  return (
    <div className="space-y-4">
      {unread > 0 && (
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <Inbox className="h-4 w-4 shrink-0" />
          <span>{unread} unread message{unread > 1 ? "s" : ""}</span>
        </div>
      )}
      {contacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No contact submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map(c => (
            <div
              key={c.id}
              className={cn(
                "rounded-xl border transition-colors",
                !c.isRead ? "bg-blue-50/50 border-blue-200" : "bg-card"
              )}
            >
              <div
                className="flex items-start justify-between gap-4 p-4 cursor-pointer"
                onClick={() => { setExpanded(expanded === c.id ? null : c.id); if (!c.isRead) markRead(c.id); }}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn("p-2 rounded-lg shrink-0 mt-0.5", !c.isRead ? "bg-blue-100" : "bg-muted")}>
                    <Mail className={cn("h-3.5 w-3.5", !c.isRead ? "text-blue-600" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      {!c.isRead && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-medium">New</span>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.email} · {c.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                    onClick={e => { e.stopPropagation(); deleteContact(c.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {expanded === c.id && (
                <div className="px-4 pb-4 border-t pt-3 mx-4 space-y-2">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span><span className="font-medium text-foreground">From:</span> {c.name} &lt;{c.email}&gt;</span>
                    <span><span className="font-medium text-foreground">Subject:</span> {c.subject}</span>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {c.message}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                      <a href={`mailto:${c.email}?subject=Re: ${c.subject}`}>Reply via Email</a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ----- SEO Panel -----
function SeoPanel() {
  const { toast } = useToast();
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tools.itsyasin.me";
  const sitemapUrl = `${origin}/sitemap.xml`;
  const robotsUrl = `${origin}/robots.txt`;

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied` }));
  }

  const steps = [
    {
      num: 1,
      title: "Open Google Search Console",
      desc: "Go to search.google.com/search-console and sign in with your Google account.",
      action: { label: "Open Search Console", href: "https://search.google.com/search-console" },
    },
    {
      num: 2,
      title: "Add your property",
      desc: "Click \"Add property\", choose \"URL prefix\", and enter your site URL (e.g. https://tools.itsyasin.me). Verify ownership using the HTML tag method by pasting the tag into your site's <head>.",
      action: null,
    },
    {
      num: 3,
      title: "Submit your sitemap",
      desc: "In the left sidebar, go to Indexing → Sitemaps. Paste your sitemap URL below and click Submit.",
      action: { label: "Copy sitemap URL", copy: sitemapUrl },
    },
    {
      num: 4,
      title: "Request indexing for key pages",
      desc: "Use the URL Inspection tool to request indexing for your homepage and main category pages immediately after launch.",
      action: { label: "Open URL Inspection", href: "https://search.google.com/search-console/inspect" },
    },
    {
      num: 5,
      title: "Monitor coverage & performance",
      desc: "Within 1-2 weeks, check Pages → Indexing report to confirm pages are indexed, and Performance to see click/impression data.",
      action: null,
    },
  ];

  const checks = [
    { label: "Dynamic page titles & meta descriptions", done: true },
    { label: "Open Graph + Twitter Card tags", done: true },
    { label: "Canonical URLs on every page", done: true },
    { label: "Sitemap.xml (auto-generated from DB)", done: true },
    { label: "robots.txt (allows crawling, blocks /admin)", done: true },
    { label: "Privacy, Terms & Cookie Policy are fully indexable", done: true },
  ];

  return (
    <div className="space-y-8 max-w-2xl">
      {/* SEO health */}
      <div className="rounded-xl border bg-green-50 border-green-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="font-semibold text-green-800">SEO is fully configured</p>
        </div>
        <div className="space-y-2">
          {checks.map(c => (
            <div key={c.label} className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-green-700">{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sitemap + robots */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm">Your crawlable files</h3>
        {[
          { label: "Sitemap", url: sitemapUrl, icon: Globe },
          { label: "Robots.txt", url: robotsUrl, icon: FileText },
        ].map(({ label, url, icon: Icon }) => (
          <div key={url} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="text-sm font-mono truncate">{url}</p>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-8 px-2.5" onClick={() => copy(url, label)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" className="h-8 px-2.5" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* GSC guide */}
      <div>
        <h3 className="font-semibold mb-1">Submit to Google Search Console</h3>
        <p className="text-sm text-muted-foreground mb-5">Follow these steps after deploying to get your pages indexed on Google within a few days.</p>
        <div className="space-y-4">
          {steps.map(step => (
            <div key={step.num} className="flex gap-4">
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {step.num}
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
                {step.action && (
                  step.action.href ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                      <a href={step.action.href} target="_blank" rel="noopener noreferrer">
                        {step.action.label} <ExternalLink className="h-3 w-3 ml-1.5" />
                      </a>
                    </Button>
                  ) : step.action.copy ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copy(step.action!.copy!, step.action!.label)}>
                      <Copy className="h-3 w-3 mr-1.5" /> {step.action.label}
                    </Button>
                  ) : null
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Pro tip */}
      <div className="rounded-xl bg-muted/50 border p-4 space-y-1.5">
        <p className="text-sm font-medium">💡 Pro tip — speed up indexing</p>
        <p className="text-xs text-muted-foreground">
          After submitting your sitemap, use the <strong>URL Inspection</strong> tool in Search Console to manually request indexing for your homepage, each category page (e.g. /pdf, /image), and your 5-10 most important tool pages. Google processes these within hours instead of weeks.
        </p>
      </div>
    </div>
  );
}

// ----- Main Admin Page -----
export function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") ?? "");
  const [tools, setTools] = useState<Tool[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [addingTool, setAddingTool] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any | null>(null);
  const [addingBlog, setAddingBlog] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  const [addingArticle, setAddingArticle] = useState(false);
  const [activeTab, setActiveTab] = useState<"tools" | "stats" | "contacts" | "settings" | "ads" | "seo" | "blogs" | "articles" | "comments" | "ratings">("tools");
  const [contactCount, setContactCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/admin/contacts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { isRead: boolean }[]) => {
        if (Array.isArray(d)) setContactCount(d.filter(c => !c.isRead).length);
      })
      .catch(() => {});
  }, [token]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { toast } = useToast();

  function handleLogin(t: string) {
    sessionStorage.setItem("admin_token", t);
    setToken(t);
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_token");
    setToken("");
  }

  async function loadTools() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/tools`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { handleLogout(); return; }
      const data = await res.json();
      setTools(data);
    } catch {
      toast({ title: "Failed to load tools", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function loadStats() {
    try {
      const res = await fetch(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAdminStats(await res.json());
    } catch {}
  }

  useEffect(() => {
    if (token) { loadTools(); loadStats(); }
  }, [token]);

  async function toggleHidden(tool: Tool) {
    try {
      const res = await fetch(`${API}/admin/tools/${tool.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isHidden: !tool.isHidden }),
      });
      if (!res.ok) throw new Error();
      setTools(prev => prev.map(t => t.slug === tool.slug ? { ...t, isHidden: !t.isHidden } : t));
    } catch {
      toast({ title: "Failed to update tool", variant: "destructive" });
    }
  }

  async function toggleFeatured(tool: Tool) {
    try {
      const res = await fetch(`${API}/admin/tools/${tool.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isFeatured: !tool.isFeatured }),
      });
      if (!res.ok) throw new Error();
      setTools(prev => prev.map(t => t.slug === tool.slug ? { ...t, isFeatured: !t.isFeatured } : t));
    } catch {
      toast({ title: "Failed to update tool", variant: "destructive" });
    }
  }

  async function deleteTool(tool: Tool) {
    if (!confirm(`Delete "${tool.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/admin/tools/${tool.slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setTools(prev => prev.filter(t => t.slug !== tool.slug));
      toast({ title: `"${tool.name}" deleted` });
    } catch {
      toast({ title: "Failed to delete tool", variant: "destructive" });
    }
  }

  async function handleResetStats(slug: string) {
    const toolName = tools.find(t => t.slug === slug)?.name || slug;
    if (!confirm(`Are you sure you want to reset usage statistics for "${toolName}"?`)) return;
    try {
      const res = await fetch(`${API}/admin/tools/${slug}/reset-usage`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setTools(prev => prev.map(t => t.slug === slug ? { ...t, usageCount: 0 } : t));
      toast({ title: `Usage statistics for "${toolName}" reset successfully` });
      loadStats();
    } catch {
      toast({ title: "Failed to reset stats", variant: "destructive" });
    }
  }

  if (!token) return <LoginScreen onLogin={handleLogin} />;

  const categories = ["all", ...Array.from(new Set(tools.map(t => t.category)))];
  const filtered = tools.filter(t => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase());
    const matchesCat = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const localStats = {
    total: tools.length,
    hidden: tools.filter(t => t.isHidden).length,
    featured: tools.filter(t => t.isFeatured).length,
    totalUsage: tools.reduce((a, t) => a + t.usageCount, 0),
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar Navigation */}
      <aside className="w-64 flex flex-col border-r border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0 h-screen p-5 z-20">
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <div className="bg-indigo-600/10 border border-indigo-500/20 p-2 rounded-xl text-indigo-400">
            <Layers className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400 leading-none">5toolbox Admin</h1>
            <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">Control Center</p>
          </div>
        </div>

        {/* Vertical Tabs List */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {[
            { id: "tools", label: "Tools Manager", icon: <BarChart2 className="h-4 w-4" /> },
            { id: "blogs", label: "Blogs Manager", icon: <BookOpen className="h-4 w-4" /> },
            { id: "articles", label: "Articles Manager", icon: <FileText className="h-4 w-4" /> },
            { id: "comments", label: "Comments", icon: <MessageSquare className="h-4 w-4" /> },
            { id: "ratings", label: "Ratings Moderation", icon: <Star className="h-4 w-4" /> },
            { id: "stats", label: "Analytics", icon: <TrendingUp className="h-4 w-4" /> },
            { id: "settings", label: "Site Settings", icon: <Settings className="h-4 w-4" /> },
            { id: "ads", label: "Ad Settings", icon: <Megaphone className="h-4 w-4" /> },
            {
              id: "contacts",
              label: "Contacts",
              icon: <Mail className="h-4 w-4" />,
              badge: contactCount > 0 ? contactCount : null
            },
            { id: "seo", label: "SEO & Indexing", icon: <Search className="h-4 w-4" /> }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === "contacts") setContactCount(0);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 border cursor-pointer text-left",
                  isActive
                    ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 font-medium shadow-md shadow-indigo-500/5"
                    : "border-transparent text-slate-400 hover:bg-slate-900/40 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
                {tab.badge && (
                  <span className="h-4.5 min-w-4.5 px-1 rounded-full bg-indigo-500 text-white font-bold text-[9px] flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-slate-900">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-slate-900 bg-slate-950/80 hover:bg-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl py-2.5 text-xs transition-all cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto z-10 flex flex-col min-h-screen">
        {/* Content Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-900">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Management Console</div>
            <h2 className="text-xl font-bold text-slate-200 capitalize mt-1">
              {activeTab === "stats" ? "Analytics Overview" : `${activeTab} Management`}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-950/60 border-slate-900 hover:bg-slate-900 hover:border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              onClick={() => {
                loadTools();
                loadStats();
                window.dispatchEvent(new CustomEvent("refresh-blogs"));
                window.dispatchEvent(new CustomEvent("refresh-articles"));
                window.dispatchEvent(new CustomEvent("refresh-comments"));
                window.dispatchEvent(new CustomEvent("refresh-ratings"));
                toast({ title: "Sync complete", description: "All dashboard caches updated." });
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Synchronize
            </Button>
            <Link href="/" className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-3 py-1.5 text-xs font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all">
              <ExternalLink className="h-3.5 w-3.5" /> Visit Site
            </Link>
          </div>
        </header>

        {/* Real Stats Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Visitors",
              value: (adminStats?.totalVisitors ?? 0).toLocaleString(),
              icon: <Users className="h-4 w-4 text-blue-400" />,
              gradient: "from-blue-500/10 to-indigo-500/5",
              glow: "group-hover:border-blue-500/30",
              sub: "All-time sessions"
            },
            {
              label: "Files Processed",
              value: (adminStats?.totalFilesProcessed ?? localStats.totalUsage).toLocaleString(),
              icon: <FileStack className="h-4 w-4 text-emerald-400" />,
              gradient: "from-emerald-500/10 to-teal-500/5",
              glow: "group-hover:border-emerald-500/30",
              sub: "Actions completed"
            },
            {
              label: "Active Tools",
              value: (adminStats ? adminStats.totalTools - adminStats.hiddenTools : localStats.total - localStats.hidden).toString(),
              icon: <TrendingUp className="h-4 w-4 text-violet-400" />,
              gradient: "from-violet-500/10 to-purple-500/5",
              glow: "group-hover:border-violet-500/30",
              sub: `${adminStats?.hiddenTools ?? localStats.hidden} items hidden`
            },
            {
              label: "Featured Tools",
              value: (adminStats?.featuredTools ?? localStats.featured).toString(),
              icon: <Star className="h-4 w-4 text-amber-400" />,
              gradient: "from-amber-500/10 to-orange-500/5",
              glow: "group-hover:border-amber-500/30",
              sub: "Promoted to home"
            }
          ].map(s => (
            <div key={s.label} className={cn(
              "bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 relative overflow-hidden transition-all duration-300 group hover:translate-y-[-2px] hover:bg-slate-900/60 hover:border-slate-700/60",
              s.glow
            )}>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.sub}</span>
                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">{s.icon}</div>
              </div>
              <div className="relative z-10">
                <p className="text-2xl font-bold tracking-tight text-slate-100">{s.value}</p>
                <p className="text-[11px] text-slate-400 mt-1">{s.label}</p>
              </div>
              {/* Subtle card glow overlay */}
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none transition-opacity duration-300 group-hover:opacity-75", s.gradient)} />
            </div>
          ))}
        </section>

        {/* Tab Viewport */}
        <section className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-2xl relative z-10 flex-1 flex flex-col">
          {/* Tools Manager Tab */}
          {activeTab === "tools" && (
            <div className="space-y-6 flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      placeholder="Search tools..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs focus-visible:ring-0 focus-visible:ring-offset-0 text-slate-200"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="border border-slate-800 bg-slate-950/60 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat} className="bg-slate-950 text-slate-300">
                        {cat === "all" ? "All Categories" : cat.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={() => setAddingTool(true)} size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shadow-lg shadow-indigo-500/10 cursor-pointer border-0">
                  <Plus className="h-4 w-4" /> Add Custom Tool
                </Button>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />
                  Loading tools database...
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                  <Inbox className="h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No tools match your filters</p>
                  <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search query or category filter</p>
                </div>
              ) : (
                <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/20 flex-1">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-950/80 border-b border-slate-900 text-slate-400 font-semibold">
                        <tr>
                          <th className="px-4 py-3">Tool Name / Info</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Uses</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60">
                        {filtered.map(tool => (
                          <tr key={tool.slug} className="hover:bg-slate-900/20 text-slate-200 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl text-slate-400">
                                  {tool.icon ? <div className="h-4 w-4 flex items-center justify-center font-bold text-[10px]">{tool.icon.substring(0,2)}</div> : <FileText className="h-4 w-4" />}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                    {tool.name}
                                    {tool.isFeatured && <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-1 py-0 justify-center">Featured</Badge>}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">/{tool.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={cn("text-[9px] border-0 px-2 py-0.5 justify-center capitalize font-semibold", 
                                tool.category === "pdf" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                tool.category === "image" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                tool.category === "text" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                tool.category === "convert" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" :
                                "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              )}>
                                {tool.category}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium">{tool.usageCount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold", 
                                tool.isHidden ? "bg-slate-900 text-slate-500 border border-slate-800" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              )}>
                                <span className={cn("w-1 h-1 rounded-full", tool.isHidden ? "bg-slate-600" : "bg-indigo-400")} />
                                {tool.isHidden ? "Hidden" : "Active"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-indigo-400 hover:bg-slate-900/60 rounded-lg cursor-pointer animate-none"
                                  title={tool.isHidden ? "Publish Tool" : "Hide Tool"}
                                  onClick={() => toggleHidden(tool)}
                                >
                                  {tool.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-amber-400 hover:bg-slate-900/60 rounded-lg cursor-pointer animate-none"
                                  title={tool.isFeatured ? "Unfeature Tool" : "Feature Tool"}
                                  onClick={() => toggleFeatured(tool)}
                                >
                                  {tool.isFeatured ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 rounded-lg cursor-pointer animate-none"
                                  title="Reset Stats"
                                  onClick={() => handleResetStats(tool.slug)}
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-sky-400 hover:bg-slate-900/60 rounded-lg cursor-pointer animate-none"
                                  title="Edit Info"
                                  onClick={() => setEditingTool(tool)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-slate-900/60 rounded-lg cursor-pointer animate-none"
                                  title="Delete"
                                  onClick={() => deleteTool(tool)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-slate-900 text-[10px] text-slate-500 font-medium">
                    Displaying {filtered.length} of {tools.length} active toolbox utilities
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Blogs Panel Tab */}
          {activeTab === "blogs" && (
            <BlogsPanel token={token} onEditBlog={setEditingBlog} onAddBlog={() => setAddingBlog(true)} />
          )}

          {/* Articles Panel Tab */}
          {activeTab === "articles" && (
            <ArticlesPanel token={token} onEditArticle={setEditingArticle} onAddArticle={() => setAddingArticle(true)} />
          )}

          {/* Comments Panel Tab */}
          {activeTab === "comments" && (
            <CommentsPanel token={token} />
          )}

          {/* Ratings Panel Tab */}
          {activeTab === "ratings" && (
            <RatingsPanel token={token} tools={tools} />
          )}

          {/* Analytics Tab */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
                <h2 className="font-semibold text-lg mb-4 text-slate-250">Top Tools by Usage</h2>
                {adminStats?.topTools?.length ? (
                  <div className="space-y-3">
                    {adminStats.topTools.map((t, i) => (
                      <div key={t.slug} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-5 text-right font-mono">{i + 1}.</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-slate-200">{t.name}</span>
                            <span className="text-xs font-mono text-slate-400">{t.usageCount.toLocaleString()}</span>
                          </div>
                          <div className="h-2 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-lg shadow-indigo-500/20"
                              style={{ width: `${Math.round((t.usageCount / (adminStats.topTools[0]?.usageCount || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                        <Badge className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 w-20 justify-center capitalize">{t.category}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No data yet. Usage is tracked when visitors use tools.</p>
                )}
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
                <h2 className="font-semibold text-lg mb-4 text-slate-250">Uses by Category</h2>
                {adminStats?.conversionsByCategory?.length ? (
                  <div className="space-y-3">
                    {adminStats.conversionsByCategory.sort((a, b) => b.count - a.count).map(cat => {
                      const max = Math.max(...adminStats.conversionsByCategory.map(c => c.count));
                      return (
                        <div key={cat.category} className="flex items-center gap-3">
                          <span className="text-xs capitalize w-20 text-slate-400">{cat.category}</span>
                          <div className="flex-1 h-2 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-lg shadow-indigo-500/20" style={{ width: `${Math.round((cat.count / max) * 100)}%` }} />
                          </div>
                          <span className="text-xs font-mono w-16 text-right text-slate-400">{cat.count.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No category data yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <h2 className="font-semibold text-lg mb-5 text-slate-250">Site Settings</h2>
              <SettingsPanel token={token} onPasswordChange={() => handleLogout()} />
            </div>
          )}

          {/* Ads Tab */}
          {activeTab === "ads" && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <h2 className="font-semibold text-lg mb-1 text-slate-250">Ad Settings</h2>
              <p className="text-xs text-slate-500 mb-6">Configure Google AdSense slots. Stored in the database, takes effect instantly without redeploys.</p>
              <AdsPanel token={token} />
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === "contacts" && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <h2 className="font-semibold text-lg mb-1 text-slate-250">Contact Messages</h2>
              <p className="text-xs text-slate-500 mb-6">Messages submitted via the Contact Us form. Click on row to read.</p>
              <ContactsPanel token={token} />
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === "seo" && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
              <h2 className="font-semibold text-lg mb-1 text-slate-250">SEO &amp; Search Indexing</h2>
              <p className="text-xs text-slate-500 mb-6">Inspect sitemaps, verify GSC properties, and monitor indexing configurations.</p>
              <SeoPanel />
            </div>
          )}
        </section>
      </main>
      {addingArticle && (
        <AddArticleModal
          token={token}
          onAdd={() => {
            setAddingArticle(false);
            window.dispatchEvent(new CustomEvent("refresh-articles"));
          }}
          onClose={() => setAddingArticle(false)}
        />
      )}
    </div>
  );
}

// ==========================================
// NEW BLOGS, ARTICLES & COMMENTS PANELS / MODALS
// ==========================================

function BlogsPanel({ token, onEditBlog, onAddBlog }: { token: string; onEditBlog: (b: any) => void; onAddBlog: () => void }) {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function loadBlogs() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/blogs`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Failed to load blogs", variant: "destructive" });
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadBlogs();
    const handleRefresh = () => loadBlogs();
    window.addEventListener("refresh-blogs", handleRefresh);
    return () => window.removeEventListener("refresh-blogs", handleRefresh);
  }, []);

  async function deleteBlog(id: number) {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    try {
      const res = await fetch(`${API}/admin/blogs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBlogs(prev => prev.filter(b => b.id !== id));
        toast({ title: "Blog post deleted" });
      } else throw new Error();
    } catch {
      toast({ title: "Failed to delete blog post", variant: "destructive" });
    }
  }

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold text-lg">Blogs Manager</h2>
        <Button size="sm" onClick={onAddBlog}><Plus className="h-4 w-4 mr-1.5" /> Add Blog Post</Button>
      </div>
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading blogs…</div>
      ) : blogs.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No blog posts found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Author</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Views</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Likes</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map(b => (
                <tr key={b.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{b.title}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.slug}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{b.category}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{b.authorName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.views}</td>
                  <td className="px-4 py-3 font-mono text-xs">{b.likes}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditBlog(b)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteBlog(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ArticlesPanel({ token, onEditArticle, onAddArticle }: { token: string; onEditArticle: (a: any) => void; onAddArticle: () => void }) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function loadArticles() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/articles`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setArticles(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Failed to load articles", variant: "destructive" });
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadArticles();
    const handleRefresh = () => loadArticles();
    window.addEventListener("refresh-articles", handleRefresh);
    return () => window.removeEventListener("refresh-articles", handleRefresh);
  }, []);

  async function deleteArticle(id: number) {
    if (!confirm("Are you sure you want to delete this technical article?")) return;
    try {
      const res = await fetch(`${API}/admin/articles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setArticles(prev => prev.filter(a => a.id !== id));
        toast({ title: "Article deleted" });
      } else throw new Error();
    } catch {
      toast({ title: "Failed to delete article", variant: "destructive" });
    }
  }

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold text-lg">Articles Manager</h2>
        <Button size="sm" onClick={onAddArticle}><Plus className="h-4 w-4 mr-1.5" /> Add Article</Button>
      </div>
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading articles…</div>
      ) : articles.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No technical articles found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Author</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Views</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.map(a => (
                <tr key={a.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{a.title}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.authorName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.views}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditArticle(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteArticle(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CommentsPanel({ token }: { token: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function loadComments() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/comments`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Failed to load comments", variant: "destructive" });
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadComments();
    const handleRefresh = () => loadComments();
    window.addEventListener("refresh-comments", handleRefresh);
    return () => window.removeEventListener("refresh-comments", handleRefresh);
  }, []);

  async function deleteComment(id: number) {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await fetch(`${API}/admin/comments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== id));
        toast({ title: "Comment deleted" });
      } else throw new Error();
    } catch {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    }
  }

  return (
    <div className="bg-card border rounded-2xl overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold text-lg">User Comments Moderation</h2>
      </div>
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading comments…</div>
      ) : comments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No user comments found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Page</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Content</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {comments.map(c => (
                <tr key={c.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs uppercase bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full mr-1.5">{c.pageType}</span>
                    <span className="font-mono text-xs">{c.pageSlug}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{c.userName}</td>
                  <td className="px-4 py-3 max-w-sm truncate" title={c.content}>{c.content}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteComment(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RatingsPanel({ token, tools }: { token: string; tools: Tool[] }) {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [resettingTool, setResettingTool] = useState("");
  const { toast } = useToast();

  async function loadRatings() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/ratings`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRatings(Array.isArray(data) ? data : []);
    } catch {
      toast({ title: "Failed to load ratings", variant: "destructive" });
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadRatings();
    const handleRefresh = () => loadRatings();
    window.addEventListener("refresh-ratings", handleRefresh);
    return () => window.removeEventListener("refresh-ratings", handleRefresh);
  }, []);

  async function deleteRating(id: number) {
    if (!confirm("Are you sure you want to delete this rating?")) return;
    try {
      const res = await fetch(`${API}/admin/ratings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRatings(prev => prev.filter(r => r.id !== id));
        toast({ title: "Rating deleted" });
      } else throw new Error();
    } catch {
      toast({ title: "Failed to delete rating", variant: "destructive" });
    }
  }

  async function handleResetToolRatings() {
    if (!resettingTool) return;
    const toolName = tools.find(t => t.slug === resettingTool)?.name || resettingTool;
    if (!confirm(`Are you sure you want to reset all ratings for "${toolName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API}/admin/ratings/tool/${resettingTool}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setRatings(prev => prev.filter(r => r.toolSlug !== resettingTool));
        toast({ title: `Ratings for "${toolName}" reset successfully` });
        setResettingTool("");
      } else throw new Error();
    } catch {
      toast({ title: "Failed to reset ratings", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      {/* Reset Tool Ratings Option */}
      <div className="bg-card border rounded-2xl p-6">
        <h3 className="font-semibold text-base mb-2">Reset Ratings for Tool</h3>
        <p className="text-xs text-muted-foreground mb-4">Select a tool to wipe all its ratings and start fresh.</p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md">
          <select
            value={resettingTool}
            onChange={e => setResettingTool(e.target.value)}
            className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="">-- Select a Tool --</option>
            {tools.map(t => (
              <option key={t.slug} value={t.slug}>{t.name} ({t.slug})</option>
            ))}
          </select>
          <Button onClick={handleResetToolRatings} disabled={!resettingTool} variant="destructive" size="sm">
            Reset All Ratings
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">User Ratings Moderation</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading ratings…</div>
        ) : ratings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No user ratings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tool Slug</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rating</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">IP Address</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map(r => (
                  <tr key={r.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{r.toolSlug}</td>
                    <td className="px-4 py-3">
                      <div className="flex text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < r.rating ? "fill-amber-500 text-amber-500" : "text-muted"
                            )}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.ipAddress}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteRating(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Modals for Blogs
function AddBlogModal({ token, onAdd, onClose }: { token: string; onAdd: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    slug: "", title: "", content: "", summary: "", category: "General", coverImage: "", authorName: "5toolbox Team", readTime: "5", tags: "", metaTitle: "", metaDescription: ""
  });
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([]);
  const [newPlatform, setNewPlatform] = useState("facebook");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const addSocialLink = () => {
    if (newUrl.trim()) {
      setSocialLinks(prev => [...prev, { platform: newPlatform, url: newUrl.trim() }]);
      setNewUrl("");
    }
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(prev => prev.filter((_, i) => i !== index));
  };

  async function handleAdd() {
    if (!form.slug || !form.title || !form.content) { toast({ title: "Slug, title and content are required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/blogs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
          readTime: parseInt(form.readTime) || 5,
          socialLinks
        })
      });
      if (res.ok) { toast({ title: "Blog post added" }); onAdd(); }
      else throw new Error();
    } catch {
      toast({ title: "Failed to create blog post", variant: "destructive" });
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/95 border border-slate-800/80 backdrop-blur-lg rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto text-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/20">
          <h2 className="font-semibold text-lg">Add New Blog Post</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Slug *</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="e.g. guide-to-pdf" /></div>
            <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Blog post title" /></div>
          </div>
          <div className="space-y-1.5"><Label>Summary</Label><Input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Short summary" /></div>
          <div className="space-y-1.5"><Label>Content (Markdown support)</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="h-32" placeholder="Markdown blog post contents" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Cover Image URL</Label><Input value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Author Name</Label><Input value={form.authorName} onChange={e => setForm({ ...form, authorName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Read Time (minutes)</Label><Input type="number" value={form.readTime} onChange={e => setForm({ ...form, readTime: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="e.g. pdf, optimize, web" /></div>
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-xs text-primary uppercase tracking-wider">SEO fields</h3>
            <div className="space-y-1.5"><Label>Meta Title</Label><Input value={form.metaTitle} onChange={e => setForm({ ...form, metaTitle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Meta Description</Label><Textarea value={form.metaDescription} onChange={e => setForm({ ...form, metaDescription: e.target.value })} className="h-16" /></div>
          </div>
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-xs text-primary uppercase tracking-wider">Social Links</h3>
            <div className="space-y-2">
              {socialLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold capitalize w-20 truncate">{link.platform}</span>
                  <span className="text-xs text-muted-foreground flex-1 truncate">{link.url}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSocialLink(idx)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="border border-slate-800 rounded-xl px-2 py-1 text-xs bg-slate-950/80 text-slate-300 h-8 w-24 focus:outline-none focus:border-indigo-500/60">
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">X (Twitter)</option>
                <option value="instagram">Instagram</option>
                <option value="github">GitHub</option>
                <option value="youtube">YouTube</option>
                <option value="website">Website</option>
              </select>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://facebook.com/username" className="h-8 text-xs flex-1" />
              <Button type="button" size="sm" className="h-8 text-xs px-3" onClick={addSocialLink}>
                Add
              </Button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-800/80 bg-slate-950/20">
          <Button onClick={handleAdd} disabled={saving} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-0 rounded-2xl text-xs py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/10 cursor-pointer">{saving ? "Creating…" : "Add Blog Post"}</Button>
          <Button variant="outline" onClick={onClose} className="flex-1 border-slate-800 hover:bg-slate-900/60 rounded-2xl text-xs text-slate-400 hover:text-slate-250 cursor-pointer">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function EditBlogModal({ blog, token, onSave, onClose }: { blog: any; token: string; onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    slug: blog.slug, title: blog.title, content: blog.content, summary: blog.summary, category: blog.category, coverImage: blog.coverImage ?? "", authorName: blog.authorName, readTime: String(blog.readTime), tags: blog.tags.join(", "), metaTitle: blog.metaTitle ?? "", metaDescription: blog.metaDescription ?? ""
  });
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>(blog.socialLinks ?? []);
  const [newPlatform, setNewPlatform] = useState("facebook");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const addSocialLink = () => {
    if (newUrl.trim()) {
      setSocialLinks(prev => [...prev, { platform: newPlatform, url: newUrl.trim() }]);
      setNewUrl("");
    }
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(prev => prev.filter((_, i) => i !== index));
  };

  async function handleSave() {
    if (!form.slug || !form.title || !form.content) { toast({ title: "Slug, title and content are required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/blogs/${blog.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
          readTime: parseInt(form.readTime) || 5,
          socialLinks
        })
      });
      if (res.ok) { toast({ title: "Blog post updated" }); onSave(); }
      else throw new Error();
    } catch {
      toast({ title: "Failed to update blog post", variant: "destructive" });
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/95 border border-slate-800/80 backdrop-blur-lg rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto text-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/20">
          <h2 className="font-semibold text-lg">Edit Blog Post</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Slug *</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Summary</Label><Input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Content (Markdown support)</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="h-32" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Cover Image URL</Label><Input value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Author Name</Label><Input value={form.authorName} onChange={e => setForm({ ...form, authorName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Read Time (minutes)</Label><Input type="number" value={form.readTime} onChange={e => setForm({ ...form, readTime: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Tags (comma separated)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></div>
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-xs text-primary uppercase tracking-wider">SEO fields</h3>
            <div className="space-y-1.5"><Label>Meta Title</Label><Input value={form.metaTitle} onChange={e => setForm({ ...form, metaTitle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Meta Description</Label><Textarea value={form.metaDescription} onChange={e => setForm({ ...form, metaDescription: e.target.value })} className="h-16" /></div>
          </div>
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-xs text-primary uppercase tracking-wider">Social Links</h3>
            <div className="space-y-2">
              {socialLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold capitalize w-20 truncate">{link.platform}</span>
                  <span className="text-xs text-muted-foreground flex-1 truncate">{link.url}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSocialLink(idx)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="border border-slate-800 rounded-xl px-2 py-1 text-xs bg-slate-950/80 text-slate-300 h-8 w-24 focus:outline-none focus:border-indigo-500/60">
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">X (Twitter)</option>
                <option value="instagram">Instagram</option>
                <option value="github">GitHub</option>
                <option value="youtube">YouTube</option>
                <option value="website">Website</option>
              </select>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://facebook.com/username" className="h-8 text-xs flex-1" />
              <Button type="button" size="sm" className="h-8 text-xs px-3" onClick={addSocialLink}>
                Add
              </Button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-800/80 bg-slate-950/20">
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-0 rounded-2xl text-xs py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/10 cursor-pointer">{saving ? "Saving…" : "Save Changes"}</Button>
          <Button variant="outline" onClick={onClose} className="flex-1 border-slate-800 hover:bg-slate-900/60 rounded-2xl text-xs text-slate-400 hover:text-slate-250 cursor-pointer">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// Modals for Articles
function AddArticleModal({ token, onAdd, onClose }: { token: string; onAdd: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    slug: "", title: "", content: "", summary: "", authorName: "5toolbox Team", readTime: "5", metaTitle: "", metaDescription: ""
  });
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>([]);
  const [newPlatform, setNewPlatform] = useState("facebook");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const addSocialLink = () => {
    if (newUrl.trim()) {
      setSocialLinks(prev => [...prev, { platform: newPlatform, url: newUrl.trim() }]);
      setNewUrl("");
    }
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(prev => prev.filter((_, i) => i !== index));
  };

  async function handleAdd() {
    if (!form.slug || !form.title || !form.content) { toast({ title: "Slug, title and content are required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          readTime: parseInt(form.readTime) || 5,
          socialLinks
        })
      });
      if (res.ok) { toast({ title: "Article added" }); onAdd(); }
      else throw new Error();
    } catch {
      toast({ title: "Failed to create article", variant: "destructive" });
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/95 border border-slate-800/80 backdrop-blur-lg rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto text-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/20">
          <h2 className="font-semibold text-lg">Add New Technical Article</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Slug *</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="e.g. how-it-works" /></div>
            <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Article title" /></div>
          </div>
          <div className="space-y-1.5"><Label>Summary</Label><Input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Short summary" /></div>
          <div className="space-y-1.5"><Label>Content (Markdown support)</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="h-32" placeholder="Markdown article contents" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Author Name</Label><Input value={form.authorName} onChange={e => setForm({ ...form, authorName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Read Time (minutes)</Label><Input type="number" value={form.readTime} onChange={e => setForm({ ...form, readTime: e.target.value })} /></div>
          </div>
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-xs text-primary uppercase tracking-wider">SEO fields</h3>
            <div className="space-y-1.5"><Label>Meta Title</Label><Input value={form.metaTitle} onChange={e => setForm({ ...form, metaTitle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Meta Description</Label><Textarea value={form.metaDescription} onChange={e => setForm({ ...form, metaDescription: e.target.value })} className="h-16" /></div>
          </div>
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-xs text-primary uppercase tracking-wider">Social Links</h3>
            <div className="space-y-2">
              {socialLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold capitalize w-20 truncate">{link.platform}</span>
                  <span className="text-xs text-muted-foreground flex-1 truncate">{link.url}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSocialLink(idx)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="border border-slate-800 rounded-xl px-2 py-1 text-xs bg-slate-950/80 text-slate-300 h-8 w-24 focus:outline-none focus:border-indigo-500/60">
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">X (Twitter)</option>
                <option value="instagram">Instagram</option>
                <option value="github">GitHub</option>
                <option value="youtube">YouTube</option>
                <option value="website">Website</option>
              </select>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://facebook.com/username" className="h-8 text-xs flex-1" />
              <Button type="button" size="sm" className="h-8 text-xs px-3" onClick={addSocialLink}>
                Add
              </Button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-800/80 bg-slate-950/20">
          <Button onClick={handleAdd} disabled={saving} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-0 rounded-2xl text-xs py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/10 cursor-pointer">{saving ? "Creating…" : "Add Article"}</Button>
          <Button variant="outline" onClick={onClose} className="flex-1 border-slate-800 hover:bg-slate-900/60 rounded-2xl text-xs text-slate-400 hover:text-slate-250 cursor-pointer">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

function EditArticleModal({ article, token, onSave, onClose }: { article: any; token: string; onSave: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    slug: article.slug, title: article.title, content: article.content, summary: article.summary, authorName: article.authorName, readTime: String(article.readTime), metaTitle: article.metaTitle ?? "", metaDescription: article.metaDescription ?? ""
  });
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string }[]>(article.socialLinks ?? []);
  const [newPlatform, setNewPlatform] = useState("facebook");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const addSocialLink = () => {
    if (newUrl.trim()) {
      setSocialLinks(prev => [...prev, { platform: newPlatform, url: newUrl.trim() }]);
      setNewUrl("");
    }
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(prev => prev.filter((_, i) => i !== index));
  };

  async function handleSave() {
    if (!form.slug || !form.title || !form.content) { toast({ title: "Slug, title and content are required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/admin/articles/${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          readTime: parseInt(form.readTime) || 5,
          socialLinks
        })
      });
      if (res.ok) { toast({ title: "Article updated" }); onSave(); }
      else throw new Error();
    } catch {
      toast({ title: "Failed to update article", variant: "destructive" });
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900/95 border border-slate-800/80 backdrop-blur-lg rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto text-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-slate-950/20">
          <h2 className="font-semibold text-lg">Edit Technical Article</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Slug *</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label>Summary</Label><Input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Content (Markdown support)</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="h-32" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Author Name</Label><Input value={form.authorName} onChange={e => setForm({ ...form, authorName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Read Time (minutes)</Label><Input type="number" value={form.readTime} onChange={e => setForm({ ...form, readTime: e.target.value })} /></div>
          </div>
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-xs text-primary uppercase tracking-wider">SEO fields</h3>
            <div className="space-y-1.5"><Label>Meta Title</Label><Input value={form.metaTitle} onChange={e => setForm({ ...form, metaTitle: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Meta Description</Label><Textarea value={form.metaDescription} onChange={e => setForm({ ...form, metaDescription: e.target.value })} className="h-16" /></div>
          </div>
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="font-semibold text-xs text-primary uppercase tracking-wider">Social Links</h3>
            <div className="space-y-2">
              {socialLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-xs font-semibold capitalize w-20 truncate">{link.platform}</span>
                  <span className="text-xs text-muted-foreground flex-1 truncate">{link.url}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeSocialLink(idx)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="border border-slate-800 rounded-xl px-2 py-1 text-xs bg-slate-950/80 text-slate-300 h-8 w-24 focus:outline-none focus:border-indigo-500/60">
                <option value="facebook">Facebook</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">X (Twitter)</option>
                <option value="instagram">Instagram</option>
                <option value="github">GitHub</option>
                <option value="youtube">YouTube</option>
                <option value="website">Website</option>
              </select>
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://facebook.com/username" className="h-8 text-xs flex-1" />
              <Button type="button" size="sm" className="h-8 text-xs px-3" onClick={addSocialLink}>
                Add
              </Button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-800/80 bg-slate-950/20">
          <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border-0 rounded-2xl text-xs py-2.5 font-semibold text-white shadow-lg shadow-indigo-500/10 cursor-pointer">{saving ? "Saving…" : "Save Changes"}</Button>
          <Button variant="outline" onClick={onClose} className="flex-1 border-slate-800 hover:bg-slate-900/60 rounded-2xl text-xs text-slate-400 hover:text-slate-250 cursor-pointer">Cancel</Button>
        </div>
      </div>
    </div>
  );
}
