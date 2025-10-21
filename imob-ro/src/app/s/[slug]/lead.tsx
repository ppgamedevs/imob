"use client";
import { useState, useTransition } from "react";

export function LeadForm({ analysisId }: { analysisId: string }) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId, ...form }),
      });

      if (res.ok) {
        alert("Cererea a fost trimisă. Mulțumim!");
        setForm({ name: "", email: "", phone: "", message: "" });
      } else {
        alert("Eroare. Te rugăm să încerci din nou.");
      }
    });
  };

  return (
    <form className="border rounded-xl p-4 bg-card space-y-4" onSubmit={handleSubmit}>
      <div className="font-medium text-lg">Contactează proprietarul</div>
      <div className="text-sm text-muted-foreground">
        Completează formularul pentru a lua legătura despre acest imobil.
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Nume *"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
          disabled={pending}
        />
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          type="email"
          placeholder="Email *"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
          disabled={pending}
        />
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          type="tel"
          placeholder="Telefon"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          disabled={pending}
        />
      </div>

      <textarea
        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        rows={4}
        placeholder="Mesajul tău (opțional)"
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        disabled={pending}
      />

      <button
        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 w-full md:w-auto"
        type="submit"
        disabled={pending}
      >
        {pending ? "Se trimite..." : "📧 Trimite cererea"}
      </button>
    </form>
  );
}
