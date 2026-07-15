/**
 * Authentication Business Logic Handler (Controller)
 */
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { pool } = require("../config/db");

// Google OAuth verification client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Handle user registration (Local Email/Password)
 */
async function signup(req, res) {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const userExists = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "Email is already registered" });
        }

        // Hashing password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const insertQuery = `
            INSERT INTO users (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, username, email, created_at;
        `;
        const result = await pool.query(insertQuery, [username, email.toLowerCase(), passwordHash]);
        const newUser = result.rows[0];

        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.status(201).json({ user: newUser, token });
    } catch (err) {
        console.error("Sign up controller error:", err);
        res.status(500).json({ error: "Registration failed due to server error" });
    }
}

/**
 * Handle user login (Local Email/Password)
 */
async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Invalid email credentials" });
        }
        
        const user = result.rows[0];
        
        if (!user.password_hash) {
            return res.status(400).json({ error: "This email uses Google Sign-In. Please click the Google button." });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid password credentials" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
            token
        });
    } catch (err) {
        console.error("Login controller error:", err);
        res.status(500).json({ error: "Login failed due to server error" });
    }
}

/**
 * Handle Google Token validation and User creation
 */
async function googleAuth(req, res) {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ error: "Google ID Token is missing" });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;
        const cleanEmail = email.toLowerCase();
        
        let userResult = await pool.query("SELECT * FROM users WHERE email = $1", [cleanEmail]);
        let user;

        if (userResult.rows.length === 0) {
            const insertQuery = `
                INSERT INTO users (username, email, avatar)
                VALUES ($1, $2, $3)
                RETURNING id, username, email, avatar;
            `;
            const newUserResult = await pool.query(insertQuery, [name || "Google User", cleanEmail, picture]);
            user = newUserResult.rows[0];
        } else {
            user = userResult.rows[0];
            if (user.avatar !== picture) {
                await pool.query("UPDATE users SET avatar = $1 WHERE id = $2", [picture, user.id]);
                user.avatar = picture;
            }
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
            token
        });
    } catch (err) {
        console.error("Google sign-in controller error:", err);
        res.status(400).json({ error: "Google authentication verification failed" });
    }
}

/**
 * Get active user profile
 */
async function getMe(req, res) {
    try {
        const result = await pool.query("SELECT id, username, email, avatar FROM users WHERE id = $1", [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User session expired" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("GetMe controller error:", err);
        res.status(500).json({ error: "Database error fetching profile" });
    }
}

module.exports = {
    signup,
    login,
    googleAuth,
    getMe
};
