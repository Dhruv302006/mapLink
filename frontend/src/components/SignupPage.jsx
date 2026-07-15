import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Component: SignupPage
 * Renders local email registration form and official Google Sign-Up button.
 */
export default function SignupPage() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { signup, googleLogin } = useAuth();
    const navigate = useNavigate();

    // Google Identity Services (GSI) Client Initializer for Google Registration
    useEffect(() => {
        const handleGoogleCallback = async (response) => {
            setIsLoading(true);
            setErrorMsg("");
            const result = await googleLogin(response.credential);
            if (result.success) {
                navigate("/");
            } else {
                setErrorMsg(result.error || "Google Registration failed");
                setIsLoading(false);
            }
        };

        if (window.google) {
            window.google.accounts.id.initialize({
                client_id: "205337054231-2c7o6m7nooknr5jveifhmd8jlq75ma8d.apps.googleusercontent.com",
                callback: handleGoogleCallback
            });
            
            window.google.accounts.id.renderButton(
                document.getElementById("google-signup-btn"),
                { 
                    theme: "outline", 
                    size: "large", 
                    width: "100%", 
                    text: "signup_with", // "signup_with" text is optimal for registration
                    shape: "rectangular"
                }
            );
        }
    }, [googleLogin, navigate]);

    const handleSignup = async (e) => {
        e.preventDefault();
        if (!username || !email || !password) return;

        if (password.length < 6) {
            setErrorMsg("Password must be at least 6 characters long.");
            return;
        }

        setIsLoading(true);
        setErrorMsg("");

        const result = await signup(username, email, password);
        if (result.success) {
            navigate("/");
        } else {
            setErrorMsg(result.error || "Registration failed");
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden">
            {/* Background glows */}
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

            <div className="relative z-10 w-[90%] max-w-[440px] p-8 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800/40 border border-slate-700/60 mb-4">
                        <svg className="w-7 h-7 stroke-blue-400 fill-none" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Create Account
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">Get started with a new tracker profile</p>
                </div>

                {errorMsg && (
                    <div className="p-3 mb-5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl text-center font-medium">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="flex flex-col text-left gap-1.5">
                        <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">User Name</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. Alice"
                            required
                            disabled={isLoading}
                            className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/40 text-sm text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition"
                        />
                    </div>

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
                            placeholder="•••••••• (Min. 6 chars)"
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
                        {isLoading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-6 text-center">
                    <div className="absolute left-0 top-1/2 w-full h-[1px] bg-slate-800" />
                    <span className="relative z-10 px-3 bg-slate-900 text-slate-500 text-[10px] font-semibold tracking-wider uppercase">
                        or Sign up with Google
                    </span>
                </div>

                {/* Google Sign-up button mount */}
                <div id="google-signup-btn" className="w-full min-h-[40px] flex items-center justify-center rounded-xl overflow-hidden mb-6" />

                <div className="text-center text-xs text-slate-400 mt-8 border-t border-slate-800/80 pt-6">
                    Already have an account?{" "}
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold underline decoration-wavy decoration-1 underline-offset-4 transition">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
