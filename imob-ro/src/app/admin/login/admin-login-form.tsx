"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  passwordLoginEnabled: boolean;
};

function safePathFrom(p: string | null): string {
  if (!p || !p.startsWith("/") || p.startsWith("//")) return "/admin";
  if (!p.startsWith("/admin")) return "/admin";
  return p;
}

export function AdminLoginForm({ passwordLoginEnabled }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const from = safePathFrom(sp.get("from"));
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      if (res.ok) {
        router.replace(from);
        router.refresh();
        return;
      }
      if (res.status === 401) {
        setError("Parolă incorectă.");
        return;
      }
      if (res.status === 503) {
        setError("Autentificarea prin parolă nu e configurată pe server.");
        return;
      }
      setError("Nu s-a putut autentifica. Reîncercați.");
    } catch {
      setError("Eroare de rețea.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Acces ImobIntel Admin</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {passwordLoginEnabled
            ? "Introdu parola de acces sau folosește contul cu drept de admin."
            : "Folosește contul cu rol admin (fără parolă dedicată pe acest mediu)."}
        </p>
      </div>

      {passwordLoginEnabled ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="admin-pw" className="text-xs font-medium text-zinc-600">
              Parolă acces
            </label>
            <Input
              id="admin-pw"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Se verifică…" : "Continuă"}
          </Button>
        </form>
      ) : null}

      <div className="border-t border-zinc-100 pt-4">
        <p className="text-xs text-zinc-500">Cont (Google / e-mail) cu rol admin</p>
        <Button variant="secondary" className="mt-2 w-full" asChild>
          <Link
            href={`/auth/signin?callbackUrl=${encodeURIComponent(from)}`}
            className="text-center"
          >
            Conectează-te cu contul
          </Link>
        </Button>
      </div>
    </div>
  );
}
