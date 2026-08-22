const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

dotenv.config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const grievanceRoutes = require("./routes/grievanceRoutes");
const { getGrievanceStats } = require("./controllers/grievanceController");
const { protect } = require("./middleware/authMiddleware");

const app = express();

app.use(helmet());

const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
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
app.get("/api/citizen/dashboard/stats", protect, getGrievanceStats);

// App Store Support Routes (to prevent 404s when fetching platform data)
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

app.get("/api/chain/log", (req, res) => {
  res.status(200).json([]);
});

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

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log("CivicFlow Backend Server running on port " + PORT);
      console.log("Environment: " + (process.env.NODE_ENV || "development"));
      console.log("Health Check: http://localhost:" + PORT + "/api/health");
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
