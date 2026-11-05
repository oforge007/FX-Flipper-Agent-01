import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluateRoundTrip,
} from "../src/strategy/economics.js";

test("rejects a cycle below the minimum net-profit threshold", () => {
  const result = evaluateRoundTrip({
    entryPrincipal: 100,
    expectedExitProceeds: 101.2,
    estimatedTotalCosts: 0.5,
    minimumNetProfit: 1,
    maximumTradeSize: 150,
  });

  assert.equal(result.accepted, false);
  assert.equal(result.expectedNetProfit, 0.7);
  assert.equal(result.minimumRequiredExitProceeds, 101.5);
});

test("accepts only when exit proceeds cover costs and required margin", () => {
  const result = evaluateRoundTrip({
    entryPrincipal: 100,
    expectedExitProceeds: 102,
    estimatedTotalCosts: 0.5,
    minimumNetProfit: 1,
    maximumTradeSize: 150,
  });

  assert.equal(result.accepted, true);
  assert.equal(result.expectedNetProfit, 1.5);
});

test("rejects principal above the maximum trade size", () => {
  const result = evaluateRoundTrip({
    entryPrincipal: 151,
    expectedExitProceeds: 200,
    estimatedTotalCosts: 1,
    minimumNetProfit: 1,
    maximumTradeSize: 150,
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reason, "Trade exceeds maximum trade size");
});

test("rejects invalid economics input", () => {
  assert.throws(() =>
    evaluateRoundTrip({
      entryPrincipal: 100,
      expectedExitProceeds: 102,
      estimatedTotalCosts: -1,
      minimumNetProfit: 1,
      maximumTradeSize: 150,
    }),
  );
});