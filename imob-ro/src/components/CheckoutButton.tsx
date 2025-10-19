"use client";

import React from "react";

export default function CheckoutButton({
  mode = "subscription",
  children,
}: {
  mode?: "subscription" | "payment";
  children: React.ReactNode;
}) {
  const onClick = async () => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const j = await res.json();
      if (j?.url) {
        window.location.href = j.url;
      } else {
        alert("Failed to create checkout session");
      }
    } catch (err) {
      console.error(err);
      alert("Checkout error");
    }
  };

  return (
    <button className="btn btn-primary" onClick={onClick}>
      {children}
    </button>
  );
}
