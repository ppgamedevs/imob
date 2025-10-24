import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

import { upsertExtractorProfile } from "./actions";

interface Params {
  id: string;
}

export default async function ExtractorEditorPage(props: { params: Promise<Params> }) {
  await requireAdmin();
  const { id } = await props.params;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  let profile: any = null;
  if (id !== "new") {
    profile = await prisma.extractorProfile.findUnique({ where: { id } });
    if (!profile) return notFound();
  }

  const rulesStr = profile ? JSON.stringify(profile.rules, null, 2) : "{}";

  return (
    <div className="container mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-2xl font-bold">
        {profile ? `Edit Profile: ${profile.domain}` : "New Profile"}
      </h1>
      <form action={upsertExtractorProfile} className="space-y-4">
        <input type="hidden" name="id" value={id} />

        <div>
          <label className="block text-sm font-medium">Domain</label>
          <input
            type="text"
            name="domain"
            defaultValue={profile?.domain || ""}
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="active"
            defaultChecked={profile?.active ?? true}
            className="h-4 w-4"
          />
          <label className="text-sm">Active</label>
        </div>

        <div>
          <label className="block text-sm font-medium">Version</label>
          <input
            type="number"
            name="version"
            defaultValue={profile?.version || 1}
            className="w-full rounded border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Rules (JSON)</label>
          <textarea
            name="rules"
            defaultValue={rulesStr}
            className="h-96 w-full rounded border px-3 py-2 font-mono text-sm"
            required
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit">Save</Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
