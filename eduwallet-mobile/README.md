# EduWallet Mobile App

React Native / Expo application that provides a mobile student
interface to EduWallet. The app talks to the **EduWallet gateway**
instead of the blockchain directly and reuses the shared TypeScript
types and HTTP client.

---

## ✨ Features

- Login using **ID + password** via the gateway (`POST /auth/login`).
- Wallet view that shows:
  - student name and basic profile,
  - total ECTS balance,
  - list of courses with grade, ECTS, degree programme and university,
  - links to course certificates (IPFS / HTTP URLs).
- Course details screen with evaluation date and full university info.
- Permissions screen that lets the student:
  - review per-university read/write permissions,
  - see pending requests,
  - accept read/write requests,
  - revoke existing permissions.
- Profile screen with personal details and smart account address.
- Shared state via a `StudentContext` so all screens see the same
  logged-in student.

---

## 📁 Structure

```bash
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
```

The app uses **Expo Router** for navigation and a dedicated
`StudentContext` to store:

- `id` – student ID,
- `sca` – student smart account address,
- `data` – full `CredentialsResponse` from the gateway.

---

## 🔗 Gateway integration

All HTTP calls go through `app/lib/api.ts`, which in turn uses the
shared HTTP client:

- `shared/clientApi.ts` – common HTTP client used by both frontends.
- `shared/apiTypes.ts` – shared TypeScript types for all payloads.

The base URL is configured via an Expo env variable:

```ts
// app/lib/api.ts
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_GATEWAY_BASE_URL ?? "http://localhost:3000";
```

> **Important**  
> When running the app on a **device** or emulator, `localhost`
> refers to the device itself, not your development machine.  
> You usually need to override this with a LAN/emulator URL.

Examples:

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://127.0.0.1:3000`
- Physical device: `http://<your-laptop-LAN-ip>:3000`

Create a `.env` file in `eduwallet-mobile/`:

```bash
EXPO_PUBLIC_GATEWAY_BASE_URL=http://10.0.2.2:3000
```

and restart Expo so the new value is picked up.

---

## ✅ Prerequisites

- Node.js (LTS)
- `npm` or `yarn`
- [Expo](https://expo.dev/) tooling (`npx expo` is fine)
- A running **EduWallet gateway** (see `gateway/README.md`)
- Contracts deployed and test data set up via the CLI

---

## 🚀 Running the app

From the repository root:

```bash
cd eduwallet-mobile

# install dependencies
npm install   # or: yarn

# (optional) configure API base URL in .env
# EXPO_PUBLIC_GATEWAY_BASE_URL=http://10.0.2.2:3000

# start Expo
npx expo start
# or: npm run start (depending on package.json)
```

Then:

- press `a` to open the Android emulator,
- or `i` to open the iOS simulator,
- or scan the QR code with the Expo Go app on a physical device.

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

- `id`, `sca`, `data` – current student info,
- `setStudent(id, sca, data)` – called after successful login,
- `clearStudent()` – called on logout.

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

- `gateway/` – the HTTP gateway that this app talks to.
- `browser-extension/` – alternative student client in the browser.
- `shared/` – shared types and HTTP client (`apiTypes.ts`,
  `clientApi.ts`) reused across all frontends.
