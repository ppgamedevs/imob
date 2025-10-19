// Helper module declarations to satisfy editor/TS server for path-alias imports
declare module "@/lib/db" {
  import type { PrismaClient } from "@prisma/client";
  // Only export the PrismaClient type to avoid declaring runtime values that conflict
  export type { PrismaClient };
}
export {};
