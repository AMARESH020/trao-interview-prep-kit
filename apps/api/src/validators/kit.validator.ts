import { z } from "zod";

const RequirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum([
    "behavioural",
    "domain",
    "technical",
  ]),
  priority: z.enum([
    "must",
    "nice",
  ]),
});

const QuestionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(
    z.string(),
  ),
  category: z.enum([
    "behavioural",
    "company-fit",
    "system-design",
    "technical",
  ]),
  prompt: z.string().min(1),
  answer_outline: z.string().min(1),
  difficulty: z
    .number()
    .int()
    .min(1)
    .max(3),

  /*
   * Used to preserve user edits/pinned
   * questions during regeneration.
   */
  edited: z
    .boolean()
    .optional(),

  pinned: z
    .boolean()
    .optional(),
});

const FlashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(
    z.string(),
  ),

  /*
   * Used to preserve user edits/pinned
   * flashcards during regeneration.
   */
  edited: z
    .boolean()
    .optional(),

  pinned: z
    .boolean()
    .optional(),
});

const ScheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string().min(1),
  question_ids: z.array(
    z.string(),
  ),
  minutes: z
    .number()
    .int()
    .positive(),
});

const KitSchema = z.object({
  source: z.object({
    company: z.string().min(1),

    company_url: z
      .string()
      .url(),

    role: z.string().min(1),

    location: z.string().min(1),

    jd_chars: z
      .number()
      .int()
      .nonnegative(),

    researched_at: z
      .string()
      .min(1),

    pages_used: z.array(
      z.string().url(),
    ),
  }),

  company_brief: z.object({
    summary: z.string().min(1),

    what_they_do:
      z.string().min(1),

    sources: z.array(
      z.string().url(),
    ),
  }),

  role: z.object({
    title: z.string().min(1),

    seniority:
      z.string().min(1),

    responsibilities:
      z.array(z.string()),

    requirements:
      z.array(
        RequirementSchema,
      ),
  }),

  questions: z.array(
    QuestionSchema,
  ),

  flashcards: z.array(
    FlashcardSchema,
  ),

  schedule: z.object({
    days_available: z
      .number()
      .int()
      .positive(),

    days: z.array(
      ScheduleDaySchema,
    ),
  }),

  coverage: z.object({
    uncovered_requirement_ids:
      z.array(z.string()),

    passes: z
      .number()
      .int()
      .nonnegative(),
  }),
});

export const CreateKitSchema =
  KitSchema;

export const UpdateKitSchema =
  KitSchema.partial();

export type CreateKitInput =
  z.infer<
    typeof CreateKitSchema
  >;

export type UpdateKitInput =
  z.infer<
    typeof UpdateKitSchema
  >;