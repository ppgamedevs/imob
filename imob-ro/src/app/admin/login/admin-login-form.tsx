"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  from: string;
  passwordLoginEnabled: boolean;
};

export function AdminLoginForm({ from, passwordLoginEnabled }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const value = password.trim();
    if (!value) {
      setError("Introdu parola.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(new URL("/api/admin/portal", window.location.origin).toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: value }),
        credentials: "include",
      });

      if (res.ok) {
        window.location.assign(from);
        return;
      }

      type ErrBody = { error?: string; message?: string };
      let j: ErrBody = {};
      try {
        j = (await res.json()) as ErrBody;
      } catch {
        /* ignore */
      }
      const detail = j?.message ? ` ${j.message}` : "";

      if (res.status === 401) {
        setError("Parolă incorectă.");
        return;
      }
      if (res.status === 400) {
        if (j?.error === "password_required") {
          setError("Introdu parola.");
        } else {
          setError("Cerere invalidă." + detail);
        }
        return;
      }
      if (res.status === 503) {
        setError(
          "Autentificarea prin parolă nu e configurată pe server sau lipsește secretul (ADMIN_PORTAL_PASSWORD / ADMIN_PORTAL_SECRET)." +
            detail,
        );
        return;
      }
      setError(`Nu s-a putut autentifica (cod ${res.status}).` + detail);
    } catch {
      setError("Eroare de rețea; reîncearcă sau verifică conexiunea.");
    } finally {
      setLoading(false);
    }
  }

  if (!passwordLoginEnabled) {
    return (
      <div className="mx-auto w-full max-w-sm space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-950">
        <h1 className="text-base font-semibold">Acces ImobIntel Admin</h1>
        <p>
          Setează pe server variabilele{" "}
          <code className="rounded bg-amber-100/80 px-1">ADMIN_PORTAL_PASSWORD</code> și{" "}
          <code className="rounded bg-amber-100/80 px-1">ADMIN_PORTAL_SECRET</code>, apoi
          reîmprospătează pagina.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Acces ImobIntel Admin</h1>
        <p className="mt-1 text-sm text-zinc-500">Introdu parola de acces.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        {/* Câmp „username” invizibil: recomandat pentru accesibilitate la formulare doar parolă + elimină avertismentul Chrome. */}
        <input
          type="text"
          name="imob_admin_user_hint"
          autoComplete="username"
          defaultValue="imobintel-admin"
          className="sr-only"
          tabIndex={-1}
          readOnly
          aria-hidden
        />
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
            disabled={loading}
            autoFocus
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "admin-login-err" : undefined}
          />
        </div>
        {error ? (
          <p id="admin-login-err" className="text-sm text-rose-600" role="alert" aria-live="polite">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Se verifică…" : "Continuă"}
        </Button>
      </form>
    </div>
  );
}
