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
        <span className="material-symbols-outlined text-primary">rocket_launch</span>
        <span>TubeRank</span>
      </Link>
      <div className="flex-1" />
      <button aria-label="Search" className="p-2 text-white min-tap-target">
        <span className="material-symbols-outlined">search</span>
      </button>
      <button aria-label="Notifications" className="relative p-2 text-white min-tap-target">
        <span className="material-symbols-outlined">notifications</span>
        <span className="absolute top-1 right-1 h-2 w-2 bg-primary rounded-full" />
      </button>
    </nav>
  );
}
