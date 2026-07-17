/**
 * WebSocket Telemetry Handler (Socket.io)
 * Integrates connection guards, real-time channels, and Redis write-behind caching.
 */
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const redisClient = require("../config/redis");

/**
 * Computes active users in a room by scanning memory states.
 */
async function getActiveRoomMembers(io, roomId) {
    const activeSockets = await io.in(roomId).fetchSockets();
    return activeSockets.map(s => ({
        socketId: s.id,
        username: s.user.username
    }));
}

/**
 * Write-Behind Cache Flush Routine
 * Optimization: Iterates over active room keys in Redis, aggregates coordinates arrays,
 * and executes single-transaction bulk SQL inserts to PostgreSQL.
 * Reduces database disk writing bottlenecks significantly under high telemetry traffic.
 */
async function flushRedisLogsToPostgres() {
    try {
        // Fetch all active tracking rooms recorded in the Redis Set
        const activeRooms = await redisClient.sMembers("active:rooms");
        if (activeRooms.length === 0) return;

        for (const roomId of activeRooms) {
            try {
                const redisKey = `room:path:logs:${roomId}`;
                const tempKey = `room:path:logs:temp:${roomId}`;

                // Check if coordinates exist in queue
                const exists = await redisClient.exists(redisKey);
                if (!exists) continue;

                // Atomically rename the list to a temporary key.
                // Optimization: Prevents concurrency race-conditions (new incoming points
                // during the SQL transaction are safely written to the original key name).
                await redisClient.rename(redisKey, tempKey);

                // Fetch all points inside the locked temporary list
                const logs = await redisClient.lRange(tempKey, 0, -1);
                if (logs.length === 0) {
                    await redisClient.del(tempKey);
                    continue;
                }

                // Construct parameterized bulk INSERT SQL statement
                const queryValues = [];
                const queryValuePlaceholders = [];
                let paramIndex = 1;

                logs.forEach((logStr) => {
                    try {
                        const log = JSON.parse(logStr);
                        queryValues.push(roomId, log.userId, log.socketId, log.username, log.longitude, log.latitude);
                        
                        // Coordinates mapping: ST_MakePoint(longitude, latitude) with SRID 4326
                        queryValuePlaceholders.push(`(
                            $${paramIndex}, 
                            $${paramIndex + 1}, 
                            $${paramIndex + 2}, 
                            $${paramIndex + 3}, 
                            ST_SetSRID(ST_MakePoint($${paramIndex + 4}, $${paramIndex + 5}), 4326)
                        )`);
                        
                        paramIndex += 6;
                    } catch (parseErr) {
                        console.error("Failed to parse coordinates log from Redis:", parseErr);
                    }
                });

                if (queryValues.length > 0) {
                    const sql = `
                        INSERT INTO locations (room_id, user_id, socket_id, username, geom)
                        VALUES ${queryValuePlaceholders.join(", ")}
                    `;
                    await pool.query(sql, queryValues);
                    console.log(`Successfully flushed [${logs.length}] location coordinates from Redis to Postgres for room: ${roomId}`);
                }

                // Safely delete the temporary key queue from Redis
                await redisClient.del(tempKey);
            } catch (roomErr) {
                console.error(`Error during Redis write-behind database flush for room ${roomId}:`, roomErr);
            }
        }
    } catch (err) {
        console.error("Error during Redis write-behind database flush:", err);
    }
}

// Background scheduler: Flush coordinates queue from Redis to Postgres every 15 seconds
// Optimization: Write-behind caching reduces query transactions by batching writes.
setInterval(flushRedisLogsToPostgres, 15000);

/**
 * Initializes socket.io bindings.
 */
function initSocket(io) {
    
    // Handshake Authentication Interceptor Middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error("Authentication error: Missing token credentials"));
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
            if (err) {
                return next(new Error("Authentication error: Expired or invalid token"));
            }
            socket.user = decodedUser;
            next();
        });
    });

    io.on("connection", (socket) => {
        const { id: userId, username } = socket.user;
        console.log(`Verified socket client connected: [${username}] (${socket.id})`);

        socket.on("join-room", async (data) => {
            const { roomId } = data;
            
            socket.roomId = roomId;
            socket.join(roomId);

            // Record room as active in Redis registry set
            await redisClient.sAdd("active:rooms", roomId);

            const members = await getActiveRoomMembers(io, roomId);
            io.to(roomId).emit("room-members", members);

            console.log(`User [${username}] joined room [${roomId}]`);
        });

        // Handle incoming coordinate telemetry logs
        socket.on("send-location", async (data) => {
            const { roomId } = socket;
            const { latitude, longitude } = data;

            if (!roomId || isNaN(latitude) || isNaN(longitude)) {
                return;
            }

            try {
                // Compile telemetry payload
                const logPayload = JSON.stringify({
                    userId,
                    socketId: socket.id,
                    username,
                    longitude,
                    latitude,
                    timestamp: Date.now()
                });

                // Optimization: Write to Redis (In-Memory List) instead of making slow SQL queries.
                const redisKey = `room:path:logs:${roomId}`;
                await redisClient.rPush(redisKey, logPayload);

                // Broadcast location update to other users in this isolated namespace immediately.
                // Keeps user interface real-time while database writes run asynchronously.
                io.to(roomId).emit("receive-location", {
                    id: socket.id,
                    username,
                    latitude,
                    longitude,
                });
            } catch (err) {
                console.error("Failed to write coordinate logs to Redis:", err);
            }
        });

        socket.on("disconnect", async () => {
            const { roomId } = socket;
            console.log(`Verified socket client disconnected: [${username}] (${socket.id})`);

            if (roomId) {
                io.to(roomId).emit("user-disconnected", socket.id);
                const members = await getActiveRoomMembers(io, roomId);
                io.to(roomId).emit("room-members", members);
            }
        });
    });
}

module.exports = {
    initSocket
};
