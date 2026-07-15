/**
 * Bootstrap Server Entry Point
 * Sets up Express, WebSocket services, database pools, and mounts MVC routers.
 */
require("dotenv").config();

const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");

const { initializeDatabase } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const { initSocket } = require("./sockets/trackerSocket");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io binding
const io = socketio(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Mount CORS and JSON request parsers
app.use(cors());
app.use(express.json());

// Run database migrations and PostGIS verifications
initializeDatabase();

// Mount MVC API Route Controllers
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

// Mount Socket.io handshake checks and event listeners
initSocket(io);

// Server health status checker
app.get("/", (req, res) => {
    res.send("MapLink Real-time Tracking MVC API is active.");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`MapLink MVC API Server listening on http://localhost:${PORT}`);
});
