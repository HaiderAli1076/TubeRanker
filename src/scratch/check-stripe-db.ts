import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      stripeCustomerId: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
      credits: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 3,
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

main();
