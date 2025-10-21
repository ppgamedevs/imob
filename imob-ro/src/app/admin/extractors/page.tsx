import Link from "next/link";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";

export default async function AdminExtractorsPage() {
  const profiles = await prisma.extractorProfile.findMany({ orderBy: { domain: "asc" } });

  return (
    <div className="container mx-auto p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Extractor Profiles</h1>
        <Button asChild>
          <Link href="/admin/extractors/new">+ New Profile</Link>
        </Button>
      </div>
      <div className="space-y-2">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {profiles.map((p: any) => (
          <Link
            key={p.id}
            href={`/admin/extractors/${p.id}`}
            className="block rounded border p-4 hover:bg-muted"
          >
            <div className="flex items-center justify-between">
              <div>
                <strong>{p.domain}</strong>
                <span className="ml-2 text-sm text-muted-foreground">v{p.version}</span>
              </div>
              <div className={p.active ? "text-green-600" : "text-gray-400"}>
                {p.active ? "Active" : "Inactive"}
              </div>
            </div>
          </Link>
        ))}
        {profiles.length === 0 && (
          <p className="text-muted-foreground">No profiles yet. Create one to start.</p>
        )}
      </div>
    </div>
  );
}
