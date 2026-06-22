"use client";
import React from "react";
import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export default function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div
      className={`bg-[rgba(20,20,25,0.4)] backdrop-blur-[16px] border border-[rgba(255,255,255,0.08)] rounded-[var(--radius-card)] transition-all duration-300 ease-out hover:translate-y-[-2px] hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)] ${className}`}
    >
      {children}
    </div>
  );
}
