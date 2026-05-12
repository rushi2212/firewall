#!/usr/bin/env node
import mongoose from "mongoose";
import crypto from "crypto";
import { connectDB } from "../config/db.js";
import { ENV } from "../config/env.js";

const saltPassword = (password, salt = null) => {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), s, 64).toString("hex");
  return { salt: s, hash: derived };
};

const run = async () => {
  await connectDB();

  const username = String(ENV.ADMIN_USERNAME || "admin");
  const password = String(ENV.ADMIN_PASSWORD || "");
  const role = String(ENV.ADMIN_ROLE || "owner");

  if (!password) {
    console.error("ADMIN_PASSWORD is empty in environment. Aborting seed.");
    process.exit(1);
  }

  const { salt, hash } = saltPassword(password);

  try {
    const adminsColl = mongoose.connection.collection("admins");
    const now = new Date();
    const res = await adminsColl.updateOne(
      { username },
      {
        $set: {
          username,
          role,
          salt,
          passwordHash: hash,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    if (res.upsertedCount || res.matchedCount) {
      console.log(`✅ Admin '${username}' written to DB (collection: admins)`);
    } else {
      console.log(`ℹ️  No changes made for admin '${username}'.`);
    }
  } catch (err) {
    console.error("Failed to write admin to DB:", err.message || err);
    process.exitCode = 2;
  } finally {
    mongoose.disconnect();
  }
};

run();
