/* eslint-disable jsx-a11y/alt-text */
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";

Font.register({ family: "Inter", fonts: [] });

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, fontFamily: "Inter" },
  header: { marginBottom: 12, flexDirection: "row", alignItems: "center" },
  logo: { width: 48, height: 48, marginRight: 12 },
  title: { fontSize: 16, fontWeight: 700 },
  section: { marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
});

export type ReportDocData = {
  address?: string | null;
  price?: number | null;
  avm?: { low?: number; high?: number; conf?: number } | null;
  tts?: string | null;
  yieldNet?: number | null;
  riskSeismic?: number | null;
  conditionScore?: number | null;
  comps?: Array<Record<string, unknown>> | null;
  photos?: string[] | null;
  agencyLogo?: string | null;
  brandColor?: string | null;
  negotiableProb?: number | null; // 0..1 probability price will drop in 14 days
  time_to_metro_min?: number | null;
};

// Backwards-compatible alias used by other files
export type ReportData = ReportDocData;

export function ReportDoc({ data }: { data: ReportDocData }) {
  const negotiableText =
    data.negotiableProb != null ? `${Math.round((data.negotiableProb ?? 0) * 100)}%` : "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.header, { backgroundColor: data.brandColor ?? undefined }]}>
          {data?.agencyLogo ? (
            <Image src={data.agencyLogo} style={styles.logo} />
          ) : (
            data?.address && <Image src="/logo.png" style={styles.logo} />
          )}
          <View>
            <Text style={styles.title}>{data.address ?? "Adresa necunoscuta"}</Text>
            <Text>{`Preț: ${data.price ?? "—"} EUR`}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700 }}>AVM</Text>
          <Text>
            {data.avm ? `${data.avm.low} - ${data.avm.high} (conf ${data.avm.conf})` : "—"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700 }}>TTS</Text>
          <Text>{data.tts ?? "—"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700 }}>Timp până la metrou</Text>
          <Text>{data.time_to_metro_min != null ? `${data.time_to_metro_min} min` : "—"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700 }}>Negociabil?</Text>
          <Text>{negotiableText}</Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700 }}>Randament</Text>
          <Text>{data.yieldNet ? `${(data.yieldNet * 100).toFixed(2)}%` : "—"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700 }}>Risc seismic</Text>
          <Text>{data.riskSeismic ?? "—"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700 }}>Stare (din poze)</Text>
          <Text>
            {data.conditionScore != null ? `${Math.round(data.conditionScore * 100)}%` : "—"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontWeight: 700 }}>Comps</Text>
          {Array.isArray(data.comps) && data.comps.length ? (
            data.comps.slice(0, 5).map((c, i) => {
              const comp = c as Record<string, unknown>;
              const title = (comp.title as string) ?? (comp.address as string) ?? "comp";
              const price = (comp.price as number) ?? "—";
              return <Text key={i}>{`${title} — ${price}`}</Text>;
            })
          ) : (
            <Text>—</Text>
          )}
        </View>

        {/* If photos exist, render them on a second page (simple multi-page) */}
        {Array.isArray(data.photos) && data.photos.length ? (
          <Page size="A4" style={styles.page}>
            <Text style={{ fontWeight: 700, marginBottom: 8 }}>Fotografii</Text>
            {data.photos.slice(0, 6).map((p, i) => (
              // react-pdf Image accepts runtime string src
              <Image key={i} src={p as string} style={{ width: 160, height: 120, margin: 4 }} />
            ))}
          </Page>
        ) : null}

        <Page size="A4" style={styles.page}>
          <Text style={{ fontWeight: 700 }}>Cum calculăm</Text>
          <Text>
            Folosim AVM bazat pe statistici locale pe zona, Time-to-sell (TTS) estimat din diferența
            față de AVM și scorul de cerere, randamentul calculat pe baza chiriei estimate și capex
            aproximat din stare, iar riscul seismic din baza de date națională.
          </Text>
        </Page>
      </Page>
    </Document>
  );
}
