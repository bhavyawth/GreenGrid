# GreenGrid Project Index

This index reflects the current Next.js repository. Start with [ARCHITECTURE.md](./ARCHITECTURE.md) for verified implementation details and system limitations.

## Guides

- [Project summary](./PROJECT_SUMMARY.md) — feature status and presentation-safe description.
- [Implementation guide](./IMPLEMENTATION_GUIDE.md) — current data flow, behavior, and demo checks.
- [README](./README.md) — repository setup and commands.
- [`.env.example`](./.env.example) — environment-variable names and placeholders.

## Main code areas

| Path | Purpose |
|---|---|
| `app/` | Next.js pages and API route handlers |
| `components/` | Dashboard, ledger, marketplace, and certificate UI |
| `lib/` | PostgreSQL, authentication, MQTT, and blockchain helpers |
| `services/` | Shared frontend/data-service helpers |
| `scripts/db-setup.js` | PostgreSQL schema setup |
| `esp32/GreenGridESP32/` | ESP32/PZEM firmware |
| `CarbonCreditBlockchain-main/` | Local Hardhat/Solidity proof-of-concept project |

## Key application routes

- `/api/energy/iot/*` — authenticated meter telemetry
- `/api/blockchain/transaction` — interval emissions estimate and ledger/chain recording
- `/api/market/*` — listings, in-app trades, wallet state, and internal reference estimate
- `/api/certificates` — legacy record retrieval; new certificate issuance is paused
- `/api/onchain/*` — local-chain status, verification, and linked emissions records
- `/api/ai/*` — proxy routes to the separate FastAPI service

## Validation

```powershell
npx tsc --noEmit
git diff --check
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the current known gaps, external-service dependencies, and explanations of what each record does and does not prove.
