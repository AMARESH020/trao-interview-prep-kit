import type { CompanyResearch } from "../research/research.service.js";
import type {
  ExtractedRequirement,
  ExtractedRole,
} from "../extraction/jd-extractor.service.js";

import {
  generateWithGemini,
  type LLMGenerationResult,
} from "../llm/gemini.service.js";

/* =========================================================
   PUBLIC TYPES
   ========================================================= */

export type QuestionCategory =
  | "technical"
  | "behavioural"
  | "system-design"
  | "company-fit";

export type GeneratedQuestion = {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  edited?: boolean;
  pinned?: boolean;
};

export type GeneratedFlashcard = {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  edited?: boolean;
  pinned?: boolean;
};

export type GeneratedContent = {
  questions: GeneratedQuestion[];
  flashcards: GeneratedFlashcard[];
};

/* =========================================================
   ID HELPERS
   ========================================================= */

function createQuestionId(
  requirementId: string,
  index: number,
): string {
  return `q-${requirementId}-${index}`;
}

function createFlashcardId(
  requirementId: string,
  index: number,
): string {
  return `f-${requirementId}-${index}`;
}

/* =========================================================
   TEXT HELPERS
   ========================================================= */

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function lower(value: string): string {
  return cleanText(value).toLowerCase();
}

/* =========================================================
   REQUIREMENT CLASSIFICATION
   ========================================================= */

function isHiringLogisticsRequirement(
  requirement: ExtractedRequirement,
): boolean {
  const text = lower(requirement.text);

  const logisticsPatterns = [
    "availability to commence",
    "availability to start",
    "available to commence",
    "available to start",
    "availability",
    "start date",
    "joining date",
    "work authorization",
    "work authorisation",
    "work permit",
    "visa sponsorship",
    "visa",
    "right to work",
    "employment eligibility",
    "relocation",
    "relocate",
    "full-time position",
    "part-time position",
  ];

  return logisticsPatterns.some(
    (pattern) => text.includes(pattern),
  );
}

function getTechnicalTopic(
  requirement: ExtractedRequirement,
): string {
  const text = requirement.text;
  const value = lower(text);

  const technicalTopics = [
    "Python",
    "JavaScript",
    "TypeScript",
    "Java",
    "React",
    "Next.js",
    "Node.js",
    "Express",
    "FastAPI",
    "Django",
    "SQL",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Redis",
    "Docker",
    "Kubernetes",
    "AWS",
    "Azure",
    "GCP",
    "Git",
    "Jenkins",
    "Kafka",
    "REST API",
    "REST APIs",
    "Microservices",
    "Micro-services",
    "Machine Learning",
    "Deep Learning",
    "TensorFlow",
    "PyTorch",
    "NLP",
    "Computer Vision",
    "Data Structures",
    "Algorithms",
    "Distributed Systems",
    "Databases",
    "Database",
    "Networking",
    "Performance Analysis",
    "System Design",
    "Architecture",
    "Scalability",
    "Reliability",
    "Security",
    "Observability",
    "Data Mining",
    "Compilers",
  ];

  const match = technicalTopics.find(
    (topic) =>
      value.includes(topic.toLowerCase()),
  );

  if (match) {
    return match;
  }

  const cleaned = text
    .replace(
      /^(experience|expertise|proficiency|knowledge|strong|demonstrated|ability|understanding)\s+(in|with|of|to)\s+/i,
      "",
    )
    .replace(
      /^experience\s+in\s+areas\s+such\s+as\s+/i,
      "",
    )
    .trim();

  if (cleaned.length > 0 && cleaned.length <= 120) {
    return cleaned.replace(/\.$/, "");
  }

  return "software engineering";
}

function getCategory(
  requirement: ExtractedRequirement,
): QuestionCategory {
  const text = lower(requirement.text);

  if (isHiringLogisticsRequirement(requirement)) {
    return "company-fit";
  }

  if (requirement.kind === "behavioural") {
    return "behavioural";
  }

  if (
    text.includes("system design") ||
    text.includes("architecture") ||
    text.includes("scalable") ||
    text.includes("scalability") ||
    text.includes("distributed systems") ||
    text.includes("microservices") ||
    text.includes("micro-services")
  ) {
    return "system-design";
  }

  if (
    text.includes("company culture") ||
    text.includes("company fit") ||
    text.includes("company values") ||
    text.includes("industry") ||
    text.includes("domain knowledge")
  ) {
    return "company-fit";
  }

  return "technical";
}

function getDifficulty(
  requirement: ExtractedRequirement,
): 1 | 2 | 3 {
  const text = lower(requirement.text);

  if (
    text.includes("architecture") ||
    text.includes("system design") ||
    text.includes("distributed") ||
    text.includes("scalable") ||
    text.includes("scalability") ||
    text.includes("performance") ||
    text.includes("machine learning") ||
    text.includes("artificial intelligence")
  ) {
    return 3;
  }

  if (requirement.priority === "must") {
    return 3;
  }

  if (requirement.kind === "behavioural") {
    return 2;
  }

  return 2;
}

/* =========================================================
   QUESTION QUALITY HELPERS
   ========================================================= */

function containsGenericRequirementTemplate(
  prompt: string,
): boolean {
  const value = lower(prompt);

  const forbiddenPatterns = [
    "explain your understanding of",
    "what is your understanding of",
    "describe your understanding of",
    "in the context of:",
    "in the context of",
    "how would you apply it in a real project",
    "define the requirement",
    "explain the requirement",
    "describe a realistic engineering problem where",
    "describe a realistic problem where",
    "what are the key interview considerations for",
    "for the software engineer role, describe",
  ];

  return forbiddenPatterns.some(
    (pattern) => value.includes(pattern),
  );
}

function questionContainsRequirementDump(
  prompt: string,
  requirement: ExtractedRequirement,
): boolean {
  const question = lower(prompt)
    .replace(/[^a-z0-9\s]/g, "");

  const requirementText = lower(
    requirement.text,
  ).replace(/[^a-z0-9\s]/g, "");

  if (requirementText.length < 45) {
    return false;
  }

  const words = requirementText
    .split(/\s+/)
    .filter(Boolean);

  if (words.length < 8) {
    return false;
  }

  const sample = words
    .slice(0, Math.min(12, words.length))
    .join(" ");

  return question.includes(sample);
}

function isUsableQuestion(
  prompt: string,
  requirement: ExtractedRequirement,
): boolean {
  const value = cleanText(prompt);

  if (
    value.length < 25 ||
    value.length > 900
  ) {
    return false;
  }

  if (
    containsGenericRequirementTemplate(value)
  ) {
    return false;
  }

  if (
    questionContainsRequirementDump(
      value,
      requirement,
    )
  ) {
    return false;
  }

  return true;
}

function normalizeForComparison(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isDuplicateQuestion(
  prompt: string,
  existing: GeneratedQuestion[],
): boolean {
  const normalized = normalizeForComparison(prompt);

  return existing.some(
    (question) =>
      normalizeForComparison(question.prompt) === normalized,
  );
}

function isDuplicateFlashcard(
  front: string,
  existing: GeneratedFlashcard[],
): boolean {
  const normalized = normalizeForComparison(front);

  return existing.some(
    (flashcard) =>
      normalizeForComparison(flashcard.front) === normalized,
  );
}

/* =========================================================
   DETERMINISTIC QUESTION GENERATION
   ========================================================= */

function createTechnicalQuestion(
  requirement: ExtractedRequirement,
  role: ExtractedRole,
): {
  prompt: string;
  answerOutline: string;
} {
  const text = lower(requirement.text);
  const topic = getTechnicalTopic(requirement);

  if (
    text.includes("performance") ||
    text.includes("performance analysis")
  ) {
    return {
      prompt:
        "A production service suddenly shows a significant increase in p95 latency. How would you diagnose the bottleneck, isolate the root cause, and verify the fix?",
      answerOutline:
        "Establish a baseline; inspect metrics and traces; compare application, database, network, and infrastructure latency; reproduce where possible; identify the bottleneck; make the smallest safe change; validate with p95/p99 latency and error-rate metrics.",
    };
  }

  if (
    text.includes("database") ||
    text.includes("databases") ||
    text.includes("sql") ||
    text.includes("postgres") ||
    text.includes("mysql") ||
    text.includes("mongodb")
  ) {
    return {
      prompt:
        "A database query used by a production API has increased from milliseconds to several seconds as data volume grows. How would you diagnose and optimize it?",
      answerOutline:
        "Inspect the query plan; identify scans, joins, and missing indexes; measure selectivity; check connection and lock contention; optimize schema/query/indexes; benchmark before and after; monitor production impact.",
    };
  }

  if (
    text.includes("machine learning") ||
    text.includes("artificial intelligence") ||
    text.includes("model")
  ) {
    return {
      prompt:
        "An ML model performs well during validation but its prediction quality drops after deployment. How would you determine whether the cause is data drift, feature issues, model degradation, or a problem in the evaluation pipeline?",
      answerOutline:
        "Compare training and production distributions; validate feature pipelines; check data and concept drift; compare offline and online metrics; inspect segmentation and monitoring; reproduce failures; retrain or correct the pipeline based on evidence.",
    };
  }

  if (
    text.includes("algorithms") ||
    text.includes("algorithm") ||
    text.includes("data structures")
  ) {
    return {
      prompt:
        `For the ${role.title} role, design an efficient solution to a problem involving large input data. Explain your choice of data structures, algorithm, time complexity, space complexity, and how you would test edge cases.`,
      answerOutline:
        "Clarify constraints; identify the appropriate data structure; derive the algorithm; explain time and space complexity; cover edge cases; provide a correctness argument; test with representative and adversarial inputs.",
    };
  }

  if (
    text.includes("network") ||
    text.includes("networking") ||
    text.includes("dns") ||
    text.includes("load balancing")
  ) {
    return {
      prompt:
        "Users report intermittent failures reaching an API. DNS resolution, load balancing, and application health checks are involved. Walk through how you would diagnose the failure from the client to the backend.",
      answerOutline:
        "Check DNS resolution and TTLs; verify connectivity; inspect load-balancer health and routing; examine TLS/HTTP behavior; inspect application logs and metrics; correlate failures by region or instance; reproduce and validate the fix.",
    };
  }

  if (
    text.includes("docker") ||
    text.includes("container")
  ) {
    return {
      prompt:
        "A containerized application works locally but fails after deployment. How would you investigate differences in the image, environment variables, networking, filesystem behavior, and runtime configuration?",
      answerOutline:
        "Inspect image and entrypoint; compare environment/configuration; inspect logs and exit codes; verify ports and networking; check mounted volumes and permissions; reproduce with the same image; add health checks and deployment diagnostics.",
    };
  }

  if (
    text.includes("kubernetes") ||
    text.includes("k8s")
  ) {
    return {
      prompt:
        "A Kubernetes deployment repeatedly restarts after a new release. How would you diagnose the failure and determine whether the issue is the application, configuration, resources, probes, or cluster infrastructure?",
      answerOutline:
        "Inspect pod status and events; read container logs; check readiness/liveness probes; validate ConfigMaps and Secrets; inspect resource limits and OOM events; compare the release; reproduce with the same image; roll back if necessary.",
    };
  }

  if (
    text.includes("python")
  ) {
    return {
      prompt:
        "You are asked to build a Python service that processes a growing workload. How would you structure the code and choose between synchronous processing, concurrency, asynchronous I/O, and background workers?",
      answerOutline:
        "Clarify workload characteristics; separate business logic from I/O; profile bottlenecks; choose concurrency based on CPU vs I/O behavior; handle retries and failures; add tests, logging, metrics, and bounded resource usage.",
    };
  }

  if (
    text.includes("api") ||
    text.includes("rest")
  ) {
    return {
      prompt:
        "Design a REST API for a production feature that will be consumed by multiple clients. How would you handle resource modeling, validation, authentication, errors, versioning, idempotency, and observability?",
      answerOutline:
        "Define resources and HTTP semantics; validate inputs; secure endpoints; design consistent errors; handle idempotency where required; establish versioning strategy; document the API; add logging, metrics, tracing, and tests.",
    };
  }

  if (
    text.includes("microservice")
  ) {
    return {
      prompt:
        "You are decomposing a growing application into microservices. How would you decide service boundaries, communication patterns, data ownership, failure handling, and deployment strategy?",
      answerOutline:
        "Identify bounded contexts; establish ownership boundaries; choose synchronous or asynchronous communication; isolate data ownership; design retries/timeouts; address observability and deployment; avoid unnecessary service fragmentation.",
    };
  }

  if (
    text.includes("distributed")
  ) {
    return {
      prompt:
        "Design a distributed service that must continue operating when individual instances or network connections fail. How would you handle consistency, retries, idempotency, replication, and observability?",
      answerOutline:
        "Define consistency requirements; design replication and failure detection; use bounded retries and timeouts; make operations idempotent; handle partial failure; add metrics, logs, tracing, and recovery procedures.",
    };
  }

  return {
    prompt:
      `How would you use ${topic} to solve a production engineering problem? Explain the design or implementation approach, important trade-offs, testing strategy, and operational considerations.`,
    answerOutline:
      `Explain the core concepts of ${topic}; clarify the problem and constraints; describe a practical implementation; compare alternatives; cover failure modes and trade-offs; and explain how you would test and operate the solution.`,
  };
}

function createSystemDesignQuestion(
  requirement: ExtractedRequirement,
  role: ExtractedRole,
): {
  prompt: string;
  answerOutline: string;
} {
  const text = lower(requirement.text);

  if (
    text.includes("distributed")
  ) {
    return {
      prompt:
        "Design a distributed service that processes millions of events per day. Explain the architecture, data flow, storage strategy, failure handling, scaling approach, and observability.",
      answerOutline:
        "Clarify throughput and latency requirements; define services and data flow; choose storage and messaging; address partitioning, replication, retries, idempotency, failure recovery, monitoring, and scaling trade-offs.",
    };
  }

  if (
    text.includes("microservice")
  ) {
    return {
      prompt:
        "Design a microservices-based backend for a high-traffic application. Explain how you would define service boundaries, communicate between services, manage data ownership, handle failures, and observe the system.",
      answerOutline:
        "Define bounded contexts; assign data ownership; choose REST/events where appropriate; establish timeouts and retries; address consistency and failure isolation; add tracing, metrics, logs, and deployment safeguards.",
    };
  }

  return {
    prompt:
      `Design a scalable system for the ${role.title} role that demonstrates strong ${getTechnicalTopic(requirement)} skills. Explain the architecture, data flow, scalability, reliability, security, observability, and key trade-offs.`,
    answerOutline:
      "Clarify functional and non-functional requirements; propose the high-level architecture; explain components and data flow; address scalability, reliability, security, observability, failure handling, and trade-offs.",
  };
}

function createBehaviouralQuestion(
  requirement: ExtractedRequirement,
): {
  prompt: string;
  answerOutline: string;
} {
  const text = cleanText(
    requirement.text,
  );

  return {
    prompt:
      `Tell me about a specific situation where you demonstrated ${text}. What was the challenge, what actions did you personally take, and what was the outcome?`,
    answerOutline:
      "Use STAR: Situation, Task, Action, Result. Focus on your personal contribution, decisions, communication, measurable outcome, and what you learned.",
  };
}

function createCompanyFitQuestion(
  requirement: ExtractedRequirement,
  role: ExtractedRole,
): {
  prompt: string;
  answerOutline: string;
} {
  const text = lower(requirement.text);

  if (
    isHiringLogisticsRequirement(requirement)
  ) {
    if (
      text.includes("availability") ||
      text.includes("commence") ||
      text.includes("start")
    ) {
      return {
        prompt:
          "If asked about your availability to start the role, how would you give a clear and professional answer while confirming your expected joining timeline?",
        answerOutline:
          "State your earliest realistic joining date; mention any existing commitments briefly; be precise about the timeline; avoid unnecessary personal details; confirm flexibility if applicable.",
      };
    }

    return {
      prompt:
        "How would you respond professionally to a recruiter question about your employment eligibility, location, relocation, or joining requirements?",
      answerOutline:
        "Give a direct factual response; clarify relevant constraints; state your availability or eligibility clearly; avoid ambiguity; mention flexibility only when it is genuine.",
    };
  }

  return {
    prompt:
      `How would you use your experience with ${getTechnicalTopic(requirement)} to contribute effectively as a ${role.title}? Give a concrete example of the impact you could deliver.`,
    answerOutline:
      "Connect the skill to the role; give a concrete example; explain your contribution; connect the work to business or engineering impact; mention how you would collaborate with the team.",
  };
}

function createQuestion(
  requirement: ExtractedRequirement,
  role: ExtractedRole,
  index: number,
  research: CompanyResearch,
): GeneratedQuestion {
  const category =
    getCategory(requirement);

  const difficulty =
    getDifficulty(requirement);

  let prompt: string;
  let answerOutline: string;

  if (
    category === "behavioural"
  ) {
    const result =
      createBehaviouralQuestion(
        requirement,
      );

    prompt = result.prompt;
    answerOutline =
      result.answerOutline;
  } else if (
    category === "system-design"
  ) {
    const result =
      createSystemDesignQuestion(
        requirement,
        role,
      );

    prompt = result.prompt;
    answerOutline =
      result.answerOutline;
  } else if (
    category === "company-fit"
  ) {
    const result =
      createCompanyFitQuestion(
        requirement,
        role,
      );

    prompt = result.prompt;
    answerOutline =
      result.answerOutline;

    if (
      research.pagesUsed.length > 0
    ) {
      answerOutline +=
        " Where relevant, connect the answer to facts from the researched company sources.";
    }
  } else {
    const result =
      createTechnicalQuestion(
        requirement,
        role,
      );

    prompt = result.prompt;
    answerOutline =
      result.answerOutline;
  }

  if (
    !isUsableQuestion(
      prompt,
      requirement,
    )
  ) {
    const fallback =
      createTechnicalQuestion(
        requirement,
        role,
      );

    prompt = fallback.prompt;
    answerOutline =
      fallback.answerOutline;

    if (!isUsableQuestion(prompt, requirement)) {
      prompt =
        `Explain how ${getTechnicalTopic(requirement)} should be applied in a production system, including design choices, trade-offs, testing, and failure handling.`;

      answerOutline =
        `Define ${getTechnicalTopic(requirement)}; explain practical application, important design choices, alternatives, trade-offs, testing, monitoring, and failure recovery.`;
    }
  }

  return {
    id: createQuestionId(
      requirement.id,
      index,
    ),

    requirement_ids: [
      requirement.id,
    ],

    category,

    prompt,

    answer_outline:
      answerOutline,

    difficulty,

    edited: false,

    pinned: false,
  };
}

/* =========================================================
   FLASHCARD GENERATION
   ========================================================= */

function createFlashcard(
  requirement: ExtractedRequirement,
  index: number,
): GeneratedFlashcard {
  const topic =
    getTechnicalTopic(requirement);

  if (
    requirement.kind ===
    "behavioural"
  ) {
    return {
      id: createFlashcardId(
        requirement.id,
        index,
      ),

      front:
        "What makes a strong behavioural answer?",

      back:
        "Use STAR, explain your personal actions, decisions, communication, measurable result, and lesson learned.",

      requirement_ids: [
        requirement.id,
      ],

      edited: false,

      pinned: false,
    };
  }

  if (
    isHiringLogisticsRequirement(
      requirement,
    )
  ) {
    return {
      id: createFlashcardId(
        requirement.id,
        index,
      ),

      front:
        "What should a joining-availability answer include?",

      back:
        "Give your realistic start date, relevant commitments, and any genuine flexibility clearly and professionally.",

      requirement_ids: [
        requirement.id,
      ],

      edited: false,

      pinned: false,
    };
  }

  if (
    lower(requirement.text).includes(
      "system design",
    ) ||
    lower(requirement.text).includes(
      "architecture",
    ) ||
    lower(requirement.text).includes(
      "distributed",
    )
  ) {
    return {
      id: createFlashcardId(
        requirement.id,
        index,
      ),

      front:
        `What should you cover in ${topic} system design?`,

      back:
        "Requirements, architecture, data flow, scaling, reliability, security, observability, failure handling, and trade-offs.",

      requirement_ids: [
        requirement.id,
      ],

      edited: false,

      pinned: false,
    };
  }

  return {
    id: createFlashcardId(
      requirement.id,
      index,
    ),

    front:
      `What should you know about ${topic} for interviews?`,

    back:
      `Know the core concept, practical usage, common failure modes, trade-offs, testing approach, and one realistic example.`,

    requirement_ids: [
      requirement.id,
    ],

    edited: false,

    pinned: false,
  };
}

/* =========================================================
   DETERMINISTIC GENERATION
   ========================================================= */

function generateForRequirements(
  requirements: ExtractedRequirement[],
  role: ExtractedRole,
  research: CompanyResearch,
  startIndex = 1,
): GeneratedContent {
  const questions: GeneratedQuestion[] =
    [];

  const flashcards: GeneratedFlashcard[] =
    [];

  let questionIndex =
    startIndex;

  let flashcardIndex =
    startIndex;

  for (
    const requirement of requirements
  ) {
    questions.push(
      createQuestion(
        requirement,
        role,
        questionIndex,
        research,
      ),
    );

    flashcards.push(
      createFlashcard(
        requirement,
        flashcardIndex,
      ),
    );

    questionIndex += 1;
    flashcardIndex += 1;
  }

  return {
    questions,
    flashcards,
  };
}

export function generateInterviewContent(
  role: ExtractedRole,
  research: CompanyResearch,
): GeneratedContent {
  return generateForRequirements(
    role.requirements,
    role,
    research,
  );
}

/* =========================================================
   COMPANY CONTEXT
   ========================================================= */

function buildCompanySummary(
  research: CompanyResearch,
): {
  summary: string;
  what_they_do: string;
} {
  const text = cleanText(
    research.companyText,
  );

  if (!text) {
    return {
      summary:
        "Limited public company information was available during research.",

      what_they_do:
        "The company website did not provide enough accessible information to determine this reliably.",
    };
  }

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(cleanText)
    .filter(
      (sentence) =>
        sentence.length >= 30,
    );

  const summary =
    sentences
      .slice(0, 3)
      .join(" ")
      .slice(0, 1200);

  return {
    summary:
      summary ||
      "Limited public company information was available during research.",

    what_they_do:
      summary ||
      "Limited public company information was available during research.",
  };
}

/* =========================================================
   LLM NORMALIZATION
   ========================================================= */

function normalizeDifficulty(
  value: unknown,
  fallback: 1 | 2 | 3,
): 1 | 2 | 3 {
  if (
    value === 1 ||
    value === 2 ||
    value === 3
  ) {
    return value;
  }

  return fallback;
}

function normalizeCategory(
  value: unknown,
  requirement: ExtractedRequirement,
): QuestionCategory {
  if (
    isHiringLogisticsRequirement(
      requirement,
    )
  ) {
    return "company-fit";
  }

  if (
    value === "technical" ||
    value === "behavioural" ||
    value === "system-design" ||
    value === "company-fit"
  ) {
    return value;
  }

  return getCategory(requirement);
}

function normalizeLLMContent(
  llm: LLMGenerationResult,
  role: ExtractedRole,
  startIndex = 1,
): GeneratedContent {
  const requirementMap =
    new Map(
      role.requirements.map(
        (requirement) => [
          requirement.id,
          requirement,
        ],
      ),
    );

  const validRequirementIds =
    new Set(
      role.requirements.map(
        (requirement) =>
          requirement.id,
      ),
    );

  const questions: GeneratedQuestion[] =
    [];

  const flashcards: GeneratedFlashcard[] =
    [];

  let questionIndex =
    startIndex;

  let flashcardIndex =
    startIndex;

  for (
    const question of llm.questions
  ) {
    const requirementIds =
      Array.from(
        new Set(
          question.requirement_ids.filter(
            (id) =>
              validRequirementIds.has(
                id,
              ),
          ),
        ),
      );

    if (
      requirementIds.length === 0
    ) {
      continue;
    }

    const primaryRequirement =
      requirementMap.get(
        requirementIds[0],
      );

    if (!primaryRequirement) {
      continue;
    }

    const prompt =
      cleanText(
        question.prompt,
      );

    const answerOutline =
      cleanText(
        question.answer_outline,
      );

    if (
      !prompt ||
      !answerOutline
    ) {
      continue;
    }

    if (
      !isUsableQuestion(
        prompt,
        primaryRequirement,
      )
    ) {
      continue;
    }

    if (isDuplicateQuestion(prompt, questions)) {
      continue;
    }

    const category =
      normalizeCategory(
        question.category,
        primaryRequirement,
      );

    questions.push({
      id: createQuestionId(
        requirementIds[0],
        questionIndex,
      ),

      requirement_ids:
        requirementIds,

      category,

      prompt,

      answer_outline:
        answerOutline,

      difficulty:
        normalizeDifficulty(
          question.difficulty,
          getDifficulty(
            primaryRequirement,
          ),
        ),

      edited: false,

      pinned: false,
    });

    questionIndex += 1;
  }

  for (
    const flashcard of llm.flashcards
  ) {
    const requirementIds =
      Array.from(
        new Set(
          flashcard.requirement_ids.filter(
            (id) =>
              validRequirementIds.has(
                id,
              ),
          ),
        ),
      );

    if (
      requirementIds.length === 0
    ) {
      continue;
    }

    const front =
      cleanText(
        flashcard.front,
      );

    const back =
      cleanText(
        flashcard.back,
      );

    if (
      !front ||
      !back
    ) {
      continue;
    }

    if (
      front.length < 10 ||
      back.length < 20 ||
      front.length > 300 ||
      back.length > 1200
    ) {
      continue;
    }

    if (isDuplicateFlashcard(front, flashcards)) {
      continue;
    }

    flashcards.push({
      id: createFlashcardId(
        requirementIds[0],
        flashcardIndex,
      ),

      front,

      back,

      requirement_ids:
        requirementIds,

      edited: false,

      pinned: false,
    });

    flashcardIndex += 1;
  }

  return {
    questions,
    flashcards,
  };
}

/* =========================================================
   ASYNC LLM GENERATION
   ========================================================= */

export async function generateInterviewContentAsync(
  role: ExtractedRole,
  research: CompanyResearch,
): Promise<GeneratedContent> {
  const fallback =
    generateInterviewContent(
      role,
      research,
    );

  try {
    const companyBrief =
      buildCompanySummary(
        research,
      );

    const llmResult =
      await generateWithGemini({
        roleTitle: role.title,

        seniority:
          role.seniority,

        requirements:
          role.requirements,

        companyBrief,
      });

    if (!llmResult) {
      console.warn(
        "Gemini unavailable. Using deterministic interview generation.",
      );

      return fallback;
    }

    const normalized =
      normalizeLLMContent(
        llmResult,
        role,
      );

    if (
      normalized.questions.length ===
        0
    ) {
      console.warn(
        "Gemini returned no usable questions. Using deterministic generation.",
      );

      return fallback;
    }

    const uncovered =
      findUncoveredRequirements(
        role.requirements,
        normalized.questions,
      );

    if (
      uncovered.length > 0
    ) {
      const repair =
        generateForRequirements(
          uncovered,
          role,
          research,
          normalized.questions
            .length + 1,
        );

      return {
        questions: [
          ...normalized.questions,
          ...repair.questions,
        ],

        flashcards: [
          ...normalized.flashcards,
          ...repair.flashcards,
        ],
      };
    }

    return normalized;
  } catch (error) {
    console.error(
      "LLM generation failed. Falling back to deterministic generation:",
      error,
    );

    return fallback;
  }
}

/* =========================================================
   COVERAGE
   ========================================================= */

export function findUncoveredRequirements(
  requirements: ExtractedRequirement[],
  questions: GeneratedQuestion[],
): ExtractedRequirement[] {
  const coveredIds =
    new Set<string>();

  for (
    const question of questions
  ) {
    for (
      const requirementId of
        question.requirement_ids
    ) {
      coveredIds.add(
        requirementId,
      );
    }
  }

  return requirements.filter(
    (requirement) =>
      !coveredIds.has(
        requirement.id,
      ),
  );
}

export function generateMissingQuestions(
  requirements: ExtractedRequirement[],
  existingQuestions: GeneratedQuestion[],
  role: ExtractedRole,
  research: CompanyResearch,
): GeneratedQuestion[] {
  const missing =
    findUncoveredRequirements(
      requirements,
      existingQuestions,
    );

  if (
    missing.length === 0
  ) {
    return [];
  }

  const startIndex =
    existingQuestions.length + 1;

  return generateForRequirements(
    missing,
    role,
    research,
    startIndex,
  ).questions;
}

/* =========================================================
   SYNCHRONOUS COVERAGE REPAIR
   ========================================================= */

export function ensureRequirementCoverage(
  role: ExtractedRole,
  content: GeneratedContent,
  research: CompanyResearch,
): GeneratedContent {
  const missing =
    findUncoveredRequirements(
      role.requirements,
      content.questions,
    );

  if (
    missing.length === 0
  ) {
    return content;
  }

  const additional =
    generateForRequirements(
      missing,
      role,
      research,
      content.questions.length + 1,
    );

  return {
    questions: [
      ...content.questions,
      ...additional.questions,
    ],

    flashcards: [
      ...content.flashcards,
      ...additional.flashcards,
    ],
  };
}

/* =========================================================
   ASYNC COVERAGE REPAIR
   ========================================================= */

export async function ensureRequirementCoverageAsync(
  role: ExtractedRole,
  content: GeneratedContent,
  research: CompanyResearch,
): Promise<GeneratedContent> {
  const missing =
    findUncoveredRequirements(
      role.requirements,
      content.questions,
    );

  if (
    missing.length === 0
  ) {
    return content;
  }

  try {
    const companyBrief =
      buildCompanySummary(
        research,
      );

    const llmResult =
      await generateWithGemini({
        roleTitle: role.title,

        seniority:
          role.seniority,

        requirements: missing,

        companyBrief,
      });

    if (llmResult) {
      const normalized =
        normalizeLLMContent(
          llmResult,
          role,
          content.questions.length +
            1,
        );

      const stillMissing =
        findUncoveredRequirements(
          missing,
          normalized.questions,
        );

      if (
        stillMissing.length === 0
      ) {
        return {
          questions: [
            ...content.questions,
            ...normalized.questions,
          ],

          flashcards: [
            ...content.flashcards,
            ...normalized.flashcards,
          ],
        };
      }

      const repair =
        generateForRequirements(
          stillMissing,
          role,
          research,
          content.questions.length +
            normalized.questions
              .length +
            1,
        );

      return {
        questions: [
          ...content.questions,
          ...normalized.questions,
          ...repair.questions,
        ],

        flashcards: [
          ...content.flashcards,
          ...normalized.flashcards,
          ...repair.flashcards,
        ],
      };
    }
  } catch (error) {
    console.error(
      "LLM coverage repair failed:",
      error,
    );
  }

  return ensureRequirementCoverage(
    role,
    content,
    research,
  );
}

/* =========================================================
   QUESTION REGENERATION
   ========================================================= */

/**
 * Regenerates one question category while preserving
 * all edited or pinned questions.
 *
 * Questions belonging to other categories are untouched.
 *
 * Example:
 * - regenerate "technical"
 * - edited technical questions stay
 * - pinned technical questions stay
 * - unedited technical questions are regenerated
 * - behavioural/company-fit/system-design stay unchanged
 */
export function regenerateQuestionCategory(
  role: ExtractedRole,
  research: CompanyResearch,
  existingQuestions: GeneratedQuestion[],
  category: QuestionCategory,
): GeneratedQuestion[] {
  const preservedQuestions =
    existingQuestions.filter(
      (question) =>
        question.category === category &&
        (question.edited === true ||
          question.pinned === true),
    );

  const untouchedQuestions =
    existingQuestions.filter(
      (question) =>
        question.category !== category,
    );

  const preservedRequirementIds =
    new Set<string>();

  for (
    const question of preservedQuestions
  ) {
    for (
      const requirementId of
        question.requirement_ids
    ) {
      preservedRequirementIds.add(
        requirementId,
      );
    }
  }

  const categoryRequirements =
    role.requirements.filter(
      (requirement) =>
        getCategory(requirement) ===
        category,
    );

  const requirementsToRegenerate =
    categoryRequirements.filter(
      (requirement) =>
        !preservedRequirementIds.has(
          requirement.id,
        ),
    );

  const startIndex =
    existingQuestions.length + 1;

  const regenerated =
    generateForRequirements(
      requirementsToRegenerate,
      role,
      research,
      startIndex,
    ).questions.map(
      (question) => ({
        ...question,
        category,
        edited: false,
        pinned: false,
      }),
    );

  return [
    ...untouchedQuestions,
    ...preservedQuestions,
    ...regenerated,
  ];
}

/**
 * Regenerates all question categories.
 *
 * Edited or pinned questions are preserved.
 * All other questions are regenerated.
 */
export function regenerateAllQuestions(
  role: ExtractedRole,
  research: CompanyResearch,
  existingQuestions: GeneratedQuestion[],
): GeneratedQuestion[] {
  const categories: QuestionCategory[] = [
    "technical",
    "behavioural",
    "system-design",
    "company-fit",
  ];

  let questions =
    existingQuestions;

  for (
    const category of categories
  ) {
    questions =
      regenerateQuestionCategory(
        role,
        research,
        questions,
        category,
      );
  }

  return questions;
}

/* =========================================================
   FLASHCARD REGENERATION
   ========================================================= */

/**
 * Regenerates flashcards while preserving
 * edited or pinned flashcards.
 *
 * A requirement already represented by a preserved
 * flashcard will not receive a replacement card.
 */
export function regenerateFlashcards(
  role: ExtractedRole,
  existingFlashcards: GeneratedFlashcard[],
): GeneratedFlashcard[] {
  const preservedFlashcards =
    existingFlashcards.filter(
      (flashcard) =>
        flashcard.edited === true ||
        flashcard.pinned === true,
    );

  const preservedRequirementIds =
    new Set<string>();

  for (
    const flashcard of preservedFlashcards
  ) {
    for (
      const requirementId of
        flashcard.requirement_ids
    ) {
      preservedRequirementIds.add(
        requirementId,
      );
    }
  }

  const requirementsToRegenerate =
    role.requirements.filter(
      (requirement) =>
        !preservedRequirementIds.has(
          requirement.id,
        ),
    );

  const startIndex =
    existingFlashcards.length + 1;

  const regenerated =
    requirementsToRegenerate.map(
      (requirement, index) =>
        createFlashcard(
          requirement,
          startIndex + index,
        ),
    );

  return [
    ...preservedFlashcards,
    ...regenerated,
  ];
}