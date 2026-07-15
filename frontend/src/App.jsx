import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LandingPage from "./components/LandingPage";
import TrackerMap from "./components/TrackerMap";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";

/**
 * Component: ProtectedRoute
 * Route guard that redirects unauthenticated users to the login page.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-10 h-10 border-4 border-t-blue-500 border-r-transparent border-slate-800 rounded-full animate-spin mb-4" />
        <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase animate-pulse">
          Verifying Session...
        </span>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page, saving the requested location for redirection afterwards
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return children;
}

/**
 * Root Application Entry point
 * Mounts the global AuthProvider and configures authentication routers.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Protected room management and tracking routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <LandingPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/room/:roomId" 
            element={
              <ProtectedRoute>
                <TrackerMap />
              </ProtectedRoute>
            } 
          />

          {/* Fallback route - Redirect unknown paths to Lobby */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
