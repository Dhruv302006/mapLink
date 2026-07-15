/**
 * Room Management & Telemetry API Router
 */
const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController");
const { authenticateToken } = require("../middleware/auth");

// Secure all room endpoints with JWT check
router.use(authenticateToken);

// Create tracking session room
router.post("/create", roomController.createRoom);

// Check if tracking session UUID exists
router.get("/:roomId/check", roomController.checkRoom);

// Fetch room track coordinates history
router.get("/:roomId/history", roomController.getHistory);

module.exports = router;
