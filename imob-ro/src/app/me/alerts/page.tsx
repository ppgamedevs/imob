import React from "react";

import { disableAlertRule, listAlertRules } from "@/lib/alerts";
import { auth } from "@/lib/auth";

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user?.id) return <div>Autentificare necesară</div>;
  const rules = await listAlertRules(session.user.id);

  return (
    <div className="container py-6">
      <h1 className="text-xl font-semibold mb-4">Alertele mele</h1>
      <ul className="space-y-3">
        {rules.map((r: any) => (
          <li key={r.id} className="border rounded p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <b>{r.type}</b>
                {r.analysisId ? (
                  <>
                    {" "}
                    ·{" "}
                    <a className="underline" href={`/report/${r.analysisId}`}>
                      raport
                    </a>
                  </>
                ) : null}
                {r.areaSlug ? <> · zonă: {r.areaSlug}</> : null}
              </div>
              <form
                action={async () => {
                  "use server";
                  await disableAlertRule(r.id);
                }}
              >
                <button className="btn">Dezactivează</button>
              </form>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {r.params ? JSON.stringify(r.params) : null}
              {r.lastFiredAt ? <> · ultima: {new Date(r.lastFiredAt).toISOString()}</> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
