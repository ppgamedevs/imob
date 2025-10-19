(function () {
  var API = "http://localhost:3000/api/analyze/client-push";
  function parseNumber(s) {
    if (!s) return null;
    var n = String(s)
      .replace(/[^\d.,]/g, "")
      .replace(/\.(?=.*\.)/g, "")
      .replace(",", "");
    var f = parseFloat(n);
    return isFinite(f) ? f : null;
  }
  var txt = document.body.innerText;
  var title = document.title;
  var m = txt.match(/(\d[\d\.\s,]{2,})\s?(EUR|€|RON|lei)/i);
  var price = m ? parseNumber(m[1]) : null;
  var currency = m
    ? m[2].toUpperCase() === "LEI"
      ? "RON"
      : m[2] === "€"
        ? "EUR"
        : m[2].toUpperCase()
    : "EUR";
  var imgs = Array.from(document.querySelectorAll("img"))
    .map((i) => i.currentSrc || i.src)
    .filter(Boolean);
  var photos = Array.from(new Set(imgs)).slice(0, 24);
  var payload = { title: title, price: price, currency: currency, photos: photos };
  fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ originUrl: location.href, payload: payload }),
  })
    .then((r) => r.json())
    .then(function (res) {
      if (res && res.ok && res.analysisId) {
        location.href = "http://localhost:3000/report/" + res.analysisId;
      } else {
        alert("Eroare: " + ((res && res.error) || "nu am putut trimite"));
      }
    })
    .catch(function (e) {
      alert("Eroare: " + String(e));
    });
})();
