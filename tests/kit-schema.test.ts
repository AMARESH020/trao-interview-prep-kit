import { describe, expect, it } from "vitest";

import { KitSchema } from "../packages/contracts/src/kit.schema.js";

describe("kit schema", () => {
  it("accepts a valid kit", () => {
    const kit = {
      source: {
        company: "Example Company",
        company_url: "https://example.com",
        role: "Software Engineer",
        location: "Bengaluru",
        jd_chars: 500,
        researched_at: new Date().toISOString(),
        pages_used: [
          "https://example.com/about",
        ],
      },

      company_brief: {
        summary: "Example company summary",
        what_they_do: "Example company description",
        sources: [
          "https://example.com/about",
        ],
      },

      role: {
        title: "Software Engineer",
        seniority: "Mid-level",
        responsibilities: [
          "Build software",
        ],
        requirements: [
          {
            id: "r1",
            text: "Python",
            kind: "technical",
            priority: "must",
          },
        ],
      },

      questions: [
        {
          id: "q1",
          requirement_ids: ["r1"],
          category: "technical",
          prompt: "Explain Python.",
          answer_outline: "Discuss Python fundamentals.",
          difficulty: 2,
        },
      ],

      flashcards: [
        {
          id: "f1",
          front: "What is Python?",
          back: "A programming language.",
          requirement_ids: ["r1"],
        },
      ],

      schedule: {
        days_available: 1,
        days: [
          {
            day: 1,
            focus: "Python",
            question_ids: ["q1"],
            minutes: 60,
          },
        ],
      },

      coverage: {
        uncovered_requirement_ids: [],
        passes: 2,
      },
    };

    const result = KitSchema.safeParse(kit);

    expect(result.success).toBe(true);
  });

  it("rejects an invalid difficulty", () => {
    const invalidQuestion = {
      id: "q1",
      requirement_ids: ["r1"],
      category: "technical",
      prompt: "Explain Python.",
      answer_outline: "Answer",
      difficulty: 5,
    };

    const result = KitSchema.shape.questions.element.safeParse(
      invalidQuestion
    );

    expect(result.success).toBe(false);
  });
});