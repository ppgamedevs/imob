import { requireAdmin } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export const metadata = { title: "Estimates - Admin" };

export default async function EstimatesLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
