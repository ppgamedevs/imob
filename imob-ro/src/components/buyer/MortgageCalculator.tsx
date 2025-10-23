/**
 * Day 29: Mortgage Calculator Component
 * Calculate monthly payment and affordability
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { mortgageCalc } from "@/lib/finance/mortgage";

type MortgageCalculatorProps = {
  price: number;
};

export function MortgageCalculator({ price }: MortgageCalculatorProps) {
  const [downPct, setDownPct] = useState(15);
  const [ratePct, setRatePct] = useState(7);
  const [years, setYears] = useState(30);
  const [incomeNet, setIncomeNet] = useState<number | null>(null);
  const [result, setResult] = useState<ReturnType<typeof mortgageCalc> | null>(null);

  useEffect(() => {
    const calc = mortgageCalc({
      price,
      downPct: downPct / 100,
      ratePct,
      years,
      incomeNet: incomeNet ?? undefined,
      dtiMax: 0.4,
    });
    setResult(calc);
  }, [price, downPct, ratePct, years, incomeNet]);

  if (!result) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mortgage Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="down">Down Payment (%)</Label>
            <Input
              id="down"
              type="number"
              min="0"
              max="100"
              value={downPct}
              onChange={(e) => setDownPct(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="rate">Interest Rate (%)</Label>
            <Input
              id="rate"
              type="number"
              min="0"
              max="30"
              step="0.1"
              value={ratePct}
              onChange={(e) => setRatePct(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="years">Loan Term (years)</Label>
            <Input
              id="years"
              type="number"
              min="1"
              max="40"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="income">Monthly Income (€)</Label>
            <Input
              id="income"
              type="number"
              min="0"
              placeholder="Optional"
              value={incomeNet ?? ""}
              onChange={(e) => setIncomeNet(e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Down Payment</span>
            <span className="font-semibold">{result.down.toLocaleString()} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Loan Amount</span>
            <span className="font-semibold">{result.principal.toLocaleString()} €</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Payment (P&I)</span>
            <span className="font-semibold">{result.monthly.toLocaleString()} €</span>
          </div>
          {result.fixed > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fixed Costs</span>
              <span className="font-semibold">{result.fixed.toLocaleString()} €</span>
            </div>
          )}
          <div className="flex justify-between text-lg border-t pt-3">
            <span className="font-medium">Total Monthly</span>
            <span className="font-bold">{result.total.toLocaleString()} €</span>
          </div>

          {result.dti !== null && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-muted-foreground">DTI Ratio</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{(result.dti * 100).toFixed(1)}%</span>
                <Badge variant={result.ok ? "default" : "destructive"}>
                  {result.ok ? "Affordable" : "Over Budget"}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
