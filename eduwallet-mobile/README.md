# EduWallet Mobile App

React Native / Expo application that provides a mobile student
interface to EduWallet. The app talks to the **EduWallet gateway**
instead of the blockchain directly and reuses the shared TypeScript
types and HTTP client.

> **Platform note**  
> The app is built with Expo and React Native and is therefore
> platform-agnostic. It has been **developed and tested on Android**.  
> In principle, the same code can run on iOS (via Expo Go or a standalone
> build) as long as the gateway URL is reachable from the device.  
> This thesis only documents and evaluates the Android setup.

---

## ✨ Features

- Login using **ID + password** via the gateway (`POST /auth/login`).
- Wallet view that shows:
  - student name and basic profile
  - total ECTS balance
  - list of courses with grade, ECTS, degree programme and university
  - links to course certificates (IPFS / HTTP URLs)
- Course details screen with evaluation date and full university info.
- Permissions screen that lets the student:
  - review per-university read/write permissions
  - see pending requests
  - accept read/write requests
  - revoke existing permissions
- Profile screen with personal details and smart account address.
- Shared state via a `StudentContext` so all screens see the same
  logged-in student.

---

## 📁 Structure

    eduwallet-mobile/
    ├── app/
    │   ├── _layout.tsx         # Root layout with StudentProvider + Stack
    │   ├── (tabs)/             # Tabbed main UI (wallet + permissions)
    │   │   ├── _layout.tsx     # Tab bar configuration
    │   │   ├── index.tsx       # Home / wallet screen
    │   │   └── permissions.tsx # Permissions screen
    │   ├── course/
    │   │   ├── _layout.tsx     # Course stack
    │   │   └── [index].tsx     # Course details screen
    │   └── profile.tsx         # Profile screen
    ├── context/
    │   └── StudentContext.tsx  # StudentProvider + useStudent hook
    ├── lib/
    │   └── api.ts              # Gateway HTTP wrapper (uses shared/clientApi.ts)
    └── types/
        └── index.ts            # Re-exports shared/apiTypes.ts for the app

The app uses **Expo Router** for navigation and a dedicated
`StudentContext` to store:

- `id` – student ID
- `sca` – student smart account address
- `data` – full `CredentialsResponse` from the gateway

---

## 🔗 Gateway integration

All HTTP calls go through `app/lib/api.ts`, which in turn uses the
shared HTTP client:

- `shared/clientApi.ts` – common HTTP client used by both frontends
- `shared/apiTypes.ts` – shared TypeScript types for all payloads

The base URL is configured via an Expo env variable:

    // app/lib/api.ts
    export const API_BASE_URL =
      process.env.EXPO_PUBLIC_GATEWAY_BASE_URL ?? "http://localhost:3000";

> **Important**  
> When running the app on a **device** or emulator, `localhost`
> refers to the device itself, not your development machine.  
> You usually need to override this with a LAN/emulator URL.

Examples:

- Android emulator (tested): `http://10.0.2.2:3000`
- iOS simulator (in principle): `http://127.0.0.1:3000`
- Physical device (Android or iOS): `http://<your-laptop-LAN-ip>:3000`

Create a `.env` file in `eduwallet-mobile/`:

    EXPO_PUBLIC_GATEWAY_BASE_URL=http://10.0.2.2:3000

and restart Expo so the new value is picked up.

---

## ✅ Prerequisites

- Node.js (LTS)
- `npm` or `yarn`
- Expo tooling (`npx expo` is fine)
- A running **EduWallet gateway** (see `gateway/README.md`)
- Contracts deployed and test data set up via the CLI

---

## 🚀 Running the app

From the repository root:

    cd eduwallet-mobile

    # install dependencies
    npm install   # or: yarn

    # (optional) configure API base URL in .env
    # EXPO_PUBLIC_GATEWAY_BASE_URL=http://10.0.2.2:3000

    # start Expo
    npx expo start
    # or: npm run start (depending on package.json)

Then, using the Expo CLI:

- press `a` to open the **Android emulator** (this is the tested path),
- or `i` to open the **iOS simulator** (in principle supported, not tested),
- or scan the QR code with the Expo Go app on a physical device (Android or iOS),
  making sure the device can reach the gateway URL over the network.

Once the app and gateway are running, you can:

1. Log in with a test student ID/password set up via the CLI.
2. Browse the wallet (total ECTS + course list).
3. Tap a course to open the course details screen.
4. Open the **Permissions** tab to view and manage university permissions.
5. Open the **Profile** screen for personal details and the smart account.

---

## 🧱 State management

The `StudentProvider` in `context/StudentContext.tsx` wraps the
entire navigation tree. It provides:

- `id`, `sca`, `data` – current student info
- `setStudent(id, sca, data)` – called after successful login
- `clearStudent()` – called on logout

Screens use the `useStudent()` hook to access this state.

---

## 📸 Screenshots

The `figures/` folder contains static screenshots of the app used in
the thesis:

- `Login.jpg`, `Login Filled.jpg`
- `Wallet.jpg`
- `Course Graded.jpg`, `Course Ungraded.jpg`
- `Permissions 1.jpg`, `Permissions 2.jpg`
- `Profile.jpg`

They are not required for running the app, but are useful in
documentation and the thesis.

---

## 🔗 Related components

- `gateway/` – the HTTP gateway that this app talks to
- `browser-extension/` – alternative student client in the browser
- `shared/` – shared types and HTTP client (`apiTypes.ts`,
  `clientApi.ts`) reused across all frontends.
