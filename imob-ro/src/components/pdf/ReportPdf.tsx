import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";

import type { PdfReportData } from "@/lib/pdf/map-report";

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

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: `1pt solid ${BORDER}`, paddingBottom: 12 },
  brandName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BLUE },
  dateText: { fontSize: 8, color: GRAY },

  // Title block
  titleBlock: { marginBottom: 16 },
  h1: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  address: { fontSize: 9, color: GRAY },

  // Metrics row
  metricsRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  metricCard: { flex: 1, minWidth: 80, backgroundColor: LIGHT_BG, borderRadius: 6, padding: 10, border: `1pt solid ${BORDER}` },
  metricLabel: { fontSize: 8, color: GRAY, marginBottom: 2 },
  metricValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  metricSub: { fontSize: 7, color: GRAY, marginTop: 1 },

  // Section heading
  sectionTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 8, color: "#0F172A" },
  sectionSubtitle: { fontSize: 9, color: GRAY, marginBottom: 8 },

  // Price anchors
  anchorRow: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  anchorCard: { flex: 1, minWidth: 120, borderRadius: 6, padding: 10, border: `1pt solid ${BORDER}` },
  anchorDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  anchorLabel: { fontSize: 8, color: GRAY },
  anchorValue: { fontSize: 12, fontFamily: "Helvetica-Bold" },

  // Photo grid
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  photo: { width: "48%", height: 140, objectFit: "cover", borderRadius: 4 },

  // List items
  listItem: { flexDirection: "row", gap: 6, marginBottom: 6 },
  listBullet: { width: 14, fontSize: 9, fontFamily: "Helvetica-Bold", color: BLUE },
  listText: { flex: 1, fontSize: 9, lineHeight: 1.5 },

  // Checklist
  checkBox: { width: 10, height: 10, borderRadius: 2, border: `1pt solid ${BORDER}`, marginTop: 2, flexShrink: 0 },
  checkText: { fontSize: 9, lineHeight: 1.5 },
  tipText: { fontSize: 7.5, color: GRAY, marginTop: 2, lineHeight: 1.4 },

  // Info box
  infoBox: { backgroundColor: LIGHT_BG, borderRadius: 6, padding: 10, border: `1pt solid ${BORDER}`, marginBottom: 8 },
  infoText: { fontSize: 9, color: GRAY, lineHeight: 1.5 },

  // Disclaimer
  disclaimer: { fontSize: 7, color: GRAY, marginTop: 12, lineHeight: 1.4 },
});

function fmt(n?: number | null, digits = 0): string {
  if (n == null) return "-";
  return Intl.NumberFormat("ro-RO", { maximumFractionDigits: digits }).format(n);
}

function displayFloor(raw?: string | number | null, level?: number | null): string {
  if (raw == null && level == null) return "-";
  const val = String(raw ?? level ?? "").trim().toLowerCase();
  if (!val) return "-";
  if (["ground_floor", "ground", "parter", "p", "0", "floor_0"].includes(val)) return "Parter";
  if (["demisol", "-1"].includes(val)) return "Demisol";
  if (["mansarda", "99"].includes(val)) return "Mansarda";
  const floorUnderscore = val.match(/^floor[_\s]+(\d{1,2})$/i);
  if (floorUnderscore) return `Etaj ${floorUnderscore[1]}`;
  const slash = val.match(/^(p|parter|ground_floor|ground|floor_?\d{0,2}|\d{1,2})\s*\/\s*(\d{1,2})$/i);
  if (slash) {
    const left = slash[1].toLowerCase();
    if (["p", "parter", "ground_floor", "ground", "0", "floor_0"].includes(left)) return `Parter/${slash[2]}`;
    const leftNum = left.match(/\d+/);
    if (leftNum) return `Etaj ${leftNum[0]}/${slash[2]}`;
    return `Etaj ${left}/${slash[2]}`;
  }
  const num = val.match(/^(\d{1,2})$/);
  if (num) return `Etaj ${num[1]}`;
  return String(raw ?? "-");
}

function sellerLabel(type?: string | null): string | null {
  if (type === "agentie") return "Agentie";
  if (type === "proprietar") return "Proprietar";
  if (type === "dezvoltator") return "Dezvoltator";
  return null;
}

export default function ReportPdf(props: {
  data: PdfReportData;
  brand: PdfBrand;
  sections: PdfSections;
}) {
  const { data, brand, sections } = props;
  const cur = data.currency ?? "EUR";
  const today = new Date().toLocaleDateString("ro-RO", { year: "numeric", month: "long", day: "numeric" });

  const overpricing = data.priceEur && data.avmMid
    ? Math.round(((data.priceEur - data.avmMid) / data.avmMid) * 100)
    : null;

  const verdictText = overpricing == null ? null
    : overpricing > 10 ? "Supraevaluat"
    : overpricing > 3 ? "Usor peste piata"
    : overpricing >= -3 ? "Pret corect"
    : "Sub piata";

  return (
    <Document>
      {/* PAGE 1: Overview + Photos */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brandName}>{brand.name}</Text>
            <Text style={s.dateText}>Raport generat {today}</Text>
          </View>
          {brand.logoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={brand.logoUrl} style={{ height: 28 }} />
          ) : null}
        </View>

        <View style={s.titleBlock}>
          <Text style={s.h1}>{data.title || "Raport analiza imobiliara"}</Text>
          {data.address && data.addressIsExact && (
            <Text style={s.address}>{data.address}, Bucuresti</Text>
          )}
          {data.address && !data.addressIsExact && (
            <Text style={s.address}>{data.address} (adresa aproximativa){data.sector ? ` - ${data.sector}` : ""}</Text>
          )}
          {!data.address && data.sector && (
            <Text style={s.address}>{data.sector}, Bucuresti - adresa exacta nu poate fi determinata</Text>
          )}
          {data.url && <Text style={{ ...s.address, marginTop: 2 }}>{data.url}</Text>}
        </View>

        {/* Key metrics */}
        {sections.overview && (
          <View style={s.metricsRow}>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>Pret cerut</Text>
              <Text style={s.metricValue}>{fmt(data.priceEur)} {cur}</Text>
            </View>
            {data.priceEur && data.areaM2 && data.areaM2 > 0 && (
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Pret/mp</Text>
                <Text style={s.metricValue}>{fmt(Math.round(data.priceEur / data.areaM2))} {cur}/mp</Text>
                {data.avmMid && data.areaM2 > 0 && (() => {
                  const actual = Math.round(data.priceEur! / data.areaM2!);
                  const avg = Math.round(data.avmMid / data.areaM2!);
                  const diff = Math.round(((actual - avg) / avg) * 100);
                  if (Math.abs(diff) < 3) return <Text style={s.metricSub}>~media zonei</Text>;
                  return <Text style={{ ...s.metricSub, color: diff > 0 ? "#DC2626" : "#16A34A" }}>{diff > 0 ? `+${diff}` : diff}% vs zona</Text>;
                })()}
              </View>
            )}
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>Suprafata</Text>
              <Text style={s.metricValue}>{data.areaM2 ? `${data.areaM2} mp` : "-"}</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>Camere</Text>
              <Text style={s.metricValue}>{data.rooms ?? "-"}</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>Etaj</Text>
              <Text style={s.metricValue}>{displayFloor(data.floorRaw, data.level)}</Text>
            </View>
            <View style={s.metricCard}>
              <Text style={s.metricLabel}>An constructie</Text>
              <Text style={s.metricValue}>{data.yearBuilt ?? "-"}</Text>
            </View>
          </View>
        )}

        {/* Seller type + verdict */}
        {sections.overview && (
          <View style={{ ...s.metricsRow, marginBottom: 12 }}>
            {sellerLabel(data.sellerType) && (
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Tip vanzator</Text>
                <Text style={s.metricValue}>{sellerLabel(data.sellerType)}</Text>
              </View>
            )}
            {data.hasParking != null && (
              <View style={{ ...s.metricCard, borderColor: data.hasParking ? "#22C55E" : "#F59E0B" }}>
                <Text style={s.metricLabel}>Parcare</Text>
                <Text style={{ ...s.metricValue, color: data.hasParking ? "#16A34A" : "#D97706" }}>
                  {data.hasParking ? "Da" : "Nu"}
                </Text>
              </View>
            )}
            {verdictText && (
              <View style={{ ...s.metricCard, borderColor: overpricing != null && overpricing > 5 ? "#EF4444" : "#22C55E" }}>
                <Text style={s.metricLabel}>Verdict</Text>
                <Text style={{ ...s.metricValue, color: overpricing != null && overpricing > 5 ? "#DC2626" : "#16A34A" }}>
                  {verdictText}{overpricing != null && overpricing !== 0 ? ` (${overpricing > 0 ? "+" : ""}${overpricing}%)` : ""}
                </Text>
              </View>
            )}
            {data.ttsBucket && (
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Timp estimat vanzare</Text>
                <Text style={s.metricValue}>~{data.ttsBucket} zile</Text>
              </View>
            )}
          </View>
        )}

        {/* Price anchors */}
        {sections.priceAnchors && (data.avmMid != null || data.notarialTotal != null) && (
          <>
            <Text style={s.sectionTitle}>Analiza pret</Text>
            <View style={s.anchorRow}>
              {data.notarialTotal != null && (
                <View style={s.anchorCard}>
                  <View style={{ ...s.anchorDot, backgroundColor: "#94A3B8" }} />
                  <Text style={s.anchorLabel}>Valoare notariala</Text>
                  <Text style={s.anchorValue}>{fmt(data.notarialTotal)} {cur}</Text>
                  {data.notarialZone && <Text style={s.metricSub}>{data.notarialZone} ({data.notarialYear})</Text>}
                </View>
              )}
              {data.avmMid != null && (
                <View style={s.anchorCard}>
                  <View style={{ ...s.anchorDot, backgroundColor: "#3B82F6" }} />
                  <Text style={s.anchorLabel}>Estimare piata</Text>
                  <Text style={s.anchorValue}>{fmt(data.avmLow)}-{fmt(data.avmHigh)} {cur}</Text>
                  <Text style={s.metricSub}>Medie: {fmt(data.avmMid)} {cur}</Text>
                </View>
              )}
              {data.priceEur != null && (
                <View style={s.anchorCard}>
                  <View style={{ ...s.anchorDot, backgroundColor: "#EF4444" }} />
                  <Text style={s.anchorLabel}>Pret cerut</Text>
                  <Text style={s.anchorValue}>{fmt(data.priceEur)} {cur}</Text>
                  {overpricing != null && (
                    <Text style={{ ...s.metricSub, color: overpricing > 0 ? "#DC2626" : "#16A34A" }}>
                      {overpricing > 0 ? "+" : ""}{overpricing}% fata de estimare
                    </Text>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {/* Photo grid */}
        {sections.gallery && data.photos && data.photos.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Fotografii</Text>
            <View style={s.photoGrid}>
              {data.photos.slice(0, 6).map((src, i) => (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image key={i} src={src} style={s.photo} />
              ))}
            </View>
          </>
        )}

        <View style={s.pageFooter}>
          <Text>{brand.name} - Raport analiza imobiliara</Text>
          <Text>Pagina 1</Text>
        </View>
      </Page>

      {/* PAGE 2: Detailed Analysis */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brandName}>{brand.name}</Text>
          <Text style={s.dateText}>{data.title ?? "Raport analiza"}</Text>
        </View>

        {/* AVM Details */}
        {sections.avm && data.avmMid != null && (
          <>
            <Text style={s.sectionTitle}>Estimare pret (AVM)</Text>
            <View style={s.metricsRow}>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Interval estimat</Text>
                <Text style={s.metricValue}>{fmt(data.avmLow)} - {fmt(data.avmHigh)} {cur}</Text>
              </View>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Estimare centrala</Text>
                <Text style={s.metricValue}>{fmt(data.avmMid)} {cur}</Text>
              </View>
              {data.avmConf != null && (
                <View style={s.metricCard}>
                  <Text style={s.metricLabel}>Incredere model</Text>
                  <Text style={s.metricValue}>{Math.round(data.avmConf * 100)}%</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Zona si vecinatati */}
        {sections.overview && (data.hasParking != null || data.distMetroM != null) && (
          <>
            <Text style={s.sectionTitle}>Zona si vecinatati</Text>
            <View style={s.metricsRow}>
              {data.hasParking != null && (
                <View style={{ ...s.metricCard, borderColor: data.hasParking ? "#22C55E" : "#F59E0B" }}>
                  <Text style={s.metricLabel}>Loc de parcare</Text>
                  <Text style={{ ...s.metricValue, color: data.hasParking ? "#16A34A" : "#D97706" }}>
                    {data.hasParking ? "Da" : "Nementionat"}
                  </Text>
                </View>
              )}
              {data.distMetroM != null && (
                <View style={{ ...s.metricCard, borderColor: data.distMetroM < 800 ? "#22C55E" : BORDER }}>
                  <Text style={s.metricLabel}>Distanta metrou</Text>
                  <Text style={s.metricValue}>
                    {data.distMetroM < 1000 ? `${Math.round(data.distMetroM)} m` : `${(data.distMetroM / 1000).toFixed(1)} km`}
                  </Text>
                  {data.nearestMetro && <Text style={s.metricSub}>{data.nearestMetro}</Text>}
                </View>
              )}
            </View>
            <View style={s.infoBox}>
              <Text style={s.infoText}>
                {[
                  data.hasParking === true && "Loc de parcare inclus in oferta.",
                  data.hasParking === false && "Nu este mentionat loc de parcare in anunt.",
                  data.distMetroM != null && data.distMetroM < 500 && `Foarte aproape de metrou${data.nearestMetro ? ` (${data.nearestMetro})` : ""} - acces excelent transport public.`,
                  data.distMetroM != null && data.distMetroM >= 500 && data.distMetroM < 1000 && `Metrou la distanta de mers pe jos${data.nearestMetro ? ` (${data.nearestMetro})` : ""}.`,
                  data.distMetroM != null && data.distMetroM >= 1000 && data.distMetroM < 2000 && `Metrou la ${(data.distMetroM / 1000).toFixed(1)} km${data.nearestMetro ? ` (${data.nearestMetro})` : ""} - necesita transport.`,
                  data.distMetroM != null && data.distMetroM >= 2000 && `Departe de metrou (${(data.distMetroM / 1000).toFixed(1)} km) - zona dependenta de masina.`,
                ].filter(Boolean).join(" ")}
              </Text>
            </View>
          </>
        )}

        {/* Yield & TTS */}
        {sections.yield && (data.yieldGross != null || data.estRent != null) && (
          <>
            <Text style={s.sectionTitle}>Randament investitie</Text>
            <View style={s.metricsRow}>
              {data.estRent != null && (
                <View style={s.metricCard}>
                  <Text style={s.metricLabel}>Chirie estimata</Text>
                  <Text style={s.metricValue}>{fmt(data.estRent)} {cur}/luna</Text>
                </View>
              )}
              {data.yieldGross != null && (
                <View style={s.metricCard}>
                  <Text style={s.metricLabel}>Randament brut</Text>
                  <Text style={s.metricValue}>{(data.yieldGross * 100).toFixed(1)}%</Text>
                </View>
              )}
              {data.yieldNet != null && (
                <View style={s.metricCard}>
                  <Text style={s.metricLabel}>Randament net</Text>
                  <Text style={s.metricValue}>{(data.yieldNet * 100).toFixed(1)}%</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* TTS */}
        {sections.tts && data.ttsBucket && (
          <>
            <Text style={s.sectionTitle}>Timp estimat de vanzare</Text>
            <View style={s.infoBox}>
              <Text style={s.infoText}>
                Estimare: ~{data.ttsBucket} zile
                {data.ttsMinMonths != null && data.ttsMaxMonths != null
                  ? ` (intre ${data.ttsMinMonths} si ${data.ttsMaxMonths} luni)`
                  : ""}
              </Text>
            </View>
          </>
        )}

        {/* LLM Insights */}
        {data.llmSummary && (
          <>
            <Text style={s.sectionTitle}>Analiza detaliata</Text>
            <View style={s.infoBox}>
              <Text style={s.infoText}>{data.llmSummary}</Text>
            </View>
            {data.llmRedFlags && data.llmRedFlags.length > 0 && (
              <View style={{ marginTop: 4, marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: "#DC2626", fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Semnale de alarma:</Text>
                {data.llmRedFlags.map((flag, i) => (
                  <Text key={i} style={{ fontSize: 8, color: "#DC2626", marginLeft: 8 }}>{"\u2022"} {flag}</Text>
                ))}
              </View>
            )}
            {data.llmPositives && data.llmPositives.length > 0 && (
              <View style={{ marginTop: 4, marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: "#16A34A", fontFamily: "Helvetica-Bold", marginBottom: 2 }}>Puncte forte:</Text>
                {data.llmPositives.map((pos, i) => (
                  <Text key={i} style={{ fontSize: 8, color: "#16A34A", marginLeft: 8 }}>{"\u2022"} {pos}</Text>
                ))}
              </View>
            )}
          </>
        )}

        {/* Comps summary */}
        {data.compsCount != null && data.compsCount > 0 && (
          <>
            <Text style={s.sectionTitle}>Comparabile</Text>
            <View style={s.infoBox}>
              <Text style={s.infoText}>
                {data.compsCount} proprietati similare identificate in zona.
                {data.zoneMedianEurM2 ? ` Mediana zonei: ${fmt(Math.round(data.zoneMedianEurM2))} EUR/mp.` : ""}
              </Text>
            </View>
          </>
        )}

        {/* Negotiation arguments */}
        <Text style={s.sectionTitle}>Argumente pentru negociere</Text>
        {(() => {
          const args: string[] = [];
          if (overpricing != null && overpricing > 3) args.push(`Pretul cerut este cu ${overpricing}% peste mediana zonei.`);
          if (data.yearBuilt && data.yearBuilt < 1990) args.push(`Cladire din ${data.yearBuilt} - poate necesita investitii in renovare.`);
          if (data.priceEur && data.areaM2 && data.avmMid) {
            const eurM2 = Math.round(data.priceEur / data.areaM2);
            const avgM2 = Math.round(data.avmMid / data.areaM2);
            if (eurM2 > avgM2 * 1.05) args.push(`Pret/mp (${eurM2} EUR) peste media zonei (${avgM2} EUR/mp).`);
          }
          if (args.length === 0) args.push("Pretul este la nivelul pietei - oferta competitiva.");
          const tips = [
            "Verificati costurile de intretinere lunara si fondul de reparatii.",
            "Cereti ultimele facturi de utilitati pentru a estima costul real.",
            "Vizitati apartamentul la ore diferite ale zilei.",
          ];
          while (args.length < 3) args.push(tips[args.length - 1] ?? tips[0]);
          return args.map((a, i) => (
            <View key={i} style={s.listItem}>
              <Text style={s.listBullet}>{i + 1}.</Text>
              <Text style={s.listText}>{a}</Text>
            </View>
          ));
        })()}

        {/* Seller checklist */}
        <Text style={s.sectionTitle}>Intrebari pentru vanzator</Text>
        {(() => {
          const q: Array<{ text: string; tip?: string }> = [];
          if (!data.areaM2) q.push({ text: "Care este suprafata utila exacta (conform cadastru)?" });
          if (data.yearBuilt && data.yearBuilt < 1980) q.push({ text: "Expertiza tehnica a cladirii este disponibila?", tip: "Cladirile construite inainte de 1977 au trecut prin cutremurul din '77." });
          q.push({ text: "Cum sunt vecinii? Exista probleme cu zgomotul?" });
          q.push({ text: "Exista datorii la asociatia de proprietari?", tip: "Cereti extras de la asociatie cu situatia platilor." });
          q.push({ text: "Extras CF actualizat disponibil?", tip: "CF trebuie sa fie emisa in ultimele 30 de zile." });
          q.push({ text: "Cat este intretinerea lunara si ce include?" });
          return q.slice(0, 6).map((item, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 8 }} wrap={false}>
              <View style={s.checkBox} />
              <View style={{ flex: 1 }}>
                <Text style={s.checkText}>{item.text}</Text>
                {item.tip && <Text style={s.tipText}>{item.tip}</Text>}
              </View>
            </View>
          ));
        })()}

        {/* Seismic info */}
        {sections.risk && (
          <>
            <Text style={s.sectionTitle}>Risc seismic</Text>
            <View style={s.infoBox}>
              {data.riskClass ? (
                <Text style={{ ...s.infoText, color: "#DC2626" }}>
                  Incadrare oficiala: {data.riskClass} - Verificati documentele de consolidare.
                </Text>
              ) : (
                <Text style={s.infoText}>
                  Imobilul nu a fost identificat in lista publica AMCCRS. Lipsa din lista nu garanteaza absenta riscului seismic.
                </Text>
              )}
              {data.yearBuilt && data.yearBuilt < 1978 && !data.riskClass && (
                <Text style={{ ...s.infoText, marginTop: 4 }}>
                  Constructie din {data.yearBuilt} (anterioara cutremurului din 1977) - se recomanda verificarea starii structurale.
                </Text>
              )}
            </View>
          </>
        )}

        <View style={s.pageFooter}>
          <Text>{brand.name} - Raport analiza imobiliara</Text>
          <Text>Pagina 2</Text>
        </View>
      </Page>

      {/* PAGE 3: Methodology + Disclaimers */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.brandName}>{brand.name}</Text>
          <Text style={s.dateText}>{data.title ?? "Raport analiza"}</Text>
        </View>

        <Text style={s.sectionTitle}>Metodologie</Text>
        <View style={s.infoBox}>
          <Text style={s.infoText}>
            Estimarea de pret se bazeaza pe compararea cu proprietati similare din zona (suprafata, numar camere, etaj, an constructie) listate in ultimele 60 de zile. Se aplica ajustari pentru: etaj (parter -5%, etaj inalt +2%), an constructie (pre-1980 -3%, post-2000 +2%), si suprafata.
          </Text>
          <Text style={{ ...s.infoText, marginTop: 4 }}>
            Valoarea notariala provine din grila publica a notarilor si reprezinta valoarea minima fiscala, nu pretul de piata. Datele de risc seismic provin din listele publice AMCCRS.
          </Text>
        </View>

        <Text style={s.sectionTitle}>Sfaturi utile</Text>
        <View style={s.infoBox}>
          <Text style={s.infoText}>
            {"\u2022"} Verificati intotdeauna actele de proprietate cu un specialist (avocat sau notar).{"\n"}
            {"\u2022"} Cereti certificat fiscal, CF actualizat, si certificat energetic.{"\n"}
            {"\u2022"} Vizitati apartamentul la ore diferite ale zilei pentru a verifica lumina si zgomotul.{"\n"}
            {"\u2022"} Comparati pretul pe metru patrat cu media zonei, nu doar pretul total.
          </Text>
        </View>

        {/* Provenance */}
        {sections.provenance && data.trustScore != null && (
          <>
            <Text style={s.sectionTitle}>Scor de incredere anunt</Text>
            <View style={s.metricsRow}>
              <View style={s.metricCard}>
                <Text style={s.metricLabel}>Trust Score</Text>
                <Text style={s.metricValue}>{data.trustBadge} - {data.trustScore}/100</Text>
              </View>
            </View>
            {data.trustReasons?.minus && data.trustReasons.minus.length > 0 && (
              <Text style={{ fontSize: 9, color: "#DC2626", marginBottom: 4 }}>
                Semnale de atentie: {data.trustReasons.minus.join(", ")}
              </Text>
            )}
          </>
        )}

        <Text style={s.sectionTitle}>Disclaimer</Text>
        <Text style={s.disclaimer}>
          Acest raport are caracter informativ si orientativ. Estimarile de pret sunt bazate pe date publice disponibile si nu constituie o evaluare oficiala conform standardelor ANEVAR. Nu ne asumam responsabilitatea pentru decizii luate exclusiv pe baza acestui raport. Pentru o evaluare oficiala, consultati un evaluator autorizat ANEVAR. Datele de risc seismic provin din surse publice (AMCCRS - PMB). Lipsa din lista publica nu garanteaza absenta riscului seismic.
        </Text>
        <Text style={{ ...s.disclaimer, marginTop: 8 }}>
          Copyright 2026 OnlyTips SRL (CUI: 43414871). Toate drepturile rezervate. Raport generat de {brand.name} ({data.url ?? ""}).
        </Text>

        <View style={s.pageFooter}>
          <Text>{brand.name} - Raport analiza imobiliara</Text>
          <Text>Pagina 3</Text>
        </View>
      </Page>
    </Document>
  );
}
