export interface RoundTripInput {
  entryPrincipal: number;
  expectedExitProceeds: number;
  estimatedTotalCosts: number;
  minimumNetProfit: number;
  maximumTradeSize: number;
}

export interface RoundTripEvaluation {
  accepted: boolean;
  minimumRequiredExitProceeds: number;
  expectedNetProfit: number;
  reason: string;
}

/**
 * Pure quote-asset arithmetic.
 * The caller must supply expected exit proceeds and a complete
 * cost estimate for both legs. This function does not fetch quotes
 * or authorize execution.
 */
export function evaluateRoundTrip(
  input: RoundTripInput,
): RoundTripEvaluation {
  const values = Object.values(input);

  if (
    !values.every((value) => Number.isFinite(value)) ||
    input.entryPrincipal <= 0 ||
    input.expectedExitProceeds < 0 ||
    input.estimatedTotalCosts < 0 ||
    input.minimumNetProfit < 0 ||
    input.maximumTradeSize <= 0
  ) {
    throw new Error("Invalid round-trip economics input");
  }

  const minimumRequiredExitProceeds =
    input.entryPrincipal +
    input.estimatedTotalCosts +
    input.minimumNetProfit;

  const expectedNetProfit =
    input.expectedExitProceeds -
    input.entryPrincipal -
    input.estimatedTotalCosts;

  if (input.entryPrincipal > input.maximumTradeSize) {
    return {
      accepted: false,
      minimumRequiredExitProceeds,
      expectedNetProfit,
      reason: "Trade exceeds maximum trade size",
    };
  }

  if (expectedNetProfit < input.minimumNetProfit) {
    return {
      accepted: false,
      minimumRequiredExitProceeds,
      expectedNetProfit,
      reason: "Expected net profit is below the configured minimum",
    };
  }

  return {
    accepted: true,
    minimumRequiredExitProceeds,
    expectedNetProfit,
    reason: "Arithmetic threshold passed; independent quote and risk checks remain mandatory",
  };
}