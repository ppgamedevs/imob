import * as React from "react";
import { CheckCircle2, AlertCircle, Image as ImageIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * QualityCard - Data quality assessment
 * 
 * Shows:
 * - Overall completeness score
 * - Photo quality metrics
 * - Text quality metrics
 * - Red flags if present
 */

export interface QualityCardProps {
  overallScore: number; // 0-100
  completeness: number; // 0-100, % of fields populated
  photoQuality: {
    count: number;
    score: number; // 0-100
    hasExterior?: boolean;
    hasInterior?: boolean;
    hasFloorPlan?: boolean;
  };
  textQuality: {
    descriptionLength: number;
    score: number; // 0-100
    hasDetails?: boolean;
  };
  redFlags?: string[];
}

export default function QualityCard({
  overallScore,
  completeness,
  photoQuality,
  textQuality,
  redFlags,
}: QualityCardProps) {
  const qualityLevel =
    overallScore >= 80
      ? { label: "Excellent", color: "text-success", bgColor: "bg-success/10" }
      : overallScore >= 60
      ? { label: "Bun", color: "text-info", bgColor: "bg-info/10" }
      : overallScore >= 40
      ? { label: "Acceptabil", color: "text-warning", bgColor: "bg-warning/10" }
      : { label: "Scăzut", color: "text-danger", bgColor: "bg-danger/10" };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Calitate Anunț</h2>
        <p className="text-sm text-muted">
          Evaluare completitudine și acuratețe informații
        </p>
      </div>

      {/* Overall Score */}
      <div className={cn("p-4 rounded-lg", qualityLevel.bgColor)}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Scor General</span>
          <Badge variant="outline" className={qualityLevel.color}>
            {qualityLevel.label}
          </Badge>
        </div>
        <div className="flex items-end gap-2">
          <span className={cn("text-3xl font-bold", qualityLevel.color)}>
            {overallScore}
          </span>
          <span className="text-lg text-muted mb-0.5">/100</span>
        </div>
        <div className="mt-3 h-2 bg-muted/30 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              qualityLevel.color.replace("text-", "bg-")
            )}
            style={{ width: `${overallScore}%` }}
          />
        </div>
      </div>

      {/* Completeness */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Completitudine Date</span>
          <span className="font-medium">{completeness}%</span>
        </div>
        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${completeness}%` }}
          />
        </div>
        <p className="text-xs text-muted">
          {completeness >= 80
            ? "Toate informațiile esențiale sunt prezente"
            : completeness >= 60
            ? "Majoritatea câmpurilor sunt completate"
            : "Lipsesc informații importante"}
        </p>
      </div>

      {/* Photo Quality */}
      <div className="p-3 bg-muted/30 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted" />
            <span className="text-sm font-medium">Calitate Fotografii</span>
          </div>
          <Badge
            variant="outline"
            className={
              photoQuality.score >= 70
                ? "border-success/50 text-success"
                : photoQuality.score >= 50
                ? "border-info/50 text-info"
                : "border-warning/50 text-warning"
            }
          >
            {photoQuality.score}/100
          </Badge>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted">Număr fotografii:</span>
            <span className="font-medium">{photoQuality.count}</span>
          </div>

          {photoQuality.hasExterior !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-muted">Exterior:</span>
              {photoQuality.hasExterior ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-warning" />
              )}
            </div>
          )}

          {photoQuality.hasInterior !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-muted">Interior:</span>
              {photoQuality.hasInterior ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-warning" />
              )}
            </div>
          )}

          {photoQuality.hasFloorPlan !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-muted">Plan:</span>
              {photoQuality.hasFloorPlan ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-warning" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Text Quality */}
      <div className="p-3 bg-muted/30 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted" />
            <span className="text-sm font-medium">Calitate Text</span>
          </div>
          <Badge
            variant="outline"
            className={
              textQuality.score >= 70
                ? "border-success/50 text-success"
                : textQuality.score >= 50
                ? "border-info/50 text-info"
                : "border-warning/50 text-warning"
            }
          >
            {textQuality.score}/100
          </Badge>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted">Lungime descriere:</span>
            <span className="font-medium">
              {textQuality.descriptionLength} caractere
            </span>
          </div>

          {textQuality.hasDetails !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-muted">Detalii tehnice:</span>
              {textQuality.hasDetails ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-warning" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Red Flags */}
      {redFlags && redFlags.length > 0 && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
          <div className="flex items-start gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
            <span className="text-sm font-semibold text-danger">
              Semne de Atenție ({redFlags.length})
            </span>
          </div>
          <ul className="space-y-1 text-xs text-muted pl-6">
            {redFlags.map((flag, idx) => (
              <li key={idx} className="list-disc">
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interpretation */}
      <div className="p-3 bg-muted/30 rounded-lg text-sm">
        <div className="font-medium mb-1">Ce Înseamnă:</div>
        <p className="text-muted">
          {overallScore >= 80 ? (
            <>
              Anunț <strong>foarte complet</strong> cu fotografii de calitate și
              descriere detaliată. Vânzătorul pare serios și transparent.
            </>
          ) : overallScore >= 60 ? (
            <>
              Anunț <strong>decent</strong>, dar ar putea beneficia de mai multe
              fotografii sau detalii suplimentare.
            </>
          ) : (
            <>
              Anunț <strong>incomplet</strong>. Lipsesc informații importante.
              Solicită detalii suplimentare înainte de vizionare.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
