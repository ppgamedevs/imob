import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireSession } from "@/lib/a/auth";

export default async function ReportsPage() {
  await requireSession();

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reports & Shares</h1>
          <p className="text-gray-400">Saved portfolio shares and exported PDFs</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/a">← Back</Link>
        </Button>
      </div>

      <div className="bg-white/5 rounded-lg p-12 text-center">
        <p className="text-gray-400 mb-4">Coming soon</p>
        <p className="text-sm text-gray-500">Portfolio shares and PDF exports will appear here</p>
      </div>
    </div>
  );
}
