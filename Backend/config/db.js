const mongoose = require("mongoose");

/**
 * Connect to MongoDB
 * Uses MONGODB_URI from environment variables
 */
let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/nivaran", {
      serverSelectionTimeoutMS: 5000,  // Give up after 5s (prevents serverless hangs)
      connectTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    // On Vercel: log & continue — DB-dependent routes will return 500
  }
};

module.exports = connectDB;
