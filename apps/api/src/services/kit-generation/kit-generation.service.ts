import { CreateKitSchema } from "../../validators/kit.validator.js";

import {
  extractRequirements,
  type ExtractedRole,
} from "../extraction/jd-extractor.service.js";

import { researchCompany } from "../research/research.service.js";

import {
  generateInterviewContentAsync,
  ensureRequirementCoverageAsync,
  findUncoveredRequirements,
  type GeneratedContent,
} from "../generation/generation.service.js";

import {
  buildSchedule,
  type GeneratedSchedule,
} from "../scheduling/scheduling.service.js";

export type GenerateKitInput = {
  jd: string;
  company: string;
  role: string;
  companyUrl: string;
  daysAvailable: number;
  location?: string;
};

type InterviewKit = {
  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };

  company_brief: {
    summary: string;
    what_they_do: string;
    sources: string[];
  };

  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: ExtractedRole["requirements"];
  };

  questions: GeneratedContent["questions"];

  flashcards: GeneratedContent["flashcards"];

  schedule: GeneratedSchedule;

  coverage: {
    uncovered_requirement_ids: string[];
    passes: number;
  };
};

function getCompanyName(companyUrl: string): string {
  try {
    const hostname = new URL(companyUrl)
      .hostname
      .replace(/^www\./, "");

    const firstPart = hostname.split(".")[0];

    if (!firstPart) {
      return "Unknown Company";
    }

    return (
      firstPart.charAt(0).toUpperCase() +
      firstPart.slice(1)
    );
  } catch {
    return "Unknown Company";
  }
}

function cleanText(text: string): string {
  return text
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulCompanySentence(sentence: string): boolean {
  const text = cleanText(sentence);

  if (!text) {
    return false;
  }

  if (text.length < 35) {
    return false;
  }

  const lower = text.toLowerCase();

  const noisePatterns = [
    "page title:",
    "link to youtube",
    "visible only when js is disabled",
    "sign in",
    "sign up",
    "log in",
    "cookie",
    "privacy",
    "terms of service",
    "preferences",
    "advanced search",
    "setprefdomain",
    "google search",
    "images",
    "news",
    "shopping",
    "maps",
  ];

  if (
    noisePatterns.some((pattern) =>
      lower.includes(pattern)
    )
  ) {
    return false;
  }

  return true;
}

export function createCompanyBrief(
  companyName: string,
  research: Awaited<
    ReturnType<typeof researchCompany>
  >
) {
  const companyText = cleanText(
    research.companyText
  );

  if (!companyText) {
    return {
      summary: `Limited public research was available for ${companyName}.`,

      what_they_do:
        "The provided company website did not provide enough accessible information to reliably determine the company's activities.",

      sources: research.sources,
    };
  }

  const sentences = companyText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => cleanText(sentence))
    .filter(isUsefulCompanySentence);

  const fallbackSummary =
    `Public company information was retrieved from ${companyName}'s website.`;

  const fallbackWhatTheyDo =
    `The provided website contains public information about ${companyName}.`;

  const summary =
    sentences
      .slice(0, 3)
      .join(" ")
      .slice(0, 700) ||
    fallbackSummary;

  const whatTheyDo =
    sentences
      .slice(0, 2)
      .join(" ")
      .slice(0, 500) ||
    fallbackWhatTheyDo;

  return {
    summary,
    what_they_do: whatTheyDo,
    sources: research.sources,
  };
}

function validateInput(
  input: GenerateKitInput
): void {
  if (
    !input.jd ||
    input.jd.trim().length < 20
  ) {
    throw new Error(
      "Job description must contain at least 20 characters."
    );
  }

  if (
    !input.company ||
    !input.company.trim()
  ) {
    throw new Error("Company name is required.");
  }

  if (
    !input.role ||
    !input.role.trim()
  ) {
    throw new Error("Role is required.");
  }

  if (
    !input.companyUrl ||
    !input.companyUrl.trim()
  ) {
    throw new Error("Company URL is required.");
  }

  if (
    !Number.isInteger(input.daysAvailable) ||
    input.daysAvailable < 1 ||
    input.daysAvailable > 60
  ) {
    throw new Error(
      "daysAvailable must be an integer between 1 and 60."
    );
  }

  try {
    const parsedUrl = new URL(
      input.companyUrl
    );

    if (
      !["http:", "https:"].includes(
        parsedUrl.protocol
      )
    ) {
      throw new Error(
        "Unsupported protocol"
      );
    }
  } catch {
    throw new Error(
      "Invalid company URL."
    );
  }
}

function removeNonInterviewRequirements(
  role: ExtractedRole
): ExtractedRole {
  /*
   * Hiring logistics such as start date,
   * work authorization and availability
   * should remain visible in the extracted
   * requirements but should not be treated
   * as technical interview topics.
   *
   * We do not delete them because coverage
   * still needs to represent the original JD.
   */

  return {
    ...role,
    requirements: role.requirements.map(
      (requirement) => ({
        ...requirement,
        text: cleanText(requirement.text),
      })
    ),
  };
}

export async function generateInterviewKit(
  input: GenerateKitInput
): Promise<InterviewKit> {
  validateInput(input);

  const researchedAt =
    new Date().toISOString();

  /*
   * STEP 1
   * Extract structured role information.
   */
  const extractedRole =
    extractRequirements(input.jd);

  /*
   * Keep the user's explicitly entered
   * role as the authoritative role title.
   */
  const role: ExtractedRole =
    removeNonInterviewRequirements({
      ...extractedRole,

      title:
        input.role.trim() ||
        extractedRole.title,
    });

  /*
   * STEP 2
   * Research the company website.
   */
  const research =
    await researchCompany(
      input.companyUrl
    );

  /*
   * STEP 3
   * Generate interview content.
   *
   * The generation layer is responsible
   * for producing questions that map to
   * the extracted requirements.
   */
  let generated =
    await generateInterviewContentAsync(
      role,
      research
    );

  /*
   * STEP 4
   * Check requirement coverage.
   */
  let uncoveredRequirementIds =
    findUncoveredRequirements(
      role.requirements,
      generated.questions
    ).map(
      (requirement) =>
        requirement.id
    );

  let passes = 1;

  /*
   * STEP 5
   * Second-pass repair for uncovered
   * requirements.
   */
  if (
    uncoveredRequirementIds.length > 0
  ) {
    generated =
      await ensureRequirementCoverageAsync(
        role,
        generated,
        research
      );

    passes = 2;

    uncoveredRequirementIds =
      findUncoveredRequirements(
        role.requirements,
        generated.questions
      ).map(
        (requirement) =>
          requirement.id
      );
  }

  /*
   * STEP 6
   * A MUST requirement cannot remain
   * uncovered.
   */
  const mustRequirementIds =
    role.requirements
      .filter(
        (requirement) =>
          requirement.priority ===
          "must"
      )
      .map(
        (requirement) =>
          requirement.id
      );

  const uncoveredMustRequirements =
    uncoveredRequirementIds.filter(
      (id) =>
        mustRequirementIds.includes(id)
    );

  if (
    uncoveredMustRequirements.length > 0
  ) {
    throw new Error(
      `Unable to cover required job requirements: ${uncoveredMustRequirements.join(
        ", "
      )}`
    );
  }

  /*
   * STEP 7
   * Build deterministic preparation
   * schedule.
   */
  const schedule =
    buildSchedule(
      input.daysAvailable,
      generated.questions,
      role.requirements
    );

  /*
   * STEP 8
   * User-entered company name is
   * authoritative.
   */
  const companyName =
    input.company.trim() ||
    getCompanyName(
      input.companyUrl
    );

  const kit: InterviewKit = {
    source: {
      company: companyName,

      company_url:
        input.companyUrl,

      role: role.title,

      location:
        input.location?.trim() ||
        "Not specified",

      jd_chars:
        input.jd.length,

      researched_at:
        researchedAt,

      pages_used:
        research.pagesUsed,
    },

    company_brief:
      createCompanyBrief(
        companyName,
        research
      ),

    role: {
      title: role.title,

      seniority:
        role.seniority,

      responsibilities:
        role.responsibilities,

      requirements:
        role.requirements,
    },

    questions:
      generated.questions,

    flashcards:
      generated.flashcards,

    schedule,

    coverage: {
      uncovered_requirement_ids:
        uncoveredRequirementIds,

      passes,
    },
  };

  /*
   * STEP 9
   * Validate the complete structure
   * before persistence.
   */
  const validation =
    CreateKitSchema.safeParse(
      kit
    );

  if (!validation.success) {
    const issues =
      validation.error.issues
        .map((issue) => {
          const path =
            issue.path.join(".");

          return `${
            path || "kit"
          }: ${issue.message}`;
        })
        .join("; ");

    throw new Error(
      `Generated kit validation failed: ${issues}`
    );
  }

  return validation.data as InterviewKit;
}