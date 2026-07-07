import { useState, useEffect, useRef } from "react";
import { UploadZone } from "@/components/UploadZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Copy, Check, Share2, ArrowRight, Laptop, Smartphone, FileUp, FolderUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { baseName } from "./ToolHelpers";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" }
  ]
};

const CHUNK_SIZE = 16384; // 16 KB safest buffer size

export function FileSharing({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<"send" | "receive">("send");
  const [files, setFiles] = useState<File[]>([]);
  const [code, setCode] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"idle" | "preparing" | "waiting" | "connecting" | "transferring" | "completed" | "error">("idle");
  const [statusText, setStatusText] = useState("");
  
  // Progress states
  const [progress, setProgress] = useState(0);
  const [transferSpeed, setTransferSpeed] = useState(0); // MB/s
  const [eta, setEta] = useState<number | null>(null); // seconds
  const [activeFileName, setActiveFileName] = useState("");
  const [activeFileSize, setActiveFileSize] = useState(0);

  // Recipient / Receiver states
  const [inputCode, setInputCode] = useState("");
  const [receivedFile, setReceivedFile] = useState<{ name: string; blob: Blob; size: number } | null>(null);

  const { toast } = useToast();

  // Refs for WebRTC
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const signalIntervalRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);
  
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

  const cleanupConnection = () => {
    if (signalIntervalRef.current) clearInterval(signalIntervalRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
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
        // Zip multiple files/folders
        setStatusText("Zipping folder...");
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        for (const file of files) {
          // Keep directory structure if available
          const path = (file as any).webkitRelativePath || file.name;
          zip.file(path, file);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        finalFile = new File([zipBlob], `${baseName(files[0])}_shared.zip`, { type: "application/zip" });
      }

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
      setStatusText("Waiting for recipient to connect...");

      // Initialize RTC Peer Connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(newCode, "sender", { type: "candidate", data: event.candidate });
        }
      };

      // Create RTC Data Channel
      const dc = pc.createDataChannel("file-transfer", { ordered: true });
      dataChannelRef.current = dc;

      dc.onopen = () => {
        setStatus("transferring");
        setStatusText("Transferring files...");
        sendFileData(dc, finalFile);
      };

      dc.onclose = () => {
        if (status !== "completed") {
          setStatus("idle");
          toast({ title: "Receiver disconnected", variant: "destructive" });
        }
      };

      dc.onerror = () => {
        setStatus("error");
        setStatusText("Connection error occurred.");
      };

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(newCode, "sender", { type: "offer", data: offer });

      // Start Polling for Receiver joining & signaling messages
      startSignalingLoop(newCode, "sender");

    } catch (e) {
      console.error(e);
      setStatus("error");
      setStatusText("Failed to initialize session.");
      toast({ title: "Failed to initialize sharing session", variant: "destructive" });
    }
  };

  const sendFileData = (channel: RTCDataChannel, file: File) => {
    let offset = 0;
    const startTime = Date.now();
    const reader = new FileReader();

    // Send metadata first
    channel.send(JSON.stringify({
      type: "metadata",
      name: file.name,
      size: file.size,
      mimeType: file.type
    }));

    const readSlice = () => {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (!buffer) return;

      try {
        channel.send(buffer);
        offset += buffer.byteLength;

        // Calculate progress stats
        const currentProgress = Math.min(100, Math.round((offset / file.size) * 100));
        setProgress(currentProgress);

        const elapsedSeconds = (Date.now() - startTime) / 1000;
        if (elapsedSeconds > 0) {
          const speed = (offset / (1024 * 1024)) / elapsedSeconds; // MB/s
          setTransferSpeed(Math.round(speed * 10) / 10);
          
          const remainingBytes = file.size - offset;
          const remainingSecs = speed > 0 ? (remainingBytes / (speed * 1024 * 1024)) : 0;
          setEta(Math.ceil(remainingSecs));
        }

        if (offset < file.size) {
          // If buffered amount is high, wait until it drains
          if (channel.bufferedAmount > 16 * 1024 * 1024) {
            channel.onbufferedamountlow = () => {
              channel.onbufferedamountlow = null;
              readSlice();
            };
          } else {
            // Otherwise read next slice instantly
            setTimeout(readSlice, 0);
          }
        } else {
          // End of file
          channel.send(JSON.stringify({ type: "EOF" }));
          setStatus("completed");
          setStatusText("Transfer completed successfully!");
          onDone();
          fetch(`/api/transfer/close/${code}`, { method: "POST" });
        }
      } catch (err) {
        console.error("Data channel send error:", err);
        setStatus("error");
        setStatusText("Transfer aborted due to send limits.");
      }
    };

    // Begin reading first chunk
    readSlice();
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

    try {
      // Join connection session on backend
      const joinRes = await fetch(`/api/transfer/join/${joinCode}`, { method: "POST" });
      if (!joinRes.ok) {
        const err = await joinRes.json();
        throw new Error(err.error || "Failed to join session.");
      }

      // Initialize RTC Peer Connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal(joinCode, "receiver", { type: "candidate", data: event.candidate });
        }
      };

      let fileMeta: { name: string; size: number; mimeType: string } | null = null;
      let receivedChunks: ArrayBuffer[] = [];
      let receivedBytes = 0;
      let startTime = 0;

      // Listen for incoming Data Channel
      pc.ondatachannel = (event) => {
        const dc = event.channel;
        dataChannelRef.current = dc;

        dc.onopen = () => {
          setStatus("transferring");
          setStatusText("Receiving files...");
          startTime = Date.now();
        };

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
              fetch(`/api/transfer/close/${joinCode}`, { method: "POST" });
            }
          } else {
            // Handle binary buffer chunk
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
            setStatus("idle");
            toast({ title: "Sender disconnected", variant: "destructive" });
          }
        };
      };

      // Start Polling for SDP Offer & ICE candidates
      startSignalingLoop(joinCode, "receiver");

    } catch (e: any) {
      setStatus("idle");
      toast({ title: e.message || "Failed to join session", variant: "destructive" });
    }
  };

  // --- SIGNALING CORE ---
  const sendSignal = async (sessionCode: string, role: "sender" | "receiver", data: any) => {
    try {
      await fetch(`/api/transfer/signal/${sessionCode}/${role}`, {
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

    signalIntervalRef.current = setInterval(async () => {
      if (polling) return;
      polling = true;

      try {
        const res = await fetch(`/api/transfer/signal/${sessionCode}/${role}`);
        if (res.ok) {
          const { signals } = await res.json();
          for (const signal of signals) {
            const pc = peerConnectionRef.current;
            if (!pc) continue;

            if (signal.type === "offer") {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await sendSignal(sessionCode, "receiver", { type: "answer", data: answer });
            } else if (signal.type === "answer") {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
            } else if (signal.type === "candidate") {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(signal.data));
              } catch (e) {
                console.error("Error adding ice candidate:", e);
              }
            }
          }
        }
      } catch (err) {
        console.error("Signaling receive error", err);
      } finally {
        polling = false;
      }
    }, 1500);

    // If sender, also monitor receiver connection status
    if (role === "sender") {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/transfer/poll-receiver/${sessionCode}`);
          if (res.ok) {
            const { status: s } = await res.json();
            if (s === "connecting" && status === "waiting") {
              setStatus("connecting");
              setStatusText("Connecting to receiver...");
              clearInterval(pollIntervalRef.current);
            }
          }
        } catch {}
      }, 2000);
    }
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

          {(status === "preparing" || status === "waiting" || status === "connecting") && (
            <div className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-muted/20 text-center space-y-5 animate-in fade-in duration-300">
              {status === "waiting" && qrUrl ? (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Share this 6-Digit Code</p>
                    <h2 className="text-4xl font-extrabold tracking-widest text-primary font-mono select-all">
                      {code.slice(0, 3)} {code.slice(3)}
                    </h2>
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

                  <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse mt-4">
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>{statusText}</span>
                  </div>
                </>
              ) : (
                <div className="py-12 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-semibold text-muted-foreground">{statusText}</p>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={resetAll} className="mt-4 text-xs">Cancel Session</Button>
            </div>
          )}

          {status === "transferring" && (
            <div className="p-6 border rounded-2xl bg-card shadow-sm space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="font-semibold text-sm truncate max-w-xs">{activeFileName}</h4>
                  <p className="text-xs text-muted-foreground">{formatSize(activeFileSize)}</p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200">
                  Sending
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span>Transfer progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2.5" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-center border-t pt-4">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Transfer Speed</p>
                  <p className="text-xl font-bold text-primary mt-1">{transferSpeed} MB/s</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">ETA Remaining</p>
                  <p className="text-xl font-bold text-primary mt-1">{formatEta(eta)}</p>
                </div>
              </div>
            </div>
          )}

          {status === "completed" && (
            <div className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-muted/20 text-center space-y-4 animate-in zoom-in-95 duration-300">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:bg-emerald-900/30">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg">Transfer Complete!</h3>
              <p className="text-sm text-muted-foreground max-w-xs">Your file was transferred successfully directly to the other device.</p>
              <Button onClick={resetAll} className="mt-4">Share Another File</Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center justify-center p-8 border rounded-2xl bg-rose-50/10 border-rose-500/20 text-center space-y-4">
              <h3 className="font-bold text-lg text-rose-600 dark:text-rose-400">Connection Failed</h3>
              <p className="text-sm text-muted-foreground max-w-xs">{statusText || "Unable to establish direct peer connection. Make sure both devices are online."}</p>
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
              <Button variant="ghost" size="sm" onClick={resetAll} className="mt-4 text-xs">Cancel Connection</Button>
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
              <p className="text-sm text-muted-foreground max-w-xs">{statusText || "Failed to receive file. Check code correctness and network connection."}</p>
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
