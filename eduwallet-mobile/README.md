# EduWallet Mobile App

The EduWallet mobile app is the student-facing mobile client for EduWallet. It is built with Expo and React Native.

The app does not interact with the blockchain directly. It calls the EduWallet gateway, which performs student login, reads wallet data, and submits permission changes through the existing EduWallet smart contracts.

> **Platform note**
> The app was developed and tested on Android with Expo Go. The same Expo project can also run on iOS, but the thesis prototype only documents and evaluates the Android setup.

## Role in the system

The mobile app is used by students. It allows a student to:

- log in with the student ID and password generated during registration,
- view academic results and course details,
- see which organizations have access to their EduWallet records,
- approve pending access requests,
- remove existing access,
- view basic profile and EduWallet account information.

In the thesis prototype, students approve access requests in the mobile app. The EduWallet Portal is used by universities and organizations to request access, verify records, and issue results.

## Project structure

```text
eduwallet-mobile/
  app/
    _layout.tsx              Root layout and StudentProvider
    (tabs)/
      _layout.tsx            Main tab layout
      index.tsx              Wallet screen
      permissions.tsx        Access screen route
    course/
      _layout.tsx
      [index].tsx            Course detail screen
    profile.tsx              Profile screen
  context/
    StudentContext.tsx       Logged-in student/session state
  lib/
    api.ts                   Mobile wrapper around shared/clientApi.ts
  types/
    index.ts                 Mobile type re-exports
```

The file `app/(tabs)/permissions.tsx` is still named after the underlying permission model. In the user interface, this is presented as **Access**.

## Gateway integration

The app uses the shared gateway client from `shared/clientApi.ts` and shared payload types from `shared/apiTypes.ts`.

The gateway base URL is read from:

```text
EXPO_PUBLIC_GATEWAY_BASE_URL
```

Create `eduwallet-mobile/.env` if you need to override it:

```text
EXPO_PUBLIC_GATEWAY_BASE_URL=http://10.0.2.2:3000
```

Common values:

```text
Android emulator:  http://10.0.2.2:3000
Physical device:   http://<your-laptop-LAN-ip>:3000
Remote testing:    https://<your-ngrok-url>
```

When using a physical phone, `localhost` points to the phone itself. The phone must be able to reach the gateway URL.

## Student session flow

The app logs in through the gateway endpoint:

```text
POST /auth/login
```

The gateway response contains the student payload, smart account address, current access state, and a temporary session token. The app uses this token for refresh, approve, and remove-access actions. This avoids asking the test user to re-enter the long student password for each action.

The temporary session is a prototype mechanism. It is kept in the gateway process and expires after a configured time. It should be replaced by a stronger authentication or delegated-signing model in a production system.

## Prerequisites

- Node.js and npm
- Expo Go on the test device, or an Android emulator
- A running local Hardhat chain
- A running EduWallet gateway
- Demo data generated with `scripts/bootstrapPortalDemo.ts`

For the complete demo setup, use the root README first. This README only covers the mobile app itself.

## Installation

From the repository root:

```cmd
cd eduwallet-mobile
npm install
```

## Running locally

Start the app:

```cmd
npm run start
```

or clear the Expo cache first:

```cmd
npx expo start -c
```

Then choose one of the Expo options:

```text
a  Open Android emulator
w  Open web version
Scan QR code with Expo Go on a physical device
```

The Android emulator path is the tested setup.

## Running on a physical phone on the same network

Set the gateway URL to your laptop's LAN address:

```text
EXPO_PUBLIC_GATEWAY_BASE_URL=http://<your-laptop-LAN-ip>:3000
```

Then restart Expo and scan the QR code with Expo Go.

The phone and laptop must be on the same network. The gateway must also allow connections from the phone.

## Remote mobile testing

For remote testing, two separate connections matter:

1. Expo must deliver the app bundle to the phone.
2. The app must reach the local EduWallet gateway.

A practical setup is:

```cmd
cd eduwallet-mobile
npx expo start -c --tunnel
```

and, in another terminal:

```cmd
ngrok http 3000
```

Then set:

```text
EXPO_PUBLIC_GATEWAY_BASE_URL=https://<your-ngrok-url>
```

Restart Expo after changing the environment variable.

## Main screens

### Wallet

Shows the student's academic records, total ECTS, and course list.

### Course details

Shows course metadata, grade, evaluation date, issuing university, and certificate link when available.

### Access

Shows current organization access and pending access requests. Students can approve requests or remove existing access.

The UI uses friendly terms:

```text
View access   = read permission
Update access = write permission
```

### Profile

Shows personal details, course summary, and expandable technical EduWallet details.

## Useful commands

```cmd
npm run start
npm run android
npm run web
npm run lint
```

The root package also provides:

```cmd
npm run dev:mobile
npm run dev:mobile:tunnel
```

## Related components

- `gateway/` — student-client API used by the mobile app.
- `shared/` — shared TypeScript types and gateway HTTP client.
- `eduwallet-portal/` — organization/university portal.
- `portal-backend/` — backend for the portal. It is separate from the student gateway.
