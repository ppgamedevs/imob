/* eslint-disable prettier/prettier */
import { prisma } from "@/lib/db";

export default async function DebugAnalyze() {
  const rows = await prisma.analysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="container py-6">
      <h1 className="text-xl font-semibold mb-4">Ultimele analize</h1>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="text-sm">
            <a className="underline" href={`/report/${r.id}`}>
              {r.sourceUrl}
            </a>
            <span className="ml-2 rounded bg-muted px-2 py-0.5">{r.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
