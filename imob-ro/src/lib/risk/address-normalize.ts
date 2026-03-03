/**
 * Bucharest address normalization and parsing for seismic matching.
 * Handles Romanian abbreviations, diacritics, and street type variations.
 */

const STREET_TYPE_MAP: Record<string, string> = {
  "str": "strada",
  "str.": "strada",
  "strada": "strada",
  "bd": "bulevardul",
  "bd.": "bulevardul",
  "bdul": "bulevardul",
  "b-dul": "bulevardul",
  "bulevardul": "bulevardul",
  "blvd": "bulevardul",
  "cal": "calea",
  "cal.": "calea",
  "calea": "calea",
  "sos": "soseaua",
  "sos.": "soseaua",
  "soseaua": "soseaua",
  "al": "aleea",
  "al.": "aleea",
  "aleea": "aleea",
  "spl": "splaiul",
  "spl.": "splaiul",
  "splaiul": "splaiul",
  "int": "intrarea",
  "int.": "intrarea",
  "intrarea": "intrarea",
  "pt": "piata",
  "pt.": "piata",
  "p-ta": "piata",
  "piata": "piata",
  "drum": "drumul",
  "drumul": "drumul",
  "dr": "drumul",
  "dr.": "drumul",
  "pass": "pasajul",
  "pasajul": "pasajul",
  "fd": "fundatura",
  "fd.": "fundatura",
  "fundatura": "fundatura",
};

function removeDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ă/g, "a").replace(/â/g, "a").replace(/î/g, "i")
    .replace(/ș/g, "s").replace(/ț/g, "t")
    .replace(/Ă/g, "A").replace(/Â/g, "A").replace(/Î/g, "I")
    .replace(/Ș/g, "S").replace(/Ț/g, "T");
}

export function normalizeAddress(raw: string): string {
  let s = removeDiacritics(raw.toLowerCase().trim());

  s = s.replace(/\bnr\.?\s*/g, "");
  s = s.replace(/[.,;:!?()\[\]{}]/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  const tokens = s.split(" ");
  if (tokens.length > 0 && STREET_TYPE_MAP[tokens[0]]) {
    tokens[0] = STREET_TYPE_MAP[tokens[0]];
  }

  return tokens.join(" ");
}

export interface ParsedAddress {
  streetType: string | null;
  streetName: string | null;
  number: string | null;
  bloc: string | null;
  scara: string | null;
  sector: number | null;
  full: string;
}

export function parseAddress(raw: string): ParsedAddress {
  const norm = normalizeAddress(raw);
  const result: ParsedAddress = {
    streetType: null,
    streetName: null,
    number: null,
    bloc: null,
    scara: null,
    sector: null,
    full: norm,
  };

  const tokens = norm.split(" ");
  const streetTypes = Object.values(STREET_TYPE_MAP);
  if (tokens.length > 0 && streetTypes.includes(tokens[0])) {
    result.streetType = tokens[0];
    tokens.shift();
  }

  // Extract sector
  const sectorMatch = norm.match(/sector(?:ul)?\s*(\d)/i);
  if (sectorMatch) result.sector = Number(sectorMatch[1]);

  // Extract bloc
  const blocMatch = norm.match(/\bbl(?:oc)?\.?\s*([a-z0-9]+(?:\.[a-z0-9]+)?)/i);
  if (blocMatch) result.bloc = blocMatch[1].toUpperCase();

  // Extract scara
  const scaraMatch = norm.match(/\bsc(?:ara)?\.?\s*([a-z0-9]+)/i);
  if (scaraMatch) result.scara = scaraMatch[1].toUpperCase();

  // Extract number - first standalone number or number followed by letter
  const numMatch = norm.match(/\b(\d{1,4}[a-z]?(?:\s*[-/]\s*\d{1,4}[a-z]?)?)\b/);
  if (numMatch) result.number = numMatch[1].replace(/\s/g, "");

  // Street name: everything between street type and first number/bloc/sector
  const remaining = tokens.join(" ");
  const nameMatch = remaining.match(/^([a-z\s]+?)(?:\s+\d|\s+bl|\s+sc|\s+sector|$)/);
  if (nameMatch) {
    result.streetName = nameMatch[1].trim();
  } else if (tokens.length > 0) {
    result.streetName = tokens.filter((t) => !/^\d/.test(t) && !/^bl/i.test(t) && !/^sc/i.test(t) && !/^sector/i.test(t)).join(" ");
  }

  return result;
}

/**
 * Compute match confidence between two addresses.
 * Returns 0-1 score.
 */
export function addressMatchScore(query: ParsedAddress, candidate: ParsedAddress): number {
  if (!query.streetName || !candidate.streetName) return 0;

  const qStreet = query.streetName.toLowerCase();
  const cStreet = candidate.streetName.toLowerCase();

  // Street name matching
  let streetScore = 0;
  if (qStreet === cStreet) {
    streetScore = 1;
  } else if (qStreet.includes(cStreet) || cStreet.includes(qStreet)) {
    streetScore = 0.85;
  } else {
    const similarity = stringSimilarity(qStreet, cStreet);
    if (similarity > 0.7) streetScore = similarity * 0.8;
    else return 0;
  }

  // Number matching
  let numberScore = 0.5; // default if no numbers to compare
  if (query.number && candidate.number) {
    if (query.number === candidate.number) {
      numberScore = 1;
    } else {
      const qNum = parseInt(query.number, 10);
      const cNum = parseInt(candidate.number, 10);
      if (!isNaN(qNum) && !isNaN(cNum)) {
        // Same side of street (odd/even) and close range
        if (qNum % 2 === cNum % 2 && Math.abs(qNum - cNum) <= 4) {
          numberScore = 0.7;
        } else if (Math.abs(qNum - cNum) <= 2) {
          numberScore = 0.6;
        } else {
          numberScore = 0.2;
        }
      }
    }
  } else if (query.number && !candidate.number) {
    numberScore = 0.4;
  } else if (!query.number && candidate.number) {
    numberScore = 0.4;
  }

  // Bloc matching
  let blocScore = 1;
  if (query.bloc && candidate.bloc) {
    blocScore = query.bloc === candidate.bloc ? 1 : 0.3;
  }

  return streetScore * 0.55 + numberScore * 0.35 + blocScore * 0.1;
}

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;

  const costs: number[] = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }

  return (longer.length - costs[shorter.length]) / longer.length;
}
