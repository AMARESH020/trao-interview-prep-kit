import { describe, expect, it } from "vitest";

import { validateSchedule } from "../pipeline/src/scheduling/schedule-validator.js";

describe("schedule validator", () => {
  const requirements = [
    {
      id: "r1",
      text: "Python",
      kind: "technical" as const,
      priority: "must" as const,
    },
    {
      id: "r2",
      text: "React",
      kind: "technical" as const,
      priority: "must" as const,
    },
  ];

  const questions = [
    {
      id: "q1",
      requirement_ids: ["r1"],
      category: "technical" as const,
      prompt: "Explain Python.",
      answer_outline: "Python answer",
      difficulty: 2,
    },
    {
      id: "q2",
      requirement_ids: ["r2"],
      category: "technical" as const,
      prompt: "Explain React.",
      answer_outline: "React answer",
      difficulty: 2,
    },
  ];

  it("accepts a valid schedule", () => {
    const schedule = {
      days_available: 2,
      days: [
        {
          day: 1,
          focus: "Python",
          question_ids: ["q1"],
          minutes: 60,
        },
        {
          day: 2,
          focus: "React",
          question_ids: ["q2"],
          minutes: 60,
        },
      ],
    };

    expect(
      validateSchedule(schedule, requirements, questions, 2)
    ).toEqual([]);
  });

  it("rejects the wrong number of days", () => {
    const schedule = {
      days_available: 1,
      days: [
        {
          day: 1,
          focus: "Python",
          question_ids: ["q1"],
          minutes: 60,
        },
      ],
    };

    const errors = validateSchedule(
      schedule,
      requirements,
      questions,
      2
    );

    expect(errors).toContain("Expected 2 days, got 1");
    expect(errors).toContain(
      "Expected 2 schedule entries, got 1"
    );
  });

  it("rejects unknown question IDs", () => {
    const schedule = {
      days_available: 1,
      days: [
        {
          day: 1,
          focus: "Python",
          question_ids: ["q999"],
          minutes: 60,
        },
      ],
    };

    const errors = validateSchedule(
      schedule,
      requirements,
      questions,
      1
    );

    expect(errors).toContain(
      "Day 1 references unknown question q999"
    );
  });

  it("detects an unscheduled must-have requirement", () => {
    const schedule = {
      days_available: 2,
      days: [
        {
          day: 1,
          focus: "Python",
          question_ids: ["q1"],
          minutes: 60,
        },
        {
          day: 2,
          focus: "Other",
          question_ids: [],
          minutes: 30,
        },
      ],
    };

    const errors = validateSchedule(
      schedule,
      requirements,
      questions,
      2
    );

    expect(errors).toContain(
      "Must-have requirement r2 is not scheduled"
    );
  });
});