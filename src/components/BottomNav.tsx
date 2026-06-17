"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/analytics", label: "Analytics", icon: "analytics" },
  { href: "/ai", label: "AI Suite", icon: "smart_toy" },
  { href: "/competitors", label: "Competitors", icon: "group" },
  { href: "/settings", label: "Settings", icon: "settings" },
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
        return (
          <Link key={item.href} href={item.href} className="flex flex-col items-center text-sm min-tap-target">
            <span
              className={`material-symbols-outlined ${isActive ? "text-primary" : "text-muted"}`}
              aria-hidden="true"
            >
              {item.icon}
            </span>
            <span className={isActive ? "text-primary" : "text-muted"}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
