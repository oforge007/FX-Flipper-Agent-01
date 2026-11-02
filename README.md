# FX-Flipper Agent

Shadow-first paired-cycle trading agent for Textile FX cNGN/USDT on Celo.

**Safety status: SHADOW MODE.** No private keys, signing, live swaps, live quotes, or profitability claims are implemented. Live execution must remain disabled until official Textile FX interfaces, token addresses, wallet policy, fee handling, and recovery have been verified.

## Current foundation
- Responsive browser dashboard and Vercel health endpoint.
- Round-trip economics calculation and cycle-state guard.
- Tests for trade-size enforcement, minimum exit proceeds, and single-cycle behaviour.
- No live trading integration yet.

## Local development
```bash
npm install
npm test
npm run dev
```
Open http://localhost:3000.

## Deployment
Connect this repository to Vercel; use `main` as Production Branch. `vercel.json` serves `public/` and exposes `/api/health`. A separate persistent worker and database are required for unattended monitoring; do not run an infinite trading loop inside a Vercel request.

## Environment
Copy `.env.example` to `.env`. Never commit secrets. Variables reserved for future verified integrations: `TEXTILE_FX_API_URL`, `CELO_RPC_URL`, `DATABASE_URL`.

## Trading policy
Reject stale RFQs, wrong token pairs, excess trade size, insufficient USDT gas reserve, excess slippage, an already-open cycle, cooldown violations, and any entry whose expected exit proceeds do not cover principal + both legs' fees + slippage + gas + minimum net profit. Only confirmed sell completion allows a new buy.

Target network is Celo mainnet (chain ID 42220). Verify official Textile FX contracts, token addresses, RFQ schema, wallet execution path, fee adapter and event attribution before enabling transactions. Do not assume USDT can be passed directly as fee currency.

## Roadmap
- [x] Repository foundation, shadow dashboard, health endpoint, strategy tests
- [ ] Verified Textile FX quote adapter
- [ ] Persistent worker, database and recovery
- [ ] Restricted smart-account/session-key policy
- [ ] Shadow observations against real RFQs
- [ ] Mainnet execution after independent safety review

No open-source licence has been selected; all rights reserved by default.
