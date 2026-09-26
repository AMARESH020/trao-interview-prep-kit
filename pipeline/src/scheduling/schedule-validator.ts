import type {
  Question,
  Requirement,
  Schedule,
} from "../../../packages/contracts/src/kit.schema.js";

export function validateSchedule(
  schedule: Schedule,
  requirements: Requirement[],
  questions: Question[],
  requestedDays: number
): string[] {
  const errors: string[] = [];

  // Exact number of requested days
  if (schedule.days_available !== requestedDays) {
    errors.push(
      `Expected ${requestedDays} days, got ${schedule.days_available}`
    );
  }

  if (schedule.days.length !== requestedDays) {
    errors.push(
      `Expected ${requestedDays} schedule entries, got ${schedule.days.length}`
    );
  }

  // All scheduled question IDs must exist
  const questionIds = new Set(
    questions.map((question) => question.id)
  );

  for (const day of schedule.days) {
    if (!Number.isInteger(day.minutes)) {
      errors.push(
        `Day ${day.day} must have integer minutes`
      );
    }

    for (const questionId of day.question_ids) {
      if (!questionIds.has(questionId)) {
        errors.push(
          `Day ${day.day} references unknown question ${questionId}`
        );
      }
    }
  }

  // Every must-have requirement must be represented
  // by a question that is actually scheduled.
  const scheduledQuestionIds = new Set(
    schedule.days.flatMap((day) => day.question_ids)
  );

  for (const requirement of requirements) {
    if (requirement.priority !== "must") {
      continue;
    }

    const covered = questions.some(
      (question) =>
        scheduledQuestionIds.has(question.id) &&
        question.requirement_ids.includes(requirement.id)
    );

    if (!covered) {
      errors.push(
        `Must-have requirement ${requirement.id} is not scheduled`
      );
    }
  }

  return errors;
}