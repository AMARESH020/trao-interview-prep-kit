export type ExtractedRequirement = {
  id: string;
  text: string;
  kind: "behavioural" | "domain" | "technical";
  priority: "must" | "nice";
};

export type ExtractedRole = {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: ExtractedRequirement[];
};

/* ============================================================
   KEYWORDS
   ============================================================ */

const TECHNICAL_KEYWORDS = [
  "python",
  "java",
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node.js",
  "express",
  "fastapi",
  "sql",
  "mongodb",
  "postgresql",
  "mysql",
  "redis",
  "aws",
  "azure",
  "gcp",
  "docker",
  "kubernetes",
  "jenkins",
  "kafka",
  "machine learning",
  "deep learning",
  "tensorflow",
  "pytorch",
  "scikit-learn",
  "nlp",
  "natural language processing",
  "computer vision",
  "rest api",
  "restful api",
  "api",
  "microservices",
  "micro-services",
  "git",
  "github",
  "linux",
  "ci/cd",
  "continuous integration",
  "continuous deployment",
  "data structures",
  "algorithms",
  "system design",
  "object oriented programming",
  "oop",
  "database",
  "databases",
  "etl",
  "data pipeline",
  "data pipelines",
  "html",
  "css",
  "angular",
  "vue",
  "spring boot",
  "springboot",
  "spring",
  "graphql",
  "openapi",
  "swagger",
  "terraform",
  "helm",
  "mlflow",
  "pandas",
  "numpy",
];

const BEHAVIOURAL_KEYWORDS = [
  "communication",
  "leadership",
  "teamwork",
  "collaboration",
  "problem solving",
  "problem-solving",
  "adaptability",
  "ownership",
  "mentoring",
  "presentation",
  "interpersonal",
  "stakeholder management",
  "time management",
  "decision making",
  "decision-making",
  "conflict resolution",
  "cross-functional",
];

const DOMAIN_KEYWORDS = [
  "finance",
  "financial services",
  "banking",
  "healthcare",
  "e-commerce",
  "ecommerce",
  "retail",
  "cloud",
  "security",
  "distributed systems",
  "artificial intelligence",
  "information retrieval",
  "data engineering",
  "data science",
  "saas",
  "fintech",
  "insurance",
  "payments",
  "payment systems",
  "payment processing",
  "logistics",
  "marketplace",
];

const NICE_TO_HAVE_PATTERNS = [
  "nice to have",
  "nice-to-have",
  "preferred",
  "bonus",
  "plus",
  "good to have",
  "would be a plus",
  "preferred qualification",
  "preferred qualifications",
  "desirable",
  "ideally",
  "a plus",
];

/* ============================================================
   SECTION PATTERNS
   ============================================================ */

const EXCLUDED_SECTION_PATTERNS = [
  /^about\s+(the\s+)?company$/i,
  /^about\s+us$/i,
  /^who\s+we\s+are$/i,
  /^company\s+overview$/i,
  /^benefits?$/i,
  /^perks?$/i,
  /^salary$/i,
  /^compensation$/i,
  /^location$/i,
  /^equal\s+opportunity/i,
  /^privacy/i,
  /^how\s+to\s+apply$/i,
  /^apply(\s+now)?$/i,
];

const REQUIREMENT_SECTION_PATTERNS = [
  /^requirements?$/i,
  /^qualifications?$/i,
  /^skills?$/i,
  /^technical\s+skills?$/i,
  /^technical\s+qualifications?$/i,
  /^preferred\s+qualifications?$/i,
  /^preferred\s+skills?$/i,
  /^what\s+(we're|we\s+are)\s+looking\s+for$/i,
  /^who\s+you\s+are$/i,
  /^what\s+you'll\s+need$/i,
  /^what\s+you\s+will\s+need$/i,
  /^minimum\s+qualifications?$/i,
  /^basic\s+qualifications?$/i,
];

const RESPONSIBILITY_SECTION_PATTERNS = [
  /^responsibilit(y|ies)$/i,
  /^what\s+you'll\s+do$/i,
  /^what\s+you\s+will\s+do$/i,
  /^key\s+responsibilities$/i,
  /^your\s+responsibilities$/i,
  /^role\s+responsibilities$/i,
  /^duties$/i,
  /^what\s+you'll\s+be\s+doing$/i,
  /^what\s+you\s+will\s+be\s+doing$/i,
];

/* ============================================================
   ROLE / SENIORITY
   ============================================================ */

const ROLE_PATTERNS = [
  /\bsoftware engineer\b/i,
  /\bsoftware developer\b/i,
  /\bfull[- ]stack developer\b/i,
  /\bfull[- ]stack engineer\b/i,
  /\bfrontend developer\b/i,
  /\bfront[- ]end developer\b/i,
  /\bbackend developer\b/i,
  /\bback[- ]end developer\b/i,
  /\bbackend engineer\b/i,
  /\bfront[- ]end engineer\b/i,
  /\bmachine learning engineer\b/i,
  /\bml engineer\b/i,
  /\bai engineer\b/i,
  /\bai\/ml engineer\b/i,
  /\bdata scientist\b/i,
  /\bdata engineer\b/i,
  /\bdevops engineer\b/i,
  /\bcloud engineer\b/i,
  /\bsite reliability engineer\b/i,
  /\bsre\b/i,
  /\bproduct engineer\b/i,
  /\bmobile developer\b/i,
  /\bmobile engineer\b/i,
  /\bqa engineer\b/i,
  /\btest engineer\b/i,
  /\bsecurity engineer\b/i,
  /\bsystem engineer\b/i,
  /\bsoftware development engineer\b/i,
  /\bsde[- ]?[123]\b/i,
];

const SENIORITY_PATTERNS: Array<[string, RegExp]> = [
  ["intern", /\bintern(?:ship)?\b/i],
  ["entry-level", /\bentry[- ]level\b/i],
  ["junior", /\bjunior\b/i],
  ["associate", /\bassociate\b/i],
  ["graduate", /\bgraduate\b/i],
  ["fresher", /\bfresher\b/i],
  ["mid-level", /\bmid[- ]level\b/i],
  ["senior", /\bsenior\b/i],
  ["staff", /\bstaff\b/i],
  ["principal", /\bprincipal\b/i],
  ["lead", /\blead\b/i],
  ["manager", /\bmanager\b/i],
];

/* ============================================================
   TECHNOLOGY GROUPS
   ============================================================ */

const TECHNOLOGY_GROUPS = [
  ["python"],
  ["java"],
  ["javascript", "typescript"],
  ["react", "next.js"],
  ["node.js", "express"],
  ["fastapi"],
  ["sql", "mysql", "postgresql", "mongodb"],
  ["aws", "azure", "gcp"],
  ["docker", "kubernetes"],
  ["jenkins", "ci/cd"],
  ["kafka"],
  ["machine learning", "deep learning", "tensorflow", "pytorch"],
  ["nlp", "natural language processing"],
  ["computer vision"],
  ["rest api", "restful api", "api"],
  ["microservices", "micro-services"],
  ["git", "github"],
  ["linux"],
  ["data structures", "algorithms"],
  ["system design"],
  ["openapi", "swagger"],
  ["terraform", "helm"],
  ["pandas", "numpy"],
  ["etl"],
  ["data pipeline", "data pipelines"],
];

/* ============================================================
   BASIC NORMALIZATION
   ============================================================ */

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanLine(line: string): string {
  return line
    .replace(/^\s*[-*•▪◦]\s*/, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/^\s*[#>*]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ============================================================
   HEADING HELPERS
   ============================================================ */

function normalizeHeading(line: string): string {
  return line
    .trim()
    .replace(/[:\-–—]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isRequirementHeading(line: string): boolean {
  const heading = normalizeHeading(line);

  return REQUIREMENT_SECTION_PATTERNS.some((pattern) =>
    pattern.test(heading)
  );
}

function isResponsibilityHeading(line: string): boolean {
  const heading = normalizeHeading(line);

  return RESPONSIBILITY_SECTION_PATTERNS.some((pattern) =>
    pattern.test(heading)
  );
}

function isExcludedHeading(line: string): boolean {
  const heading = normalizeHeading(line);

  return EXCLUDED_SECTION_PATTERNS.some((pattern) =>
    pattern.test(heading)
  );
}

function isLikelyHeading(
  line: string,
  rawLine: string
): boolean {
  const value = normalizeHeading(line);

  if (!value) {
    return false;
  }

  if (
    value.length < 3 ||
    value.length > 80 ||
    value.split(/\s+/).length > 8
  ) {
    return false;
  }

  if (
    isRequirementHeading(value) ||
    isResponsibilityHeading(value) ||
    isExcludedHeading(value)
  ) {
    return false;
  }

  if (
    /^\s*[-*•▪◦]\s+/.test(rawLine) ||
    /^\s*\d+[.)]\s+/.test(rawLine)
  ) {
    return false;
  }

  if (/[.!?,;:]$/.test(value)) {
    return false;
  }

  return /^[a-z0-9/&() ._-]+$/i.test(value);
}

/* ============================================================
   TEXT HELPERS
   ============================================================ */

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanRequirementText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[,;:.\-–—]+/, "")
    .replace(/[,;:.\-–—]+$/, "")
    .trim();
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ============================================================
   CLASSIFICATION
   ============================================================ */

function hasTechnology(text: string): boolean {
  const lower = text.toLowerCase();

  return TECHNICAL_KEYWORDS.some((keyword) =>
    lower.includes(keyword.toLowerCase())
  );
}

function classifyRequirement(
  text: string
): "behavioural" | "domain" | "technical" {
  const lower = text.toLowerCase();

  if (
    BEHAVIOURAL_KEYWORDS.some((keyword) =>
      lower.includes(keyword.toLowerCase())
    )
  ) {
    return "behavioural";
  }

  if (
    TECHNICAL_KEYWORDS.some((keyword) =>
      lower.includes(keyword.toLowerCase())
    )
  ) {
    return "technical";
  }

  if (
    DOMAIN_KEYWORDS.some((keyword) =>
      lower.includes(keyword.toLowerCase())
    )
  ) {
    return "domain";
  }

  return "domain";
}

function isNiceToHave(text: string): boolean {
  const lower = text
    .toLowerCase()
    .replace(/[.!?,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    /\bnice to have\b/.test(lower) ||
    /\bnice-to-have\b/.test(lower) ||
    /\bpreferred\b/.test(lower) ||
    /\bbonus\b/.test(lower) ||
    /\bplus\b/.test(lower) ||
    /\bgood to have\b/.test(lower) ||
    /\bwould be a plus\b/.test(lower) ||
    /\bpreferred qualification(?:s)?\b/.test(lower) ||
    /\bdesirable\b/.test(lower) ||
    /\bideally\b/.test(lower) ||
    /\ba plus\b/.test(lower)
  );
}

/* ============================================================
   INLINE SECTION HELPERS
   ============================================================ */

function extractInlineRequirementText(
  line: string
): string | null {
  const match = line.match(
    /\b(?:requirements?|qualifications?|skills?)\s*:\s*(.+?)(?=\s+\b(?:responsibilit(?:y|ies)|what\s+you(?:'ll|\s+will)\s+do|duties)\s*:|\s*$)/i
  );

  return match?.[1]
    ? cleanRequirementText(match[1])
    : null;
}

function extractInlineResponsibilityText(
  line: string
): string | null {
  const match = line.match(
    /\b(?:responsibilit(?:y|ies)|what\s+you(?:'ll|\s+will)\s+do|duties)\s*:\s*(.+)$/i
  );

  return match?.[1]
    ? cleanRequirementText(match[1])
    : null;
}

/* ============================================================
   ROLE EXTRACTION
   ============================================================ */

function extractRoleTitle(jd: string): string {
  const lines = jd
    .split("\n")
    .map(cleanLine)
    .filter(Boolean);

  for (const line of lines) {
    const explicit = line.match(
      /^(?:job title|role|position|title)\s*[:\-]\s*(.+)$/i
    );

    if (explicit) {
      let candidate = explicit[1].trim();

      candidate = candidate
        .split(
          /\b(?:requirements?|qualifications?|skills?|responsibilit(?:y|ies)|what\s+you(?:'ll|\s+will)\s+do|duties)\s*:/i
        )[0]
        .replace(/[.!?]+$/, "")
        .trim();

      if (
        candidate.length >= 3 &&
        candidate.length <= 100
      ) {
        return candidate;
      }
    }
  }

  for (const line of lines.slice(0, 25)) {
    for (const pattern of ROLE_PATTERNS) {
      const match = line.match(pattern);

      if (!match) {
        continue;
      }

      const candidate = match[0].trim();

      if (candidate.length >= 3) {
        return candidate;
      }
    }
  }

  for (const line of lines.slice(0, 10)) {
    if (isLikelyHeading(line, line)) {
      return line;
    }
  }

  return "Software Engineer";
}

/* ============================================================
   SENIORITY EXTRACTION
   ============================================================ */

function extractSeniority(
  title: string,
  jd: string
): string {
  const titleLower = title.toLowerCase();
  const jdLower = jd.toLowerCase();

  for (const [label, pattern] of SENIORITY_PATTERNS) {
    if (pattern.test(titleLower)) {
      return label;
    }
  }

  if (
    /\bsde[- ]?1\b|\bsoftware engineer i\b/i.test(
      titleLower
    )
  ) {
    return "entry-level";
  }

  if (
    /\bsde[- ]?2\b|\bsoftware engineer ii\b/i.test(
      titleLower
    )
  ) {
    return "mid-level";
  }

  if (
    /\bsde[- ]?3\b|\bsoftware engineer iii\b/i.test(
      titleLower
    )
  ) {
    return "senior";
  }

  if (
    /\b0\s*(?:-|–|to)\s*2\s*years?\b/i.test(jdLower) ||
    /\b1\s*(?:-|–|to)\s*2\s*years?\b/i.test(jdLower) ||
    /\bentry[- ]level\b/i.test(jdLower) ||
    /\bnew graduate\b/i.test(jdLower) ||
    /\brecent graduate\b/i.test(jdLower) ||
    /\bfresher\b/i.test(jdLower)
  ) {
    return "entry-level";
  }

  if (
    /\b2\s*(?:-|–|to)\s*5\s*years?\b/i.test(jdLower)
  ) {
    return "mid-level";
  }

  return "mid-level";
}

/* ============================================================
   SECTION EXTRACTION
   ============================================================ */

function extractSections(jd: string): {
  requirements: string[];
  responsibilities: string[];
  nonExcludedLines: string[];
} {
  const rawLines = jd.split("\n");

  const requirements: string[] = [];
  const responsibilities: string[] = [];
  const nonExcludedLines: string[] = [];

  let section:
    | "requirements"
    | "responsibilities"
    | "ignored"
    | "unknown" = "unknown";

  for (const rawLine of rawLines) {
    const line = cleanLine(rawLine);

    if (!line) {
      continue;
    }

    /*
     * Handle inline sections such as:
     *
     * Software Engineer. Requirements: Python, SQL.
     * Responsibilities: Build backend services.
     */
    const inlineRequirements =
      extractInlineRequirementText(line);

    const inlineResponsibilities =
      extractInlineResponsibilityText(line);

    if (
      inlineRequirements ||
      inlineResponsibilities
    ) {
      if (inlineRequirements) {
        requirements.push(
          inlineRequirements
        );
      }

      if (inlineResponsibilities) {
        responsibilities.push(
          inlineResponsibilities
        );
      }

      continue;
    }

    if (isRequirementHeading(line)) {
      section = "requirements";
      continue;
    }

    if (isResponsibilityHeading(line)) {
      section = "responsibilities";
      continue;
    }

    if (isExcludedHeading(line)) {
      section = "ignored";
      continue;
    }

    if (
      section !== "requirements" &&
      section !== "responsibilities" &&
      section !== "ignored" &&
      isLikelyHeading(line, rawLine)
    ) {
      section = "unknown";
      continue;
    }

    if (section === "ignored") {
      continue;
    }

    nonExcludedLines.push(line);

    if (section === "requirements") {
      if (
        line.length >= 2 &&
        line.length <= 500
      ) {
        requirements.push(line);
      }

      continue;
    }

    if (section === "responsibilities") {
      if (
        line.length >= 10 &&
        line.length <= 500
      ) {
        responsibilities.push(line);
      }

      continue;
    }
  }

  return {
    requirements: requirements.slice(0, 50),
    responsibilities:
      responsibilities.slice(0, 30),
    nonExcludedLines,
  };
}

/* ============================================================
   FALLBACK EXTRACTION
   ============================================================ */

function extractFallbackRequirementLines(
  lines: string[]
): string[] {
  return lines.filter((line) => {
    if (
      line.length < 2 ||
      line.length > 500
    ) {
      return false;
    }

    const lower = line.toLowerCase();

    return (
      hasTechnology(line) ||
      BEHAVIOURAL_KEYWORDS.some(
        (keyword) =>
          lower.includes(
            keyword.toLowerCase()
          )
      ) ||
      DOMAIN_KEYWORDS.some(
        (keyword) =>
          lower.includes(
            keyword.toLowerCase()
          )
      ) ||
      isNiceToHave(line)
    );
  });
}

function extractResponsibilitiesFromFallback(
  lines: string[]
): string[] {
  const responsibilityVerbs =
    /^(responsible|develop|design|build|create|work|lead|collaborate|implement|maintain|manage|drive|deliver|support|own|contribute|participate|write|test|deploy|monitor|improve|analyze)/i;

  return lines
    .filter(
      (line) =>
        line.length >= 15 &&
        line.length <= 500 &&
        responsibilityVerbs.test(line)
    )
    .slice(0, 12);
}

/* ============================================================
   COMPOUND REQUIREMENT HANDLING
   ============================================================ */

function splitCompoundRequirement(
  text: string
): string[] {
  const cleaned =
    cleanRequirementText(text);

  if (!cleaned) {
    return [];
  }

  /*
   * Remove an inline Requirements/Qualifications/Skills
   * label if this function receives a raw mixed line.
   */
  const inlineRequirements =
    extractInlineRequirementText(cleaned);

  const source =
    inlineRequirements ??
    cleaned;

  /*
   * IMPORTANT:
   *
   * Handle an inline nice-to-have section before
   * calculating priority for the whole requirement.
   *
   * Example:
   *
   * Python, SQL, ETL, data pipelines.
   * Nice to have: cloud platforms.
   *
   * becomes:
   *
   * Python
   * SQL
   * ETL
   * data pipelines
   * cloud platforms Nice to have
   */
  const inlineNiceMatch =
    source.match(
      /^(.*?)(?:\.\s+|\s+)(?:nice[- ]to[- ]have|preferred(?:\s+qualifications?)?|desirable)\s*:\s*(.+)$/i
    );

  if (inlineNiceMatch) {
    const mandatoryText =
      cleanRequirementText(
        inlineNiceMatch[1]
      );

    const niceText =
      cleanRequirementText(
        inlineNiceMatch[2]
      );

    const mandatoryParts =
      mandatoryText
        .split(
          /,(?=\s*[A-Za-z0-9])/
        )
        .map((part) =>
          cleanRequirementText(
            part.replace(
              /^and\s+/i,
              ""
            )
          )
        )
        .filter(Boolean);

    const niceParts =
      niceText
        .split(
          /,(?=\s*[A-Za-z0-9])/
        )
        .map((part) =>
          cleanRequirementText(part)
        )
        .filter(Boolean)
        .map(
          (part) =>
            `${part} Nice to have`
        );

    return [
      ...mandatoryParts,
      ...niceParts,
    ];
  }

  /*
   * Split comma-separated requirements before applying
   * a global nice-to-have classification.
   *
   * Example:
   *
   * Python, SQL, Docker, AWS experience is preferred
   *
   * becomes:
   *
   * Python
   * SQL
   * Docker
   * AWS experience is preferred
   */
  const commaParts =
    source
      .split(
        /,(?=\s*[A-Za-z0-9])/
      )
      .map((part) =>
        cleanRequirementText(
          part.replace(
            /^and\s+/i,
            ""
          )
        )
      )
      .filter(Boolean);

  if (
    commaParts.length >= 2 &&
    commaParts.some(
      (part) =>
        isNiceToHave(part)
    )
  ) {
    return commaParts;
  }

  /*
   * Remember priority only for a genuine
   * single requirement.
   */
  const originalIsNice =
    isNiceToHave(source);

  /*
   * Handle sentences such as:
   *
   * "Experience with Kubernetes. Nice to have."
   */
  const sentences =
    splitSentences(source);

  if (
    sentences.length > 1
  ) {
    const meaningfulSentences =
      sentences.filter(
        (sentence) => {
          const normalized =
            normalizeForComparison(
              sentence
            );

          return (
            normalized !==
              "nice to have" &&
            normalized !==
              "nice to have." &&
            normalized !==
              "preferred" &&
            normalized !==
              "a plus" &&
            normalized !==
              "plus"
          );
        }
      );

    if (
      meaningfulSentences.length >
      1
    ) {
      return meaningfulSentences.map(
        (sentence) =>
          cleanRequirementText(
            sentence
          )
      );
    }

    if (
      meaningfulSentences.length ===
      1
    ) {
      const onlySentence =
        cleanRequirementText(
          meaningfulSentences[0]
        );

      if (
        originalIsNice &&
        !isNiceToHave(
          onlySentence
        )
      ) {
        return [
          `${onlySentence} Nice to have`,
        ];
      }

      return [
        onlySentence,
      ];
    }
  }

  /*
   * Detect multiple technologies in one requirement.
   */
  const lower =
    source.toLowerCase();

  const technologyMatches: string[] =
    [];

  for (
    const group of
      TECHNOLOGY_GROUPS
  ) {
    for (
      const technology of
        group
    ) {
      if (
        lower.includes(
          technology
        )
      ) {
        technologyMatches.push(
          technology
        );

        break;
      }
    }
  }

  /*
   * A normal requirement with one or two
   * technologies should remain intact.
   */
  if (
    technologyMatches.length < 3
  ) {
    return [source];
  }

  const prefixMatch =
    source.match(
      /^(.*?\b(?:experience|proficiency|knowledge|expertise|familiarity|understanding|skills?|working)\b(?:\s+with)?\s*)/i
    );

  const prefix =
    prefixMatch
      ? prefixMatch[1]
          .trim()
          .replace(
            /[,;:]$/,
            ""
          )
      : "Experience with";

  const optionalSuffix =
    originalIsNice
      ? " Nice to have"
      : "";

  const results: string[] =
    [];

  for (
    const technology of
      technologyMatches
  ) {
    let display =
      technology;

    if (
      technology ===
      "next.js"
    ) {
      display = "Next.js";
    } else if (
      technology ===
      "node.js"
    ) {
      display = "Node.js";
    } else if (
      technology ===
      "rest api"
    ) {
      display = "REST APIs";
    } else if (
      technology ===
      "machine learning"
    ) {
      display =
        "Machine Learning";
    } else if (
      technology ===
      "ci/cd"
    ) {
      display = "CI/CD";
    } else if (
      technology ===
      "etl"
    ) {
      display = "ETL";
    } else if (
      technology ===
      "data pipeline"
    ) {
      display = "Data pipeline";
    } else if (
      technology ===
      "data pipelines"
    ) {
      display = "Data pipelines";
    } else {
      display =
        technology
          .charAt(0)
          .toUpperCase() +
        technology.slice(1);
    }

    results.push(
      `${prefix} ${display}${optionalSuffix}`
    );
  }

  return results;
}

/* ============================================================
   REQUIREMENT CANDIDATE BUILDING
   ============================================================ */

function buildRequirementCandidates(
  rawLines: string[]
): string[] {
  const candidates: string[] =
    [];

  for (
    const rawLine of
      rawLines
  ) {
    const cleaned =
      cleanRequirementText(
        rawLine
      );

    if (!cleaned) {
      continue;
    }

    if (
      cleaned.length < 2 ||
      cleaned.length > 500
    ) {
      continue;
    }

    const pieces =
      splitCompoundRequirement(
        cleaned
      );

    for (
      const piece of
        pieces
    ) {
      const value =
        cleanRequirementText(
          piece
        );

      if (
        value.length >= 2 &&
        value.length <= 300
      ) {
        candidates.push(
          value
        );
      }
    }
  }

  return candidates;
}

/* ============================================================
   DEDUPLICATION
   ============================================================ */

function deduplicateRequirements(
  candidates: string[]
): string[] {
  const result: string[] =
    [];

  for (
    const candidate of
      candidates
  ) {
    const normalizedCandidate =
      normalizeForComparison(
        candidate
      );

    if (!normalizedCandidate) {
      continue;
    }

    const exactIndex =
      result.findIndex(
        (existing) =>
          normalizeForComparison(
            existing
          ) ===
          normalizedCandidate
      );

    if (exactIndex >= 0) {
      const existing =
        result[exactIndex];

      if (
        !isNiceToHave(
          existing
        ) &&
        isNiceToHave(
          candidate
        )
      ) {
        result[exactIndex] =
          candidate;
      }

      continue;
    }

    const similarIndex =
      result.findIndex(
        (existing) => {
          const normalizedExisting =
            normalizeForComparison(
              existing
            );

          return (
            normalizedExisting.includes(
              normalizedCandidate
            ) ||
            normalizedCandidate.includes(
              normalizedExisting
            )
          );
        }
      );

    if (
      similarIndex >= 0
    ) {
      const existing =
        result[similarIndex];

      const existingIsNice =
        isNiceToHave(
          existing
        );

      const candidateIsNice =
        isNiceToHave(
          candidate
        );

      if (
        !existingIsNice &&
        candidateIsNice
      ) {
        result[
          similarIndex
        ] = candidate;

        continue;
      }

      if (
        existingIsNice &&
        !candidateIsNice
      ) {
        continue;
      }

      if (
        candidate.length <
        existing.length
      ) {
        result[
          similarIndex
        ] = candidate;
      }

      continue;
    }

    result.push(
      candidate
    );
  }

  return result;
}

/* ============================================================
   RESPONSIBILITY -> REQUIREMENT INFERENCE
   ============================================================ */

function inferRequirementsFromResponsibilities(
  responsibilities: string[]
): string[] {
  const inferred: string[] =
    [];

  for (
    const responsibility of
      responsibilities
  ) {
    const lower =
      responsibility.toLowerCase();

    if (
      hasTechnology(
        responsibility
      )
    ) {
      inferred.push(
        responsibility
      );

      continue;
    }

    if (
      lower.includes(
        "communicat"
      ) ||
      lower.includes(
        "collaborat"
      ) ||
      lower.includes(
        "stakeholder"
      ) ||
      lower.includes(
        "team"
      )
    ) {
      inferred.push(
        responsibility
      );
    }
  }

  return inferred;
}

/* ============================================================
   REQUIREMENT EXTRACTION PIPELINE
   ============================================================ */

function extractRequirementCandidates(
  jd: string
): string[] {
  const sections =
    extractSections(jd);

  let candidates =
    sections.requirements;

  if (
    candidates.length === 0
  ) {
    candidates =
      extractFallbackRequirementLines(
        sections.nonExcludedLines
      );
  }

  if (
    candidates.length === 0
  ) {
    candidates =
      inferRequirementsFromResponsibilities(
        sections.responsibilities
      );
  }

  return deduplicateRequirements(
    buildRequirementCandidates(
      candidates
    )
  );
}

/* ============================================================
   RESPONSIBILITY EXTRACTION
   ============================================================ */

function extractResponsibilities(
  jd: string
): string[] {
  const sections =
    extractSections(jd);

  if (
    sections.responsibilities
      .length > 0
  ) {
    return deduplicateRequirements(
      sections.responsibilities
        .map(
          cleanRequirementText
        )
        .filter(
          (line) =>
            line.length >= 15
        )
    ).slice(0, 12);
  }

  return deduplicateRequirements(
    extractResponsibilitiesFromFallback(
      sections.nonExcludedLines
    )
  ).slice(0, 12);
}

/* ============================================================
   PUBLIC API
   ============================================================ */

export function extractRequirements(
  jd: string
): ExtractedRole {
  const normalized =
    normalizeText(jd);

  if (
    normalized.length < 20
  ) {
    throw new Error(
      "Job description must contain at least 20 characters"
    );
  }

  const title =
    extractRoleTitle(
      normalized
    );

  const seniority =
    extractSeniority(
      title,
      normalized
    );

  let candidates =
    extractRequirementCandidates(
      normalized
    );

  if (
    candidates.length === 0
  ) {
    candidates = [
      `Demonstrate the skills and experience required for the ${title} role.`,
    ];
  }

  const requirements:
    ExtractedRequirement[] =
    candidates
      .slice(0, 30)
      .map(
        (text, index) => ({
          id: `req-${index + 1}`,
          text,
          kind:
            classifyRequirement(
              text
            ),
          priority:
            isNiceToHave(
              text
            )
              ? "nice"
              : "must",
        })
      );

  return {
    title,
    seniority,
    responsibilities:
      extractResponsibilities(
        normalized
      ),
    requirements,
  };
}