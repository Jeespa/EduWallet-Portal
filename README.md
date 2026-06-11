# EduWallet V3.0

EduWallet is a blockchain-based academic credential prototype. It uses Ethereum smart contracts, account abstraction, and off-chain certificate storage to let students control access to their academic records.

This repository contains the original EduWallet blockchain core and SDK, the student-facing gateway from the preparatory work, and the EduWallet Portal developed for the master thesis. The current demo setup is intended for local development and usability testing.

## Repository structure

```text
EduWallet-V3.0/
├── contracts/              # Solidity smart contracts
├── sdk/                    # EduWallet SDK used by university-side tooling
├── cli/                    # Command-line tooling from the original prototype
├── gateway/                # Student-client HTTP API layer
├── shared/                 # Shared API types and HTTP helpers
├── browser-extension/      # Student browser extension
├── eduwallet-mobile/       # Student mobile app built with Expo
├── portal-backend/         # Backend for EduWallet Portal
├── eduwallet-portal/       # EduWallet Portal frontend
├── scripts/                # Local deployment and demo bootstrap scripts
├── docs/                   # Extra notes and development documentation
├── hardhat.config.ts       # Hardhat configuration
└── package.json            # Root scripts for setup, builds and demo commands
```

## Architecture overview

EduWallet has two main backend entry points:

- `gateway` is the student-client API layer. It is used by the mobile app and browser extension. It exposes student login, record retrieval, access overview, and student-approved access changes.
- `portal-backend` is the API layer for EduWallet Portal. It is used by universities, organizations, and external verifiers. It uses the EduWallet SDK/contracts for portal-side actions such as requesting access, verifying records, and issuing results.

The portal backend does not reuse the student gateway. They are separate services with different users and responsibilities.

The student clients are:

- `eduwallet-mobile`, the mobile student client used in the master thesis usability test.
- `browser-extension`, the earlier student browser extension, updated during preparatory work to use the gateway.

The organization-facing client is:

- `eduwallet-portal`, the web portal for universities and organizations.

## Prerequisites

Install the following before running the demo:

- Node.js LTS, preferably Node 20 or Node 22.
- npm.
- Git.
- PostgreSQL for the portal backend database.
- Expo Go on a phone, or an Android/iOS emulator, if testing the mobile app.
- Optional: ngrok for remote mobile tests where the phone is not on the same network as the development machine.

The commands below are written for Windows `cmd.exe`, because the project has mainly been developed and tested on Windows. They can be adapted for macOS/Linux by replacing `copy` with `cp`.

## Fresh installation

Clone the repository and install dependencies:

```cmd
git clone https://github.com/Jeespa/EduWallet-V3.0.git
cd EduWallet-V3.0
npm install
npm run deps:all
```

Build the core packages once:

```cmd
npm run compile
npm run build-sdk
npm run build-cli
npm run build:gateway
npm run build:portal-backend
```

The full root build can also be run with:

```cmd
npm run build
```

The mobile app and portal frontend are normally run through Expo during development, so they do not need a native build for the local demo.

## Running the local demo

The demo uses a local Hardhat blockchain. The bootstrap script deploys the contracts, creates demo organizations and students, and writes local configuration files.

### 1. Start the local blockchain

Open a terminal in the repository root:

```cmd
npm run hardhat:node
```

Keep this terminal running.

### 2. Bootstrap the EduWallet demo chain

Open a second terminal in the repository root:

```cmd
npm run build-sdk
npm run demo:bootstrap
```

The bootstrap script writes:

```text
gateway/.env.demo-chain
portal-backend/.env.demo-chain
portal-backend/src/demo/portalDemoBlockchain.json
```

It also prints the recommended demo students and expected access states.

### 3. Copy generated environment files

Copy the generated gateway configuration:

```cmd
copy gateway\.env.demo-chain gateway\.env
```

Copy the generated portal backend blockchain configuration:

```cmd
copy portal-backend\.env.demo-chain portal-backend\.env
```

The portal backend also needs database and authentication settings. Add these values to `portal-backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eduwallet_portal
JWT_SECRET=dev-secret-change-me
PORT=4000
STUDENT_SOURCE=demo
```

Adjust the `DATABASE_URL` to match your local PostgreSQL setup.

### 4. Prepare the portal backend database

Create the PostgreSQL database if it does not already exist. For example:

```cmd
createdb eduwallet_portal
```

Then run the portal backend database setup:

```cmd
npm run portal:prisma:generate
npm run portal:prisma:migrate
npm run portal:seed
```

The seed script creates demo portal users and clears old portal-side logs. Academic records and access state are read from the EduWallet demo chain and the generated `portalDemoBlockchain.json` file.

### 5. Start the gateway

Open a terminal in the repository root:

```cmd
npm run dev:gateway
```

The gateway normally runs on:

```text
http://localhost:3001
```

### 6. Start the portal backend

Open another terminal in the repository root:

```cmd
npm run dev:portal-backend
```

The portal backend normally runs on:

```text
http://localhost:4000
```

### 7. Start the EduWallet Portal

Open another terminal in the repository root:

```cmd
npm run dev:portal
```

The portal frontend will open through Expo web. It uses `http://localhost:4000` as the default portal backend URL.

### 8. Start the mobile app

Open another terminal in the repository root:

```cmd
npm run dev:mobile
```

Open the QR code in Expo Go, or run it in an emulator.

By default, the mobile app uses the gateway URL configured by `EXPO_PUBLIC_GATEWAY_BASE_URL`. If no value is set, it falls back to a local development URL. For a physical phone, make sure the URL is reachable from the phone.

## Demo portal accounts

The portal seed creates these users with the password `password123`:

```text
ingrid@ntnu.no              NTNU University admin
marius@ntnu.no              NTNU requester
sofie@ntnu.no               NTNU verifier
lars@ntnu.no                NTNU issuer

emma@nordichiring.no        Nordic Hiring admin
oliver@nordichiring.no      Nordic Hiring verifier
```

For usability testing, the recommended portal accounts are:

```text
emma@nordichiring.no / password123
ingrid@ntnu.no / password123
```

## Demo student accounts

Student credentials are generated every time the demo chain is bootstrapped. Do not hard-code old student credentials in the README.

After running:

```cmd
npm run demo:bootstrap
```

open:

```text
portal-backend/src/demo/portalDemoBlockchain.json
```

Use the generated `studentId` and `password` values from that file.

Recommended demo students:

```text
Anna Berg       Nordic Hiring requests view access
Jonas Holm      Nordic Hiring verifies an existing result
Emil Nilsen     NTNU requests update access
Sara Lund       NTNU issues a new result
Nora Solheim    Backup verification student
Maya Eide       Mobile app test student
```

Maya Eide is registered by University of Oslo and is reserved for the mobile app test. The bootstrap script creates a pending NTNU view request for her.

## Remote mobile testing

For local testing on the same Wi-Fi, the normal Expo QR code is usually enough.

For remote testing, use:

```cmd
npm run dev:mobile:tunnel
```

The app itself can then be loaded through Expo tunnel.

The mobile app must still reach the gateway. If the gateway is running locally on your machine, expose it with ngrok:

```cmd
ngrok http 3001
```

Then set the mobile app gateway URL to the ngrok HTTPS URL before starting Expo:

```cmd
set EXPO_PUBLIC_GATEWAY_BASE_URL=https://your-ngrok-url.ngrok-free.app
npm run dev:mobile:tunnel
```

If the portal is tested remotely, expose the portal backend in the same way and set:

```cmd
set EXPO_PUBLIC_PORTAL_BACKEND_BASE_URL=https://your-portal-backend-url.ngrok-free.app
npm run dev:portal
```

## Useful root scripts

```cmd
npm run compile                 # Compile smart contracts
npm run hardhat:node            # Start local Hardhat chain
npm run demo:bootstrap          # Deploy demo chain and generate demo data

npm run deps:all                # Install dependencies in all subprojects
npm run build                   # Build core packages
npm run format                  # Format the repository with Prettier
npm run format:check            # Check formatting

npm run dev:gateway             # Start student gateway
npm run dev:portal-backend      # Start portal backend
npm run dev:portal              # Start EduWallet Portal
npm run dev:mobile              # Start mobile app
npm run dev:mobile:tunnel       # Start mobile app through Expo tunnel

npm run portal:prisma:generate  # Generate Prisma client
npm run portal:prisma:migrate   # Run portal backend migrations
npm run portal:seed             # Seed portal backend demo users
```

## Generated files

The following files are generated during local setup and should not be committed:

```text
gateway/.env
gateway/.env.demo-chain
portal-backend/.env
portal-backend/.env.demo-chain
portal-backend/src/demo/portalDemoBlockchain.json
portal-backend/src/generated/prisma/
```

The generated blockchain files are tied to the current Hardhat chain. If the Hardhat node is restarted, rerun the bootstrap script and copy the new environment values again.

## Notes and limitations

This repository is a research prototype. The local demo is designed for development and usability testing, not production deployment.

Important limitations:

- The local Hardhat blockchain state is temporary.
- Demo private keys and generated credentials are for local testing only.
- The portal registration flow is out of scope. Organizations are seeded as demo accounts.
- The student gateway uses a temporary in-memory session token for mobile access actions.
- The mobile app has mainly been tested with Expo Go on Android.
- The portal backend uses PostgreSQL through Prisma.
- Production deployment would need stronger authentication, secure secret management, HTTPS, persistent blockchain infrastructure, and a reviewed session/signing model.
