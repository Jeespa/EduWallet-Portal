# EduWallet

## Table of Contents

- [EduWallet](#eduwallet)
  - [Table of Contents](#table-of-contents)
  - [🧭 Overview](#-overview)
  - [📁 Project Structure](#-project-structure)
    - [browser-extension](#browser-extension)
    - [gateway](#gateway)
    - [eduwallet-mobile](#eduwallet-mobile)
    - [shared](#shared)
    - [cli](#cli)
    - [contracts](#contracts)
    - [sdk](#sdk)
    - [hardhat.config.ts](#hardhatconfigts)
    - [package.json](#packagejson)
  - [📦 Installation and Setup Instructions](#-installation-and-setup-instructions)
    - [Initial project setup](#initial-project-setup)
    - [Run a local blockchain and deploy contracts](#run-a-local-blockchain-and-deploy-contracts)
    - [Run the gateway](#run-the-gateway)
    - [Run the browser extension](#run-the-browser-extension)
    - [Run the mobile app](#run-the-mobile-app)

## 🧭 Overview

EduWallet is a blockchain-based academic registry system that allows universities
to issue, and students to manage, their academic records using Ethereum smart
contracts and account abstraction.

In the updated architecture, student-facing clients (browser extension and
mobile app) no longer talk directly to Ethereum JSON–RPC. Instead they use a
shared HTTP gateway, which wraps the original SDK-style logic in a server-side
`EduWalletClient`. A small set of shared TypeScript types and a thin HTTP
client are reused by both clients.

## 📁 Project Structure

    eduwallet/
    ├── browser-extension/      # React + Vite student client (browser extension)
    ├── eduwallet-mobile/       # Expo / React Native mobile app
    ├── gateway/                # Node.js / Express HTTP gateway
    ├── shared/                 # Shared TypeScript types + HTTP client
    ├── cli/                    # CLI tooling (university / admin side)
    ├── contracts/              # Solidity smart contracts
    ├── sdk/                    # Original SDK library (used by CLI / gateway)
    ├── ...
    ├── hardhat.config.ts
    └── package.json

Each project folder contains (or should contain) a README that describes the
corresponding component in more detail.

### browser-extension

React-based web application that serves as the student interface for the
EduWallet system in the browser. It is structured as a modern Chrome/Firefox
extension and talks to the HTTP gateway using the shared client in
`shared/clientApi.ts`.

Main responsibilities:

- Student login via the gateway (`POST /auth/login`).
- Display of wallet information, courses and ECTS.
- Display and management of university permissions, using the multi-university
  permissions view exposed by the gateway.
- Linking to IPFS-hosted course certificates where available.

### gateway

Node.js / Express HTTP gateway that exposes a small REST API to student clients.
It:

- Reconstructs the student’s owner key from ID + password.
- Uses the `EduWalletClient` (from `gateway/src/eduwalletClient.ts`) to talk to
  the smart contracts via account abstraction.
- Returns JSON responses typed by the shared `shared/apiTypes.ts` module.
- Handles errors so that clients receive friendly messages instead of raw
  stack traces. For example, invalid login credentials result in a 401 status
  with a clean JSON error:
  `{ "error": "Authentication failed. Check your credentials." }`.

Main endpoints (documented in detail in the thesis and in `gateway/src/index.ts`):

- `POST /auth/login`
- `POST /students/:studentSca/permissions`
- `POST /students/:studentSca/permissions/revoke`
- `POST /students/:studentSca/permissions/grant`
- `GET  /health`

In this version, the gateway is typically run in development mode:

- Development: `npm run dev` (TypeScript via ts-node or a similar runner).

A more production-like setup would add `build` and `start` scripts to the
gateway’s own `package.json` and run:

- `npm run build` to emit JavaScript into `dist/`.
- `npm start` to serve the compiled code.

### eduwallet-mobile

Expo / React Native implementation of the student client. It mirrors the
extension’s features:

- Login and wallet screen (ECTS total + course list).
- Course detail screen.
- Permissions screen backed by the multi-university permissions view.
- Profile screen with basic student and wallet info.

The app uses:

- The shared HTTP client (`shared/clientApi.ts`).
- The common types from `shared/apiTypes.ts`.

The mobile app is normally run via the Expo development server (see
[Run the mobile app](#run-the-mobile-app)); there is no dedicated `npm run build`
script at the root for producing a native binary.

### shared

Small shared TypeScript library that contains:

- `apiTypes.ts`: common data structures such as `CredentialsResponse`,
  `StudentPayload`, `CourseResult`, `AllPermissionsForStudent`,
  `UniversityPermissionEntry`, etc.
- `clientApi.ts`: a tiny factory (`createGatewayClient`) that wraps the gateway
  REST API and centralises JSON/error handling.

Both the browser extension and the mobile app import from this folder so their
network code stays in sync and consistent with the gateway.

### cli

Command-line interface tool mainly used on the university side to test the SDK
and manage data. It provides functionality for managing academic credentials,
universities and student records (e.g. registering students, issuing course
results).

The CLI uses the same SDK that backs the gateway, but interacts with it
directly via Hardhat rather than via HTTP.

### contracts

Solidity smart contracts that form the blockchain foundation of the EduWallet
system:

- `StudentsRegister`, `Student`, `University`, etc.
- Account abstraction components such as the `EntryPoint` and paymaster
  contracts (as in the original prototype).

Contracts are compiled and tested via Hardhat (see `hardhat.config.ts`).

### sdk

TypeScript library that provides a programmatic API for interacting with the
EduWallet contracts. It abstracts away low-level blockchain details and
implements account abstraction flows.

The gateway embeds this logic through its `EduWalletClient` instead of having
this complexity in the front-end.

The SDK is bundled with `tsup` into both ESM and CJS builds, and emits
TypeScript declaration files for downstream consumers.

### hardhat.config.ts

Configures the Hardhat development environment for the project. Key aspects
include:

- Solidity compiler settings:
  - Solidity version `0.8.28` (latest version fully supported by Hardhat at the
    time of writing).
  - Optimisation enabled with 1,000 runs to reduce bytecode size and keep
    contracts below the 24,576-byte limit.
  - Targets the `cancun` EVM version to make use of recent Ethereum features.

- Network configurations:
  - `hardhat`: in-memory development network with preset test accounts, used
    to deploy smart contracts and act as system administrator.
  - `localhost`: connection to a local Ethereum node
    (`http://127.0.0.1:8545`).

### package.json

The root `package.json` ties the monorepo together. Typical scripts include:

- `deps:sdk` – install dependencies for the SDK package.
- `deps:cli` – install dependencies for the CLI.
- `deps:ext` – install dependencies for the browser extension.
- `deps:gateway` – install dependencies for the gateway.
- `deps:mobile` – install dependencies for the mobile app.
- `dependencies` – convenience script that runs the individual `deps:*`
  scripts. In practice it is safest to:
  1. run `npm install` once at the root, and
  2. then run the `deps:*` scripts.
- `build-sdk` – builds the SDK (ESM + CJS bundles and type declarations).
- `build-cli` – builds the CLI.
- `build` – compiles the smart contracts and then builds the SDK, CLI and
  browser extension. Depending on how the subprojects are configured, the
  gateway and mobile app may still be run primarily in development mode.

There is also a `cli` script that runs the CLI entrypoint via Hardhat on a
local network.

## 📦 Installation and Setup Instructions

Prerequisites:

- Node.js LTS (recommended: Node 20 or Node 22).  
  This project has been validated with Node 22; newer major versions (such as
  Node 24) may cause issues with Hardhat or its dependencies.
- npm (bundled with Node).
- Chrome browser for browser extension.
- A local Ethereum node (Hardhat, Anvil or Ganache). Examples below assume
  Hardhat.
- Optional: a Filebase or other IPFS pinning service account if you want to
  issue and pin new certificates. Existing certificates can be read through any
  public IPFS gateway.

On Windows, all the commands below can be run from `cmd.exe`. You do not need
to enable PowerShell script execution.

### Initial project setup

These steps prepare the whole monorepo for development.

1. Clone the repository

   ```bash
   git clone <this-repo-url>
   cd eduwallet  (or the folder name you cloned into)
   ```

2. Install root-level dependencies

   From the project root:

   ```bash
   npm install
   ```

   or

   ```bash
   npm install deps:root
   ```

   This installs Hardhat, TypeScript tooling and shared top-level dependencies.

3. Install dependencies in all component directories

   From the project root, run the per-folder scripts:

   ```bash
   npm run deps:sdk
   npm run deps:cli
   npm run deps:ext
   npm run deps:gateway
   npm run deps:mobile
   ```

   or

   ```bash
   npm run deps:all
   ```

4. (Optional) Build the core components once

   To ensure the toolchain compiles correctly:

   ```bash
   npm run build
   ```

   This will:

   - Compile the smart contracts via Hardhat.
   - Build the SDK.
   - Build the CLI.
   - Build the browser extension.
   - Build the gateway

### Run a local blockchain and deploy contracts

1. Start a local Hardhat chain from the project root:
   ```bash
   npx hardhat node
   ```
2. In a separate terminal, deploy the contracts using the CLI or dedicated
   deployment scripts (see the documentation in `cli/` and `contracts/`).
   Deployment will print the addresses of:

   - `StudentsRegister`
   - `EntryPoint`
   - The paymaster
   - Any sample universities/students created as part of the deployment

3. Record these addresses; they are used when configuring the gateway.

### Run the gateway

1. Configure the gateway using environment variables (for example in
   `gateway/.env`):
   ```
   PORT=3000
   RPC_URL=http://localhost:8545
   STUDENTS_REGISTER_ADDRESS=0x...
   ENTRY_POINT_ADDRESS=0x...
   PAYMASTER_ADDRESS=0x...
   CHAIN_ID=31337
   ```
2. Install dependencies (if not already done) and start the gateway in
   development mode:
   ```bash
   cd gateway
   npm install
   npm run dev
   ```
   The HTTP API should now be reachable at:
   ```
   http://localhost:3000
   ```
   On authentication failure (e.g. wrong ID/password), the gateway responds
   with a clean JSON error (HTTP 401) so that the mobile app and browser
   extension can show a user-friendly message instead of an internal stack
   trace.

### Run the browser extension

1. Ensure backend components are running:

   - Local blockchain via Hardhat:
     ```
     npx hardhat node
     ```
   - Gateway:
     ```bash
     cd gateway
     npm run dev
     ```

2. Configure the extension’s gateway base URL via environment variable, e.g.
   in `browser-extension/.env`:
   ```
   VITE_GATEWAY_BASE_URL=http://localhost:3000
   ```
3. Build the extension:

   ```bash
   cd browser-extension
   npm install
   npm run build
   ```

   This produces a `dist/` folder with the packaged extension.

4. Load the unpacked extension in your browser:

   - In Chrome: open `chrome://extensions`, enable Developer Mode, click
     “Load unpacked” and select the `dist/` folder.

### Run the mobile app

1. Configure the Expo app to point at the gateway, e.g. in
   `eduwallet-mobile/.env`:
   ```
   EXPO_PUBLIC_GATEWAY_BASE_URL=http://localhost:3000
   ```
2. Install dependencies (if not already done) and start the Expo dev server:
   ```bash
   cd eduwallet-mobile
   npm install
   npm run start
   (or: npx expo start)
   ```
3. Open the app with an Android emulator, an iOS simulator, or a physical
   device using the Expo Go client.

   Note: This app has primarily been tested on Android. iOS support is
   therefore not guaranteed.

---
