"use client";

import { useEffect, useState } from "react";
import { getCsrfToken } from "next-auth/react";

export default function CsrfDemoPage() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    async function loadToken() {
      const token = await getCsrfToken();
      setCsrfToken(token ?? null);
    }
    loadToken();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="max-w-md w-full rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">CSRF Form Integration</h1>
        <p className="mt-2 text-gray-600">
          Demonstrates how to fetch and include NextAuth&apos;s built-in CSRF token in a form post.
        </p>

        <form action="/api/some-endpoint-demo" method="POST" className="mt-6 space-y-4 text-left">
          <input type="hidden" name="csrfToken" defaultValue={csrfToken ?? ""} />

          <div>
            <label htmlFor="exampleInput" className="block text-sm font-medium text-gray-700">
              Sample Data
            </label>
            <input
              type="text"
              name="sampleData"
              id="exampleInput"
              required
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter some text..."
            />
          </div>

          <button
            type="submit"
            disabled={!csrfToken}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Submit Secure Form
          </button>
        </form>

        {csrfToken ? (
          <div className="mt-6 text-xs text-left bg-gray-50 border border-gray-200 rounded p-3 text-gray-500 break-all">
            <strong>Active CSRF Token:</strong> {csrfToken}
          </div>
        ) : (
          <div className="mt-6 text-xs text-gray-400">Loading CSRF Token...</div>
        )}
      </div>
    </div>
  );
}
