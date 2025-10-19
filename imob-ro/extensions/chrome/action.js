const API = "http://localhost:3000/api/analyze/client-push";
const REPORT = (id) => `http://localhost:3000/report/${id}`;

function setStatus(t) {
  document.getElementById("status").textContent = t;
}

async function analyzeCurrentTab() {
  setStatus("Colectez date din pagină...");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return setStatus("Nu există tab activ.");

  // Inject extractor that RETURNS payload (not posting)
  const [{ result }] = await chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      files: ["extractor.js"],
    })
    .catch((e) => [{ result: { ok: false, error: String(e) } }]);

  if (!result?.ok) return setStatus("Eroare la extragere: " + (result?.error || "necunoscută"));

  setStatus("Trimit datele la server...");
  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ originUrl: tab.url, payload: result.payload }),
  })
    .then((r) => r.json())
    .catch((e) => ({ ok: false, error: String(e) }));

  if (!res?.ok || !res.analysisId) return setStatus("Eroare API: " + (res?.error || "necunoscută"));

  setStatus("Gata! Deschid raportul...");
  await chrome.tabs.create({ url: REPORT(res.analysisId) });
  window.close();
}

document.getElementById("analyze").addEventListener("click", analyzeCurrentTab);
