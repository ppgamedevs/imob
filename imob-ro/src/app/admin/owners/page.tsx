import Link from "next/link";

import { updateLeadStatus } from "@/app/vinde/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Owner Leads - Admin",
};

export default async function AdminOwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const statusFilter = status ?? undefined;

  const leads = await prisma.ownerLead.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const stats = await prisma.ownerLead.groupBy({
    by: ["status"],
    _count: true,
  });

  const statusCounts = Object.fromEntries(stats.map((s) => [s.status, s._count]));

  async function handleStatusUpdate(formData: FormData) {
    "use server";
    const leadId = formData.get("leadId") as string;
    const status = formData.get("status") as string;
    await updateLeadStatus(leadId, status);
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Owner Leads</h1>
        <p className="text-muted-foreground">Manage seller evaluation requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {["new", "contacted", "won", "lost"].map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{statusCounts[s] ?? 0}</div>
              <div className="text-sm text-muted-foreground capitalize">{s}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        <Link href="/admin/owners">
          <Button variant={!statusFilter ? "default" : "outline"} size="sm">
            All
          </Button>
        </Link>
        {["new", "contacted", "won", "lost"].map((s) => (
          <Link key={s} href={`/admin/owners?status=${s}`}>
            <Button variant={statusFilter === s ? "default" : "outline"} size="sm">
              {s}
            </Button>
          </Link>
        ))}
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {leads.map((lead) => (
          <Card key={lead.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={
                        lead.status === "new"
                          ? "default"
                          : lead.status === "won"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {lead.status}
                    </Badge>
                    {lead.email && <span className="text-xs">📧 {lead.email}</span>}
                    {lead.phone && <span className="text-xs">📱 {lead.phone}</span>}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-2">
                    {lead.areaSlug && (
                      <div>
                        <span className="text-muted-foreground">Zone: </span>
                        <span className="font-medium capitalize">
                          {lead.areaSlug.replace(/-/g, " ")}
                        </span>
                      </div>
                    )}
                    {lead.rooms && (
                      <div>
                        <span className="text-muted-foreground">Rooms: </span>
                        <span className="font-medium">{lead.rooms}</span>
                      </div>
                    )}
                    {lead.areaM2 && (
                      <div>
                        <span className="text-muted-foreground">Area: </span>
                        <span className="font-medium">{lead.areaM2} m²</span>
                      </div>
                    )}
                    {lead.priceSuggested && (
                      <div>
                        <span className="text-muted-foreground">Price: </span>
                        <span className="font-medium">
                          {lead.priceSuggested.toLocaleString()} €
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(lead.createdAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link href={`/owner/${lead.id}`} target="_blank">
                    <Button variant="outline" size="sm">
                      View Report
                    </Button>
                  </Link>

                  <form action={handleStatusUpdate}>
                    <input type="hidden" name="leadId" value={lead.id} />
                    <select
                      name="status"
                      className="text-xs border rounded px-2 py-1"
                      defaultValue={lead.status}
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    >
                      <option value="new">new</option>
                      <option value="contacted">contacted</option>
                      <option value="won">won</option>
                      <option value="lost">lost</option>
                    </select>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {leads.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No leads found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
