import "dotenv/config";

import { prisma } from "../src/lib/db";

async function run() {
  const rows: any[] =
    await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
  console.log(rows.map((r) => r.table_name));
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
