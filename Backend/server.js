const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

dotenv.config();

const connectDB = require("./config/db");
const seedBuiltInAdmin = require("./config/seedAdmin");

const authRoutes = require("./routes/authRoutes");
const grievanceRoutes = require("./routes/grievanceRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const chatRoutes = require("./routes/chatRoutes");
const { chainLog, chainVerify } = require("./controllers/chatController");

const { getGrievanceStats } = require("./controllers/grievanceController");
const { protect } = require("./middleware/authMiddleware");

const app = express();

// Helmet with cross-origin resource policy enabled for development
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Dynamic CORS configuration allowing all localhost and 127.0.0.1 origins in development
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:5177",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
      "http://127.0.0.1:5176",
      "http://127.0.0.1:5177",
    ].filter(Boolean);

    if (
      process.env.NODE_ENV !== "production" ||
      allowedOrigins.includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
};
app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/grievances", grievanceRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.get("/api/citizen/dashboard/stats", protect, getGrievanceStats);

// Support Routes
app.get("/api/stats", (req, res) => {
  res.status(200).json({
    success: true,
    total: 42,
    open: 18,
    critical: 4,
    escalated: 2,
    ghostCaught: 3,
    blindSpots: 1,
    avgResolutionDays: 3.4,
  });
});

app.get("/api/officers", (req, res) => {
  res.status(200).json([
    { id: "OFF-101", name: "R. K. Sharma", dept: "Sanitation Department", integrityScore: 92, reopenedCount: 1 },
    { id: "OFF-102", name: "Priya Verma", dept: "Roads & Public Works", integrityScore: 88, reopenedCount: 0 },
  ]);
});

app.get("/api/assets", (req, res) => {
  res.status(200).json([
    { id: "AST-201", name: "Transformer Ward 12", status: "operational" },
    { id: "AST-202", name: "Water Pipeline Main Road", status: "maintenance" },
  ]);
});

// Tamper-evident audit ledger (real SHA-256 hash chain, see services/chain.js)
app.get("/api/chain/log", chainLog);
app.get("/api/chain/verify", chainVerify);

app.get("/api/wards/silence", (req, res) => {
  res.status(200).json([]);
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CivicFlow API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route " + req.originalUrl + " not found",
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: messages,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid resource ID",
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: "Duplicate value for " + field,
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Middleware to ensure DB connection on serverless requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await seedBuiltInAdmin();

    const server = app.listen(PORT, () => {
      console.log("CivicFlow Backend Server running on port " + PORT);
      console.log("Environment: " + (process.env.NODE_ENV || "development"));
      console.log("Health Check: http://localhost:" + PORT + "/api/health");
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`⚠️ Port ${PORT} is currently busy. Nodemon will retry...`);
      } else {
        console.error("Server error:", err.message);
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

if (!process.env.VERCEL) {
  startServer();
}

module.exports = app;
