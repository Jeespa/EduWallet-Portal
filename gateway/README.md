# EduWallet Gateway

The EduWallet Gateway is a Node.js and Express service for the student-facing EduWallet clients.
It sits between the browser extension/mobile app and the EduWallet smart contracts.

The gateway hides blockchain-specific details such as JSON-RPC calls, contract ABIs,
role codes, and account-abstraction operations behind a small HTTP API. The browser
extension and mobile app can therefore treat EduWallet as a normal web service.

The gateway is separate from the EduWallet Portal backend. The gateway is for student
clients. The Portal backend is for organization users in the EduWallet Portal.

---

## Responsibilities

The gateway is responsible for:

- authenticating students with their EduWallet student ID and password,
- deriving the student owner wallet from those credentials,
- looking up the student's smart account through the `StudentsRegister` contract,
- reading the student's academic records from the blockchain,
- aggregating View/Update access across organizations,
- submitting grant/revoke permission operations through account abstraction,
- returning JSON payloads based on the shared TypeScript types in `shared/`.

In the current prototype, login also creates a temporary in-memory gateway session.
The mobile app uses this session token to refresh access information and approve or
remove access without asking the student to re-enter the password each time.

This session mechanism is intended for the local thesis prototype. It should be replaced
with a stronger authentication or delegated-signing model in a production system.

---

## Project structure

```text
gateway/
├── src/
│   ├── auth/
│   │   └── studentWallet.ts          # Student key derivation and wallet reconstruction
│   ├── blockchain/
│   │   └── provider.ts               # JSON-RPC provider setup
│   ├── contracts/
│   │   └── studentContractAbis.ts    # Student ABI fragments and permission role codes
│   ├── errors/
│   │   ├── InvalidCredentialsError.ts
│   │   └── index.ts
│   ├── routes/
│   │   ├── authRoutes.ts             # /auth/login
│   │   └── permissionRoutes.ts       # Permission read/grant/revoke endpoints
│   ├── services/
│   │   ├── permissionService.ts
│   │   ├── studentReader.ts
│   │   └── universityMetadataService.ts
│   ├── sessions/
│   │   └── studentSessionStore.ts    # Temporary in-memory student sessions
│   ├── utils/
│   │   └── formatters.ts
│   ├── AccountAbstraction.ts
│   ├── config.ts
│   ├── eduwalletClient.ts            # High-level orchestration class
│   ├── index.ts                      # Express app setup
│   └── types.ts
├── package.json
└── tsconfig.json
```

`eduwalletClient.ts` is intentionally kept as a high-level orchestration class.
The lower-level blockchain reads, permission operations, formatting, and session
handling are split into separate modules.

---

## Configuration

The gateway reads configuration from environment variables. In the local demo,
`scripts/bootstrapPortalDemo.ts` generates a `.env.demo-chain` file with the
contract addresses needed by the gateway.

Required variables:

| Variable                    | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `RPC_URL`                   | JSON-RPC URL for the local Ethereum node.               |
| `STUDENTS_REGISTER_ADDRESS` | Address of the deployed `StudentsRegister` contract.    |
| `ENTRY_POINT_ADDRESS`       | Address of the deployed ERC-4337 `EntryPoint` contract. |
| `PAYMASTER_ADDRESS`         | Address of the deployed Paymaster contract.             |

Optional variables:

| Variable   | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| `PORT`     | HTTP port. Defaults to `3000`.                               |
| `CHAIN_ID` | Chain ID. Defaults to `31337` for local Hardhat development. |

Example `.env`:

```env
PORT=3000
RPC_URL=http://127.0.0.1:8545
STUDENTS_REGISTER_ADDRESS=0x...
ENTRY_POINT_ADDRESS=0x...
PAYMASTER_ADDRESS=0x...
CHAIN_ID=31337
```

For the generated demo setup, copy or rename the generated file:

```cmd
copy .env.demo-chain .env
```

---

## Installation

From the gateway folder:

```cmd
npm install
```

Or from the repository root:

```cmd
npm run deps:gateway
```

---

## Running the gateway

Start a local Hardhat chain from the repository root:

```cmd
npm run hardhat:node
```

In a second terminal, deploy the local demo contracts and data:

```cmd
npm run demo:bootstrap
```

Then start the gateway:

```cmd
cd gateway
copy .env.demo-chain .env
npm run dev
```

The gateway should be available at:

```text
http://localhost:3000
```

Health check:

```cmd
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "eduwallet-gateway"
}
```

To build and run the compiled version:

```cmd
npm run build
npm start
```

---

## HTTP API summary

### Health

| Method | Path      | Description                            |
| ------ | --------- | -------------------------------------- |
| `GET`  | `/health` | Checks whether the gateway is running. |

### Authentication

| Method | Path          | Description                                                                                     |
| ------ | ------------- | ----------------------------------------------------------------------------------------------- |
| `POST` | `/auth/login` | Logs in a student and returns wallet data, current access state, and a temporary session token. |

Request body:

```json
{
  "id": "student-id",
  "password": "student-password"
}
```

Successful response:

```json
{
  "id": "student-id",
  "studentSca": "0x...",
  "student": {
    "name": "Maya",
    "surname": "Eide",
    "results": []
  },
  "allPermissions": {
    "studentSca": "0x...",
    "permissions": []
  },
  "sessionToken": "temporary-token",
  "sessionExpiresAt": "2026-01-01T12:00:00.000Z"
}
```

### Permission/access endpoints

| Method | Path                                       | Used by                           | Description                                                                |
| ------ | ------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------- |
| `GET`  | `/students/:studentSca/permissions`        | Mobile app                        | Returns the full access view using `Authorization: Bearer <sessionToken>`. |
| `POST` | `/students/:studentSca/permissions`        | Browser extension / compatibility | Returns the full access view using either ID/password or a session token.  |
| `POST` | `/students/:studentSca/permissions/grant`  | Student clients                   | Grants View or Update access to an organization.                           |
| `POST` | `/students/:studentSca/permissions/revoke` | Student clients                   | Removes an organization's access.                                          |

For session-based calls, use:

```http
Authorization: Bearer <sessionToken>
```

For password-based compatibility calls, include the student credentials in the body.

Grant request body:

```json
{
  "type": "read",
  "universityAddress": "0x..."
}
```

or:

```json
{
  "type": "write",
  "universityAddress": "0x..."
}
```

Revoke request body:

```json
{
  "universityAddress": "0x..."
}
```

Internally, `read` corresponds to View access and `write` corresponds to Update access.

---

## Example calls

Login:

```cmd
curl -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"id\":\"student-id\",\"password\":\"student-password\"}"
```

Get access state with a session token:

```cmd
curl http://localhost:3000/students/0xStudentSmartAccount/permissions ^
  -H "Authorization: Bearer temporary-token"
```

Approve a View access request:

```cmd
curl -X POST http://localhost:3000/students/0xStudentSmartAccount/permissions/grant ^
  -H "Authorization: Bearer temporary-token" ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"read\",\"universityAddress\":\"0xUniversitySmartAccount\"}"
```

Remove access:

```cmd
curl -X POST http://localhost:3000/students/0xStudentSmartAccount/permissions/revoke ^
  -H "Authorization: Bearer temporary-token" ^
  -H "Content-Type: application/json" ^
  -d "{\"universityAddress\":\"0xUniversitySmartAccount\"}"
```

---

## Error responses

Gateway errors use a simple JSON shape:

```json
{
  "error": "Human-readable message"
}
```

Invalid login credentials return HTTP `401`.

Missing fields return HTTP `400`.

Unexpected gateway or blockchain failures return HTTP `500`.

---

## Related components

- `shared/apiTypes.ts` defines the shared JSON response and request types.
- `shared/clientApi.ts` contains the shared HTTP client used by student clients.
- `browser-extension/` is the browser-based student client.
- `eduwallet-mobile/` is the mobile student client.
- `portal-backend/` is the separate backend for EduWallet Portal organization users.
- `scripts/bootstrapPortalDemo.ts` creates the local demo chain state and generated environment files.

---

## Prototype limitations

- Student sessions are stored in memory and expire automatically.
- The session store is lost when the gateway restarts.
- The gateway is designed for local prototype/demo use.
- The gateway should not be exposed as a production service without stronger authentication, transport security, logging controls, and a production session/signing model.
