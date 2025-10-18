"use client";

import React from "react";

type CardLgProps = {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
};

export default function CardLg({ children, title, subtitle, className = "" }: CardLgProps) {
  return (
    <div className={`rounded-2xl bg-card p-6 shadow-lg ${className}`}>
      {title && (
        <div className="mb-3">
          <div className="text-lg font-semibold">{title}</div>
          {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
