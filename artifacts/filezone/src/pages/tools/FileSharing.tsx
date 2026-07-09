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

// ─── Protocol ────────────────────────────────────────────────────────────────
// All messages are plain JSON objects (serialization:"json") so they work on
// every browser including iOS Safari which delivers binary as Blob not ArrayBuffer.
//
// Message types sent over the DataConnection:
//   { type:"metadata", name, size, mimeType }
//   { type:"chunk",    seq, data }   ← base64-encoded binary chunk
//   { type:"EOF" }
//   { type:"cancel" }

const CHUNK_SIZE = 16 * 1024;   // 16 KB – keeps JSON messages small on mobile
const EXPIRY_SECONDS = 600;     // 10-minute session window

// ICE servers: STUN + multiple TURN fallbacks including TCP/443 for mobile carriers
// (many cellular networks block UDP 3478 — TCP 443 always works like HTTPS)
const ICE_SERVERS: RTCIceServer[] = [
  // Multiple Google STUN for fast candidate gathering
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  // PeerJS official TURN (UDP 3478)
  { urls: "turn:0.peerjs.com:3478", username: "peerjs", credential: "peerjsp" },
  // Open Relay Project TURN — all transport variants for maximum compatibility
  // UDP port 80  (usually open)
  { urls: "turn:openrelay.metered.ca:80",               username: "openrelayproject", credential: "openrelayproject" },
  // TCP port 80  (bypass UDP blocks)
  { urls: "turn:openrelay.metered.ca:80?transport=tcp",  username: "openrelayproject", credential: "openrelayproject" },
  // UDP port 443 (many networks allow 443 UDP)
  { urls: "turn:openrelay.metered.ca:443",               username: "openrelayproject", credential: "openrelayproject" },
  // TCP port 443 (always open — looks like HTTPS, crosses any firewall)
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

const PEER_CONFIG = {
  config: {
    iceServers: ICE_SERVERS,
    iceTransportPolicy: "all" as RTCIceTransportPolicy,
    bundlePolicy: "max-bundle" as RTCBundlePolicy,   // fewer ICE components = faster
    sdpSemantics: "unified-plan",                    // required for iOS Safari
  }
};

function getPeerOptions() {
  const isProd = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
  
  let host = "localhost";
  let port = 8080;
  let path = "/peerjs";
  let secure = false;

  if (isProd) {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    if (apiUrl) {
      try {
        const urlObj = new URL(apiUrl);
        host = urlObj.hostname;
        secure = urlObj.protocol === "https:";
        port = secure ? 443 : 80;
      } catch {
        host = "zone-organizerzip1.onrender.com";
        port = 443;
        secure = true;
      }
    } else {
      host = "zone-organizerzip1.onrender.com";
      port = 443;
      secure = true;
    }
  }

  return {
    host,
    port,
    path,
    secure,
    debug: 1,
    ...PEER_CONFIG
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeSenderFixedId(code: string) { return `fzs${code}`; }
function makeReceiverPeerId() { return `fzr${Math.random().toString(36).slice(2, 10)}`; }

/** ArrayBuffer → base64 string, safe for large buffers */
function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    str += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(str);
}

/** base64 string → ArrayBuffer */
function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReceiverPeer {
  conn: any;
  status: "connecting" | "transferring" | "completed" | "error";
  progress: number;
  speed: number;
  eta: number | null;
  id: string;
}

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
  const senderPeerRef   = useRef<any>(null);
  const receiverPeerRef = useRef<any>(null);
  const finalFileRef    = useRef<File | null>(null);
  const receiversRef    = useRef<Map<string, ReceiverPeer>>(new Map());
  const expiryTimerRef  = useRef<any>(null);
  /** True once the receiver's DataConnection fires "open" — prevents false errors */
  const dcOpenedRef     = useRef(false);

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
  useEffect(() => { return () => { destroyPeers(); }; }, []);

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
  const destroyPeers = () => {
    clearTimeout(expiryTimerRef.current);
    if (senderPeerRef.current) { try { senderPeerRef.current.destroy(); } catch {} senderPeerRef.current = null; }
    if (receiverPeerRef.current) { try { receiverPeerRef.current.destroy(); } catch {} receiverPeerRef.current = null; }
    for (const r of receiversRef.current.values()) { try { r.conn.close(); } catch {} }
    receiversRef.current.clear();
  };

  const syncReceivers = () => setReceiverPeers(Array.from(receiversRef.current.values()));

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

  const handleSend = async (retryCode?: string) => {
    if (!files.length) {
      toast({ title: "Please select files to share", variant: "destructive" }); return;
    }
    setStatus("preparing"); setStatusText("Preparing files…");
    destroyPeers(); receiversRef.current.clear(); setReceiverPeers([]);

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

      // 2. Generate a random 6-digit code (or reuse if retrying)
      const newCode = retryCode || String(Math.floor(Math.random() * 900000) + 100000);
      setCode(newCode);

      // 3. Create PeerJS peer with fixed, code-based ID
      setStatusText("Starting broker…");
      const { Peer } = await import("peerjs");
      const fixedId = makeSenderFixedId(newCode);

      // Use our custom, self-hosted PeerJS signaling server for stable matchmaking
      const peer = new Peer(fixedId, getPeerOptions());
      senderPeerRef.current = peer;

      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("Broker timeout. Try again.")), 12000);
        peer.on("open", () => { clearTimeout(t); resolve(); });
        peer.on("error", (err: any) => {
          clearTimeout(t);
          if (err.type === "unavailable-id") {
            // Code already in use — generate a fresh one and retry once
            const freshCode = String(Math.floor(Math.random() * 900000) + 100000);
            setCode(freshCode);
            reject({ isConflict: true, code: freshCode });
          } else {
            reject(new Error("Broker error: " + (err.message || err.type)));
          }
        });
      });

      // 4. Listen for incoming receiver connections
      peer.on("connection", (conn: any) => {
        const rid = conn.peer;
        const receiver: ReceiverPeer = { conn, status: "connecting", progress: 0, speed: 0, eta: null, id: rid };
        receiversRef.current.set(rid, receiver);
        syncReceivers();

        conn.on("open", () => {
          const r = receiversRef.current.get(rid);
          if (r) { r.status = "transferring"; syncReceivers(); }
          setStatus("active");
          sendFileToPeer(rid, conn, finalFileRef.current!);
        });

        conn.on("data", (data: any) => {
          if (data?.type === "cancel") {
            const r = receiversRef.current.get(rid);
            if (r) { r.status = "error"; syncReceivers(); }
            conn.close();
          }
        });

        conn.on("close", () => {
          const r = receiversRef.current.get(rid);
          if (r && r.status !== "completed") { r.status = "error"; syncReceivers(); }
        });

        conn.on("error", () => {
          const r = receiversRef.current.get(rid);
          if (r) { r.status = "error"; syncReceivers(); }
        });
      });

      // 5. Keep broker session alive — laptops throttle background tabs which can drop the WS
      peer.on("disconnected", () => {
        if (!peer.destroyed && senderPeerRef.current === peer) {
          setTimeout(() => {
            try { peer.reconnect(); } catch {}
          }, 1500);
        }
      });

      // 5. Generate QR code
      const { default: QRCode } = await import("qrcode");
      const shareUrl = `${window.location.origin}/tools/file-sharing?code=${newCode}`;
      const dataUrl = await QRCode.toDataURL(shareUrl, { width: 180, margin: 1 });
      setQrUrl(dataUrl);

      setStatus("waiting"); setStatusText("Waiting for receivers…");
      setExpiryTime(EXPIRY_SECONDS);

    } catch (e: any) {
      if (e?.isConflict) {
        // Silently retry with a new code
        return handleSend(e.code);
      }
      console.error(e);
      setStatus("error");
      setStatusText(e.message || "Failed to start session.");
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  /** Send file to a connected receiver peer using JSON + base64 chunks */
  const sendFileToPeer = (rid: string, conn: any, file: File) => {
    let offset = 0;
    const startTime = Date.now();

    const sendNextChunk = () => {
      const receiver = receiversRef.current.get(rid);
      if (!receiver || receiver.status === "error") return;

      if (offset >= file.size) {
        conn.send({ type: "EOF" });
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
          // Send as base64 JSON — works on every browser including iOS Safari
          conn.send({ type: "chunk", data: bufToB64(buf) });
          offset += buf.byteLength;

          const elapsed = (Date.now() - startTime) / 1000;
          const pct = Math.min(100, Math.round((offset / file.size) * 100));
          let spd = 0, etaVal: number | null = null;
          if (elapsed > 0) {
            spd = Math.round(((offset / (1024 * 1024)) / elapsed) * 10) / 10;
            const rem = file.size - offset;
            etaVal = spd > 0 ? Math.ceil(rem / (spd * 1024 * 1024)) : null;
          }
          const r = receiversRef.current.get(rid);
          if (r) { r.progress = pct; r.speed = spd; r.eta = etaVal; syncReceivers(); }

          // Small yield to prevent blocking the main thread on mobile
          setTimeout(sendNextChunk, 0);
        } catch (err) {
          console.error("Send error:", err);
          const r = receiversRef.current.get(rid);
          if (r) { r.status = "error"; syncReceivers(); }
        }
      };
      reader.readAsArrayBuffer(slice);
    };

    // Send metadata first
    conn.send({ type: "metadata", name: file.name, size: file.size, mimeType: file.type || "application/octet-stream" });
    sendNextChunk();
  };

  const handleCancelSend = async () => {
    setExpiryTime(null); destroyPeers(); resetAll();
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

  const startReceiving = async (joinCode: string, attempt = 1) => {
    const MAX_ATTEMPTS = 3;
    setStatus("connecting");
    setStatusText(attempt > 1 ? `Connecting… (attempt ${attempt}/${MAX_ATTEMPTS})` : "Connecting to sender…");
    setReceivedFiles([]);
    dcOpenedRef.current = false;

    if (receiverPeerRef.current) {
      try { receiverPeerRef.current.destroy(); } catch {}
      receiverPeerRef.current = null;
    }

    try {
      const { Peer } = await import("peerjs");
      const myId = makeReceiverPeerId();

      // Use our custom, self-hosted PeerJS signaling server for stable matchmaking
      const peer = new Peer(myId, getPeerOptions());
      receiverPeerRef.current = peer;

      // Wait for our own peer to register with the broker
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("Could not reach broker. Check your connection.")), 12000);
        peer.on("open", () => { clearTimeout(t); resolve(); });
        peer.on("error", (err: any) => {
          clearTimeout(t);
          reject(new Error(err.message || "Broker error"));
        });
      });

      // Connect to the sender's fixed peer ID
      const senderFixedId = makeSenderFixedId(joinCode);
      const conn = peer.connect(senderFixedId, {
        reliable: true,
        serialization: "json"   // JSON mode: works on ALL browsers incl. iOS Safari
      });

      let fileMeta: { name: string; size: number; mimeType: string } | null = null;
      let receivedChunks: ArrayBuffer[] = [];
      let receivedBytes = 0;
      let startTime = 0;
      const allFiles: { name: string; blob: Blob; size: number }[] = [];

      // Timeout guard — if ICE hasn't connected after 20s, auto-retry before giving up
      const connTimeout = setTimeout(() => {
        if (!dcOpenedRef.current) {
          try { conn.close(); } catch {}
          if (attempt < MAX_ATTEMPTS) {
            // Auto-retry with exponential back-off
            setTimeout(() => startReceiving(joinCode, attempt + 1), 2000);
          } else {
            setStatus("error");
            setRetryCode(joinCode);
            setStatusText(`Connection timed out after ${MAX_ATTEMPTS} attempts. Check the code and make sure the sender's tab is open.`);
          }
        }
      }, 20000);

      // peer-unavailable fires instantly when the sender's peer ID doesn't exist
      peer.on("error", (err: any) => {
        if (err.type === "peer-unavailable") {
          clearTimeout(connTimeout);
          if (!dcOpenedRef.current) {
            if (attempt < MAX_ATTEMPTS) {
              // Sender peer might not be registered yet — retry after a short delay
              setTimeout(() => startReceiving(joinCode, attempt + 1), 2000);
            } else {
              setStatus("error");
              setRetryCode(joinCode);
              setStatusText("Sender not found. Make sure sender's browser is open with the correct code.");
            }
          }
        }
      });

      conn.on("open", () => {
        dcOpenedRef.current = true;   // ← prevents false timeout/close errors
        clearTimeout(connTimeout);
        setStatus("transferring"); setStatusText("Receiving…");
        setExpiryTime(null);
        startTime = Date.now();
      });

      conn.on("data", (msg: any) => {
        if (!msg || typeof msg !== "object") return;

        if (msg.type === "metadata") {
          fileMeta = msg;
          setActiveFileName(msg.name);
          setActiveFileSize(msg.size);
          receivedChunks = []; receivedBytes = 0;
          setProgress(0); startTime = Date.now();

        } else if (msg.type === "chunk" && msg.data) {
          // Decode base64 chunk — works on every browser
          const ab = b64ToBuf(msg.data);
          receivedChunks.push(ab);
          receivedBytes += ab.byteLength;

          if (fileMeta) {
            const pct = Math.min(100, Math.round((receivedBytes / fileMeta.size) * 100));
            setProgress(pct);
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 0) {
              const spd = (receivedBytes / (1024 * 1024)) / elapsed;
              setTransferSpeed(Math.round(spd * 10) / 10);
              const rem = fileMeta.size - receivedBytes;
              setEta(spd > 0 ? Math.ceil(rem / (spd * 1024 * 1024)) : null);
            }
          }

        } else if (msg.type === "EOF" && fileMeta) {
          const blob = new Blob(receivedChunks, { type: fileMeta.mimeType });
          allFiles.push({ name: fileMeta.name, blob, size: fileMeta.size });
          setReceivedFiles([...allFiles]);
          setStatus("completed"); setStatusText("Done!");
          onDone(); conn.close();

        } else if (msg.type === "cancel") {
          setStatus("error"); setStatusText("Sender cancelled the transfer.");
        }
      });

      conn.on("close", () => {
        clearTimeout(connTimeout);
        if (!dcOpenedRef.current) {
          if (attempt < MAX_ATTEMPTS) {
            setTimeout(() => startReceiving(joinCode, attempt + 1), 2000);
          } else {
            setStatus("error");
            setRetryCode(joinCode);
            setStatusText("Connection closed before transfer started. Tap Retry to try again.");
          }
        }
      });

      conn.on("error", (err: any) => {
        clearTimeout(connTimeout);
        if (attempt < MAX_ATTEMPTS) {
          setTimeout(() => startReceiving(joinCode, attempt + 1), 2000);
        } else {
          setStatus("error");
          setRetryCode(joinCode);
          setStatusText("Connection error: " + (err?.message || "Unknown. Tap Retry."));
        }
      });

    } catch (e: any) {
      console.error(e);
      setStatus("error"); setStatusText(e.message || "Failed to connect.");
    }
  };

  const handleCancelReceive = () => {
    setExpiryTime(null);
    if (receiverPeerRef.current) { try { receiverPeerRef.current.destroy(); } catch {} receiverPeerRef.current = null; }
    resetAll();
  };

  // ── File download ────────────────────────────────────────────────────────────
  const downloadFile = (file: { name: string; blob: Blob }) => {
    const url = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetAll = () => {
    destroyPeers();
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
                className="w-full text-xs text-destructive hover:bg-destructive/10">Cancel</Button>
            </div>
          )}

          {status === "completed" && receivedFiles.length > 0 && (
            <div className="flex flex-col items-center p-8 border rounded-2xl bg-muted/20 text-center space-y-5 animate-in zoom-in-95 duration-300">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:bg-emerald-900/30">
                <Check className="h-6 w-6" />
              </div>
              <div><h3 className="font-bold text-lg">File Received!</h3></div>
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
