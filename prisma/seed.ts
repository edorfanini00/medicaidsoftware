import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../src/lib/seed-demo";

const prisma = new PrismaClient();

seedDemo(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
