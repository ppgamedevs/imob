"use client";

import Link from "next/link";
import React from "react";

export default function UpgradeBanner() {
  return (
    <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Upgrade pentru PDF nelimitat + alerte</div>
          <div className="text-muted-foreground">
            3 rapoarte gratuite/lună, apoi abonament sau plată la bucată.
          </div>
        </div>
        <div>
          <Link href="/pricing" className="btn btn-primary">
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}
