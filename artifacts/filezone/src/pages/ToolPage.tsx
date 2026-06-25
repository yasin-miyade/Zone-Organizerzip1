import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetTool, getGetToolQueryKey, useTrackToolUsage, useListTools } from "@workspace/api-client-react";
import { UploadZone } from "@/components/UploadZone";
import { ToolCard } from "@/components/ToolCard";
import { AdBanner } from "@/components/AdBanner";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Download, CheckCircle2, ArrowLeft, Loader2, Copy, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ---- CALCULATORS ----
import {
  AgeCalculator, BmiCalculator, PercentageCalculator, CgpaCalculator,
  GpaCalculator, EmiCalculator, SipCalculator, GstCalculator,
  IncomeTaxCalculator, CurrencyConverter, ScientificCalculator,
  LoanCalculator, DiscountCalculator, AttendanceCalculator, DateDifference,
} from "@/pages/CalculatorTools";

// ---- PDF-LIB ----
import { PDFDocument, degrees, rgb, StandardFonts, type PDFPage } from "pdf-lib";
// ---- PDFJS ----
import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
// ---- IMAGE COMPRESSION ----
import imageCompression from "browser-image-compression";
// ---- QR CODE ----
import QRCode from "qrcode";
// ---- JSZIP ----
import JSZip from "jszip";

// ---- HELPERS ----
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dataURLtoBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function baseName(f: File) {
  return f.name.replace(/\.[^.]+$/, "");
}

// ---- RESULT CARD ----
interface ResultFile { name: string; blob: Blob; size: number }

function ResultCard({ results }: { results: ResultFile[] }) {
  return (
    <div className="mt-6 space-y-3">
      {results.map((r, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-emerald-50 border-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900 truncate">{r.name}</p>
            <p className="text-xs text-emerald-700">{(r.size / 1024).toFixed(1)} KB</p>
          </div>
          <Button size="sm" onClick={() => downloadBlob(r.blob, r.name)} className="bg-emerald-600 hover:bg-emerald-700 shrink-0">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download
          </Button>
        </div>
      ))}
    </div>
  );
}

// ---- TOOL IMPLEMENTATIONS ----

function MergePdf({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (files.length < 2) { toast({ title: "Add at least 2 PDF files" }); return; }
    setProcessing(true); setProgress(10);
    try {
      const merged = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        setProgress(10 + Math.round(80 * (i + 1) / files.length));
      }
      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setResults([{ name: "merged.pdf", blob, size: blob.size }]);
      setProgress(100);
      onDone();
    } catch (e) {
      toast({ title: "Error merging PDFs", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div>
      <UploadZone accept=".pdf" multiple onFiles={setFiles} files={files}
        onRemove={i => setFiles(f => f.filter((_, j) => j !== i))}
        label="Drop PDF files here" sublabel="Select 2 or more PDF files to merge" />
      {files.length > 1 && (
        <Button className="mt-4 w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Merging…</> : `Merge ${files.length} PDFs`}
        </Button>
      )}
      {processing && <Progress value={progress} className="mt-3" />}
      <ResultCard results={results} />
    </div>
  );
}

function SplitPdf({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<"all" | "range">("all");
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("1");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    setProcessing(true);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const total = doc.getPageCount();

      if (mode === "all") {
        const res: ResultFile[] = [];
        for (let i = 0; i < total; i++) {
          const single = await PDFDocument.create();
          const [page] = await single.copyPages(doc, [i]);
          single.addPage(page);
          const b = await single.save();
          const blob = new Blob([b], { type: "application/pdf" });
          res.push({ name: `${baseName(files[0])}_page${i + 1}.pdf`, blob, size: blob.size });
        }
        setResults(res);
      } else {
        const f = Math.max(1, parseInt(from)) - 1;
        const t = Math.min(total, parseInt(to)) - 1;
        const rangeDoc = await PDFDocument.create();
        const indices = Array.from({ length: t - f + 1 }, (_, k) => f + k);
        const pages = await rangeDoc.copyPages(doc, indices);
        pages.forEach(p => rangeDoc.addPage(p));
        const b = await rangeDoc.save();
        const blob = new Blob([b], { type: "application/pdf" });
        setResults([{ name: `${baseName(files[0])}_pages${from}-${to}.pdf`, blob, size: blob.size }]);
      }
      onDone();
    } catch (e) {
      toast({ title: "Error splitting PDF", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".pdf" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      <div className="space-y-3">
        <Label>Split mode</Label>
        <Select value={mode} onValueChange={v => setMode(v as "all" | "range")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Extract all pages as separate files</SelectItem>
            <SelectItem value="range">Extract page range</SelectItem>
          </SelectContent>
        </Select>
        {mode === "range" && (
          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5"><Label>From page</Label><Input value={from} onChange={e => setFrom(e.target.value)} type="number" min="1" /></div>
            <div className="flex-1 space-y-1.5"><Label>To page</Label><Input value={to} onChange={e => setTo(e.target.value)} type="number" min="1" /></div>
          </div>
        )}
      </div>
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Splitting…</> : "Split PDF"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

function CompressPdf({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    setProcessing(true);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pdfBytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setResults([{ name: `${baseName(files[0])}_compressed.pdf`, blob, size: blob.size }]);
      onDone();
    } catch (e) {
      toast({ title: "Error compressing PDF", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".pdf" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Compressing…</> : "Compress PDF"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

function PdfToJpg({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [scale, setScale] = useState(2);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    setProcessing(true); setProgress(0);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const zip = new JSZip();
      const name = baseName(files[0]);

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        const blob = dataURLtoBlob(dataUrl);
        const arr = await blob.arrayBuffer();
        zip.file(`${name}_page${i}.jpg`, arr);
        setProgress(Math.round(100 * i / pdf.numPages));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      setResults([{ name: `${name}_pages.zip`, blob: zipBlob, size: zipBlob.size }]);
      onDone();
    } catch (e) {
      toast({ title: "Error converting PDF", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".pdf" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      <div className="space-y-2">
        <Label>Image Quality (scale: {scale}x)</Label>
        <Slider min={1} max={3} step={0.5} value={[scale]} onValueChange={([v]) => setScale(v)} />
        <p className="text-xs text-muted-foreground">Higher scale = larger, sharper images</p>
      </div>
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting… {progress}%</> : "Convert to JPG"}
        </Button>
      )}
      {processing && <Progress value={progress} />}
      <ResultCard results={results} />
    </div>
  );
}

function JpgToPdf({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files.length) { toast({ title: "Upload at least one image" }); return; }
    setProcessing(true);
    try {
      const doc = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const img = file.type === "image/png"
          ? await doc.embedPng(bytes)
          : await doc.embedJpg(bytes);
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setResults([{ name: "images.pdf", blob, size: blob.size }]);
      onDone();
    } catch (e) {
      toast({ title: "Error creating PDF", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".jpg,.jpeg,.png,.webp" multiple onFiles={setFiles} files={files}
        onRemove={i => setFiles(f => f.filter((_, j) => j !== i))}
        label="Drop image files here" sublabel="JPG, PNG, WebP — all images combined into one PDF" />
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating PDF…</> : `Create PDF from ${files.length} image(s)`}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

function RotatePdf({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [angle, setAngle] = useState("90");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    setProcessing(true);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const deg = parseInt(angle);
      doc.getPages().forEach(p => p.setRotation(degrees((p.getRotation().angle + deg) % 360)));
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setResults([{ name: `${baseName(files[0])}_rotated.pdf`, blob, size: blob.size }]);
      onDone();
    } catch (e) {
      toast({ title: "Error rotating PDF", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".pdf" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      <div className="space-y-2">
        <Label>Rotation angle</Label>
        <Select value={angle} onValueChange={setAngle}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="90">90° clockwise</SelectItem>
            <SelectItem value="180">180°</SelectItem>
            <SelectItem value="270">270° (90° counter-clockwise)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rotating…</> : "Rotate PDF"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

function WatermarkPdf({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(0.3);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    if (!text.trim()) { toast({ title: "Enter watermark text" }); return; }
    setProcessing(true);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      doc.getPages().forEach((page: PDFPage) => {
        const { width, height } = page.getSize();
        const fontSize = Math.min(width, height) * 0.1;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: (width - textWidth) / 2,
          y: (height - fontSize) / 2,
          size: fontSize,
          font,
          color: rgb(0.5, 0.5, 0.5),
          opacity,
          rotate: degrees(45),
        });
      });
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setResults([{ name: `${baseName(files[0])}_watermarked.pdf`, blob, size: blob.size }]);
      onDone();
    } catch (e) {
      toast({ title: "Error adding watermark", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".pdf" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      <div className="space-y-2"><Label>Watermark text</Label>
        <Input value={text} onChange={e => setText(e.target.value)} placeholder="CONFIDENTIAL" data-testid="input-watermark" />
      </div>
      <div className="space-y-2"><Label>Opacity: {Math.round(opacity * 100)}%</Label>
        <Slider min={5} max={80} step={5} value={[Math.round(opacity * 100)]}
          onValueChange={([v]) => setOpacity(v / 100)} />
      </div>
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding watermark…</> : "Add Watermark"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

function PdfToText({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [text, setOutputText] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    setProcessing(true);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const parts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        parts.push(`--- Page ${i} ---\n` + content.items.map((it: { str?: string }) => it.str ?? "").join(" "));
      }
      setOutputText(parts.join("\n\n"));
      onDone();
    } catch (e) {
      toast({ title: "Error extracting text", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadTxt() {
    const blob = new Blob([text], { type: "text/plain" });
    downloadBlob(blob, `${files[0] ? baseName(files[0]) : "output"}.txt`);
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".pdf" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Extracting…</> : "Extract Text"}
        </Button>
      )}
      {text && (
        <div className="space-y-2">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <><Check className="h-3.5 w-3.5 mr-1" /> Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy</>}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadTxt}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download TXT
            </Button>
          </div>
          <Textarea value={text} readOnly className="h-64 font-mono text-xs" />
        </div>
      )}
    </div>
  );
}

function ProtectPdf({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    if (!password) { toast({ title: "Enter a password" }); return; }
    setProcessing(true);
    try {
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const pdfBytes = await doc.save({
        userPassword: password,
        ownerPassword: password,
        permissions: { modifying: false, copying: false, annotating: false, fillingForms: false },
      });
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      setResults([{ name: `${baseName(files[0])}_protected.pdf`, blob, size: blob.size }]);
      onDone();
    } catch (e) {
      toast({ title: "Error protecting PDF", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".pdf" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      <div className="space-y-2"><Label>Password</Label>
        <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" data-testid="input-password" />
      </div>
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Protecting…</> : "Protect PDF"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

// ---- IMAGE TOOLS ----

function CompressImage({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(80);
  const [maxSizeMb, setMaxSizeMb] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files.length) { toast({ title: "Upload at least one image" }); return; }
    setProcessing(true);
    try {
      const res: ResultFile[] = [];
      for (const file of files) {
        const compressed = await imageCompression(file, {
          maxSizeMB: maxSizeMb,
          initialQuality: quality / 100,
          useWebWorker: true,
        });
        res.push({ name: `${baseName(file)}_compressed.${file.name.split(".").pop()}`, blob: compressed, size: compressed.size });
      }
      setResults(res);
      onDone();
    } catch (e) {
      toast({ title: "Error compressing image", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".jpg,.jpeg,.png,.webp" multiple onFiles={setFiles} files={files}
        onRemove={i => setFiles(f => f.filter((_, j) => j !== i))} />
      <div className="space-y-2"><Label>Quality: {quality}%</Label>
        <Slider min={10} max={100} step={5} value={[quality]} onValueChange={([v]) => setQuality(v)} />
      </div>
      <div className="space-y-2"><Label>Max file size: {maxSizeMb} MB</Label>
        <Slider min={0.1} max={5} step={0.1} value={[maxSizeMb]} onValueChange={([v]) => setMaxSizeMb(v)} />
      </div>
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Compressing…</> : "Compress Images"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

function ResizeImage({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [width, setWidth] = useState("800");
  const [height, setHeight] = useState("600");
  const [lock, setLock] = useState(true);
  const [origSize, setOrigSize] = useState<{ w: number; h: number } | null>(null);
  const [format, setFormat] = useState("jpeg");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  function onFilesChanged(newFiles: File[]) {
    setFiles(newFiles);
    if (newFiles[0]) {
      const img = new Image();
      img.onload = () => {
        setOrigSize({ w: img.naturalWidth, h: img.naturalHeight });
        setWidth(String(img.naturalWidth));
        setHeight(String(img.naturalHeight));
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(newFiles[0]);
    }
  }

  function onWidthChange(v: string) {
    setWidth(v);
    if (lock && origSize && !isNaN(parseInt(v))) {
      setHeight(String(Math.round(parseInt(v) * origSize.h / origSize.w)));
    }
  }

  function onHeightChange(v: string) {
    setHeight(v);
    if (lock && origSize && !isNaN(parseInt(v))) {
      setWidth(String(Math.round(parseInt(v) * origSize.w / origSize.h)));
    }
  }

  async function handle() {
    if (!files[0]) { toast({ title: "Upload an image first" }); return; }
    const w = parseInt(width), h = parseInt(height);
    if (!w || !h) { toast({ title: "Enter valid dimensions" }); return; }
    setProcessing(true);
    try {
      const bmp = await createImageBitmap(files[0]);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
      const mime = `image/${format}`;
      const dataUrl = canvas.toDataURL(mime, 0.92);
      const blob = dataURLtoBlob(dataUrl);
      const ext = format === "jpeg" ? "jpg" : format;
      setResults([{ name: `${baseName(files[0])}_${w}x${h}.${ext}`, blob, size: blob.size }]);
      onDone();
    } catch (e) {
      toast({ title: "Error resizing image", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".jpg,.jpeg,.png,.webp,.gif" onFiles={onFilesChanged} files={files} onRemove={() => setFiles([])} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Width (px)</Label><Input value={width} onChange={e => onWidthChange(e.target.value)} type="number" min="1" /></div>
        <div className="space-y-1.5"><Label>Height (px)</Label><Input value={height} onChange={e => onHeightChange(e.target.value)} type="number" min="1" /></div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="lock" checked={lock} onChange={e => setLock(e.target.checked)} />
        <Label htmlFor="lock" className="cursor-pointer">Lock aspect ratio</Label>
      </div>
      <div className="space-y-1.5"><Label>Output format</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="jpeg">JPG</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resizing…</> : "Resize Image"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

const IMAGE_FORMATS = [
  { value: "jpg",  label: "JPG",  mime: "image/jpeg" },
  { value: "png",  label: "PNG",  mime: "image/png" },
  { value: "webp", label: "WebP", mime: "image/webp" },
  { value: "gif",  label: "GIF",  mime: "image/gif" },
  { value: "bmp",  label: "BMP",  mime: "image/bmp" },
  { value: "ico",  label: "ICO",  mime: "image/x-icon" },
  { value: "tiff", label: "TIFF", mime: "image/tiff" },
  { value: "svg",  label: "SVG",  mime: "image/svg+xml" },
];

async function convertToSvg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${img.naturalWidth}" height="${img.naturalHeight}" viewBox="0 0 ${img.naturalWidth} ${img.naturalHeight}">
  <image width="${img.naturalWidth}" height="${img.naturalHeight}" xlink:href="${dataUrl}"/>
</svg>`;
        resolve(new Blob([svg], { type: "image/svg+xml" }));
      };
      img.onerror = reject;
      img.src = dataUrl;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ConvertImage({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState("png");
  const [quality, setQuality] = useState(90);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  const fmtInfo = IMAGE_FORMATS.find(f => f.value === format)!;

  async function handle() {
    if (!files.length) { toast({ title: "Upload at least one image" }); return; }
    setProcessing(true);
    try {
      const res: ResultFile[] = [];
      for (const file of files) {
        let blob: Blob;
        if (format === "svg") {
          blob = await convertToSvg(file);
        } else {
          const bmp = await createImageBitmap(file);
          const canvas = document.createElement("canvas");
          canvas.width = bmp.width; canvas.height = bmp.height;
          canvas.getContext("2d")!.drawImage(bmp, 0, 0);
          const dataUrl = canvas.toDataURL(fmtInfo.mime, quality / 100);
          blob = dataURLtoBlob(dataUrl);
        }
        res.push({ name: `${baseName(file)}.${format}`, blob, size: blob.size });
      }
      setResults(res);
      onDone();
    } catch {
      toast({ title: "Error converting image", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.svg" multiple onFiles={setFiles} files={files}
        onRemove={i => setFiles(f => f.filter((_, j) => j !== i))} />
      <div className="space-y-1.5"><Label>Convert to</Label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {IMAGE_FORMATS.map(f => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {format === "svg" && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
          SVG wraps your image as an embedded raster — great for web use. For true vector artwork, use a dedicated vector editor.
        </div>
      )}
      {(format === "jpg" || format === "webp") && (
        <div className="space-y-2"><Label>Quality: {quality}%</Label>
          <Slider min={10} max={100} step={5} value={[quality]} onValueChange={([v]) => setQuality(v)} />
        </div>
      )}
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting…</> : `Convert to ${fmtInfo.label}`}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

function FlipImage({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [dir, setDir] = useState("horizontal");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload an image first" }); return; }
    setProcessing(true);
    try {
      const bmp = await createImageBitmap(files[0]);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width; canvas.height = bmp.height;
      const ctx = canvas.getContext("2d")!;
      if (dir === "horizontal") { ctx.translate(bmp.width, 0); ctx.scale(-1, 1); }
      else { ctx.translate(0, bmp.height); ctx.scale(1, -1); }
      ctx.drawImage(bmp, 0, 0);
      const blob = dataURLtoBlob(canvas.toDataURL("image/png"));
      setResults([{ name: `${baseName(files[0])}_flipped.png`, blob, size: blob.size }]);
      onDone();
    } catch (e) {
      toast({ title: "Error flipping image", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".jpg,.jpeg,.png,.webp" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      <div className="space-y-1.5"><Label>Flip direction</Label>
        <Select value={dir} onValueChange={setDir}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="horizontal">Horizontal (left-right)</SelectItem>
            <SelectItem value="vertical">Vertical (top-bottom)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Flipping…</> : "Flip Image"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

function RotateImage({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [angle, setAngle] = useState(90);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload an image first" }); return; }
    setProcessing(true);
    try {
      const bmp = await createImageBitmap(files[0]);
      const rad = (angle * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const nw = Math.round(bmp.width * cos + bmp.height * sin);
      const nh = Math.round(bmp.width * sin + bmp.height * cos);
      const canvas = document.createElement("canvas");
      canvas.width = nw; canvas.height = nh;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(nw / 2, nh / 2);
      ctx.rotate(rad);
      ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
      const blob = dataURLtoBlob(canvas.toDataURL("image/png"));
      setResults([{ name: `${baseName(files[0])}_rotated.png`, blob, size: blob.size }]);
      onDone();
    } catch (e) {
      toast({ title: "Error rotating image", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".jpg,.jpeg,.png,.webp" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      <div className="space-y-2"><Label>Angle: {angle}°</Label>
        <Slider min={-180} max={180} step={1} value={[angle]} onValueChange={([v]) => setAngle(v)} />
        <div className="flex gap-2 mt-1">
          {[90, 180, 270, -90].map(a => (
            <Button key={a} variant="outline" size="sm" onClick={() => setAngle(a)}>{a}°</Button>
          ))}
        </div>
      </div>
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rotating…</> : "Rotate Image"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

function WatermarkImage({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("FileZone");
  const [opacity, setOpacity] = useState(50);
  const [size, setSize] = useState(5);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload an image first" }); return; }
    setProcessing(true);
    try {
      const bmp = await createImageBitmap(files[0]);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width; canvas.height = bmp.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bmp, 0, 0);
      const fontSize = Math.round(Math.min(bmp.width, bmp.height) * (size / 100));
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = `rgba(255,255,255,${opacity / 100})`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.save();
      ctx.translate(bmp.width / 2, bmp.height / 2);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(text, 0, 0);
      ctx.restore();
      const blob = dataURLtoBlob(canvas.toDataURL("image/png"));
      setResults([{ name: `${baseName(files[0])}_watermarked.png`, blob, size: blob.size }]);
      onDone();
    } catch (e) {
      toast({ title: "Error adding watermark", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".jpg,.jpeg,.png,.webp" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      <div className="space-y-2"><Label>Watermark text</Label><Input value={text} onChange={e => setText(e.target.value)} /></div>
      <div className="space-y-2"><Label>Size: {size}% of image</Label>
        <Slider min={2} max={20} step={1} value={[size]} onValueChange={([v]) => setSize(v)} />
      </div>
      <div className="space-y-2"><Label>Opacity: {opacity}%</Label>
        <Slider min={10} max={100} step={5} value={[opacity]} onValueChange={([v]) => setOpacity(v)} />
      </div>
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding watermark…</> : "Add Watermark"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

function ImageToBase64({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [b64, setB64] = useState("");
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload an image first" }); return; }
    setProcessing(true);
    const reader = new FileReader();
    reader.onload = () => {
      setB64(reader.result as string);
      setProcessing(false);
      onDone();
    };
    reader.readAsDataURL(files[0]);
  }

  function copy() {
    navigator.clipboard.writeText(b64);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".jpg,.jpeg,.png,.webp,.gif" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Encoding…</> : "Encode to Base64"}
        </Button>
      )}
      {b64 && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <><Check className="h-3.5 w-3.5 mr-1" /> Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy</>}
            </Button>
          </div>
          <Textarea value={b64} readOnly className="h-40 font-mono text-xs" />
        </div>
      )}
    </div>
  );
}

function ImageToPdf({ onDone }: { onDone: () => void }) {
  return <JpgToPdf onDone={onDone} />;
}

function CropImage({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const [w, setW] = useState("500");
  const [h, setH] = useState("500");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload an image first" }); return; }
    setProcessing(true);
    try {
      const bmp = await createImageBitmap(files[0]);
      const cx = parseInt(x), cy = parseInt(y), cw = parseInt(w), ch = parseInt(h);
      const canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      canvas.getContext("2d")!.drawImage(bmp, cx, cy, cw, ch, 0, 0, cw, ch);
      const blob = dataURLtoBlob(canvas.toDataURL("image/png"));
      setResults([{ name: `${baseName(files[0])}_cropped.png`, blob, size: blob.size }]);
      onDone();
    } catch (e) {
      toast({ title: "Error cropping image", variant: "destructive" });
    } finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".jpg,.jpeg,.png,.webp" onFiles={setFiles} files={files} onRemove={() => setFiles([])} />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>X (px)</Label><Input value={x} onChange={e => setX(e.target.value)} type="number" min="0" /></div>
        <div className="space-y-1.5"><Label>Y (px)</Label><Input value={y} onChange={e => setY(e.target.value)} type="number" min="0" /></div>
        <div className="space-y-1.5"><Label>Width (px)</Label><Input value={w} onChange={e => setW(e.target.value)} type="number" min="1" /></div>
        <div className="space-y-1.5"><Label>Height (px)</Label><Input value={h} onChange={e => setH(e.target.value)} type="number" min="1" /></div>
      </div>
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cropping…</> : "Crop Image"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

// ---- TEXT / UTILITY TOOLS ----

function WordCounter() {
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

function QrGenerator({ onDone }: { onDone: () => void }) {
  const [input, setInput] = useState("https://");
  const [qrUrl, setQrUrl] = useState("");
  const [size, setSize] = useState(300);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  async function handle() {
    if (!input.trim()) { toast({ title: "Enter text or URL" }); return; }
    setProcessing(true);
    try {
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

function Base64Tool() {
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

function JsonFormatter() {
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

// ---- CONVERT TOOLS ----

function CsvToJson() {
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

function JsonToCsv() {
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

function MarkdownToHtml() {
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

function HtmlToText() {
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

function UrlEncoderTool() {
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

function ColorConverter() {
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

function NumberBase() {
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

// ---- TOOL REGISTRY ----
const TOOL_COMPONENTS: Record<string, React.ComponentType<{ onDone: () => void }>> = {
  "merge-pdf": MergePdf,
  "split-pdf": SplitPdf,
  "compress-pdf": CompressPdf,
  "pdf-to-jpg": PdfToJpg,
  "jpg-to-pdf": JpgToPdf,
  "rotate-pdf": RotatePdf,
  "watermark-pdf": WatermarkPdf,
  "pdf-to-text": PdfToText,
  "protect-pdf": ProtectPdf,
  "compress-image": CompressImage,
  "resize-image": ResizeImage,
  "convert-image": ConvertImage,
  "crop-image": CropImage,
  "image-to-pdf": ImageToPdf,
  "flip-image": FlipImage,
  "rotate-image": RotateImage,
  "watermark-image": WatermarkImage,
  "image-to-base64": ImageToBase64,
  "word-counter": WordCounter,
  "qr-generator": QrGenerator,
  "base64": Base64Tool,
  "json-formatter": JsonFormatter,
  // Calculators
  "age-calculator": AgeCalculator,
  "bmi-calculator": BmiCalculator,
  "percentage-calculator": PercentageCalculator,
  "cgpa-calculator": CgpaCalculator,
  "gpa-calculator": GpaCalculator,
  "emi-calculator": EmiCalculator,
  "sip-calculator": SipCalculator,
  "gst-calculator": GstCalculator,
  "income-tax-calculator": IncomeTaxCalculator,
  "currency-converter": CurrencyConverter,
  "scientific-calculator": ScientificCalculator,
  "loan-calculator": LoanCalculator,
  "discount-calculator": DiscountCalculator,
  "attendance-calculator": AttendanceCalculator,
  "date-difference": DateDifference,
  // Convert tools
  "csv-to-json": CsvToJson,
  "json-to-csv": JsonToCsv,
  "markdown-to-html": MarkdownToHtml,
  "html-to-text": HtmlToText,
  "url-encoder": UrlEncoderTool,
  "color-converter": ColorConverter,
  "number-base": NumberBase,
};

const NO_DONE_TOOLS = new Set([
  "word-counter", "base64", "json-formatter",
  "age-calculator", "bmi-calculator", "percentage-calculator", "cgpa-calculator",
  "gpa-calculator", "emi-calculator", "sip-calculator", "gst-calculator",
  "income-tax-calculator", "currency-converter", "scientific-calculator",
  "loan-calculator", "discount-calculator", "attendance-calculator", "date-difference",
  // Convert tools (text-based, no file tracking needed)
  "csv-to-json", "json-to-csv", "markdown-to-html", "html-to-text",
  "url-encoder", "color-converter", "number-base",
]);

const categoryBadgeColors: Record<string, string> = {
  pdf:        "bg-red-100 text-red-700",
  image:      "bg-blue-100 text-blue-700",
  convert:    "bg-violet-100 text-violet-700",
  text:       "bg-emerald-100 text-emerald-700",
  calculator: "bg-amber-100 text-amber-700",
};

// ---- MAIN TOOL PAGE ----
export function ToolPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: tool, isLoading } = useGetTool(slug, {
    query: { enabled: !!slug, queryKey: getGetToolQueryKey(slug) },
  });
  const trackMutation = useTrackToolUsage();
  const { data: allTools } = useListTools();

  const ToolComponent = TOOL_COMPONENTS[slug];

  function onDone() {
    if (!NO_DONE_TOOLS.has(slug)) {
      trackMutation.mutate({ toolSlug: slug, data: { filesProcessed: 1 } });
    }
  }

  const related = allTools
    ?.filter(t => t.slug !== slug && t.category === tool?.category)
    .slice(0, 4) ?? [];

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!ToolComponent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Tool Not Found</h1>
        <p className="text-muted-foreground mb-6">The tool "{slug}" doesn't exist yet.</p>
        <Link href="/"><Button><ArrowLeft className="h-4 w-4 mr-2" /> Back to Home</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <SEO
        title={tool?.name ?? slug}
        description={tool?.description
          ? `${tool.description} — Free online tool, no sign-up required. Works entirely in your browser.`
          : undefined}
        keywords={tool ? `${tool.name.toLowerCase()}, ${tool.category} tools, free online ${tool.name.toLowerCase()}` : undefined}
      />
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> All Tools
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {tool?.category && (
            <Badge className={cn("text-xs font-medium border-0", categoryBadgeColors[tool.category] ?? "bg-muted text-muted-foreground")}>
              {tool.category.toUpperCase()}
            </Badge>
          )}
          {tool?.usageCount && tool.usageCount > 0 && (
            <span className="text-xs text-muted-foreground">{tool.usageCount.toLocaleString()} uses</span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">{tool?.name ?? slug}</h1>
        {tool?.description && <p className="text-muted-foreground">{tool.description}</p>}
        {(tool?.inputFormats?.length || tool?.outputFormats?.length) && (
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            {tool.inputFormats?.length > 0 && <span>Input: {tool.inputFormats.join(", ").toUpperCase()}</span>}
            {tool.outputFormats?.length > 0 && <span>Output: {tool.outputFormats.join(", ").toUpperCase()}</span>}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <ToolComponent onDone={onDone} />
      </div>

      {/* AdSense — rectangle between tool and related tools */}
      <div className="mt-10 flex justify-center">
        <AdBanner slot="rectangle" />
      </div>

      {related.length > 0 && (
        <div className="mt-10">
          <Separator className="mb-8" />
          <h2 className="font-semibold text-lg mb-4">Related Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map(t => (
              <ToolCard key={t.slug} {...t} usageCount={t.usageCount ?? 0} isFeatured={t.isFeatured ?? false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
