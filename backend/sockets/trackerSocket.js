/**
 * WebSocket Telemetry Handler (Socket.io)
 * Integrates connection guards and real-time pub/sub namespaces.
 */
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

/**
 * Computes active users in a room by scanning memory states.
 */
async function getActiveRoomMembers(io, roomId) {
    const activeSockets = await io.in(roomId).fetchSockets();
    return activeSockets.map(s => ({
        socketId: s.id,
        username: s.user.username // Read from verified socket credentials
    }));
}

/**
 * Initializes socket.io bindings.
 */
function initSocket(io) {
    
    // Handshake Authentication Interceptor Middleware
    // Optimization: Secures the WebSocket connection layer against spoofing.
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error("Authentication error: Missing token credentials"));
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
            if (err) {
                return next(new Error("Authentication error: Expired or invalid token"));
            }
            // Bind verified profile credentials directly to socket context
            socket.user = decodedUser;
            next();
        });
    });

    io.on("connection", (socket) => {
        const { id: userId, username } = socket.user;
        console.log(`Verified socket client connected: [${username}] (${socket.id})`);

        // Client joins room channel
        socket.on("join-room", async (data) => {
            const { roomId } = data;
            
            socket.roomId = roomId;
            socket.join(roomId);

            // Broadcast user legend changes
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
                // Relational write to database, mapping point using PostGIS WGS 84 (4326)
                const query = `
                    INSERT INTO locations (room_id, user_id, socket_id, username, geom)
                    VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326));
                `;
                await pool.query(query, [roomId, userId, socket.id, username, longitude, latitude]);

                // Broadcast location update to other users in this isolated namespace
                io.to(roomId).emit("receive-location", {
                    id: socket.id,
                    username,
                    latitude,
                    longitude,
                });
            } catch (err) {
                console.error("Failed to write coordinate logs to database:", err);
            }
        });

        // Handle disconnect cleans
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
