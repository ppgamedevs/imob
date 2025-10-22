/**
 * Privacy scrubbing for shared reports.
 * Removes PII, rounds geolocation, hides sensitive data based on share options.
 */

export interface ShareOptions {
  scrub?: boolean;
  watermark?: boolean;
  hideSource?: boolean;
  hidePrice?: boolean;
  brand?: string;
  color?: string;
}

/**
 * Scrubs report data for public sharing.
 * - Removes PII (contact, phone, email)
 * - Rounds lat/lng to ~110m precision if scrub enabled
 * - Hides price/AVM if hidePrice enabled
 * - Removes source URLs if hideSource enabled
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scrubReportData(report: any, opts: ShareOptions): any {
  const clone = structuredClone(report);

  // 1) PII/contact removal (always)
  if (clone?.extractedListing) {
    delete clone.extractedListing.contact;
    delete clone.extractedListing.phone;
    delete clone.extractedListing.email;
  }
  if (clone?.featureSnapshot?.features) {
    const f = clone.featureSnapshot.features;
    delete f.contact;
    delete f.phone;
    delete f.email;
  }

  // 2) Geolocation scrub (round to 3 decimals = ~110m)
  if (opts.scrub) {
    if (clone?.featureSnapshot?.features) {
      const f = clone.featureSnapshot.features;
      if (typeof f.lat === "number") {
        f.lat = Math.round(f.lat * 1000) / 1000;
      }
      if (typeof f.lng === "number") {
        f.lng = Math.round(f.lng * 1000) / 1000;
      }
      // Remove exact address, keep only area/sector
      delete f.addressRaw;
      delete f.streetName;
      delete f.streetNumber;
    }
  }

  // 3) Price hiding
  if (opts.hidePrice) {
    if (clone?.featureSnapshot?.features) {
      delete clone.featureSnapshot.features.priceEur;
      delete clone.featureSnapshot.features.priceRon;
    }
    if (clone?.scoreSnapshot) {
      delete clone.scoreSnapshot.avmMid;
      delete clone.scoreSnapshot.avmLow;
      delete clone.scoreSnapshot.avmHigh;
      delete clone.scoreSnapshot.priceBadge;
    }
    if (clone?.extractedListing) {
      delete clone.extractedListing.price;
    }
  }

  // 4) Source URL hiding
  if (opts.hideSource) {
    delete clone.sourceUrl;
    delete clone.canonicalUrl;
    if (clone?.extractedListing) {
      delete clone.extractedListing.sourceUrl;
    }
  }

  return clone;
}
