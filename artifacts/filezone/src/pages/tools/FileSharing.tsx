import { useState, useEffect, useRef } from "react";
import { UploadZone } from "@/components/UploadZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Copy, Check, Share2, ArrowRight, Laptop, Smartphone, FileUp, FolderUp, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { baseName } from "./ToolHelpers";

// High-reliability public STUN servers for instant connection handshakes
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
  ]
};

const CHUNK_SIZE = 16384; // 16 KB standard buffer size

interface PeerState {
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
  status: "connecting" | "transferring" | "completed" | "error";
  progress: number;
  fileName: string;
  fileSize: number;
  speed: number;
  eta: number | null;
}

export function FileSharing({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<"send" | "receive">("send");
  const [files, setFiles] = useState<File[]>([]);
  const [code, setCode] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Status states
  const [status, setStatus] = useState<"idle" | "preparing" | "waiting" | "active" | "connecting" | "transferring" | "completed" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  
  // Recipient / Receiver states
  const [inputCode, setInputCode] = useState("");
  const [receivedFile, setReceivedFile] = useState<{ name: string; blob: Blob; size: number } | null>(null);
  
  // Single Receiver transfer progress
  const [progress, setProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0); // MB/s
  const [eta, setEta] = useState<number | null>(null); // seconds
  const [activeFileName, setActiveFileName] = useState("");
  const [activeFileSize, setActiveFileSize] = useState(0);

  // Expiration countdown timer (seconds)
  const [expiryTime, setExpiryTime] = useState<number | null>(null);

  // Sender active peers state
  const [activePeers, setActivePeers] = useState<Record<string, {
    id: string;
    status: "connecting" | "transferring" | "completed" | "error";
    progress: number;
    fileName: string;
    fileSize: number;
    speed: number;
    eta: number | null;
  }>>({});

  const { toast } = useToast();

  // Refs for WebRTC & Signaling
  const receiverIdRef = useRef<string>("recv_" + Math.random().toString(36).substring(2, 10));
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const signalIntervalRef = useRef<any>(null);
  
  // Sender multi-peer mapping
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const finalFileRef = useRef<File | null>(null);
  const inputCodeRef = useRef<string>("");

  // Expiration timer logic
  useEffect(() => {
    if (expiryTime === null) return;
    if (expiryTime <= 0) {
      if (tab === "send") handleCancelSend();
      else handleCancelReceive();
      toast({ title: "Session expired", description: "The connection code has expired.", variant: "destructive" });
      return;
    }

    const timer = setTimeout(() => {
      setExpiryTime(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [expiryTime]);

  // Auto-connect on code parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("code");
    if (joinCode) {
      setTab("receive");
      setInputCode(joinCode);
      handleReceive(joinCode);
    }
    return () => {
      cleanupConnection();
    };
  }, []);

  const clearSignaling = () => {
    if (signalIntervalRef.current) {
      clearInterval(signalIntervalRef.current);
      signalIntervalRef.current = null;
    }
  };

  const cleanupConnection = () => {
    clearSignaling();
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const updatePeersState = () => {
    const nextState: any = {};
    for (const [id, peer] of peersRef.current.entries()) {
      nextState[id] = {
        id,
        status: peer.status,
        progress: peer.progress,
        fileName: peer.fileName,
        fileSize: peer.fileSize,
        speed: peer.speed,
        eta: peer.eta
      };
    }
    setActivePeers(nextState);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/tools/file-sharing?code=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied to clipboard!" });
    });
  };

  // --- SENDER FLOW ---
  const handleSend = async () => {
    if (!files.length) {
      toast({ title: "Please select files to share", variant: "destructive" });
      return;
    }

    setStatus("preparing");
    setStatusText("Preparing files...");
    cleanupConnection();

    try {
      let finalFile: File;

      if (files.length === 1) {
        finalFile = files[0];
      } else {
        setStatusText("Zipping folder...");
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        for (const file of files) {
          const path = (file as any).webkitRelativePath || file.name;
          zip.file(path, file);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        finalFile = new File([zipBlob], `${baseName(files[0])}_shared.zip`, { type: "application/zip" });
      }

      finalFileRef.current = finalFile;
      setActiveFileName(finalFile.name);
      setActiveFileSize(finalFile.size);

      // Create Session
      const res = await fetch("/api/transfer/create", { method: "POST" });
      if (!res.ok) throw new Error();
      const { code: newCode } = await res.json();
      setCode(newCode);

      // Generate QR Code
      const { default: QRCode } = await import("qrcode");
      const url = `${window.location.origin}/tools/file-sharing?code=${newCode}`;
      const dataUrl = await QRCode.toDataURL(url, { width: 180, margin: 1 });
      setQrUrl(dataUrl);

      setStatus("waiting");
      setStatusText("Waiting for recipients...");
      setExpiryTime(600); // 10 minute expiration timer

      // Start Polling for incoming Peer SDP Offers & candidate data
      startSignalingLoop(newCode, "sender");

    } catch (e) {
      console.error(e);
      setStatus("error");
      setStatusText("Failed to initialize session.");
      toast({ title: "Failed to initialize sharing session", variant: "destructive" });
    }
  };

  const sendFileToPeer = (receiverId: string, channel: RTCDataChannel, file: File) => {
    let offset = 0;
    const startTime = Date.now();
    const reader = new FileReader();

    // Send metadata header
    channel.send(JSON.stringify({
      type: "metadata",
      name: file.name,
      size: file.size,
      mimeType: file.type
    }));

    const readSlice = () => {
      const peer = peersRef.current.get(receiverId);
      if (!peer || peer.status === "error") return; // Abort if peer errored/closed

      // Backpressure throttle check to prevent looping in the background or getting stuck
      if (channel.bufferedAmount > 1024 * 1024) { 
        setTimeout(readSlice, 50);
        return;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) return;

      try {
        channel.send(buffer);
        offset += buffer.byteLength;

        const currentProgress = Math.min(100, Math.round((offset / file.size) * 100));
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        let speed = 0;
        let etaVal: number | null = null;
        if (elapsedSeconds > 0) {
          speed = Math.round(((offset / (1024 * 1024)) / elapsedSeconds) * 10) / 10;
          const remainingBytes = file.size - offset;
          etaVal = speed > 0 ? Math.ceil(remainingBytes / (speed * 1024 * 1024)) : 0;
        }

        const peer = peersRef.current.get(receiverId);
        if (peer) {
          peer.progress = currentProgress;
          peer.speed = speed;
          peer.eta = etaVal;
          updatePeersState();
        }

        if (offset < file.size) {
          readSlice();
        } else {
          // EOF packet
          channel.send(JSON.stringify({ type: "EOF" }));
          const p = peersRef.current.get(receiverId);
          if (p) {
            p.status = "completed";
            updatePeersState();
          }
          onDone();
        }
      } catch (err) {
        console.error("Data channel send error:", err);
        const peer = peersRef.current.get(receiverId);
        if (peer) {
          peer.status = "error";
          updatePeersState();
        }
      }
    };

    readSlice();
  };

  const handleCancelSend = async () => {
    try {
      await fetch(`/api/transfer/close/${code}`, { method: "POST" });
    } catch {}

    // Close all active peers
    for (const peer of peersRef.current.values()) {
      peer.pc.close();
      if (peer.dc) peer.dc.close();
    }
    peersRef.current.clear();
    setExpiryTime(null);
    setActivePeers({});
    resetAll();
  };

  // --- RECEIVER FLOW ---
  const handleReceiveClick = () => {
    if (!inputCode.trim() || inputCode.length !== 6) {
      toast({ title: "Enter a valid 6-digit code", variant: "destructive" });
      return;
    }
    handleReceive(inputCode.trim());
  };

  const handleReceive = async (joinCode: string) => {
    setStatus("connecting");
    setStatusText("Connecting to sender...");
    cleanupConnection();

    inputCodeRef.current = joinCode;
    receiverIdRef.current = "recv_" + Math.random().toString(36).substring(2, 10);

    try {
      const joinRes = await fetch(`/api/transfer/join/${joinCode}?receiverId=${receiverIdRef.current}`, { method: "POST" });
      if (!joinRes.ok) {
        const err = await joinRes.json();
        throw new Error(err.error || "Failed to join session.");
      }

      setExpiryTime(600); // 10 minute receiver expiry

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      const candidates: any[] = [];
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          candidates.push(event.candidate.toJSON());
        }
      };

      // Create Data Channel
      const dc = pc.createDataChannel("file-transfer", { ordered: true });
      dataChannelRef.current = dc;

      dc.onopen = () => {
        clearSignaling();
        setExpiryTime(null); // Clear timer once transferring
        setStatus("transferring");
        setStatusText("Receiving files...");
        startTime = Date.now();
      };

      let fileMeta: { name: string; size: number; mimeType: string } | null = null;
      let receivedChunks: ArrayBuffer[] = [];
      let receivedBytes = 0;
      let startTime = 0;

      dc.onmessage = (msgEvent) => {
        const data = msgEvent.data;

        if (typeof data === "string") {
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
            const fileBlob = new Blob(receivedChunks, { type: fileMeta.mimeType });
            setReceivedFile({ name: fileMeta.name, blob: fileBlob, size: fileMeta.size });
            setStatus("completed");
            setStatusText("File received successfully!");
            onDone();
            cleanupConnection();
          }
        } else {
          receivedChunks.push(data);
          receivedBytes += data.byteLength;

          if (fileMeta) {
            const currentProgress = Math.min(100, Math.round((receivedBytes / fileMeta.size) * 100));
            setProgress(currentProgress);

            const elapsedSeconds = (Date.now() - startTime) / 1000;
            if (elapsedSeconds > 0) {
              const speed = (receivedBytes / (1024 * 1024)) / elapsedSeconds;
              setTransferSpeed(Math.round(speed * 10) / 10);

              const remainingBytes = fileMeta.size - receivedBytes;
              const remainingSecs = speed > 0 ? (remainingBytes / (speed * 1024 * 1024)) : 0;
              setEta(Math.ceil(remainingSecs));
            }
          }
        }
      };

      dc.onclose = () => {
        if (status !== "completed") {
          setStatus("error");
          setStatusText("Sender disconnected or cancelled.");
        }
      };

      // Create WebRTC Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete/timeout
      await new Promise<void>((resolve) => {
        let resolved = false;
        const checkState = () => {
          if (pc.iceGatheringState === "complete") {
            if (!resolved) { resolve(); resolved = true; }
          }
        };
        pc.onicegatheringstatechange = checkState;
        setTimeout(() => {
          if (!resolved) { resolve(); resolved = true; }
        }, 300);
        checkState();
      });

      // Send Offer + candidates in exactly 1 request (No permission required!)
      await sendSignal(joinCode, "receiver", { 
        type: "offer", 
        data: pc.localDescription, 
        candidates 
      });

      startSignalingLoop(joinCode, "receiver");

    } catch (e: any) {
      setStatus("error");
      setStatusText(e.message || "Failed to connect.");
    }
  };

  const handleCancelReceive = async () => {
    try {
      await fetch(`/api/transfer/close/${inputCode}?receiverId=${receiverIdRef.current}`, { method: "POST" });
    } catch {}
    setExpiryTime(null);
    resetAll();
  };

  // --- SIGNALING CORE ---
  const sendSignal = async (sessionCode: string, role: "sender" | "receiver", data: any, targetReceiverId?: string) => {
    try {
      const rId = targetReceiverId || receiverIdRef.current;
      await fetch(`/api/transfer/signal/${sessionCode}/${role}?receiverId=${rId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error("Signaling send error", err);
    }
  };

  const startSignalingLoop = (sessionCode: string, role: "sender" | "receiver") => {
    let polling = false;

    const pollFunc = async () => {
      if (polling) return;
      polling = true;

      try {
        const url = role === "sender" 
          ? `/api/transfer/signal/${sessionCode}/sender` 
          : `/api/transfer/signal/${sessionCode}/receiver?receiverId=${receiverIdRef.current}`;
        
        const res = await fetch(url);
        if (res.ok) {
          const { signals } = await res.json();
          for (const signal of signals) {
            if (role === "sender") {
              const rId = signal.receiverId;
              if (!rId) continue;

              // Handle connection closing signal from a receiver
              if (signal.type === "close") {
                const peer = peersRef.current.get(rId);
                if (peer) {
                  peer.pc.close();
                  if (peer.dc) peer.dc.close();
                  peersRef.current.delete(rId);
                  updatePeersState();
                }
                continue;
              }

              if (signal.type === "offer") {
                const pc = new RTCPeerConnection(ICE_SERVERS);
                
                const senderCandidates: any[] = [];
                pc.onicecandidate = (event) => {
                  if (event.candidate) {
                    senderCandidates.push(event.candidate.toJSON());
                  }
                };

                pc.ondatachannel = (event) => {
                  const dc = event.channel;
                  const activePeer = peersRef.current.get(rId);
                  if (activePeer) activePeer.dc = dc;

                  dc.onopen = () => {
                    const p = peersRef.current.get(rId);
                    if (p) {
                      p.status = "transferring";
                      updatePeersState();
                      sendFileToPeer(rId, dc, finalFileRef.current!);
                    }
                  };

                  dc.onclose = () => {
                    const p = peersRef.current.get(rId);
                    if (p && p.status !== "completed") {
                      p.status = "error";
                      updatePeersState();
                    }
                  };
                };

                const peer = {
                  pc,
                  status: "connecting" as const,
                  progress: 0,
                  fileName: finalFileRef.current!.name,
                  fileSize: finalFileRef.current!.size,
                  speed: 0,
                  eta: null
                };
                peersRef.current.set(rId, peer);
                setStatus("active");
                updatePeersState();

                // Apply remote offer
                await pc.setRemoteDescription(new RTCSessionDescription(signal.data));

                // Apply receiver candidates
                for (const cand of signal.candidates || []) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                  } catch (e) {
                    console.error("Error adding remote candidate:", e);
                  }
                }

                // Create Answer
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                // Wait for sender's ICE gathering
                await new Promise<void>((resolve) => {
                  let resolved = false;
                  const checkState = () => {
                    if (pc.iceGatheringState === "complete") {
                      if (!resolved) { resolve(); resolved = true; }
                    }
                  };
                  pc.onicegatheringstatechange = checkState;
                  setTimeout(() => {
                    if (!resolved) { resolve(); resolved = true; }
                  }, 300);
                  checkState();
                });

                // Send Answer + candidates back in 1 request
                await sendSignal(sessionCode, "sender", { 
                  type: "answer", 
                  data: pc.localDescription, 
                  candidates: senderCandidates 
                }, rId);
              }

            } else {
              // Receiver side signal processing
              const pc = peerConnectionRef.current;

              if (signal.type === "answer" && pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                
                // Apply sender candidates
                for (const cand of signal.candidates || []) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                  } catch (e) {
                    console.error("Error adding candidate:", e);
                  }
                }
              }
            }
          }
        } else if (res.status === 404 && role === "receiver") {
          // Session expired on backend (Sender cancelled)
          setStatus("error");
          setStatusText("Sender cancelled the session.");
          cleanupConnection();
        }
      } catch (err) {
        console.error("Signaling receive error", err);
      } finally {
        polling = false;
      }
    };

    // Poll immediately, then every 600ms
    pollFunc();
    signalIntervalRef.current = setInterval(pollFunc, 600);
  };

  const downloadReceivedFile = () => {
    if (!receivedFile) return;
    const url = URL.createObjectURL(receivedFile.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = receivedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    cleanupConnection();
    setFiles([]);
    setCode("");
    setQrUrl("");
    setStatus("idle");
    setStatusText("");
    setProgress(0);
    setTransferSpeed(0);
    setEta(null);
    setInputCode("");
    setReceivedFile(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatEta = (seconds: number | null) => {
    if (seconds === null) return "--";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatExpiry = (seconds: number | null) => {
    if (seconds === null) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `Expires in ${m}:${s.toString().padStart(2, "0")}`;
  };

  const peerList = Object.values(activePeers);

  return (
    <div className="space-y-6">
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
                sublabel="Select any image, video, audio, archive, or documents (No file size limits)"
              />
              {files.length > 0 && (
                <Button className="w-full" size="lg" onClick={handleSend}>
                  <Share2 className="h-4 w-4 mr-2" /> Share {files.length} File{files.length > 1 ? "s" : ""}
                </Button>
              )}
            </>
          )}

          {(status === "preparing" || status === "waiting" || status === "active") && (
            <div className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-muted/20 text-center space-y-5 animate-in fade-in duration-300">
              {code && qrUrl ? (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Share this 6-Digit Code</p>
                    <h2 className="text-4xl font-extrabold tracking-widest text-primary font-mono select-all">
                      {code.slice(0, 3)} {code.slice(3)}
                    </h2>
                    {expiryTime !== null && (
                      <p className="text-xs text-rose-500 font-medium animate-pulse">
                        {formatExpiry(expiryTime)}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-white border rounded-2xl shadow-sm">
                    <img src={qrUrl} alt="Scan QR Code to receive" className="w-36 h-36" />
                  </div>

                  <div className="flex gap-2 w-full max-w-sm">
                    <Input readOnly value={`${window.location.origin}/tools/file-sharing?code=${code}`} className="font-mono text-xs text-muted-foreground bg-background" />
                    <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    {peerList.length === 0 ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin text-primary" />
                        <span>{statusText}</span>
                      </>
                    ) : (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        Connected to {peerList.length} device{peerList.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {peerList.length > 0 && (
                    <div className="w-full max-w-md border-t pt-4 mt-2 space-y-3 text-left">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Connected Devices</p>
                      {peerList.map((peer, i) => (
                        <div key={peer.id} className="p-4 border rounded-xl bg-card shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold font-mono text-muted-foreground">Recipient #{i + 1} ({peer.id.slice(5, 9)})</span>
                            <Badge variant="outline" className={`text-[10px] font-bold ${
                              peer.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              peer.status === "transferring" ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse" :
                              peer.status === "error" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-muted text-muted-foreground"
                            }`}>
                              {peer.status.toUpperCase()}
                            </Badge>
                          </div>
                          
                          {peer.status === "transferring" && (
                            <div className="space-y-1.5">
                              <Progress value={peer.progress} className="h-2" />
                              <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                                <span>{peer.progress}% Sent</span>
                                <span>{peer.speed} MB/s | ETA: {formatEta(peer.eta)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-semibold text-muted-foreground">{statusText}</p>
                </div>
              )}
              <Button variant="destructive" size="sm" onClick={handleCancelSend} className="mt-4 text-xs">
                <XCircle className="h-4 w-4 mr-1.5" /> Cancel Session
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-rose-50/10 border-rose-500/20 text-center space-y-4">
              <h3 className="font-bold text-lg text-rose-600 dark:text-rose-400">Connection Failed</h3>
              <p className="text-sm text-muted-foreground max-w-xs">{statusText || "Unable to establish connection."}</p>
              <Button onClick={resetAll} variant="outline" className="mt-4">Try Again</Button>
            </div>
          )}
        </div>
      )}

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
                />
              </div>
              <Button className="w-full" size="lg" onClick={handleReceiveClick} disabled={inputCode.length !== 6}>
                <ArrowRight className="h-4 w-4 mr-2" /> Receive File
              </Button>
            </div>
          )}

          {status === "connecting" && (
            <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-muted/20 text-center space-y-4 animate-in fade-in duration-300">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-semibold text-muted-foreground">{statusText}</p>
              {expiryTime !== null && (
                <p className="text-xs text-rose-500 font-medium animate-pulse mt-1">
                  {formatExpiry(expiryTime)}
                </p>
              )}
              <Button variant="ghost" size="sm" onClick={handleCancelReceive} className="mt-4 text-xs">Cancel Connection</Button>
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
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Download Speed</p>
                  <p className="text-xl font-bold text-primary mt-1">{transferSpeed} MB/s</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">ETA Remaining</p>
                  <p className="text-xl font-bold text-primary mt-1">{formatEta(eta)}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancelReceive} className="w-full text-xs text-destructive hover:bg-destructive/10">
                Cancel
              </Button>
            </div>
          )}

          {status === "completed" && receivedFile && (
            <div className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-muted/20 text-center space-y-5 animate-in zoom-in-95 duration-300">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:bg-emerald-900/30">
                <Check className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">File Received!</h3>
                <p className="text-sm font-semibold truncate max-w-xs">{receivedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(receivedFile.size)}</p>
              </div>
              <Button size="lg" onClick={downloadReceivedFile} className="w-full max-w-xs">
                <Download className="h-4 w-4 mr-2" /> Download File
              </Button>
              <Button variant="ghost" size="sm" onClick={resetAll} className="text-xs text-muted-foreground">Receive another file</Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-rose-50/10 border-rose-500/20 text-center space-y-4">
              <h3 className="font-bold text-lg text-rose-600 dark:text-rose-400">Connection Failed</h3>
              <p className="text-sm text-muted-foreground max-w-xs">{statusText || "Failed to receive file."}</p>
              <Button onClick={resetAll} variant="outline" className="mt-4">Try Again</Button>
            </div>
          )}
        </div>
      )}

      {/* Benefits Card Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-6 text-xs text-muted-foreground">
        <div className="flex gap-2.5 items-start">
          <Laptop className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-foreground">Peer-to-Peer Transfer</h5>
            <p className="mt-0.5 leading-relaxed">Files flow directly between browsers using WebRTC without uploading to any server cloud.</p>
          </div>
        </div>
        <div className="flex gap-2.5 items-start">
          <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h5 className="font-semibold text-foreground">No File Size Limit</h5>
            <p className="mt-0.5 leading-relaxed">Send high-definition videos, raw images, bulk folders, or archives of any scale instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
