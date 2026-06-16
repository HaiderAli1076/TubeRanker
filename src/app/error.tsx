"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary caught error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
        <p className="mt-4 text-gray-600">
          An unexpected application error occurred. We have logged this issue and are working to resolve it.
        </p>
        {error.message && (
          <pre className="mt-4 overflow-x-auto rounded bg-gray-100 p-3 text-left text-xs text-gray-700">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => reset()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
          <a
            href="/"
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
