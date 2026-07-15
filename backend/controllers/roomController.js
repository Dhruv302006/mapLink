/**
 * Room and Location Telemetry Business Logic Handler (Controller)
 */
const crypto = require("crypto");
const { pool } = require("../config/db");

/**
 * Creates a unique room session UUID
 */
async function createRoom(req, res) {
    const roomId = crypto.randomUUID();
    try {
        await pool.query("INSERT INTO rooms (id) VALUES ($1)", [roomId]);
        res.status(201).json({ roomId });
    } catch (err) {
        console.error("Create room controller error:", err);
        res.status(500).json({ error: "Failed to create tracking room session" });
    }
}

/**
 * Checks if a room UUID exists in the database
 */
async function checkRoom(req, res) {
    const { roomId } = req.params;
    try {
        const result = await pool.query("SELECT id FROM rooms WHERE id = $1", [roomId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ exists: false, error: "Tracking session not found" });
        }
        res.json({ exists: true });
    } catch (err) {
        console.error("Check room controller error:", err);
        res.status(500).json({ error: "Server database connection error" });
    }
}

/**
 * Resolves coordinate tracking logs history using PostGIS projections
 */
async function getHistory(req, res) {
    const { roomId } = req.params;
    try {
        const query = `
            SELECT 
                socket_id,
                username,
                ST_X(geom::geometry) as longitude,
                ST_Y(geom::geometry) as latitude,
                created_at
            FROM locations
            WHERE room_id = $1
            ORDER BY username, created_at ASC;
        `;
        const result = await pool.query(query, [roomId]);
        res.json(result.rows);
    } catch (err) {
        console.error("Get history controller error:", err);
        res.status(500).json({ error: "Failed to fetch room route history" });
    }
}

module.exports = {
    createRoom,
    checkRoom,
    getHistory
};
