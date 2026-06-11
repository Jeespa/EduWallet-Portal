import { RequestHandler } from "express";
import { verifyAuthToken, type AuthTokenPayload } from "./jwt";

export const requireAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Missing or invalid authorization header.",
    });
  }

  try {
    const token = authHeader.slice("Bearer ".length);
    const payload = verifyAuthToken(token);

    req.auth = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      role: payload.role,
    };

    return next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired token.",
    });
  }
};
