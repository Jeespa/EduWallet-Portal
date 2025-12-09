"use strict";
// gateway/src/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * EduWallet HTTP gateway entry point.
 *
 * This module sets up an Express server that exposes a small REST API
 * on top of the EduWallet smart contracts. It delegates all blockchain
 * interactions to `EduWalletClient`, so that browser and mobile clients
 * can use a simple JSON interface instead of embedding the SDK.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const eduwalletClient_1 = require("./eduwalletClient");
const config_1 = require("./config");
const app = (0, express_1.default)();
const PORT = config_1.GATEWAY_PORT || 3000;
// Global middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
/**
 * Single shared instance of the EduWallet blockchain client.
 * All HTTP handlers use this object to talk to the contracts.
 */
const client = new eduwalletClient_1.EduWalletClient();
/**
 * Simple health check endpoint for monitoring and local debugging.
 * Returns a JSON object with a status field and a service identifier.
 */
app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "eduwallet-gateway" });
});
// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
/**
 * POST /auth/login
 *
 * Authenticates a student by ID and password, reconstructs their smart account,
 * and returns a `CredentialsResponse` payload. On success, it also tries to
 * attach a full multi university permissions snapshot as `allPermissions`.
 *
 * Request body:
 *   {
 *     "id": "student-id",
 *     "password": "secret"
 *   }
 *
 * Response body on success:
 *   CredentialsResponse (+ optional allPermissions)
 */
app.post("/auth/login", async (req, res) => {
    try {
        const { id, password } = req.body || {};
        if (!id || !password) {
            return res.status(400).json({ error: "Missing id or password" });
        }
        // First: normal student login
        const payload = await client.loginStudent(id, password);
        // Attach all permissions for this student once at login time.
        // Clients may still refresh this later via /students/:sca/permissions.
        try {
            const allPermissions = await client.getAllPermissionsAsStudent(id, password, payload.studentSca);
            payload.allPermissions = allPermissions;
        }
        catch (permErr) {
            console.error("Failed to load all permissions at login:", permErr);
            // The permissions snapshot is optional. The core login response is still valid.
        }
        res.json(payload);
    }
    catch (err) {
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
// ---------------------------------------------------------------------------
// Permissions: multi university view and student actions
// ---------------------------------------------------------------------------
/**
 * POST /students/:studentSca/permissions
 *
 * Returns a full multi university permissions view for a given student.
 * The gateway reconstructs the student wallet from the provided credentials
 * and queries all role based permission lists via the student smart account.
 *
 * Request params:
 *   :studentSca  Student smart account address
 *
 * Request body:
 *   {
 *     "id": "student-id",
 *     "password": "secret"
 *   }
 *
 * Response body on success:
 *   AllPermissionsForStudent
 */
app.post("/students/:studentSca/permissions", async (req, res) => {
    try {
        const { studentSca } = req.params;
        const { id, password } = (req.body || {});
        if (!studentSca) {
            return res.status(400).json({ error: "studentSca is required" });
        }
        if (!id || !password) {
            return res.status(400).json({ error: "id and password are required" });
        }
        const payload = await client.getAllPermissionsAsStudent(id, password, studentSca);
        res.json(payload);
    }
    catch (err) {
        console.error("Failed to get ALL permissions", err);
        res.status(500).json({
            error: err?.message || "Failed to get complete permission information",
        });
    }
});
/**
 * POST /students/:studentSca/permissions/revoke
 *
 * Revokes a specific university's permission on the student smart account.
 * The gateway acts as the student by reconstructing the owner wallet from
 * ID and password and then submitting an account abstraction user operation.
 *
 * Request params:
 *   :studentSca  Student smart account address
 *
 * Request body:
 *   {
 *     "id": "student-id",
 *     "password": "secret",
 *     "universityAddress": "0x..."
 *   }
 *
 * Response body on success:
 *   { "status": "ok" }
 *
 * Frontends are expected to refresh the full permissions list afterwards.
 */
app.post("/students/:studentSca/permissions/revoke", async (req, res) => {
    try {
        const { studentSca } = req.params;
        const { id, password, universityAddress } = req.body;
        if (!studentSca) {
            return res.status(400).json({ error: "studentSca is required" });
        }
        if (!id || !password) {
            return res
                .status(400)
                .json({ error: "id and password are required to revoke permission" });
        }
        await client.revokePermissionAsStudent(id, password, studentSca, universityAddress);
        // Frontends re-fetch permissions via /students/:sca/permissions, so we just acknowledge.
        res.json({ status: "ok" });
    }
    catch (err) {
        console.error("Failed to revoke permission", err);
        res
            .status(500)
            .json({ error: err?.message || "Failed to revoke permission" });
    }
});
/**
 * POST /students/:studentSca/permissions/grant
 *
 * Accepts a pending permission request or grants a new permission
 * for a university on the student smart account. The gateway acts
 * as the student and submits a `grantPermission` call via account abstraction.
 *
 * Request params:
 *   :studentSca  Student smart account address
 *
 * Request body:
 *   {
 *     "id": "student-id",
 *     "password": "secret",
 *     "type": "read" | "write",
 *     "universityAddress": "0x..."
 *   }
 *
 * Response body on success:
 *   { "status": "ok" }
 *
 * Frontends are expected to refresh the full permissions list afterwards.
 */
app.post("/students/:studentSca/permissions/grant", async (req, res) => {
    try {
        const { studentSca } = req.params;
        const { id, password, type, universityAddress } = req.body;
        if (!studentSca) {
            return res.status(400).json({ error: "studentSca is required" });
        }
        if (!id || !password) {
            return res
                .status(400)
                .json({ error: "id and password are required to grant permission" });
        }
        if (type !== "read" && type !== "write") {
            return res
                .status(400)
                .json({ error: "type must be 'read' or 'write'" });
        }
        await client.grantPermissionAsStudent(id, password, studentSca, type, universityAddress);
        // Frontends re-fetch permissions via /students/:sca/permissions, so we just acknowledge.
        res.json({ status: "ok" });
    }
    catch (err) {
        console.error("Failed to grant permission", err);
        res
            .status(500)
            .json({ error: err?.message || "Failed to grant permission" });
    }
});
/**
 * Starts the HTTP server on the configured port.
 */
app.listen(PORT, () => {
    console.log(`Gateway running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map