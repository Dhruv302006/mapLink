import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import L from "leaflet";
import { useAuth } from "../context/AuthContext";
import { getUserColor, calculateDistanceMeters } from "../utils/geo";

const SOCKET_SERVER_URL = "http://localhost:3000";

/**
 * Component: TrackerMap
 * Embeds a full-screen Leaflet geospatial map and rendering layer.
 * Secures communication feeds by passing JWT authentication tokens.
 */
export default function TrackerMap() {
    const { roomId } = useParams();
    const { token, logout } = useAuth();
    const navigate = useNavigate();

    const [members, setMembers] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    // Refs to manage Leaflet and Socket lifecycle safely (prevents React re-render loops)
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const socketRef = useRef(null);
    const geoWatchIdRef = useRef(null);

    const markersRef = useRef({}); // socketId -> circleMarker
    const polylinesRef = useRef({}); // socketId -> polyline

    // Tracking states for throttling optimization
    const lastEmittedCoordsRef = useRef(null);
    const lastEmitTimeRef = useRef(0);

    const shareUrl = `${window.location.origin}/room/${roomId}`;

    useEffect(() => {
        // ---------------------------------------------------------------------
        // 1. INITIALIZE SOCKET.IO CONNECTION WITH AUTH HANDSHAKE
        // ---------------------------------------------------------------------
        // Optimization: Passes JWT in Socket.io auth payload.
        // Prevents connections from unauthorized/spoofed socket feeds.
        const socket = io(SOCKET_SERVER_URL, {
            auth: { token: token }
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            setIsConnected(true);
            // Request to join isolated room space - no username payload needed (verified on server)
            socket.emit("join-room", { roomId });
        });

        socket.on("disconnect", () => {
            setIsConnected(false);
        });

        socket.on("connect_error", (err) => {
            console.error("Socket authentication error:", err.message);
            alert("Session authentication failed. Redirecting to login.");
            navigate("/login");
        });

        // ---------------------------------------------------------------------
        // 2. INITIALIZE LEAFLET MAP
        // ---------------------------------------------------------------------
        if (!mapRef.current && mapContainerRef.current) {
            const map = L.map(mapContainerRef.current, {
                zoomControl: false
            }).setView([0, 0], 2);

            L.control.zoom({ position: "topright" }).addTo(map);

            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);

            mapRef.current = map;
        }

        // ---------------------------------------------------------------------
        // 3. FETCH HISTORICAL PATH TRAILS (PostGIS API, secured via JWT)
        // ---------------------------------------------------------------------
        const loadHistory = async () => {
            try {
                const response = await fetch(`${SOCKET_SERVER_URL}/api/rooms/${roomId}/history`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (!response.ok) return;
                const history = await response.json();

                const tracks = {};
                history.forEach((point) => {
                    const id = point.socket_id;
                    if (!tracks[id]) {
                        tracks[id] = {
                            username: point.username,
                            coords: []
                        };
                    }
                    tracks[id].coords.push([point.latitude, point.longitude]);
                });

                Object.keys(tracks).forEach((id) => {
                    const track = tracks[id];
                    const color = getUserColor(id);

                    if (mapRef.current) {
                        polylinesRef.current[id] = L.polyline(track.coords, {
                            color: color,
                            weight: 4,
                            opacity: 0.8,
                            lineCap: "round",
                            lineJoin: "round"
                        }).addTo(mapRef.current);

                        if (track.coords.length > 0) {
                            const lastPoint = track.coords[track.coords.length - 1];
                            const marker = L.circleMarker(lastPoint, {
                                radius: 8,
                                fillColor: color,
                                color: "#ffffff",
                                weight: 2,
                                opacity: 1,
                                fillOpacity: 0.9
                            }).addTo(mapRef.current);

                            marker.bindPopup(`<b>${track.username}</b> (Offline History)`);
                            markersRef.current[id] = marker;
                        }
                    }
                });
            } catch (err) {
                console.error("Failed to load historical routes:", err);
            }
        };

        loadHistory();

        // ---------------------------------------------------------------------
        // 4. WEBSOCKET FEED LISTENERS
        // ---------------------------------------------------------------------
        socket.on("room-members", (membersList) => {
            setMembers(membersList);
        });

        socket.on("receive-location", (data) => {
            const { id, username: senderName, latitude, longitude } = data;
            const color = getUserColor(id);

            if (!mapRef.current) return;

            if (markersRef.current[id]) {
                markersRef.current[id].setLatLng([latitude, longitude]);
            } else {
                const marker = L.circleMarker([latitude, longitude], {
                    radius: 8,
                    fillColor: color,
                    color: "#ffffff",
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.9
                }).addTo(mapRef.current);

                marker.bindPopup(`<b>${senderName}</b> ${id === socket.id ? '(You)' : ''}`).openPopup();
                markersRef.current[id] = marker;
            }

            if (polylinesRef.current[id]) {
                polylinesRef.current[id].addLatLng([latitude, longitude]);
            } else {
                polylinesRef.current[id] = L.polyline([[latitude, longitude]], {
                    color: color,
                    weight: 4,
                    opacity: 0.8,
                    lineCap: "round",
                    lineJoin: "round"
                }).addTo(mapRef.current);
            }
        });

        socket.on("user-disconnected", (id) => {
            if (markersRef.current[id] && mapRef.current) {
                mapRef.current.removeLayer(markersRef.current[id]);
                delete markersRef.current[id];
            }

            if (polylinesRef.current[id]) {
                polylinesRef.current[id].setStyle({
                    dashArray: "5, 10",
                    opacity: 0.35,
                    weight: 3
                });
            }
        });

        // ---------------------------------------------------------------------
        // 5. GPS MONITORING & THROTTLING LOGIC
        // ---------------------------------------------------------------------
        if (navigator.geolocation) {
            geoWatchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const currentTime = Date.now();

                    if (!lastEmittedCoordsRef.current && mapRef.current) {
                        mapRef.current.setView([latitude, longitude], 16);
                    }

                    let shouldEmit = false;

                    if (!lastEmittedCoordsRef.current) {
                        shouldEmit = true;
                    } else {
                        const timeElapsed = currentTime - lastEmitTimeRef.current;
                        const distanceMoved = calculateDistanceMeters(
                            lastEmittedCoordsRef.current.latitude,
                            lastEmittedCoordsRef.current.longitude,
                            latitude,
                            longitude
                        );

                        if (distanceMoved >= 5 && timeElapsed >= 3000) {
                            shouldEmit = true;
                        }
                    }

                    if (shouldEmit) {
                        socket.emit("send-location", { latitude, longitude });
                        lastEmittedCoordsRef.current = { latitude, longitude };
                        lastEmitTimeRef.current = currentTime;
                    }
                },
                (error) => {
                    console.error("GPS telemetry access error:", error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 0
                }
            );
        }

        return () => {
            if (geoWatchIdRef.current) {
                navigator.geolocation.clearWatch(geoWatchIdRef.current);
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [roomId, token, navigate]);

    const copyLink = () => {
        navigator.clipboard.writeText(shareUrl)
            .then(() => alert("Invite URL copied! Share it with friends."))
            .catch((err) => console.error("Copy failed:", err));
    };

    const focusOnUser = (socketId) => {
        const marker = markersRef.current[socketId];
        if (marker && mapRef.current) {
            mapRef.current.setView(marker.getLatLng(), 16);
            marker.openPopup();
        }
    };

    const handleLeave = () => {
        if (window.confirm("Are you sure you want to leave this session?")) {
            navigate("/");
        }
    };

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainerRef} className="absolute inset-0 z-0" />

            <div className="absolute top-5 left-5 z-10 w-80 max-h-[calc(100vh-40px)] p-6 rounded-2xl glass-panel text-slate-100 flex flex-col gap-5 shadow-2xl transition duration-300">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <h2 className="text-base font-bold tracking-tight">MapLink</h2>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isConnected ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        <span>{isConnected ? 'Connected' : 'Offline'}</span>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Invite Link</span>
                    <div className="flex bg-white/5 border border-white/5 rounded-xl overflow-hidden">
                        <input
                            type="text"
                            readOnly
                            value={shareUrl}
                            className="bg-transparent border-none outline-none text-xs text-slate-300 px-3 py-2 w-full select-all"
                        />
                        <button
                            onClick={copyLink}
                            className="bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white px-3 border-l border-white/5 transition flex items-center justify-center cursor-pointer"
                            title="Copy link"
                        >
                            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-2 flex-1 min-h-[120px]">
                    <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                        Active Trackers ({members.length})
                    </h3>
                    <div className="overflow-y-auto max-h-60 custom-scrollbar pr-1">
                        <ul className="space-y-1.5">
                            {members.map((member) => {
                                const dotColor = getUserColor(member.socketId);
                                const isSelf = member.socketId === socketRef.current?.id;
                                return (
                                    <li
                                        key={member.socketId}
                                        onClick={() => focusOnUser(member.socketId)}
                                        className="flex items-center gap-3 bg-white/2 border border-white/2 hover:bg-white/5 px-3 py-2.5 rounded-xl text-sm transition cursor-pointer select-none"
                                    >
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                                        <span className="font-semibold text-slate-200 truncate">{member.username}</span>
                                        <span className="text-[10px] text-slate-500 font-medium ml-auto">
                                            {isSelf ? "(You)" : "online"}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>

                <div className="mt-auto">
                    <button
                        onClick={handleLeave}
                        className="w-full py-2.5 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-xs font-bold tracking-wide rounded-xl transition duration-200 cursor-pointer"
                    >
                        Leave Tracking Session
                    </button>
                </div>
            </div>
        </div>
    );
}
