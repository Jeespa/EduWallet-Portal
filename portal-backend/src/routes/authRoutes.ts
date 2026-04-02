import { Router } from "express";
import { requireAuth } from "../auth/requireAuth";
import { getPortalSession, loginPortalUser } from "../services/authService";

export const authRoutes = Router();

authRoutes.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const result = await loginPortalUser({
      email: String(email),
      password: String(password),
    });

    if ("error" in result) {
      return res.status(result.statusCode).json({
        error: result.error,
      });
    }

    return res.status(result.statusCode).json(result.session);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error.",
    });
  }
});

authRoutes.get("/me", requireAuth, async (req, res) => {
  try {
    if (!req.auth) {
      return res.status(401).json({
        error: "Missing auth context.",
      });
    }

    const result = await getPortalSession({
      userId: req.auth.userId,
      organizationId: req.auth.organizationId,
      role: req.auth.role,
    });

    if ("error" in result) {
      return res.status(result.statusCode).json({
        error: result.error,
      });
    }

    return res.status(result.statusCode).json(result.session);
  } catch (err) {
    return res.status(401).json({
      error: "Invalid or expired token.",
    });
  }
});