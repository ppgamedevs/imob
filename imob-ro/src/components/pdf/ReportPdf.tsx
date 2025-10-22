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
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: { height: 24 },
  h1: { fontSize: 18, marginBottom: 4 },
  h2: { fontSize: 14, marginTop: 16, marginBottom: 6 },
  pill: { padding: 4, borderRadius: 4, color: "#fff", fontSize: 9 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  stat: { padding: 8, border: "1pt solid #eee", borderRadius: 6, minWidth: 120, marginBottom: 6 },
  small: { fontSize: 9, color: "#666" },
  img: { width: "48%", height: 160, objectFit: "cover", marginBottom: 8 },
  link: { fontSize: 9, color: "#2563eb", textDecoration: "underline" },
});

function fmt(n?: number | null, digits = 0) {
  if (n == null) return "—";
  return Intl.NumberFormat("ro-RO", { maximumFractionDigits: digits }).format(n);
}

export default function ReportPdf(props: {
  data: PdfReportData;
  brand: PdfBrand;
  sections: PdfSections;
}) {
  const { data, brand, sections } = props;
  const accent = brand.color || "#6A7DFF";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.h1}>{data.title || "Raport imobiliar"}</Text>
            <Text style={styles.small}>{data.address || data.url || ""}</Text>
          </View>
          {brand.logoUrl ? (
            // react-pdf Image does not accept an alt prop; silence jsx-a11y rule for this usage
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={brand.logoUrl} style={styles.logo} />
          ) : (
            <Text>{brand.name}</Text>
          )}
        </View>

        {sections.overview && (
          <>
            <Text style={styles.h2}>Prezentare</Text>
            <View style={styles.row}>
              <View style={styles.stat}>
                <Text>Preț estimat</Text>
                <Text>
                  <Text>{fmt(data.avmMid)}</Text>
                  {" €"}
                </Text>
              </View>
              <View style={{ ...styles.pill, backgroundColor: accent }}>
                <Text>{brand.name}</Text>
              </View>
              <View style={styles.stat}>
                <Text>Badge preț</Text>
                <Text>{data.priceBadge ?? "—"}</Text>
              </View>
              <View style={styles.stat}>
                <Text>Timp de vânzare</Text>
                <Text>{data.ttsBucket ? `~ ${data.ttsBucket} zile` : "—"}</Text>
              </View>
              <View style={styles.stat}>
                <Text>Chirie estimată</Text>
                <Text>{fmt(data.estRent)} €/lună</Text>
              </View>
            </View>
          </>
        )}

        {sections.avm && (
          <>
            <Text style={styles.h2}>AVM (Estimator preț)</Text>
            <View style={styles.row}>
              <View style={styles.stat}>
                <Text>Interval</Text>
                <Text>
                  <Text>{fmt(data.avmLow)}</Text>
                  {"–"}
                  <Text>{fmt(data.avmHigh)}</Text>
                  {" €"}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text>Mid</Text>
                <Text>{fmt(data.avmMid)} €</Text>
              </View>
              <View style={styles.stat}>
                <Text>Încredere</Text>
                <Text>
                  {data.avmConf != null ? `${Math.round((data.avmConf || 0) * 100)}%` : "—"}
                </Text>
              </View>
            </View>
          </>
        )}

        {sections.provenance && (data.trustScore != null || data.events?.length) ? (
          <>
            <Text style={styles.h2}>Proveniență & Încredere</Text>
            {data.trustScore != null && (
              <View style={styles.row}>
                <View style={styles.stat}>
                  <Text>Trust Score</Text>
                  <Text>
                    {data.trustBadge} · {data.trustScore}/100
                  </Text>
                </View>
              </View>
            )}
            {data.trustReasons?.minus && data.trustReasons.minus.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 10, color: "#dc2626" }}>
                  ⚠ Red flags: {data.trustReasons.minus.join(" · ")}
                </Text>
              </View>
            )}
            {data.trustReasons?.plus && data.trustReasons.plus.length > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 9, color: "#666" }}>
                  + {data.trustReasons.plus.join(" · ")}
                </Text>
              </View>
            )}
            {data.events && data.events.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 10, marginBottom: 6 }}>Timeline:</Text>
                {data.events.slice(0, 6).map((e, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 6, marginBottom: 3 }}>
                    <Text style={styles.small}>
                      {new Date(e.happenedAt).toLocaleDateString("ro-RO")}
                    </Text>
                    <Text style={{ fontSize: 9 }}>· {e.kind}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}

        {sections.gallery && data.photos?.length ? (
          <>
            <Text style={styles.h2}>Galerie</Text>
            <View style={{ ...styles.row, justifyContent: "space-between" }}>
              {data.photos.slice(0, 6).map((src, i) => (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image key={i} src={src} style={styles.img} />
              ))}
            </View>
          </>
        ) : null}
      </Page>
    </Document>
  );
}
