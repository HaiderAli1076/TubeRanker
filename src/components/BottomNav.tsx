"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const IconDashboard = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

const IconAnalytics = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16V10M11 16V7M15 16V12M19 16V9" />
  </svg>
);

const IconAI = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="8" width="16" height="11" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20v2M15 20v2M12 4v4M9 12h.01M15 12h.01M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const IconCompetitors = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const IconSettings = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/analytics", label: "Analytics", Icon: IconAnalytics },
  { href: "/ai", label: "AI Suite", Icon: IconAI },
  { href: "/competitors", label: "Competitors", Icon: IconCompetitors },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide global BottomNav on dashboard, login, and onboarding screens
  if (
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/onboarding")
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[rgba(0,0,0,0.5)] backdrop-blur-md flex justify-around items-center z-50 md:hidden">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.Icon;
        return (
          <Link key={item.href} href={item.href} className="flex flex-col items-center text-sm min-tap-target">
            <Icon
              className={`h-6 w-6 ${isActive ? "text-primary" : "text-muted"}`}
              aria-hidden="true"
            />
            <span className={isActive ? "text-primary" : "text-muted"}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
