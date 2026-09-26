import type {
  ExtractedRequirement,
} from "../extraction/jd-extractor.service.js";

import type {
  GeneratedQuestion,
} from "../generation/generation.service.js";

export type ScheduleDay = {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
};

export type GeneratedSchedule = {
  days_available: number;
  days: ScheduleDay[];
};

function priorityScore(
  requirement: ExtractedRequirement,
): number {
  return requirement.priority === "must"
    ? 2
    : 1;
}

function getRequirementScore(
  question: GeneratedQuestion,
  requirements: ExtractedRequirement[],
): number {
  let score = 0;

  for (const requirementId of question.requirement_ids) {
    const requirement =
      requirements.find(
        (item) => item.id === requirementId,
      );

    if (!requirement) {
      continue;
    }

    score +=
      priorityScore(requirement) * 10;

    if (requirement.kind === "technical") {
      score += 3;
    }

    if (
      requirement.kind === "behavioural"
    ) {
      score += 2;
    }
  }

  score += question.difficulty;

  return score;
}

function getFocus(
  questions: GeneratedQuestion[],
): string {
  if (questions.length === 0) {
    return "Review and reflection";
  }

  const categoryCounts = new Map<
    GeneratedQuestion["category"],
    number
  >();

  for (const question of questions) {
    categoryCounts.set(
      question.category,
      (categoryCounts.get(
        question.category,
      ) ?? 0) + 1,
    );
  }

  let selectedCategory:
    | GeneratedQuestion["category"]
    | undefined;

  let highestCount = 0;

  for (const [
    category,
    count,
  ] of categoryCounts.entries()) {
    if (count > highestCount) {
      selectedCategory = category;
      highestCount = count;
    }
  }

  switch (selectedCategory) {
    case "technical":
      return "Technical fundamentals and implementation";

    case "behavioural":
      return "Behavioural and communication practice";

    case "system-design":
      return "System design and architecture";

    case "company-fit":
      return "Company fit and role preparation";

    default:
      return "Interview preparation";
  }
}

function getMinutes(
  questions: GeneratedQuestion[],
): number {
  if (questions.length === 0) {
    return 30;
  }

  let minutes = 0;

  for (const question of questions) {
    if (question.difficulty === 3) {
      minutes += 60;
    } else if (question.difficulty === 2) {
      minutes += 45;
    } else {
      minutes += 30;
    }
  }

  return minutes;
}

function sortQuestions(
  questions: GeneratedQuestion[],
  requirements: ExtractedRequirement[],
): GeneratedQuestion[] {
  return [...questions].sort(
    (a, b) => {
      const scoreA =
        getRequirementScore(
          a,
          requirements,
        );

      const scoreB =
        getRequirementScore(
          b,
          requirements,
        );

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      /*
       * Stable deterministic tie-breaker.
       */
      return a.id.localeCompare(b.id);
    },
  );
}

function verifyMustCoverage(
  requirements: ExtractedRequirement[],
  questions: GeneratedQuestion[],
): string[] {
  const covered = new Set<string>();

  for (const question of questions) {
    for (const requirementId of question.requirement_ids) {
      covered.add(requirementId);
    }
  }

  return requirements
    .filter(
      (requirement) =>
        requirement.priority === "must" &&
        !covered.has(requirement.id),
    )
    .map(
      (requirement) => requirement.id,
    );
}

export function buildSchedule(
  daysAvailable: number,
  questions: GeneratedQuestion[],
  requirements: ExtractedRequirement[],
): GeneratedSchedule {
  if (
    !Number.isInteger(daysAvailable) ||
    daysAvailable < 1 ||
    daysAvailable > 60
  ) {
    throw new Error(
      "daysAvailable must be an integer between 1 and 60",
    );
  }

  if (questions.length === 0) {
    throw new Error(
      "Cannot create a schedule without questions",
    );
  }

  const uncoveredMustRequirements =
    verifyMustCoverage(
      requirements,
      questions,
    );

  if (
    uncoveredMustRequirements.length > 0
  ) {
    throw new Error(
      `Cannot create schedule because must requirements are uncovered: ${uncoveredMustRequirements.join(", ")}`,
    );
  }

  const sortedQuestions =
    sortQuestions(
      questions,
      requirements,
    );

  const days: ScheduleDay[] = [];

  /*
   * Every requested day must exist.
   *
   * When there are fewer questions than days,
   * questions are reused deterministically so
   * the schedule still contains exactly the
   * requested number of days.
   */
  for (
    let dayNumber = 1;
    dayNumber <= daysAvailable;
    dayNumber += 1
  ) {
    const question =
      sortedQuestions[
        (dayNumber - 1) %
          sortedQuestions.length
      ];

    const dayQuestions =
      question ? [question] : [];

    days.push({
      day: dayNumber,
      focus: getFocus(dayQuestions),
      question_ids:
        dayQuestions.map(
          (item) => item.id,
        ),
      minutes: getMinutes(dayQuestions),
    });
  }

  /*
   * If there are more questions than days,
   * distribute the remaining questions across
   * the existing days in deterministic round-robin
   * order.
   */
  if (
    sortedQuestions.length >
    daysAvailable
  ) {
    for (
      let index = daysAvailable;
      index < sortedQuestions.length;
      index += 1
    ) {
      const dayIndex =
        index % daysAvailable;

      const question =
        sortedQuestions[index];

      const day = days[dayIndex];

      day.question_ids.push(
        question.id,
      );

      const dayQuestions =
        day.question_ids
          .map((id) =>
            sortedQuestions.find(
              (item) => item.id === id,
            ),
          )
          .filter(
            (
              item,
            ): item is GeneratedQuestion =>
              Boolean(item),
          );

      day.focus =
        getFocus(dayQuestions);

      day.minutes =
        getMinutes(dayQuestions);
    }
  }

  return {
    days_available: daysAvailable,
    days,
  };
}

export function validateSchedule(
  schedule: GeneratedSchedule,
  questions: GeneratedQuestion[],
): boolean {
  if (
    schedule.days.length !==
    schedule.days_available
  ) {
    return false;
  }

  const questionIds = new Set(
    questions.map(
      (question) => question.id,
    ),
  );

  const dayNumbers = schedule.days.map(
    (day) => day.day,
  );

  for (
    let index = 0;
    index < dayNumbers.length;
    index += 1
  ) {
    if (
      dayNumbers[index] !==
      index + 1
    ) {
      return false;
    }
  }

  for (const day of schedule.days) {
    if (
      !Number.isInteger(day.minutes) ||
      day.minutes <= 0
    ) {
      return false;
    }

    for (const questionId of day.question_ids) {
      if (!questionIds.has(questionId)) {
        return false;
      }
    }
  }

  return true;
}