import { useState, useEffect, useRef } from "react";
import { UploadZone } from "@/components/UploadZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Download, Copy, Check, Share2, ArrowRight,
  Laptop, Smartphone, FileUp, FolderUp, XCircle, RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { baseName } from "./ToolHelpers";



// ─── Types ────────────────────────────────────────────────────────────────────
interface ReceiverPeer {
  id: string;
  status: "connecting" | "transferring" | "completed" | "error";
  progress: number;
  speed: number;
  eta: number | null;
}

const EXPIRY_SECONDS = 600;     // 10-minute session window

// ─── Component ────────────────────────────────────────────────────────────────
export function FileSharing({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<"send" | "receive">("send");
  const [files, setFiles] = useState<File[]>([]);
  const [code, setCode] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "preparing" | "waiting" | "active" | "connecting" | "transferring" | "completed" | "error"
  >("idle");
  const [statusText, setStatusText] = useState("");
  const [retryCode, setRetryCode] = useState<string | null>(null); // allow retry with same code
  const [inputCode, setInputCode] = useState("");
  const [receivedFiles, setReceivedFiles] = useState<{ name: string; blob: Blob; size: number }[]>([]);
  const [progress, setProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0);
  const [eta, setEta] = useState<number | null>(null);
  const [activeFileName, setActiveFileName] = useState("");
  const [activeFileSize, setActiveFileSize] = useState(0);
  const [expiryTime, setExpiryTime] = useState<number | null>(null);
  const [receiverPeers, setReceiverPeers] = useState<ReceiverPeer[]>([]);

  const { toast } = useToast();

  // Refs — using refs avoids stale-closure bugs inside async event handlers
  const finalFileRef = useRef<File | null>(null);
  const expiryTimerRef = useRef<any>(null);
  const senderAbortControllerRef = useRef<AbortController | null>(null);
  const receiverAbortControllerRef = useRef<AbortController | null>(null);
  const pollingIntervalRef = useRef<any>(null);

  // ── Expiry countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (expiryTime === null) return;
    if (expiryTime <= 0) {
      handleCancelSend();
      toast({ title: "Session expired", description: "The 10-minute window closed.", variant: "destructive" });
      return;
    }
    expiryTimerRef.current = setTimeout(() => setExpiryTime(t => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(expiryTimerRef.current);
  }, [expiryTime]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // ── Auto-connect from URL param ─────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("code");
    if (joinCode && /^\d{6}$/.test(joinCode)) {
      setTab("receive");
      setInputCode(joinCode);
      startReceiving(joinCode);
    }
  }, []);

  // ── Utility ─────────────────────────────────────────────────────────────────
  const cleanup = () => {
    clearTimeout(expiryTimerRef.current);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (senderAbortControllerRef.current) {
      senderAbortControllerRef.current.abort();
      senderAbortControllerRef.current = null;
    }
    if (receiverAbortControllerRef.current) {
      receiverAbortControllerRef.current.abort();
      receiverAbortControllerRef.current = null;
    }
    // Clean up temporary iframe if any
    const iframe = (window as any).downloadIframe;
    if (iframe) {
      try { document.body.removeChild(iframe); } catch {}
      delete (window as any).downloadIframe;
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/tools/file-sharing?code=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied!" });
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SENDER FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSend = async () => {
    if (!files.length) {
      toast({ title: "Please select files to share", variant: "destructive" }); return;
    }
    setStatus("preparing"); setStatusText("Preparing files…");
    cleanup();
    setReceiverPeers([]);

    try {
      // 1. Build final file (zip if multiple)
      let finalFile: File;
      if (files.length === 1) {
        finalFile = files[0];
      } else {
        setStatusText("Zipping files…");
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        for (const f of files) zip.file((f as any).webkitRelativePath || f.name, f);
        const blob = await zip.generateAsync({ type: "blob" });
        finalFile = new File([blob], `${baseName(files[0])}_shared.zip`, { type: "application/zip" });
      }
      finalFileRef.current = finalFile;
      setActiveFileName(finalFile.name);
      setActiveFileSize(finalFile.size);

      // 2. Call backend to create transfer session
      setStatusText("Creating session…");
      const res = await fetch("/api/transfer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalFile.name,
          size: finalFile.size,
          mimeType: finalFile.type || "application/octet-stream"
        })
      });

      if (!res.ok) throw new Error("Failed to create sharing session on server");
      const data = await res.json();
      setCode(data.code);

      // 3. Generate QR code
      const { default: QRCode } = await import("qrcode");
      const shareUrl = `${window.location.origin}/tools/file-sharing?code=${data.code}`;
      const dataUrl = await QRCode.toDataURL(shareUrl, { width: 180, margin: 1 });
      setQrUrl(dataUrl);

      setStatus("waiting"); setStatusText("Waiting for receivers…");
      setExpiryTime(EXPIRY_SECONDS);

      // 4. Wait for receiver connection using HTTP Long-Polling
      const waitReceiver = async (shareCode: string) => {
        const controller = new AbortController();
        senderAbortControllerRef.current = controller;
        while (true) {
          if (controller.signal.aborted) return;
          try {
            const waitRes = await fetch(`/api/transfer/${shareCode}/wait`, { signal: controller.signal });
            if (!waitRes.ok) {
              throw new Error("Session expired or connection closed.");
            }
            const waitData = await waitRes.json();
            if (waitData.receiverConnected) {
              setStatus("active");
              uploadFileStream(shareCode, finalFileRef.current!);
              return;
            }
          } catch (err: any) {
            if (err.name === "AbortError") return;
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
      };
      waitReceiver(data.code);

    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setStatusText(e.message || "Failed to start session.");
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  /** Upload file in chunks over HTTP stream */
  const uploadFileStream = async (shareCode: string, file: File) => {
    let offset = 0;
    const CHUNK_SIZE = 256 * 1024; // 256 KB chunks — extremely reliable on mobile cellular uploads
    const startTime = Date.now();
    setStatus("active");

    const controller = new AbortController();
    senderAbortControllerRef.current = controller;

    try {
      while (offset < file.size) {
        if (controller.signal.aborted) return;

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const chunkBuf = await slice.arrayBuffer();

        // Send raw binary
        const res = await fetch(`/api/transfer/${shareCode}/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: chunkBuf,
          signal: controller.signal
        });

        if (!res.ok) throw new Error("Chunk upload failed");

        offset += chunkBuf.byteLength;

        // Calculate progress, speed, ETA
        const elapsed = (Date.now() - startTime) / 1000;
        const pct = Math.min(100, Math.round((offset / file.size) * 100));
        setProgress(pct);

        let spd = 0;
        let etaVal: number | null = null;
        if (elapsed > 0) {
          spd = Math.round(((offset / (1024 * 1024)) / elapsed) * 10) / 10;
          const rem = file.size - offset;
          etaVal = spd > 0 ? Math.ceil(rem / (spd * 1024 * 1024)) : null;
          setTransferSpeed(spd);
          setEta(etaVal);
        }

        // Update UI's receiverPeers list for consistent rendering
        setReceiverPeers([{
          id: "receiver-1",
          status: "transferring",
          progress: pct,
          speed: spd,
          eta: etaVal
        }]);
      }

      // Finalize transfer
      await fetch(`/api/transfer/${shareCode}/end`, { method: "POST" });
      setReceiverPeers([{
        id: "receiver-1",
        status: "completed",
        progress: 100,
        speed: 0,
        eta: null
      }]);
      setStatus("completed");
      setStatusText("Done!");
      onDone();

    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
      setStatus("error");
      setStatusText("Upload failed. Connection lost.");
    }
  };

  const handleCancelSend = async () => {
    if (code) {
      fetch(`/api/transfer/${code}/cancel`, { method: "POST" }).catch(() => {});
    }
    setExpiryTime(null);
    resetAll();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RECEIVER FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  const handleReceiveClick = () => {
    const trimmed = inputCode.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      toast({ title: "Enter a valid 6-digit code", variant: "destructive" }); return;
    }
    startReceiving(trimmed);
  };

  const startReceiving = async (joinCode: string) => {
    setStatus("connecting"); setStatusText("Connecting to sender…");
    setReceivedFiles([]);
    cleanup();

    const controller = new AbortController();
    receiverAbortControllerRef.current = controller;

    try {
      // 1. Verify session
      const verifyRes = await fetch(`/api/transfer/${joinCode}/status`, { signal: controller.signal });
      if (!verifyRes.ok) {
        let errMsg = "Invalid transfer code or session expired.";
        try {
          const errData = await verifyRes.json();
          if (errData?.error) errMsg = errData.error;
        } catch {}
        throw new Error(`${errMsg} (Server status: ${verifyRes.status})`);
      }
      const verifyData = await verifyRes.json();
      setActiveFileName(verifyData.name || "Shared File");
      setActiveFileSize(verifyData.totalBytes || 0);

      // 2. Trigger native download (Vercel routes this to Render backend)
      const downloadUrl = `/api/transfer/${joinCode}/download`;
      window.location.href = downloadUrl;

      setStatus("transferring");
      setStatusText("Receiving…");

      // 3. Poll status to display native browser download progress
      const startTime = Date.now();
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/transfer/${joinCode}/status`);
          if (!statusRes.ok) {
            // Session closed on completion
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            setStatus("completed");
            setStatusText("Done!");
            onDone();
            return;
          }
          const statusData = await statusRes.json();
          
          if (!statusData.receiverConnected && statusData.uploadedBytes >= statusData.totalBytes) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            setStatus("completed");
            setStatusText("Done!");
            onDone();
            return;
          }

          const pct = Math.min(100, Math.round((statusData.uploadedBytes / statusData.totalBytes) * 100));
          setProgress(pct);

          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed > 0) {
            const spd = (statusData.uploadedBytes / (1024 * 1024)) / elapsed;
            setTransferSpeed(Math.round(spd * 10) / 10);
            const rem = statusData.totalBytes - statusData.uploadedBytes;
            setEta(spd > 0 ? Math.ceil(rem / (spd * 1024 * 1024)) : null);
          }
        } catch {
          // Fallback exit
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          setStatus("completed");
          onDone();
        }
      }, 3000);

    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setRetryCode(joinCode);
      setStatusText(e.message || "Failed to receive file.");
    }
  };

  const handleCancelReceive = () => {
    if (inputCode) {
      fetch(`/api/transfer/${inputCode}/cancel`, { method: "POST" }).catch(() => {});
    }
    setExpiryTime(null);
    resetAll();
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetAll = () => {
    cleanup();
    setFiles([]); setCode(""); setQrUrl(""); setStatus("idle"); setStatusText("");
    setProgress(0); setTransferSpeed(0); setEta(null); setInputCode("");
    setReceivedFiles([]); setExpiryTime(null); setReceiverPeers([]);
  };

  // ── Formatters ────────────────────────────────────────────────────────────
  const formatSize = (b: number) => {
    if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`;
    if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(2)} MB`;
    return `${(b / 1024).toFixed(1)} KB`;
  };
  const formatEta = (s: number | null) => {
    if (!s || s <= 0) return "--";
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  };
  const formatExpiry = (s: number | null) => {
    if (s === null) return "";
    return `Expires in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex rounded-xl bg-muted p-1 border">
        {(["send", "receive"] as const).map(t => (
          <button key={t} onClick={() => { resetAll(); setTab(t); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t === "send" ? <><FileUp className="h-4 w-4" /> Send File</> : <><FolderUp className="h-4 w-4" /> Receive File</>}
          </button>
        ))}
      </div>

      {/* ── SEND TAB ─────────────────────────────────────────────────────────── */}
      {tab === "send" && (
        <div className="space-y-4">
          {status === "idle" && (
            <>
              <UploadZone accept="*" multiple onFiles={setFiles} files={files}
                onRemove={(i) => setFiles(f => f.filter((_, j) => j !== i))}
                label="Choose files or folders to share"
                sublabel="Any type — images, videos, audio, documents, archives. No size limit." />
              {files.length > 0 && (
                <Button className="w-full" size="lg" onClick={() => handleSend()}>
                  <Share2 className="h-4 w-4 mr-2" /> Share {files.length} File{files.length > 1 ? "s" : ""}
                </Button>
              )}
            </>
          )}

          {status === "preparing" && (
            <div className="flex flex-col items-center p-10 border rounded-2xl bg-muted/20 text-center space-y-4 animate-in fade-in">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-semibold text-muted-foreground">{statusText}</p>
            </div>
          )}

          {(status === "waiting" || status === "active") && (
            <div className="flex flex-col items-center p-8 border rounded-2xl bg-muted/20 text-center space-y-5 animate-in fade-in duration-300">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Share this code</p>
                <h2 className="text-5xl font-extrabold tracking-widest text-primary font-mono select-all">
                  {code.slice(0, 3)} {code.slice(3)}
                </h2>
                {expiryTime !== null && (
                  <p className="text-xs text-rose-500 font-medium animate-pulse">{formatExpiry(expiryTime)}</p>
                )}
              </div>

              {qrUrl && (
                <div className="p-3 bg-white border rounded-2xl shadow-sm">
                  <img src={qrUrl} alt="QR code" className="w-36 h-36" />
                </div>
              )}

              <div className="flex gap-2 w-full max-w-sm">
                <Input readOnly value={`${window.location.origin}/tools/file-sharing?code=${code}`}
                  className="font-mono text-xs text-muted-foreground bg-background" />
                <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {receiverPeers.length === 0 ? (
                  <><Loader2 className="h-4 w-4 animate-spin text-primary" /><span>Waiting for receivers…</span></>
                ) : (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    {receiverPeers.length} device{receiverPeers.length > 1 ? "s" : ""} connected
                  </span>
                )}
              </div>

              {receiverPeers.length > 0 && (
                <div className="w-full max-w-md border-t pt-4 mt-1 space-y-3 text-left">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Connected Devices</p>
                  {receiverPeers.map((r, i) => (
                    <div key={r.id} className="p-4 border rounded-xl bg-card shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold font-mono text-muted-foreground">Recipient #{i + 1}</span>
                        <Badge variant="outline" className={`text-[10px] font-bold ${
                          r.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          r.status === "transferring" ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" :
                          r.status === "error" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-muted text-muted-foreground"
                        }`}>{r.status.toUpperCase()}</Badge>
                      </div>
                      {(r.status === "transferring" || r.status === "completed") && (
                        <div className="space-y-1.5">
                          <Progress value={r.progress} className="h-2" />
                          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                            <span>{r.progress}% sent</span>
                            <span>{r.speed} MB/s · ETA {formatEta(r.eta)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button variant="destructive" size="sm" onClick={handleCancelSend} className="mt-2 text-xs">
                <XCircle className="h-4 w-4 mr-1.5" /> Cancel Session
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center p-8 border rounded-2xl bg-rose-50/10 border-rose-500/20 text-center space-y-4">
              <h3 className="font-bold text-lg text-rose-600 dark:text-rose-400">Failed to Start</h3>
              <p className="text-sm text-muted-foreground max-w-xs">{statusText || "Unable to create sharing session."}</p>
              <Button onClick={resetAll} variant="outline" className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── RECEIVE TAB ──────────────────────────────────────────────────────── */}
      {tab === "receive" && (
        <div className="space-y-4">
          {status === "idle" && (
            <div className="p-6 border rounded-2xl bg-card shadow-sm space-y-4 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label htmlFor="receive-code">Enter 6-Digit Code</Label>
                <Input id="receive-code" type="text" maxLength={6} placeholder="123456"
                  className="text-center text-3xl font-bold tracking-widest h-14 font-mono focus-visible:ring-primary"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && inputCode.length === 6 && handleReceiveClick()} />
              </div>
              <Button className="w-full" size="lg" onClick={handleReceiveClick} disabled={inputCode.length !== 6}>
                <ArrowRight className="h-4 w-4 mr-2" /> Receive File
              </Button>
            </div>
          )}

          {status === "connecting" && (
            <div className="flex flex-col items-center p-12 border rounded-2xl bg-muted/20 text-center space-y-4 animate-in fade-in duration-300">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-semibold text-muted-foreground">{statusText}</p>
              <p className="text-xs text-muted-foreground max-w-xs">Keep the sender's browser tab open with the same code.</p>
              <Button variant="ghost" size="sm" onClick={handleCancelReceive} className="mt-2 text-xs">Cancel</Button>
            </div>
          )}

          {status === "transferring" && (
            <div className="p-6 border rounded-2xl bg-card shadow-sm space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="font-semibold text-sm truncate max-w-xs">{activeFileName}</h4>
                  <p className="text-xs text-muted-foreground">{formatSize(activeFileSize)}</p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border-blue-200 animate-pulse">
                  Receiving
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Progress</span><span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2.5" />
              </div>
              <div className="grid grid-cols-2 gap-4 text-center border-t pt-4">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Speed</p>
                  <p className="text-xl font-bold text-primary mt-1">{transferSpeed} MB/s</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">ETA</p>
                  <p className="text-xl font-bold text-primary mt-1">{formatEta(eta)}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancelReceive}
                className="w-full text-xs text-destructive hover:bg-destructive/10 mt-4">Cancel</Button>
            </div>
          )}

          {status === "completed" && (
            <div className="flex flex-col items-center p-8 border rounded-2xl bg-muted/20 text-center space-y-5 animate-in zoom-in-95 duration-300">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:bg-emerald-900/30">
                <Check className="h-6 w-6" />
              </div>
              <div><h3 className="font-bold text-lg">File Received!</h3></div>
              <div className="w-full max-w-xs space-y-2">
                <div className="p-4 border rounded-xl bg-card shadow-xs text-center space-y-1">
                  <p className="text-sm font-semibold truncate">{activeFileName || "Shared File"}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(activeFileSize)}</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-2">Saved to your device's Downloads folder!</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetAll} className="text-xs text-muted-foreground">
                Receive another file
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center p-8 border rounded-2xl bg-rose-50/10 border-rose-500/20 text-center space-y-4">
              <h3 className="font-bold text-lg text-rose-600 dark:text-rose-400">Connection Failed</h3>
              <p className="text-sm text-muted-foreground max-w-xs">{statusText || "Failed to receive file."}</p>
              <div className="flex gap-2 mt-4">
                {retryCode && (
                  <Button onClick={() => startReceiving(retryCode)} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Retry (code: {retryCode})
                  </Button>
                )}
                <Button onClick={() => { setRetryCode(null); resetAll(); }} variant="outline">
                  Start Over
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-6 text-xs text-muted-foreground">
        <div className="flex gap-2.5 items-start">
          <Laptop className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-foreground">Peer-to-Peer Transfer</h5>
            <p className="mt-0.5 leading-relaxed">Files stream directly between devices via WebRTC — nothing uploaded to any server.</p>
          </div>
        </div>
        <div className="flex gap-2.5 items-start">
          <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-foreground">Works on All Devices</h5>
            <p className="mt-0.5 leading-relaxed">Phone, tablet, laptop — any browser. Share across any network or distance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
