
import {
  getMarket,
  type MarketId,
  type MarketDefinition,
} from "../markets/registry.js";
import {
  mayStartBuy,
  transitionCycle,
  type CycleState,
} from "./cycle-guard.js";

export type RateCondition = "at_or_below" | "at_or_above";

export interface MarketStrategyConfig {
  entryTargetRate: number;
  entryRateCondition: RateCondition;
  exitTargetRate: number;
  exitRateCondition: RateCondition;
  maxTradeSize: number;
  minimumNetProfit: number;
  maximumSlippageBps: number;
  quoteMaxAgeMs: number;
  cooldownMs: number;
}

export interface MarketStrategyState {
  marketId: MarketId;
  cycleState: CycleState;
  emergencyStop: boolean;
  allocatedQuoteBalance: number;
  reservedQuoteBalance: number;

  // Protected quote-asset budget for execution costs.
  // This is accounting only; it does not imply that the
  // quote asset is accepted as the network gas currency.
  executionCostReserveQuote: number;
  reservedCostBudget: number;

  openCycleId: string | null;
  lastCycleClosedAt: number | null;
  strategy: MarketStrategyConfig;
}

export interface StrategySnapshot {
  market: MarketDefinition;
  state: MarketStrategyState;
  availableQuoteBalance: number;
}

export interface CycleReservation {
  tradeAmount: number;
  costBudgetRequired: number;
}

const validNonNegative = (value: number): boolean =>
  Number.isFinite(value) && value >= 0;

const isActiveCycle = (state: CycleState): boolean =>
  ["buy_pending", "open", "sell_pending"].includes(state);

function defaultStrategy(id: MarketId): MarketStrategyConfig {
  return {
    ...getMarket(id).strategy,
    entryTargetRate: 0,
    entryRateCondition: "at_or_below",
    exitTargetRate: 0,
    exitRateCondition: "at_or_above",
  };
}

/**
 * Maintains isolated strategy state for cNGN/USDT and cNGN/USDC.
 *
 * This manager is in-memory and shadow-only.
 * It is not a live trading or transaction-signing component.
 */
export class IndependentStrategyManager {
  private readonly states = new Map<MarketId, MarketStrategyState>();

  constructor(
    initialAllocations: Record<MarketId, number> = {
      "cNGN-USDT": 0,
      "cNGN-USDC": 0,
    },
  ) {
    for (const id of ["cNGN-USDT", "cNGN-USDC"] as const) {
      const allocation = initialAllocations[id];

      if (!validNonNegative(allocation)) {
        throw new Error(`Invalid quote allocation for ${id}`);
      }

      this.states.set(id, {
        marketId: id,
        cycleState: "idle",
        emergencyStop: false,
        allocatedQuoteBalance: allocation,
        reservedQuoteBalance: 0,
        executionCostReserveQuote: 0,
        reservedCostBudget: 0,
        openCycleId: null,
        lastCycleClosedAt: null,
        strategy: defaultStrategy(id),
      });
    }
  }

  snapshot(id: MarketId): StrategySnapshot {
    const state = this.requireState(id);

    return {
      market: getMarket(id),
      state: {
        ...state,
        strategy: { ...state.strategy },
      },
      availableQuoteBalance: Math.max(
        0,
        state.allocatedQuoteBalance -
          state.reservedQuoteBalance -
          state.executionCostReserveQuote,
      ),
    };
  }

  configureAllocation(id: MarketId, amount: number): void {
    if (!validNonNegative(amount)) {
      throw new Error("Allocation must be a non-negative finite amount");
    }

    const state = this.requireState(id);
    this.assertInactive(state);

    if (amount < state.executionCostReserveQuote) {
      throw new Error(
        "Allocation cannot be lower than the protected execution-cost reserve",
      );
    }

    state.allocatedQuoteBalance = amount;
  }

  configureExecutionCostReserve(id: MarketId, amount: number): void {
    if (!validNonNegative(amount)) {
      throw new Error("Reserve must be a non-negative finite amount");
    }

    const state = this.requireState(id);
    this.assertInactive(state);

    if (amount > state.allocatedQuoteBalance) {
      throw new Error("Reserve cannot exceed this market's allocation");
    }

    state.executionCostReserveQuote = amount;
  }

  configureStrategy(
    id: MarketId,
    patch: Partial<MarketStrategyConfig>,
  ): void {
    const state = this.requireState(id);
    this.assertInactive(state);

    const next = { ...state.strategy, ...patch };

    const numericFields: (keyof MarketStrategyConfig)[] = [
      "entryTargetRate",
      "exitTargetRate",
      "maxTradeSize",
      "minimumNetProfit",
      "maximumSlippageBps",
      "quoteMaxAgeMs",
      "cooldownMs",
    ];

    for (const field of numericFields) {
      const value = next[field];

      if (typeof value !== "number" || !validNonNegative(value)) {
        throw new Error(`Invalid strategy value: ${field}`);
      }
    }

    if (next.maxTradeSize <= 0) {
      throw new Error("Maximum trade size must be positive");
    }

    if (next.maximumSlippageBps > 10_000) {
      throw new Error("Slippage limit cannot exceed 10,000 basis points");
    }

    if (next.quoteMaxAgeMs <= 0) {
      throw new Error("Quote maximum age must be positive");
    }

    if (
      !["at_or_below", "at_or_above"].includes(
        next.entryRateCondition,
      ) ||
      !["at_or_below", "at_or_above"].includes(
        next.exitRateCondition,
      )
    ) {
      throw new Error("Invalid rate condition");
    }

    state.strategy = next;
  }

  setEmergencyStop(id: MarketId, stopped: boolean): void {
    this.requireState(id).emergencyStop = stopped;
  }

  isEntryRateTriggered(id: MarketId, rate: number): boolean {
    const config = this.requireState(id).strategy;

    if (
      !Number.isFinite(rate) ||
      config.entryTargetRate <= 0
    ) {
      return false;
    }

    return config.entryRateCondition === "at_or_below"
      ? rate <= config.entryTargetRate
      : rate >= config.entryTargetRate;
  }

  isExitRateTriggered(id: MarketId, rate: number): boolean {
    const config = this.requireState(id).strategy;

    if (
      !Number.isFinite(rate) ||
      config.exitTargetRate <= 0
    ) {
      return false;
    }

    return config.exitRateCondition === "at_or_below"
      ? rate <= config.exitTargetRate
      : rate >= config.exitTargetRate;
  }

  mayEnter(
    id: MarketId,
    amount: number,
    now = Date.now(),
  ): boolean {
    const state = this.requireState(id);
    const market = getMarket(id);

    const cooldownPassed =
      state.lastCycleClosedAt === null ||
      now - state.lastCycleClosedAt >= state.strategy.cooldownMs;

    return (
      market.mode === "shadow" &&
      market.liveTradingEnabled === false &&
      !state.emergencyStop &&
      Number.isFinite(amount) &&
      amount > 0 &&
      amount <= state.strategy.maxTradeSize &&
      amount <=
        state.allocatedQuoteBalance -
          state.reservedQuoteBalance -
          state.executionCostReserveQuote &&
      cooldownPassed &&
      mayStartBuy(state.cycleState, state.emergencyStop)
    );
  }

  reserveForCycle(
    id: MarketId,
    reservation: CycleReservation,
    cycleId: string,
    now = Date.now(),
  ): void {
    const { tradeAmount, costBudgetRequired } = reservation;

    if (
      !cycleId.trim() ||
      !validNonNegative(costBudgetRequired) ||
      !this.mayEnter(id, tradeAmount, now)
    ) {
      throw new Error(
        "Market entry rejected by its independent strategy policy",
      );
    }

    const state = this.requireState(id);

    if (
      costBudgetRequired >
      state.executionCostReserveQuote - state.reservedCostBudget
    ) {
      throw new Error("Insufficient protected execution-cost reserve");
    }

    state.reservedQuoteBalance = tradeAmount;
    state.reservedCostBudget = costBudgetRequired;
    state.cycleState = transitionCycle(
      state.cycleState,
      "buy_pending",
    );
    state.openCycleId = cycleId;
  }

  /** Call only after the buy transaction is confirmed successful. */
  confirmBuy(id: MarketId, cycleId: string): void {
    const state = this.matchCycle(id, cycleId, "buy_pending");

    state.cycleState = transitionCycle(
      state.cycleState,
      "open",
    );
  }

  /** Call when the strategy is ready to submit the sell leg. */
  beginSell(id: MarketId, cycleId: string): void {
    const state = this.matchCycle(id, cycleId, "open");

    state.cycleState = transitionCycle(
      state.cycleState,
      "sell_pending",
    );
  }

  /**
   * A failed or reverted sell does not release capital.
   * Reconciliation must establish the actual transaction status.
   */
  recordSellFailure(id: MarketId, cycleId: string): void {
    const state = this.matchCycle(id, cycleId, "sell_pending");

    state.cycleState = transitionCycle(
      state.cycleState,
      "open",
    );
  }

  /**
   * Release a pending buy only when external reconciliation
   * confirms that no buy was filled.
   */
  cancelConfirmedUnfilledBuy(
    id: MarketId,
    cycleId: string,
    confirmedUnfilled: boolean,
  ): void {
    if (!confirmedUnfilled) {
      throw new Error(
        "Cannot release a buy reservation without confirmed unfilled status",
      );
    }

    const state = this.matchCycle(id, cycleId, "buy_pending");

    state.reservedQuoteBalance = 0;
    state.reservedCostBudget = 0;
    state.cycleState = transitionCycle(
      state.cycleState,
      "idle",
    );
    state.openCycleId = null;
  }

  /**
   * Release cycle reservations only after the sell leg is confirmed.
   */
  releaseAfterConfirmedClose(
    id: MarketId,
    cycleId: string,
    confirmedSell: boolean,
    now = Date.now(),
  ): void {
    if (!confirmedSell) {
      throw new Error(
        "Cannot close a cycle without confirmed sell completion",
      );
    }

    const state = this.matchCycle(id, cycleId, "sell_pending");

    state.reservedQuoteBalance = 0;
    state.reservedCostBudget = 0;
    state.cycleState = transitionCycle(
      state.cycleState,
      "closed",
    );
    state.openCycleId = null;
    state.lastCycleClosedAt = now;
  }

  private assertInactive(state: MarketStrategyState): void {
    if (isActiveCycle(state.cycleState)) {
      throw new Error(
        "Cannot reconfigure a market while its cycle is active",
      );
    }
  }

  private matchCycle(
    id: MarketId,
    cycleId: string,
    expectedState: CycleState,
  ): MarketStrategyState {
    const state = this.requireState(id);

    if (
      state.cycleState !== expectedState ||
      state.openCycleId !== cycleId
    ) {
      throw new Error("Cycle state or identifier mismatch");
    }

    return state;
  }

  private requireState(id: MarketId): MarketStrategyState {
    const state = this.states.get(id);

    if (!state) {
      throw new Error(`Unsupported market: ${id}`);
    }

    return state;
  }
}
