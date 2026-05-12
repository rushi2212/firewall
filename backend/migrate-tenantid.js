import mongoose from "mongoose";
import { ENV } from "./config/env.js";
import { Log } from "./models/Log.js";

async function migrateLogs() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(ENV.MONGO_URI);
    console.log("✅ Connected\n");

    // Find and migrate logs with null tenantId to "default"
    console.log("📋 Migrating logs with tenantId: null → 'default'");
    const result = await Log.updateMany(
      { tenantId: { $in: [null, undefined] } },
      { $set: { tenantId: "default" } }
    );
    console.log(`✅ Updated ${result.modifiedCount} documents`);

    // Verify migration
    const verifyCount = await Log.countDocuments({ tenantId: "default" });
    const nullCount = await Log.countDocuments({ tenantId: null });
    
    console.log(`\n📊 After migration:`);
    console.log(`   - tenantId="default": ${verifyCount} logs`);
    console.log(`   - tenantId=null: ${nullCount} logs`);

    await mongoose.disconnect();
    console.log(`\n✅ Migration complete!`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

migrateLogs();
