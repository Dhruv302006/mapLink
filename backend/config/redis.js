/**
 * Redis Connection Layer
 */
const { createClient } = require("redis");

// Initialize Redis Client
const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});

redisClient.on("error", (err) => {
    console.error("Redis Client Connection Error:", err.message);
});

redisClient.on("connect", () => {
    console.log("Redis client connection established successfully.");
});

// Self-executing async connection bootstrap
(async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.error("Redis connection attempt failed:", err.message);
    }
})();

module.exports = redisClient;
