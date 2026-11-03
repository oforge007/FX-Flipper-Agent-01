
import test from "node:test";
import assert from "node:assert/strict";

import {
  IndependentStrategyManager,
} from "../src/strategy/independent-strategies.js";

import {
  getMarket,
} from "../src/markets/registry.js";

test("only cNGN/USDT and cNGN/USDC are registered in shadow mode", () => {
  assert.equal(getMarket("cNGN-USDT").quoteAsset, "USDT");
  assert.equal(getMarket("cNGN-USDC").quoteAsset, "USDC");

  assert.equal(getMarket("cNGN-USDT").liveTradingEnabled, false);
  assert.equal(getMarket("cNGN-USDC").liveTradingEnabled, false);

  assert.equal(getMarket("cNGN-USDC").tokenAddresses.base, null);
});

test("allocations and emergency stops are isolated", () => {
  const manager = new IndependentStrategyManager({
    "cNGN-USDT": 80,
    "cNGN-USDC": 40,
  });

  manager.setEmergencyStop("cNGN-USDT", true);

  assert.equal(manager.mayEnter("cNGN-USDT", 10), false);
  assert.equal(manager.mayEnter("cNGN-USDC", 10), true);

  assert.equal(
    manager.snapshot("cNGN-USDC").availableQuoteBalance,
    40,
  );
});

test("protected execution-cost reserve is excluded from tradeable balance", () => {
  const manager = new IndependentStrategyManager({
    "cNGN-USDT": 100,
    "cNGN-USDC": 40,
  });

  manager.configureExecutionCostReserve("cNGN-USDT", 20);

  assert.equal(
    manager.snapshot("cNGN-USDT").availableQuoteBalance,
    80,
  );

  assert.equal(manager.mayEnter("cNGN-USDT", 81), false);
  assert.equal(manager.mayEnter("cNGN-USDT", 80), true);
});

test("full paired cycle retains reservations until confirmed sell", () => {
  const manager = new IndependentStrategyManager({
    "cNGN-USDT": 100,
    "cNGN-USDC": 40,
  });

  manager.configureExecutionCostReserve("cNGN-USDT", 20);

  manager.reserveForCycle(
    "cNGN-USDT",
    {
      tradeAmount: 50,
      costBudgetRequired: 10,
    },
    "usdt-cycle-1",
    1000,
  );

  assert.equal(
    manager.snapshot("cNGN-USDT").state.cycleState,
    "buy_pending",
  );

  manager.confirmBuy("cNGN-USDT", "usdt-cycle-1");
  manager.beginSell("cNGN-USDT", "usdt-cycle-1");

  assert.throws(() =>
    manager.releaseAfterConfirmedClose(
      "cNGN-USDT",
      "usdt-cycle-1",
      false,
    ),
  );

  manager.recordSellFailure("cNGN-USDT", "usdt-cycle-1");

  assert.equal(
    manager.snapshot("cNGN-USDT").state.reservedQuoteBalance,
    50,
  );

  manager.beginSell("cNGN-USDT", "usdt-cycle-1");

  manager.releaseAfterConfirmedClose(
    "cNGN-USDT",
    "usdt-cycle-1",
    true,
    2000,
  );

  assert.equal(
    manager.snapshot("cNGN-USDT").state.cycleState,
    "closed",
  );

  assert.equal(
    manager.snapshot("cNGN-USDC").availableQuoteBalance,
    40,
  );
});

test("only a confirmed unfilled buy can release its reservation", () => {
  const manager = new IndependentStrategyManager({
    "cNGN-USDT": 100,
    "cNGN-USDC": 40,
  });

  manager.reserveForCycle(
    "cNGN-USDT",
    {
      tradeAmount: 10,
      costBudgetRequired: 0,
    },
    "usdt-cycle-2",
  );

  assert.throws(() =>
    manager.cancelConfirmedUnfilledBuy(
      "cNGN-USDT",
      "usdt-cycle-2",
      false,
    ),
  );

  manager.cancelConfirmedUnfilledBuy(
    "cNGN-USDT",
    "usdt-cycle-2",
    true,
  );

  assert.equal(
    manager.snapshot("cNGN-USDT").state.cycleState,
    "idle",
  );
});

test("market rate triggers and strategy configuration are independent", () => {
  const manager = new IndependentStrategyManager({
    "cNGN-USDT": 100,
    "cNGN-USDC": 100,
  });

  manager.configureStrategy("cNGN-USDT", {
    entryTargetRate: 1500,
    exitTargetRate: 1550,
  });

  assert.equal(
    manager.isEntryRateTriggered("cNGN-USDT", 1490),
    true,
  );

  assert.equal(
    manager.isEntryRateTriggered("cNGN-USDC", 1490),
    false,
  );

  assert.equal(
    manager.isExitRateTriggered("cNGN-USDT", 1551),
    true,
  );

  manager.setEmergencyStop("cNGN-USDT", true);

  assert.equal(manager.mayEnter("cNGN-USDC", 10), true);
});

test("strategy configuration cannot change during an active cycle", () => {
  const manager = new IndependentStrategyManager({
    "cNGN-USDT": 100,
    "cNGN-USDC": 100,
  });

  manager.reserveForCycle(
    "cNGN-USDT",
    {
      tradeAmount: 10,
      costBudgetRequired: 0,
    },
    "active-cycle",
  );

  assert.throws(() =>
    manager.configureStrategy("cNGN-USDT", {
      entryTargetRate: 1500,
    }),
  );

  assert.doesNotThrow(() =>
    manager.configureStrategy("cNGN-USDC", {
      entryTargetRate: 1500,
    }),
  );
});
