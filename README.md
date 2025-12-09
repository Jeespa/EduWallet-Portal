# EduWallet

## Table of Contents

- [EduWallet](#eduwallet)
  - [Table of Contents](#table-of-contents)
  - [🧭 Overview](#overview)
  - [📁 Project Structure](#project-structure)
    - [browser-extension](#browser-extension)
    - [gateway](#gateway)
    - [eduwallet-mobile](#eduwallet-mobile)
    - [shared](#shared)
    - [cli](#cli)
    - [contracts](#contracts)
    - [sdk](#sdk)
    - [hardhat.config.ts](#hardhatconfigts)
    - [package.json](#packagejson)
  - [📦 Installation and Setup Instructions](#installation-and-setup-instructions)
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
shared HTTP **gateway**, which wraps the original SDK-style logic in a
server-side `EduWalletClient`. A small set of shared TypeScript types and a
thin HTTP client are reused by both clients.

## 📁 Project Structure

~~~bash
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
~~~

Each project folder contains (or should contain) a README that describes the
corresponding component in more detail.

### [browser-extension](./browser-extension/)

React-based web application that serves as the student interface for the
EduWallet system in the browser. It is structured as a modern Chrome/Firefox
extension and now talks to the HTTP gateway using the shared client in
`shared/clientApi.ts`.

### [gateway](./gateway/)

Node.js / Express HTTP gateway that exposes a small REST API to student clients.
It:

- Reconstructs the student’s owner key from ID + password.
- Uses the `EduWalletClient` to talk to the smart contracts via account
  abstraction.
- Returns JSON responses typed by the shared `shared/apiTypes.ts` module.

Main endpoints (documented in detail in the thesis and in `gateway/src/index.ts`):

- `POST /auth/login`
- `POST /students/:studentSca/permissions`
- `POST /students/:studentSca/permissions/revoke`
- `POST /students/:studentSca/permissions/grant`
- `GET  /health`

### [eduwallet-mobile](./eduwallet-mobile/)

Expo / React Native implementation of the student client. It mirrors the
extension’s features:

- Login and wallet screen (ECTS total + course list).
- Course detail screen.
- Permissions screen backed by the multi-university permissions view.
- Profile screen with basic student and wallet info.

The app also uses the shared HTTP client (`shared/clientApi.ts`) and the common
types from `shared/apiTypes.ts`.

### [shared](./shared/)

Small shared TypeScript library that contains:

- `apiTypes.ts`: common data structures such as `CredentialsResponse`,
  `StudentPayload`, `CourseResult`, `AllPermissionsForStudent`, etc.
- `clientApi.ts`: a tiny factory (`createGatewayClient`) that wraps the gateway
  REST API and centralises JSON/error handling.

Both the browser extension and the mobile app import from this folder so their
network code stays in sync.

### [cli](./cli/)

Command-line interface tool mainly used on the **university side** to test the
SDK. It provides functionality for managing academic credentials, universities
and student records (e.g. registering students, issuing course results).

### [contracts](./contracts/)

Solidity smart contracts that form the blockchain foundation of the EduWallet
system:

- `StudentsRegister`, `Student`, `University`, etc.
- Account abstraction components such as the `EntryPoint` and paymaster
  contracts (as in the original prototype).

### [sdk](./sdk/)

TypeScript library that provides a programmatic API for interacting with the
EduWallet contracts. It abstracts away low-level blockchain details and
implements account abstraction flows. The gateway embeds this logic through its
`EduWalletClient` instead of having this complexity in the front-end.

### [hardhat.config.ts](./hardhat.config.ts)

Configures the [Hardhat](https://hardhat.org/) development environment for the
project. Key aspects include:

- **Solidity compiler settings**
  - Solidity version `0.8.28` (latest version fully supported by Hardhat).
  - Optimisation enabled with `1,000` runs to reduce bytecode size and keep
    contracts below the 24,576-byte limit.
  - Targets the `cancun` EVM version for latest Ethereum features.

- **Network configurations**
  - `hardhat`: in-memory development network with one preset test account, used
    to deploy smart contracts and act as system administrator.
  - `localhost`: connection to a local Ethereum node
    (`http://127.0.0.1:8545`).

### [package.json](./package.json)

**Key scripts** (may be extended in this fork):

- `build`: Compiles smart contracts and builds all components.
- `dependencies`: Installs dependencies across all project components.
- `build-sdk`: Builds the SDK component.
- `build-cli`: Builds the CLI component.
- `cli`: Runs the CLI via Hardhat on a local network.

(Additional scripts for the `gateway` and `eduwallet-mobile` live in their
respective `package.json` files.)

## 📦 Installation and Setup Instructions

✅ **Prerequisites:**

- [Node.js](https://nodejs.org) installed on your system.
- [Chrome](https://www.google.com/chrome) or Firefox browser installed.
- A local Ethereum node (Hardhat, Anvil or Ganache). Examples below assume
  Hardhat.
- Optional: a [Filebase](https://filebase.com) or other IPFS pinning service
  account if you want to issue and pin new certificates. Existing certificates
  can be read through any public IPFS gateway.

### Run a local blockchain and deploy contracts

1. Start a local chain from the project root:

   ~~~bash
   npx hardhat node
   ~~~

2. In a separate terminal, deploy the contracts using the CLI or deployment
   scripts (see `cli/` and `contracts/` documentation). This will print the
   addresses of `StudentsRegister`, `EntryPoint`, the paymaster and any sample
   universities/students.

3. Record these addresses; they are used when configuring the gateway.

### Run the gateway

1. Configure the gateway using environment variables (for example in
   `gateway/.env`):

   ~~~bash
   PORT=3000
   RPC_URL=http://localhost:8545
   STUDENTS_REGISTER_ADDRESS=0x...
   ENTRY_POINT_ADDRESS=0x...
   PAYMASTER_ADDRESS=0x...
   CHAIN_ID=31337
   ~~~

2. Install dependencies and start the gateway:

   ~~~bash
   cd gateway
   npm install
   npm run dev    # or `npm start`, depending on your setup
   ~~~

   The HTTP API should now be reachable at `http://localhost:3000`.

### Run the browser extension

1. From the project root, install shared dependencies:

   ~~~bash
   npm run dependencies
   npm run build        # optional, builds all components
   ~~~

2. Configure the extension’s gateway base URL via environment variable, e.g. in
   `browser-extension/.env`:

   ~~~bash
   VITE_GATEWAY_BASE_URL=http://localhost:3000
   ~~~

3. Build the extension:

   ~~~bash
   cd browser-extension
   npm install
   npm run build
   ~~~

4. Follow the official guide to **load an unpacked extension** in Chrome or
   Firefox. The extension directory corresponds to the `dist` folder produced
   in `browser-extension/`.

### Run the mobile app

1. Configure the Expo app to point at the gateway, e.g. in
   `eduwallet-mobile/.env`:

   ~~~bash
   EXPO_PUBLIC_GATEWAY_BASE_URL=http://localhost:3000
   ~~~

2. Install dependencies and start the Expo dev server:

   ~~~bash
   cd eduwallet-mobile
   npm install
   npx expo start
   ~~~

3. Open the app with an Android emulator, iOS simulator, or a physical device
   using the Expo Go client.

---

For more detailed, step-by-step instructions (including how to register
universities and students via the CLI, and how to issue new course
certificates), see the individual READMEs in each subdirectory and the
accompanying thesis.
