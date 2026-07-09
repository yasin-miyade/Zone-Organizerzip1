import { Router } from "express";

interface TransferSession {
  code: string;
  name: string;
  size: number;
  mimeType: string;
  receiverResponse?: any;
  receiverConnected: boolean;
  uploadedBytes: number;
  createdAt: number;
}

const router = Router();
const sessions = new Map<string, TransferSession>();

// Cleanup expired sessions (older than 15 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [code, session] of sessions.entries()) {
    if (now - session.createdAt > 15 * 60 * 1000) {
      if (session.receiverResponse) {
        try { session.receiverResponse.end(); } catch {}
      }
      sessions.delete(code);
    }
  }
}, 60 * 1000);

// POST /transfer/create — Create transfer session
router.post("/transfer/create", (req, res) => {
  const { name, size, mimeType } = req.body as { name?: string; size?: number; mimeType?: string };
  if (!name || typeof size !== "number" || !mimeType) {
    return res.status(400).json({ error: "Missing file metadata" });
  }

  // Generate 6-digit code
  let code = "";
  for (let i = 0; i < 10; i++) {
    const candidate = String(Math.floor(Math.random() * 900000) + 100000);
    if (!sessions.has(candidate)) {
      code = candidate;
      break;
    }
  }
  if (!code) code = String(Math.floor(Math.random() * 900000) + 100000);

  const session: TransferSession = {
    code,
    name,
    size,
    mimeType,
    receiverConnected: false,
    uploadedBytes: 0,
    createdAt: Date.now()
  };

  sessions.set(code, session);
  res.json({ code });
});

// GET /transfer/:code/status — Check session status (polling)
router.get("/transfer/:code/status", (req, res) => {
  const { code } = req.params;
  const session = sessions.get(code);
  if (!session) return res.status(404).json({ error: "Session not found or expired" });

  res.json({
    receiverConnected: session.receiverConnected,
    uploadedBytes: session.uploadedBytes,
    totalBytes: session.size
  });
});

// GET /transfer/:code/download — Receiver connects to download file stream
router.get("/transfer/:code/download", (req, res) => {
  const { code } = req.params;
  const session = sessions.get(code);
  if (!session) return res.status(404).send("Session not found or expired");

  session.receiverConnected = true;
  session.receiverResponse = res;

  // Set file download headers
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(session.name)}"`);
  res.setHeader("Content-Type", session.mimeType);
  res.setHeader("Content-Length", session.size);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  req.on("close", () => {
    session.receiverConnected = false;
    session.receiverResponse = null;
  });
});

// POST /transfer/:code/upload — Sender streams binary chunk
router.post("/transfer/:code/upload", (req, res) => {
  const { code } = req.params;
  const session = sessions.get(code);
  if (!session) return res.status(404).json({ error: "Session expired or not found" });
  if (!session.receiverResponse) {
    return res.status(400).json({ error: "Receiver not connected" });
  }

  let chunkLength = 0;

  req.on("data", (chunk) => {
    chunkLength += chunk.length;
    session.receiverResponse.write(chunk);
  });

  req.on("end", () => {
    session.uploadedBytes += chunkLength;
    res.json({ success: true, uploadedBytes: session.uploadedBytes });
  });

  req.on("error", (err) => {
    req.log.error({ err }, "Error reading upload stream");
    res.status(500).json({ error: "Upload stream error" });
  });
});

// POST /transfer/:code/end — Sender signals EOF
router.post("/transfer/:code/end", (req, res) => {
  const { code } = req.params;
  const session = sessions.get(code);
  if (session) {
    if (session.receiverResponse) {
      try { session.receiverResponse.end(); } catch {}
    }
    sessions.delete(code);
  }
  res.json({ success: true });
});

// POST /transfer/:code/cancel — Cancel transfer
router.post("/transfer/:code/cancel", (req, res) => {
  const { code } = req.params;
  const session = sessions.get(code);
  if (session) {
    if (session.receiverResponse) {
      try {
        session.receiverResponse.destroy();
      } catch {}
    }
    sessions.delete(code);
  }
  res.json({ success: true });
});

export default router;
