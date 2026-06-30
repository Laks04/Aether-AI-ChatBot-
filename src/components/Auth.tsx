import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Sparkles, KeyRound, User, Lock, Eye, EyeOff, AlertCircle, RefreshCw } from "lucide-react";

interface AuthProps {
  onSuccess: (token: string, username: string) => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend validation
    const trimmedUser = username.trim();
    if (trimmedUser.length < 2) {
      setError("Username must be at least 2 characters.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: trimmedUser,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed. Please check your inputs.");
      }

      // Success
      localStorage.setItem("aether_auth_token", data.token);
      localStorage.setItem("aether_auth_username", data.username);
      onSuccess(data.token, data.username);
    } catch (err: any) {
      setError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050507] px-4 overflow-y-auto">
      {/* Dynamic ambient backdrops */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-pink-600/10 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
        className="w-full max-w-md bg-slate-950/80 border border-purple-950/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden"
        id="auth-card"
      >
        {/* Decorative Top Accent Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 opacity-60" />

        {/* Branding header */}
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 shadow-lg shadow-purple-600/20">
            <Bot className="h-7 w-7 text-white" />
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-pink-500/20 text-pink-400 rounded-full border border-pink-500/40 flex items-center justify-center">
              <Sparkles className="h-3 w-3" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Aether Conversational Space</h2>
            <p className="text-xs text-slate-400 mt-1.5 max-w-[280px]">
              Secure persistent workspace with private container file-based database memory.
            </p>
          </div>
        </div>

        {/* Switch Tabs */}
        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-slate-900 mb-6 relative">
          <button
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative z-10 ${
              isLogin ? "text-pink-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            className={`flex-1 text-center py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative z-10 ${
              !isLogin ? "text-pink-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Create Space
          </button>
          
          {/* Slide Indicator */}
          <motion.div
            className="absolute top-1 bottom-1 rounded-xl bg-slate-950 border border-purple-950/40 shadow-md"
            animate={{
              left: isLogin ? "4px" : "calc(50% + 2px)",
              right: isLogin ? "calc(50% + 2px)" : "4px",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>

        {/* Error Callout */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-6 flex items-start gap-2.5 overflow-hidden"
            >
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-300 leading-relaxed font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Username
            </label>
            <div className="relative group">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-pink-400 transition-colors" />
              <input
                type="text"
                placeholder="Enter workspace name"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="w-full bg-slate-900/40 border border-slate-900 hover:border-slate-800 focus:border-pink-500/40 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500/10 placeholder-slate-600 text-slate-200 transition-all font-medium"
                id="auth-username-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
              Secret Passkey
            </label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-pink-400 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min 4 characters"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full bg-slate-900/40 border border-slate-900 hover:border-slate-800 focus:border-pink-500/40 rounded-xl pl-10 pr-10 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500/10 placeholder-slate-600 text-slate-200 transition-all font-medium"
                id="auth-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (only for Signup) */}
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 overflow-hidden"
              >
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Confirm Passkey
                </label>
                <div className="relative group">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-pink-400 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat secret passkey"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-900/40 border border-slate-900 hover:border-slate-800 focus:border-pink-500/40 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500/10 placeholder-slate-600 text-slate-200 transition-all font-medium"
                    id="auth-confirm-password-input"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Trigger */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity active:scale-98 shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            id="auth-submit-btn"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Synchronizing...</span>
              </>
            ) : isLogin ? (
              "Open Secure Session"
            ) : (
              "Initialize Space Memory"
            )}
          </button>
        </form>

        {/* Security / System Footer */}
        <p className="text-[9px] text-center text-slate-600 mt-6 uppercase tracking-widest font-semibold">
          Encrypted credentials stored locally on the container volume
        </p>
      </motion.div>
    </div>
  );
}
