/**
 * Day 23 - Account Page
 * Shows current plan, usage, and manage subscription
 */

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getPlanLimits, getSubscription, getUsage } from "@/lib/billing/entitlements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import ManageSubscriptionButton from "./ManageSubscriptionButton";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const subscription = await getSubscription(session.user.id);
  const limits = await getPlanLimits(subscription.planCode);
  const usage = await getUsage(session.user.id);

  const isPro = subscription.planCode === "pro";

  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Contul meu</h1>

      {/* User Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{session.user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Plan:</span>
              <Badge variant={isPro ? "default" : "outline"}>
                {subscription.planCode.toUpperCase()}
              </Badge>
            </div>
            {subscription.status && subscription.status !== "active" && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="secondary">{subscription.status}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Progress */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Utilizare lunară</CardTitle>
          <CardDescription>
            Perioada:{" "}
            {usage.periodStart.toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Analyze */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Analize proprietăți</span>
              <span className="text-sm text-muted-foreground">
                {usage.analyze}/{limits.analyze}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usage.analyze >= limits.analyze ? "bg-destructive" : "bg-primary"
                }`}
                style={{ width: `${Math.min((usage.analyze / limits.analyze) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* PDF */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Rapoarte PDF</span>
              <span className="text-sm text-muted-foreground">
                {usage.pdf}/{limits.pdf}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usage.pdf >= limits.pdf ? "bg-destructive" : "bg-primary"
                }`}
                style={{ width: `${Math.min((usage.pdf / limits.pdf) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Share */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Link-uri share</span>
              <span className="text-sm text-muted-foreground">
                {usage.share}/{limits.share}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  usage.share >= limits.share ? "bg-destructive" : "bg-primary"
                }`}
                style={{ width: `${Math.min((usage.share / limits.share) * 100, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Management */}
      <Card>
        <CardHeader>
          <CardTitle>Gestionare abonament</CardTitle>
          <CardDescription>
            {isPro
              ? "Administrează abonamentul Pro: modifică plata, anulează sau vezi facturi"
              : "Upgrade la Pro pentru mai multe analize, PDF-uri și link-uri share"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPro ? (
            <ManageSubscriptionButton />
          ) : (
            <Button asChild>
              <a href="/pricing">Upgrade la Pro</a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
