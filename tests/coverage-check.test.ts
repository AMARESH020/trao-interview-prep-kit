import { describe, expect, it } from "vitest";

import { findUncoveredRequirements } from "../pipeline/src/coverage/coverage-check.js";

describe("coverage checker", () => {
  it("finds uncovered must-have requirements", () => {
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
        difficulty: 1,
      },
    ];

    expect(
      findUncoveredRequirements(requirements, questions)
    ).toEqual(["r2"]);
  });
});