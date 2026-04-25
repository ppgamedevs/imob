import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";

import { REPORT_DISCLAIMER_FULL } from "@/components/common/ReportDisclaimer";
import type { PdfReportData } from "@/lib/pdf/map-report";
import {
  NOTARIAL_NEUTRAL_COPY_RO,
  NOTARIAL_PUBLIC_PRICE_ANCHOR_LABEL_RO,
  NOTARIAL_PUBLIC_PRICE_ANCHOR_SUBCOPY_RO,
} from "@/lib/notarial/notarial-validate";

export type PdfBrand = {
  name: string;
  color: string;
  logoUrl?: string;
};

export type PdfSections = {
  overview: boolean;
  avm: boolean;
  tts: boolean;
  yield: boolean;
  risk: boolean;
  gallery: boolean;
  provenance: boolean;
  priceAnchors: boolean;
};

const BLUE = "#2563EB";
const GRAY = "#64748B";
const LIGHT_BG = "#F8FAFC";
const BORDER = "#E2E8F0";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1E293B" },
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: GRAY,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottom: `1pt solid ${BORDER}`,
    paddingBottom: 10,
  },
  brandName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: BLUE },
  dateText: { fontSize: 8, color: GRAY },
  h1: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 4, color: "#0F172A" },
  address: { fontSize: 9, color: GRAY },
  metricsRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  metricCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: LIGHT_BG,
    borderRadius: 6,
    padding: 10,
    border: `1pt solid ${BORDER}`,
  },
  metricLabel: { fontSize: 8, color: GRAY, marginBottom: 2 },
  metricValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  metricSub: { fontSize: 7, color: GRAY, marginTop: 1 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 6,
    color: "#0F172A",
  },
  infoBox: {
    backgroundColor: LIGHT_BG,
    borderRadius: 6,
    padding: 10,
    border: `1pt solid ${BORDER}`,
    marginBottom: 6,
  },
  infoText: { fontSize: 9, color: "#334155", lineHeight: 1.45 },
  disclaimer: { fontSize: 7, color: GRAY, lineHeight: 1.4 },
  cover: { flex: 1, justifyContent: "center" },
  coverBrand: { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#0F172A", marginBottom: 4 },
  coverTitle: { fontSize: 15, fontFamily: "Helvetica-Bold", lineHeight: 1.3, color: "#0F172A" },
  coverSub: { fontSize: 9, color: GRAY, marginTop: 6, lineHeight: 1.4 },
  coverPrice: { fontSize: 20, fontFamily: "Helvetica-Bold", color: BLUE, marginTop: 12 },
  coverMeta: { fontSize: 9, color: "#334155", marginTop: 8, lineHeight: 1.5 },
  coverDisclaimer: { fontSize: 7, color: GRAY, marginTop: 20, lineHeight: 1.5 },
  tableHeader: { flexDirection: "row", backgroundColor: "#EEF2FF", borderBottom: `1pt solid ${BORDER}` },
  tableRow: { flexDirection: "row", borderBottom: `0.4pt solid ${BORDER}` },
  th: { fontSize: 6.5, fontFamily: "Helvetica-Bold", padding: 3, color: "#0F172A" },
  td: { fontSize: 6.5, padding: 3, color: "#1E293B" },
  listItem: { flexDirection: "row", gap: 5, marginBottom: 3 },
  listBullet: { width: 10, fontSize: 8, color: BLUE },
  listText: { flex: 1, fontSize: 8, lineHeight: 1.4 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  photo: { width: "31%", height: 90, objectFit: "cover", borderRadius: 3 },
  checkBox: {
    width: 8,
    height: 8,
    border: `0.5pt solid ${BORDER}`,
    marginTop: 1,
    marginRight: 4,
  },
  checkText: { fontSize: 8, lineHeight: 1.4, flex: 1 },
  monoMsg: { fontSize: 8, lineHeight: 1.4, color: "#0F172A" },
});

function fmt(n?: number | null, digits = 0): string {
  if (n == null) return "-";
  return Intl.NumberFormat("ro-RO", { maximumFractionDigits: digits }).format(n);
}

function fmtDistanceM(m: number | null | undefined): string {
  if (m == null) return "-";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

function displayFloor(raw?: string | number | null, level?: number | null): string {
  if (raw == null && level == null) return "-";
  const val = String(raw ?? level ?? "")
    .trim()
    .toLowerCase();
  if (!val) return "-";
  if (["ground_floor", "ground", "parter", "p", "0", "floor_0"].includes(val)) return "Parter";
  if (["demisol", "-1"].includes(val)) return "Demisol";
  if (["mansarda", "99"].includes(val)) return "Mansarda";
  const floorUnderscore = val.match(/^floor[_\s]+(\d{1,2})$/i);
  if (floorUnderscore) return `Etaj ${floorUnderscore[1]}`;
  const slash = val.match(
    /^(p|parter|ground_floor|ground|floor_?\d{0,2}|\d{1,2})\s*\/\s*(\d{1,2})$/i,
  );
  if (slash) {
    const left = slash[1].toLowerCase();
    if (["p", "parter", "ground_floor", "ground", "0", "floor_0"].includes(left))
      return `Parter/${slash[2]}`;
    const leftNum = left.match(/\d+/);
    if (leftNum) return `Etaj ${leftNum[0]}/${slash[2]}`;
    return `Etaj ${left}/${slash[2]}`;
  }
  const num = val.match(/^(\d{1,2})$/);
  if (num) return `Etaj ${num[1]}`;
  return String(raw ?? "-");
}

function riskLevelText(level?: string | null): string {
  if (level === "high") return "Ridicat";
  if (level === "medium") return "Mediu";
  if (level === "low") return "Scazut";
  return "Necunoscut";
}

function computeAcquisitionCosts(
  priceEur: number,
  commissionStatus: string,
  vatAmount?: number | null,
) {
  const priceRon = priceEur * 5;
  const notarLow = Math.max(250, Math.round(priceEur * 0.01));
  const notarHigh = Math.max(400, Math.round(priceEur * 0.02));
  let impozitEur = 0;
  if (priceRon > 450_000) impozitEur = Math.round(((priceRon - 450_000) * 0.03) / 5);
  const intabulareLow = 50;
  const intabulareHigh = 100;
  const evaluatorLow = 60;
  const evaluatorHigh = 100;
  const specialistLow = 200;
  const specialistHigh = 500;
  let totalLow =
    notarLow + impozitEur + intabulareLow + evaluatorLow + specialistLow + (vatAmount ?? 0);
  let totalHigh =
    notarHigh + impozitEur + intabulareHigh + evaluatorHigh + specialistHigh + (vatAmount ?? 0);
  if (commissionStatus === "standard") {
    totalLow += Math.round(priceEur * 0.01);
    totalHigh += Math.round(priceEur * 0.03);
  }
  return { totalLow, totalHigh, notarLow, notarHigh, impozitEur };
}

const VERDICT_COLORS: Record<string, { bg: string; text: string }> = {
  RECOMANDAT: { bg: "#DCFCE7", text: "#166534" },
  ATENTIE: { bg: "#FEF9C3", text: "#854D0E" },
  EVITA: { bg: "#FEE2E2", text: "#991B1B" },
};

export default function ReportPdf(props: {
  data: PdfReportData;
  brand: PdfBrand;
  sections: PdfSections;
}) {
  const { data, brand, sections } = props;
  const cur = data.currency ?? "EUR";
  const reportDate = data.reportDateRo ?? "-";
  const vCfg = VERDICT_COLORS[data.verdictLabel ?? ""] ?? VERDICT_COLORS.ATENTIE;
  const neg = data.pdfNegotiation;
  const compRows = data.compRows ?? [];
  const eurM2List =
    data.priceEur && data.areaM2 && data.areaM2 > 0
      ? Math.round(data.priceEur / data.areaM2)
      : null;
  const overpricing =
    data.diffVsFairPct != null
      ? data.diffVsFairPct
      : data.priceEur && data.avmMid
        ? Math.round(((data.priceEur - data.avmMid) / data.avmMid) * 100)
        : null;

  const fairLabel =
    data.fairRangeSource === "comparabile" ? "reper (comparabile apropiate)" : "reper (model AVM)";

  return (
    <Document>
      {/* 1. Copertă */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          <Text style={s.coverBrand}>{brand.name}</Text>
          <Text style={s.coverTitle}>{data.title || "Raport cumpărător"}</Text>
          {data.address ? <Text style={s.coverSub}>{data.address}</Text> : null}
          <Text style={s.coverPrice}>
            {data.priceEur != null
              ? `${fmt(data.priceEur)} ${cur}${data.hasPlusTVA ? " + TVA" : ""}`
              : "Preț nedisponibil în export"}
          </Text>
          <Text style={s.coverMeta}>
            Data raportului: {reportDate}
            {"\n"}
            Încredere (rezumat): {data.reportConfidenceLabelRo ?? "-"}
          </Text>
          <Text style={s.coverDisclaimer}>
            {data.coverDisclaimerShortRo ??
              "Informativ pentru cumpărător, nu consultanță juridică sau evaluare ANEVAR. Verifică cifrele la fața locului."}
          </Text>
        </View>
        {brand.logoUrl ? (
          <View style={{ position: "absolute", top: 28, right: 36 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={brand.logoUrl} style={{ height: 26 }} />
          </View>
        ) : null}
        <View style={s.pageFooter} fixed>
          <Text>{brand.name} · copertă</Text>
        </View>
      </Page>

      {/* 2. Rezumat executiv */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>{brand.name}</Text>
            <Text style={s.dateText}>Rezumat executiv</Text>
          </View>
        </View>
        <View
          style={{ backgroundColor: vCfg.bg, borderRadius: 6, padding: 10, marginBottom: 10 }}
        >
          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: vCfg.text, marginBottom: 4 }}>
            {data.buyerVerdictTitle ?? "Verdict cumpărător"}
          </Text>
          {data.buyerVerdictSubtitle ? (
            <Text style={{ fontSize: 8.5, color: vCfg.text, lineHeight: 1.45 }}>
              {data.buyerVerdictSubtitle}
            </Text>
          ) : null}
          {data.verdictSummary ? (
            <Text style={{ fontSize: 8, color: "#1E293B", marginTop: 5, lineHeight: 1.4 }}>
              {data.verdictSummary}
            </Text>
          ) : null}
        </View>

        {data.fairRangeMid != null && data.fairRangeLow != null && data.fairRangeHigh != null && (
          <>
            <Text style={s.sectionTitle}>Reper de preț (interfață orientativă)</Text>
            <View style={s.infoBox}>
              <Text style={s.infoText}>
                Sursa reper: {data.fairRangeSource === "comparabile" ? "comparabile filtrate" : "estimare model (anunțuri + caracteristici)"}.{" "}
                Interval: {fmt(data.fairRangeLow)} {cur} – {fmt(data.fairRangeHigh)} {cur} (centrul la {fmt(data.fairRangeMid)} {cur}).
                Nu este o medie de tranzacții oficiale pe adresă.
              </Text>
            </View>
            {data.diffVsFairExplanationRo ? (
              <View style={s.infoBox}>
                <Text style={{ fontSize: 8, color: "#0F172A", lineHeight: 1.45 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>Diferență față de reper: </Text>
                  {overpricing != null
                    ? `indicativ ${overpricing > 0 ? "+" : ""}${overpricing}% față de ${fairLabel} (${data.diffVsFairExplanationRo})`
                    : data.diffVsFairExplanationRo}
                </Text>
              </View>
            ) : null}
          </>
        )}

        <Text style={s.sectionTitle}>Riscuri principale</Text>
        <View style={s.infoBox}>
          {(data.executiveRisksRo && data.executiveRisksRo.length > 0
            ? data.executiveRisksRo
            : data.dealKillers && data.dealKillers.length > 0
              ? data.dealKillers
              : ["Nu sunt semnale critice explicite din datele automate, verificare practică obligatorie."]
          ).map((line, i) => (
            <View key={i} style={s.listItem} wrap={false}>
              <Text style={s.listBullet}>{"\u2022"}</Text>
              <Text style={s.listText}>{line}</Text>
            </View>
          ))}
        </View>

        {data.executiveNegotiationAngleRo && (
          <>
            <Text style={s.sectionTitle}>Unghi de negociere (rezumat)</Text>
            <View style={s.infoBox}>
              <Text style={s.infoText}>{data.executiveNegotiationAngleRo}</Text>
            </View>
          </>
        )}

        <View style={s.pageFooter} fixed>
          <Text>{brand.name} · rezumat</Text>
        </View>
      </Page>

      {/* 3. Inteligență de preț */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brandName}>{brand.name}</Text>
          <Text style={s.dateText}>Inteligență de preț</Text>
        </View>
        {sections.overview && (
          <View style={s.metricsRow}>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>Preț cerut</Text>
              <Text style={s.metricValue}>
                {fmt(data.priceEur)} {cur}
                {data.hasPlusTVA ? " + TVA" : ""}
              </Text>
            </View>
            {eurM2List != null && (
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Preț pe m² (listă)</Text>
                <Text style={s.metricValue}>
                  {fmt(eurM2List)} {cur}/m²
                </Text>
              </View>
            )}
            {data.zoneMedianEurM2 != null && (
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Mediana zonei (m², anunțuri)</Text>
                <Text style={s.metricValue}>
                  {fmt(Math.round(data.zoneMedianEurM2))} {cur}
                </Text>
              </View>
            )}
          </View>
        )}

        {sections.avm && data.fairRangeMid != null && (
          <>
            <Text style={s.sectionTitle}>Interval estimat</Text>
            <View style={s.metricsRow}>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Jos</Text>
                <Text style={s.metricValue}>
                  {fmt(data.fairRangeLow)} {cur}
                </Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Mijloc</Text>
                <Text style={s.metricValue}>
                  {fmt(data.fairRangeMid)} {cur}
                </Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Sus</Text>
                <Text style={s.metricValue}>
                  {fmt(data.fairRangeHigh)} {cur}
                </Text>
              </View>
              {data.avmConf != null && (
                <View style={s.metricCard}>
                  <Text style={s.metricLabel}>Încredere model (AVM, unde există)</Text>
                  <Text style={s.metricValue}>{Math.round(data.avmConf * 100)}%</Text>
                </View>
              )}
            </View>
          </>
        )}

        {sections.priceAnchors && (data.notarialTotal != null || data.notarialShowNeutralNote) && (
          <>
            <Text style={s.sectionTitle}>{NOTARIAL_PUBLIC_PRICE_ANCHOR_LABEL_RO}</Text>
            <View style={s.infoBox}>
              {data.notarialTotal != null ? (
                <Text style={s.infoText}>
                  Total orientativ: {fmt(data.notarialTotal)} {cur}
                  {data.notarialEurM2 != null
                    ? ` (${fmt(data.notarialEurM2)} ${cur}/m²)`
                    : ""}
                  {data.notarialZone ? `. Zonă (reper fiscal): ${data.notarialZone}` : ""}
                  {data.notarialYear != null ? ` (${data.notarialYear}).` : "."}
                </Text>
              ) : data.notarialShowNeutralNote ? (
                <Text style={s.infoText}>{NOTARIAL_NEUTRAL_COPY_RO}</Text>
              ) : null}
              <Text style={{ ...s.infoText, marginTop: 4, fontSize: 8, color: GRAY }}>
                {NOTARIAL_PUBLIC_PRICE_ANCHOR_SUBCOPY_RO}
              </Text>
            </View>
          </>
        )}

        <Text style={s.sectionTitle}>Sinteza comparabile</Text>
        <View style={s.infoBox}>
          <Text style={s.infoText}>
            {data.compsCount != null && data.compsCount > 0
              ? `Am păstrat ${data.compsCount} potriviri în zona analizei, cu potrivire după arie, distanță și scor.`
              : "Nu există comparabile suficiente în acest export pentru o poziționare automată tare."}
            {data.compsConfidenceNoteRo ? ` ${data.compsConfidenceNoteRo}` : ""}
          </Text>
        </View>

        {sections.tts && data.ttsBucket && (
          <>
            <Text style={s.sectionTitle}>Lichiditate (orientativ)</Text>
            <Text style={s.infoText}>
              Timp estimat de vânzare: ~{data.ttsBucket} zile
              {data.ttsMinMonths != null && data.ttsMaxMonths != null
                ? ` (între ${data.ttsMinMonths} și ${data.ttsMaxMonths} luni în scenarii diferite).`
                : "."}
            </Text>
          </>
        )}

        {sections.yield && data.canShowYield !== false && data.yieldGross != null && (
          <>
            <Text style={s.sectionTitle}>Randament (orientativ)</Text>
            <View style={s.metricsRow}>
              {data.estRent != null && (
                <View style={s.metricCard}>
                  <Text style={s.metricLabel}>Chirie model</Text>
                  <Text style={s.metricValue}>
                    {fmt(data.estRent)} {cur}/lună
                  </Text>
                </View>
              )}
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Brut</Text>
                <Text style={s.metricValue}>{(data.yieldGross * 100).toFixed(1)}%</Text>
              </View>
            </View>
          </>
        )}

        <View style={s.pageFooter} fixed>
          <Text>{brand.name} · preț</Text>
        </View>
      </Page>

      {/* 4. Tabel comparabile */}
      {compRows.length > 0 && (
        <Page size="A4" style={s.page} wrap>
          <View style={s.header}>
            <Text style={s.brandName}>{brand.name}</Text>
            <Text style={s.dateText}>Comparabile (top {compRows.length})</Text>
          </View>
          <Text style={s.sectionTitle}>Tabel (anunțuri publice, nu tranzacții oficiale)</Text>
          <View style={s.tableHeader}>
            <Text style={{ ...s.th, width: "12%" }}>Distanță</Text>
            <Text style={{ ...s.th, width: "10%" }}>m²</Text>
            <Text style={{ ...s.th, width: "8%" }}>Cam</Text>
            <Text style={{ ...s.th, width: "16%" }}>Preț</Text>
            <Text style={{ ...s.th, width: "14%" }}>EUR/m²</Text>
            <Text style={{ ...s.th, width: "40%" }}>Titlu scurt</Text>
          </View>
          {compRows.map((r, i) => (
            <View style={s.tableRow} key={i} wrap={false}>
              <Text style={{ ...s.td, width: "12%" }}>{fmtDistanceM(r.distanceM)}</Text>
              <Text style={{ ...s.td, width: "10%" }}>{r.areaM2 != null ? fmt(r.areaM2, 1) : "-"}</Text>
              <Text style={{ ...s.td, width: "8%" }}>{r.rooms ?? "-"}</Text>
              <Text style={{ ...s.td, width: "16%" }}>
                {r.priceEur != null ? `${fmt(r.priceEur)} ${cur}` : "-"}
              </Text>
              <Text style={{ ...s.td, width: "14%" }}>{r.eurM2 != null ? fmt(r.eurM2) : "-"}</Text>
              <Text style={{ ...s.td, width: "40%" }}>{r.titleShort ?? "-"}</Text>
            </View>
          ))}
          <View style={{ marginTop: 8 }} />
          <Text style={s.disclaimer}>
            Nota de încredere: modelul se bazează pe anunțuri și potrivire automată. Pot exista diferențe de
            stare, etaj, finisaje sau erori de listare. Tratează tabelul ca reper, nu ca contract.
          </Text>
          <View style={s.pageFooter} fixed>
            <Text>{brand.name} · comparabile</Text>
          </View>
        </Page>
      )}

      {/* 5. Riscuri și goluri de date */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brandName}>{brand.name}</Text>
          <Text style={s.dateText}>Riscuri și calitatea datelor</Text>
        </View>
        {sections.risk && (
          <>
            <Text style={s.sectionTitle}>Fisa locuință (sinteză)</Text>
            <View style={s.metricsRow}>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>An construcție</Text>
                <Text style={s.metricValue}>{data.yearBuilt ?? "Nespecificat"}</Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Etaj</Text>
                <Text style={s.metricValue}>{displayFloor(data.floorRaw, data.level)}</Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Clasă seismică (sursă publică)</Text>
                <Text style={s.metricValue}>{data.riskClass ?? "Lipsă din potrivire automată"}</Text>
              </View>
            </View>
            <View style={s.infoBox}>
              <Text style={s.infoText}>
                {data.riskClass
                  ? "Clasă repertoriată public (surse AMCCRS, când potrivirea reușește). Nu înlocuiește structurist sau documente la dosar."
                  : "Imobilul nu a fost găsit în setul public prelucrat aici. Lipsa nu exclude risc, verifici la surse oficiale."}
              </Text>
            </View>
            {data.riskStackOverallScore != null && (
              <View style={s.infoBox}>
                <Text style={s.infoText}>
                  Nivel agregat risc: {riskLevelText(data.riskStackOverallLevel)}
                  {data.riskStackOverallScore != null ? ` (${data.riskStackOverallScore}/100).` : "."}
                  {data.riskStackTopRisk
                    ? ` Punct reținut: ${data.riskStackTopRisk}.`
                    : ""}
                </Text>
                {data.riskStackInsights && data.riskStackInsights.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    {data.riskStackInsights.slice(0, 4).map((t, i) => (
                      <View key={i} style={s.listItem} wrap={false}>
                        <Text style={s.listBullet}>{"\u2022"}</Text>
                        <Text style={s.listText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {data.riskStackRecommendedNextStep && (
                  <Text style={{ ...s.infoText, marginTop: 6, color: "#065F46" }}>
                    Pas sugerat: {data.riskStackRecommendedNextStep}
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        <Text style={s.sectionTitle}>Atenționări: date care lipsesc sau subțiresc concluzia</Text>
        <View style={s.infoBox}>
          {(data.dataGapsRo && data.dataGapsRo.length > 0
            ? data.dataGapsRo
            : [
                "Nu s-au putut genera avertismente explicite suplimentare. Verifică oricum actele, fondul, și vecinătatea pe teren.",
              ]
          ).map((g, i) => (
            <View key={i} style={s.listItem} wrap={false}>
              <Text style={s.listBullet}>{"\u2022"}</Text>
              <Text style={s.listText}>{g}</Text>
            </View>
          ))}
        </View>

        <View style={s.pageFooter} fixed>
          <Text>{brand.name} · risc</Text>
        </View>
      </Page>

      {/* 6. Asistent negociere */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brandName}>{brand.name}</Text>
          <Text style={s.dateText}>Asistent de negociere (informativ)</Text>
        </View>
        {neg && (
          <>
            <View style={s.infoBox}>
              <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>{neg.strategyTitleRo}</Text>
              <Text style={{ ...s.infoText, marginTop: 4 }}>{neg.strategyBodyRo}</Text>
            </View>
            <Text style={s.sectionTitle}>Argumente</Text>
            {neg.leverageBulletsRo.map((b, i) => (
              <View key={i} style={s.listItem} wrap={false}>
                <Text style={s.listBullet}>{i + 1}.</Text>
                <Text style={s.listText}>{b}</Text>
              </View>
            ))}
            <Text style={s.sectionTitle}>Întrebări practice pentru agent sau proprietar</Text>
            {neg.practicalQuestionsRo.map((q, i) => (
              <View key={i} style={s.listItem} wrap={false}>
                <Text style={s.listBullet}>{"\u2022"}</Text>
                <Text style={s.listText}>{q}</Text>
              </View>
            ))}
            <Text style={s.sectionTitle}>Mesaj sugerat (WhatsApp / scurt)</Text>
            <View style={{ ...s.infoBox, backgroundColor: "#FAFAF9" }}>
              <Text style={s.monoMsg}>{neg.suggestedMessageRo}</Text>
            </View>
            <Text style={s.disclaimer}>
              Acesta este un șablon, nu o garanție de răspuns. Nu oferim consultanță juridică. Redactează
              pe tonul tău.
            </Text>
          </>
        )}
        <View style={s.pageFooter} fixed>
          <Text>{brand.name} · negociere</Text>
        </View>
      </Page>

      {/* 7. Checklist, costuri, metodologie, disclaimer */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brandName}>{brand.name}</Text>
          <Text style={s.dateText}>Checklist finală (înainte de ofertă fermă)</Text>
        </View>
        <Text style={s.sectionTitle}>Verificări recomandate (tehnic / juridic)</Text>
        {(data.finalChecklistRo && data.finalChecklistRo.length > 0
          ? data.finalChecklistRo
          : [
              "Acte, sarcini, litigii: confirmare la notar sau avocat.",
              "Asociație, fond, datorii, lucrări: extras și procese.",
            ]
        ).map((item, i) => (
          <View
            key={i}
            style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 5 }}
            wrap={false}
          >
            <View style={s.checkBox} />
            <Text style={s.checkText}>{item}</Text>
          </View>
        ))}

        {data.priceEur != null && data.priceEur > 0 && data.commissionStatus && (
          <>
            <Text style={s.sectionTitle}>Costuri aproximative până la act (orientativ)</Text>
            {(() => {
              const costs = computeAcquisitionCosts(
                data.priceEur!,
                data.commissionStatus,
                data.vatAmount,
              );
              return (
                <View style={s.infoBox}>
                  <Text style={s.infoText}>
                    Total indicativ: {fmt(costs.totalLow)} – {fmt(costs.totalHigh)} {cur} (fără a include
                    toate comisioanele posibile sau scenarii bancare). Detaliu: taxe notariale, impozit
                    acolo unde e cazul, intabulare, evaluare, specialiști.
                  </Text>
                </View>
              );
            })()}
          </>
        )}

        <Text style={s.sectionTitle}>Metodologie (scurt)</Text>
        <View style={s.infoBox}>
          <Text style={s.infoText}>
            {data.methodologyBodyRo ??
              "Folosim anunțuri similare, ajustări de model, și surse publice. Limitările includ lipsa tranzacțiilor oficiale pe fiecare adresă, erori de anunț, schimbare rapidă a pieței, și riscul de potrivire greșită a adresei pentru straturi publice. Nu înlocuiește evaluare autorizată."}
          </Text>
        </View>

        <Text style={s.sectionTitle}>Dezvăluiri (limitare răspundere)</Text>
        <Text style={s.disclaimer}>{REPORT_DISCLAIMER_FULL}</Text>
        <Text style={s.disclaimer}>
          Datele de risc seismic provin din surse publice (de ex. AMCCRS, când potrivirea reușește). Lipsa
          din listă publică nu înseamnă neapărat absența riscului: verifică la dosar și la specialist.
          Copyright OnlyTips SRL. Raport generat {reportDate} pentru {brand.name}.
        </Text>

        {sections.provenance && data.trustScore != null && (
          <>
            <Text style={s.sectionTitle}>Scor anunț (proveniență limitată)</Text>
            <Text style={s.infoText}>
              Trust: {data.trustBadge} ({data.trustScore}/100). Semnale negative posibile:{" "}
              {data.trustReasons?.minus?.join(", ") ?? "-"}.
            </Text>
          </>
        )}

        <View style={s.pageFooter} fixed>
          <Text>{brand.name} · metodologie</Text>
        </View>
      </Page>

      {/* 8. Anexa: galerie + detalii (opțional) */}
      {sections.gallery && data.photos && data.photos.length > 0 && (
        <Page size="A4" style={s.page}>
          <View style={s.header}>
            <Text style={s.brandName}>{brand.name}</Text>
            <Text style={s.dateText}>Galerie (din anunț)</Text>
          </View>
          <View style={s.photoGrid}>
            {data.photos.slice(0, 6).map((src, i) => (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image key={i} src={src} style={s.photo} />
            ))}
          </View>
          <Text style={s.disclaimer}>
            Fotografiile apar ca în sursa publică. Randări sau imagini de prezentare pot diferi de starea
            reală; verifică la vizionare.
          </Text>
          {data.llmSummary && sections.overview && (
            <>
              <Text style={s.sectionTitle}>Note din textul anunțului</Text>
              <View style={s.infoBox}>
                <Text style={s.infoText}>{data.llmSummary}</Text>
              </View>
            </>
          )}
          <View style={s.pageFooter} fixed>
            <Text>{brand.name} · anexă</Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
