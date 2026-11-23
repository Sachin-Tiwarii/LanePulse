import bcrypt from "bcrypt";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";

const COOKIE_NAME = "lanepulse_token";

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

const sendAuthCookie = (res, user) => {
  const token = generateToken(user._id);

  res.cookie(COOKIE_NAME, token, cookieOptions());
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isDemo:
    user.email === process.env.DEMO_EMAIL?.trim().toLowerCase(),
});

// ========================================
// NORMAL LOGIN
// ========================================

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password_hash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    sendAuthCookie(res, user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again.",
    });
  }
};

// ========================================
// DEMO LOGIN
// ========================================

export const demoLogin = async (req, res) => {
  try {
    const demoEmail = process.env.DEMO_EMAIL?.trim().toLowerCase();

    if (!demoEmail) {
      return res.status(500).json({
        success: false,
        message: "Demo account configuration is missing.",
      });
    }

    const user = await User.findOne({
      email: demoEmail,
      role: "operator",
    });

    if (!user) {
      return res.status(503).json({
        success: false,
        message: "Demo account is not configured yet.",
      });
    }

    sendAuthCookie(res, user);

    return res.status(200).json({
      success: true,
      message: "Demo login successful.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Demo login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to start demo session.",
    });
  }
};

// ========================================
// GET CURRENT USER
// ========================================

export const getCurrentUser = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: publicUser(req.user),
  });
};

// ========================================
// LOGOUT
// ========================================

export const logoutUser = async (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};