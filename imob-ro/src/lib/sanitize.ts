import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes dangerous tags, attributes, and JavaScript
 *
 * @param dirty - Potentially unsafe HTML string
 * @param options - DOMPurify configuration options
 * @returns Sanitized safe HTML string
 *
 * @example
 * ```ts
 * const userInput = '<script>alert("XSS")</script><p>Safe content</p>';
 * const safe = sanitizeHTML(userInput);
 * // Returns: '<p>Safe content</p>'
 * ```
 */
export function sanitizeHTML(dirty: string, options?: any): string {
  return String(
    DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "a",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "code",
        "pre",
      ],
      ALLOWED_ATTR: ["href", "title", "target", "rel"],
      ALLOW_DATA_ATTR: false,
      ...options,
    }),
  );
}

/**
 * Strip all HTML tags and return plain text
 * Use this for fields that should never contain HTML
 *
 * @param html - HTML string to strip
 * @returns Plain text with all HTML removed
 *
 * @example
 * ```ts
 * const html = '<p>Hello <strong>World</strong></p>';
 * const text = stripHTML(html);
 * // Returns: 'Hello World'
 * ```
 */
export function stripHTML(html: string): string {
  return String(
    DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [],
      KEEP_CONTENT: true,
    }),
  );
}

/**
 * Sanitize user-generated listing description
 * Allows basic formatting but removes dangerous content
 *
 * @param description - Raw description from user or external source
 * @returns Sanitized description safe for rendering
 *
 * @example
 * ```ts
 * const desc = 'Apartment for sale <script>steal()</script> with 3 rooms';
 * const safe = sanitizeDescription(desc);
 * // Returns: 'Apartment for sale  with 3 rooms'
 * ```
 */
export function sanitizeDescription(description: string): string {
  return sanitizeHTML(description, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "ul", "ol", "li"],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize listing title - should contain no HTML
 *
 * @param title - Raw title from user or external source
 * @returns Plain text title
 *
 * @example
 * ```ts
 * const title = 'Amazing <script>alert("XSS")</script> Apartment';
 * const safe = sanitizeTitle(title);
 * // Returns: 'Amazing  Apartment'
 * ```
 */
export function sanitizeTitle(title: string): string {
  return stripHTML(title).trim();
}

/**
 * Sanitize address - should contain no HTML
 *
 * @param address - Raw address from user or external source
 * @returns Plain text address
 */
export function sanitizeAddress(address: string): string {
  return stripHTML(address).trim();
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 *
 * @param url - Raw URL from user or external source
 * @returns Safe URL or empty string if invalid
 *
 * @example
 * ```ts
 * const bad = 'javascript:alert("XSS")';
 * const safe = sanitizeURL(bad);
 * // Returns: ''
 *
 * const good = 'https://example.com';
 * const safe2 = sanitizeURL(good);
 * // Returns: 'https://example.com'
 * ```
 */
export function sanitizeURL(url: string): string {
  const trimmed = url.trim();

  // Block dangerous protocols
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.startsWith("file:")
  ) {
    return "";
  }

  // Validate it's a proper URL
  try {
    new URL(trimmed);
    return trimmed;
  } catch {
    // If not a full URL, assume it's a relative path
    // Only allow if it starts with / or http(s)
    if (trimmed.startsWith("/") || trimmed.startsWith("http")) {
      return trimmed;
    }
    return "";
  }
}

/**
 * Sanitize an entire extracted listing object
 * Applies appropriate sanitization to each field
 *
 * @param listing - Raw extracted listing data
 * @returns Sanitized listing safe for storage and display
 */
export function sanitizeListing<T extends Record<string, any>>(listing: T): T {
  const sanitized: any = { ...listing };

  // Sanitize text fields
  if (typeof sanitized.title === "string") {
    sanitized.title = sanitizeTitle(sanitized.title);
  }
  if (typeof sanitized.description === "string") {
    sanitized.description = sanitizeDescription(sanitized.description);
  }
  if (typeof sanitized.addressRaw === "string") {
    sanitized.addressRaw = sanitizeAddress(sanitized.addressRaw);
  }
  if (typeof sanitized.addressInferred === "string") {
    sanitized.addressInferred = sanitizeAddress(sanitized.addressInferred);
  }

  // Sanitize URLs
  if (typeof sanitized.sourceUrl === "string") {
    sanitized.sourceUrl = sanitizeURL(sanitized.sourceUrl);
  }
  if (Array.isArray(sanitized.photos)) {
    sanitized.photos = sanitized.photos.map((url: string) => sanitizeURL(url)).filter(Boolean);
  }

  return sanitized;
}
