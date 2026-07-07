import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Copy, Check, Pencil, Shield, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  downloadBlob,
  dataURLtoBlob,
} from "./ToolHelpers";

export function WordCounter() {
  const [text, setText] = useState("");

  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  const chars = text.length;
  const charsNoSpace = text.replace(/\s/g, "").length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim()).length;

  return (
    <div className="space-y-4">
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Paste or type your text here…"
        className="h-56 font-mono text-sm resize-none"
        data-testid="textarea-input"
      />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Words", value: words },
          { label: "Characters", value: chars },
          { label: "No spaces", value: charsNoSpace },
          { label: "Sentences", value: sentences },
          { label: "Paragraphs", value: paragraphs },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-primary">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QrGenerator({ onDone }: { onDone: () => void }) {
  const [input, setInput] = useState("https://");
  const [qrUrl, setQrUrl] = useState("");
  const [size, setSize] = useState(300);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  async function handle() {
    if (!input.trim()) { toast({ title: "Enter text or URL" }); return; }
    setProcessing(true);
    try {
      const { default: QRCode } = await import("qrcode");
      const url = await QRCode.toDataURL(input, { width: size, margin: 2, color: { dark: "#000", light: "#fff" } });
      setQrUrl(url);
      onDone();
    } catch (e) {
      toast({ title: "Error generating QR code", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  function download() {
    const blob = dataURLtoBlob(qrUrl);
    downloadBlob(blob, "qrcode.png");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Text or URL</Label>
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="https://example.com" data-testid="input-qr" />
      </div>
      <div className="space-y-2"><Label>Size: {size}px</Label>
        <Slider min={128} max={512} step={64} value={[size]} onValueChange={([v]) => setSize(v)} />
      </div>
      <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
        {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : "Generate QR Code"}
      </Button>
      {qrUrl && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <img src={qrUrl} alt="QR Code" className="rounded-xl border shadow-sm" />
          <Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-2" /> Download PNG</Button>
        </div>
      )}
    </div>
  );
}

export function Base64Tool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [copied, setCopied] = useState(false);

  function process() {
    try {
      setOutput(mode === "encode" ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input))));
    } catch {
      setOutput("Error: invalid input for decoding");
    }
  }

  function copy() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["encode", "decode"] as const).map(m => (
          <Button key={m} variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)} className="capitalize">{m}</Button>
        ))}
      </div>
      <div className="space-y-2"><Label>Input</Label>
        <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder={mode === "encode" ? "Enter text to encode…" : "Enter Base64 to decode…"} className="h-36 font-mono text-sm" data-testid="textarea-input" />
      </div>
      <Button className="w-full" onClick={process} data-testid="button-process">{mode === "encode" ? "Encode" : "Decode"}</Button>
      {output && (
        <div className="space-y-2">
          <div className="flex justify-between items-center"><Label>Output</Label>
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? <><Check className="h-3.5 w-3.5 mr-1" /> Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy</>}
            </Button>
          </div>
          <Textarea value={output} readOnly className="h-36 font-mono text-sm" />
        </div>
      )}
    </div>
  );
}

export function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [indent, setIndent] = useState(2);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function format() {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, indent));
      setError("");
    } catch (e: unknown) {
      setError((e as Error).message);
      setOutput("");
    }
  }

  function minify() {
    try {
      setOutput(JSON.stringify(JSON.parse(input)));
      setError("");
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  function copy() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Input JSON</Label>
        <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder='{ "key": "value" }' className="h-48 font-mono text-xs" data-testid="textarea-input" />
      </div>
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
      <div className="flex gap-2 items-center">
        <Button onClick={format} data-testid="button-format">Format</Button>
        <Button variant="outline" onClick={minify}>Minify</Button>
        <Label className="ml-auto">Indent:</Label>
        <Select value={String(indent)} onValueChange={v => setIndent(parseInt(v))}>
          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="8">8</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {output && (
        <div className="space-y-2">
          <div className="flex justify-between items-center"><Label>Output</Label>
            <Button variant="ghost" size="sm" onClick={copy}>
              {copied ? <><Check className="h-3.5 w-3.5 mr-1" /> Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy</>}
            </Button>
          </div>
          <Textarea value={output} readOnly className="h-64 font-mono text-xs" />
        </div>
      )}
    </div>
  );
}

export const EXPIRY_OPTIONS = [
  { label: "1 hour", value: 1 },
  { label: "6 hours", value: 6 },
  { label: "12 hours", value: 12 },
  { label: "24 hours", value: 24 },
  { label: "2 days", value: 48 },
  { label: "7 days", value: 168 },
];

export function OnlineClipboard({ onDone }: { onDone: () => void }) {
  const [content, setContent] = useState("");
  const [handle, setHandle] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingShared, setLoadingShared] = useState(false);
  const [sharedContent, setSharedContent] = useState<string | null>(null);
  const [sharedExpiresAt, setSharedExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [editMode, setEditMode] = useState(false);
  const [savedContent, setSavedContent] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      setLoadingShared(true);
      fetch(`/api/clipboard/${code}`)
        .then(r => r.json())
        .then(data => {
          if (data.content) {
            setSharedContent(data.content);
            setSharedExpiresAt(data.expiresAt ?? null);
          } else {
            toast({ title: "Clipboard not found or expired", variant: "destructive" });
          }
        })
        .catch(() => toast({ title: "Failed to load clipboard", variant: "destructive" }))
        .finally(() => setLoadingShared(false));
    }
  }, []);

  async function save() {
    if (!content.trim()) { toast({ title: "Please enter some text first" }); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/clipboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, expiresInHours }),
      });
      if (!res.ok) throw new Error();
      const { handle: h } = await res.json();
      const url = `${window.location.origin}/tools/online-clipboard?code=${h}`;
      setHandle(h);
      setShareUrl(url);
      setSavedContent(content);
      const { default: QRCode } = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
      setQrDataUrl(dataUrl);
      onDone();
    } catch {
      toast({ title: "Failed to save clipboard", variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function updateClipboard() {
    if (!content.trim() || !handle) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/clipboard/${handle}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, expiresInHours }),
      });
      if (!res.ok) throw new Error();
      setSavedContent(content);
      setEditMode(false);
      toast({ title: "Clipboard updated!" });
    } catch {
      toast({ title: "Failed to update clipboard", variant: "destructive" });
    } finally { setLoading(false); }
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied!" });
    });
  }

  function copyContent() {
    navigator.clipboard.writeText(sharedContent ?? "").then(() => toast({ title: "Copied!" }));
  }

  function reset() {
    setHandle(null); setShareUrl(""); setQrDataUrl(""); setContent("");
    setSharedContent(null); setSharedExpiresAt(null); setEditMode(false); setSavedContent("");
    window.history.replaceState({}, "", window.location.pathname);
  }

  function startEdit() {
    setContent(savedContent);
    setEditMode(true);
  }

  function cancelEdit() {
    setContent(savedContent);
    setEditMode(false);
  }

  if (loadingShared) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading shared clipboard…
      </div>
    );
  }

  if (sharedContent !== null) {
    const expiryStr = sharedExpiresAt
      ? new Date(sharedExpiresAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
      : null;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Shared clipboard{expiryStr ? ` · Expires ${expiryStr}` : " · Expires in 24 hours"}</span>
        </div>
        <Textarea value={sharedContent} readOnly className="font-mono text-sm min-h-40 resize-none" />
        <div className="flex gap-2">
          <Button onClick={copyContent} className="flex-1"><Copy className="h-4 w-4 mr-2" /> Copy Content</Button>
          <Button variant="outline" onClick={reset}>New Clipboard</Button>
        </div>
      </div>
    );
  }

  // Edit mode — update existing clipboard
  if (editMode && handle) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <Pencil className="h-4 w-4 shrink-0" />
          <span>Editing clipboard — same link stays valid after saving</span>
        </div>
        <div>
          <Label className="mb-2 block">Edit your text</Label>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="min-h-48 font-mono text-sm resize-none"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1.5">{content.length} characters</p>
        </div>
        <div className="space-y-1.5">
          <Label>Update link expiration to</Label>
          <Select value={String(expiresInHours)} onValueChange={v => setExpiresInHours(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={updateClipboard} disabled={loading || !content.trim()}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Check className="h-4 w-4 mr-2" />Save Changes</>}
          </Button>
          <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
        </div>
      </div>
    );
  }

  // Result view after saving
  if (handle) {
    const expiryLabel = EXPIRY_OPTIONS.find(o => o.value === expiresInHours)?.label ?? "24 hours";
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Clipboard saved! Link expires in {expiryLabel}.</span>
        </div>
        <div className="space-y-2">
          <Label>Shareable Link</Label>
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="font-mono text-xs flex-1" />
            <Button size="sm" onClick={copyLink} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {qrDataUrl && (
          <div className="flex flex-col items-center gap-3 p-5 border rounded-xl bg-muted/30">
            <img src={qrDataUrl} alt="QR Code" className="w-36 h-36 rounded" />
            <p className="text-xs text-muted-foreground">Scan to open on another device</p>
            <Button size="sm" variant="outline" onClick={() => {
              const a = document.createElement("a"); a.href = qrDataUrl;
              a.download = "clipboard-qr.png"; a.click();
            }}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Save QR
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={startEdit}>
            <Pencil className="h-4 w-4 mr-2" /> Edit Content & Expiry
          </Button>
          <Button variant="outline" className="flex-1" onClick={reset}>New Clipboard</Button>
        </div>
      </div>
    );
  }

  // Input view
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border rounded-lg px-3 py-2">
        <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        <span>Text is encrypted in transit and auto-deleted when the link expires. No account needed.</span>
      </div>
      <div>
        <Label className="mb-2 block">Paste or type your text</Label>
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste any text here — code snippets, notes, URLs, passwords, anything…"
          className="min-h-48 font-mono text-sm resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1.5">{content.length} characters</p>
      </div>
      <div className="space-y-1.5">
        <Label>Link expires after</Label>
        <Select value={String(expiresInHours)} onValueChange={v => setExpiresInHours(Number(v))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EXPIRY_OPTIONS.map(o => (
              <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button className="w-full" onClick={save} disabled={loading || !content.trim()}>
        {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save & Get Shareable Link"}
      </Button>
    </div>
  );
}
