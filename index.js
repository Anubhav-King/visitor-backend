console.log("🚀 Starting server setup...");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const webpush = require("web-push");
const moment = require("moment");

const app = express();

// ➤ CORS: allow frontend origin
console.log("🔧 Configuring CORS...");
app.use(
  cors({
    origin: "https://visitor-frontend-mu.vercel.app", // ✅ your actual frontend domain
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // ✅ required for JWT, cookies, etc.
  }),
);

console.log("Test 11");
//app.options("*", (req, res) => res.sendStatus(204));
console.log("Test21");
app.use(express.json());
console.log("✅ Middleware configured");

// ➤ MongoDB connection
console.log("🔌 Connecting to MongoDB...");
mongoose
  .connect(
    "mongodb+srv://King:King%402025@visitor-database.r7r8srv.mongodb.net/?retryWrites=true&w=majority&appName=Visitor-Database",
  )
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// ➤ Models
console.log("📦 Loading models...");
const User = require("./models/Users");
const Visitor = require("./models/Visitor");
console.log("✅ Models loaded");

// ➤ JWT secret
const SECRET = "somesecretkey";

// ➤ VAPID setup
console.log("🔐 Setting up web push...");
webpush.setVapidDetails(
  "mailto:admin@example.com",
  "BNkdLVGab29b6l24GDBpc6vkRS1j28JewZzwU6YGbHgONiwAydbs9SHgwI4BYDwxiNTAr6wjS9NDeIQUqSqWvj8",
  "PRxVHQBd56UzTj8B7j_Xxfy12zHALgGmWfsiBaFSA1k",
);

// ➤ Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Missing token" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

// ➤ Register user
app.post("/api/register", async (req, res) => {
  const { name, mobile, password, role, block, flat } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await new User({ name, mobile, password: hashed, role, block, flat }).save();
  res.json({ message: "User registered" });
});

// ➤ Login
app.post("/api/login", async (req, res) => {
  const { mobile, password } = req.body;
  const user = await User.findOne({ mobile });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign(
    { id: user._id, role: user.role, block: user.block, flat: user.flat },
    SECRET,
  );
  res.json({
    token,
    role: user.role,
    block: user.block,
    flat: user.flat,
    name: user.name,
  });
});

// ➤ Save push subscription
app.post("/api/subscribe", authMiddleware, async (req, res) => {
  const { subscription } = req.body;
  try {
    const u = await User.findById(req.user.id);
    u.subscription = subscription;
    await u.save();
    res.sendStatus(201);
  } catch (err) {
    console.error("❌ Subscription save error", err);
    res.sendStatus(500);
  }
});

// ➤ Add visitor
app.post("/api/visitors", authMiddleware, async (req, res) => {
  try {
    const {
      name,
      purpose,
      block,
      flat,
      expectedArrival,
      vehicleType,
      vehicleNumber,
      contactNumber,
      photo,
      status,
    } = req.body;
    if (!["guard", "resident"].includes(req.user.role)) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const v = new Visitor({
      name,
      purpose,
      block,
      flat,
      expectedArrival,
      vehicleType,
      vehicleNumber,
      contactNumber,
      photo,
      status: status || "pending",
    });
    await v.save();

    const resident = await User.findOne({ role: "resident", block, flat });
    if (resident?.subscription) {
      console.log(
        "📬 Sending push notification to:",
        resident.subscription.endpoint,
      );
      await webpush
        .sendNotification(
          resident.subscription,
          JSON.stringify({
            title: "New Visitor Request",
            body: `${name} for ${purpose}`,
          }),
        )
        .catch(console.error);
    }

    res.status(201).json(v);
  } catch (err) {
    console.error("❌ Add visitor error", err);
    res.status(500).json({ error: "Failed to add visitor" });
  }
});

// ➤ Get visitors
app.get("/api/visitors", authMiddleware, async (req, res) => {
  const user = req.user;
  const { archived, block, flat, date, status } = req.query;

  const oneMinuteAgo = new Date(Date.now() - 60000); // 1 minute ago

  const filter = {};

  // Role-based visibility
  if (user.role === "resident") {
    filter.block = user.block;
    filter.flat = user.flat;
  }

  // Archived filter
  if (archived === "true") {
    filter.isArchived = true;
  } else if (archived === "false") {
    filter.isArchived = false;

    // ✅ Add 1-minute delay logic only for unarchived (current) view
    filter.$or = [
      { status: { $ne: "denied" } },
      { status: "denied", updatedAt: { $gte: oneMinuteAgo } }
    ];
  }

  // Guard filters
  if (user.role === "guard") {
    if (block) filter.block = Number(block);
    if (flat) filter.flat = Number(flat);
    if (status) filter.status = status;
    if (date) filter.entryDate = date; // "DD-MM-YYYY"
  }

  try {
    // ✅ Auto-archive denied visitors after 1 minute
    await Visitor.updateMany(
      {
        status: "denied",
        isArchived: false,
        updatedAt: { $lt: oneMinuteAgo }
      },
      {
        isArchived: true,
        entryDate: moment().format("DD-MM-YYYY")
      }
    );

    const visitors = await Visitor.find(filter).sort({ createdAt: -1 });
    res.json(visitors);
  } catch (err) {
    console.error("❌ Fetch visitors error", err);
    res.status(500).json({ error: "Failed to fetch visitors" });
  }
});
app.patch("/api/visitors/:id", authMiddleware, async (req, res) => {
  try {
    const {
      status,
      actualArrival,
      departureTime,
      photo,
      vehicleType,
      vehicleNumber,
    } = req.body;

    const v = await Visitor.findById(req.params.id);
    if (!v) return res.status(404).json({ error: "Not found" });

    // ✅ Allow resident to approve/deny only if the visitor matches their flat/block
    if (status && ["approved", "denied"].includes(status)) {
      if (req.user.role === "resident") {
        if (v.block !== req.user.block || v.flat !== req.user.flat) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      v.status = status;

      if (status === "denied") {
        v.entryDate = moment().format("DD-MM-YYYY");

        // ✅ Send push notification to guards
        const guards = await User.find({
          role: "guard",
          pushSubscription: { $exists: true }
        });

        for (const g of guards) {
          sendPushNotification(g.pushSubscription, {
            title: "Visitor Denied",
            body: `${v.name} was denied by ${req.user.name}`,
          });
        }
      }
    }

    // ✅ Mark actual arrival
    if (actualArrival) {
      v.actualArrival = actualArrival;
      v.status = "arrived";
    }

    // ✅ Mark departure
    if (departureTime) {
      v.departureTime = departureTime;
      v.status = "departed";
      v.isArchived = true;
      v.entryDate = moment().format("DD-MM-YYYY");
    }

    // ✅ Save/update photo if present
    if (photo !== undefined) {
      v.photo = photo;
    }

    // ✅ Save vehicle info if present
    if (vehicleType !== undefined) {
      v.vehicleType = vehicleType;
    }

    if (vehicleNumber !== undefined) {
      v.vehicleNumber = vehicleNumber;
    }


    await v.save();
    res.json(v);
  } catch (err) {
    console.error("❌ Update visitor error", err);
    res.status(500).json({ error: "Failed to update visitor" });
  }
});


// In your `index.js` or `routes/auth.js`
app.post("/api/change-password", authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Old password incorrect" });

    const hashedNew = await bcrypt.hash(newPassword, 10);
    user.password = hashedNew;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ➤ Start server
console.log("🎯 Ready to start listening...");

app.get("/", (req, res) => {
  res.send("Visitor backend is live!");
});

app.listen(3000, "0.0.0.0", () =>
  console.log("✅ Server running on port 3000"),
);
