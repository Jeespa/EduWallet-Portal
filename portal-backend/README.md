# EduWallet Portal Backend

This service provides the backend for the EduWallet portal used by organizations such as universities and employers. It is separate from the student-facing gateway and is intended to support portal users, organization roles, request handling, verification, and issuance draft workflows.

## Current scope

The backend currently supports:

- portal user authentication
- organization memberships and roles
- student search through a mock student source
- permission request creation and listing
- verification creation and listing
- issuance draft creation, listing, and submission
- PostgreSQL persistence for portal data

In the end-to-end demo configuration, the portal backend uses a generated demo student metadata file to find the student's ID and smart account address. Academic records and permissions are read from and written to EduWallet through the SDK/contracts. PostgreSQL is used only for portal-side data such as users, organizations, request logs, verification logs, and issuance drafts.

## Tech stack

- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL
- Argon2
- JWT
- Zod

## Project structure

```text
portal-backend/
  prisma/
    schema.prisma
  src/
    auth/
    generated/
    lib/
    routes/
    scripts/
    services/
    students/
    types/
    index.ts
```

## Setup

    1. Install dependencies

    From portal-backend/:

    npm install
    2. Configure environment

    Create a .env file in portal-backend/:

    PORT=4000
    DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/eduwallet_portal"
    JWT_SECRET="change-this-in-real-use"
    3. Generate Prisma client
    npx prisma generate
    4. Run migrations
    npx prisma migrate dev
    5. Seed the database
    npm run seed
    6. Start the backend
    npm run dev
    Health check

    Test that the backend is running:

    GET http://localhost:4000/health

    Expected response:

    {
    "ok": true,
    "service": "portal-backend"
    }
    Seeded users

    After running npm run seed, the following users are available:

    NTNU users
    ingrid@ntnu.no / password123 — ADMIN
    marius@ntnu.no / password123 — REQUESTER
    sofie@ntnu.no / password123 — VERIFIER
    lars@ntnu.no / password123 — ISSUER
    Nordic Hiring users
    emma@nordichiring.no / password123 — ADMIN
    oliver@nordichiring.no / password123 — VERIFIER
    Main endpoints
    Auth
    POST /auth/login
    GET /auth/me
    Students
    GET /students/search
    Requests
    POST /requests
    GET /requests
    Verifications
    POST /verifications
    GET /verifications
    Issuance
    POST /issue/drafts
    GET /issue/drafts
    POST /issue/drafts/:id/submit
    Example PowerShell test flow
    Login
    $login = Invoke-RestMethod `
    -Method POST `
    -Uri "http://localhost:4000/auth/login" `
    -ContentType "application/json" `
    -Body '{"email":"ingrid@ntnu.no","password":"password123"}'

    $token = $login.token
    $login | ConvertTo-Json -Depth 10
    Current session
    Invoke-RestMethod `
    -Method GET `
    -Uri "http://localhost:4000/auth/me" `
    -Headers @{ Authorization = "Bearer $token" } |
    ConvertTo-Json -Depth 10
    Search students
    Invoke-RestMethod `
    -Method GET `
    -Uri "http://localhost:4000/students/search?q=anna" `
    -Headers @{ Authorization = "Bearer $token" } |
    ConvertTo-Json -Depth 10
    Create permission request
    Invoke-RestMethod `
    -Method POST `
    -Uri "http://localhost:4000/requests" `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body '{
        "studentId": "s123456",
        "studentSca": "0x7A1B2C3D4E5F6789012345678901234567890ABC",
        "permissionType": "read",
        "reason": "Need access to verify academic records."
    }' |
    ConvertTo-Json -Depth 10
    List requests
    Invoke-RestMethod `
    -Method GET `
    -Uri "http://localhost:4000/requests" `
    -Headers @{ Authorization = "Bearer $token" } |
    ConvertTo-Json -Depth 10
    Create verification
    Invoke-RestMethod `
    -Method POST `
    -Uri "http://localhost:4000/verifications" `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body '{
        "studentId": "s654321",
        "studentSca": "0x1234567890ABCDEF1234567890ABCDEF12345678",
        "courseCode": "IDATT2104"
    }' |
    ConvertTo-Json -Depth 10
    List verifications
    Invoke-RestMethod `
    -Method GET `
    -Uri "http://localhost:4000/verifications" `
    -Headers @{ Authorization = "Bearer $token" } |
    ConvertTo-Json -Depth 10
    Create issuance draft
    Invoke-RestMethod `
    -Method POST `
    -Uri "http://localhost:4000/issue/drafts" `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body '{
        "studentId": "s123456",
        "studentSca": "0x7A1B2C3D4E5F6789012345678901234567890ABC",
        "courseCode": "TEST1001",
        "courseName": "Backend Testing",
        "degreeCourse": "Computer Science",
        "ects": "7.5",
        "grade": "A",
        "evaluationDate": "2026-10-01"
    }' |
    ConvertTo-Json -Depth 10
    List issuance drafts
    Invoke-RestMethod `
    -Method GET `
    -Uri "http://localhost:4000/issue/drafts" `
    -Headers @{ Authorization = "Bearer $token" } |
    ConvertTo-Json -Depth 10
    Notes
    The backend currently uses a mock student source.
    Portal-side state is stored in PostgreSQL.
    Organization isolation is enforced in list and create operations through organizationId.
    Role restrictions are enforced through middleware.
    Development status

    Implemented:

    authentication
    role-based access control
    request logging
    verification logging
    issuance drafts
    shared portal DTOs

    Not yet implemented:

    real student source integration
    real on-chain request/verification/issuance submission
    portal frontend integration with the live backend
    production-ready security hardening
