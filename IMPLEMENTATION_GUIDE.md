# GreenGrid Implementation Guide

This guide describes the current code in this repository. For deeper verified data-flow details and known limitations, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## What the application does

GreenGrid is a Next.js application that can display electricity telemetry, estimate associated emissions, record estimates in an off-chain ledger, and optionally submit an attestation to a configured local blockchain. It also provides an internal peer-to-peer listing and trade workflow.

| Area | Current behavior | Important limitation |
|---|---|---|
| Energy monitoring | Reads PZEM telemetry received over MQTT and stored in PostgreSQL. | Requires the device, broker, database, and app to be configured and running. Some dashboard values are explicitly scaled demo estimates. |
| Emissions | Calculates an estimate from interval kWh and a configured grid factor (`GRID_EMISSION_FACTOR`, default 260 gCO₂e/kWh). | The factor is not a live regional grid-intensity feed. |
| AI | Calls the separate FastAPI service for supported prediction/forecast routes. | No validated regional grid-intensity history is currently configured, and the health endpoint reports that no trained model is ready. |
| Ledger and chain | Stores an off-chain hashed transaction and can attest the interval estimate to the configured local contract. | A chain record proves that a transaction was submitted; it does not verify the emissions estimate or avoided emissions. |
| Marketplace | Shows participant-entered listings and completed in-app trades. The internal reference estimate uses current sensor power when available. | The reference estimate is not an external market quote. Trades update app records and balances; no cash payment or external registry is connected. |
| Certificates | Shows legacy stored app records and on-chain emissions attestations. | New avoided-emissions certificate issuance is paused until a measured baseline and reduction method are available. |

## Data flow

1. The ESP32/PZEM device publishes measurements to MQTT.
2. The Next.js MQTT subscriber validates messages and writes readings to PostgreSQL.
3. Authenticated API routes provide telemetry to the dashboard and AI service.
4. The blockchain transaction route uses the positive difference between consecutive cumulative-energy readings from the same meter.
5. Estimated emissions are calculated as `interval_kWh × configured_gCO₂e_per_kWh ÷ 1000`.
6. The estimate is saved to the off-chain ledger. If the local contract call succeeds, the app also stores a record linked to the exact meter interval.

The estimate describes emissions associated with measured electricity use. It is not a forecast of an individual user's future usage and is not a measurement of avoided emissions.

## Marketplace behavior

- Sellers enter asking prices for existing app records.
- Listing summaries use active listings; the price-history chart uses completed GreenGrid trades.
- The internal sensor-based reference estimate uses a fixed $25 reference and adjusts it by a bounded formula relative to 1,000 W. It is a demo rule, not a market-clearing price or external benchmark.
- Buying and buying back update internal ownership/listing and wallet records only. No cash is transferred.
- The app does not independently validate the carbon quantity attached to a listed record.

## Certificates and on-chain records

An on-chain emissions attestation records an estimate derived from an energy interval. It is not an avoided-emissions certificate. The app therefore disables new certificate issuance until it can compare actual use with a documented baseline over the same period. Existing certificate rows are retained and labeled as app records with unvalidated amounts.

The local Hardhat contract is a proof of concept, not a production registry. Verify the local node, contract address, and server wallet configuration before demonstrating a successful chain submission.

## Running and checking the project

From the repository root:

```powershell
npm install
npm run dev
npx tsc --noEmit
```

The app requires the environment variables and external services described in `.env.example` and [ARCHITECTURE.md](./ARCHITECTURE.md). The AI service is separate; its setup and tests are documented in the `D:\ai_service` project.

## Before a presentation

- Confirm the app, PostgreSQL, MQTT broker, ESP32 publisher, and (if demonstrating it) local Hardhat node are actually running.
- Show whether a displayed value is measured telemetry, a configured estimate, a demo-scaled value, or an internal app record.
- Describe the marketplace as an in-app ownership workflow, not a live carbon market.
- Describe blockchain entries as emissions attestations, not verified savings.
- Do not claim that a trained user-usage forecast or avoided-emissions certificate is currently available.
