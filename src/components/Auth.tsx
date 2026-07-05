import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bot, 
  Sparkles, 
  KeyRound, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  RefreshCw, 
  HelpCircle, 
  ArrowLeft, 
  CheckCircle 
} from "lucide-react";

interface AuthProps {
  onSuccess: (token: string, username: string) => void;
  noUsersExist?: boolean;
}

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was your childhood nickname?",
  "What was the name of your first school?",
];

export default function Auth({ onSuccess, noUsersExist }: AuthProps) {
  const [isLogin, setIsLogin] = useState(!noUsersExist);
  const [username, setUsername] = useState("");

  React.useEffect(() => {
    if (noUsersExist) {
      setIsLogin(false);
    }
  }, [noUsersExist]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Password Recovery states
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"username" | "answer">("username");
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Registration security question states
  const [selectedQuestion, setSelectedQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [registerAnswer, setRegisterAnswer] = useState("");

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
    if (!isLogin && !registerAnswer.trim()) {
      setError("Please provide an answer to your recovery security question.");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload: any = {
        username: trimmedUser,
        password,
      };

      if (!isLogin) {
        payload.securityQuestion = selectedQuestion;
        payload.securityAnswer = registerAnswer;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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

  const handleForgotPasswordLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/auth/forgot-password/get-question?username=${encodeURIComponent(recoveryUsername.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Workspace username not found.");
      }

      setSecurityQuestion(data.securityQuestion);
      setRecoveryStep("answer");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSandbox = async () => {
    if (!window.confirm("WARNING: This will permanently wipe all users, login credentials, and conversations from this local workspace container. Are you absolutely sure you want to reset?")) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-sandbox", {
        method: "POST"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset sandbox.");
      }
      setSuccessMessage("Workspace sandbox successfully wiped! Please register a new account.");
      setIsLogin(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "An error occurred while resetting the workspace.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 4) {
      setError("New password must be at least 4 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: recoveryUsername.trim(),
          securityAnswer,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset passkey.");
      }

      setSuccessMessage(data.message || "Passkey reset successfully!");
      // Reset state parameters
      setRecoveryUsername("");
      setSecurityQuestion(null);
      setSecurityAnswer("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForgotState = () => {
    setIsForgotMode(false);
    setRecoveryStep("username");
    setRecoveryUsername("");
    setSecurityQuestion(null);
    setSecurityAnswer("");
    setNewPassword("");
    setConfirmNewPassword("");
    setSuccessMessage(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050507] px-4 overflow-y-auto py-12">
      {/* Dynamic ambient backdrops */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-pink-600/10 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 180 }}
        className="w-full max-w-md bg-slate-950/80 border border-purple-950/20 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative overflow-hidden my-auto"
        id="auth-card"
      >
        {/* Decorative Top Accent Line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 opacity-60" />

        {/* Branding header */}
        <div className="flex flex-col items-center text-center space-y-4 mb-6">
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



        {/* Error Callout */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-5 flex items-start gap-2.5 overflow-hidden"
            >
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-300 leading-relaxed font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Callout */}
        <AnimatePresence mode="wait">
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-5 text-center overflow-hidden"
            >
              <CheckCircle className="h-5 w-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-emerald-300 font-semibold leading-relaxed">{successMessage}</p>
              <button
                type="button"
                onClick={resetForgotState}
                className="mt-3 text-xs font-bold text-pink-400 hover:text-pink-300 transition-colors inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Sign In
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN VIEWS */}
        {!isForgotMode ? (
          <>
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

            {/* Standard Form */}
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
                <div className="flex items-center justify-between pl-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Secret Passkey
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setIsForgotMode(true)}
                      className="text-[9px] font-bold text-pink-500/80 hover:text-pink-400 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Forgot Passkey?
                    </button>
                  )}
                </div>
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
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="space-y-1.5">
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
                    </div>

                    <div className="border-t border-purple-950/20 pt-3 space-y-3">
                      <div className="flex items-center gap-1.5 pl-1 text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                        <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>Configure Recovery Answer</span>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                          Recovery Security Question
                        </label>
                        <select
                          value={selectedQuestion}
                          onChange={(e) => setSelectedQuestion(e.target.value)}
                          disabled={isLoading}
                          className="w-full bg-slate-900/60 border border-slate-900 hover:border-slate-800 rounded-xl px-3.5 py-3 text-xs focus:outline-none focus:border-pink-500/40 text-slate-300 font-medium transition-colors"
                        >
                          {SECURITY_QUESTIONS.map((q, idx) => (
                            <option key={idx} value={q} className="bg-slate-950 text-slate-300">
                              {q}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                          Your Private Answer
                        </label>
                        <input
                          type="text"
                          placeholder="Your recovery secret answer (case-insensitive)"
                          required={!isLogin}
                          value={registerAnswer}
                          onChange={(e) => setRegisterAnswer(e.target.value)}
                          disabled={isLoading}
                          className="w-full bg-slate-900/40 border border-slate-900 hover:border-slate-800 focus:border-pink-500/40 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500/10 placeholder-slate-600 text-slate-200 transition-all font-medium"
                        />
                      </div>
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
          </>
        ) : (
          /* FORGOT PASSWORD MODE */
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-purple-950/20 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-pink-400" />
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Passkey Recovery</h3>
              </div>
              {!successMessage && (
                <button
                  onClick={resetForgotState}
                  disabled={isLoading}
                  className="text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Cancel
                </button>
              )}
            </div>

            {!successMessage && recoveryStep === "username" && (
              <form onSubmit={handleForgotPasswordLookup} className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter the workspace username of your secure container file. We'll search for your registered recovery question.
                </p>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                    Workspace Username
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-pink-400 transition-colors" />
                    <input
                      type="text"
                      placeholder="Enter workspace name"
                      required
                      value={recoveryUsername}
                      onChange={(e) => setRecoveryUsername(e.target.value)}
                      disabled={isLoading}
                      className="w-full bg-slate-900/40 border border-slate-900 hover:border-slate-800 focus:border-pink-500/40 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500/10 placeholder-slate-600 text-slate-200 transition-all font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !recoveryUsername.trim()}
                  className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-slate-900 border border-purple-900/30 hover:border-pink-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-pink-400" />
                  ) : (
                    "Search Space Question"
                  )}
                </button>

                <div className="border-t border-purple-950/15 pt-4 mt-3">
                  <p className="text-[10px] text-slate-500 text-center leading-relaxed">
                    Forgot your recovery answer as well? You can wipe the sandbox to register a fresh profile.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetSandbox}
                    disabled={isLoading}
                    className="w-full mt-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-rose-400/80 hover:text-rose-400 hover:bg-rose-950/10 border border-rose-950/30 hover:border-rose-900/40 transition-all cursor-pointer text-center"
                  >
                    Reset Workspace Sandbox
                  </button>
                </div>
              </form>
            )}

            {!successMessage && recoveryStep === "answer" && (
              <form onSubmit={handleForgotPasswordReset} className="space-y-4">
                <div className="bg-slate-900/30 border border-purple-950/20 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[9px] font-extrabold text-pink-400 uppercase tracking-widest block">
                    Security Question Found:
                  </span>
                  <p className="text-xs text-slate-200 font-bold leading-relaxed">
                    {securityQuestion ? securityQuestion : "No security recovery question was set for this space."}
                  </p>
                  {!securityQuestion && (
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1.5">
                      💡 Legacy Account: Enter the master developer fallback key <code className="text-pink-400 font-bold bg-slate-900 px-1 py-0.5 rounded">AetherSpace</code> as your recovery answer.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                    Your Recovery Answer
                  </label>
                  <input
                    type="text"
                    placeholder="Provide the case-insensitive answer"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-900/40 border border-slate-900 hover:border-slate-800 focus:border-pink-500/40 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500/10 placeholder-slate-600 text-slate-200 transition-all font-medium"
                  />
                </div>

                <div className="space-y-1.5 border-t border-purple-950/10 pt-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                    New Secret Passkey
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-pink-400 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 4 characters"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full bg-slate-900/40 border border-slate-900 hover:border-slate-800 focus:border-pink-500/40 rounded-xl pl-10 pr-10 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500/10 placeholder-slate-600 text-slate-200 transition-all font-medium"
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                    Confirm New Passkey
                  </label>
                  <div className="relative group">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-pink-400 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Repeat new passkey"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full bg-slate-900/40 border border-slate-900 hover:border-slate-800 focus:border-pink-500/40 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500/10 placeholder-slate-600 text-slate-200 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryStep("username");
                      setError(null);
                    }}
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-400 bg-slate-900 hover:bg-slate-900/70 border border-slate-900 transition-colors cursor-pointer"
                  >
                    Change Name
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/20 cursor-pointer"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Reset Passkey"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Security / System Footer */}
        <p className="text-[9px] text-center text-slate-600 mt-6 uppercase tracking-widest font-semibold">
          Encrypted credentials stored locally on the container volume
        </p>
      </motion.div>
    </div>
  );
}
