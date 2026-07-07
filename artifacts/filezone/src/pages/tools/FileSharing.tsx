import { useState, useEffect, useRef, useCallback } from "react";
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

// PeerJS is loaded via dynamic import to avoid SSR issues
// Uses the free public PeerJS cloud broker (peerjs.com) — no backend needed

const CHUNK_SIZE = 64 * 1024; // 64 KB chunks for fast transfer
const EXPIRY_SECONDS = 600;   // 10-minute session expiry

// Derives a short, memorable 6-digit code from a PeerJS peer ID
function peerIdToCode(peerId: string): string {
  // Take last 6 alphanumeric chars and convert to digits
  const clean = peerId.replace(/[^a-z0-9]/gi, "");
  const tail = clean.slice(-8);
  let num = 0;
  for (let i = 0; i < tail.length; i++) {
    num = (num * 31 + tail.charCodeAt(i)) >>> 0;
  }
  return String(num % 1000000).padStart(6, "0");
}

// Reverse lookup — sender's peer ID is stored in a simple in-memory map
// so receiver can find the right peer. We embed the peerId in the "code"
// by using the actual peerId as the ID (prefixed with the 6-digit code)
function makeSenderPeerId(code: string): string {
  return `fz-send-${code}-${Math.random().toString(36).slice(2, 7)}`;
}

// The sender registers with a fixed, code-based ID so receivers can look it up
function makeSenderFixedId(code: string): string {
  return `fzs${code}`;
}

function makeReceiverPeerId(): string {
  return `fzr${Math.random().toString(36).slice(2, 10)}`;
}

interface ReceiverPeer {
  conn: any;
  status: "connecting" | "transferring" | "completed" | "error";
  progress: number;
  speed: number;
  eta: number | null;
  id: string;
}

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

  // Refs
  const senderPeerRef = useRef<any>(null);
  const receiverPeerRef = useRef<any>(null);
  const finalFileRef = useRef<File | null>(null);
  const receiversRef = useRef<Map<string, ReceiverPeer>>(new Map());
  const expiryTimerRef = useRef<any>(null);
  // Tracks whether the receiver data channel has successfully opened.
  // Using a ref avoids stale closure bugs in setTimeout/event handlers.
  const dcOpenedRef = useRef(false);

  // Expiry countdown
  useEffect(() => {
    if (expiryTime === null) return;
    if (expiryTime <= 0) {
      handleCancelSend();
      toast({ title: "Session expired", description: "The 10-minute connection window closed.", variant: "destructive" });
      return;
    }
    expiryTimerRef.current = setTimeout(() => setExpiryTime(t => (t !== null ? t - 1 : null)), 1000);
    return () => clearTimeout(expiryTimerRef.current);
  }, [expiryTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { destroyPeers(); };
  }, []);

  // Auto-connect from URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("code");
    if (joinCode && /^\d{6}$/.test(joinCode)) {
      setTab("receive");
      setInputCode(joinCode);
      startReceiving(joinCode);
    }
  }, []);

  const destroyPeers = () => {
    clearTimeout(expiryTimerRef.current);
    if (senderPeerRef.current) {
      try { senderPeerRef.current.destroy(); } catch {}
      senderPeerRef.current = null;
    }
    if (receiverPeerRef.current) {
      try { receiverPeerRef.current.destroy(); } catch {}
      receiverPeerRef.current = null;
    }
    for (const r of receiversRef.current.values()) {
      try { r.conn.close(); } catch {}
    }
    receiversRef.current.clear();
  };

  const syncReceivers = () => {
    setReceiverPeers(Array.from(receiversRef.current.values()));
  };

  const copyLink = () => {
    const url = `${window.location.origin}/tools/file-sharing?code=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied!" });
    });
  };

  // ─── SENDER FLOW ─────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!files.length) {
      toast({ title: "Please select files to share", variant: "destructive" });
      return;
    }

    setStatus("preparing");
    setStatusText("Preparing files…");
    destroyPeers();
    receiversRef.current.clear();
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
        for (const f of files) {
          zip.file((f as any).webkitRelativePath || f.name, f);
        }
        const blob = await zip.generateAsync({ type: "blob" });
        finalFile = new File([blob], `${baseName(files[0])}_shared.zip`, { type: "application/zip" });
      }
      finalFileRef.current = finalFile;
      setActiveFileName(finalFile.name);
      setActiveFileSize(finalFile.size);

      // 2. Generate a random 6-digit code
      const newCode = String(Math.floor(Math.random() * 900000) + 100000);
      setCode(newCode);

      // 3. Create PeerJS peer with fixed ID based on code
      setStatusText("Starting connection broker…");
      const { Peer } = await import("peerjs");
      const fixedId = makeSenderFixedId(newCode);

      // Use PeerJS default ICE config — it includes TURN relay for NAT traversal
      const peer = new Peer(fixedId, { debug: 0 });
      senderPeerRef.current = peer;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Connection broker timeout. Try again.")), 10000);
        peer.on("open", () => {
          clearTimeout(timeout);
          resolve();
        });
        peer.on("error", (err: any) => {
          clearTimeout(timeout);
          // If ID is already taken (another sender with same code), retry with new code
          if (err.type === "unavailable-id") {
            reject(new Error("Code conflict, retrying…"));
          } else {
            reject(new Error("Broker error: " + (err.message || err.type)));
          }
        });
      });

      // 4. Listen for incoming receiver connections
      peer.on("connection", (conn: any) => {
        const rid = conn.peer;

        const receiver: ReceiverPeer = {
          conn,
          status: "connecting",
          progress: 0,
          speed: 0,
          eta: null,
          id: rid
        };
        receiversRef.current.set(rid, receiver);
        syncReceivers(); // show the peer as "connecting" but don't set active yet

        conn.on("open", () => {
          const r = receiversRef.current.get(rid);
          if (r) { r.status = "transferring"; syncReceivers(); }
          setStatus("active"); // only set active once channel truly opens
          sendFileToPeer(rid, conn, finalFileRef.current!);
        });

        conn.on("data", (data: any) => {
          // Handle cancel signal from receiver
          if (data?.type === "cancel") {
            const r = receiversRef.current.get(rid);
            if (r) { r.status = "error"; syncReceivers(); }
            conn.close();
          }
        });

        conn.on("close", () => {
          const r = receiversRef.current.get(rid);
          if (r && r.status !== "completed") {
            r.status = "error";
            syncReceivers();
          }
        });

        conn.on("error", () => {
          const r = receiversRef.current.get(rid);
          if (r) { r.status = "error"; syncReceivers(); }
        });
      });

      // 5. Generate QR code
      const { default: QRCode } = await import("qrcode");
      const shareUrl = `${window.location.origin}/tools/file-sharing?code=${newCode}`;
      const dataUrl = await QRCode.toDataURL(shareUrl, { width: 180, margin: 1 });
      setQrUrl(dataUrl);

      setStatus("waiting");
      setStatusText("Waiting for receivers…");
      setExpiryTime(EXPIRY_SECONDS);

    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setStatusText(e.message || "Failed to start sharing session.");
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const sendFileToPeer = (rid: string, conn: any, file: File) => {
    let offset = 0;
    const startTime = Date.now();

    const sendNextChunk = () => {
      const receiver = receiversRef.current.get(rid);
      if (!receiver || receiver.status === "error") return;

      // Backpressure: wait if buffer is full
      if (conn.dataChannel && conn.dataChannel.bufferedAmount > 2 * 1024 * 1024) {
        setTimeout(sendNextChunk, 50);
        return;
      }

      if (offset >= file.size) {
        // Send EOF as JSON string
        conn.send(JSON.stringify({ type: "EOF" }));
        const r = receiversRef.current.get(rid);
        if (r) { r.status = "completed"; r.progress = 100; syncReceivers(); }
        onDone();
        return;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const reader = new FileReader();
      reader.onload = (e) => {
        const buf = e.target?.result as ArrayBuffer;
        if (!buf) return;

        try {
          conn.send(buf);
          offset += buf.byteLength;

          // Update progress
          const elapsed = (Date.now() - startTime) / 1000;
          const pct = Math.min(100, Math.round((offset / file.size) * 100));
          let spd = 0, etaVal: number | null = null;
          if (elapsed > 0) {
            spd = Math.round(((offset / (1024 * 1024)) / elapsed) * 10) / 10;
            const remaining = file.size - offset;
            etaVal = spd > 0 ? Math.ceil(remaining / (spd * 1024 * 1024)) : null;
          }

          const r = receiversRef.current.get(rid);
          if (r) {
            r.progress = pct;
            r.speed = spd;
            r.eta = etaVal;
            syncReceivers();
          }

          sendNextChunk();
        } catch (err) {
          console.error("Send error:", err);
          const r = receiversRef.current.get(rid);
          if (r) { r.status = "error"; syncReceivers(); }
        }
      };
      reader.readAsArrayBuffer(slice);
    };

    // Send metadata header as JSON string (raw serialization sends strings as-is)
    conn.send(JSON.stringify({
      type: "metadata",
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream"
    }));

    sendNextChunk();
  };

  const handleCancelSend = async () => {
    setExpiryTime(null);
    destroyPeers();
    resetAll();
  };

  // ─── RECEIVER FLOW ───────────────────────────────────────────────────────────

  const handleReceiveClick = () => {
    const trimmed = inputCode.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      toast({ title: "Enter a valid 6-digit code", variant: "destructive" });
      return;
    }
    startReceiving(trimmed);
  };

  const startReceiving = async (joinCode: string) => {
    setStatus("connecting");
    setStatusText("Connecting to sender…");
    setReceivedFiles([]);

    // Destroy any previous receiver peer
    if (receiverPeerRef.current) {
      try { receiverPeerRef.current.destroy(); } catch {}
      receiverPeerRef.current = null;
    }

    try {
      const { Peer } = await import("peerjs");
      const myId = makeReceiverPeerId();
      // Use PeerJS default ICE config — it includes TURN relay for NAT traversal
      const peer = new Peer(myId, { debug: 0 });
      receiverPeerRef.current = peer;

      // Wait for our own peer to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Receiver broker timeout. Please try again.")), 10000);
        peer.on("open", () => { clearTimeout(timeout); resolve(); });
        peer.on("error", (err: any) => {
          clearTimeout(timeout);
          reject(new Error(err.message || "Broker error"));
        });
      });

      // Connect to the sender's fixed ID
      const senderFixedId = makeSenderFixedId(joinCode);
      dcOpenedRef.current = false; // reset for new connection attempt
      const conn = peer.connect(senderFixedId, {
        reliable: true,
        serialization: "raw"  // raw: strings stay as strings, ArrayBuffers as ArrayBuffers
      });

      let fileMeta: { name: string; size: number; mimeType: string } | null = null;
      let receivedChunks: ArrayBuffer[] = [];
      let receivedBytes = 0;
      let startTime = 0;
      const allFiles: { name: string; blob: Blob; size: number }[] = [];

      // Use a ref check (NOT stale React state) to determine if we connected
      const connectionTimeout = setTimeout(() => {
        if (!dcOpenedRef.current) {
          setStatus("error");
          setStatusText("Could not reach sender. Make sure the code is correct and the sender's browser is open.");
          try { conn.close(); } catch {}
        }
      }, 20000);

      conn.on("open", () => {
        dcOpenedRef.current = true; // mark as successfully opened
        clearTimeout(connectionTimeout);
        setStatus("transferring");
        setStatusText("Receiving file…");
        setExpiryTime(null);
        startTime = Date.now();
      });

      conn.on("data", (data: any) => {
        // raw serialization: strings = control messages (JSON), ArrayBuffers = file chunks
        if (typeof data === "string") {
          try {
            const msg = JSON.parse(data);
            if (msg.type === "metadata") {
              fileMeta = msg;
              setActiveFileName(msg.name);
              setActiveFileSize(msg.size);
              receivedChunks = [];
              receivedBytes = 0;
              setProgress(0);
              startTime = Date.now();
            } else if (msg.type === "EOF" && fileMeta) {
              const blob = new Blob(receivedChunks, { type: fileMeta.mimeType });
              const fileEntry = { name: fileMeta.name, blob, size: fileMeta.size };
              allFiles.push(fileEntry);
              setReceivedFiles([...allFiles]);
              setStatus("completed");
              setStatusText("File received!");
              onDone();
              conn.close();
            } else if (msg.type === "cancel") {
              setStatus("error");
              setStatusText("Sender cancelled the transfer.");
            }
          } catch (e) { console.error("Invalid control message", e); }
        } else {
          // Binary chunk data
          const ab: ArrayBuffer = data instanceof ArrayBuffer ? data
            : ArrayBuffer.isView(data) ? (data as any).buffer
            : data;
          receivedChunks.push(ab);
          receivedBytes += ab.byteLength;

          if (fileMeta) {
            const pct = Math.min(100, Math.round((receivedBytes / fileMeta.size) * 100));
            setProgress(pct);

            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 0) {
              const spd = (receivedBytes / (1024 * 1024)) / elapsed;
              setTransferSpeed(Math.round(spd * 10) / 10);
              const remaining = fileMeta.size - receivedBytes;
              setEta(spd > 0 ? Math.ceil(remaining / (spd * 1024 * 1024)) : null);
            }
          }
        }
      });

      conn.on("close", () => {
        clearTimeout(connectionTimeout);
        // Use ref (not stale React state) to check if transfer completed
        if (!dcOpenedRef.current) {
          setStatus("error");
          setStatusText("Connection closed before transfer started. Check the code and try again.");
        }
      });

      conn.on("error", (err: any) => {
        clearTimeout(connectionTimeout);
        setStatus("error");
        setStatusText("Connection error: " + (err?.message || "Unknown error"));
      });

    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setStatusText(e.message || "Failed to connect.");
    }
  };

  const handleCancelReceive = () => {
    setExpiryTime(null);
    if (receiverPeerRef.current) {
      try { receiverPeerRef.current.destroy(); } catch {}
      receiverPeerRef.current = null;
    }
    resetAll();
  };

  const downloadFile = (file: { name: string; blob: Blob }) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const resetAll = () => {
    destroyPeers();
    setFiles([]);
    setCode("");
    setQrUrl("");
    setStatus("idle");
    setStatusText("");
    setProgress(0);
    setTransferSpeed(0);
    setEta(null);
    setInputCode("");
    setReceivedFiles([]);
    setExpiryTime(null);
    setReceiverPeers([]);
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatEta = (secs: number | null) => {
    if (secs === null || secs <= 0) return "--";
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  };

  const formatExpiry = (secs: number | null) => {
    if (secs === null) return "";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `Expires in ${m}:${String(s).padStart(2, "0")}`;
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex rounded-xl bg-muted p-1 border">
        <button
          onClick={() => { resetAll(); setTab("send"); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            tab === "send" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileUp className="h-4 w-4" /> Send File
        </button>
        <button
          onClick={() => { resetAll(); setTab("receive"); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            tab === "receive" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderUp className="h-4 w-4" /> Receive File
        </button>
      </div>

      {/* ── SEND TAB ── */}
      {tab === "send" && (
        <div className="space-y-4">
          {status === "idle" && (
            <>
              <UploadZone
                accept="*"
                multiple
                onFiles={setFiles}
                files={files}
                onRemove={(i) => setFiles((f) => f.filter((_, j) => j !== i))}
                label="Choose files or folders to share"
                sublabel="Any type — images, videos, audio, documents, archives. No size limit."
              />
              {files.length > 0 && (
                <Button className="w-full" size="lg" onClick={handleSend}>
                  <Share2 className="h-4 w-4 mr-2" /> Share {files.length} File{files.length > 1 ? "s" : ""}
                </Button>
              )}
            </>
          )}

          {(status === "preparing") && (
            <div className="flex flex-col items-center p-10 border rounded-2xl bg-muted/20 text-center space-y-4 animate-in fade-in">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-semibold text-muted-foreground">{statusText}</p>
            </div>
          )}

          {(status === "waiting" || status === "active") && (
            <div className="flex flex-col items-center p-8 border rounded-2xl bg-muted/20 text-center space-y-5 animate-in fade-in duration-300">
              {/* Code display */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Share this code</p>
                <h2 className="text-5xl font-extrabold tracking-widest text-primary font-mono select-all">
                  {code.slice(0, 3)} {code.slice(3)}
                </h2>
                {expiryTime !== null && (
                  <p className="text-xs text-rose-500 font-medium animate-pulse">{formatExpiry(expiryTime)}</p>
                )}
              </div>

              {/* QR Code */}
              {qrUrl && (
                <div className="p-3 bg-white border rounded-2xl shadow-sm">
                  <img src={qrUrl} alt="QR code" className="w-36 h-36" />
                </div>
              )}

              {/* Share link */}
              <div className="flex gap-2 w-full max-w-sm">
                <Input
                  readOnly
                  value={`${window.location.origin}/tools/file-sharing?code=${code}`}
                  className="font-mono text-xs text-muted-foreground bg-background"
                />
                <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {/* Connection status */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {receiverPeers.length === 0 ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Waiting for receivers to connect…</span>
                  </>
                ) : (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    {receiverPeers.length} device{receiverPeers.length > 1 ? "s" : ""} connected
                  </span>
                )}
              </div>

              {/* Per-receiver progress */}
              {receiverPeers.length > 0 && (
                <div className="w-full max-w-md border-t pt-4 mt-1 space-y-3 text-left">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Connected Devices</p>
                  {receiverPeers.map((r, i) => (
                    <div key={r.id} className="p-4 border rounded-xl bg-card shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold font-mono text-muted-foreground">
                          Recipient #{i + 1}
                        </span>
                        <Badge variant="outline" className={`text-[10px] font-bold ${
                          r.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          r.status === "transferring" ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" :
                          r.status === "error" ? "bg-rose-50 text-rose-700 border-rose-200" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {r.status.toUpperCase()}
                        </Badge>
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

      {/* ── RECEIVE TAB ── */}
      {tab === "receive" && (
        <div className="space-y-4">
          {status === "idle" && (
            <div className="p-6 border rounded-2xl bg-card shadow-sm space-y-4 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label htmlFor="receive-code">Enter 6-Digit Code</Label>
                <Input
                  id="receive-code"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  className="text-center text-3xl font-bold tracking-widest h-14 font-mono focus-visible:ring-primary"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && inputCode.length === 6 && handleReceiveClick()}
                />
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
              <p className="text-xs text-muted-foreground max-w-xs">Make sure the sender's browser tab is still open with the same code.</p>
              <Button variant="ghost" size="sm" onClick={handleCancelReceive} className="mt-2 text-xs">
                Cancel
              </Button>
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
                  <span>Download progress</span>
                  <span>{progress}%</span>
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
              <Button variant="ghost" size="sm" onClick={handleCancelReceive} className="w-full text-xs text-destructive hover:bg-destructive/10">
                Cancel
              </Button>
            </div>
          )}

          {status === "completed" && receivedFiles.length > 0 && (
            <div className="flex flex-col items-center p-8 border rounded-2xl bg-muted/20 text-center space-y-5 animate-in zoom-in-95 duration-300">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:bg-emerald-900/30">
                <Check className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">File Received!</h3>
              </div>
              <div className="w-full max-w-xs space-y-2">
                {receivedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-xl bg-card shadow-xs gap-2">
                    <div className="text-left min-w-0">
                      <p className="text-xs font-semibold truncate">{f.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatSize(f.size)}</p>
                    </div>
                    <Button size="sm" onClick={() => downloadFile(f)} className="shrink-0 text-xs">
                      <Download className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                  </div>
                ))}
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
              <Button onClick={resetAll} variant="outline" className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Info section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-6 text-xs text-muted-foreground">
        <div className="flex gap-2.5 items-start">
          <Laptop className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-foreground">Peer-to-Peer Transfer</h5>
            <p className="mt-0.5 leading-relaxed">Files flow directly between browsers via WebRTC — nothing is uploaded to any server.</p>
          </div>
        </div>
        <div className="flex gap-2.5 items-start">
          <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-foreground">No File Size Limit</h5>
            <p className="mt-0.5 leading-relaxed">Send HD videos, raw images, bulk folders, or archives of any scale instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
