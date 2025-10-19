(function () {
  try {
    const parseNumber = (s) => {
      if (s == null) return null;
      const n = String(s)
        .replace(/[^\d.,]/g, "")
        .replace(/\.(?=.*\.)/g, "")
        .replace(",", ".");
      const f = parseFloat(n);
      return Number.isFinite(f) ? f : null;
    };

    const meta = (sel) => document.querySelector(sel)?.getAttribute("content") || null;

    const guessCurrency = () => {
      const txt = document.body.innerText;
      if (/\bRON\b|\blei\b/i.test(txt)) return "RON";
      return "EUR";
    };

    // 1) JSON-LD
    const jsonldBlocks = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map((n) => {
        try {
          return JSON.parse(n.textContent || "{}");
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    let jsonld = null;
    jsonld =
      jsonldBlocks.find((p) => p["@type"] === "RealEstateListing") ||
      jsonldBlocks.find((p) => p["@type"] === "Offer" || p["@type"] === "Product") ||
      null;

    const fromJSONLD = (() => {
      if (!jsonld) return {};
      const offer = jsonld.offers || jsonld;
      const title = jsonld.name || document.title;
      const price = parseNumber(offer.price || offer?.priceSpecification?.price);
      const currency =
        offer.priceCurrency || offer?.priceSpecification?.priceCurrency || guessCurrency();
      const areaM2 = parseNumber(
        jsonld.floorSize?.value || jsonld.floorSize?.value?.amount || jsonld.floorSize,
      );
      const rooms = parseNumber(jsonld.numberOfRooms || jsonld.rooms);
      const addressRaw =
        jsonld.address?.streetAddress || jsonld.address?.addressLocality || jsonld.address || null;
      return { title, price, currency, areaM2, rooms, addressRaw };
    })();

    // 2) Meta
    const fromMeta = (() => {
      const title = meta('meta[property="og:title"]') || document.title;
      const desc = meta('meta[name="description"]') || meta('meta[property="og:description"]');
      const price = parseNumber(
        desc && (desc.match(/(\d[\d\.\s,]{2,})\s?(?:EUR|€|RON|lei)/i) || [])[1],
      );
      const curMatch = desc && (desc.match(/\b(EUR|RON|lei|€)\b/i) || [])[1];
      const currency = curMatch
        ? curMatch.toUpperCase() === "LEI"
          ? "RON"
          : curMatch === "€"
            ? "EUR"
            : curMatch.toUpperCase()
        : guessCurrency();
      return { title, price, currency };
    })();

    // 3) Selectors/regex
    const fromSelectors = (() => {
      const t = document.querySelector("h1, .title, .offer-title")?.textContent?.trim();
      const priceText =
        document.querySelector('[class*="price"], [data-testid*="price"]')?.textContent ||
        document.body.innerText;
      const price = parseNumber(priceText);
      const currency = /RON|lei/i.test(priceText)
        ? "RON"
        : /EUR|€/.test(priceText)
          ? "EUR"
          : guessCurrency();

      const areaText = (document.body.innerText.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*(m2|m²|mp)/i) ||
        [])[1];
      const areaM2 = parseNumber(areaText);
      const rooms = parseNumber(
        (document.body.innerText.match(/\b(\d(?:\.\d)?)\s*(cam|camere|camera)\b/i) || [])[1],
      );

      const floorRaw =
        (document.body.innerText.match(
          /\b(Parter|Demisol|Mezanin|Etaj\s*\d{1,2}(?:\/\d{1,2})?)\b/i,
        ) || [])[0] || null;
      const yearBuilt = parseNumber(
        (document.body.innerText.match(/\b(19\d{2}|20\d{2})\b/) || [])[1],
      );

      const imgs = Array.from(document.querySelectorAll("img"))
        .map((i) => i.currentSrc || i.src)
        .filter(Boolean);
      const photos = Array.from(new Set(imgs)).slice(0, 24);

      const addressRaw =
        meta('meta[property="og:street-address"]') ||
        meta('meta[name="address"]') ||
        document.querySelector('[class*="address"]')?.textContent?.trim() ||
        null;

      let lat = null,
        lng = null;
      const mapHref =
        Array.from(
          document.querySelectorAll('a[href*="google.com/maps"], iframe[src*="google.com/maps"]'),
        ).map((n) => n.getAttribute("href") || n.getAttribute("src"))[0] || null;
      const m = mapHref && mapHref.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (m) {
        lat = parseFloat(m[1]);
        lng = parseFloat(m[2]);
      }

      return {
        title: t,
        price,
        currency,
        areaM2,
        rooms,
        floorRaw,
        yearBuilt,
        addressRaw,
        lat,
        lng,
        photos,
      };
    })();

    const payload = Object.assign({}, fromMeta, fromSelectors, fromJSONLD);

    return { ok: true, payload };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
})();
