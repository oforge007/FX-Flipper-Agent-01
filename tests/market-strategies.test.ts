import test from "node:test";
import assert from "node:assert/strict";
import { IndependentStrategyManager } from "../src/strategy/independent-strategies.js";
import { getMarket } from "../src/markets/registry.js";
test("only cNGN/USDT and cNGN/USDC are registered in shadow mode",()=>{
  assert.equal(getMarket("cNGN-USDT").quoteAsset,"USDT"); assert.equal(getMarket("cNGN-USDC").quoteAsset,"USDC");
  assert.equal(getMarket("cNGN-USDT").liveTradingEnabled,false); assert.equal(getMarket("cNGN-USDC").tokenAddresses.base,null);
});
test("allocations and emergency stops are isolated",()=>{
  const m=new IndependentStrategyManager({"cNGN-USDT":80,"cNGN-USDC":40}); m.setEmergencyStop("cNGN-USDT",true);
  assert.equal(m.mayEnter("cNGN-USDT",10),false); assert.equal(m.mayEnter("cNGN-USDC",10),true);
  assert.equal(m.snapshot("cNGN-USDC").availableQuoteBalance,40);
});
test("a cycle reservation affects only its market",()=>{
  const m=new IndependentStrategyManager({"cNGN-USDT":80,"cNGN-USDC":40}); m.reserveForCycle("cNGN-USDT",25,"cycle-usdt");
  assert.equal(m.snapshot("cNGN-USDT").availableQuoteBalance,55); assert.equal(m.snapshot("cNGN-USDC").availableQuoteBalance,40);
  assert.equal(m.mayEnter("cNGN-USDT",10),false); assert.equal(m.mayEnter("cNGN-USDC",10),true);
});
test("allocation cannot change during an active cycle",()=>{
  const m=new IndependentStrategyManager({"cNGN-USDT":80,"cNGN-USDC":40}); m.reserveForCycle("cNGN-USDT",25,"cycle-1");
  assert.throws(()=>m.configureAllocation("cNGN-USDT",100)); assert.doesNotThrow(()=>m.configureAllocation("cNGN-USDC",50));
});
