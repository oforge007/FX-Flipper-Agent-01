# Independent market architecture addendum

The initial supported corridors are cNGN/USDT and cNGN/USDC. Each has its own quote-asset balance allocation, strategy limits, emergency stop, and paired-cycle state. Changes or open cycles in one market do not mutate the other. There is no shared capital allocator in this initial design.

Both markets are shadow-only. Registry limits are development placeholders, not verified Textile FX parameters. Token addresses remain null pending official verification. Live trading is explicitly disabled. Do not add markets or enable execution until Textile support, token addresses, RFQ schema, routes, fees, gas handling, wallet policy, and recovery have been verified.

Integrate this addendum into README.md when applying the patch.