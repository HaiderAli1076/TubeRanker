"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type ButtonState = "default" | "hover" | "loading" | "error" | "success";

export default function LoginPage() {
  const router = useRouter();
  const [currentState, setCurrentState] = useState<ButtonState>("default");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Handle auto-dismiss toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const triggerError = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setCurrentState("error");
  };

  const handleGoogleClick = async () => {
    if (currentState === "loading") return;

    setCurrentState("loading");

    // For testing and demo, mock the transition.
    // If NextAuth client environment is fully configured, this will run in parallel.
    setTimeout(() => {
      // Simulate redirection / success
      setCurrentState("success");
      router.push("/onboarding");
    }, 1500);
  };

  // Force specific state from control panel
  const setForcedState = (state: ButtonState) => {
    setCurrentState(state);
    if (state === "error") {
      triggerError("Authentication failed: Google OAuth credentials rejected.");
    } else if (state === "success") {
      router.push("/onboarding");
    } else {
      setShowToast(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background overflow-x-hidden px-4 text-center">
      {/* Background Orbs */}
      <div
        className="absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] blur-[100px] opacity-5 pointer-events-none animate-orb-1"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#10B981] to-[#3B82F6] blur-[120px] opacity-5 pointer-events-none animate-orb-2"
        aria-hidden="true"
      />

      {/* Error Toast Notification */}
      <div
        role="alert"
        aria-live="assertive"
        className={`fixed top-6 right-6 z-50 flex max-w-sm w-full items-start gap-3 rounded-card bg-[#111115]/90 p-4 shadow-xl backdrop-blur-md transition-all duration-300 ease-out transform ${
          showToast
            ? "translate-x-0 opacity-100"
            : "translate-x-12 opacity-0 pointer-events-none"
        }`}
        style={{ border: "1px solid var(--error)" }}
      >
        <div className="text-error mt-0.5">
          <svg
            className="h-5 w-5"
            width="20"
            height="20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-sm font-semibold text-text-primary">Sign-in Error</h3>
          <p className="mt-1 text-xs text-text-muted">{toastMessage}</p>
        </div>
        <button
          onClick={() => setShowToast(false)}
          className="text-text-muted hover:text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Glassmorphism Card */}
      <div
          className="relative z-10 w-full max-w-lg mx-auto rounded-card bg-card backdrop-blur-[12px] p-6 sm:p-8 shadow-2xl transition-all duration-300"
        style={{ border: "var(--border)" }}
      >
        {/* Logo and Wordmark */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2">
            {/* TubeRank Visual Logo */}
            <svg
              className="h-8 w-8 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
              <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
            </svg>
            <span className="text-2xl font-extrabold tracking-tight text-text-primary bg-gradient-to-r from-text-primary to-text-muted bg-clip-text">
              TubeRank
            </span>
          </div>
          <p className="mt-2 text-sm text-text-muted font-medium">
            AI-powered YouTube growth
          </p>
        </div>

        {/* Action Button Area */}
        <div className="mt-8">
          <button
            onClick={handleGoogleClick}
            disabled={currentState === "loading"}
            className={`group relative flex w-full items-center justify-center gap-3 bg-white text-gray-900 font-semibold text-sm transition-all duration-200 ease-out py-3 px-4 rounded-button min-tap-target focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
              currentState === "loading"
                ? "opacity-70 cursor-not-allowed"
                : currentState === "error"
                ? "border border-error"
                : "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
            }`}
          >
            {currentState === "loading" ? (
              <svg
                className="animate-spinner h-5 w-5 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                aria-hidden="true"
              >
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.24 1 3.2 3.73 1.24 7.72l3.85 3C6.01 7.71 8.78 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.11 2.73-2.36 3.57l3.67 2.84c2.14-1.98 3.38-4.89 3.38-8.51z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.09 13.72c-.24-.72-.37-1.5-.37-2.3s.13-1.58.37-2.3l-3.85-3C.43 7.84 0 9.87 0 12s.43 4.16 1.24 5.88l3.85-3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.67-2.84c-1.01.67-2.31 1.09-4.29 1.09-3.22 0-5.99-2.67-6.91-5.68l-3.85 3C3.2 20.27 7.24 23 12 23z"
                />
              </svg>
            )}
            <span>
              {currentState === "loading"
                ? "Connecting to Google..."
                : "Continue with Google"}
            </span>
          </button>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-xs text-text-muted leading-relaxed">
          By continuing, you agree to our{" "}
          <a
            href="/terms"
            className="hover:underline hover:text-text-primary transition-colors focus:outline-none focus:underline"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="hover:underline hover:text-text-primary transition-colors focus:outline-none focus:underline"
          >
            Privacy
          </a>
        </div>
      </div>

      {/* STATE CONTROL PANEL FOR TESTING */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4">
        <div
          className="rounded-card bg-[#111115]/95 p-4 shadow-xl border border-white/5 backdrop-blur-md"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2">
            Verification - State Controller
          </h4>
          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={() => setForcedState("default")}
              className={`py-1 text-[10px] font-bold rounded transition-all min-tap-target ${
                currentState === "default"
                  ? "bg-primary text-white"
                  : "bg-white/5 text-text-muted hover:bg-white/10"
              }`}
            >
              Default
            </button>
            <button
              onClick={() => setForcedState("hover")}
              className={`py-1 text-[10px] font-bold rounded transition-all min-tap-target ${
                currentState === "hover"
                  ? "bg-primary text-white"
                  : "bg-white/5 text-text-muted hover:bg-white/10"
              }`}
            >
              Hover
            </button>
            <button
              onClick={() => setForcedState("loading")}
              className={`py-1 text-[10px] font-bold rounded transition-all min-tap-target ${
                currentState === "loading"
                  ? "bg-primary text-white"
                  : "bg-white/5 text-text-muted hover:bg-white/10"
              }`}
            >
              Loading
            </button>
            <button
              onClick={() => setForcedState("error")}
              className={`py-1 text-[10px] font-bold rounded transition-all min-tap-target ${
                currentState === "error"
                  ? "bg-primary text-white"
                  : "bg-white/5 text-text-muted hover:bg-white/10"
              }`}
            >
              Error
            </button>
            <button
              onClick={() => setForcedState("success")}
              className={`py-1 text-[10px] font-bold rounded transition-all min-tap-target ${
                currentState === "success"
                  ? "bg-primary text-white"
                  : "bg-white/5 text-text-muted hover:bg-white/10"
              }`}
            >
              Success
            </button>
          </div>
          <div className="mt-2 text-[10px] text-text-muted text-center">
            Active state: <span className="font-semibold text-primary">{currentState}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
