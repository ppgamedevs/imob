import * as React from "react";
import { TrendingUp, Home, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * YieldCard - Rental yield breakdown
 *
 * Shows:
 * - Estimated monthly rent
 * - €/m² rent calculation
 * - Expenses breakdown
 * - Net annual yield %
 * - Comparison to area average
 */

export interface YieldCardProps {
  rentEur: number; // Monthly rent estimate
  eurM2Rent: number; // €/m² monthly rent
  areaM2: number;
  expenses?: {
    maintenanceEur?: number;
    taxesEur?: number;
    managementEur?: number;
  };
  netYield: number; // 0-1 (e.g., 0.065 = 6.5%)
  areaAvgYield?: number; // 0-1
  priceEur: number; // Property price for yield calculation
}

export default function YieldCard({
  rentEur,
  eurM2Rent,
  areaM2,
  expenses,
  netYield,
  areaAvgYield,
  priceEur,
}: YieldCardProps) {
  const annualRent = rentEur * 12;
  const totalExpenses = expenses
    ? (expenses.maintenanceEur || 0) + (expenses.taxesEur || 0) + (expenses.managementEur || 0)
    : annualRent * 0.2; // Default 20% expenses
  const netAnnualIncome = annualRent - totalExpenses;

  const isGoodYield = netYield >= 0.06;
  const isBetterThanArea = areaAvgYield ? netYield > areaAvgYield : false;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Randament Închiriere</h2>
        <p className="text-sm text-muted">Estimare venit net din închiriere pe termen lung</p>
      </div>

      {/* Monthly Rent Estimate */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Chirie Lunară Estimată</span>
          </div>
        </div>
        <div className="text-2xl font-bold">{formatEur(rentEur)}</div>
        <div className="text-sm text-muted mt-1">
          {formatEur(eurM2Rent)}/m² × {areaM2} m²
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Calculator className="h-4 w-4" />
          Calcul Randament Anual
        </div>

        <div className="space-y-1.5 text-sm">
          {/* Annual Rent */}
          <div className="flex justify-between">
            <span className="text-muted">Venit Anual Brut</span>
            <span className="font-medium">{formatEur(annualRent)}</span>
          </div>

          {/* Expenses Breakdown */}
          {expenses && (
            <>
              {expenses.maintenanceEur && (
                <div className="flex justify-between pl-4 text-xs">
                  <span className="text-muted">Întreținere</span>
                  <span>−{formatEur(expenses.maintenanceEur)}</span>
                </div>
              )}
              {expenses.taxesEur && (
                <div className="flex justify-between pl-4 text-xs">
                  <span className="text-muted">Impozite</span>
                  <span>−{formatEur(expenses.taxesEur)}</span>
                </div>
              )}
              {expenses.managementEur && (
                <div className="flex justify-between pl-4 text-xs">
                  <span className="text-muted">Management</span>
                  <span>−{formatEur(expenses.managementEur)}</span>
                </div>
              )}
            </>
          )}

          {/* Total Expenses */}
          <div className="flex justify-between border-t pt-1.5">
            <span className="text-muted">Cheltuieli Totale</span>
            <span className="font-medium text-danger">−{formatEur(totalExpenses)}</span>
          </div>

          {/* Net Income */}
          <div className="flex justify-between pt-1.5 border-t-2">
            <span className="font-medium">Venit Net Anual</span>
            <span className="font-bold text-success">{formatEur(netAnnualIncome)}</span>
          </div>
        </div>
      </div>

      {/* Net Yield Display */}
      <div
        className={cn(
          "p-4 rounded-lg border-2",
          isGoodYield ? "bg-success/10 border-success/30" : "bg-warning/10 border-warning/30",
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium">Randament Net</span>
          <TrendingUp className={cn("h-5 w-5", isGoodYield ? "text-success" : "text-warning")} />
        </div>
        <div className={cn("text-3xl font-bold", isGoodYield ? "text-success" : "text-warning")}>
          {(netYield * 100).toFixed(2)}%
        </div>
        <div className="text-xs text-muted mt-1">
          {formatEur(netAnnualIncome)} / {formatEur(priceEur)}
        </div>
      </div>

      {/* Comparison with Area */}
      {areaAvgYield && (
        <div className="flex items-center justify-between text-sm p-3 bg-muted/30 rounded-lg">
          <span className="text-muted">Medie Zonă:</span>
          <div className="flex items-center gap-2">
            <span className="font-medium">{(areaAvgYield * 100).toFixed(1)}%</span>
            {isBetterThanArea && (
              <span className="text-xs text-success font-medium">
                +{((netYield - areaAvgYield) * 100).toFixed(1)}pp
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interpretation */}
      <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-2">
        <div className="font-medium">Interpretare:</div>
        <ul className="space-y-1 text-muted pl-4">
          <li className="list-disc">
            {isGoodYield ? (
              <>
                <strong className="text-success">Randament bun</strong> (≥6%) pentru piața
                românească
              </>
            ) : netYield >= 0.04 ? (
              <>
                <strong className="text-info">Randament acceptabil</strong> (4-6%), comparabil cu
                alte investiții
              </>
            ) : (
              <>
                <strong className="text-warning">Randament scăzut</strong> (&lt;4%), investiția se
                bazează pe apreciere capital
              </>
            )}
          </li>
          <li className="list-disc">Calculul presupune ocupare 90% și chirii la nivelul pieței</li>
          {isBetterThanArea && (
            <li className="list-disc">
              <strong className="text-success">Avantaj:</strong> Randament mai bun decât media zonei
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/** Format EUR currency */
function formatEur(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}
