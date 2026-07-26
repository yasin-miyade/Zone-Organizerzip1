import app from "./app";
import { logger } from "./lib/logger";
import { ExpressPeerServer } from "peer";
import { db, siteSettingsTable } from "@workspace/db";

const rawPort = process.env["PORT"];
const port = rawPort ? Number(rawPort) : 8080;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

const peerServer = ExpressPeerServer(server, {
  path: "/"
});

app.use("/peerjs", peerServer);

// Startup check to reset admin password via environment toggle in firewalled database networks
if (process.env.RESET_ADMIN_PASSWORD === "true") {
  if (db) {
    db.insert(siteSettingsTable)
      .values({ key: "admin_password", value: "admin123" })
      .onConflictDoUpdate({
        target: siteSettingsTable.key,
        set: { value: "admin123", updatedAt: new Date() }
      })
      .then(() => {
        logger.info("Admin password has been successfully reset to 'admin123' in the database!");
      })
      .catch((err) => {
        logger.error({ err }, "Failed to reset admin password in database on startup.");
      });
  } else {
    logger.warn("Database connection is offline; skipped admin password reset.");
  }
}

