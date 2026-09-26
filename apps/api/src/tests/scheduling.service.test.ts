import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSchedule,
  validateSchedule,
} from "../services/scheduling/scheduling.service.js";

import type {
  GeneratedQuestion,
} from "../services/generation/generation.service.js";

import type {
  ExtractedRequirement,
} from "../services/extraction/jd-extractor.service.js";

const requirements: ExtractedRequirement[] = [
  {
    id: "r1",
    text: "Experience with Python",
    kind: "technical",
    priority: "must",
  },
  {
    id: "r2",
    text: "Experience with SQL",
    kind: "technical",
    priority: "must",
  },
  {
    id: "r3",
    text: "Strong communication skills",
    kind: "behavioural",
    priority: "nice",
  },
];

const questions: GeneratedQuestion[] = [
  {
    id: "q1",
    requirement_ids: ["r1"],
    category: "technical",
    prompt: "Explain your Python experience.",
    answer_outline: "Explain Python usage and examples.",
    difficulty: 3,
  },
  {
    id: "q2",
    requirement_ids: ["r2"],
    category: "technical",
    prompt: "Explain your SQL experience.",
    answer_outline: "Explain SQL concepts and practical usage.",
    difficulty: 2,
  },
  {
    id: "q3",
    requirement_ids: ["r3"],
    category: "behavioural",
    prompt: "Describe a communication challenge.",
    answer_outline: "Use the STAR method.",
    difficulty: 1,
  },
];

test("creates exactly one day for a 1-day schedule", () => {
  const schedule = buildSchedule(
    1,
    questions,
    requirements,
  );

  assert.equal(
    schedule.days_available,
    1,
  );

  assert.equal(
    schedule.days.length,
    1,
  );

  assert.equal(
    schedule.days[0]?.day,
    1,
  );

  assert.ok(
    schedule.days[0]?.question_ids
      .length,
  );
});

test("creates exactly the requested number of days", () => {
  const schedule = buildSchedule(
    5,
    questions,
    requirements,
  );

  assert.equal(
    schedule.days_available,
    5,
  );

  assert.equal(
    schedule.days.length,
    5,
  );

  assert.deepEqual(
    schedule.days.map(
      (day) => day.day,
    ),
    [1, 2, 3, 4, 5],
  );
});

test("includes valid question IDs only", () => {
  const schedule = buildSchedule(
    3,
    questions,
    requirements,
  );

  const validIds = new Set(
    questions.map(
      (question) => question.id,
    ),
  );

  for (const day of schedule.days) {
    for (const questionId of day.question_ids) {
      assert.ok(
        validIds.has(questionId),
      );
    }
  }
});

test("prioritizes must-have and harder questions", () => {
  const schedule = buildSchedule(
    3,
    questions,
    requirements,
  );

  const firstDay =
    schedule.days[0];

  assert.ok(firstDay);

  assert.ok(
    firstDay.question_ids.includes(
      "q1",
    ),
  );
});

test("produces deterministic schedules", () => {
  const first = buildSchedule(
    4,
    questions,
    requirements,
  );

  const second = buildSchedule(
    4,
    questions,
    requirements,
  );

  assert.deepEqual(
    first,
    second,
  );
});

test("validates a correctly generated schedule", () => {
  const schedule = buildSchedule(
    3,
    questions,
    requirements,
  );

  assert.equal(
    validateSchedule(
      schedule,
      questions,
    ),
    true,
  );
});

test("rejects a schedule with an invalid question ID", () => {
  const schedule = buildSchedule(
    3,
    questions,
    requirements,
  );

  schedule.days[0]!.question_ids.push(
    "does-not-exist",
  );

  assert.equal(
    validateSchedule(
      schedule,
      questions,
    ),
    false,
  );
});

test("rejects uncovered must-have requirements", () => {
  const incompleteQuestions =
    questions.filter(
      (question) =>
        !question.requirement_ids.includes(
          "r2",
        ),
    );

  assert.throws(
    () =>
      buildSchedule(
        3,
        incompleteQuestions,
        requirements,
      ),
    /must requirements are uncovered/,
  );
});

test("rejects invalid day counts", () => {
  assert.throws(
    () =>
      buildSchedule(
        0,
        questions,
        requirements,
      ),
    /between 1 and 60/,
  );

  assert.throws(
    () =>
      buildSchedule(
        61,
        questions,
        requirements,
      ),
    /between 1 and 60/,
  );
});

test("rejects scheduling without questions", () => {
  assert.throws(
    () =>
      buildSchedule(
        3,
        [],
        requirements,
      ),
    /without questions/,
  );
});