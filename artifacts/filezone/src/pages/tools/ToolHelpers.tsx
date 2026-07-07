import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { UploadZone } from "@/components/UploadZone";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Download, RefreshCw, ChevronDown, Copy, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

export interface ResultFile {
  name: string;
  blob: Blob;
  size: number;
}

export async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  // @ts-ignore
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

export function getPendingFilesForTool(slug: string): File[] {
  if (typeof window === "undefined") return [];
  const pending = (window as any).pendingFileToProcess;
  if (!pending) return [];

  const file = pending.file as File;
  const isPdfTool = ["merge-pdf", "split-pdf", "compress-pdf", "pdf-to-jpg", "jpg-to-pdf", "rotate-pdf", "watermark-pdf", "pdf-to-text", "protect-pdf", "remove-pdf-pages"].includes(slug);
  const isImageTool = ["compress-image", "resize-image", "convert-image", "flip-image", "rotate-image", "watermark-image", "image-to-base64", "image-to-pdf", "crop-image"].includes(slug);

  if (isPdfTool && file.type === "application/pdf") {
    delete (window as any).pendingFileToProcess;
    return [file];
  }
  if (isImageTool && file.type.startsWith("image/")) {
    delete (window as any).pendingFileToProcess;
    return [file];
  }
  return [];
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      resolve(img);
      setTimeout(() => {
        try { URL.revokeObjectURL(url); } catch {}
      }, 5000);
    };
    img.onerror = (e) => {
      try { URL.revokeObjectURL(url); } catch {}
      reject(e);
    };
    img.src = url;
  });
}

export function canvasToBmp(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height } = imgData;
  const data = imgData.data;

  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // File Header
  view.setUint16(0, 0x424D, true); // "BM"
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, 54, true);

  // DIB Header
  view.setUint32(14, 40, true);
  view.setUint32(18, width, true);
  view.setUint32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelArraySize, true);
  view.setUint32(38, 2835, true);
  view.setUint32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Pixels (bottom-up, BGR)
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    const rowOffset = y * width * 4;
    let xOffset = 0;
    for (let x = 0; x < width; x++) {
      const p = rowOffset + x * 4;
      view.setUint8(offset + xOffset, data[p + 2]);     // B
      view.setUint8(offset + xOffset + 1, data[p + 1]); // G
      view.setUint8(offset + xOffset + 2, data[p]);     // R
      xOffset += 3;
    }
    for (let p = xOffset; p < rowSize; p++) {
      view.setUint8(offset + p, 0);
    }
    offset += rowSize;
  }
  return new Blob([buffer], { type: "image/bmp" });
}

export async function canvasToIco(canvas: HTMLCanvasElement): Promise<Blob> {
  const pngBlob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), "image/png"));
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

  const buffer = new ArrayBuffer(6 + 16 + pngBytes.length);
  const view = new DataView(buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true); // ICO type
  view.setUint16(4, 1, true); // Image count

  const w = canvas.width >= 256 ? 0 : canvas.width;
  const h = canvas.height >= 256 ? 0 : canvas.height;
  view.setUint8(6, w);
  view.setUint8(7, h);
  view.setUint8(8, 0);
  view.setUint8(9, 0);
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngBytes.length, true);
  view.setUint32(18, 22, true);

  new Uint8Array(buffer, 22).set(pngBytes);
  return new Blob([buffer], { type: "image/x-icon" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function dataURLtoBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function baseName(f: File) {
  return f.name.replace(/\.[^.]+$/, "");
}

export function PdfPreviewThumb({ blob }: { blob: Blob }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const pdfjs = await getPdfjs();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport } as any).promise;
        if (!cancelled) setDataUrl(canvas.toDataURL("image/jpeg", 0.85));
      } catch { if (!cancelled) setError(true); }
    })();
    return () => { cancelled = true; };
  }, [blob]);

  if (error) return null;
  if (!dataUrl) return (
    <div className="bg-muted/40 flex items-center justify-center border-b h-32">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
  return (
    <div className="bg-muted/40 flex items-center justify-center p-3 border-b max-h-64 overflow-hidden">
      <img src={dataUrl} alt="PDF preview" className="max-h-60 max-w-full object-contain rounded shadow-sm" />
    </div>
  );
}

export function TextPreviewThumb({ blob }: { blob: Blob }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    blob.text().then(t => setText(t.slice(0, 400)));
  }, [blob]);
  if (!text) return null;
  return (
    <div className="bg-muted/40 border-b p-4 max-h-40 overflow-hidden">
      <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap line-clamp-6">{text}</pre>
    </div>
  );
}

export function ResultCard({ results }: { results: ResultFile[] }) {
  const [, setLocation] = useLocation();
  if (!results.length) return null;

  const handleProcessFurther = (r: ResultFile, targetSlug: string) => {
    const nextFile = new File([r.blob], r.name, { type: r.blob.type });
    (window as any).pendingFileToProcess = {
      file: nextFile,
      name: r.name
    };
    setLocation(`/tools/${targetSlug}`);
  };

  return (
    <div className="mt-6 space-y-4">
      {results.map((r, i) => {
        const isPdf = r.blob.type === "application/pdf";
        const isImage = r.blob.type.startsWith("image/");
        return (
          <div key={i} className="rounded-xl border bg-card overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            {r.blob.type.startsWith("image/") && (
              <div className="bg-muted/40 flex items-center justify-center p-3 border-b max-h-64 overflow-hidden">
                <img
                  src={URL.createObjectURL(r.blob)}
                  alt={r.name}
                  className="max-h-60 max-w-full object-contain rounded"
                />
              </div>
            )}
            {r.blob.type === "application/pdf" && <PdfPreviewThumb blob={r.blob} />}
            {r.blob.type === "text/plain" && <TextPreviewThumb blob={r.blob} />}
            <div className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.size >= 1024 * 1024
                    ? `${(r.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(r.size / 1024).toFixed(1)} KB`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {(isPdf || isImage) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin-slow" /> Process Further <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Chaining Operations</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {isPdf && (
                        <>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "compress-pdf")}>Compress PDF</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "protect-pdf")}>Protect PDF</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "split-pdf")}>Split PDF</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "rotate-pdf")}>Rotate PDF</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "watermark-pdf")}>Watermark PDF</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "pdf-to-jpg")}>PDF to JPG</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "pdf-to-text")}>PDF to Text</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "remove-pdf-pages")}>Remove PDF Pages</DropdownMenuItem>
                        </>
                      )}
                      {isImage && (
                        <>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "compress-image")}>Compress Image</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "resize-image")}>Resize Image</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "convert-image")}>Convert Format</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "crop-image")}>Crop Image</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "rotate-image")}>Rotate Image</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "flip-image")}>Flip Image</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "image-to-pdf")}>Image to PDF</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcessFurther(r, "image-to-base64")}>Image to Base64</DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button size="sm" onClick={() => downloadBlob(r.blob, r.name)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
