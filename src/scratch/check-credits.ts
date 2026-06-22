import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Fetching CreditLedger entries for monthly billing cycle reset...");
  try {
    const totalConsumption = await prisma.creditLedger.count({
      where: {
        description: {
          startsWith: "Consumption:",
        },
      },
    });

    const firstConsumption = await prisma.creditLedger.findFirst({
      where: {
        description: {
          startsWith: "Consumption:",
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const lastConsumption = await prisma.creditLedger.findFirst({
      where: {
        description: {
          startsWith: "Consumption:",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`--- Redis Queue Job Volume Analysis ---`);
    console.log(`Total credit consumption jobs in DB: ${totalConsumption}`);
    if (firstConsumption && lastConsumption) {
      console.log(`First job timestamp: ${firstConsumption.createdAt.toISOString()}`);
      console.log(`Last job timestamp: ${lastConsumption.createdAt.toISOString()}`);
      
      const spanMs = lastConsumption.createdAt.getTime() - firstConsumption.createdAt.getTime();
      const spanDays = spanMs / (1000 * 60 * 60 * 24);
      console.log(`Data span: ${spanDays.toFixed(2)} days`);
      
      const jobsPerDay = totalConsumption / (spanDays || 1);
      const jobsPerMonth = jobsPerDay * 30;
      console.log(`Average jobs per day: ${jobsPerDay.toFixed(2)}`);
      console.log(`Extrapolated jobs per month (30 days): ${jobsPerMonth.toFixed(2)}`);
    } else {
      console.log("No job consumption records found in database.");
    }

    const totalUsers = await prisma.user.count();
    console.log(`Total users in DB: ${totalUsers}`);
  } catch (error) {
    console.error("Error fetching credit ledger entries:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
