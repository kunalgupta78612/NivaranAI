const Admin = require("../models/Admin");
const Citizen = require("../models/Citizen");
const Department = require("../models/Department");

const seedBuiltInAdmin = async () => {
  try {
    const adminEmail = "astha@gmail.com";
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (!existingAdmin) {
      await Admin.create({
        fullName: "System Admin",
        email: adminEmail,
        password: "12345678",
        role: "admin",
      });
      console.log("Built-in Admin created successfully (astha@gmail.com)");
    } else {
      console.log("Built-in Admin already exists (astha@gmail.com)");
    }

    await Citizen.updateMany({ status: "pending" }, { status: "approved" });
    await Department.updateMany({ status: "pending" }, { status: "approved" });
  } catch (error) {
    console.error("Error seeding built-in admin:", error.message);
  }
};

module.exports = seedBuiltInAdmin;
