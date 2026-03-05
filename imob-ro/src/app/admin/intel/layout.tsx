import { requireAdmin } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export const metadata = { title: "Intel Management - Admin" };

export default async function IntelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
