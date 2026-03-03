"use client";

import React from "react";

export default function CheckoutButton({
  plan = "standard",
  children,
}: {
  plan?: "standard" | "pro";
  children: React.ReactNode;
}) {
  const onClick = async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const j = await res.json();
      if (j?.url) {
        window.location.href = j.url;
      } else {
        alert("Eroare la crearea sesiunii de plata");
      }
    } catch (err) {
      console.error(err);
      alert("Eroare la checkout");
    }
  };

  return (
    <button
      className="w-full rounded-xl py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-[14px] font-semibold shadow-sm hover:shadow-md hover:brightness-110 active:scale-[0.97] transition-all duration-200"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
