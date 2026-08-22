x
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

// Load environment variables
dotenv.config();

// Database connection
const connectDB = require("./config/db");

// Route imports
const authRoutes = require("./routes/authRoutes");

// Initialize Express app
const app = express();

// ========================
// Security Middleware
// ========================
app.use(helmet());

// ========================
// CORS Configuration
// Configured for separate frontend with credentials (cookies)
// ========================
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true, // Allow cookies to be sent cross-origin
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// ========================
// Body Parsing & Cookie Parsing
// ========================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ========================
// Request Logging (disable in test environment)
// ========================
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ========================
// API Routes
// ========================
app.use("/api/auth", authRoutes);

// ========================
// Health Check
// ========================
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CivicFlow API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ========================
// 404 Handler
// ========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ========================
// Global Error Handler
// ========================
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.message);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: messages,
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid resource ID",
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}`,
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ========================
// Start Server
// ========================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`\n🚀 CivicFlow Backend Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/api/health\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
