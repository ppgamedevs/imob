"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BulkJobWithItems } from "@/types/agent";

import { pollJobStatus, queueBulk } from "./actions";

export default function UploadPage() {
  const [state, formAction, pending] = useActionState(queueBulk, null);
  const [job, setJob] = useState<BulkJobWithItems | null>(null);
  const [polling, setPolling] = useState(false);

  const startPolling = async (jobId: string) => {
    setPolling(true);
    const interval = setInterval(async () => {
      const result = await pollJobStatus(jobId);
      if (result.job) {
        setJob(result.job);
        if (result.job.status === "completed" || result.job.status === "failed") {
          clearInterval(interval);
          setPolling(false);
        }
      }
    }, 2000);

    // Initial fetch
    const result = await pollJobStatus(jobId);
    if (result.job) {
      setJob(result.job);
    }
  };

  if (state?.jobId && !job && !polling) {
    startPolling(state.jobId);
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bulk Analyzer</h1>
        <p className="text-gray-400">
          Paste listing URLs (one per line) or upload a CSV to analyze in bulk.
        </p>
      </div>

      {!job ? (
        <form action={formAction} className="space-y-6">
          <div>
            <Label htmlFor="urls">Listing URLs (one per line, up to 500)</Label>
            <Textarea
              id="urls"
              name="urls"
              rows={12}
              placeholder="https://www.imobiliare.ro/vanzare-apartamente/...&#10;https://www.olx.ro/d/oferta/...&#10;https://storia.ro/ro/oferta/..."
              disabled={pending}
              className="mt-2 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              Supported: imobiliare.ro, olx.ro, storia.ro, publi24.ro, and more
            </p>
          </div>

          {state?.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{state.error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Queueing..." : "Analyze"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/a">Cancel</Link>
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-white/5 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Processing</h2>
              <div className="text-sm text-gray-400">
                {job.done + job.failed} / {job.total}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Done</span>
                <span className="text-green-400">{job.done}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Running</span>
                <span className="text-blue-400">{job.running}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Queued</span>
                <span className="text-yellow-400">{job.queued}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Failed</span>
                <span className="text-red-400">{job.failed}</span>
              </div>
            </div>

            <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{
                  width: `${((job.done + job.failed) / job.total) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold mb-3">Items</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {job.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 text-sm p-2 rounded bg-white/5"
                >
                  <StatusBadge status={item.status} />
                  <span className="flex-1 truncate text-gray-400">{item.url}</span>
                  {item.analysisId && (
                    <Link
                      href={`/report/${item.analysisId}`}
                      target="_blank"
                      className="text-blue-400 hover:underline"
                    >
                      View
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {job.status === "completed" && (
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/a/portfolio">View Portfolio</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setJob(null);
                  window.location.reload();
                }}
              >
                Analyze More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    queued: "bg-yellow-500/20 text-yellow-400",
    running: "bg-blue-500/20 text-blue-400",
    done: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
    duplicate: "bg-gray-500/20 text-gray-400",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status as keyof typeof colors] || colors.queued}`}
    >
      {status}
    </span>
  );
}
