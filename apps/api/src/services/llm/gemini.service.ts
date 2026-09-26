import {
  GoogleGenAI,
  Type,
} from "@google/genai";

const apiKey =
  process.env.GEMINI_API_KEY;

const model =
  process.env.GEMINI_MODEL ||
  "gemini-3.1-flash-lite";

if (!apiKey) {
  console.warn(
    "GEMINI_API_KEY is not configured. Gemini generation will use fallback generation."
  );
}

const client = apiKey
  ? new GoogleGenAI({ apiKey })
  : null;

export type LLMQuestion = {
  requirement_ids: string[];

  category:
    | "technical"
    | "behavioural"
    | "system-design"
    | "company-fit";

  prompt: string;

  answer_outline: string;

  difficulty: 1 | 2 | 3;
};

export type LLMFlashcard = {
  front: string;

  back: string;

  requirement_ids: string[];
};

export type LLMGenerationResult = {
  questions: LLMQuestion[];

  flashcards: LLMFlashcard[];
};

/*
 * Gemini response schema.
 *
 * IMPORTANT:
 * difficulty remains an INTEGER, but we intentionally
 * do not send enum: [1, 2, 3] here because Gemini's
 * response-schema validation rejects numeric enum values
 * for this configuration.
 *
 * The generated value is validated and normalized to
 * 1 | 2 | 3 inside normalizeQuestion().
 */
const responseSchema = {
  type: Type.OBJECT,

  properties: {
    questions: {
      type: Type.ARRAY,

      items: {
        type: Type.OBJECT,

        properties: {
          requirement_ids: {
            type: Type.ARRAY,

            items: {
              type: Type.STRING,
            },
          },

          category: {
            type: Type.STRING,

            enum: [
              "technical",
              "behavioural",
              "system-design",
              "company-fit",
            ],
          },

          prompt: {
            type: Type.STRING,
          },

          answer_outline: {
            type: Type.STRING,
          },

          difficulty: {
            type: Type.INTEGER,
          },
        },

        required: [
          "requirement_ids",
          "category",
          "prompt",
          "answer_outline",
          "difficulty",
        ],
      },
    },

    flashcards: {
      type: Type.ARRAY,

      items: {
        type: Type.OBJECT,

        properties: {
          front: {
            type: Type.STRING,
          },

          back: {
            type: Type.STRING,
          },

          requirement_ids: {
            type: Type.ARRAY,

            items: {
              type: Type.STRING,
            },
          },
        },

        required: [
          "front",
          "back",
          "requirement_ids",
        ],
      },
    },
  },

  required: [
    "questions",
    "flashcards",
  ],
};

function sleep(
  ms: number
): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

function cleanJsonText(
  text: string
): string {
  return text
    .trim()
    .replace(
      /^```json\s*/i,
      ""
    )
    .replace(
      /^```\s*/i,
      ""
    )
    .replace(
      /\s*```$/i,
      ""
    )
    .trim();
}

function cleanText(
  value: unknown
): string {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategory(
  value: unknown,
  requirementKind: string
): LLMQuestion["category"] {
  const category =
    cleanText(value)
      .toLowerCase();

  if (
    category ===
      "behavioural" ||
    category ===
      "company-fit" ||
    category ===
      "system-design" ||
    category ===
      "technical"
  ) {
    return category;
  }

  if (
    requirementKind ===
    "behavioural"
  ) {
    return "behavioural";
  }

  if (
    requirementKind ===
    "domain"
  ) {
    return "technical";
  }

  return "technical";
}

function isNonInterviewRequirement(
  requirement: {
    text: string;
    kind: string;
  }
): boolean {
  const text =
    requirement.text
      .toLowerCase();

  const patterns = [
    "availability to commence",
    "available to commence",
    "available to start",
    "start date",
    "work authorization",
    "work permit",
    "visa sponsorship",
    "right to work",
    "relocation",
    "location requirement",
    "must be located",
    "full-time position",
    "part-time position",
  ];

  return patterns.some(
    (pattern) =>
      text.includes(pattern)
  );
}

function questionLooksGeneric(
  question: string,
  requirement: string
): boolean {
  const q =
    question
      .toLowerCase()
      .trim();

  const r =
    requirement
      .toLowerCase()
      .trim();

  if (!q) {
    return true;
  }

  const genericPatterns = [
    "explain your understanding of",
    "what is your understanding of",
    "describe your understanding of",
    "define ",
    "in the context of:",
    "in the context of",
    "how would you apply it in a real project",
  ];

  const containsGeneric =
    genericPatterns.some(
      (pattern) =>
        q.includes(pattern)
    );

  /*
   * A requirement should not simply be
   * copied into the question.
   */
  const normalizedRequirement =
    r.replace(
      /[^a-z0-9\s]/g,
      ""
    );

  const normalizedQuestion =
    q.replace(
      /[^a-z0-9\s]/g,
      ""
    );

  const requirementLength =
    normalizedRequirement.length;

  const requirementAppearsDirectly =
    requirementLength > 50 &&
    normalizedQuestion.includes(
      normalizedRequirement.slice(
        0,
        Math.min(
          100,
          requirementLength
        )
      )
    );

  return (
    containsGeneric ||
    requirementAppearsDirectly
  );
}

function normalizeQuestion(
  question: any,
  requirementsById: Map<
    string,
    {
      id: string;
      text: string;
      kind: string;
      priority: string;
    }
  >
): LLMQuestion | null {
  if (
    !question ||
    !Array.isArray(
      question.requirement_ids
    )
  ) {
    return null;
  }

  const validRequirementIds =
    question.requirement_ids.filter(
      (id: unknown) =>
        typeof id === "string" &&
        requirementsById.has(id)
    );

  if (
    validRequirementIds.length === 0
  ) {
    return null;
  }

  const primaryRequirement =
    requirementsById.get(
      validRequirementIds[0]
    );

  if (!primaryRequirement) {
    return null;
  }

  /*
   * Logistics requirements should never
   * become technical interview questions.
   */
  if (
    isNonInterviewRequirement(
      primaryRequirement
    )
  ) {
    return null;
  }

  const prompt =
    cleanText(question.prompt);

  if (
    prompt.length < 25 ||
    prompt.length > 900
  ) {
    return null;
  }

  if (
    questionLooksGeneric(
      prompt,
      primaryRequirement.text
    )
  ) {
    return null;
  }

  const answerOutline =
    cleanText(
      question.answer_outline
    );

  if (
    answerOutline.length < 20
  ) {
    return null;
  }

  const difficulty =
    Number(
      question.difficulty
    );

  const normalizedDifficulty =
    difficulty === 1 ||
    difficulty === 2 ||
    difficulty === 3
      ? difficulty
      : 2;

  return {
    requirement_ids:
      validRequirementIds,

    category:
      normalizeCategory(
        question.category,
        primaryRequirement.kind
      ),

    prompt,

    answer_outline:
      answerOutline,

    difficulty:
      normalizedDifficulty as
        | 1
        | 2
        | 3,
  };
}

function normalizeFlashcard(
  card: any,
  requirementsById: Map<
    string,
    {
      id: string;
      text: string;
      kind: string;
      priority: string;
    }
  >
): LLMFlashcard | null {
  if (
    !card ||
    !Array.isArray(
      card.requirement_ids
    )
  ) {
    return null;
  }

  const requirementIds =
    card.requirement_ids.filter(
      (id: unknown) =>
        typeof id === "string" &&
        requirementsById.has(id)
    );

  if (
    requirementIds.length === 0
  ) {
    return null;
  }

  const front =
    cleanText(card.front);

  const back =
    cleanText(card.back);

  if (
    front.length < 10 ||
    back.length < 10
  ) {
    return null;
  }

  if (
    front.length > 300 ||
    back.length > 600
  ) {
    return null;
  }

  return {
    front,
    back,
    requirement_ids:
      requirementIds,
  };
}

function normalizeResult(
  parsed: any,
  requirements: Array<{
    id: string;
    text: string;
    kind: string;
    priority: string;
  }>
): LLMGenerationResult {
  const requirementsById =
    new Map(
      requirements.map(
        (requirement) => [
          requirement.id,
          requirement,
        ]
      )
    );

  const questions: LLMQuestion[] =
    Array.isArray(
      parsed?.questions
    )
      ? parsed.questions
          .map((question: any) =>
            normalizeQuestion(
              question,
              requirementsById
            )
          )
          .filter(
            (
              question: LLMQuestion | null
            ): question is LLMQuestion =>
              question !== null
          )
      : [];

  const flashcards:
    LLMFlashcard[] =
    Array.isArray(
      parsed?.flashcards
    )
      ? parsed.flashcards
          .map((card: any) =>
            normalizeFlashcard(
              card,
              requirementsById
            )
          )
          .filter(
            (
              card: LLMFlashcard | null
            ): card is LLMFlashcard =>
              card !== null
          )
      : [];

  return {
    questions,
    flashcards,
  };
}

export async function generateWithGemini(
  input: {
    roleTitle: string;

    seniority: string;

    requirements: Array<{
      id: string;
      text: string;
      kind: string;
      priority: string;
    }>;

    companyBrief: {
      summary: string;
      what_they_do: string;
    };
  }
): Promise<LLMGenerationResult | null> {
  if (!client) {
    return null;
  }

  const interviewRequirements =
    input.requirements.filter(
      (requirement) =>
        !isNonInterviewRequirement(
          requirement
        )
    );

  const requirementsText =
    interviewRequirements
      .map(
        (requirement) =>
          `
REQUIREMENT_ID: ${requirement.id}
REQUIREMENT: ${requirement.text}
TYPE: ${requirement.kind}
PRIORITY: ${requirement.priority}
`
      )
      .join("\n");

  const prompt = `
You are a senior technical interviewer and interview-preparation architect.

Your job is to create a HIGH-QUALITY interview preparation dataset for the role below.

IMPORTANT:
The requirement text is INPUT DATA.
Do NOT simply turn the requirement sentence into a question.

ROLE:
${input.roleTitle}

SENIORITY:
${input.seniority}

COMPANY:
${input.companyBrief.summary}

WHAT THE COMPANY DOES:
${input.companyBrief.what_they_do}

INTERVIEWABLE REQUIREMENTS:

${requirementsText}

QUESTION DESIGN RULES:

1. Create realistic interview questions that an interviewer could actually ask.

2. Every question must test the candidate's ability to APPLY the requirement, not merely repeat or define it.

3. NEVER create questions like:
   - "Explain your understanding of X."
   - "What is your understanding of X?"
   - "Describe your understanding of X."
   - "Explain X in the context of X."
   - "How would you apply X in a real project?"

4. Instead, transform the requirement into a concrete interview scenario.

5. For algorithms/software engineering requirements:
   Ask implementation, debugging, complexity, architecture, or problem-solving questions.

6. For distributed systems/system architecture:
   Ask design questions involving scale, reliability, consistency, latency, storage, APIs, queues, or observability.

7. For machine learning:
   Ask questions involving model selection, feature engineering, evaluation, deployment, monitoring, data leakage, retraining, or production trade-offs.

8. For databases:
   Ask SQL, schema design, indexing, transactions, query optimization, consistency, or scaling questions.

9. For networking:
   Ask practical debugging or architecture questions involving DNS, HTTP, load balancing, TCP/IP, latency, or failure modes.

10. For behavioural requirements:
    Ask STAR-style behavioural questions based on realistic engineering situations.

11. For domain requirements:
    Ask applied domain questions. Do not merely define the domain requirement.

12. For substantial engineering requirements, use system-design questions where appropriate.

13. Company-fit questions must use the supplied company context and must not invent company facts.

14. Difficulty:
    1 = fundamentals
    2 = practical application
    3 = advanced engineering/design

15. Answer outlines must contain concrete points that a strong candidate should cover.

16. Every question must reference one or more exact requirement IDs.

17. Never invent requirement IDs.

18. Do not generate interview questions for hiring logistics such as:
    - availability
    - start date
    - work authorization
    - visa
    - relocation
    - employment eligibility

19. Generate useful flashcards for technical/domain concepts.

20. Flashcards must teach a concept, decision, trade-off, command, technique, or principle. Do not simply copy the requirement text.

21. Avoid duplicate questions.

22. Avoid duplicate flashcards.

23. Do not mention that the question was generated from a requirement.

24. Do not use markdown code fences.

25. Return ONLY valid JSON matching the supplied schema.

QUALITY EXAMPLES:

BAD:
"Explain your understanding of performance analysis."

GOOD:
"An API's p95 latency doubled after a deployment. How would you isolate whether the bottleneck is in application code, the database, network, or infrastructure?"

BAD:
"Explain your understanding of complex systems."

GOOD:
"Design a distributed service that processes millions of events per day. Explain the architecture, data flow, storage strategy, failure handling, and scaling approach."

BAD:
"Explain your understanding of machine learning."

GOOD:
"You are deploying an ML model whose prediction quality has degraded in production. How would you determine whether the problem is data drift, concept drift, feature corruption, or model degradation?"

BAD:
"Explain your understanding of databases."

GOOD:
"A production query has started taking 5 seconds instead of 100 ms. Walk through how you would diagnose and optimize it."

Generate approximately:
- 1 strong question per interviewable requirement
- additional questions only when they materially improve coverage
- 1 useful flashcard per important technical/domain requirement

Do not force every requirement to produce a question if it is clearly a hiring/logistics constraint.
`;

  const maxAttempts = 3;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt += 1
  ) {
    try {
      const response =
        await client.models.generateContent(
          {
            model,

            contents: prompt,

            config: {
              responseMimeType:
                "application/json",

              responseSchema,
            },
          }
        );

      const rawText =
        response.text;

      if (!rawText) {
        throw new Error(
          "Gemini returned an empty response"
        );
      }

      const parsed =
        JSON.parse(
          cleanJsonText(rawText)
        );

      const normalized =
        normalizeResult(
          parsed,
          input.requirements
        );

      if (
        normalized.questions.length ===
          0 &&
        normalized.flashcards.length ===
          0
      ) {
        throw new Error(
          "Gemini returned no usable interview content after validation"
        );
      }

      return normalized;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        `Gemini generation attempt ${attempt}/${maxAttempts} failed:`,
        message
      );

      if (
        attempt < maxAttempts
      ) {
        await sleep(
          1000 * attempt
        );
      }
    }
  }

  return null;
}