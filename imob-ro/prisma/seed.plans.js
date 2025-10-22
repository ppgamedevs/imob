/**
 * Day 23 - Seed Plans
 * Creates Free and Pro plans with feature limits
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedPlans() {
  await prisma.plan.upsert({
    where: { code: "free" },
    update: {},
    create: {
      code: "free",
      name: "Free",
      priceCents: 0,
      features: {
        analyze: 20,
        pdf: 3,
        share: 3,
        support: "email",
      },
    },
  });

  await prisma.plan.upsert({
    where: { code: "pro" },
    update: {},
    create: {
      code: "pro",
      name: "Pro",
      priceCents: 1900, // 19 €/lună
      stripePrice: process.env.STRIPE_PRICE_PRO || null,
      features: {
        analyze: 300,
        pdf: 50,
        share: 100,
        support: "priority",
      },
    },
  });

  console.log("✅ Seeded plans: free, pro");
}

seedPlans()
  .then(() => {
    console.log("✅ Seed completed");
    process.exit(0);
  })
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
