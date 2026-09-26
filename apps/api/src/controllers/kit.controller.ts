import type { Request, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import { Kit } from "../models/Kit.js";

import {
  CreateKitSchema,
  UpdateKitSchema,
} from "../validators/kit.validator.js";

import {
  generateInterviewKit,
  createCompanyBrief,
} from "../services/kit-generation/kit-generation.service.js";

import {
  regenerateQuestionCategory,
  regenerateAllQuestions,
  type QuestionCategory,
} from "../services/generation/generation.service.js";

import {
  researchCompany,
} from "../services/research/research.service.js";

import {
  buildSchedule,
} from "../services/scheduling/scheduling.service.js";

/* =========================================================
   INPUT VALIDATION
   ========================================================= */

const CreateKitInputSchema = z.object({
  jd: z
    .string()
    .trim()
    .min(20),

  source: z.object({
    company: z
      .string()
      .trim()
      .min(1),

    company_url: z
      .string()
      .trim()
      .url(),

    role: z
      .string()
      .trim()
      .min(1),

    location: z
      .string()
      .trim()
      .min(1),
  }),

  schedule: z.object({
    days_available: z
      .number()
      .int()
      .min(1)
      .max(60),
  }),
});

const RegenerateQuestionsSchema = z.object({
  category: z.enum([
    "technical",
    "behavioural",
    "system-design",
    "company-fit",
    "all",
  ]),
});

/* =========================================================
   HELPERS
   ========================================================= */

function getUserId(
  req: Request,
): string | null {
  if (!req.session.userId) {
    return null;
  }

  return String(
    req.session.userId,
  );
}

function getKitId(
  req: Request,
): string | null {
  const id =
    typeof req.params.id === "string"
      ? req.params.id
      : null;

  if (!id) {
    return null;
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      id,
    )
  ) {
    return null;
  }

  return id;
}

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
) {
  return res.status(status).json({
    error: {
      code,
      message,
    },
  });
}

/*
 * Mongoose stores difficulty as a number.
 *
 * GeneratedQuestion expects the stricter
 * literal type: 1 | 2 | 3.
 *
 * Normalize the persisted value before
 * passing it into generation/scheduling.
 */
function normalizeDifficulty(
  value: number,
): 1 | 2 | 3 {
  if (value <= 1) {
    return 1;
  }

  if (value >= 3) {
    return 3;
  }

  return 2;
}

/* =========================================================
   CREATE KIT
   ========================================================= */

export async function createKit(
  req: Request,
  res: Response,
) {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication required.",
      );
    }

    const validation =
      CreateKitInputSchema.safeParse(
        req.body,
      );

    if (!validation.success) {
      return sendError(
        res,
        400,
        "INVALID_INPUT",
        validation.error.message,
      );
    }

    const {
      jd,
      source,
      schedule,
    } = validation.data;

    const generated =
      await generateInterviewKit({
        jd,

        company:
          source.company,

        role:
          source.role,

        companyUrl:
          source.company_url,

        daysAvailable:
          schedule.days_available,

        location:
          source.location,
      });

    const finalValidation =
      CreateKitSchema.safeParse(
        generated,
      );

    if (!finalValidation.success) {
      return sendError(
        res,
        500,
        "INVALID_GENERATED_KIT",
        finalValidation.error.message,
      );
    }

    const kit =
      await Kit.create({
        ...finalValidation.data,
        userId,
      });

    return res.status(201).json({
      kit,
    });
  } catch (error) {
    console.error(
      "Create kit error:",
      error,
    );

    return sendError(
      res,
      500,
      "CREATE_KIT_FAILED",
      "Failed to create interview kit.",
    );
  }
}

/* =========================================================
   LIST KITS
   ========================================================= */

export async function listKits(
  req: Request,
  res: Response,
) {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication required.",
      );
    }

    const kits =
      await Kit.find({
        userId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.json({
      kits,
    });
  } catch (error) {
    console.error(
      "List kits error:",
      error,
    );

    return sendError(
      res,
      500,
      "LIST_KITS_FAILED",
      "Failed to load interview kits.",
    );
  }
}

/* =========================================================
   GET KIT
   ========================================================= */

export async function getKit(
  req: Request,
  res: Response,
) {
  try {
    const userId =
      getUserId(req);

    const kitId =
      getKitId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication required.",
      );
    }

    if (!kitId) {
      return sendError(
        res,
        400,
        "INVALID_KIT_ID",
        "Invalid kit ID.",
      );
    }

    const kit =
      await Kit.findOne({
        _id: kitId,
        userId,
      }).lean();

    if (!kit) {
      return sendError(
        res,
        404,
        "KIT_NOT_FOUND",
        "Interview kit not found.",
      );
    }

    return res.json({
      kit,
    });
  } catch (error) {
    console.error(
      "Get kit error:",
      error,
    );

    return sendError(
      res,
      500,
      "GET_KIT_FAILED",
      "Failed to load interview kit.",
    );
  }
}

/* =========================================================
   UPDATE KIT
   ========================================================= */

export async function updateKit(
  req: Request,
  res: Response,
) {
  try {
    const userId =
      getUserId(req);

    const kitId =
      getKitId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication required.",
      );
    }

    if (!kitId) {
      return sendError(
        res,
        400,
        "INVALID_KIT_ID",
        "Invalid kit ID.",
      );
    }

    const validation =
      UpdateKitSchema.safeParse(
        req.body,
      );

    if (!validation.success) {
      return sendError(
        res,
        400,
        "INVALID_UPDATE",
        validation.error.message,
      );
    }

    const kit =
      await Kit.findOneAndUpdate(
        {
          _id: kitId,
          userId,
        },
        {
          $set:
            validation.data,
        },
        {
          new: true,
          runValidators: true,
        },
      ).lean();

    if (!kit) {
      return sendError(
        res,
        404,
        "KIT_NOT_FOUND",
        "Interview kit not found.",
      );
    }

    return res.json({
      kit,
    });
  } catch (error) {
    console.error(
      "Update kit error:",
      error,
    );

    return sendError(
      res,
      500,
      "UPDATE_KIT_FAILED",
      "Failed to update interview kit.",
    );
  }
}

/* =========================================================
   DELETE KIT
   ========================================================= */

export async function deleteKit(
  req: Request,
  res: Response,
) {
  try {
    const userId =
      getUserId(req);

    const kitId =
      getKitId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication required.",
      );
    }

    if (!kitId) {
      return sendError(
        res,
        400,
        "INVALID_KIT_ID",
        "Invalid kit ID.",
      );
    }

    const kit =
      await Kit.findOneAndDelete({
        _id: kitId,
        userId,
      });

    if (!kit) {
      return sendError(
        res,
        404,
        "KIT_NOT_FOUND",
        "Interview kit not found.",
      );
    }

    return res.json({
      message:
        "Interview kit deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete kit error:",
      error,
    );

    return sendError(
      res,
      500,
      "DELETE_KIT_FAILED",
      "Failed to delete interview kit.",
    );
  }
}

/* =========================================================
   REGENERATE COMPANY BRIEF
   ========================================================= */

export async function regenerateCompanyBrief(
  req: Request,
  res: Response,
) {
  try {
    const userId =
      getUserId(req);

    const kitId =
      getKitId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication required.",
      );
    }

    if (!kitId) {
      return sendError(
        res,
        400,
        "INVALID_KIT_ID",
        "Invalid kit ID.",
      );
    }

    const kit =
      await Kit.findOne({
        _id: kitId,
        userId,
      });

    if (!kit) {
      return sendError(
        res,
        404,
        "KIT_NOT_FOUND",
        "Interview kit not found.",
      );
    }

    const research =
      await researchCompany(
        kit.source.company_url,
      );

    const companyBrief =
      createCompanyBrief(
        kit.source.company,
        research,
      );

    kit.company_brief =
      companyBrief;

    kit.source.researched_at =
      new Date().toISOString();

    kit.source.pages_used =
      research.pagesUsed;

    await kit.save();

    return res.json({
      kit,
    });
  } catch (error) {
    console.error(
      "Regenerate company brief error:",
      error,
    );

    return sendError(
      res,
      500,
      "REGENERATE_COMPANY_BRIEF_FAILED",
      "Failed to regenerate company brief.",
    );
  }
}

/* =========================================================
   REGENERATE QUESTIONS
   ========================================================= */

export async function regenerateQuestions(
  req: Request,
  res: Response,
) {
  try {
    const userId =
      getUserId(req);

    const kitId =
      getKitId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication required.",
      );
    }

    if (!kitId) {
      return sendError(
        res,
        400,
        "INVALID_KIT_ID",
        "Invalid kit ID.",
      );
    }

    const validation =
      RegenerateQuestionsSchema.safeParse(
        req.body,
      );

    if (!validation.success) {
      return sendError(
        res,
        400,
        "INVALID_REGENERATION_CATEGORY",
        validation.error.message,
      );
    }

    const kit =
      await Kit.findOne({
        _id: kitId,
        userId,
      });

    if (!kit) {
      return sendError(
        res,
        404,
        "KIT_NOT_FOUND",
        "Interview kit not found.",
      );
    }

    const research =
      await researchCompany(
        kit.source.company_url,
      );

    const role = {
      title:
        kit.role.title,

      seniority:
        kit.role.seniority,

      responsibilities:
        kit.role.responsibilities,

      requirements:
        kit.role.requirements,
    };

    const existingQuestions =
      kit.questions.map(
        (
          question: typeof kit.questions[number],
        ) => ({
          id: question.id,

          requirement_ids:
            question.requirement_ids,

          category:
            question.category,

          prompt:
            question.prompt,

          answer_outline:
            question.answer_outline,

          difficulty:
            normalizeDifficulty(
              question.difficulty,
            ),

          edited:
            question.edited ??
            false,

          pinned:
            question.pinned ??
            false,
        }),
      );

    const category =
      validation.data.category;

    const questions =
      category === "all"
        ? regenerateAllQuestions(
            role,
            research,
            existingQuestions,
          )
        : regenerateQuestionCategory(
            role,
            research,
            existingQuestions,
            category as QuestionCategory,
          );

    kit.questions =
      questions as typeof kit.questions;

    /*
     * Rebuild deterministic schedule so
     * every question ID remains valid.
     */
    const schedule =
      buildSchedule(
        kit.schedule
          .days_available,

        questions,

        role.requirements,
      );

    kit.schedule =
      schedule as typeof kit.schedule;

    await kit.save();

    return res.json({
      kit,
    });
  } catch (error) {
    console.error(
      "Regenerate questions error:",
      error,
    );

    return sendError(
      res,
      500,
      "REGENERATE_QUESTIONS_FAILED",
      "Failed to regenerate questions.",
    );
  }
}

/* =========================================================
   REGENERATE SCHEDULE
   ========================================================= */

export async function regenerateSchedule(
  req: Request,
  res: Response,
) {
  try {
    const userId =
      getUserId(req);

    const kitId =
      getKitId(req);

    if (!userId) {
      return sendError(
        res,
        401,
        "UNAUTHORIZED",
        "Authentication required.",
      );
    }

    if (!kitId) {
      return sendError(
        res,
        400,
        "INVALID_KIT_ID",
        "Invalid kit ID.",
      );
    }

    const kit =
      await Kit.findOne({
        _id: kitId,
        userId,
      });

    if (!kit) {
      return sendError(
        res,
        404,
        "KIT_NOT_FOUND",
        "Interview kit not found.",
      );
    }

    const questions =
      kit.questions.map(
        (
          question: typeof kit.questions[number],
        ) => ({
          id: question.id,

          requirement_ids:
            question.requirement_ids,

          category:
            question.category,

          prompt:
            question.prompt,

          answer_outline:
            question.answer_outline,

          difficulty:
            normalizeDifficulty(
              question.difficulty,
            ),

          edited:
            question.edited ??
            false,

          pinned:
            question.pinned ??
            false,
        }),
      );

    const schedule =
      buildSchedule(
        kit.schedule
          .days_available,

        questions,

        kit.role.requirements,
      );

    kit.schedule =
      schedule as typeof kit.schedule;

    await kit.save();

    return res.json({
      kit,
    });
  } catch (error) {
    console.error(
      "Regenerate schedule error:",
      error,
    );

    return sendError(
      res,
      500,
      "REGENERATE_SCHEDULE_FAILED",
      "Failed to regenerate interview schedule.",
    );
  }
}