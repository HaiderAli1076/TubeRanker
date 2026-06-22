import dotenv from "dotenv";
dotenv.config();
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Checking local database users...");
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        credits: true,
      },
    });

    console.log("Users in DB:", users);

    if (users.length === 0) {
      console.log("No users found. Creating a test user...");
      const newUser = await prisma.user.create({
        data: {
          email: "test-user@example.com",
          credits: 100,
        },
      });
      console.log("Created test user:", newUser);
    }
    console.log("Updating all users' credits to 10,000...");
    await prisma.user.updateMany({
      data: { credits: 10000 },
    });
    console.log("Credits successfully updated for all users.");
  } catch (error) {
    console.error("Error during check:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
