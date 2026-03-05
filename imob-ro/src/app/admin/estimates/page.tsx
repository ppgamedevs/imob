import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";

function fmt(n: number) {
  return n.toLocaleString("ro-RO");
}

function confColor(c: number) {
  if (c >= 65) return "text-emerald-700 bg-emerald-50";
  if (c >= 35) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

export default async function AdminEstimatesPage() {
  const [estimates, stats] = await Promise.all([
    prisma.userEstimate.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.userEstimate.aggregate({
      _count: true,
      _avg: { confidence: true, compsCount: true, dispersion: true, fairLikely: true },
    }),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = estimates.filter((e) => e.createdAt >= today).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimari utilizatori</h1>
          <p className="text-sm text-gray-500 mt-1">Ultimele 100 estimari de pe /estimare</p>
        </div>
        <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          &larr; Admin
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats._count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase">Azi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase">
              Avg Confidence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats._avg.confidence != null ? Math.round(stats._avg.confidence) : "-"}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-500 uppercase">Avg Comps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats._avg.compsCount != null ? Math.round(stats._avg.compsCount * 10) / 10 : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {estimates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nicio estimare inca.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Zona</th>
                <th className="px-4 py-3 text-right">Suprafata</th>
                <th className="px-4 py-3 text-right">Camere</th>
                <th className="px-4 py-3 text-right">Fair Likely</th>
                <th className="px-4 py-3 text-right">Range 80%</th>
                <th className="px-4 py-3 text-center">Conf</th>
                <th className="px-4 py-3 text-right">Comps</th>
                <th className="px-4 py-3 text-right">Disp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {estimates.map((e) => {
                const inp = e.inputs as Record<string, unknown>;
                return (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {e.createdAt.toLocaleString("ro-RO", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[180px] truncate">
                      {(inp.zoneSlug as string) ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700">
                      {inp.usableAreaM2 as number} mp
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{inp.rooms as number}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                      {fmt(e.fairLikely)} EUR
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {fmt(e.fairMin)} – {fmt(e.fairMax)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${confColor(e.confidence)}`}
                      >
                        {e.confidence}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{e.compsCount}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">
                      {e.dispersion.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
