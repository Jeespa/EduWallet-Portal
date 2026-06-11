# EduWallet Portal Demo Flow

This document describes the manual demo flows for EduWallet Portal and the mobile app.

It assumes that the setup in the root `README.md` has already been completed. Use the root README for installation, environment files, database setup, service startup, and generated demo data.

## Required running services

Keep these services running while testing the flows:

```text
Hardhat local blockchain        npm run hardhat:node
gateway                         npm run dev:gateway
portal-backend                  npm run dev:portal-backend
EduWallet Portal                npm run dev:portal
mobile app, if testing approval npm run dev:mobile
```

The expected local URLs are:

```text
gateway:        http://localhost:3001
portal-backend: http://localhost:4000
portal:         shown by Expo web
mobile app:     shown by Expo
```

## Important generated demo data

The generated blockchain demo data is stored in:

```text
portal-backend\src\demo\portalDemoBlockchain.json
```

Use this file to find generated student credentials and blockchain addresses. The values change every time the demo chain is bootstrapped.

The most useful generated values are:

```text
studentId
password
student smart account address
organization contract addresses
organization smart account addresses
```

## Access terminology

The portal uses user-facing access terms:

```text
View access   = read permission
Update access = write permission
```

A student approves or rejects access requests in the mobile app.

## Nordic Hiring flow

Goal:

```text
Nordic Hiring logs in
→ requests View access for a student
→ verifies an existing result for a student it can already view
```

Use:

```text
Email: emma@nordichiring.no
Password: password123
```

Recommended tasks:

```text
Request View access for Anna Berg.
Verify Jonas Holm's existing result.
```

Expected result:

```text
The access request is created and shown in the portal request list.
The verification flow succeeds for a student Nordic Hiring can already view.
```

## NTNU flow

Goal:

```text
NTNU logs in
→ requests Update access for a student
→ issues a new result to a student where Update access already exists
```

Use:

```text
Email: ingrid@ntnu.no
Password: password123
```

Recommended tasks:

```text
Request Update access for Emil Nilsen.
Issue a new result to Sara Lund.
```

Example result values:

```text
Course code: TEST1001
Course name: Programming
Programme: Computer Science
ECTS: 5
Grade: B
Evaluation date: 2026-05-05
```

Expected result:

```text
The update access request is created and shown in the portal request list.
The new result is written through the EduWallet SDK/contracts.
The result can be seen when the student data is loaded again.
```

## Mobile approval flow

Goal:

```text
Maya Eide logs in to the mobile app
→ sees the pending NTNU View access request
→ approves the request
→ can later remove the granted access
```

Maya's credentials are generated during bootstrap. Find them in:

```text
portal-backend\src\demo\portalDemoBlockchain.json
```

Expected result:

```text
The pending NTNU request is visible in the mobile Access screen.
Approving it grants View access to NTNU.
Removing it revokes NTNU's access again.
```

## Restarting the local demo

The local Hardhat blockchain state is temporary. If the Hardhat node is stopped, the blockchain state is lost.

When restarting from scratch:

1. Start the Hardhat node.
2. Rerun `npm run demo:bootstrap`.
3. Copy `gateway/.env.demo-chain` to `gateway/.env`.
4. Recreate `portal-backend/.env` from `.env.example`.
5. Fill in the database/authentication values.
6. Append the new `portal-backend/.env.demo-chain` values.
7. Rerun the portal backend database setup and seed commands.
8. Restart gateway, portal backend, portal, and mobile app.

Do not commit generated local secret/demo files:

```text
portal-backend\.env
portal-backend\.env.demo-chain
portal-backend\src\demo\portalDemoBlockchain.json
gateway\.env
gateway\.env.demo-chain
```

These files contain local private keys and generated student credentials.
