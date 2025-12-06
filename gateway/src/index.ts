import express from "express";
import cors from "cors";
import { EduWalletClient } from "./eduwalletClient";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = new EduWalletClient();

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "eduwallet-gateway" });
});

app.post("/auth/login", async (req, res) => {
  try {
    const { id, password } = req.body || {};

    if (!id || !password) {
      return res.status(400).json({ error: "Missing id or password" });
    }

    const { studentSca, student } = await client.loginStudent(id, password);

    res.json({
      id,
      studentSca,
      student,
    });
  } catch (err: any) {
    console.error("Error in /auth/login:", err);
    const msg = err?.message || String(err);
    if (msg.includes("StudentNotPresent")) {
      return res
        .status(401)
        .json({ error: "Authentication failed. Check your credentials." });
    }
    return res.status(500).json({ error: msg });
  }
});

app.get("/students/:studentSca/permissions", async (req, res) => {
  try {
    const { studentSca } = req.params;

    if (!studentSca) {
      return res.status(400).json({ error: "studentSca is required" });
    }

    const permissions = await client.getStudentPermissions(studentSca);
    res.json(permissions);
  } catch (err) {
    console.error("Failed to get permissions", err);
    res.status(500).json({ error: "Failed to get permissions" });
  }
});

app.post(
  "/students/:studentSca/permissions/revoke",
  async (req, res) => {
    try {
      const { studentSca } = req.params;
      const { id, password } = req.body as {
        id?: string;
        password?: string;
      };

      if (!id || !password) {
        return res
          .status(400)
          .json({ error: "id and password are required to revoke permission" });
      }

      await client.revokePermissionAsStudent(id, password, studentSca);

      // After revoking, return the updated permission status
      const updated = await client.getStudentPermissions(studentSca);
      res.json(updated);
    } catch (err: any) {
      console.error("Failed to revoke permission", err);
      res
        .status(500)
        .json({ error: err?.message || "Failed to revoke permission" });
    }
  }
);

// Generic student endpoint
app.get("/students/:sca/credentials", async (req, res) => {
  try {
    const { sca } = req.params;

    if (!sca) {
      return res.status(400).json({ error: "Missing student SCA address" });
    }

    const student = await client.getStudentWithResults(sca);

    // Optionally: shape the response a bit so clients get a clean structure
    res.json({
      studentAddress: sca,
      student,
    });
  } catch (err) {
    console.error("Error fetching student credentials:", err);
    res.status(500).json({ error: "Failed to fetch credentials" });
  }
});

// Keep /me as a thin wrapper (for now uses env, later will use auth)
app.get("/me/credentials", async (_req, res) => {
  try {
    const studentSCA = process.env.STUDENT_SCA_ADDRESS;
    if (!studentSCA) {
      return res
        .status(500)
        .json({ error: "STUDENT_SCA_ADDRESS not configured" });
    }

    const student = await client.getStudentWithResults(studentSCA);

    res.json({
      studentAddress: studentSCA,
      student,
    });
  } catch (err) {
    console.error("Error fetching student credentials:", err);
    res.status(500).json({ error: "Failed to fetch credentials" });
  }
});

app.get("/students/:sca/permissions", async (req, res) => {
  try {
    const { sca } = req.params;

    if (!sca) {
      return res.status(400).json({ error: "Missing student SCA address" });
    }

    const permission = await client.verifyPermission(sca);

    res.json({
      studentAddress: sca,
      permission, // could be 'Read', 'Write', or null
    });
  } catch (err) {
    console.error("Error verifying permission:", err);
    res.status(500).json({ error: "Failed to verify permission" });
  }
});

// enroll a student in one or more courses
app.post("/students/:sca/enroll", async (req, res) => {
  try {
    const { sca } = req.params;
    const { courses } = req.body;

    if (!sca) {
      return res.status(400).json({ error: "Missing student SCA address" });
    }
    if (!Array.isArray(courses) || courses.length === 0) {
      return res
        .status(400)
        .json({ error: "Body must include non-empty 'courses' array" });
    }

    await client.enrollStudent(sca, courses);

    res.status(201).json({
      status: "enrolled",
      studentAddress: sca,
      coursesCount: courses.length,
    });
  } catch (err: any) {
    console.error("Error enrolling student:", err);
    res.status(500).json({
      error: "Failed to enroll student",
      details: err?.message || String(err),
    });
  }
});

// Record evaluations for a student
app.post("/students/:sca/evaluate", async (req, res) => {
  try {
    const { sca } = req.params;
    const { evaluations } = req.body;

    if (!sca) {
      return res.status(400).json({ error: "Missing student SCA address" });
    }
    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return res
        .status(400)
        .json({ error: "Body must include non-empty 'evaluations' array" });
    }

    await client.evaluateStudent(sca, evaluations);

    res.status(201).json({
      status: "evaluated",
      studentAddress: sca,
      evaluationsCount: evaluations.length,
    });
  } catch (err: any) {
    console.error("Error evaluating student:", err);
    res.status(500).json({
      error: "Failed to evaluate student",
      details: err?.message || String(err),
    });
  }
});


app.listen(PORT, () => {
  console.log(`Gateway running on http://localhost:${PORT}`);
});
