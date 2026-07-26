import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import fs from "fs";

const app: Express = express();

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
