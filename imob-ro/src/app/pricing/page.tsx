import React from "react";

import CheckoutButton from "../../components/CheckoutButton";

export default function PricingPage() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">Pricing</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded p-6">
          <h2 className="text-xl font-medium">Free</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            3 free PDF reports / month, basic alerts
          </p>
        </div>

        <div className="border rounded p-6">
          <h2 className="text-xl font-medium">Pro</h2>
          <p className="mt-2 text-sm text-muted-foreground">Unlimited PDFs, advanced alerts</p>
          <div className="mt-4">
            <CheckoutButton mode="subscription">Upgrade to Pro</CheckoutButton>
          </div>
        </div>
      </div>
    </div>
  );
}
