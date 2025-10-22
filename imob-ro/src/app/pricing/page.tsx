/**
 * Day 23 - Pricing Page v2
 * Shows detailed plan features and limits
 */

import React from "react";

import CheckoutButton from "../../components/CheckoutButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PricingPage() {
  return (
    <div className="container mx-auto py-12 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Pricing simplu, transparent</h1>
        <p className="text-lg text-muted-foreground">
          Alege planul care se potrivește nevoilor tale
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free Plan */}
        <Card className="relative">
          <CardHeader>
            <CardTitle className="text-2xl">Free</CardTitle>
            <CardDescription className="text-3xl font-bold mt-2">
              0 € <span className="text-base font-normal text-muted-foreground">/lună</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  <strong>20 analize</strong> proprietăți/lună
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  <strong>3 rapoarte PDF</strong>/lună
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  <strong>3 link-uri share</strong>/lună
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Suport email</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Acces AVM, TTS, Yield, Risk</span>
              </li>
            </ul>
            <button className="w-full py-2 px-4 border rounded font-medium" disabled>
              Plan curent
            </button>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="relative border-2 border-primary shadow-lg">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="px-4 py-1 text-sm">Popular</Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-2xl">Pro</CardTitle>
            <CardDescription className="text-3xl font-bold mt-2">
              19 € <span className="text-base font-normal text-muted-foreground">/lună</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  <strong>300 analize</strong> proprietăți/lună
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  <strong>50 rapoarte PDF</strong>/lună
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  <strong>100 link-uri share</strong>/lună
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>
                  <strong>Suport prioritar</strong>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Toate funcțiile Free</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Branduri custom în PDF</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Export CSV, API access (viitor)</span>
              </li>
            </ul>
            <CheckoutButton mode="subscription">Upgrade la Pro</CheckoutButton>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          Toate planurile includ: AVM (Automated Valuation Model), TTS (Time to Sell), Yield
          estimat, Risk scoring
        </p>
        <p className="mt-2">Plățile procesate securizat prin Stripe. Poți anula oricând.</p>
      </div>
    </div>
  );
}
