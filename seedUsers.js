const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/Users"); // Adjust path if needed

const MONGO_URI = "mongodb+srv://King:King%402025@visitor-database.r7r8srv.mongodb.net/?retryWrites=true&w=majority&appName=Visitor-Database"; // Replace this!

const users = [
  {
    name: "Alice",
    mobile: "9000000001",
    password: "alice123",
    role: "resident",
    block: 1,
    flat: 101,
  },
  {
    name: "Bob",
    mobile: "9000000002",
    password: "bob123",
    role: "resident",
    block: 2,
    flat: 202,
  },
  {
    name: "Guard John",
    mobile: "9000000003",
    password: "guard123",
    role: "guard",
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    const user = new User({ ...u, password: hashed });
    try {
      await user.save();
      console.log(`✅ Created user: ${u.name}`);
    } catch (err) {
      console.error(`❌ Error creating user ${u.name}:`, err.message);
    }
  }

  mongoose.disconnect();
}

seed();
