// resetPassword.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const db = require("./db");

async function resetPassword(mobile, newPassword) {
  await db();
  const user = await User.findOne({ mobile });
  if (!user) return console.log("User not found");

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  console.log(`✅ Password reset for ${mobile}`);
  process.exit();
}

// Replace these values as needed before running
resetPassword("9876543210", "newsecurepass123");
