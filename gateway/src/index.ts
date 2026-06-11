/**
 * EduWallet HTTP gateway entry point.
 *
 * This module starts the Express server and wires together middleware,
 * routes, the EduWallet blockchain client, and the in-memory student
 * session store. Route handlers live in separate modules so this file only
 * contains application setup.
 */

import express from "express";
import cors from "cors";
import { EduWalletClient } from "./eduwalletClient";
import { GATEWAY_PORT } from "./config";
import { createAuthRouter } from "./routes/authRoutes";
import { createPermissionRouter } from "./routes/permissionRoutes";
import { startStudentSessionCleanup } from "./sessions/studentSessionStore";

const app = express();
const PORT = GATEWAY_PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * Single shared instance of the EduWallet blockchain client.
 * All HTTP handlers use this object to talk to the contracts.
 */
const client = new EduWalletClient();

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "eduwallet-gateway" });
});

app.use(createAuthRouter(client));
app.use(createPermissionRouter(client));

startStudentSessionCleanup();

app.listen(PORT, () => {
  console.log(`Gateway running on http://localhost:${PORT}`);
});
