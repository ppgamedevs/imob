"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { type AdminLoginState, loginToAdminPortal } from "./actions";

type Props = {
  from: string;
  passwordLoginEnabled: boolean;
};

export function AdminLoginForm({ from, passwordLoginEnabled }: Props) {
  const [state, formAction, isPending] = useActionState(
    loginToAdminPortal,
    null as AdminLoginState,
  );

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

  const error = state?.error;

  return (
    <div className="mx-auto w-full max-w-sm space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Acces ImobIntel Admin</h1>
        <p className="mt-1 text-sm text-zinc-500">Introdu parola de acces.</p>
      </div>

      <form action={formAction} className="space-y-3" noValidate>
        <input type="hidden" name="from" value={from} />
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
            className="mt-1"
            required
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
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Se verifică…" : "Continuă"}
        </Button>
      </form>
    </div>
  );
}
