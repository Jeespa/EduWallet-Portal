# EduWallet Portal

EduWallet Portal is the web interface used by universities, organizations, and external verifiers in the EduWallet prototype. It is separate from the student-facing mobile app and browser extension.

The portal is used to search for students, request access to student records, check academic results, and issue new results when the logged-in organization has the required permission.

## Current scope

The portal currently supports:

- login for seeded university and organization users
- dashboard overview of the current portal session and recent access requests
- student search and student detail cards
- access request creation
- result verification/checking
- result issuance for students where the organization has update access
- frontend terminology that maps to the EduWallet permission model:
  - **View access** = read permission
  - **Update access** = write permission

The portal does not currently implement public organization registration. In the thesis prototype, organizations and users are seeded through the portal backend.

## Tech stack

- Expo
- React Native / React Native Web
- Expo Router
- TypeScript

## Project structure

```text
eduwallet-portal/
  app/
    (auth)/          # login routes
    (dashboard)/     # portal pages after login
    _layout.tsx
    index.tsx
  constants/         # shared frontend constants/theme values
  lib/               # portal API client and helpers
  src/               # reusable portal code
  assets/            # images and static assets
  demo-server.mjs    # static demo server with /api proxy for remote tests
  package.json
```

## Configuration

The portal talks to `portal-backend` through an environment variable.

Create `eduwallet-portal/.env` for normal local development:

```env
EXPO_PUBLIC_PORTAL_BACKEND_BASE_URL=http://localhost:4000
```

When using the remote demo server, the exported portal is configured to call `/api`. The local demo server then proxies `/api` to the portal backend. This makes it possible to share one public portal URL with test users.

## Setup

From `eduwallet-portal/`:

```bash
npm install
```

From the repository root, the same install can be run with:

```bash
npm run deps:portal
```

## Running the portal locally

Start the portal backend first:

```bash
cd ../portal-backend
npm run dev
```

Then start the portal web app:

```bash
cd ../eduwallet-portal
npm run web
```

From the repository root, this can also be started with:

```bash
npm run dev:portal
```

The Expo web server will print the local URL in the terminal.

## Sharing the portal with remote test users

For usability tests where participants open the portal on their own computers, use the static demo server.

The demo server serves the exported portal frontend and proxies API calls from `/api` to the local portal backend. It is not a mock backend. The real `portal-backend` must still be running locally.

First, make sure the full local demo is running:

```bash
npm run hardhat:node
npm run dev:portal-backend
```

Then start the portal demo server from another terminal:

```bash
cd eduwallet-portal
npm run demo:web
```

The demo server normally runs on:

```text
http://localhost:8080
```

Expose that server with ngrok:

```bash
ngrok http 8080
```

Send the ngrok HTTPS URL to portal test users. They should only need that one URL.

By default, the demo server proxies `/api` to:

```text
http://localhost:4000
```

If the portal backend is running somewhere else, set `PORTAL_BACKEND_URL` before starting the demo server:

```cmd
set PORTAL_BACKEND_URL=http://localhost:4000
npm run demo:web
```

## Demo login users

The portal users are created by the portal backend seed script. The most relevant demo users are:

```text
NTNU
  ingrid@ntnu.no / password123

Nordic Hiring AS
  emma@nordichiring.no / password123
```

Other seeded users may exist for role-specific backend testing. For the usability-test flow, Ingrid and Emma are the main accounts.

## Running with the full local demo

The portal is normally used together with:

- a local Hardhat node
- the EduWallet demo bootstrap script
- PostgreSQL
- `portal-backend`

The root `README.md` is the source of truth for the full setup. In short, the local demo requires these steps:

```bash
# terminal 1, from repository root
npm run hardhat:node

# terminal 2, from repository root
npm run demo:bootstrap
npm run portal:prisma:generate
npm run portal:prisma:migrate
npm run portal:seed
npm run dev:portal-backend

# terminal 3, from repository root
npm run dev:portal
```

The bootstrap script writes generated demo-chain environment files. The portal backend also needs a local `.env` file with PostgreSQL and JWT settings. See the root `README.md` for the complete `.env` flow.

## Exporting the web build

To export the portal as a static web build:

```bash
npm run export:web
```

For the remote demo/proxy setup, export the portal so that backend requests go to `/api`:

```bash
npm run export:web:demo
```

To export the portal and start the static demo server in one command:

```bash
npm run demo:web
```

The exported files are written to `dist/`.

## Linting

```bash
npm run lint
```

## Notes and limitations

- The portal is a thesis prototype, not a production identity or organization-registration system.
- Portal users and organizations are seeded locally.
- The portal backend stores portal-side state in PostgreSQL.
- Academic records and permission operations are handled through the EduWallet smart contracts and SDK integration in the backend.
- The portal backend is separate from the student-facing gateway. The gateway is used by student clients, while `portal-backend` supports portal workflows.
- The remote demo server is only a local testing utility. It serves the exported frontend and proxies `/api` to the local portal backend.
