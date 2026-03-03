import { prisma } from "../src/lib/db";

export async function seedPlans() {
  await prisma.plan.upsert({
    where: { code: "free" },
    update: {
      features: {
        analyze: 10,
        pdf: 1,
        share: 0,
        alerts: 0,
        advancedComps: false,
        detailedScore: false,
        history: false,
        csvExport: false,
        support: "community",
      },
    },
    create: {
      code: "free",
      name: "Free",
      priceCents: 0,
      features: {
        analyze: 10,
        pdf: 1,
        share: 0,
        alerts: 0,
        advancedComps: false,
        detailedScore: false,
        history: false,
        csvExport: false,
        support: "community",
      },
    },
  });

  await prisma.plan.upsert({
    where: { code: "standard" },
    update: {
      priceCents: 4900,
      stripePrice: process.env.STRIPE_PRICE_STANDARD ?? null,
      features: {
        analyze: 50,
        pdf: 10,
        share: 10,
        alerts: 5,
        advancedComps: true,
        detailedScore: true,
        history: true,
        historyDays: 30,
        csvExport: false,
        support: "email",
      },
    },
    create: {
      code: "standard",
      name: "Standard",
      priceCents: 4900,
      stripePrice: process.env.STRIPE_PRICE_STANDARD ?? null,
      features: {
        analyze: 50,
        pdf: 10,
        share: 10,
        alerts: 5,
        advancedComps: true,
        detailedScore: true,
        history: true,
        historyDays: 30,
        csvExport: false,
        support: "email",
      },
    },
  });

  await prisma.plan.upsert({
    where: { code: "pro" },
    update: {
      priceCents: 9900,
      stripePrice: process.env.STRIPE_PRICE_PRO ?? null,
      features: {
        analyze: 200,
        pdf: 50,
        share: 50,
        alerts: 20,
        advancedComps: true,
        detailedScore: true,
        history: true,
        historyDays: 90,
        csvExport: true,
        support: "priority",
      },
    },
    create: {
      code: "pro",
      name: "Pro",
      priceCents: 9900,
      stripePrice: process.env.STRIPE_PRICE_PRO ?? null,
      features: {
        analyze: 200,
        pdf: 50,
        share: 50,
        alerts: 20,
        advancedComps: true,
        detailedScore: true,
        history: true,
        historyDays: 90,
        csvExport: true,
        support: "priority",
      },
    },
  });

  await prisma.plan.upsert({
    where: { code: "enterprise" },
    update: {
      priceCents: 24900,
      stripePrice: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
      features: {
        analyze: -1,
        pdf: -1,
        share: -1,
        alerts: -1,
        advancedComps: true,
        detailedScore: true,
        history: true,
        historyDays: -1,
        csvExport: true,
        support: "dedicated",
      },
    },
    create: {
      code: "enterprise",
      name: "Enterprise",
      priceCents: 24900,
      stripePrice: process.env.STRIPE_PRICE_ENTERPRISE ?? null,
      features: {
        analyze: -1,
        pdf: -1,
        share: -1,
        alerts: -1,
        advancedComps: true,
        detailedScore: true,
        history: true,
        historyDays: -1,
        csvExport: true,
        support: "dedicated",
      },
    },
  });

  console.log("Seeded plans: free, standard, pro, enterprise");
}

if (require.main === module) {
  seedPlans()
    .then(() => {
      console.log("Seed completed");
      process.exit(0);
    })
    .catch((e) => {
      console.error("Seed failed:", e);
      process.exit(1);
    });
}
