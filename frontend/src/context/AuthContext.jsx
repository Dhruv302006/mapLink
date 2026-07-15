import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

const API_BASE_URL = "http://localhost:3000";

/**
 * Provider Component: AuthProvider
 * Manages global authentication state, token storage, and REST login/OAuth actions.
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [loading, setLoading] = useState(true);

    // Sync session on mount (verifies token validity with database profile fetch)
    useEffect(() => {
        const verifySession = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                } else {
                    // Token invalid or expired - purge state
                    handleLogout();
                }
            } catch (err) {
                console.error("Session verification failed:", err);
            } finally {
                setLoading(false);
            }
        };

        verifySession();
    }, [token]);

    const handleLoginResponse = (data) => {
        if (data.token && data.user) {
            localStorage.setItem("token", data.token);
            setToken(data.token);
            setUser(data.user);
            return { success: true };
        }
        return { success: false, error: "Malformed login payload" };
    };

    /**
     * Local Email/Password Registration
     */
    const signup = async (username, email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();
            if (!response.ok) return { success: false, error: data.error };

            return handleLoginResponse(data);
        } catch (err) {
            console.error("Signup network error:", err);
            return { success: false, error: "Network error reaching server" };
        }
    };

    /**
     * Local Email/Password Authentication
     */
    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (!response.ok) return { success: false, error: data.error };

            return handleLoginResponse(data);
        } catch (err) {
            console.error("Login network error:", err);
            return { success: false, error: "Network error reaching server" };
        }
    };

    /**
     * Google Sign-in Verification (OAuth exchange)
     */
    const googleLogin = async (idToken) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken })
            });
            const data = await response.json();
            if (!response.ok) return { success: false, error: data.error };

            return handleLoginResponse(data);
        } catch (err) {
            console.error("Google sign-in server error:", err);
            return { success: false, error: "Google verification failed" };
        }
    };

    /**
     * Purges Token & User Context (Logout)
     */
    const handleLogout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, signup, login, googleLogin, logout: handleLogout }}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook: useAuth
 * Returns authentication context helper handles.
 */
export function useAuth() {
    return useContext(AuthContext);
}
