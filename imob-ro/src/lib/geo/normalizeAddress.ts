/**
 * Address normalization for Bucharest.
 * Thin re-export of the canonical implementation in risk/address-normalize
 * so callers can import from @/lib/geo/normalizeAddress.
 */
export {
  normalizeAddress,
  parseAddress,
  addressMatchScore,
} from "@/lib/risk/address-normalize";
