"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

interface RerunPipelineButtonProps {
  analysisId: string;
}

export function RerunPipelineButton({ analysisId }: RerunPipelineButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleRerun = async () => {
    if (
      !confirm(
        "Re-run analysis pipeline?\n\nThis will restart extraction, AVM, TTS, and dedup matching.\nThe process takes 30-60 seconds and the page will reload.",
      )
    ) {
      return;
    }

    setIsRunning(true);
    setStatus("idle");

    try {
      const response = await fetch("/api/analysis/restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });

      if (response.ok) {
        setStatus("success");
        // Reload page after 2 seconds to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setStatus("error");
        setIsRunning(false);
        alert("Failed to restart pipeline. Please try again.");
      }
    } catch (error) {
      console.error("Failed to restart analysis:", error);
      setStatus("error");
      setIsRunning(false);
      alert("Failed to restart pipeline. Please try again.");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={isRunning}
        onClick={handleRerun}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
        {isRunning ? "Processing..." : "Re-run Pipeline"}
      </Button>

      {status === "success" && (
        <span className="text-sm text-green-600 dark:text-green-400">
          ✅ Restarted! Reloading...
        </span>
      )}

      {status === "error" && (
        <span className="text-sm text-red-600 dark:text-red-400">❌ Failed</span>
      )}
    </div>
  );
}
