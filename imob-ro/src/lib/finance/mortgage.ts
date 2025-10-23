/**
 * Day 29: Mortgage & Affordability Calculator
 * Calculate monthly payments, DTI ratio, and affordability
 */

export type MortgageInput = {
  price: number;
  downPct?: number; // default 0.15 (15%)
  ratePct?: number; // annual interest rate (default 7%)
  years?: number; // loan term (default 30)
  taxPct?: number; // annual property tax as % of price (default 0)
  hoaEur?: number; // monthly HOA/condo fee (default 0)
  insEur?: number; // monthly insurance (default 0)
  incomeNet?: number; // monthly net income
  dtiMax?: number; // max debt-to-income ratio (default 0.4)
};

export type MortgageResult = {
  down: number; // down payment
  principal: number; // loan amount
  monthly: number; // monthly principal + interest
  fixed: number; // monthly fixed costs (tax + HOA + insurance)
  total: number; // total monthly payment
  dti: number | null; // debt-to-income ratio
  ok: boolean; // passes affordability test
};

export function mortgageCalc(i: MortgageInput): MortgageResult {
  const down = Math.round(i.price * (i.downPct ?? 0.15));
  const principal = Math.max(0, i.price - down);

  // Monthly interest rate
  const r = (i.ratePct ?? 7) / 100 / 12;
  const n = (i.years ?? 30) * 12;

  // Calculate monthly P&I using amortization formula
  const monthly = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));

  // Monthly fixed costs
  const tax = Math.round(((i.taxPct ?? 0) / 12) * i.price);
  const fixed = (i.hoaEur ?? 0) + (i.insEur ?? 0) + tax;

  const total = Math.round(monthly + fixed);

  // Calculate DTI if income provided
  const dti = i.incomeNet ? total / i.incomeNet : null;
  const ok = i.dtiMax ? (dti !== null ? dti <= i.dtiMax : true) : true;

  return {
    down,
    principal,
    monthly: Math.round(monthly),
    fixed: Math.round(fixed),
    total,
    dti,
    ok,
  };
}

/**
 * Calculate max affordable price based on income and DTI
 */
export function maxAffordablePrice(
  incomeNet: number,
  ratePct = 7,
  downPct = 0.15,
  dtiMax = 0.4,
  years = 30,
): number {
  const maxMonthly = incomeNet * dtiMax;
  const r = ratePct / 100 / 12;
  const n = years * 12;

  // Reverse amortization formula to find principal
  const maxPrincipal = (maxMonthly * (1 - Math.pow(1 + r, -n))) / r;
  const maxPrice = maxPrincipal / (1 - downPct);

  return Math.round(maxPrice);
}
