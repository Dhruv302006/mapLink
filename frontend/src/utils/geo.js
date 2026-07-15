/**
 * Geolocation and Mapping Utilities
 */

// List of high-contrast preset colors for rendering distinct user paths (Map Legend).
export const PATH_COLORS = [
    "#3b82f6", // Blue
    "#ec4899", // Pink
    "#10b981", // Green
    "#f59e0b", // Yellow
    "#8b5cf6", // Purple
    "#ef4444", // Red
    "#06b6d4"  // Cyan
];

/**
 * Calculates a unique color based on an identifier string (e.g. Socket ID or name).
 * Optimization: Ensures the user retains the same path color consistently.
 */
export function getUserColor(identifier) {
    if (!identifier) return PATH_COLORS[0];
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
        hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PATH_COLORS.length;
    return PATH_COLORS[index];
}

/**
 * Calculates the geodetic distance in meters between two GPS coordinates.
 * Optimization: Used to filter out duplicate/micro-drift coordinate points.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) *
            Math.cos(phi2) *
            Math.sin(deltaLambda / 2) *
            Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}
