importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.9.0/dist/tf.min.js");
importScripts(
  "https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0/dist/mobilenet.min.js",
);

function mapScoreToVerdict(score) {
  const s = Math.max(0, Math.min(1, score));
  if (s < 0.35) return { verdict: "necesită renovare", conditionScore: s };
  if (s < 0.75) return { verdict: "decent", conditionScore: s };
  return { verdict: "modern", conditionScore: s };
}

async function classifyUrl(model, url) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = async () => {
        try {
          const preds = await model.classify(img);
          let s = 0.5;
          if (Array.isArray(preds) && preds.length) {
            const top = preds[0].className.toLowerCase();
            if (top.includes("studio") || top.includes("living")) s += 0.05;
            if (top.includes("bedroom") || top.includes("kitchen")) s += 0.1;
            if (top.includes("bathroom") || top.includes("shower")) s += 0.08;
            if (top.includes("construction") || top.includes("excavation")) s -= 0.2;
            if (top.includes("rubble") || top.includes("ruin")) s -= 0.3;
            if (top.includes("house") || top.includes("apartment")) s += 0.05;
          }
          resolve(Math.max(0, Math.min(1, s)));
        } catch {
          resolve(0.5);
        }
      };
      img.onerror = () => resolve(0.5);
    } catch {
      resolve(0.5);
    }
  });
}

self.addEventListener("message", async (ev) => {
  const { id, photos } = ev.data || {};
  if (!Array.isArray(photos) || photos.length === 0) {
    self.postMessage({ id, score: 0.5, verdict: mapScoreToVerdict(0.5) });
    return;
  }

  try {
    const model = await self.mobilenet.load({ version: 2, alpha: 0.5 });
    const sample = photos.slice(0, 3);
    const scores = [];
    for (const u of sample) {
      const sc = await classifyUrl(model, u);
      scores.push(sc);
    }
    const finalScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.5;
    const mapped = mapScoreToVerdict(finalScore);
    self.postMessage({ id, score: mapped.conditionScore, verdict: mapped.verdict });
  } catch {
    self.postMessage({ id, score: 0.5, verdict: mapScoreToVerdict(0.5) });
  }
});
