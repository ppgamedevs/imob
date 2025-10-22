/**
 * Robots.txt parsing & compliance
 * Respects crawl-delay, disallow rules for ImobIntelBot
 */

export interface RobotsRules {
  allowed: boolean;
  crawlDelayMs?: number;
}

const USER_AGENT = "ImobIntelBot";

/**
 * Parse robots.txt and check if path is allowed for our bot
 */
export function parseRobotsTxt(robotsTxt: string, path: string): RobotsRules {
  const lines = robotsTxt.split("\n");
  let currentAgent = "";
  let disallowRules: string[] = [];
  let crawlDelayMs: number | undefined;

  for (let line of lines) {
    line = line.split("#")[0].trim(); // Remove comments
    if (!line) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === "user-agent") {
      currentAgent = value.toLowerCase();
      if (currentAgent !== USER_AGENT.toLowerCase() && currentAgent !== "*") {
        disallowRules = [];
        crawlDelayMs = undefined;
      }
    } else if (
      currentAgent === USER_AGENT.toLowerCase() ||
      currentAgent === "*"
    ) {
      if (key === "disallow") {
        disallowRules.push(value);
      } else if (key === "crawl-delay") {
        const delay = parseFloat(value);
        if (!isNaN(delay)) {
          crawlDelayMs = delay * 1000;
        }
      }
    }
  }

  // Check if path matches any disallow rule
  const allowed = !disallowRules.some((rule) => {
    if (!rule) return false;
    if (rule === "/") return true; // Disallow all
    return path.startsWith(rule);
  });

  return { allowed, crawlDelayMs };
}

/**
 * Fetch and parse robots.txt for a domain
 * Returns null if robots.txt not found (allow by default)
 */
export async function checkRobotsTxt(
  domain: string,
  path: string
): Promise<RobotsRules> {
  try {
    const robotsUrl = `https://${domain}/robots.txt`;
    const response = await fetch(robotsUrl, {
      headers: {
        "User-Agent": `${USER_AGENT}/1.0 (+https://imob.ro/bot)`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // No robots.txt = allow by default
      return { allowed: true };
    }

    const text = await response.text();
    return parseRobotsTxt(text, path);
  } catch {
    // Network error or timeout = allow by default
    return { allowed: true };
  }
}
