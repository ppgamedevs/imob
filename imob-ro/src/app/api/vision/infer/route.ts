import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/http/rate";
import { assertSafeUrl, IMAGE_DOMAINS } from "@/lib/http/ssrf";
import { mapScoreToVerdict } from "@/lib/ml/vision/condition";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    try {
      await rateLimit(`vision-infer:${ip}`, 15, 60_000);
    } catch {
      return NextResponse.json({ error: "rate_limit" }, { status: 429 });
    }

    const body = await req.json();
    const photos: string[] = Array.isArray(body.photos) ? body.photos : [];
    const analysisId: string | undefined = body.analysisId;

    if (!photos.length) return NextResponse.json({ error: "no photos" }, { status: 400 });

    const validatedPhotos = photos.filter((u) => {
      try {
        assertSafeUrl(u, { allowedDomains: IMAGE_DOMAINS });
        return true;
      } catch {
        return false;
      }
    });
    if (!validatedPhotos.length) return NextResponse.json({ error: "no_valid_photos" }, { status: 400 });

    // Attempt to use tfjs-node if installed for better perf on server
    let mobilenet: any = null;
    // Use runtime require to avoid bundlers trying to parse native modules and their assets
    try {
      // Attempt to require tfjs-node at runtime (Node server only)

      const _require: typeof require = Function("return require")();
      try {
        const tf = _require("@tensorflow/tfjs-node");
        mobilenet = _require("@tensorflow-models/mobilenet");
        // attach for helper usage
        (globalThis as any).tf = tf;
      } catch {
        // fallback to pure-js tfjs if native not available
        try {
          const tf = _require("@tensorflow/tfjs");
          mobilenet = _require("@tensorflow-models/mobilenet");
          (globalThis as any).tf = tf;
        } catch {
          console.warn("No tfjs available on server, skipping inference");
          const neutral = 0.5;
          if (analysisId) {
            await prisma.scoreSnapshot.upsert({
              where: { analysisId },
              create: {
                analysisId,
                avmLow: 0,
                avmHigh: 0,
                avmConf: 0,
                ttsBucket: "unknown",
                conditionScore: neutral,
              },
              update: { conditionScore: neutral },
            });
          }
          return NextResponse.json({ score: neutral, verdict: mapScoreToVerdict(neutral) });
        }
      }
    } catch {
      // If even Function('return require') is unavailable (edge), gracefully skip inference
      console.warn("Require not available in this runtime, skipping server inference");
      const neutral = 0.5;
      if (analysisId) {
        await prisma.scoreSnapshot.upsert({
          where: { analysisId },
          create: {
            analysisId,
            avmLow: 0,
            avmHigh: 0,
            avmConf: 0,
            ttsBucket: "unknown",
            conditionScore: neutral,
          },
          update: { conditionScore: neutral },
        });
      }
      return NextResponse.json({ score: neutral, verdict: mapScoreToVerdict(neutral) });
    }

    // Load model (server side)
    const model = await (mobilenet as any).load({ version: 2, alpha: 0.5 });

    async function classifyUrl(url: string) {
      try {
        // fetch image as buffer and decode in tfjs-node
        // In tfjs-node we can use tf.node.decodeImage
        const tf: any = (globalThis as any).tf;
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) return 0.5;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > 10_000_000) return 0.5;
        const img = tf.node.decodeImage(buf);
        const predictions: any = await model.classify(img as any);
        // simple heuristics similar to client
        let s = 0.5;
        if (Array.isArray(predictions) && predictions.length) {
          const top = String(predictions[0].className).toLowerCase();
          if (top.includes("studio") || top.includes("living")) s += 0.05;
          if (top.includes("bedroom") || top.includes("kitchen")) s += 0.1;
          if (top.includes("bathroom") || top.includes("shower")) s += 0.08;
          if (top.includes("construction") || top.includes("excavation")) s -= 0.2;
          if (top.includes("rubble") || top.includes("ruin")) s -= 0.3;
          if (top.includes("house") || top.includes("apartment")) s += 0.05;
        }
        return Math.max(0, Math.min(1, s));
      } catch {
        return 0.5;
      }
    }

    const sample = validatedPhotos.slice(0, 3);
    const scores = [] as number[];
    for (const u of sample) {
      const sc = await classifyUrl(u);
      scores.push(sc);
    }

    const finalScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.5;
    const mapped = mapScoreToVerdict(finalScore);

    if (analysisId) {
      await prisma.scoreSnapshot.upsert({
        where: { analysisId },
        create: {
          analysisId,
          avmLow: 0,
          avmHigh: 0,
          avmConf: 0,
          ttsBucket: "unknown",
          conditionScore: mapped.conditionScore,
        },
        update: { conditionScore: mapped.conditionScore },
      });
    }

    return NextResponse.json({ score: mapped.conditionScore, verdict: mapped.verdict });
  } catch (err) {
    // log and return server error
    console.error(err);
    return NextResponse.json({ error: "inference_failed" }, { status: 500 });
  }
}
