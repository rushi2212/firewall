import mongoose from "mongoose";
import { ENV } from "./config/env.js";
import { Log } from "./models/Log.js";

async function debugLogs() {
  try {
    console.log("Connecting to MongoDB:", ENV.MONGO_URI.slice(0, 50) + "...");
    await mongoose.connect(ENV.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Count total logs
    const total = await Log.countDocuments({});
    console.log(`📊 Total logs in collection: ${total}`);

    // Count by tenantId
    const byTenant = await Log.aggregate([
      { $group: { _id: "$tenantId", count: { $sum: 1 } } }
    ]);
    console.log(`\n📋 Logs by tenantId:`);
    byTenant.forEach(row => {
      console.log(`   - "${row._id}": ${row.count} logs`);
    });

    // Count by decision
    const byDecision = await Log.aggregate([
      { $group: { _id: "$decision", count: { $sum: 1 } } }
    ]);
    console.log(`\n🚦 Logs by decision:`);
    byDecision.forEach(row => {
      console.log(`   - ${row._id}: ${row.count} logs`);
    });

    // Get latest 5 logs
    const latest = await Log.find({}).sort({ createdAt: -1 }).limit(5).select("ip path decision threatScore createdAt");
    console.log(`\n📝 Latest 5 logs:`);
    latest.forEach((log, idx) => {
      console.log(`   ${idx + 1}. ${log.ip} -> ${log.path} [${log.decision}] (threat: ${log.threatScore})`);
    });

    // Test the getLogs query with limit
    console.log(`\n🔍 Testing query with limit=500 and tenantId="default":`);
    const testLogs = await Log.find({ tenantId: "default" }).sort({ createdAt: -1 }).limit(500);
    console.log(`   Returned: ${testLogs.length} logs`);

    await mongoose.disconnect();
    console.log(`\n✅ Done`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

debugLogs();
