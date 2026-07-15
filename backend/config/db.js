/**
 * Database Configurations & Migrations Layer
 */
const { Pool } = require("pg");

// Configure the database connection pool using environment variables
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

/**
 * Executes PostGIS migrations and creates tables & performance indexes.
 */
async function initializeDatabase() {
    let client;
    try {
        client = await pool.connect();
        
        // 1. Enable PostGIS Extension
        await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
        console.log("PostGIS extension checked/enabled.");

        // 2. Create Users Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255),
                username VARCHAR(100) NOT NULL,
                avatar VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Create Rooms Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS rooms (
                id UUID PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Create Locations Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS locations (
                id SERIAL PRIMARY KEY,
                room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
                user_id INT REFERENCES users(id) ON DELETE SET NULL,
                socket_id VARCHAR(255) NOT NULL,
                username VARCHAR(100) NOT NULL,
                geom GEOMETRY(Point, 4326) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Safe Migration helper: Add user_id column if locations table existed previously.
        await client.query(`
            ALTER TABLE locations ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE SET NULL;
        `);
        console.log("Database tables checked/created.");

        // 5. Create Optimizing Spatial & Composite Indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS locations_geom_idx ON locations USING GIST (geom);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS locations_room_time_idx ON locations(room_id, created_at);
        `);
        console.log("Database indexes verified/optimized.");

    } catch (err) {
        console.error("Database migration failed:", err);
        process.exit(1);
    } finally {
        if (client) client.release();
    }
}

module.exports = {
    pool,
    initializeDatabase
};
