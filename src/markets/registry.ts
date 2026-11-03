export type MarketId = "cNGN-USDT" | "cNGN-USDC";
export type QuoteAsset = "USDT" | "USDC";
export interface MarketDefinition {
  id: MarketId; baseAsset: "cNGN"; quoteAsset: QuoteAsset;
  chainId: 42220; mode: "shadow"; liveTradingEnabled: false;
  tokenAddresses: { base: null; quote: null };
  strategy: { maxTradeSize: number; minimumNetProfit: number; maximumSlippageBps: number; quoteMaxAgeMs: number; cooldownMs: number };
}
export const MARKET_REGISTRY: Readonly<Record<MarketId, MarketDefinition>> = {
  "cNGN-USDT": { id:"cNGN-USDT", baseAsset:"cNGN", quoteAsset:"USDT", chainId:42220, mode:"shadow", liveTradingEnabled:false, tokenAddresses:{base:null,quote:null}, strategy:{maxTradeSize:100,minimumNetProfit:1,maximumSlippageBps:50,quoteMaxAgeMs:15000,cooldownMs:60000} },
  "cNGN-USDC": { id:"cNGN-USDC", baseAsset:"cNGN", quoteAsset:"USDC", chainId:42220, mode:"shadow", liveTradingEnabled:false, tokenAddresses:{base:null,quote:null}, strategy:{maxTradeSize:100,minimumNetProfit:1,maximumSlippageBps:50,quoteMaxAgeMs:15000,cooldownMs:60000} }
};
export function getMarket(id: MarketId): MarketDefinition {
  const market = MARKET_REGISTRY[id];
  if (!market) throw new Error(`Unsupported market: ${id}`);
  return market;
}
