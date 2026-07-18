import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { UploadZone } from "@/components/UploadZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ResultCard,
  ResultFile,
  getPendingFilesForTool,
  getPdfjs,
  downloadBlob,
  dataURLtoBlob,
  baseName
} from "./ToolHelpers";

export function MergePdf({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (files.length < 2) { toast({ title: "Add at least 2 PDF files" }); return; }
    setProcessing(true); setProgress(10);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        setProgress(10 + Math.round(80 * (i + 1) / files.length));
      }
      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
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

export function SplitPdf({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
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
      const { PDFDocument } = await import("pdf-lib");
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
          const blob = new Blob([b as any], { type: "application/pdf" });
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
        const blob = new Blob([b as any], { type: "application/pdf" });
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

export function CompressPdf({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
  const [level, setLevel] = useState<"smart" | "basic" | "extreme">("smart");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    setProcessing(true);
    try {
      const arrayBuffer = await files[0].arrayBuffer();
      const { PDFDocument } = await import("pdf-lib");

      let finalBytes: Uint8Array;

      if (level === "smart") {
        // Smart (Lossless) - re-compress layout structures and stream tables
        const doc = await PDFDocument.load(arrayBuffer);
        finalBytes = await doc.save({ useObjectStreams: true });
      } else {
        // Lossy Rasterization for image-heavy documents
        const pdfjs = await getPdfjs();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const pdfDoc = await PDFDocument.create();

        const scale = level === "basic" ? 1.2 : 0.85;
        const quality = level === "basic" ? 0.5 : 0.3;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d")!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport } as any).promise;
          const imgDataUrl = canvas.toDataURL("image/jpeg", quality);
          const imgBytes = await fetch(imgDataUrl).then(res => res.arrayBuffer());

          const embeddedImg = await pdfDoc.embedJpg(imgBytes);
          const newPage = pdfDoc.addPage([viewport.width, viewport.height]);
          newPage.drawImage(embeddedImg, {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height,
          });
        }
        finalBytes = await pdfDoc.save();
      }

      // Check if output size is larger than original input size
      if (finalBytes.length >= files[0].size) {
        if (level !== "smart") {
          // Fall back to smart lossless compression if lossy rasterization increased file size
          const doc = await PDFDocument.load(arrayBuffer);
          finalBytes = await doc.save({ useObjectStreams: true });
          toast({
            title: "Smart fallback applied",
            description: "Lossless optimization was used because rasterization would have increased the file size."
          });
        } else {
          toast({
            title: "Fully optimized",
            description: "This PDF is already compressed to its minimum size."
          });
        }
      }

      const blob = new Blob([finalBytes as any], { type: "application/pdf" });
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
        <div className="space-y-1.5">
          <Label>Compression Level</Label>
          <Select value={level} onValueChange={(v: any) => setLevel(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="smart">Smart Compression (Lossless, keeps text crisp)</SelectItem>
              <SelectItem value="basic">Basic Compression (Lossy, for scanned PDFs)</SelectItem>
              <SelectItem value="extreme">Extreme Compression (Lossy, maximum size reduction)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {files.length > 0 && (
        <Button className="w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Compressing…</> : "Compress PDF"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

export function PdfToJpg({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
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
      const pdfjs = await getPdfjs();
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const name = baseName(files[0]);

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport } as any).promise;
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

export function JpgToPdf({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files.length) { toast({ title: "Upload at least one image" }); return; }
    setProcessing(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
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
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
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

export function RotatePdf({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
  const [angle, setAngle] = useState("90");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    setProcessing(true);
    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const deg = parseInt(angle);
      doc.getPages().forEach(p => p.setRotation(degrees((p.getRotation().angle + deg) % 360)));
      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
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

export function WatermarkPdf({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
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
      const { PDFDocument, rgb, StandardFonts, degrees } = await import("pdf-lib");
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      doc.getPages().forEach((page: any) => {
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
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
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

export function PdfToText({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
  const [processing, setProcessing] = useState(false);
  const [text, setOutputText] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    setProcessing(true);
    try {
      const bytes = await files[0].arrayBuffer();
      const pdfjs = await getPdfjs();
      const pdf = await pdfjs.getDocument({ data: bytes }).promise;
      const parts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        parts.push(`--- Page ${i} ---\n` + content.items.map((it: any) => it.str ?? "").join(" "));
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

export function ProtectPdf({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
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
      const { encryptPDF } = await import("@pdfsmaller/pdf-encrypt");
      const encryptedBytes = await encryptPDF(new Uint8Array(bytes), password, {
        ownerPassword: password,
        algorithm: "AES-256"
      });
      const blob = new Blob([encryptedBytes as any], { type: "application/pdf" });
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

export function RemovePdfPages({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
  const [pagesToRemove, setPagesToRemove] = useState("");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const { toast } = useToast();

  async function loadInfo(f: File) {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await f.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      setPageCount(doc.getPageCount());
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (files[0]) {
      loadInfo(files[0]);
    }
  }, [files]);

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    const removeSet = new Set(
      pagesToRemove.split(",").map(s => parseInt(s.trim()) - 1).filter(n => !isNaN(n) && n >= 0)
    );
    if (!removeSet.size) { toast({ title: "Enter page numbers to remove" }); return; }
    setProcessing(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const bytes = await files[0].arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const total = src.getPageCount();
      const keepIndices = Array.from({ length: total }, (_, i) => i).filter(i => !removeSet.has(i));
      if (!keepIndices.length) { toast({ title: "Cannot remove all pages", variant: "destructive" }); setProcessing(false); return; }
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(src, keepIndices);
      pages.forEach(p => newDoc.addPage(p));
      const b = await newDoc.save();
      const blob = new Blob([b as any], { type: "application/pdf" });
      setResults([{ name: `${baseName(files[0])}_modified.pdf`, blob, size: blob.size }]);
      onDone();
    } catch { toast({ title: "Error processing PDF", variant: "destructive" }); }
    finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".pdf" onFiles={f => { setFiles(f); if (f[0]) loadInfo(f[0]); }} files={files}
        onRemove={() => { setFiles([]); setPageCount(0); setResults([]); }} />
      {pageCount > 0 && <p className="text-sm text-muted-foreground">Document has <strong>{pageCount}</strong> pages.</p>}
      {files[0] && (
        <div className="space-y-1.5">
          <Label>Page numbers to remove (comma-separated)</Label>
          <Input value={pagesToRemove} onChange={e => setPagesToRemove(e.target.value)} placeholder="e.g. 1, 3, 5" />
          <p className="text-xs text-muted-foreground">Enter the page numbers you want to delete, separated by commas</p>
        </div>
      )}
      {files[0] && pagesToRemove.trim() && (
        <Button className="mt-4 w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Removing pages…</> : "Remove Pages & Download"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}

export function AddPageNumbers({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload a PDF first" }); return; }
    setProcessing(true);
    try {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const total = doc.getPageCount();
      for (let i = 0; i < total; i++) {
        const page = doc.getPage(i);
        const { width } = page.getSize();
        page.drawText(`${i + 1} / ${total}`, {
          x: width / 2 - 18,
          y: 18,
          size: 10,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
      }
      const b = await doc.save();
      const blob = new Blob([b as any], { type: "application/pdf" });
      setResults([{ name: `${baseName(files[0])}_numbered.pdf`, blob, size: blob.size }]);
      onDone();
    } catch { toast({ title: "Error adding page numbers", variant: "destructive" }); }
    finally { setProcessing(false); }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".pdf" onFiles={setFiles} files={files} onRemove={() => { setFiles([]); setResults([]); }}
        label="Drop your PDF here" sublabel="Page numbers will be added at the bottom center of each page" />
      {files[0] && (
        <Button className="mt-4 w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding page numbers…</> : "Add Page Numbers"}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}
