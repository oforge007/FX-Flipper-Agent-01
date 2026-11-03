
# FX-Flipper Agent

Shadow-first paired-cycle trading agent for the Textile FX cNGN/USDT and cNGN/USDC corridors on Celo.

**Safety status: SHADOW MODE.**

Live trading is disabled. This repository does not hold private keys, sign raw transactions, submit live swaps, or claim profitability.

Live execution must remain disabled until the official Textile FX interfaces, token addresses, RFQ schema, routes, fee handling, wallet policy, and transaction recovery have been independently verified.

## Supported markets

The initial supported markets are:

- cNGN/USDT
- cNGN/USDC

Each market has independent:

- Quote-asset capital allocation
- Entry and exit rate triggers
- Maximum trade size
- Minimum net-profit setting
- Maximum slippage setting
- Maximum quote age
- Cooldown
- Protected execution-cost reserve
- Emergency stop
- Paired-cycle state

A cycle or emergency stop in one market must not alter the other market's allocation or cycle state.

There is no shared capital allocator.

Registry values are development defaults, not verified Textile FX trading parameters. Token addresses remain null until verified against official sources.

## Paired-cycle lifecycle

The strategy manager supports this lifecycle:

\`idle → buy_pending → open → sell_pending → closed\`

The safety rules are:

1. A market can have only one active cycle at a time.
2. A buy reservation is created before the buy is considered pending.
3. The buy must be confirmed before the cycle enters the open state.
4. The sell leg must be initiated from the open state.
5. A failed sell retains the cycle reservation.
6. A pending buy can be cancelled only after confirmed unfilled status.
7. Capital reservations are released only after confirmed sell completion.
8. A new buy must respect the market's cooldown and emergency-stop state.

These methods depend on their caller supplying correctly reconciled transaction status. They do not independently verify blockchain confirmations.

## Capital and execution-cost reserves

Each market protects a portion of its quote-asset allocation as an execution-cost reserve.

That reserve is excluded from the amount available for trade principal.

**Important:** This is an accounting reserve, not proof that USDT or USDC is accepted as Celo gas. Actual gas currency, fee conversion, account-abstraction charges, and both-leg execution costs must be verified before live use.

Do not allocate the entire quote-asset balance to the initial buy.

## Rate triggers and profitability

Each market has independent entry and exit rate conditions:

- \`at_or_below\`
- \`at_or_above\`

A target rate of zero disables that trigger.

The minimum net-profit setting is a strategy parameter. This version does not yet calculate or enforce executable round-trip profitability from live Textile RFQs.

A production trading decision must account for:

- Entry and exit RFQ prices
- Quote expiry and freshness
- Both-leg spreads and protocol fees
- Slippage
- Network gas
- Account-abstraction or wallet execution fees
- Recovery costs
- Minimum net profit after all costs

Never treat an indicative rate as a guaranteed executable price.

## Current implementation limits

This is an in-memory, shadow-only strategy foundation.

It does not yet include:

- Official Textile FX live RFQ adapter
- Verified token addresses and route registry
- Live swap execution
- Durable database persistence
- Always-on monitoring worker
- Transaction journal and restart recovery
- Blockchain confirmation and reconciliation service
- Production alerting and incident recovery
- Verified round-trip net-profit enforcement

A process restart loses the manager's in-memory state. Do not use this implementation to manage real funds.

## Local development

Install dependencies:

\`\`\`bash
npm install
\`\`\`

Run tests:

\`\`\`bash
npm test
\`\`\`

Start the local development server:

\`\`\`bash
npm run dev
\`\`\`

Open:

\`http://localhost:3000\`

## Deployment

Vercel can host the dashboard and request/response API.

Use \`main\` as the production branch if that is how the project is configured.

A separate persistent worker and durable database are required for unattended monitoring. Do not run an infinite trading loop inside a Vercel request.

## Security

- Never commit private keys or seed phrases.
- Never expose wallet credentials to the frontend or language model.
- Never claim that a transaction was signed or executed without confirmation from the execution system.
- Future execution must use an isolated Hot Wallet or restricted smart-account wrapper.
- Apply strict trade limits, token allowlists, spending limits, and emergency-stop controls.
- Require transaction reconciliation before releasing reservations.

## Network

Target network: Celo mainnet.

Chain ID: \`42220\`.

Verify the official Textile FX contracts, token addresses, RFQ schema, wallet execution path, fee adapter, gas handling, and any required transaction attribution before enabling transactions.

Do not assume USDT or USDC can be used directly as network fee currency.

## Development roadmap

- [x] Shadow dashboard and health endpoint
- [x] cNGN/USDT and cNGN/USDC independent market registry
- [x] Independent strategy state and emergency stops
- [x] Protected execution-cost reserve accounting
- [x] Paired-cycle lifecycle safeguards
- [x] Tests for market isolation and cycle reservations
- [ ] Verify build and tests in the target environment
- [ ] Official Textile FX quote adapter
- [ ] Verified token addresses and routes
- [ ] Live RFQ economics and minimum-net-margin enforcement
- [ ] Persistent worker and database
- [ ] Transaction journal and recovery
- [ ] Restricted smart-account/session-key policy
- [ ] Shadow observations against real RFQs
- [ ] Independent security review
- [ ] Mainnet execution only after all safety requirements pass

## Licence

No open-source licence has been selected. All rights reserved by default.
