import assert from "node:assert/strict";
import test from "node:test";

import {
  ensureRequirementCoverage,
  findUncoveredRequirements,
  generateInterviewContent,
  generateMissingQuestions,
} from "../services/generation/generation.service.js";

import type {
  CompanyResearch,
} from "../services/research/research.service.js";

import type {
  ExtractedRole,
} from "../services/extraction/jd-extractor.service.js";

const role: ExtractedRole = {
  title: "Software Engineer",
  seniority: "Entry Level",
  responsibilities: [
    "Build backend services",
    "Collaborate with engineering teams",
  ],
  requirements: [
    {
      id: "r1",
      text: "Experience with Python and FastAPI",
      kind: "technical",
      priority: "must",
    },
    {
      id: "r2",
      text: "Strong communication skills",
      kind: "behavioural",
      priority: "must",
    },
    {
      id: "r3",
      text: "Experience with Kubernetes",
      kind: "technical",
      priority: "nice",
    },
  ],
};

const research: CompanyResearch = {
  companyUrl: "https://example.com/",
  pagesUsed: [
    "https://example.com/",
  ],
  pages: [
    {
      url: "https://example.com/",
      title: "Example Company",
      text: "Example company information",
      links: [],
      status: "ok",
    },
  ],
  companyText:
    "Example company information",
  sources: [
    "https://example.com/",
  ],
};

test("generates questions and flashcards for every requirement", () => {
  const result =
    generateInterviewContent(
      role,
      research,
    );

  assert.equal(
    result.questions.length,
    role.requirements.length,
  );

  assert.equal(
    result.flashcards.length,
    role.requirements.length,
  );

  for (const requirement of role.requirements) {
    const question =
      result.questions.find((item) =>
        item.requirement_ids.includes(
          requirement.id,
        ),
      );

    assert.ok(question);

    assert.ok(question.prompt.length > 0);
    assert.ok(
      question.answer_outline.length > 0,
    );

    assert.ok(
      [1, 2, 3].includes(
        question.difficulty,
      ),
    );

    assert.ok(
      [
        "technical",
        "behavioural",
        "system-design",
        "company-fit",
      ].includes(question.category),
    );

    const flashcard =
      result.flashcards.find((item) =>
        item.requirement_ids.includes(
          requirement.id,
        ),
      );

    assert.ok(flashcard);
    assert.ok(flashcard.front.length > 0);
    assert.ok(flashcard.back.length > 0);
  }
});

test("assigns behavioural questions to the behavioural category", () => {
  const result =
    generateInterviewContent(
      role,
      research,
    );

  const question =
    result.questions.find((item) =>
      item.requirement_ids.includes("r2"),
    );

  assert.ok(question);
  assert.equal(
    question.category,
    "behavioural",
  );
});

test("assigns stable question and flashcard IDs", () => {
  const result =
    generateInterviewContent(
      role,
      research,
    );

  const questionIds =
    result.questions.map(
      (question) => question.id,
    );

  const flashcardIds =
    result.flashcards.map(
      (flashcard) => flashcard.id,
    );

  assert.equal(
    new Set(questionIds).size,
    questionIds.length,
  );

  assert.equal(
    new Set(flashcardIds).size,
    flashcardIds.length,
  );

  assert.deepEqual(
    questionIds,
    [
      "q-r1-1",
      "q-r2-2",
      "q-r3-3",
    ],
  );

  assert.deepEqual(
    flashcardIds,
    [
      "f-r1-1",
      "f-r2-2",
      "f-r3-3",
    ],
  );
});

test("finds uncovered requirements", () => {
  const content =
    generateInterviewContent(
      role,
      research,
    );

  const partialQuestions =
    content.questions.filter(
      (question) =>
        question.requirement_ids.includes(
          "r1",
        ) ||
        question.requirement_ids.includes(
          "r2",
        ),
    );

  const uncovered =
    findUncoveredRequirements(
      role.requirements,
      partialQuestions,
    );

  assert.deepEqual(
    uncovered.map(
      (requirement) => requirement.id,
    ),
    ["r3"],
  );
});

test("generates missing questions for uncovered requirements", () => {
  const content =
    generateInterviewContent(
      role,
      research,
    );

  const partialQuestions =
    content.questions.filter(
      (question) =>
        question.requirement_ids.includes(
          "r1",
        ) ||
        question.requirement_ids.includes(
          "r2",
        ),
    );

  const missing =
    generateMissingQuestions(
      role.requirements,
      partialQuestions,
      role,
      research,
    );

  assert.equal(missing.length, 1);

  assert.deepEqual(
    missing[0]?.requirement_ids,
    ["r3"],
  );

  assert.ok(
    missing[0]?.prompt.length,
  );
});

test("second-pass coverage produces a fully covered kit", () => {
  const content =
    generateInterviewContent(
      role,
      research,
    );

  const partialContent = {
    questions:
      content.questions.filter(
        (question) =>
          question.requirement_ids.includes(
            "r1",
          ),
      ),
    flashcards:
      content.flashcards.filter(
        (flashcard) =>
          flashcard.requirement_ids.includes(
            "r1",
          ),
      ),
  };

  const completed =
    ensureRequirementCoverage(
      role,
      partialContent,
      research,
    );

  const uncovered =
    findUncoveredRequirements(
      role.requirements,
      completed.questions,
    );

  assert.equal(
    uncovered.length,
    0,
  );

  assert.equal(
    completed.questions.length,
    3,
  );

  assert.equal(
    completed.flashcards.length,
    3,
  );
});