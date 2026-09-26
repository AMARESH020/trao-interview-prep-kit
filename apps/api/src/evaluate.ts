import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import {
  generateInterviewKit,
  type GenerateKitInput,
} from "./services/kit-generation/kit-generation.service.js";

type EvaluationCase = {
  id: string;
  jd: string;
  company_url: string;
  days: number;
};

type BatchResult = {
  id: string;
  status: "ok" | "failed";
  kit: unknown | null;
  error: {
    code: string;
    message: string;
  } | null;
};

type BatchOutput = {
  version: "1.0";
  generated_at: string;
  kits: BatchResult[];
};

const CASE_TIMEOUT_MS = 120_000;

function getArg(name: string): string | null {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function deriveCompanyName(companyUrl: string): string {
  try {
    const hostname = new URL(companyUrl).hostname
      .replace(/^www\./, "")
      .split(".")[0];

    if (!hostname) {
      return "Unknown Company";
    }

    return (
      hostname.charAt(0).toUpperCase() +
      hostname.slice(1)
    );
  } catch {
    return "Unknown Company";
  }
}

function deriveRole(jd: string): string {
  const explicitTitle =
    jd.match(
      /(?:job\s*title|role|position)\s*[:\-]\s*([^\n\r]+)/i
    )?.[1]?.trim();

  if (explicitTitle) {
    return explicitTitle;
  }

  const roleFromFirstLine =
    jd.match(
      /^([A-Z][A-Za-z0-9 /&.-]{2,80}(?:Engineer|Developer|Analyst|Scientist|Manager))/m
    )?.[1]?.trim();

  return roleFromFirstLine || "Software Engineer";
}

function normalizeError(error: unknown): {
  code: string;
  message: string;
} {
  const message =
    error instanceof Error
      ? error.message
      : String(error);

  if (
    /private|loopback|localhost|unsupported.*protocol|invalid.*url|url.*invalid/i.test(
      message
    )
  ) {
    return {
      code: "INVALID_COMPANY_URL",
      message,
    };
  }

  if (/timed out|timeout/i.test(message)) {
    return {
      code: "CASE_TIMEOUT",
      message,
    };
  }

  if (/rate limit|429/i.test(message)) {
    return {
      code: "RATE_LIMITED",
      message,
    };
  }

  if (/gemini|llm|model/i.test(message)) {
    return {
      code: "GENERATION_FAILED",
      message,
    };
  }

  if (/research|crawl|fetch|robots/i.test(message)) {
    return {
      code: "RESEARCH_FAILED",
      message,
    };
  }

  return {
    code: "CASE_FAILED",
    message,
  };
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              `Case processing timed out after ${Math.round(
                timeoutMs / 1000
              )} seconds`
            )
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function processCase(
  input: EvaluationCase
): Promise<BatchResult> {
  console.log(
    `[evaluate] Processing ${input.id}...`
  );

  try {
    const company = deriveCompanyName(
      input.company_url
    );

    const role = deriveRole(input.jd);

    const kitInput: GenerateKitInput = {
      jd: input.jd,
      company,
      role,
      companyUrl: input.company_url,
      daysAvailable: input.days,
      location: "Not specified",
    };

    const kit = await withTimeout(
      generateInterviewKit(kitInput),
      CASE_TIMEOUT_MS
    );

    console.log(
      `[evaluate] ${input.id}: OK`
    );

    return {
      id: input.id,
      status: "ok",
      kit,
      error: null,
    };
  } catch (error) {
    const normalized = normalizeError(error);

    console.error(
      `[evaluate] ${input.id}: FAILED - ${normalized.message}`
    );

    return {
      id: input.id,
      status: "failed",
      kit: null,
      error: normalized,
    };
  }
}

async function main(): Promise<void> {
  const inputArg = getArg("--input");
  const outputArg = getArg("--output");

  if (!inputArg || !outputArg) {
    console.error(
      "Usage: npm run evaluate -- --input cases.json --output kits.json"
    );
    process.exit(1);
  }

  const inputPath = path.resolve(
    process.cwd(),
    inputArg
  );

  const outputPath = path.resolve(
    process.cwd(),
    outputArg
  );

  const raw = await fs.readFile(
    inputPath,
    "utf8"
  );

  const cases = JSON.parse(
    raw.replace(/^\uFEFF/, "")
  ) as EvaluationCase[];

  if (!Array.isArray(cases)) {
    throw new Error(
      "Input must be a JSON array"
    );
  }

  console.log(
    `[evaluate] Loaded ${cases.length} case(s).`
  );

  const startedAt = Date.now();
  const results: BatchResult[] = [];

  for (const evaluationCase of cases) {
    const result = await processCase(
      evaluationCase
    );

    results.push(result);
  }

  const output: BatchOutput = {
    version: "1.0",
    generated_at:
      new Date().toISOString(),
    kits: results,
  };

  await fs.writeFile(
    outputPath,
    JSON.stringify(output, null, 2),
    "utf8"
  );

  const successful = results.filter(
    (result) => result.status === "ok"
  ).length;

  const failed = results.filter(
    (result) => result.status === "failed"
  ).length;

  const durationSeconds =
    (Date.now() - startedAt) / 1000;

  console.log("");
  console.log(
    `[evaluate] Completed: ${results.length}`
  );
  console.log(
    `[evaluate] Successful: ${successful}`
  );
  console.log(
    `[evaluate] Failed: ${failed}`
  );
  console.log(
    `[evaluate] Duration: ${durationSeconds.toFixed(
      1
    )} seconds`
  );
  console.log(
    `[evaluate] Output: ${outputPath}`
  );
}

main().catch((error) => {
  console.error(
    "[evaluate] Fatal error:",
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
});