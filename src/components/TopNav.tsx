"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const pathname = usePathname();
  
  // Hide global TopNav on dashboard, login, and onboarding screens
  if (
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/onboarding")
  ) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-[rgba(0,0,0,0.5)] backdrop-blur-md flex items-center px-4 z-50">
      <Link href="/" className="flex items-center space-x-2 text-2xl font-bold text-white">
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
        <span>TubeRank</span>
      </Link>
      <div className="flex-1" />
      <button aria-label="Search" className="p-2 text-white min-tap-target flex items-center justify-center">
        <svg
          className="h-6 w-6 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.0"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
      <button aria-label="Notifications" className="relative p-2 text-white min-tap-target flex items-center justify-center">
        <svg
          className="h-6 w-6 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.0"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full" />
      </button>
    </nav>
  );
}
