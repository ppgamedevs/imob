"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("../src/lib/db");
async function run() {
  const rows = await db_1.prisma
    .$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
  console.log(rows.map((r) => r.table_name));
  await db_1.prisma.$disconnect();
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
