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
      router.push("/dashboard");
    }, 1500);
  };


  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background font-sans px-4 relative overflow-hidden">
      {/* Ambient background accent glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Error Toast Notification */}
      <div
        role="alert"
        aria-live="assertive"
        className={`fixed top-6 right-6 z-50 flex max-w-sm w-full items-start gap-3 rounded-[12px] bg-card p-4 shadow-xl border border-[#EF4444] transition-all duration-300 ease-out transform ${
          showToast
            ? "translate-x-0 opacity-100"
            : "translate-x-12 opacity-0 pointer-events-none"
        }`}
      >
        <div className="text-[#EF4444] mt-0.5">
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
          className="text-[#9CA3AF] hover:text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-gray-300 rounded"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Centered White Card */}
      <div
        className="w-full max-w-[400px] bg-card rounded-[12px] border border-white/10 p-[40px] text-center relative z-10 login-card-entrance"
        style={{
          boxShadow: "0 4px 24px 0 rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Logo/Wordmark */}
        <div className="mb-[32px] flex justify-center items-center gap-[8px]">
          <svg
            className="h-6 w-6 text-primary shrink-0 play-icon-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* Outlined rounded-square */}
            <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2.5" fill="none" />
            {/* Inner solid triangle pointing right */}
            <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
          </svg>
          <span className="text-[20px] font-extrabold tracking-tight text-text-primary">
            TubeRank
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight leading-none mb-[8px]">
          Sign in to your account
        </h1>

        {/* Subtext */}
        <p className="text-[14px] text-text-muted mb-[32px]">
          AI-powered YouTube growth suite
        </p>

        {/* Google sign-in button */}
        <button
          onClick={handleGoogleClick}
          disabled={currentState === "loading"}
          className="w-full h-[44px] rounded-[8px] bg-white border border-[#DADCE0] flex items-center justify-center gap-[12px] transition-all duration-200 hover:bg-[#F8F9FA] hover:shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:scale-[1.01] active:scale-[0.98] focus:outline-none mb-[24px]"
        >
          {currentState === "loading" ? (
            <svg
              className="animate-spinner h-5 w-5 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
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
              className="w-[18px] h-[18px] shrink-0"
              viewBox="0 0 24 24"
              width="18"
              height="18"
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
          <span className="text-[14px] font-medium text-[#3C4043]">
            {currentState === "loading" ? "Connecting to Google..." : "Continue with Google"}
          </span>
        </button>

        {/* Footer info */}
        <div className="text-[12px] text-text-muted leading-normal">
          By continuing, you agree to our{" "}
          <a
            href="/terms"
            className="hover:underline hover:text-accent transition-colors focus:outline-none focus:underline"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="hover:underline hover:text-accent transition-colors focus:outline-none focus:underline"
          >
            Privacy
          </a>
        </div>
      </div>
    </div>
  );
}
