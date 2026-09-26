import { URL } from "node:url";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * A single retrieved research page.
 */
export type ResearchPage = {
  url: string;
  title: string;
  text: string;
  links: string[];
  status: "ok" | "failed";
  error?: string;
};

/**
 * Complete company research result.
 */
export type CompanyResearch = {
  companyUrl: string;
  pagesUsed: string[];
  pages: ResearchPage[];
  companyText: string;
  sources: string[];
};

/* ============================================================
   CONFIGURATION
   ============================================================ */

const MAX_PAGES = 6;
const MAX_TEXT_LENGTH = 12_000;
const MAX_COMPANY_TEXT_LENGTH = 30_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const REQUEST_TIMEOUT_MS = 10_000;

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 700;

const MIN_REQUEST_INTERVAL_MS = 350;

const MAX_DISCUSSION_RESULTS = 3;

const CRAWLER_USER_AGENT =
  "TraoAIInterviewPrepKit/1.0 (+interview-prep-research)";

/* ============================================================
   RESEARCH RANKING
   ============================================================ */

const PRIORITY_TERMS = [
  "careers",
  "career",
  "jobs",
  "job",
  "hiring",
  "interview",
  "about",
  "company",
  "product",
  "products",
  "platform",
  "technology",
  "technologies",
  "engineering",
  "developers",
  "solutions",
  "customers",
  "industries",
  "security",
];

const SECONDARY_TERMS = [
  "team",
  "culture",
  "mission",
  "values",
  "leadership",
  "press",
  "news",
  "blog",
  "technical",
  "architecture",
];

const LOW_VALUE_TERMS = [
  "privacy",
  "cookie",
  "legal",
  "terms",
  "login",
  "signin",
  "sign-in",
  "signup",
  "sign-up",
  "account",
  "cart",
  "checkout",
  "subscribe",
];

/* ============================================================
   URL / CRAWL FILTERS
   ============================================================ */

const BLOCKED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".bmp",
  ".tif",
  ".tiff",
  ".mp4",
  ".mp3",
  ".wav",
  ".avi",
  ".mov",
  ".webm",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".csv",
];

const TRACKING_PARAMETERS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
]);

/* ============================================================
   ROBOTS CACHE
   ============================================================ */

type RobotsRules = {
  allowed: boolean;
  fetched: boolean;
  disallow: string[];
  allow: string[];
};

const robotsCache =
  new Map<string, RobotsRules>();

/* ============================================================
   REQUEST THROTTLING
   ============================================================ */

const lastRequestByHost =
  new Map<string, number>();

/* ============================================================
   BASIC HELPERS
   ============================================================ */

function sleep(
  ms: number
): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function cleanText(
  value: string
): string {
  return value
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(
  value: string
): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(
      /&#(\d+);/g,
      (_, code: string) =>
        String.fromCharCode(
          Number(code)
        )
    );
}

function htmlToText(
  html: string
): string {
  const withoutScripts =
    html
      .replace(
        /<script\b[^>]*>[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style\b[^>]*>[\s\S]*?<\/style>/gi,
        " "
      )
      .replace(
        /<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,
        " "
      )
      .replace(
        /<template\b[^>]*>[\s\S]*?<\/template>/gi,
        " "
      );

  const withBlocks =
    withoutScripts
      .replace(
        /<\/(?:p|div|section|article|li|h1|h2|h3|h4|h5|h6|br|tr)>/gi,
        "\n"
      )
      .replace(
        /<li\b[^>]*>/gi,
        "\n- "
      );

  return cleanText(
    decodeHtmlEntities(
      withBlocks
        .replace(/<[^>]+>/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n[ \t]+/g, "\n")
    )
  );
}

function extractTitle(
  html: string
): string {
  const titleMatch =
    html.match(
      /<title\b[^>]*>([\s\S]*?)<\/title>/i
    );

  if (!titleMatch) {
    return "";
  }

  return cleanText(
    decodeHtmlEntities(
      titleMatch[1]
        .replace(/<[^>]+>/g, " ")
    )
  ).slice(0, 300);
}

/* ============================================================
   COMPANY NAME
   ============================================================ */

function getCompanyName(
  companyUrl: string
): string {
  try {
    const hostname =
      new URL(companyUrl)
        .hostname
        .replace(/^www\./i, "");

    const labels =
      hostname
        .split(".")
        .filter(Boolean);

    if (
      labels.length === 0
    ) {
      return "Company";
    }

    const value =
      labels.length >= 2
        ? labels[labels.length - 2]
        : labels[0];

    return (
      value.charAt(0).toUpperCase() +
      value.slice(1)
    );
  } catch {
    return "Company";
  }
}

/* ============================================================
   SSRF / PRIVATE NETWORK PROTECTION
   ============================================================ */

function isPrivateIPv4(
  address: string
): boolean {
  const parts = address
    .split(".")
    .map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255
    )
  ) {
    return false;
  }

  const [
    a,
    b,
  ] = parts;

  if (a === 10) {
    return true;
  }

  if (a === 127) {
    return true;
  }

  if (
    a === 169 &&
    b === 254
  ) {
    return true;
  }

  if (
    a === 172 &&
    b >= 16 &&
    b <= 31
  ) {
    return true;
  }

  if (
    a === 192 &&
    b === 168
  ) {
    return true;
  }

  if (a === 0) {
    return true;
  }

  return false;
}

function isPrivateIPv6(
  address: string
): boolean {
  const lower =
    address.toLowerCase();

  if (
    lower === "::" ||
    lower === "::1"
  ) {
    return true;
  }

  if (
    lower.startsWith("fc") ||
    lower.startsWith("fd")
  ) {
    return true;
  }

  if (
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  ) {
    return true;
  }

  const mapped =
    lower.match(
      /::ffff:(\d+\.\d+\.\d+\.\d+)$/
    );

  if (mapped) {
    return isPrivateIPv4(
      mapped[1]
    );
  }

  return false;
}

function isPrivateIp(
  address: string
): boolean {
  const version =
    isIP(address);

  if (version === 4) {
    return isPrivateIPv4(
      address
    );
  }

  if (version === 6) {
    return isPrivateIPv6(
      address
    );
  }

  return false;
}

async function hostnameResolvesPrivate(
  hostname: string
): Promise<boolean> {
  try {
    const result =
      await lookup(
        hostname,
        {
          all: true,
          verbatim: true,
        }
      );

    return result.some(
      (entry) =>
        isPrivateIp(
          entry.address
        )
    );
  } catch {
    return false;
  }
}

function validateExternalUrl(
  input: string
): URL {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error(
      "Invalid company URL"
    );
  }

  /*
   * Keep this exact message because the API test
   * expects this validation contract.
   */
  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    throw new Error(
      "Company URL must use HTTP or HTTPS"
    );
  }

  const hostname =
    url.hostname.toLowerCase();

  if (!hostname) {
    throw new Error(
      "Company URL must include a hostname"
    );
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    throw new Error(
      "Private or loopback company URLs are not allowed"
    );
  }

  if (
    isIP(hostname) &&
    isPrivateIp(hostname)
  ) {
    throw new Error(
      "Private or loopback company URLs are not allowed"
    );
  }

  if (
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa")
  ) {
    throw new Error(
      "Private or internal company URLs are not allowed"
    );
  }

  return url;
}

async function validateResolvedHost(
  hostname: string
): Promise<void> {
  if (isIP(hostname)) {
    if (
      isPrivateIp(hostname)
    ) {
      throw new Error(
        "Private or loopback company URLs are not allowed"
      );
    }

    return;
  }

  if (
    await hostnameResolvesPrivate(
      hostname
    )
  ) {
    throw new Error(
      "Private or loopback company URLs are not allowed"
    );
  }
}

/* ============================================================
   URL CANONICALIZATION
   ============================================================ */

function canonicalizeUrl(
  input: URL | string
): URL {
  const url =
    input instanceof URL
      ? new URL(
          input.toString()
        )
      : new URL(input);

  url.hash = "";

  for (
    const key of Array.from(
      url.searchParams.keys()
    )
  ) {
    if (
      TRACKING_PARAMETERS.has(
        key.toLowerCase()
      )
    ) {
      url.searchParams.delete(
        key
      );
    }
  }

  if (
    url.pathname !== "/" &&
    url.pathname.endsWith("/")
  ) {
    url.pathname =
      url.pathname.replace(
        /\/+$/,
        ""
      );
  }

  return url;
}

/* ============================================================
   URL FILTERING
   ============================================================ */

function isBlockedUrl(
  url: URL
): boolean {
  const pathname =
    url.pathname.toLowerCase();

  if (
    BLOCKED_EXTENSIONS.some(
      (extension) =>
        pathname.endsWith(
          extension
        )
    )
  ) {
    return true;
  }

  if (
    pathname.includes("/login") ||
    pathname.includes("/signin") ||
    pathname.includes("/sign-in") ||
    pathname.includes("/signup") ||
    pathname.includes("/sign-up") ||
    pathname.includes("/account") ||
    pathname.includes("/checkout") ||
    pathname.includes("/cart")
  ) {
    return true;
  }

  return false;
}

/* ============================================================
   LINK EXTRACTION
   ============================================================ */

function extractLinks(
  html: string,
  baseUrl: URL
): string[] {
  const links =
    new Set<string>();

  const anchorRegex =
    /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi;

  let match:
    | RegExpExecArray
    | null;

  while (
    (match =
      anchorRegex.exec(html)) !==
    null
  ) {
    const href =
      (
        match[1] ??
        match[2] ??
        match[3] ??
        ""
      ).trim();

    if (!href) {
      continue;
    }

    if (
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("javascript:")
    ) {
      continue;
    }

    let resolved: URL;

    try {
      resolved =
        canonicalizeUrl(
          new URL(
            href,
            baseUrl
          )
        );
    } catch {
      continue;
    }

    if (
      resolved.protocol !==
        "http:" &&
      resolved.protocol !==
        "https:"
    ) {
      continue;
    }

    if (
      resolved.hostname.toLowerCase() !==
      baseUrl.hostname.toLowerCase()
    ) {
      continue;
    }

    if (
      isBlockedUrl(
        resolved
      )
    ) {
      continue;
    }

    links.add(
      resolved.toString()
    );
  }

  return Array.from(
    links
  );
}

/* ============================================================
   DYNAMIC LINK RANKING
   ============================================================ */

function scoreLink(
  link: string,
  baseUrl: URL
): number {
  let url: URL;

  try {
    url =
      canonicalizeUrl(
        link
      );
  } catch {
    return -1000;
  }

  if (
    url.hostname.toLowerCase() !==
    baseUrl.hostname.toLowerCase()
  ) {
    return -1000;
  }

  if (
    isBlockedUrl(url)
  ) {
    return -1000;
  }

  const value =
    `${url.pathname} ${url.search}`
      .toLowerCase();

  let score = 0;

  for (
    const term of PRIORITY_TERMS
  ) {
    if (
      value.includes(term)
    ) {
      score += 10;
    }
  }

  for (
    const term of SECONDARY_TERMS
  ) {
    if (
      value.includes(term)
    ) {
      score += 4;
    }
  }

  for (
    const term of LOW_VALUE_TERMS
  ) {
    if (
      value.includes(term)
    ) {
      score -= 8;
    }
  }

  const depth =
    url.pathname
      .split("/")
      .filter(Boolean)
      .length;

  score -=
    Math.max(
      0,
      depth - 2
    );

  if (
    url.pathname === "/"
  ) {
    score += 5;
  }

  return score;
}

function rankLinks(
  links: string[],
  baseUrl: URL
): string[] {
  return [...links].sort(
    (a, b) =>
      scoreLink(
        b,
        baseUrl
      ) -
      scoreLink(
        a,
        baseUrl
      )
  );
}

/* ============================================================
   ROBOTS.TXT
   ============================================================ */

function robotsOriginKey(
  url: URL
): string {
  return `${url.protocol}//${url.host}`;
}

function pathMatchesRobotsRule(
  pathname: string,
  rule: string
): boolean {
  if (!rule) {
    return false;
  }

  const normalizedRule =
    rule
      .trim()
      .split("#")[0];

  if (!normalizedRule) {
    return false;
  }

  const anchored =
    normalizedRule.endsWith("$");

  const ruleValue =
    anchored
      ? normalizedRule.slice(
          0,
          -1
        )
      : normalizedRule;

  if (anchored) {
    return pathname === ruleValue;
  }

  return pathname.startsWith(
    ruleValue
  );
}

function parseRobots(
  body: string
): RobotsRules {
  const lines =
    body.split("\n");

  const groups: Array<{
    agents: string[];
    allow: string[];
    disallow: string[];
  }> = [];

  let current:
    | {
        agents: string[];
        allow: string[];
        disallow: string[];
      }
    | null = null;

  for (
    const rawLine of lines
  ) {
    const line =
      rawLine
        .split("#")[0]
        .trim();

    if (!line) {
      continue;
    }

    const separator =
      line.indexOf(":");

    if (
      separator === -1
    ) {
      continue;
    }

    const directive =
      line
        .slice(
          0,
          separator
        )
        .trim()
        .toLowerCase();

    const value =
      line
        .slice(
          separator + 1
        )
        .trim();

    if (
      directive ===
      "user-agent"
    ) {
      current = {
        agents: [
          value.toLowerCase(),
        ],
        allow: [],
        disallow: [],
      };

      groups.push(
        current
      );

      continue;
    }

    if (!current) {
      continue;
    }

    if (
      directive ===
      "allow"
    ) {
      current.allow.push(
        value
      );
      continue;
    }

    if (
      directive ===
      "disallow"
    ) {
      current.disallow.push(
        value
      );
    }
  }

  let selected =
    groups.find(
      (group) =>
        group.agents.some(
          (agent) =>
            agent ===
            CRAWLER_USER_AGENT.toLowerCase()
        )
    );

  if (!selected) {
    selected =
      groups.find(
        (group) =>
          group.agents.includes("*")
      );
  }

  if (!selected) {
    return {
      allowed: true,
      fetched: true,
      disallow: [],
      allow: [],
    };
  }

  return {
    allowed: true,
    fetched: true,
    disallow:
      selected.disallow,
    allow:
      selected.allow,
  };
}

async function fetchRobotsRules(
  baseUrl: URL
): Promise<RobotsRules> {
  const cacheKey =
    robotsOriginKey(
      baseUrl
    );

  const cached =
    robotsCache.get(
      cacheKey
    );

  if (cached) {
    return cached;
  }

  const robotsUrl =
    `${cacheKey}/robots.txt`;

  try {
    const response =
      await fetchWithRetries(
        robotsUrl,
        {
          method: "GET",
        },
        {
          skipRobots: true,
        }
      );

    if (!response.ok) {
      const fallback: RobotsRules = {
        allowed: true,
        fetched: false,
        disallow: [],
        allow: [],
      };

      robotsCache.set(
        cacheKey,
        fallback
      );

      return fallback;
    }

    const contentType =
      (
        response.headers.get(
          "content-type"
        ) ?? ""
      ).toLowerCase();

    if (
      contentType &&
      !contentType.includes(
        "text/plain"
      )
    ) {
      const fallback: RobotsRules = {
        allowed: true,
        fetched: false,
        disallow: [],
        allow: [],
      };

      robotsCache.set(
        cacheKey,
        fallback
      );

      return fallback;
    }

    const body =
      await response.text();

    const parsed =
      parseRobots(body);

    robotsCache.set(
      cacheKey,
      parsed
    );

    return parsed;
  } catch {
    const fallback: RobotsRules = {
      allowed: true,
      fetched: false,
      disallow: [],
      allow: [],
    };

    robotsCache.set(
      cacheKey,
      fallback
    );

    return fallback;
  }
}

function isAllowedByRobots(
  url: URL,
  rules: RobotsRules
): boolean {
  if (!rules.fetched) {
    return true;
  }

  const pathname =
    url.pathname || "/";

  let bestAllowLength =
    -1;

  for (
    const rule of rules.allow
  ) {
    if (
      pathMatchesRobotsRule(
        pathname,
        rule
      )
    ) {
      bestAllowLength =
        Math.max(
          bestAllowLength,
          rule.length
        );
    }
  }

  let bestDisallowLength =
    -1;

  for (
    const rule of rules.disallow
  ) {
    if (
      pathMatchesRobotsRule(
        pathname,
        rule
      )
    ) {
      bestDisallowLength =
        Math.max(
          bestDisallowLength,
          rule.length
        );
    }
  }

  if (
    bestAllowLength >=
    bestDisallowLength
  ) {
    return true;
  }

  return bestDisallowLength < 0;
}

/* ============================================================
   REQUEST THROTTLING / RETRIES
   ============================================================ */

async function waitForHostRateLimit(
  hostname: string
): Promise<void> {
  const now =
    Date.now();

  const last =
    lastRequestByHost.get(
      hostname
    ) ?? 0;

  const elapsed =
    now - last;

  if (
    elapsed <
    MIN_REQUEST_INTERVAL_MS
  ) {
    await sleep(
      MIN_REQUEST_INTERVAL_MS -
        elapsed
    );
  }

  lastRequestByHost.set(
    hostname,
    Date.now()
  );
}

type FetchOptions = {
  skipRobots?: boolean;
};

async function fetchWithRetries(
  input: string,
  init: RequestInit,
  options: FetchOptions = {}
): Promise<Response> {
  const url =
    validateExternalUrl(
      input
    );

  await validateResolvedHost(
    url.hostname
  );

  if (
    !options.skipRobots
  ) {
    const robots =
      await fetchRobotsRules(
        url
      );

    if (
      !isAllowedByRobots(
        url,
        robots
      )
    ) {
      throw new Error(
        "Blocked by robots.txt"
      );
    }
  }

  let lastError:
    | unknown = null;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt += 1
  ) {
    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () =>
          controller.abort(),
        REQUEST_TIMEOUT_MS
      );

    try {
      await waitForHostRateLimit(
        url.hostname
      );

      const response =
        await fetch(
          url.toString(),
          {
            ...init,
            signal:
              controller.signal,
            redirect:
              "manual",
            headers: {
              "User-Agent":
                CRAWLER_USER_AGENT,
              Accept:
                "text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8",
              ...(init.headers ?? {}),
            },
          }
        );

      /*
       * Follow redirects manually so the destination is
       * validated against the same SSRF rules.
       */
      if (
        response.status >= 300 &&
        response.status < 400
      ) {
        const location =
          response.headers.get(
            "location"
          );

        if (!location) {
          return response;
        }

        const redirectedUrl =
          canonicalizeUrl(
            new URL(
              location,
              url
            )
          );

        if (
          redirectedUrl.protocol !==
            "http:" &&
          redirectedUrl.protocol !==
            "https:"
        ) {
          throw new Error(
            "Company URL must use HTTP or HTTPS"
          );
        }

        await validateResolvedHost(
          redirectedUrl.hostname
        );

        /*
         * Only allow same-host redirects for company-page
         * crawling. This avoids following a company link
         * into an arbitrary external host.
         */
        if (
          redirectedUrl.hostname.toLowerCase() !==
          url.hostname.toLowerCase()
        ) {
          throw new Error(
            "External redirect is not allowed"
          );
        }

        return fetchWithRetries(
          redirectedUrl.toString(),
          init,
          options
        );
      }

      if (
        response.status === 429 ||
        response.status >= 500
      ) {
        lastError =
          new Error(
            `HTTP ${response.status}`
          );

        if (
          attempt <
          MAX_RETRIES
        ) {
          await sleep(
            BASE_RETRY_DELAY_MS *
              Math.pow(
                2,
                attempt - 1
              )
          );

          continue;
        }
      }

      return response;
    } catch (error) {
      lastError =
        error;

      if (
        attempt <
        MAX_RETRIES
      ) {
        await sleep(
          BASE_RETRY_DELAY_MS *
            Math.pow(
              2,
              attempt - 1
            )
        );
      }
    } finally {
      clearTimeout(
        timeout
      );
    }
  }

  throw (
    lastError instanceof Error
      ? lastError
      : new Error(
          "Request failed"
        )
  );
}

/* ============================================================
   SAFE HTML PAGE FETCH
   ============================================================ */

async function fetchPage(
  url: string,
  baseUrl: URL
): Promise<ResearchPage> {
  try {
    const validated =
      validateExternalUrl(
        url
      );

    if (
      validated.hostname.toLowerCase() !==
      baseUrl.hostname.toLowerCase()
    ) {
      return {
        url,
        title: "",
        text: "",
        links: [],
        status: "failed",
        error:
          "External host is not allowed in company crawl",
      };
    }

    const response =
      await fetchWithRetries(
        validated.toString(),
        {
          method: "GET",
        }
      );

    if (!response.ok) {
      return {
        url,
        title: "",
        text: "",
        links: [],
        status: "failed",
        error:
          `HTTP ${response.status}`,
      };
    }

    const contentType =
      (
        response.headers.get(
          "content-type"
        ) ?? ""
      ).toLowerCase();

    if (
      !contentType.includes(
        "text/html"
      ) &&
      !contentType.includes(
        "application/xhtml+xml"
      )
    ) {
      return {
        url,
        title: "",
        text: "",
        links: [],
        status: "failed",
        error:
          `Unsupported content type: ${
            contentType || "unknown"
          }`,
      };
    }

    const declaredLength =
      Number(
        response.headers.get(
          "content-length"
        ) ?? "0"
      );

    if (
      Number.isFinite(
        declaredLength
      ) &&
      declaredLength >
        MAX_RESPONSE_BYTES
    ) {
      return {
        url,
        title: "",
        text: "",
        links: [],
        status: "failed",
        error:
          "Response exceeds maximum allowed size",
      };
    }

    const buffer =
      new Uint8Array(
        await response.arrayBuffer()
      );

    if (
      buffer.byteLength >
      MAX_RESPONSE_BYTES
    ) {
      return {
        url,
        title: "",
        text: "",
        links: [],
        status: "failed",
        error:
          "Response exceeds maximum allowed size",
      };
    }

    const html =
      new TextDecoder(
        "utf-8",
        {
          fatal: false,
        }
      ).decode(
        buffer
      );

    const finalUrl =
      canonicalizeUrl(
        response.url ||
          validated.toString()
      );

    if (
      finalUrl.hostname.toLowerCase() !==
      baseUrl.hostname.toLowerCase()
    ) {
      return {
        url,
        title: "",
        text: "",
        links: [],
        status: "failed",
        error:
          "External redirect is not allowed",
      };
    }

    const title =
      extractTitle(
        html
      );

    const text =
      htmlToText(
        html
      ).slice(
        0,
        MAX_TEXT_LENGTH
      );

    const links =
      extractLinks(
        html,
        finalUrl
      );

    return {
      url:
        finalUrl.toString(),
      title,
      text,
      links,
      status: "ok",
    };
  } catch (error) {
    return {
      url,
      title: "",
      text: "",
      links: [],
      status: "failed",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

/* ============================================================
   RESEARCH PAGE SCORING
   ============================================================ */

function scorePage(
  page: ResearchPage,
  baseUrl: URL
): number {
  let score =
    scoreLink(
      page.url,
      baseUrl
    );

  const combined =
    `${page.title} ${page.text.slice(0, 1500)}`
      .toLowerCase();

  for (
    const term of PRIORITY_TERMS
  ) {
    if (
      combined.includes(term)
    ) {
      score += 3;
    }
  }

  for (
    const term of SECONDARY_TERMS
  ) {
    if (
      combined.includes(term)
    ) {
      score += 1;
    }
  }

  if (
    page.url ===
    canonicalizeUrl(
      baseUrl
    ).toString()
  ) {
    score += 3;
  }

  if (
    page.text.length > 500
  ) {
    score += 2;
  }

  return score;
}

function deduplicateUrls(
  urls: string[]
): string[] {
  const seen =
    new Set<string>();

  const result: string[] =
    [];

  for (
    const value of urls
  ) {
    try {
      const canonical =
        canonicalizeUrl(
          value
        ).toString();

      if (
        seen.has(canonical)
      ) {
        continue;
      }

      seen.add(
        canonical
      );

      result.push(
        canonical
      );
    } catch {
      continue;
    }
  }

  return result;
}

function selectResearchPages(
  pages: ResearchPage[],
  baseUrl: URL
): ResearchPage[] {
  const successful =
    pages.filter(
      (page) =>
        page.status === "ok" &&
        page.text.trim().length > 0
    );

  return [...successful]
    .sort(
      (a, b) =>
        scorePage(
          b,
          baseUrl
        ) -
        scorePage(
          a,
          baseUrl
        )
    )
    .slice(
      0,
      5
    );
}

/* ============================================================
   PUBLIC INTERVIEW DISCUSSION RESEARCH
   ============================================================ */

type DiscussionSearchResult = {
  title: string;
  url: string;
  text: string;
};

function companySearchName(
  companyUrl: string
): string {
  return getCompanyName(
    companyUrl
  );
}

async function fetchRedditDiscussionResults(
  companyName: string
): Promise<DiscussionSearchResult[]> {
  const query =
    encodeURIComponent(
      `"${companyName}" interview OR hiring OR "interview process"`
    );

  const searchUrl =
    `https://www.reddit.com/search.json?q=${query}&sort=relevance&limit=10`;

  try {
    const response =
      await fetchWithRetries(
        searchUrl,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
        }
      );

    if (!response.ok) {
      return [];
    }

    const contentType =
      (
        response.headers.get(
          "content-type"
        ) ?? ""
      ).toLowerCase();

    if (
      !contentType.includes(
        "application/json"
      )
    ) {
      return [];
    }

    const raw =
      await response.text();

    if (
      raw.length >
      MAX_RESPONSE_BYTES
    ) {
      return [];
    }

    let parsed: any;

    try {
      parsed =
        JSON.parse(raw);
    } catch {
      return [];
    }

    const children =
      Array.isArray(
        parsed?.data?.children
      )
        ? parsed.data.children
        : [];

    return children
      .map(
        (
          child: any
        ): DiscussionSearchResult | null => {
          const data =
            child?.data;

          if (!data) {
            return null;
          }

          const title =
            cleanText(
              String(
                data.title ?? ""
              )
            );

          const selftext =
            cleanText(
              String(
                data.selftext ?? ""
              )
            );

          const permalink =
            String(
              data.permalink ?? ""
            );

          if (
            !title ||
            !permalink
          ) {
            return null;
          }

          const url =
            permalink.startsWith(
              "http"
            )
              ? permalink
              : `https://www.reddit.com${permalink}`;

          return {
            title,
            url,
            text:
              `${title}\n\n${selftext}`
                .slice(
                  0,
                  5_000
                ),
          };
        }
      )
      .filter(
        (
          item:
            | DiscussionSearchResult
            | null
        ): item is DiscussionSearchResult =>
          item !== null &&
          item.text.length >= 30
      )
      .slice(
        0,
        MAX_DISCUSSION_RESULTS
      );
  } catch {
    return [];
  }
}

async function fetchHackerNewsDiscussionResults(
  companyName: string
): Promise<DiscussionSearchResult[]> {
  const query =
    encodeURIComponent(
      `"${companyName}" interview`
    );

  const searchUrl =
    `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=8`;

  try {
    const response =
      await fetchWithRetries(
        searchUrl,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
          },
        },
        {
          skipRobots: true,
        }
      );

    if (!response.ok) {
      return [];
    }

    const contentType =
      (
        response.headers.get(
          "content-type"
        ) ?? ""
      ).toLowerCase();

    if (
      !contentType.includes(
        "application/json"
      )
    ) {
      return [];
    }

    const raw =
      await response.text();

    if (
      raw.length >
      MAX_RESPONSE_BYTES
    ) {
      return [];
    }

    let parsed: any;

    try {
      parsed =
        JSON.parse(raw);
    } catch {
      return [];
    }

    const hits =
      Array.isArray(
        parsed?.hits
      )
        ? parsed.hits
        : [];

    return hits
      .map(
        (
          hit: any
        ): DiscussionSearchResult | null => {
          const title =
            cleanText(
              String(
                hit?.title ?? ""
              )
            );

          const url =
            String(
              hit?.url ?? ""
            );

          const text =
            cleanText(
              String(
                hit?.story_text ??
                  title
              )
            );

          if (
            !title ||
            !url
          ) {
            return null;
          }

          return {
            title,
            url,
            text:
              `${title}\n\n${text}`
                .slice(
                  0,
                  5_000
                ),
          };
        }
      )
      .filter(
        (
          item:
            | DiscussionSearchResult
            | null
        ): item is DiscussionSearchResult =>
          item !== null
      )
      .slice(
        0,
        2
      );
  } catch {
    return [];
  }
}

async function researchPublicInterviewDiscussions(
  companyUrl: string
): Promise<ResearchPage[]> {
  const companyName =
    companySearchName(
      companyUrl
    );

  if (!companyName) {
    return [];
  }

  const reddit =
    await fetchRedditDiscussionResults(
      companyName
    );

  const hackerNews =
    await fetchHackerNewsDiscussionResults(
      companyName
    );

  const results:
    ResearchPage[] =
    [];

  for (
    const item of [
      ...reddit,
      ...hackerNews,
    ]
  ) {
    results.push({
      url: item.url,
      title: item.title,
      text: item.text,
      links: [],
      status: "ok",
    });
  }

  return results;
}

/* ============================================================
   COMPANY RESEARCH CONTEXT
   ============================================================ */

function buildCompanyText(
  pages: ResearchPage[],
  discussionPages: ResearchPage[]
): string {
  const blocks: string[] =
    [];

  for (
    const page of pages
  ) {
    blocks.push(
      [
        `Page title: ${
          page.title ||
          "Untitled page"
        }`,
        `Source: ${page.url}`,
        page.text,
      ].join("\n")
    );
  }

  for (
    const page of discussionPages
  ) {
    blocks.push(
      [
        `Public interview discussion: ${
          page.title ||
          "Untitled discussion"
        }`,
        `Source: ${page.url}`,
        page.text,
      ].join("\n")
    );
  }

  return blocks
    .join("\n\n")
    .slice(
      0,
      MAX_COMPANY_TEXT_LENGTH
    );
}

/* ============================================================
   MAIN RESEARCH PIPELINE
   ============================================================ */

/**
 * Crawl and rank company research pages.
 *
 * Pipeline:
 *
 * 1. Validate submitted URL.
 * 2. Check robots.txt.
 * 3. Fetch homepage.
 * 4. Extract same-host links.
 * 5. Dynamically rank links.
 * 6. Crawl high-value pages first.
 * 7. Retry transient failures with exponential backoff.
 * 8. Select strongest company pages.
 * 9. Retrieve public interview discussions.
 * 10. Build clean company research context.
 *
 * Failed sources are preserved in `pages`.
 */
export async function researchCompany(
  companyUrl: string
): Promise<CompanyResearch> {
  const baseUrl =
    validateExternalUrl(
      companyUrl
    );

  await validateResolvedHost(
    baseUrl.hostname
  );

  const initialUrl =
    canonicalizeUrl(
      baseUrl
    ).toString();

  const robotsRules =
    await fetchRobotsRules(
      baseUrl
    );

  const pages:
    ResearchPage[] =
    [];

  const visited =
    new Set<string>();

  const queued =
    new Set<string>([
      initialUrl,
    ]);

  const queue:
    string[] = [
      initialUrl,
    ];

  while (
    queue.length > 0 &&
    pages.length < MAX_PAGES
  ) {
    const currentUrl =
      queue.shift();

    if (!currentUrl) {
      continue;
    }

    queued.delete(
      currentUrl
    );

    if (
      visited.has(
        currentUrl
      )
    ) {
      continue;
    }

    visited.add(
      currentUrl
    );

    let currentParsed:
      URL;

    try {
      currentParsed =
        validateExternalUrl(
          currentUrl
        );

      await validateResolvedHost(
        currentParsed.hostname
      );
    } catch (error) {
      pages.push({
        url:
          currentUrl,
        title: "",
        text: "",
        links: [],
        status:
          "failed",
        error:
          error instanceof Error
            ? error.message
            : String(error),
      });

      continue;
    }

    if (
      currentParsed.hostname.toLowerCase() !==
      baseUrl.hostname.toLowerCase()
    ) {
      continue;
    }

    if (
      isBlockedUrl(
        currentParsed
      )
    ) {
      continue;
    }

    if (
      !isAllowedByRobots(
        currentParsed,
        robotsRules
      )
    ) {
      pages.push({
        url:
          currentUrl,
        title: "",
        text: "",
        links: [],
        status:
          "failed",
        error:
          "Blocked by robots.txt",
      });

      continue;
    }

    const page =
      await fetchPage(
        currentUrl,
        baseUrl
      );

    pages.push(
      page
    );

    if (
      page.status !==
      "ok"
    ) {
      continue;
    }

    const rankedLinks =
      rankLinks(
        page.links,
        baseUrl
      );

    for (
      const link of rankedLinks
    ) {
      if (
        visited.has(link) ||
        queued.has(link)
      ) {
        continue;
      }

      let linkUrl:
        URL;

      try {
        linkUrl =
          validateExternalUrl(
            link
          );

        await validateResolvedHost(
          linkUrl.hostname
        );
      } catch {
        continue;
      }

      if (
        linkUrl.hostname.toLowerCase() !==
        baseUrl.hostname.toLowerCase()
      ) {
        continue;
      }

      if (
        isBlockedUrl(
          linkUrl
        )
      ) {
        continue;
      }

      if (
        !isAllowedByRobots(
          linkUrl,
          robotsRules
        )
      ) {
        continue;
      }

      queued.add(
        link
      );

      queue.push(
        link
      );
    }

    queue.sort(
      (a, b) =>
        scoreLink(
          b,
          baseUrl
        ) -
        scoreLink(
          a,
          baseUrl
        )
    );
  }

  const researchPages =
    selectResearchPages(
      pages,
      baseUrl
    );

  /*
   * Public interview discussions are a separate,
   * best-effort research source.
   *
   * Failure of these sources does not invalidate
   * the company website research.
   */
  let discussionPages:
    ResearchPage[] =
    [];

  try {
    discussionPages =
      await researchPublicInterviewDiscussions(
        companyUrl
      );
  } catch {
    discussionPages =
      [];
  }

  const selectedPages =
    [
      ...researchPages,
      ...discussionPages,
    ];

  const pagesUsed =
    deduplicateUrls(
      selectedPages.map(
        (page) =>
          page.url
      )
    );

  const companyText =
    buildCompanyText(
      researchPages,
      discussionPages
    );

  return {
    companyUrl:
      baseUrl.toString(),

    pagesUsed,

    /*
     * Preserve crawl attempts, including failed sources.
     */
    pages,

    companyText,

    sources:
      pagesUsed,
  };
}