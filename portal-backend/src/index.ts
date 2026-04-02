import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/authRoutes";
import { studentRoutes } from "./routes/studentRoutes";
import { requestRoutes } from "./routes/requestRoutes";
import { verificationRoutes } from "./routes/verificationRoutes";
import { issuanceRoutes } from "./routes/issuanceRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "portal-backend",
  });
});

app.get("/debug/config", (_req, res) => {
  res.json({
    studentSource: process.env.STUDENT_SOURCE ?? "mock",
    port: process.env.PORT ?? "4000",
  });
});

app.use("/auth", authRoutes);
app.use("/students", studentRoutes);
app.use("/requests", requestRoutes);
app.use("/verifications", verificationRoutes);
app.use("/issue", issuanceRoutes);

const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  console.log(`portal-backend listening on http://localhost:${port}`);
});