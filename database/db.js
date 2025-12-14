require("dotenv").config();
const mongoose = require("mongoose");
const seedCategories = require("../seeds/categorySeeder");
const seedProducts = require("../seeds/productSeeder");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URL);
      // await seedProducts();
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
