import { Router } from "express";

import {
  createKit,
  listKits,
  getKit,
  updateKit,
  deleteKit,
  regenerateCompanyBrief,
  regenerateQuestions,
  regenerateSchedule,
} from "../controllers/kit.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

/*
 * Every kit endpoint requires an authenticated session.
 */
router.use(requireAuth);

/* ============================================================
   KIT CRUD
   ============================================================ */

router.post("/", createKit);
router.get("/", listKits);
router.get("/:id", getKit);
router.patch("/:id", updateKit);
router.delete("/:id", deleteKit);

/* ============================================================
   BUILDER REGENERATION
   ============================================================ */

/*
 * Regenerate only the company brief.
 * Existing questions, flashcards, role and schedule remain intact.
 */
router.post(
  "/:id/regenerate/company-brief",
  regenerateCompanyBrief
);

/*
 * Regenerate all questions or one question category.
 *
 * Request body:
 * {
 *   "category": "technical"
 * }
 *
 * Valid categories are validated by the controller.
 */
router.post(
  "/:id/regenerate/questions",
  regenerateQuestions
);

/*
 * Rebuild the deterministic preparation schedule.
 */
router.post(
  "/:id/regenerate/schedule",
  regenerateSchedule
);

export default router;