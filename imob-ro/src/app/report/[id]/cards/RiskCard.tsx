import { AlertTriangle, ExternalLink, Info, ShieldCheck } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * RiskCard - Seismic risk explanation
 *
 * Shows:
 * - Seismic risk class (RS1/RS2/RS3/none)
 * - Confidence level
 * - Source link (MDRAP)
 * - Explanation of what it means
 * - Mitigation advice
 */

export interface RiskCardProps {
  seismicClass: "RS1" | "RS2" | "RS3" | "none";
  confidence?: number; // 0-1
  source?: string; // e.g., "MDRAP 2023"
  sourceUrl?: string;
  yearBuilt?: number;
  hasConsolidation?: boolean;
  additionalInfo?: string;
}

export default function RiskCard({
  seismicClass,
  confidence,
  source = "MDRAP",
  sourceUrl,
  yearBuilt,
  hasConsolidation,
  additionalInfo,
}: RiskCardProps) {
  const classConfig = {
    RS1: {
      label: "Risc Seismic I",
      color: "text-danger",
      bgColor: "bg-danger/10",
      borderColor: "border-danger/30",
      icon: AlertTriangle,
      severity: "Ridicat",
      description:
        "Clădire cu risc seismic ridicat. Necesită consolidare urgentă pentru siguranță.",
    },
    RS2: {
      label: "Risc Seismic II",
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/30",
      icon: AlertTriangle,
      severity: "Mediu",
      description: "Clădire cu risc seismic moderat. Consolidarea este recomandată dar nu urgentă.",
    },
    RS3: {
      label: "Risc Seismic III",
      color: "text-info",
      bgColor: "bg-info/10",
      borderColor: "border-info/30",
      icon: Info,
      severity: "Scăzut",
      description: "Clădire cu risc seismic redus. Structura este în general sigură.",
    },
    none: {
      label: "Fără Clasificare",
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
      icon: ShieldCheck,
      severity: "Necunoscut",
      description:
        "Clădirea nu apare în registrul MDRAP cu risc seismic. Acest lucru este de obicei un semn bun.",
    },
  };

  const config = classConfig[seismicClass];
  const Icon = config.icon;
  const isHighRisk = seismicClass === "RS1" || seismicClass === "RS2";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Risc Seismic</h2>
        <p className="text-sm text-muted">
          Clasificare conform listei oficiale MDRAP (Ministerul Dezvoltării)
        </p>
      </div>

      {/* Risk Class Display */}
      <div className={cn("p-4 rounded-lg border-2", config.bgColor, config.borderColor)}>
        <div className="flex items-start gap-3">
          <Icon className={cn("h-6 w-6 flex-shrink-0 mt-0.5", config.color)} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-lg font-bold", config.color)}>{config.label}</span>
              <Badge variant="outline" className={cn("text-xs", config.color, config.borderColor)}>
                {config.severity}
              </Badge>
            </div>
            <p className="text-sm text-muted">{config.description}</p>
          </div>
        </div>

        {/* Confidence */}
        {confidence && confidence > 0 && (
          <div className="mt-3 pt-3 border-t border-current/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Încredere clasificare:</span>
              <span className="font-medium">{Math.round(confidence * 100)}%</span>
            </div>
            <div className="mt-2 h-1.5 bg-muted/30 rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all", config.color.replace("text-", "bg-"))}
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Additional Context */}
      {(yearBuilt || hasConsolidation !== undefined) && (
        <div className="space-y-2">
          {yearBuilt && (
            <div className="flex justify-between text-sm p-3 bg-muted/30 rounded-lg">
              <span className="text-muted">An Construcție:</span>
              <span className="font-medium">
                {yearBuilt}
                {yearBuilt < 1978 && (
                  <span className="text-xs text-warning ml-2">(pre-normativ seismic)</span>
                )}
              </span>
            </div>
          )}

          {hasConsolidation !== undefined && (
            <div className="flex justify-between text-sm p-3 bg-muted/30 rounded-lg">
              <span className="text-muted">Consolidare:</span>
              <Badge
                variant="outline"
                className={hasConsolidation ? "border-success/50 text-success" : ""}
              >
                {hasConsolidation ? "Da" : "Nu"}
              </Badge>
            </div>
          )}
        </div>
      )}

      {/* What It Means */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Ce Înseamnă:</div>
        <ul className="space-y-1.5 text-sm text-muted pl-4">
          {seismicClass === "RS1" && (
            <>
              <li className="list-disc">
                Risc ridicat de prăbușire în caz de cutremur major (≥7 Richter)
              </li>
              <li className="list-disc">
                Consolidarea este <strong>obligatorie legal</strong>
              </li>
              <li className="list-disc">Asigurarea poate fi dificilă sau scumpă</li>
              <li className="list-disc">Verifică dacă există proiect de consolidare aprobat</li>
            </>
          )}
          {seismicClass === "RS2" && (
            <>
              <li className="list-disc">
                Risc moderat - clădirea poate suferi deteriorări în caz de cutremur
              </li>
              <li className="list-disc">
                Consolidarea este recomandată dar nu obligatorie imediat
              </li>
              <li className="list-disc">Informează-te despre starea structurală reală</li>
            </>
          )}
          {seismicClass === "RS3" && (
            <>
              <li className="list-disc">Risc redus - structura este relativ sigură</li>
              <li className="list-disc">Nu sunt necesare măsuri speciale imediate</li>
            </>
          )}
          {seismicClass === "none" && (
            <>
              <li className="list-disc">Clădirea nu este în lista oficială cu risc seismic</li>
              <li className="list-disc">
                Aceasta nu garantează siguranță 100%, mai ales pentru clădiri vechi
              </li>
              <li className="list-disc">
                Recomandare: expertiză tehnică independentă pentru clădiri pre-1978
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Additional Info */}
      {additionalInfo && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
          <div className="font-medium mb-1">Informații Suplimentare:</div>
          <p className="text-muted">{additionalInfo}</p>
        </div>
      )}

      {/* Source Link */}
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm hover:bg-muted/50 transition-colors group"
        >
          <span className="text-muted">Sursă: {source}</span>
          <ExternalLink className="h-4 w-4 text-muted group-hover:text-text transition-colors" />
        </a>
      ) : (
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
          <span className="text-muted">Sursă: {source}</span>
        </div>
      )}

      {/* Warning for high risk */}
      {isHighRisk && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-danger mb-1">Atenție Importantă</div>
              <p className="text-muted">
                Această clasificare trebuie luată foarte în serios. Consultă un inginer structurist
                înainte de achiziție și verifică dacă există planuri de consolidare aprobate.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
