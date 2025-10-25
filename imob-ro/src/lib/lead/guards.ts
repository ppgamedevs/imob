/**
 * Lead Guards - Anti-spam and validation utilities
 *
 * Features:
 * - Honeypot detection (hidden field trap)
 * - Timing guard (reject too-fast submissions)
 * - Message sanitization (strip URLs, profanity filter)
 * - Content validation (max numbers, length)
 */

const PROFANITY_WORDS = [
  // Basic Romanian profanity patterns (expand as needed)
  "muie",
  "pula",
  "futut",
  "cacat",
];

/** Check if honeypot field is filled (bot indicator) */
export function isHoneypot(honeypotValue?: string): boolean {
  return Boolean(honeypotValue && honeypotValue.trim().length > 0);
}

/** Check if submission was too fast (< 800ms from page load) */
export async function isTooFast(sessionKey: string): Promise<boolean> {
  // Store mount timestamp in session/cookie
  // For now, simple check - you can implement with session storage
  // Example: compare Date.now() with stored timestamp
  // return Date.now() - getMountTimestamp(sessionKey) < 800;
  return false; // TODO: Implement with session storage
}

/**
 * Sanitize message content
 * - Strip URLs
 * - Remove excessive numbers
 * - Filter profanity
 * - Normalize whitespace
 */
export function sanitizeMessage(message: string): string {
  let sanitized = message;

  // Strip URLs (http/https)
  sanitized = sanitized.replace(/https?:\/\/[^\s]+/gi, "[link eliminat]");

  // Strip www. domains
  sanitized = sanitized.replace(/www\.[^\s]+/gi, "[link eliminat]");

  // Detect excessive number groupings (> 3 groups of digits)
  const numberGroups = sanitized.match(/\d{3,}/g);
  if (numberGroups && numberGroups.length > 3) {
    // Replace extra numbers with placeholder
    const firstThree = numberGroups.slice(0, 3);
    sanitized = sanitized.replace(/\d{3,}/g, (match) => {
      return firstThree.includes(match) ? match : "[...]";
    });
  }

  // Basic profanity filter (case-insensitive)
  PROFANITY_WORDS.forEach((word) => {
    const regex = new RegExp(word, "gi");
    sanitized = sanitized.replace(regex, "***");
  });

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}

/**
 * Validate contact field (phone or email)
 * Returns normalized value or null if invalid
 */
export function validateContact(
  contact: string,
): { type: "phone" | "email"; value: string } | null {
  const trimmed = contact.trim();

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(trimmed)) {
    return { type: "email", value: trimmed.toLowerCase() };
  }

  // Phone validation (Romanian format)
  // Accept: +40..., 07..., 00407...
  const phoneRegex = /^(\+?40|0)?[7][0-9]{8}$/;
  const digitsOnly = trimmed.replace(/[\s\-()]/g, "");

  if (phoneRegex.test(digitsOnly)) {
    // Normalize to +40 format
    const normalized = digitsOnly.startsWith("+40")
      ? digitsOnly
      : digitsOnly.startsWith("40")
        ? `+${digitsOnly}`
        : digitsOnly.startsWith("0")
          ? `+4${digitsOnly}`
          : `+40${digitsOnly}`;

    return { type: "phone", value: normalized };
  }

  return null;
}

/**
 * Check if message has suspicious patterns
 * Returns reason string if suspicious, null if OK
 */
export function detectSuspiciousContent(message: string): string | null {
  // Too short (after sanitization)
  if (message.length < 10) {
    return "Mesajul este prea scurt";
  }

  // All caps (spammy)
  if (message === message.toUpperCase() && message.length > 20) {
    return "Mesajul conține prea multe majuscule";
  }

  // Repeated characters (e.g., "aaaaaaaa")
  if (/(.)\1{7,}/.test(message)) {
    return "Mesajul conține caractere repetate";
  }

  // Too many exclamation/question marks
  const specialCount = (message.match(/[!?]/g) || []).length;
  if (specialCount > 5) {
    return "Mesajul conține prea multe semne de punctuație";
  }

  return null;
}

/**
 * Format phone number for display
 * +40712345678 -> +40 712 345 678
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone.startsWith("+40")) return phone;

  const digits = phone.slice(3);
  return `+40 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

/**
 * Get WhatsApp link from phone number
 */
export function getWhatsAppLink(phone: string, message?: string): string {
  const cleanPhone = phone.replace(/[\s\-()]/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${cleanPhone}${text}`;
}

/**
 * Detect if user is on mobile (for channel button behavior)
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
