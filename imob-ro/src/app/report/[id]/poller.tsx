/* eslint-disable prettier/prettier */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function Poller({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}
