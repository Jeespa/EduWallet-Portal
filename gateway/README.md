# EduWallet Gateway

Node.js / Express HTTP gateway that sits between the EduWallet smart contracts and the student clients (browser extension and mobile app).

The gateway hides the low-level blockchain details (JSON-RPC, account abstraction, role codes) behind a small REST API and shared TypeScript types.

---

## ✨ Responsibilities

- Authenticate students using **ID + password**.
- Reconstruct the student’s **owner wallet** from credentials (PBKDF2).
- Look up the student’s **smart account** via the `StudentsRegister` contract.
- Read full student data via the EduWallet SDK:
  - personal information,
  - normalised course results (ECTS, grade, certificates),
  - multi-university permission information.
- Execute **permission changes** on chain using ERC-4337 style
  account abstraction:
  - grant read / write permission to a university,
  - revoke an existing permission.
- Expose all of this through a simple HTTP API consumed by:
  - `browser-extension/src/lib/api.ts`,
  - `eduwallet-mobile/app/lib/api.ts`.

---

## 📁 Structure

```bash
gateway/
├── src/
│   ├── AccountAbstraction.ts   # Minimal ERC-4337 userOp helper
│   ├── config.ts               # Environment variable loading
│   ├── eduwalletClient.ts      # Core blockchain/EduWallet logic
│   └── index.ts                # Express app + HTTP routes
└── ...
```

The gateway depends on shared types and a thin HTTP client:

- `shared/apiTypes.ts` – TypeScript definitions for all JSON payloads.
- `shared/clientApi.ts` – small reusable HTTP client used by both
  the extension and the mobile app.

---

## 🌐 HTTP API (summary)

The main endpoints are:

| Method | Path                                        | Purpose                                                                |
| ------ | ------------------------------------------- | ---------------------------------------------------------------------- |
| POST   | `/auth/login`                               | Authenticate student and return `CredentialsResponse`.                 |
| POST   | `/students/:studentSca/permissions`         | Full multi-university view `AllPermissionsForStudent`.                 |
| POST   | `/students/:studentSca/permissions/revoke`  | Revoke this university’s permission on the student’s smart account.    |
| POST   | `/students/:studentSca/permissions/grant`   | Accept a pending read/write request for a university.                  |
| GET    | `/health`                                   | Lightweight health check used in development / monitoring.             |

All endpoints return JSON. Error responses use a common shape:

```json
{
  "error": "Human readable message",
  "details": "Optional extra information"
}
```

---

## ⚙️ Configuration

The gateway reads its configuration from environment variables.

| Name                        | Description                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| `PORT`                      | HTTP port for the gateway (default `3000`).                                |
| `RPC_URL`                   | JSON-RPC URL of the Ethereum node.                                         |
| `STUDENTS_REGISTER_ADDRESS` | Address of the `StudentsRegister` contract.                                |
| `ENTRY_POINT_ADDRESS`       | Address of the ERC-4337 `EntryPoint` contract.                             |
| `PAYMASTER_ADDRESS`         | Address of the paymaster contract used for gas sponsorship.               |
| `CHAIN_ID`                  | Numeric chain ID used for EIP-712 signing.                                 |
| `IPFS_GATEWAY_URL` (opt.)   | HTTP gateway base for certificate URLs (default `https://ipfs.io/ipfs/`).  |

Example `.env`:

```bash
PORT=3000
RPC_URL=http://127.0.0.1:8545
STUDENTS_REGISTER_ADDRESS=0x...
ENTRY_POINT_ADDRESS=0x...
PAYMASTER_ADDRESS=0x...
CHAIN_ID=31337
IPFS_GATEWAY_URL=https://ipfs.io/ipfs/
```

---

## 🚀 Running locally

The gateway expects that:

1. A local Ethereum node is running  
   (for example `npx hardhat node` from the repository root).
2. The EduWallet contracts are deployed and initial data set up  
   (for example using the existing CLI tooling).

Then:

```bash
cd gateway

# install dependencies
npm install

# build TypeScript (if needed)
npm run build   # or the script used in this package.json

# start the HTTP server
npm start       # or: npm run dev
```

The server will start on `http://localhost:3000` (or `PORT`).

Quick health check:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "eduwallet-gateway"
}
```

---

## 🧪 Example calls

Login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"123456","password":"student-password"}'
```

Revoke permission:

```bash
curl -X POST http://localhost:3000/students/0xStudentSmartAccount/permissions/revoke \
  -H "Content-Type: application/json" \
  -d '{
        "id": "123456",
        "password": "student-password",
        "universityAddress": "0xUniversity"
      }'
```

---

## 🔗 Related components

- `shared/apiTypes.ts` – shared TypeScript types for request/response bodies.
- `shared/clientApi.ts` – thin HTTP client used by both frontends.
- `browser-extension/src/lib/api.ts` – browser wrapper around the gateway.
- `eduwallet-mobile/app/lib/api.ts` – mobile wrapper around the gateway.
