/**
 * Authentication Security Middleware
 */
const jwt = require("jsonwebtoken");

/**
 * Validates JWT session tokens in standard Bearer format.
 * Binds decoded user payload to request context.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Access denied. Auth token missing." });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token." });
        }
        req.user = decodedUser; // Bind user properties to request
        next();
    });
}

module.exports = {
    authenticateToken
};
