"use client";

import { useEffect } from "react";

export default function NewsletterSync() {
  useEffect(() => {
    const val = localStorage.getItem("imobintel_newsletter");
    if (val === null) return;

    localStorage.removeItem("imobintel_newsletter");
    fetch("/api/user/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optIn: val === "1" }),
    }).catch(() => {});
  }, []);

  return null;
}
