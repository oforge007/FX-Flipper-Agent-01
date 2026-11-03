import { getMarket, type MarketId, type MarketDefinition } from "../markets/registry.js";
import { mayStartBuy, type CycleState } from "./cycle-guard.js";
export interface MarketStrategyState {
  marketId: MarketId; cycleState: CycleState; emergencyStop: boolean;
  allocatedQuoteBalance: number; reservedQuoteBalance: number; openCycleId: string | null;
}
export interface StrategySnapshot { market: MarketDefinition; state: MarketStrategyState; availableQuoteBalance: number; }
/** Balances, emergency stops and cycle state are isolated per market. */
export class IndependentStrategyManager {
  private readonly states = new Map<MarketId, MarketStrategyState>();
  constructor(initialAllocations: Record<MarketId, number> = {"cNGN-USDT":0,"cNGN-USDC":0}) {
    for (const id of ["cNGN-USDT","cNGN-USDC"] as const) {
      const allocation = initialAllocations[id];
      if (!Number.isFinite(allocation) || allocation < 0) throw new Error(`Invalid quote allocation for ${id}`);
      this.states.set(id,{marketId:id,cycleState:"idle",emergencyStop:false,allocatedQuoteBalance:allocation,reservedQuoteBalance:0,openCycleId:null});
    }
  }
  snapshot(id: MarketId): StrategySnapshot {
    const state=this.requireState(id);
    return {market:getMarket(id),state:{...state},availableQuoteBalance:Math.max(0,state.allocatedQuoteBalance-state.reservedQuoteBalance)};
  }
  configureAllocation(id: MarketId, amount: number): void {
    if (!Number.isFinite(amount)||amount<0) throw new Error("Allocation must be a non-negative finite amount");
    const state=this.requireState(id);
    if (["buy_pending","open","sell_pending"].includes(state.cycleState)) throw new Error("Cannot change allocation while a cycle is active");
    state.allocatedQuoteBalance=amount;
  }
  setEmergencyStop(id: MarketId, stopped: boolean): void { this.requireState(id).emergencyStop=stopped; }
  mayEnter(id: MarketId, amount: number): boolean {
    const state=this.requireState(id), market=getMarket(id);
    return market.mode==="shadow" && !market.liveTradingEnabled && amount>0 &&
      amount<=market.strategy.maxTradeSize && amount<=state.allocatedQuoteBalance-state.reservedQuoteBalance &&
      mayStartBuy(state.cycleState,state.emergencyStop);
  }
  reserveForCycle(id: MarketId, amount: number, cycleId: string): void {
    if (!cycleId.trim()||!Number.isFinite(amount)||amount<=0) throw new Error("Invalid cycle reservation");
    if (!this.mayEnter(id,amount)) throw new Error("Market entry rejected by its independent strategy policy");
    const state=this.requireState(id); state.reservedQuoteBalance=amount; state.cycleState="buy_pending"; state.openCycleId=cycleId;
  }
  releaseAfterConfirmedClose(id: MarketId, cycleId: string): void {
    const state=this.requireState(id);
    if (state.cycleState!=="sell_pending"||state.openCycleId!==cycleId) throw new Error("Only the matching sell-pending cycle can be closed");
    state.reservedQuoteBalance=0; state.cycleState="closed"; state.openCycleId=null;
  }
  private requireState(id: MarketId): MarketStrategyState {
    const state=this.states.get(id); if (!state) throw new Error(`Unsupported market: ${id}`); return state;
  }
}
