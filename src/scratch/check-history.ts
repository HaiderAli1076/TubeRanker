import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking last 10 CreditLedger entries...");
  const ledgers = await prisma.creditLedger.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log(JSON.stringify(ledgers, null, 2));

  console.log("\nChecking last 10 AuditLog entries...");
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log(JSON.stringify(auditLogs, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
