import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Download, Copy, Check } from "lucide-react";
import {
  downloadBlob,
} from "./ToolHelpers";

export function CsvToJson() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function convert() {
    try {
      const lines = input.trim().split(/\r?\n/);
      if (lines.length < 2) { setError("CSV must have at least a header row and one data row"); return; }
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
        return obj;
      });
      setOutput(JSON.stringify(rows, null, 2));
      setError("");
    } catch {
      setError("Invalid CSV format");
    }
  }

  function copy() { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  function download() { downloadBlob(new Blob([output], { type: "application/json" }), "output.json"); }

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>CSV Input</Label>
        <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder={"name,age,city\nAlice,30,New York\nBob,25,London"} className="h-40 font-mono text-xs" data-testid="textarea-input" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" onClick={convert} data-testid="button-process">Convert to JSON</Button>
      {output && (
        <div className="space-y-2">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={copy}>{copied ? <><Check className="h-3.5 w-3.5 mr-1"/>Copied</> : <><Copy className="h-3.5 w-3.5 mr-1"/>Copy</>}</Button>
            <Button variant="outline" size="sm" onClick={download}><Download className="h-3.5 w-3.5 mr-1"/>Download JSON</Button>
          </div>
          <Textarea value={output} readOnly className="h-48 font-mono text-xs" />
        </div>
      )}
    </div>
  );
}

export function JsonToCsv() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function convert() {
    try {
      const data = JSON.parse(input);
      const arr = Array.isArray(data) ? data : [data];
      if (!arr.length) { setError("JSON array is empty"); return; }
      const headers = Object.keys(arr[0]);
      const csvRows = [headers.join(","), ...arr.map(row =>
        headers.map(h => { const v = String(row[h] ?? ""); return v.includes(",") ? `"${v}"` : v; }).join(",")
      )];
      setOutput(csvRows.join("\n"));
      setError("");
    } catch {
      setError("Invalid JSON — must be an array of objects");
    }
  }

  function copy() { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  function download() { downloadBlob(new Blob([output], { type: "text/csv" }), "output.csv"); }

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>JSON Input (array of objects)</Label>
        <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder={'[{"name":"Alice","age":30},{"name":"Bob","age":25}]'} className="h-40 font-mono text-xs" data-testid="textarea-input" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" onClick={convert} data-testid="button-process">Convert to CSV</Button>
      {output && (
        <div className="space-y-2">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={copy}>{copied ? <><Check className="h-3.5 w-3.5 mr-1"/>Copied</> : <><Copy className="h-3.5 w-3.5 mr-1"/>Copy</>}</Button>
            <Button variant="outline" size="sm" onClick={download}><Download className="h-3.5 w-3.5 mr-1"/>Download CSV</Button>
          </div>
          <Textarea value={output} readOnly className="h-40 font-mono text-xs" />
        </div>
      )}
    </div>
  );
}

export function MarkdownToHtml() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [preview, setPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  function convert() {
    let html = input
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^## (.+)$/gm, "<h2>$1</h2>")
      .replace(/^# (.+)$/gm, "<h1>$1</h1>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<[hupolicbda])/gm, "");
    html = `<p>${html}</p>`;
    setOutput(html);
  }

  function copy() { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Markdown Input</Label>
        <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder={"# Hello World\n\n**Bold text** and *italic text*.\n\n- Item one\n- Item two"} className="h-40 font-mono text-sm" data-testid="textarea-input" />
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={convert} data-testid="button-process">Convert to HTML</Button>
        {output && <Button variant="outline" onClick={() => setPreview(p => !p)}>{preview ? "Show HTML" : "Preview"}</Button>}
      </div>
      {output && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={copy}>{copied ? <><Check className="h-3.5 w-3.5 mr-1"/>Copied</> : <><Copy className="h-3.5 w-3.5 mr-1"/>Copy HTML</>}</Button>
          </div>
          {preview
            ? <div className="p-4 rounded-xl border bg-white prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: output }} />
            : <Textarea value={output} readOnly className="h-40 font-mono text-xs" />}
        </div>
      )}
    </div>
  );
}

export function HtmlToText() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  function convert() {
    const el = document.createElement("div");
    el.innerHTML = input;
    setOutput(el.innerText || el.textContent || "");
  }

  function copy() { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>HTML Input</Label>
        <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder={"<h1>Hello</h1>\n<p>This is <strong>bold</strong> text.</p>"} className="h-40 font-mono text-xs" data-testid="textarea-input" />
      </div>
      <Button className="w-full" onClick={convert} data-testid="button-process">Extract Plain Text</Button>
      {output && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={copy}>{copied ? <><Check className="h-3.5 w-3.5 mr-1"/>Copied</> : <><Copy className="h-3.5 w-3.5 mr-1"/>Copy</>}</Button>
          </div>
          <Textarea value={output} readOnly className="h-40 font-mono text-sm" />
        </div>
      )}
    </div>
  );
}

export function UrlEncoderTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [copied, setCopied] = useState(false);

  function convert() {
    try {
      setOutput(mode === "encode" ? encodeURIComponent(input) : decodeURIComponent(input));
    } catch {
      setOutput("Error: invalid input for decoding");
    }
  }

  function copy() { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["encode", "decode"] as const).map(m => (
          <Button key={m} variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)} className="capitalize">{m}</Button>
        ))}
      </div>
      <div className="space-y-2"><Label>Input</Label>
        <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder={mode === "encode" ? "https://example.com/search?q=hello world" : "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world"} className="h-32 font-mono text-sm" data-testid="textarea-input" />
      </div>
      <Button className="w-full" onClick={convert} data-testid="button-process">{mode === "encode" ? "Encode URL" : "Decode URL"}</Button>
      {output && (
        <div className="space-y-2">
          <div className="flex justify-between items-center"><Label>Output</Label>
            <Button variant="ghost" size="sm" onClick={copy}>{copied ? <><Check className="h-3.5 w-3.5 mr-1"/>Copied</> : <><Copy className="h-3.5 w-3.5 mr-1"/>Copy</>}</Button>
          </div>
          <Textarea value={output} readOnly className="h-32 font-mono text-sm" />
        </div>
      )}
    </div>
  );
}

export function ColorConverter() {
  const [hex, setHex] = useState("#3b82f6");
  const [rgb, setRgb] = useState({ r: 59, g: 130, b: 246 });
  const [hsl, setHsl] = useState({ h: 217, s: 91, l: 60 });
  const [copied, setCopied] = useState("");

  function hexToRgb(h: string) {
    const clean = h.replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return { r, g, b };
  }

  function rgbToHsl(r: number, g: number, b: number) {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
      else if (max === gn) h = (bn - rn) / d + 2;
      else h = (rn - gn) / d + 4;
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function fromHex(h: string) {
    if (!/^#[0-9a-fA-F]{6}$/.test(h)) return;
    setHex(h);
    const r2 = hexToRgb(h);
    setRgb(r2);
    setHsl(rgbToHsl(r2.r, r2.g, r2.b));
  }

  function fromRgb(r: number, g: number, b: number) {
    setRgb({ r, g, b });
    const h = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    setHex(h);
    setHsl(rgbToHsl(r, g, b));
  }

  function copy(text: string, key: string) { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 2000); }

  const hexStr = hex;
  const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
        <input type="color" value={hex} onChange={e => fromHex(e.target.value)} className="w-16 h-16 rounded-lg border cursor-pointer" />
        <div>
          <p className="font-semibold text-lg">{hex.toUpperCase()}</p>
          <p className="text-sm text-muted-foreground">Click to pick any color</p>
        </div>
      </div>
      {[
        { label: "HEX", value: hexStr, extra: <Input value={hex} onChange={e => fromHex(e.target.value)} className="font-mono text-sm" /> },
        { label: "RGB", value: rgbStr, extra: (
          <div className="flex gap-2">
            {["r","g","b"].map(c => (
              <Input key={c} type="number" min={0} max={255} value={rgb[c as "r"|"g"|"b"]}
                onChange={e => fromRgb(c==="r"?+e.target.value:rgb.r, c==="g"?+e.target.value:rgb.g, c==="b"?+e.target.value:rgb.b)}
                className="font-mono text-sm" />
            ))}
          </div>
        )},
        { label: "HSL", value: hslStr, extra: null },
      ].map(({ label, value, extra }) => (
        <div key={label} className="space-y-2">
          <div className="flex items-center justify-between"><Label>{label}</Label>
            <Button variant="ghost" size="sm" onClick={() => copy(value, label)}>
              {copied === label ? <><Check className="h-3.5 w-3.5 mr-1"/>Copied</> : <><Copy className="h-3.5 w-3.5 mr-1"/>Copy</>}
            </Button>
          </div>
          {extra ?? <Input value={value} readOnly className="font-mono text-sm bg-muted" />}
        </div>
      ))}
    </div>
  );
}

export function NumberBase() {
  const [input, setInput] = useState("");
  const [fromBase, setFromBase] = useState<"10" | "2" | "8" | "16">("10");
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState("");

  function convert() {
    try {
      const decimal = parseInt(input.trim(), parseInt(fromBase));
      if (isNaN(decimal)) { setError("Invalid number for the selected base"); setResults(null); return; }
      setResults({
        "Decimal (Base 10)": decimal.toString(10),
        "Binary (Base 2)": decimal.toString(2),
        "Octal (Base 8)": decimal.toString(8),
        "Hexadecimal (Base 16)": decimal.toString(16).toUpperCase(),
      });
      setError("");
    } catch {
      setError("Invalid input");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2"><Label>Input Number</Label>
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Enter a number…" className="font-mono" data-testid="input-number" />
      </div>
      <div className="space-y-2"><Label>Input Base</Label>
        <Select value={fromBase} onValueChange={v => setFromBase(v as "10"|"2"|"8"|"16")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">Decimal (Base 10)</SelectItem>
            <SelectItem value="2">Binary (Base 2)</SelectItem>
            <SelectItem value="8">Octal (Base 8)</SelectItem>
            <SelectItem value="16">Hexadecimal (Base 16)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="w-full" onClick={convert} data-testid="button-process">Convert</Button>
      {results && (
        <div className="space-y-2">
          {Object.entries(results).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-xl border bg-card">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="font-mono font-semibold text-primary">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
