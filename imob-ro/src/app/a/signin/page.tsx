"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { sendMagicLink } from "./actions";

export default function AgentSignInPage() {
  const [state, formAction, pending] = useActionState(sendMagicLink, null);

  useEffect(() => {
    if (state?.success) {
      // Focus could be improved with a success message component
    }
  }, [state]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="w-full max-w-md px-6">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-xl border border-white/10 p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block mb-4">
              <h1 className="text-3xl font-bold text-white">imob.ro</h1>
            </Link>
            <h2 className="text-xl font-semibold text-white mb-2">Agent Workspace</h2>
            <p className="text-sm text-gray-400">
              Sign in with your email to access bulk analysis and portfolio management
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-white">
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="agent@agency.com"
                disabled={pending}
                className="mt-2"
              />
            </div>

            {state?.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{state.error}</p>
              </div>
            )}

            {state?.success && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm text-green-400">
                  Check your email! We sent you a magic link to sign in.
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-white text-black hover:bg-gray-200"
            >
              {pending ? "Sending..." : "Send magic link"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-gray-500 text-center">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-gray-400">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline hover:text-gray-400">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-white transition">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
