# EduWallet Shared Library

Small TypeScript library that contains code shared between the different
EduWallet components:

- **Shared API types** – JSON shapes for all gateway requests/responses.
- **Gateway HTTP client** – thin fetch-based client used by both student
  frontends (browser extension and mobile app).

This keeps the browser extension, mobile app and gateway in sync and
prevents duplicated type definitions.

---

## 📁 Contents

```bash
shared/
├── apiTypes.ts   # TypeScript interfaces for all HTTP payloads
└── clientApi.ts  # Thin HTTP client for talking to the gateway
```

### `apiTypes.ts`

Defines the common data structures used across the system, including:

- `UniversityInfo`
- `CourseResult`
- `StudentPayload`
- `UniversityPermissionEntry`
- `AllPermissionsForStudent`
- `CredentialsResponse`
- `PermissionStatus`
- `ErrorResponse`

These types are imported by:

- `gateway/src/eduwalletClient.ts`
- `browser-extension/src/lib/api.ts`
- `eduwallet-mobile/app/types.ts`

### `clientApi.ts`

Exports a `createGatewayClient(baseUrl)` function that returns a minimal
HTTP client with typed methods:

- `logIn(id, password): Promise<CredentialsResponse>`
- `getPermissions(studentSca, id, password): Promise<AllPermissionsForStudent>`
- `revokePermission(studentSca, id, password, universityAddress?)`
- `grantPermission(studentSca, id, password, type, universityAddress?)`

The client:

- Normalises the base URL.
- Parses JSON responses.
- Throws a typed error when the gateway returns an `ErrorResponse`.

It is reused by:

- `browser-extension/src/lib/api.ts`
- `eduwallet-mobile/app/lib/api.ts`

So that both student clients share the exact same HTTP behaviour and
TypeScript types.
