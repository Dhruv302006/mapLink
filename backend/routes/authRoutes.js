/**
 * User Authentication API Router
 */
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

// Local registration route
router.post("/signup", authController.signup);

// Local login route
router.post("/login", authController.login);

// Google Sign-In verification route
router.post("/google", authController.googleAuth);

// Active profile verify session route (Protected by JWT)
router.get("/me", authenticateToken, authController.getMe);

module.exports = router;
