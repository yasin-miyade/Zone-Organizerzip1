import app from "./app";
import { logger } from "./lib/logger";

import { ExpressPeerServer } from "peer";

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
