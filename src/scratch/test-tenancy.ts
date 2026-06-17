/* eslint-disable no-console */
import "dotenv/config";
import { prisma, tenantStorage } from "../lib/prisma";
import { getRedis } from "../lib/redis";

async function runTenancyTest() {
  console.log("--------------------------------------------------");
  console.log("RUNNING MULTI-TENANCY ISOLATION VERIFICATION TEST");
  console.log("--------------------------------------------------\n");

  const testChannelId = `test-ch-${Date.now()}`;

  // 1. User A creates a Channel with workspaceId = "workspace-A"
  console.log("Step 1: User A (workspace-A) creates a new Channel record...");
  await tenantStorage.run({ workspaceId: "workspace-A", userId: "user-A" }, async () => {
    const channel = await prisma.channel.create({
      data: {
        youtubeId: testChannelId,
        title: "Workspace A Premium Channel",
        publishedAt: new Date(),
      }
    });
    console.log(`✅ Channel successfully created. Saved workspaceId: ${channel.workspaceId}\n`);
  });

  // 2. User B queries Channel with workspaceId = "workspace-B"
  console.log("Step 2: User B (workspace-B) queries for the same Channel ID...");
  await tenantStorage.run({ workspaceId: "workspace-B", userId: "user-B" }, async () => {
    const channels = await prisma.channel.findMany({
      where: { youtubeId: testChannelId }
    });

    console.log(`   Query results count: ${channels.length}`);

    // 3. Assert User B gets 0 results
    if (channels.length === 0) {
      console.log("\n✅ SUCCESS: Tenant isolation works! User B gets 0 results and cannot access workspace-A's channel.");
    } else {
      console.error("\n❌ FAILURE: Tenant isolation leak! User B was able to read workspace-A's channel.");
      process.exit(1);
    }
  });

  // Cleanup: Delete the test channel without active tenant storage context (unfiltered operation)
  console.log("\nStep 3: Cleaning up test channel database records...");
  await prisma.channel.delete({
    where: { youtubeId: testChannelId }
  });
  console.log("✅ Cleanup complete.");

  await getRedis().quit();
  process.exit(0);
}

runTenancyTest().catch((err) => {
  console.error("Verification test crashed:", err);
  process.exit(1);
});
