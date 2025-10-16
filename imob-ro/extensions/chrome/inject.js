(function () {
  function qs(sel) {
    return document.querySelector(sel)?.textContent?.trim() || null;
  }

  function q(sel) {
    return document.querySelector(sel) || null;
  }

  // Generic heuristics; host-specific overrides would be better.
  const title = qs('meta[property="og:title"]') || qs("h1") || qs(".title") || document.title;
  const priceText =
    qs('[data-price], .price, [itemprop="price"]') || qs('meta[property="product:price:amount"]');
  const price = priceText ? parseInt(priceText.replace(/[\D]+/g, ""), 10) || null : null;
  const areaText = qs('[data-area], .area, [itemprop="floorSize"]');
  const areaM2 = areaText ? parseInt(areaText.replace(/[\D]+/g, ""), 10) || null : null;
  const roomsText = qs('[data-rooms], .rooms, [itemprop="numberOfRooms"]');
  const rooms = roomsText ? parseInt(roomsText.replace(/[\D]+/g, ""), 10) || null : null;
  const floorText = qs(".floor, [data-floor]");
  const floor = floorText ? parseInt(floorText.replace(/[\D]+/g, ""), 10) || null : null;
  const yearText = qs('.year, [data-year], [itemprop="yearBuilt"]');
  const yearBuilt = yearText ? parseInt(yearText.replace(/[\D]+/g, ""), 10) || null : null;
  const address = qs('[data-address], .address, [itemprop="address"]') || null;

  // try to extract coordinates from common map embeds
  let lat = null;
  let lng = null;
  const mapEl = q(
    'iframe[src*="google.com/maps"], iframe[src*="openstreetmap"], [data-lat][data-lng]',
  );
  if (mapEl) {
    if (mapEl.dataset && mapEl.dataset.lat && mapEl.dataset.lng) {
      lat = parseFloat(mapEl.dataset.lat) || null;
      lng = parseFloat(mapEl.dataset.lng) || null;
    } else if (mapEl.src) {
      try {
        const u = new URL(mapEl.src);
        if (u.searchParams.get("q")) {
          const q = u.searchParams.get("q") || "";
          const m = q.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
          if (m) {
            lat = parseFloat(m[1]);
            lng = parseFloat(m[2]);
          }
        }
      } catch (e) {}
    }
  }

  const imgs = Array.from(document.images)
    .slice(0, 10)
    .map((i) => i.src);

  const payload = {
    originUrl: location.href,
    extracted: {
      title,
      price,
      currency: null,
      areaM2,
      rooms,
      floor,
      yearBuilt,
      addressRaw: address,
      lat,
      lng,
      photos: imgs,
    },
  };

  const endpoint = "https://site.tau/api/analyze/client-push";

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    mode: "cors",
  })
    .then((r) => r.json())
    .then((data) => {
      alert("Trimis către imob.ai — analysisId: " + (data?.analysisId || JSON.stringify(data)));
    })
    .catch((err) => {
      console.error("client-push failed", err);
      alert("Eroare la trimitere");
    });
})();
