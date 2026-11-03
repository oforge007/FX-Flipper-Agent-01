export interface RoundTripInput {entryAmountUsdt:number;estimatedTotalCostsUsdt:number;minimumNetProfitUsdt:number;maximumTradeUsdt:number}
export interface RoundTripEvaluation {accepted:boolean;minimumExitProceedsUsdt:number;expectedNetProfitUsdt:number;reason:string}
export function evaluateRoundTrip(input:RoundTripInput):RoundTripEvaluation {
 const v=Object.values(input);if(!v.every(Number.isFinite)||input.entryAmountUsdt<=0||input.maximumTradeUsdt<=0||input.estimatedTotalCostsUsdt<0||input.minimumNetProfitUsdt<0)throw new Error("Invalid round-trip economics input");
 const minimumExitProceedsUsdt=input.entryAmountUsdt+input.estimatedTotalCostsUsdt+input.minimumNetProfitUsdt;
 if(input.entryAmountUsdt>input.maximumTradeUsdt)return{accepted:false,minimumExitProceedsUsdt,expectedNetProfitUsdt:0,reason:"Trade exceeds maximum size"};
 return{accepted:true,minimumExitProceedsUsdt,expectedNetProfitUsdt:input.minimumNetProfitUsdt,reason:"Economic threshold calculated; live quote and risk checks still required"};
}