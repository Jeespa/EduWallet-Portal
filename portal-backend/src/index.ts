import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/authRoutes";
import { studentRoutes } from "./routes/studentRoutes";
import { requestRoutes } from "./routes/requestRoutes";
import { verificationRoutes } from "./routes/verificationRoutes";
import { issuanceRoutes } from "./routes/issuanceRoutes";

const app = express();
const port = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === "production";

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "portal-backend",
  });
});

// Local development helper. Do not expose runtime configuration in production.
if (!isProduction) {
  app.get("/debug/config", (_req, res) => {
    res.json({
      studentSource: process.env.STUDENT_SOURCE ?? "demo",
      port: String(port),
    });
  });
}

app.use("/auth", authRoutes);
app.use("/students", studentRoutes);
app.use("/requests", requestRoutes);
app.use("/verifications", verificationRoutes);
app.use("/issue", issuanceRoutes);

app.listen(port, () => {
  console.log(`portal-backend listening on http://localhost:${port}`);
});
