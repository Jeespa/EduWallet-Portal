# EduWallet Portal Backend Demo Flow

## Start services

### Terminal 1: Start local blockchain

```cmd
cd <repo-root>
npx hardhat node
```

### Terminal 2: Bootstrap EduWallet demo blockchain data

```cmd
cd <repo-root>
npx hardhat run scripts\bootstrapPortalDemo.ts --network localhost
```

This generates:

```text
portal-backend\src\demo\portalDemoBlockchain.json
portal-backend\.env.demo-chain
gateway\.env.demo-chain
```

### Terminal 3: Start student gateway

```cmd
cd <repo-root>\gateway
copy .env.demo-chain .env
npm run dev
```

The student gateway should run on:

```text
http://localhost:3001
```

### Terminal 4: Start portal backend

```cmd
cd <repo-root>\portal-backend
npm run seed
npm run dev
```

The portal backend should run on:

```text
http://localhost:4000
```

### Terminal 5: Start portal frontend

```cmd
cd <repo-root>\eduwallet-portal
npx expo start
```

### Terminal 6: Web Demo Server

```cmd
cd <repo-root>\eduwallet-portal
npm run demo:web
```

### Terminal 7: Launch Ngrok

```cmd
ngrok http 8080
```

## Important generated demo data

The generated blockchain demo data is stored in:

```text
portal-backend\src\demo\portalDemoBlockchain.json
```

Use this file to find:

- generated student ID
- generated student password
- generated student smart account address
- NTNU organization address
- Nordic Hiring organization address
- Nordic Hiring smart account address

## University flow

Goal:

```text
NTNU logs in
→ creates an issuance draft
→ submits the draft
→ course result is written to EduWallet
→ verification confirms the new course exists on-chain
```

### Login as NTNU admin

Use:

```text
Email: ingrid@ntnu.no
Password: password123
```

### Expected result

After creating and submitting an issuance draft, a new course result should be written to the student’s EduWallet smart wallet.

The result can be verified through the portal backend using the verification endpoint.

## Company flow

Goal:

```text
Nordic Hiring logs in
→ requests read access to the student
→ verification fails before approval
→ student approves access through the student gateway
→ verification succeeds after approval
```

### Login as Nordic Hiring

Use:

```text
Email: emma@nordichiring.no
Password: password123
```

### Expected result before approval

Nordic Hiring should not be able to verify the student record before the student has approved read access.

Expected message:

```text
Organization does not have read access for this student.
```

## Notes

The local Hardhat blockchain state is temporary. If the Hardhat node is stopped, the blockchain state is lost.

When restarting from scratch:

1. start Hardhat node,
2. rerun `bootstrapPortalDemo.ts`,
3. copy generated environment files,
4. restart gateway and portal backend,
5. use the new generated student values from `portalDemoBlockchain.json`.

Do not commit generated local secret/demo files:

```text
portal-backend\.env
portal-backend\.env.demo-chain
portal-backend\src\demo\portalDemoBlockchain.json
gateway\.env
gateway\.env.demo-chain
```

These files contain local private keys and generated student credentials.
