import { z } from "zod";

export const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
});

export const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema),
});

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

export const QuestionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()),
  category: z.enum([
    "technical",
    "behavioural",
    "system-design",
    "company-fit",
  ]),
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
});

export const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string()),
});

export const ScheduleDaySchema = z.object({
  day: z.number().int().positive(),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().nonnegative(),
});

export const ScheduleSchema = z.object({
  days_available: z.number().int().positive(),
  days: z.array(ScheduleDaySchema),
});

export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().nonnegative(),
});

export const KitSchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number().int().nonnegative(),
    researched_at: z.string(),
    pages_used: z.array(z.string()),
  }),

  company_brief: CompanyBriefSchema,

  role: RoleSchema,

  questions: z.array(QuestionSchema),

  flashcards: z.array(FlashcardSchema),

  schedule: ScheduleSchema,

  coverage: CoverageSchema,
});

export type Requirement = z.infer<typeof RequirementSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Flashcard = z.infer<typeof FlashcardSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;
export type Kit = z.infer<typeof KitSchema>;
import type { Requirement, Question } from "../../../packages/contracts/src/kit.schema.js";

export function findUncoveredRequirements(
  requirements: Requirement[],
  questions: Question[]
): string[] {
  const coveredRequirementIds = new Set<string>();

  for (const question of questions) {
    for (const requirementId of question.requirement_ids) {
      coveredRequirementIds.add(requirementId);
    }
  }

  return requirements
    .filter((requirement) => requirement.priority === "must")
    .filter(
      (requirement) => !coveredRequirementIds.has(requirement.id)
    )
    .map((requirement) => requirement.id);
}