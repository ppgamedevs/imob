/**
 * Day 23 - Billing Success Page
 * Shows after successful Stripe Checkout
 */

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingSuccessPage() {
  return (
    <div className="container mx-auto py-12 max-w-2xl">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl">Abonament activat cu succes!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Bine ai venit în planul Pro. Ai acum acces la toate funcțiile premium.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vei primi un email de confirmare în câteva minute. Poți începe să folosești toate
            funcțiile Pro imediat.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/">Mergi la Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/account">Vezi Contul Meu</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
