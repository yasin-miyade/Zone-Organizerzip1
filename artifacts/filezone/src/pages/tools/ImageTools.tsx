import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { UploadZone } from "@/components/UploadZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  ResultCard,
  ResultFile,
  getPendingFilesForTool,
  loadImage,
  canvasToBmp,
  canvasToIco,
  downloadBlob,
  dataURLtoBlob,
  baseName
} from "./ToolHelpers";
import { JpgToPdf } from "./PdfTools";

export const IMAGE_FORMATS = [
  { value: "jpg",  label: "JPG",  mime: "image/jpeg" },
  { value: "png",  label: "PNG",  mime: "image/png" },
  { value: "webp", label: "WebP", mime: "image/webp" },
  { value: "gif",  label: "GIF",  mime: "image/gif" },
  { value: "bmp",  label: "BMP",  mime: "image/bmp" },
  { value: "ico",  label: "ICO",  mime: "image/x-icon" },
  { value: "tiff", label: "TIFF", mime: "image/tiff" },
  { value: "svg",  label: "SVG",  mime: "image/svg+xml" },
];

export async function convertToSvg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
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

export function CompressImage({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
  const [quality, setQuality] = useState(80);
  const [maxSizeMb, setMaxSizeMb] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files.length) { toast({ title: "Upload at least one image" }); return; }
    setProcessing(true);
    try {
      const { default: imageCompression } = await import("browser-image-compression");
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

export function ResizeImage({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
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
      const img = new window.Image();
      const url = URL.createObjectURL(newFiles[0]);
      img.onload = () => {
        setOrigSize({ w: img.naturalWidth, h: img.naturalHeight });
        setWidth(String(img.naturalWidth));
        setHeight(String(img.naturalHeight));
        setTimeout(() => {
          try { URL.revokeObjectURL(url); } catch {}
        }, 5000);
      };
      img.onerror = () => {
        try { URL.revokeObjectURL(url); } catch {}
      };
      img.src = url;
    }
  }

  useEffect(() => {
    if (files[0] && !origSize) {
      onFilesChanged([files[0]]);
    }
  }, [files]);

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
      const img = await loadImage(files[0]);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
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

export function ConvertImage({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
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
          const img = await loadImage(file);
          const canvas = document.createElement("canvas");
          canvas.width = img.width; canvas.height = img.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          
          if (format === "bmp") {
            blob = canvasToBmp(canvas);
          } else if (format === "ico") {
            blob = await canvasToIco(canvas);
          } else {
            const dataUrl = canvas.toDataURL(fmtInfo.mime, quality / 100);
            blob = dataURLtoBlob(dataUrl);
          }
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

export function FlipImage({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
  const [dir, setDir] = useState("horizontal");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload an image first" }); return; }
    setProcessing(true);
    try {
      const img = await loadImage(files[0]);
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      if (dir === "horizontal") { ctx.translate(img.width, 0); ctx.scale(-1, 1); }
      else { ctx.translate(0, img.height); ctx.scale(1, -1); }
      ctx.drawImage(img, 0, 0);
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

export function RotateImage({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
  const [angle, setAngle] = useState(90);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload an image first" }); return; }
    setProcessing(true);
    try {
      const img = await loadImage(files[0]);
      const rad = (angle * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const nw = Math.round(img.width * cos + img.height * sin);
      const nh = Math.round(img.width * sin + img.height * cos);
      const canvas = document.createElement("canvas");
      canvas.width = nw; canvas.height = nh;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(nw / 2, nh / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
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

export function WatermarkImage({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
  const [text, setText] = useState("5toolbox");
  const [opacity, setOpacity] = useState(50);
  const [size, setSize] = useState(5);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload an image first" }); return; }
    setProcessing(true);
    try {
      const img = await loadImage(files[0]);
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const fontSize = Math.round(Math.min(img.width, img.height) * (size / 100));
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = `rgba(255,255,255,${opacity / 100})`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.save();
      ctx.translate(img.width / 2, img.height / 2);
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

export function ImageToBase64({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
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

export function ImageToPdf({ onDone }: { onDone: () => void }) {
  return <JpgToPdf onDone={onDone} />;
}

export function CropImage({ onDone }: { onDone: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [files, setFiles] = useState<File[]>(() => getPendingFilesForTool(slug ?? ""));
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
      const img = await loadImage(files[0]);
      const cx = parseInt(x), cy = parseInt(y), cw = parseInt(w), ch = parseInt(h);
      const canvas = document.createElement("canvas");
      canvas.width = cw; canvas.height = ch;
      canvas.getContext("2d")!.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
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

export function SvgToPng({ onDone }: { onDone: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [scale, setScale] = useState(2);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResultFile[]>([]);
  const { toast } = useToast();

  async function handle() {
    if (!files[0]) { toast({ title: "Upload an SVG file" }); return; }
    setProcessing(true);
    try {
      const text = await files[0].text();
      const svgBlob = new Blob([text], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);
      const img = new window.Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      const w = (img.naturalWidth || 800) * scale;
      const h = (img.naturalHeight || 600) * scale;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => {
        if (!b) { toast({ title: "Conversion failed", variant: "destructive" }); setProcessing(false); return; }
        setResults([{ name: `${baseName(files[0])}.png`, blob: b, size: b.size }]);
        setProcessing(false);
        onDone();
      }, "image/png");
    } catch {
      toast({ title: "Error converting SVG", variant: "destructive" });
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-4">
      <UploadZone accept=".svg" onFiles={setFiles} files={files} onRemove={() => { setFiles([]); setResults([]); }}
        label="Drop SVG file here" sublabel="Upload an SVG vector file to convert to PNG" />
      {files[0] && (
        <div className="space-y-1.5">
          <Label>Output Scale (×{scale})</Label>
          <Slider value={[scale]} onValueChange={([v]) => setScale(v)} min={1} max={4} step={0.5} className="mt-2" />
          <p className="text-xs text-muted-foreground">Higher scale produces a larger, sharper PNG image</p>
        </div>
      )}
      {files[0] && (
        <Button className="mt-4 w-full" onClick={handle} disabled={processing} data-testid="button-process">
          {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Converting…</> : `Convert to PNG (${scale}×)`}
        </Button>
      )}
      <ResultCard results={results} />
    </div>
  );
}
