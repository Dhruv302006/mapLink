import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_BASE_URL = "http://localhost:3000";

/**
 * Component: LandingPage
 * Renders the lobby room management hub.
 * Retrieves verified user credentials from AuthContext.
 */
export default function LandingPage() {
    const { user, token, logout } = useAuth();
    const [roomIdInput, setRoomIdInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();

    /**
     * Creates a new tracking room session on the backend.
     * Passes the JWT token in authorization header.
     */
    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/rooms/create`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.roomId) {
                // Redirect user to the new room - no queries needed, JWT authenticates sockets
                navigate(`/room/${data.roomId}`);
            } else {
                alert("Failed to initialize session. Try again.");
            }
        } catch (err) {
            console.error("Error creating room:", err);
            alert("Network error: Could not reach backend server");
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Checks if the entered Room ID is valid on the database before redirecting.
     */
    const handleJoinRoom = async (e) => {
        e.preventDefault();
        let rawInput = roomIdInput.trim();

        // Automatically extract UUID if full invite link URL is pasted
        if (rawInput.includes("/room/")) {
            const parts = rawInput.split("/room/");
            if (parts.length > 1) {
                rawInput = parts[1].split(/[?#]/)[0];
            }
        }
        const cleanRoomId = rawInput;

        if (!cleanRoomId) return;

        setIsLoading(true);
        try {
            // Verify room existence, secured via JWT auth
            const response = await fetch(`${API_BASE_URL}/api/rooms/${cleanRoomId}/check`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (response.ok && data.exists) {
                navigate(`/room/${cleanRoomId}`);
            } else {
                alert(data.error || "Room ID does not exist.");
            }
        } catch (err) {
            console.error("Error verifying room:", err);
            alert("Could not verify Room ID. Is the backend server running?");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 overflow-hidden">
            {/* Header controls (authenticated user state & signout) */}
            <div className="absolute top-6 right-6 z-20 flex items-center gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 backdrop-blur-md">
                {user.avatar ? (
                    <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-slate-700 object-cover" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-200">{user.username}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{user.email}</span>
                </div>
                <button
                    onClick={logout}
                    className="ml-2 hover:bg-white/5 text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition duration-200"
                    title="Sign Out"
                >
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
            </div>

            {/* Background glows */}
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-[90%] max-w-[480px] p-10 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800/40 border border-slate-700/60 mb-6">
                    <svg className="w-8 h-8 stroke-blue-400 fill-none" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
                    MapLink
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed mb-10">
                    Real-time room-isolated tracking powered by PostgreSQL, PostGIS, and Socket.io.
                </p>

                {/* Form: Create a new room */}
                <form onSubmit={handleCreateRoom} className="space-y-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] text-white font-semibold rounded-xl shadow-lg hover:shadow-violet-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isLoading ? "Starting Session..." : "Create New Session"}
                        {!isLoading && (
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-8 text-center">
                    <div className="absolute left-0 top-1/2 w-full h-[1px] bg-slate-800" />
                    <span className="relative z-10 px-4 bg-slate-900 text-slate-500 text-[11px] font-semibold tracking-widest uppercase">
                        or join existing
                    </span>
                </div>

                {/* Form: Join an existing room */}
                <form onSubmit={handleJoinRoom} className="space-y-4">
                    <div className="flex flex-col text-left gap-2">
                        <label className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Session Room ID or Link</label>
                        <input
                            type="text"
                            value={roomIdInput}
                            onChange={(e) => setRoomIdInput(e.target.value)}
                            placeholder="Paste Room UUID or invite URL here"
                            required
                            disabled={isLoading}
                            className="w-full px-5 py-3.5 rounded-xl border border-slate-800 bg-slate-950/40 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 border border-slate-800 hover:border-slate-700 bg-slate-800/20 hover:bg-slate-850 active:scale-[0.98] text-slate-100 font-semibold rounded-xl transition cursor-pointer"
                    >
                        {isLoading ? "Checking..." : "Join Session"}
                    </button>
                </form>

                <div className="mt-10 text-[10px] text-slate-600 font-medium tracking-wide">
                    Secured by JWT Verification & Google Authentication
                </div>
            </div>
        </div>
    );
}
