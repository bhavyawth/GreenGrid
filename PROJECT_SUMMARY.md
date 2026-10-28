# GreenGrid Project Summary

GreenGrid is a capstone proof of concept for electricity monitoring, estimated emissions accounting, a local blockchain attestation flow, and an internal peer-to-peer marketplace. This summary describes the current repository state; it does not claim production deployment or independently verified carbon savings.

## Feature status

| Feature | Current status | What it does not establish |
|---|---|---|
| IoT monitoring | Next.js consumes validated PZEM readings from MQTT/PostgreSQL. | Availability depends on configured hardware and services; demo-scaled UI values are estimates. |
| Emissions | Uses interval kWh multiplied by a configured grid factor. | The factor is not live regional grid data, and the result is not avoided emissions. |
| AI service | Next.js can call the separate FastAPI service. | No trained model is currently reported ready; user-specific electricity-usage forecasting is not provided. |
| Blockchain ledger | Stores a hashed off-chain transaction and can submit a local-contract attestation. | A transaction hash does not verify the input data, emissions methodology, or carbon savings. |
| Marketplace | Uses actual app listings and completed in-app trades; includes an internal sensor-power reference estimate. | No external benchmark, cash settlement, or carbon-credit registry is connected. |
| Certificates | Existing records can be viewed; new certificate issuance is paused. | Stored records and app points are not verified offsets or independently validated carbon credits. |

## Presentation-safe description

> GreenGrid collects electricity-meter telemetry, calculates a transparent emissions estimate using a configured grid factor, and can record that estimate in an application ledger and local blockchain proof of concept. Its marketplace demonstrates internal listings and ownership updates. The system does not currently verify avoided emissions, connect to a live carbon market, or forecast an individual user's future electricity consumption.

## Current stack

- Next.js 14 App Router and React/TypeScript
- PostgreSQL persistence through `DB_URI`
- MQTT telemetry subscriber for the ESP32/PZEM device
- Separate FastAPI AI service in `D:\ai_service`
- Viem client and local Hardhat/Solidity proof of concept

## Important limitations to disclose

- `GRID_EMISSION_FACTOR` is configurable and defaults to 260 gCO₂e/kWh; it is an estimate, not live grid intensity.
- The dashboard can display a labeled household-equivalent scale for small demo-meter readings; raw sensor and ledger values are not scaled.
- The market's $25-based sensor formula is an internal reference estimate, not an external price source.
- Marketplace trades update app state and do not process money.
- New avoided-emissions certificates are disabled until a documented measured baseline and reduction method exist.
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for verified data flows, setup dependencies, and remaining gaps.

## Demo checklist

1. Start the configured services and confirm the homepage and login work.
2. Confirm a recent PZEM reading is visible before demonstrating an emissions transaction.
3. Explain the grid factor and whether any displayed household-equivalent values are scaled.
4. Demonstrate listings/trade history as internal app records only.
5. If the local chain is unavailable, state that clearly; do not describe an off-chain record as an on-chain verification.
