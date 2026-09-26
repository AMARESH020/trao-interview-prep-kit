import type { CompanyResearch } from "../research/research.service.js";
import type {
  ExtractedRequirement,
  ExtractedRole,
} from "../extraction/jd-extractor.service.js";

export type GeneratedQuestion = {
  id: string;
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

export type GeneratedFlashcard = {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
};

export type GeneratedContent = {
  questions: GeneratedQuestion[];
  flashcards: GeneratedFlashcard[];
};

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

function getTechnicalTopic(
  requirement: ExtractedRequirement,
): string {
  const text = requirement.text;

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
    "Microservices",
    "Machine Learning",
    "Deep Learning",
    "TensorFlow",
    "PyTorch",
    "NLP",
    "Computer Vision",
    "Data Structures",
    "Algorithms",
    "System Design",
  ];

  const lower = text.toLowerCase();

  const match = technicalTopics.find(
    (topic) =>
      lower.includes(topic.toLowerCase()),
  );

  return match ?? text;
}

function getCategory(
  requirement: ExtractedRequirement,
):
  | "technical"
  | "behavioural"
  | "system-design"
  | "company-fit" {
  if (requirement.kind === "behavioural") {
    return "behavioural";
  }

  const lower = requirement.text.toLowerCase();

  if (
    lower.includes("system design") ||
    lower.includes("architecture") ||
    lower.includes("scalable") ||
    lower.includes("microservices")
  ) {
    return "system-design";
  }

  if (
    lower.includes("company") ||
    lower.includes("culture") ||
    lower.includes("domain") ||
    lower.includes("industry")
  ) {
    return "company-fit";
  }

  return "technical";
}

function getDifficulty(
  requirement: ExtractedRequirement,
): 1 | 2 | 3 {
  if (requirement.priority === "must") {
    return 3;
  }

  if (requirement.kind === "behavioural") {
    return 2;
  }

  return 2;
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

  const topic =
    getTechnicalTopic(requirement);

  let prompt: string;
  let answerOutline: string;

  if (category === "behavioural") {
    prompt =
      `Describe a situation where you demonstrated ${requirement.text}. How did you approach it, what action did you take, and what was the outcome?`;

    answerOutline =
      "Use STAR: Situation, Task, Action, Result. Explain your specific contribution, decisions, communication, and measurable outcome.";
  } else if (
    category === "system-design"
  ) {
    prompt =
      `How would you design a scalable solution involving ${topic} for the ${role.title} role? Explain the architecture, major components, data flow, reliability considerations, and trade-offs.`;

    answerOutline =
      "Clarify requirements; propose architecture; explain components and data flow; discuss scalability, reliability, security, observability, and trade-offs.";
  } else if (
    category === "company-fit"
  ) {
    prompt =
      `How would you apply your experience with ${topic} to contribute to this company and the ${role.title} role?`;

    answerOutline =
      "Connect the requirement to the company's documented context, explain relevant experience, describe expected impact, and identify a practical contribution.";
  } else {
    prompt =
      `For the ${role.title} role, explain your understanding of ${topic} in the context of: ${requirement.text}. Describe how you would apply it in a real project.`;

    answerOutline =
      `Define ${topic}; explain the core concepts; describe implementation or usage; discuss common trade-offs, failure modes, and a practical example.`;
  }

  /*
   * Research is deliberately incorporated as context,
   * but fetched webpage content is never treated as
   * executable instructions.
   */
  if (
    research.pagesUsed.length > 0 &&
    category === "company-fit"
  ) {
    answerOutline +=
      " Support the answer with relevant facts from the researched company sources.";
  }

  return {
    id: createQuestionId(
      requirement.id,
      index,
    ),
    requirement_ids: [requirement.id],
    category,
    prompt,
    answer_outline: answerOutline,
    difficulty,
  };
}

function createFlashcard(
  requirement: ExtractedRequirement,
  index: number,
): GeneratedFlashcard {
  const topic =
    getTechnicalTopic(requirement);

  if (requirement.kind === "behavioural") {
    return {
      id: createFlashcardId(
        requirement.id,
        index,
      ),
      front: `What should you demonstrate when answering questions about ${requirement.text}?`,
      back:
        "Use a concrete example, explain your role, describe the actions you personally took, and finish with the measurable result or lesson learned.",
      requirement_ids: [requirement.id],
    };
  }

  return {
    id: createFlashcardId(
      requirement.id,
      index,
    ),
    front: `Key interview topic: ${topic}`,
    back:
      `Requirement: ${requirement.text}. Review the definition, core concepts, practical usage, common trade-offs, and one real-world example.`,
    requirement_ids: [requirement.id],
  };
}

function generateForRequirements(
  requirements: ExtractedRequirement[],
  role: ExtractedRole,
  research: CompanyResearch,
  startIndex = 1,
): GeneratedContent {
  const questions: GeneratedQuestion[] = [];
  const flashcards: GeneratedFlashcard[] = [];

  let questionIndex = startIndex;
  let flashcardIndex = startIndex;

  for (const requirement of requirements) {
    const question = createQuestion(
      requirement,
      role,
      questionIndex,
      research,
    );

    questions.push(question);

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

export function findUncoveredRequirements(
  requirements: ExtractedRequirement[],
  questions: GeneratedQuestion[],
): ExtractedRequirement[] {
  const coveredIds = new Set<string>();

  for (const question of questions) {
    for (const requirementId of question.requirement_ids) {
      coveredIds.add(requirementId);
    }
  }

  return requirements.filter(
    (requirement) =>
      !coveredIds.has(requirement.id),
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

  const startIndex =
    existingQuestions.length + 1;

  return generateForRequirements(
    missing,
    role,
    research,
    startIndex,
  ).questions;
}

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

  if (missing.length === 0) {
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