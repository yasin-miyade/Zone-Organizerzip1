import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import fs from "fs";
import { defaultTools } from "@workspace/db";

const app: Express = express();

app.locals.memoryTools = [...defaultTools].map((t, i) => ({
  ...t,
  id: i + 1,
  usageCount: t.usageCount ?? 0,
  createdAt: new Date(),
  lastUpdated: new Date()
}));

app.locals.memorySettings = {
  site_title: "5toolbox - Free Online File Tools",
  site_description: "Free browser-based file toolkit — merge PDFs, compress images, convert files, generate QR codes and more.",
  admin_password: "admin123",
  adsense_enabled: "false",
  total_visitors: "0",
  maintenance_mode: "false",
  maintenance_message: "We're performing scheduled maintenance. Back soon!",
  maintenance_paths: ""
};

app.locals.memoryContacts = [
  {
    id: 1,
    name: "John Doe",
    email: "johndoe@example.com",
    subject: "Business partnership inquiry",
    message: "Hello 5toolbox support team,\n\nI run an online file converter platform and would love to discuss potential integration or advertising partnership opportunities with your website. Your tools are extremely fast!\n\nBest regards,\nJohn",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 2)
  },
  {
    id: 2,
    name: "Sarah Smith",
    email: "sarah.smith@outlook.com",
    subject: "Feature request: Excel to PDF converter",
    message: "Hi,\n\nI really like using your PDF merge tool! Do you plan on adding an Excel to PDF converter soon? That would be incredibly helpful for my daily invoicing work.\n\nThank you!",
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 24)
  }
];

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve built static frontend files in production/docker environments
const frontendDistPath = path.join(__dirname, "../../filezone/dist/public");
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get("*any", (req, res, next) => {
    // Let api and peerjs fall through
    if (req.path.startsWith("/api") || req.path.startsWith("/peerjs")) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

export default app;
