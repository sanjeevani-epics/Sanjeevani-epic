# Sanjeevani

<p align="center">
  <img src="https://github.com/GAUTAMKUMARYADAV100/Gautam_Certification/blob/main/sanjeevanilogo/LogoTealBG.jpg?raw=true" alt="Sanjeevani logo" width="280" />
</p>

<p align="center"><strong>Blockchain-based Electronic Medical Records (EMR) demo</strong></p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#tech-stack">Tech stack</a> •
  <a href="#prerequisites">Prerequisites</a> •
  <a href="#setup">Setup</a> •
  <a href="#environment-variables">Environment</a> •
  <a href="#smart-contract">Smart contract</a> •
  <a href="#testing">Testing</a> •
  <a href="#security-notes">Security</a>
</p>

---

## Overview

Sanjeevani is a **single-page app** where:

- **Doctors** connect with **MetaMask**, register on-chain, register **patients** by wallet address, search patients, and **upload files** that are **pinned to IPFS** (via **Pinata**). The **IPFS CID** and metadata are stored in the **`EHR` smart contract**.
- **Patients** connect with MetaMask and view **their own** record list and open files through an **IPFS gateway** link.

There is **no separate backend server** in this repo: the browser talks to **MetaMask**, the **Ethereum JSON-RPC** endpoint you configure in the wallet, and **Pinata’s HTTP API** for uploads.

> This project placed **3rd at NextStep Hacks 2022**.

---

## Tech stack

| Layer | Technology |
|--------|------------|
| UI | React 18, React Router 6, MUI (Material UI) |
| Build | **Vite** (`npm run dev` / `npm run build`) |
| Wallet / chain | **Web3.js** + **MetaMask** |
| Contracts | **Truffle**, Solidity **`EHR.sol`** (compiler **0.8.14** in `truffle/truffle-config.js`) |
| File storage | **IPFS** via **Pinata** (`client/src/ipfs.js` — `axios` + Pinata pin API) |

---

## Prerequisites

- **Node.js** (LTS recommended)
- **MetaMask** browser extension
- A local Ethereum node compatible with Truffle’s **development** network, e.g. **Ganache** listening on **`127.0.0.1:7545`** (matches `truffle/truffle-config.js`)
- A **Pinata** account and a **JWT** for the Pinning API (for doctor uploads)

---

## Setup

### 1. Smart contracts (Truffle)

From the repo root:

```bash
cd truffle
npm install
```

Start your local chain (e.g. Ganache) on **port 7545**, then:

```bash
npx truffle compile
npx truffle migrate
```

**Artifacts:** `truffle/truffle-config.js` sets `contracts_build_directory` to **`../client/src/contracts`**. After `compile` / `migrate`, **`EHR.json`** is written to **`client/src/contracts/`** automatically—you do **not** need to copy it by hand unless you change that path.

> **Note:** The root `.gitignore` ignores `client/src/contracts`. After a fresh clone you must run **`truffle compile`** (and deploy/migrate as needed) so `client/src/contracts/EHR.json` exists locally.

### 2. Client (Vite + React)

```bash
cd ../client
npm install
```

Copy environment template and add your Pinata JWT:

```bash
# Windows (PowerShell): copy .env.example .env
# macOS/Linux: cp .env.example .env
```

Edit **`client/.env`**:

```env
VITE_PINATA_JWT=your_pinata_jwt_here
```

Start the dev server:

```bash
npm run dev
```

Open the URL Vite prints (default **http://localhost:5173**). If the port is in use, Vite will choose another—check the terminal output.

Other useful scripts:

```bash
npm run build    # production build → dist/
npm run preview  # serve the production build locally
npm test         # Vitest (client tests)
```

### 3. MetaMask

- Add/import the **same network** you deployed to (e.g. Ganache custom RPC: `http://127.0.0.1:7545`).
- Import at least one account that has ETH on that network (Ganache accounts work).
- The **chain ID** in MetaMask must match the network where **`EHR`** was deployed so `EHR.json` contains a matching `networks[<id>].address`.

---

## Using the app

1. Open the app (Vite dev URL). **Home (`/`)** is reachable without the in-app login flow; other routes expect you to **sign in with MetaMask** (see `client/src/App.jsx` + `AuthProvider`).
2. **Doctor:** register as doctor on-chain from Home, then use **`/doctor`** to register patients, search by address, and upload records (requires **`VITE_PINATA_JWT`**).
3. **Patient:** after a doctor has called `addPatient` for your address, use **`/patient`** to load your records.

If Web3 init fails, the app shows an **error message and Retry** instead of hanging on “Loading…”.

---

## Environment variables

| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_PINATA_JWT` | `client/.env` | Pinata **JWT** for `pinFileToIPFS` (see `client/src/ipfs.js`) |

Only variables prefixed with **`VITE_`** are exposed to the browser by Vite. **Do not commit** real secrets; keep them in **`.env`** (gitignored).

---

## Smart contract (`EHR`)

File: **`truffle/contracts/EHR.sol`**.

- **`addDoctor()`** — any address can register as a doctor (demo-level trust model).
- **`addPatient(address)`** — only a registered doctor.
- **`addRecord(cid, fileName, patient)`** — only a doctor; appends to that patient’s record list.
- **`getRecords(patient)`** — only if the caller is **that patient** or a **registered doctor** (patients cannot read other patients’ rows).

After changing the contract, **recompile, migrate**, and ensure **`client/src/contracts/EHR.json`** is updated (again, Truffle writes there when using the default config).

---

## IPFS upload vs download

- **Upload:** Pinata API from **`client/src/ipfs.js`** (needs `VITE_PINATA_JWT`).
- **Download link:** record cards use a fixed gateway URL in **`client/src/components/Record.jsx`** (`https://med-chain.infura-ipfs.io/ipfs/<cid>`). CIDs from Pinata are still valid on public gateways; if a link fails, try another gateway or Pinata’s gateway for the same CID.

---

## Testing

**Truffle / contract tests** (requires a node on **`127.0.0.1:7545`** or specify `--network`):

```bash
cd truffle
npx truffle test
```

Tests live in **`truffle/test/ehr.test.js`** (access control for `getRecords`).

**Client tests:**

```bash
cd client
npm test
```

---

## Security notes

- **Pinata JWT in the client** is visible to anyone who uses your built site. Treat it as **demo-only**; for production, use a **small backend** that holds the secret and authenticates uploads.
- **Doctor registration** on-chain is **permissionless** in this demo—real deployments would need admin/allowlisting or off-chain verification.
- Rotate any JWT that was ever committed or shared publicly.

---

## Support

If you find this project useful, consider leaving a star on the repository.
