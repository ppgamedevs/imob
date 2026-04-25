import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

import { isAdminApiAccess } from "@/lib/auth-guards";
import { acquireLock, releaseLock, getLastRun } from "@/lib/jobs/lock";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function requireAdminApi(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (ADMIN_TOKEN && authHeader === `Bearer ${ADMIN_TOKEN}`) return true;

  return isAdminApiAccess();
}

type JobName = "seismic-import" | "poi-import" | "gtfs-import" | "dedup-recompute";

const JOB_SCRIPTS: Record<JobName, { cmd: string; args: string[] }> = {
  "seismic-import": { cmd: "npx", args: ["tsx", "scripts/geo/import-seismic-amccrs.ts"] },
  "poi-import": { cmd: "npx", args: ["tsx", "scripts/geo/import-poi-osm.ts"] },
  "gtfs-import": { cmd: "npx", args: ["tsx", "scripts/geo/import-gtfs.ts"] },
  "dedup-recompute": { cmd: "npx", args: ["tsx", "-e", "import('@/lib/integrity/dedup').then(m => m.runDedupScan()).then(r => console.log(JSON.stringify(r)))"] },
};

/**
 * GET /api/admin/intel - returns status of all jobs
 */
export async function GET(req: Request) {
  if (!(await requireAdminApi(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobNames: JobName[] = ["seismic-import", "poi-import", "gtfs-import", "dedup-recompute"];
  const statuses = await Promise.all(
    jobNames.map(async (name) => {
      const last = await getLastRun(name);
      return {
        name,
        lastRun: last?.completedAt?.toISOString() ?? null,
        lastDuration: last?.duration ?? null,
      };
    }),
  );

  return NextResponse.json({ jobs: statuses });
}

/**
 * POST /api/admin/intel - trigger a job
 * Body: { action: "seismic-import" | "poi-import" | "gtfs-import" | "dedup-recompute" }
 */
export async function POST(req: Request) {
  if (!(await requireAdminApi(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as JobName;

  if (!action || !JOB_SCRIPTS[action]) {
    return NextResponse.json(
      { error: "Invalid action", valid: Object.keys(JOB_SCRIPTS) },
      { status: 400 },
    );
  }

  const lock = await acquireLock(action);
  if (!lock.acquired) {
    return NextResponse.json(
      { error: "Job already running", reason: lock.reason },
      { status: 409 },
    );
  }

  try {
    const script = JOB_SCRIPTS[action];
    const startMs = Date.now();

    if (action === "dedup-recompute") {
      const { runDedupScan } = await import("@/lib/integrity/dedup");
      const result = await runDedupScan();
      const durationMs = Date.now() - startMs;
      await releaseLock(lock.runId!, "completed", {
        metadata: { ...result, durationMs },
      });
      return NextResponse.json({ ok: true, action, result, durationMs });
    }

    const { stdout, stderr } = await execFileAsync(script.cmd, script.args, {
      cwd: process.cwd(),
      timeout: 4 * 60 * 1000,
      env: { ...process.env, FORCE_COLOR: "0" },
    });

    const durationMs = Date.now() - startMs;
    await releaseLock(lock.runId!, "completed", {
      metadata: { stdout: stdout.slice(-2000), stderr: stderr.slice(-500), durationMs },
    });

    return NextResponse.json({ ok: true, action, durationMs, stdout: stdout.slice(-1000) });
  } catch (err) {
    await releaseLock(lock.runId!, "failed", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Job failed", message: (err as Error).message },
      { status: 500 },
    );
  }
}
