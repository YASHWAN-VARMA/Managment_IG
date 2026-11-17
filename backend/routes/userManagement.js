const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const protect = require("../middleware/auth");

const router = express.Router();

async function requireAdmin(req, res, next) {
  try {
    if (req.user?.role !== "Admin") {
      return res.status(403).json({ message: "Only an Admin can manage user accounts." });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Unable to verify administrator access." });
  }
}

router.use(protect, requireAdmin);

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

// List users without ever returning password hashes or refresh tokens.
router.get("/users", async (req, res) => {
  try {
    const users = await User.find()
      .select("name email phone role isActive createdAt updatedAt")
      .sort({ role: 1, name: 1 })
      .lean();
    res.json({ count: users.length, users: users.map((u) => ({ ...u, id: u._id })) });
  } catch (error) {
    res.status(500).json({ message: "Unable to load users." });
  }
});

// Admin can create Manager accounts only. Admin role is never assignable here.
router.post("/users", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({ message: "Name, email, phone and temporary password are required." });
    }
    if (password.length < 12) {
      return res.status(400).json({ message: "Temporary password must be at least 12 characters." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }]
    }).select("_id email phone");

    if (existing) {
      return res.status(409).json({
        message: existing.email === normalizedEmail
          ? "That email address is already registered."
          : "That phone number is already registered."
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      role: "Manager",
      isActive: true,
      phoneVerified: false
    });

    res.status(201).json({ message: "Manager account created.", user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email or phone number is already in use." });
    }
    res.status(500).json({ message: "Unable to create user." });
  }
});

// Edit profile fields; role escalation is deliberately not supported.
router.put("/users/:id", async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ message: "Name, email and phone are required." });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "Admin") {
      return res.status(403).json({ message: "Admin profile changes must be made through account settings." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const duplicate = await User.findOne({
      _id: { $ne: user._id },
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }]
    });
    if (duplicate) return res.status(409).json({ message: "Email or phone number is already in use." });

    user.name = name.trim();
    user.email = normalizedEmail;
    user.phone = normalizedPhone;
    await user.save();
    res.json({ message: "User updated.", user: publicUser(user) });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid user ID." });
    res.status(500).json({ message: "Unable to update user." });
  }
});

// Deactivate/reactivate a Manager. Deactivation revokes every refresh session.
router.patch("/users/:id/status", async (req, res) => {
  try {
    if (typeof req.body.isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be true or false." });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "Admin") return res.status(403).json({ message: "Admin accounts cannot be deactivated here." });

    user.isActive = req.body.isActive;
    await user.save();

    if (!user.isActive) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
      await RefreshToken.updateMany(
        { user: user._id, revokedAt: null },
        { $set: { revokedAt: new Date() } }
      );
    }

    res.json({ message: user.isActive ? "User activated." : "User deactivated and sessions revoked.", user: publicUser(user) });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid user ID." });
    res.status(500).json({ message: "Unable to update account status." });
  }
});

// Admin sets a temporary password; all existing sessions are revoked.
router.post("/users/:id/reset-password", async (req, res) => {
  try {
    const { password } = req.body;
    if (typeof password !== "string" || password.length < 12) {
      return res.status(400).json({ message: "New temporary password must be at least 12 characters." });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "Admin") return res.status(403).json({ message: "Use the Admin account's own password recovery process." });

    user.password = password;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    res.json({ message: "Password reset. All existing sessions have been revoked." });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid user ID." });
    res.status(500).json({ message: "Unable to reset password." });
  }
});
router.post("/users/:id/revoke-sessions", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("_id role");
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "Admin") return res.status(403).json({ message: "Admin sessions cannot be revoked from this screen." });

    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    const result = await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    res.json({ message: "All user sessions revoked.", revokedCount: result.modifiedCount });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid user ID." });
    res.status(500).json({ message: "Unable to revoke sessions." });
  }
});

module.exports = router;