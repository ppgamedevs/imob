"use client";

import Image from "next/image";
import React from "react";

type HeroProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  cta?: React.ReactNode;
  image?: string;
};

export default function Hero({ title, subtitle, cta, image }: HeroProps) {
  return (
    <section className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-white/60 to-muted/40 p-6 shadow-xl glass-card">
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold leading-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
          {cta && <div className="mt-4">{cta}</div>}
        </div>
        {image && (
          <div className="hidden shrink-0 basis-40 md:block relative h-24 w-40">
            <Image src={image} alt="hero" fill className="rounded-lg object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
