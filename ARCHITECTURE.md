# GreenGrid architecture and current status

This document records the implementation and verified limitations in this repository. It supersedes older summaries that describe the project as a Vite/Express application.

## What is actually running

| Area | Current implementation |
|---|---|
| Web application | Next.js 14 App Router; `npm run dev`, production build via `npm run build`, production server via `npm start`. |
| HTTP backend | Next.js route handlers under `app/api`; there is no Express backend in this workspace. |
| Persistence | PostgreSQL through `pg` and `DB_URI`; `scripts/db-setup.js` creates the app tables. `data/iotEnergy.json` is read by the legacy migration script, but the live API reads PostgreSQL. |
| AI service | Separate FastAPI application in `D:\ai_service`; `npm run dev:ai` starts Uvicorn on port 8000. |
| MQTT | Mosquitto is external to this repository. Next.js server instrumentation starts the MQTT subscriber in `lib/mqtt.ts`. |
| Firmware | `esp32/GreenGridESP32/GreenGridESP32.ino` publishes PZEM readings to `energy/ESP32-001` every two seconds. Wi-Fi credentials remain placeholders. |
| Grid-carbon provider | No Electricity Maps, WattTime, or other live provider is configured. Carbon calculations use a configured estimate, not observed regional grid data. |
| Blockchain | Next.js server-side Viem client plus the Hardhat contract project in `CarbonCreditBlockchain-main/`. The off-chain proof-of-work ledger is also stored in PostgreSQL. |
| Tests | The FastAPI service has 10 regression/API tests. The Next.js project has no project-owned automated test suite. |

## Verified data flows

### Telemetry

`ESP32 + PZEM-004T` → MQTT publish (`energy/ESP32-001`) → Mosquitto → the Next.js MQTT subscriber → `devices` and `energy_readings` in PostgreSQL → authenticated `/api/energy/iot/{latest,readings,status}` routes → dashboard and AI pages.

The firmware sends voltage (V), current (A), instantaneous power (W), PZEM energy (cumulative kWh), frequency (Hz), and power factor. It does not send a timestamp or sequence number; the server supplies a receive timestamp and creates a UUID per message. The subscriber validates fields and ranges, ignores retained messages, reconnects with capped exponential backoff, and queues up to 1,000 database writes in memory for retry. Retry inserts are idempotent by UUID. Since the device uses QoS 0 and has no persistent queue or sequence number, outages and process shutdowns can still lose individual history points; cumulative meter values can reveal total consumption but not recreate the missing intervals.

### Authentication and summaries

Login/register route handlers issue a 24-hour JWT using a configured, non-placeholder `JWT_SECRET`. The local `.env.local` now contains a fresh random secret; do not commit it or share it. The browser stores the token in local storage and sends it as a bearer token. The hourly-summary and raw IoT read/status routes require a valid bearer token and return 401 otherwise. The dashboard passes its token to the API helper. Public health/status endpoints report service availability only. The login page no longer advertises unprovisioned demo credentials; users must sign up or use a real provisioned account.

### AI

`/api/ai/{status,predict,forecast}` calls the FastAPI service through `lib/server/ai/client.ts`. Emissions are calculated from interval kWh and a configured gCO₂e/kWh factor; confidence is explicitly unavailable. The LS-SVM endpoint is experimental and requires at least eight regular hourly observations. GreenGrid has no validated hourly grid observations configured, so its forecast route now reports that it cannot produce a grid forecast instead of treating PZEM demand readings as grid-carbon data. The service health response correctly reports that no trained model is ready.

### Blockchain

Authenticated UI actions call Next.js blockchain route handlers. Those handlers write to the PostgreSQL off-chain ledger and, where configured and reachable, call the Solidity contract through Viem. The contract is a local/demo proof of concept; it is not evidence of a deployed production carbon-credit registry. Earlier live checks found the configured RPC unreachable and contract reads failing; deployment must be reverified before presenting any on-chain claim.

## Demo load scaling

The UI uses a 100× household-equivalent estimate to make a 2–8 W demo bulb display as an illustrative 200–800 W load. Raw ESP32 readings and database rows remain unchanged; the UI labels the scaled power, energy, cost, and emissions as estimates. The off-chain/on-chain ledger evidence is not scaled. This is a presentation aid, not a measured household meter reading.

## Grid-provider assessment

No provider or region is configured. Based on the official product information, Electricity Maps is the best first fit for this demo because its API advertises carbon-intensity signals and time-based `/past`, `/past-range`, `/history`, `/latest`, and `/forecast` retrieval. Its official API documentation is linked from the [Electricity Maps API page](https://www.electricitymaps.com/platform/api). WattTime is a viable alternative; its [official API reference](https://docs.watttime.org/) describes real-time, forecast, and historical grid data. Before choosing either service, verify the specific India zone, signal semantics, account access, authentication, rate limits, and allowed history/forecast horizon against the account's current documentation. No provider adapter is implemented, and the app must not label its configured factor as live data.

## Confirmed fixes and remaining gaps

- Replaced the untrained Bi-LSTM emissions output with a transparent physical interval-emissions calculation. It no longer reports a fabricated confidence score.
- Fixed LS-SVM request validation and per-request fitting; short, irregular, or invalid forecast input is rejected.
- Removed fabricated grid-intensity history from the GreenGrid forecast path. PZEM readings are household demand, not hourly grid-carbon observations.
- Tightened JWT secret validation and added bearer-token checks to protected energy and AI routes.
- Added MQTT field/range/timestamp validation, retained-message rejection, reconnect backoff, database retry queueing, safe logs, and retry-idempotent inserts. Device-side buffering, authentication, sequence numbers, and durable queueing remain absent.
- Added 100× household-equivalent display labeling while preserving raw telemetry and ledger values.
- `data/iotEnergy.json` has 225 records but no provenance metadata; its values cannot be certified as real or synthetic from the file alone.
- The synthetic AI fixture is explicitly marked as synthetic and is not injected into live telemetry or production forecasts.
- The AI health fetch is explicitly uncached so the UI reflects current service readiness. One production-build attempt overlapped with a development server and failed on generated `.next/types`; after stopping the server, a clean production build succeeded and the production app was restarted.
- No authenticated browser visual flow, provider call, or successful on-chain transaction has been verified in this pass.

## Local verification notes

- `npx tsc --noEmit` passed after the recent TypeScript changes.
- The FastAPI regression suite passed: 10 tests.
- Anonymous access to `/api/energy/iot/latest` returned 401 as intended.
- FastAPI `/health` and the active Next.js `/api/ai/status` both report `models_loaded: false` and `trained_models_ready: false`.
- Registration and sign-in succeeded through the local app; authenticated IoT routes and the hourly summary returned 200, while anonymous IoT access returned 401. Temporary verification users were removed after each test.
- Authenticated `/api/ai/forecast` returned 400 with `source: unconfigured` because no validated hourly grid-carbon observations are configured; this is the expected honest response, not a working forecast.
- The active IoT status reported `mqttConnected: true` and `online: true` for `ESP32-001`; live sensor telemetry was arriving through MQTT and being persisted.
- A uniquely tagged MQTT test reading persisted with raw values unchanged; an out-of-range voltage payload was rejected. The exact test reading and device were deleted afterward.
- The authenticated hourly-summary API returned 100× household-equivalent values alongside raw consumption; the raw summary precision was increased so the ratio remains verifiable.
- The login page's previously displayed sample credentials did not exist in the fresh database; those misleading credentials have been removed from the UI.
- The final production build completed successfully after stopping the development server. The production app was restarted and returned 200 for `/` and `/api/ai/status`; the status correctly reports no trained model.
- In the production build, registration and sign-in succeeded; authenticated IoT and hourly-summary requests returned 200, anonymous IoT/forecast requests returned 401, the 100× summary check passed, and the forecast returned 400 with `source: unconfigured`. Temporary accounts were removed.
- Do not build while `next dev` or `next start` is using the same `.next` output. For a production build, stop the exact server first or build to an isolated `distDir`, then recheck the application.

## Before the presentation

1. The clean production build and restart are complete. Recheck `/`, `/api/ai/status`, and protected routes only if further code changes are made.
2. Verify the signed-in dashboard in a trusted local browser using a provisioned account; do not expose credentials or tokens. The login and protected API flows were verified locally, but the browser's remote tunnel was not given a token.
3. Keep the ESP32 publishing on the configured topic. Both live readings and a simulated valid/invalid MQTT-to-database check were observed; test rows were removed.
4. Confirm the bulb reading is shown alongside the 100× estimate and explain that it is not a measured whole-house value.
5. Keep carbon figures labeled as estimates until a provider and verified region are configured.
6. Recheck RPC URL, chain ID, and contract deployment before claiming blockchain integration; otherwise present the PostgreSQL ledger as a demo only.
7. Keep the generated `JWT_SECRET` in the ignored local `.env.local` only; replace firmware Wi-Fi placeholders and align broker authentication settings privately before reflashing the board.
