import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Component: LoginPage
 * Renders local email login and official Google Sign-In button using Tailwind CSS.
 */
export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    const { login, googleLogin } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const redirectUrl = searchParams.get("redirect") || "/";

    // Google Identity Services (GSI) Client Initializer
    useEffect(() => {
        const handleGoogleCallback = async (response) => {
            setIsLoading(true);
            setErrorMsg("");
            const result = await googleLogin(response.credential);
            if (result.success) {
                navigate(redirectUrl);
            } else {
                setErrorMsg(result.error || "Google Sign-in failed");
                setIsLoading(false);
            }
        };

        if (window.google) {
            window.google.accounts.id.initialize({
                client_id: "205337054231-2c7o6m7nooknr5jveifhmd8jlq75ma8d.apps.googleusercontent.com",
                callback: handleGoogleCallback
            });
            
            window.google.accounts.id.renderButton(
                document.getElementById("google-signin-btn"),
                { 
                    theme: "outline", 
                    size: "large", 
                    width: "100%", 
                    text: "signin_with",
                    shape: "rectangular"
                }
            );
        } else {
            console.warn("Google Accounts GSI client library not loaded. Check script tag.");
        }
    }, [googleLogin, navigate, redirectUrl]);

    const handleLocalLogin = async (e) => {
        e.preventDefault();
        if (!email || !password) return;

        setIsLoading(true);
        setErrorMsg("");

        const result = await login(email, password);
        if (result.success) {
            navigate(redirectUrl);
        } else {
            setErrorMsg(result.error || "Login failed");
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden">
            {/* Background decorative glows */}
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-[90%] max-w-[440px] p-8 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800/40 border border-slate-700/60 mb-4">
                        <svg className="w-7 h-7 stroke-blue-400 fill-none" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Welcome Back
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">Sign in to start tracking isolated rooms</p>
                </div>

                {errorMsg && (
                    <div className="p-3 mb-5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl text-center font-medium">
                        {errorMsg}
                    </div>
                )}

                {/* Form: Email & Password login */}
                <form onSubmit={handleLocalLogin} className="space-y-4">
                    <div className="flex flex-col text-left gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. test@example.com"
                            required
                            disabled={isLoading}
                            className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/40 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                        />
                    </div>
                    
                    <div className="flex flex-col text-left gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={isLoading}
                            className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/40 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-violet-600/20 transition duration-200"
                    >
                        {isLoading ? "Signing In..." : "Sign In"}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-6 text-center">
                    <div className="absolute left-0 top-1/2 w-full h-[1px] bg-slate-800" />
                    <span className="relative z-10 px-3 bg-slate-900 text-slate-500 text-[10px] font-semibold tracking-wider uppercase">
                        or login with Google
                    </span>
                </div>

                {/* Official Google Identity Services Auth button container */}
                <div id="google-signin-btn" className="w-full min-h-[40px] flex items-center justify-center rounded-xl overflow-hidden mb-6" />

                <div className="text-center text-xs text-slate-400 mt-6">
                    Don't have an account?{" "}
                    <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-semibold underline decoration-wavy decoration-1 underline-offset-4 transition">
                        Create account
                    </Link>
                </div>
            </div>
        </div>
    );
}
