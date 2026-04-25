import { redirect } from "next/navigation";

import { isAdminPortalPasswordConfigured } from "@/lib/admin-portal-jwt";
import { getAdminPortalSession } from "@/lib/admin-portal-session";
import { auth } from "@/lib/auth";

import { AdminLoginForm } from "./admin-login-form";

function safeRedirectTo(path: string | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/admin";
  if (!path.startsWith("/admin")) return "/admin";
  return path;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const sp = await searchParams;
  const from = safeRedirectTo(sp.from);

  if (await getAdminPortalSession()) {
    redirect(from);
  }

  const session = await auth();
  if (session?.user?.role === "admin") {
    redirect(from);
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-zinc-50/80 px-4 py-16">
      <AdminLoginForm passwordLoginEnabled={isAdminPortalPasswordConfigured()} />
    </div>
  );
}
