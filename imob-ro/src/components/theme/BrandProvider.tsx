"use client";

import { useEffect } from "react";

export interface BrandConfig {
  color?: string; // hex color e.g., "#2563eb"
  logoUrl?: string; // URL to logo image
  tone?: string; // brand tone (not used in CSS but available for context)
}

export interface BrandProviderProps {
  brand?: BrandConfig | null;
  children: React.ReactNode;
}

/**
 * BrandProvider - Applies brand theming via CSS custom properties
 *
 * Sets [data-brand] and [data-logo-url] attributes on document.body
 * to enable brand color and logo overrides via CSS variables.
 *
 * Usage:
 * <BrandProvider brand={{ color: "#ff5733", logoUrl: "/logo.png" }}>
 *   {children}
 * </BrandProvider>
 */
export function BrandProvider({ brand, children }: BrandProviderProps) {
  useEffect(() => {
    if (!brand) {
      // Remove brand attributes if no brand
      document.body.removeAttribute("data-brand");
      document.body.removeAttribute("data-logo-url");
      document.body.style.removeProperty("--brand-color");
      document.body.style.removeProperty("--brand-logo-url");
      return;
    }

    // Set brand attribute to enable [data-brand] CSS selectors
    document.body.setAttribute("data-brand", "true");

    // Apply brand color if provided
    if (brand.color) {
      // Convert hex to RGB for CSS variable usage
      const hex = brand.color.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      document.body.style.setProperty("--brand-color", `${r} ${g} ${b}`);
    }

    // Apply logo URL if provided
    if (brand.logoUrl) {
      document.body.setAttribute("data-logo-url", "true");
      document.body.style.setProperty("--brand-logo-url", `url(${brand.logoUrl})`);
    }

    // Cleanup on unmount or brand change
    return () => {
      document.body.removeAttribute("data-brand");
      document.body.removeAttribute("data-logo-url");
      document.body.style.removeProperty("--brand-color");
      document.body.style.removeProperty("--brand-logo-url");
    };
  }, [brand]);

  return <>{children}</>;
}

/**
 * Helper: Extract brand config from various sources
 */
export function getBrandFromDeveloper(developer: any): BrandConfig | null {
  if (!developer?.brand) return null;

  return {
    color: developer.brand.color || undefined,
    logoUrl: developer.logoUrl || undefined,
    tone: developer.brand.tone || undefined,
  };
}

export function getBrandFromOwner(owner: any): BrandConfig | null {
  if (!owner) return null;

  // Owners might have custom brand in future
  return null;
}

export function getBrandFromOrg(org: any): BrandConfig | null {
  if (!org?.branding) return null;

  return {
    color: org.branding.primaryColor || undefined,
    logoUrl: org.branding.logoUrl || undefined,
    tone: org.branding.tone || undefined,
  };
}
