import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSession } from "@/lib/a/auth";
import { prisma } from "@/lib/db";

import { saveBrand } from "./actions";

export default async function BrandPage() {
  const session = await requireSession();

  if (!session.orgId) {
    return (
      <div className="container max-w-2xl py-8">
        <p className="text-gray-400">No organization found</p>
      </div>
    );
  }

  const org = await prisma.org.findUnique({
    where: { id: session.orgId },
  });

  const brand = (org?.brand as { color?: string; logoUrl?: string; slug?: string }) || {};

  return (
    <div className="container max-w-2xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Brand Settings</h1>
          <p className="text-gray-400">Customize your public portfolio</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/a">← Back</Link>
        </Button>
      </div>

      <form action={saveBrand} className="space-y-6 bg-white/5 rounded-lg p-6">
        <div>
          <Label htmlFor="slug">Public URL Slug</Label>
          <Input
            id="slug"
            name="slug"
            placeholder="remax-crangasi"
            defaultValue={brand.slug || ""}
            className="mt-2"
          />
          <p className="text-xs text-gray-500 mt-2">
            Your public portfolio will be at: /a/public/your-slug
          </p>
        </div>

        <div>
          <Label htmlFor="color">Brand Color</Label>
          <Input
            id="color"
            name="color"
            type="color"
            defaultValue={brand.color || "#000000"}
            className="mt-2 h-12"
          />
        </div>

        <div>
          <Label htmlFor="logoUrl">Logo URL</Label>
          <Input
            id="logoUrl"
            name="logoUrl"
            type="url"
            placeholder="https://..."
            defaultValue={brand.logoUrl || ""}
            className="mt-2"
          />
          <p className="text-xs text-gray-500 mt-2">
            Upload your logo to a service like Imgur or use your website URL
          </p>
        </div>

        <Button type="submit">Save Settings</Button>
      </form>
    </div>
  );
}
