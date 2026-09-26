"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiFetch } from "../../../lib/api";

type Requirement = {
  id: string;
  text: string;
  kind: "technical" | "behavioural" | "domain";
  priority: "must" | "nice";
};

type Question = {
  id: string;
  requirement_ids: string[];
  category:
    | "technical"
    | "behavioural"
    | "system-design"
    | "company-fit";
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
  edited?: boolean;
  pinned?: boolean;
};

type Flashcard = {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  edited?: boolean;
  pinned?: boolean;
  confidence?: number | null;
  covered?: boolean;
};

type ScheduleDay = {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
};

type Kit = {
  _id: string;

  source: {
    company: string;
    company_url: string;
    role: string;
    location: string;
    jd_chars: number;
    researched_at: string;
    pages_used: string[];
  };

  company_brief: {
    summary: string;
    what_they_do: string;
    sources: string[];
  };

  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Requirement[];
  };

  questions: Question[];

  flashcards: Flashcard[];

  schedule: {
    days_available: number;
    days: ScheduleDay[];
  };

  coverage: {
    uncovered_requirement_ids: string[];
    passes: number;
  };
};

const categories: Question["category"][] = [
  "technical",
  "behavioural",
  "system-design",
  "company-fit",
];

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export default function InterviewKitPage() {
  const params = useParams();
  const router = useRouter();

  const kitId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [kit, setKit] = useState<Kit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!kitId) {
      setError("Invalid kit ID.");
      setLoading(false);
      return;
    }

    async function loadKit() {
      try {
        const response = await apiFetch<{ kit: Kit }>(
          `/kits/${kitId}`
        );

        setKit(response.kit);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load interview kit."
        );
      } finally {
        setLoading(false);
      }
    }

    loadKit();
  }, [kitId]);

  function updateBrief(
    field: "summary" | "what_they_do",
    value: string
  ) {
    setKit((current) =>
      current
        ? {
            ...current,
            company_brief: {
              ...current.company_brief,
              [field]: value,
            },
          }
        : current
    );
  }

  function updateQuestion(
    questionId: string,
    field: keyof Question,
    value: string | number | boolean
  ) {
    setKit((current) => {
      if (!current) return current;

      return {
        ...current,
        questions: current.questions.map((question) =>
          question.id === questionId
            ? {
                ...question,
                [field]: value,
                edited: true,
              }
            : question
        ),
      };
    });
  }

  function updateFlashcard(
    flashcardId: string,
    field: "front" | "back",
    value: string
  ) {
    setKit((current) => {
      if (!current) return current;

      return {
        ...current,
        flashcards: current.flashcards.map((flashcard) =>
          flashcard.id === flashcardId
            ? {
                ...flashcard,
                [field]: value,
                edited: true,
              }
            : flashcard
        ),
      };
    });
  }

  function toggleQuestionPinned(questionId: string) {
    setKit((current) => {
      if (!current) return current;

      return {
        ...current,
        questions: current.questions.map((question) =>
          question.id === questionId
            ? {
                ...question,
                pinned: !question.pinned,
                edited: true,
              }
            : question
        ),
      };
    });
  }

  function toggleFlashcardPinned(flashcardId: string) {
    setKit((current) => {
      if (!current) return current;

      return {
        ...current,
        flashcards: current.flashcards.map((flashcard) =>
          flashcard.id === flashcardId
            ? {
                ...flashcard,
                pinned: !flashcard.pinned,
                edited: true,
              }
            : flashcard
        ),
      };
    });
  }

  function deleteQuestion(questionId: string) {
    if (!window.confirm("Delete this question?")) return;

    setKit((current) =>
      current
        ? {
            ...current,
            questions: current.questions.filter(
              (question) => question.id !== questionId
            ),
          }
        : current
    );
  }

  function deleteFlashcard(flashcardId: string) {
    if (!window.confirm("Delete this flashcard?")) return;

    setKit((current) =>
      current
        ? {
            ...current,
            flashcards: current.flashcards.filter(
              (flashcard) => flashcard.id !== flashcardId
            ),
          }
        : current
    );
  }

  function addQuestion() {
    const requirementId =
      kit?.role.requirements[0]?.id || "";

    const question: Question = {
      id: createId("question"),
      requirement_ids: requirementId
        ? [requirementId]
        : [],
      category: "technical",
      prompt: "Add your interview question here.",
      answer_outline:
        "Add the key points you would use to answer this question.",
      difficulty: 2,
      edited: true,
      pinned: true,
    };

    setKit((current) =>
      current
        ? {
            ...current,
            questions: [...current.questions, question],
          }
        : current
    );
  }

  function addFlashcard() {
    const requirementId =
      kit?.role.requirements[0]?.id || "";

    const flashcard: Flashcard = {
      id: createId("flashcard"),
      front: "Add flashcard question",
      back: "Add flashcard answer",
      requirement_ids: requirementId
        ? [requirementId]
        : [],
      edited: true,
      pinned: true,
    };

    setKit((current) =>
      current
        ? {
            ...current,
            flashcards: [...current.flashcards, flashcard],
          }
        : current
    );
  }

  function moveQuestion(
    questionId: string,
    direction: "up" | "down"
  ) {
    setKit((current) => {
      if (!current) return current;

      const questions = [...current.questions];
      const index = questions.findIndex(
        (question) => question.id === questionId
      );

      if (index === -1) return current;

      const targetIndex =
        direction === "up" ? index - 1 : index + 1;

      if (
        targetIndex < 0 ||
        targetIndex >= questions.length
      ) {
        return current;
      }

      [questions[index], questions[targetIndex]] = [
        questions[targetIndex],
        questions[index],
      ];

      return {
        ...current,
        questions,
      };
    });
  }

  async function saveKit() {
    if (!kit) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch<{ kit: Kit }>(
        `/kits/${kitId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            company_brief: kit.company_brief,
            questions: kit.questions,
            flashcards: kit.flashcards,
          }),
        }
      );

      setKit(response.kit);
      setSuccess("Changes saved successfully.");

      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save changes."
      );
    } finally {
      setSaving(false);
    }
  }

  async function regenerateQuestions(
    category?: Question["category"]
  ) {
    if (!kitId) return;

    setRegenerating(
      category
        ? `questions-${category}`
        : "questions"
    );
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch<{ kit: Kit }>(
        `/kits/${kitId}/regenerate/questions`,
        {
          method: "POST",
          body: JSON.stringify(
            category ? { category } : {}
          ),
        }
      );

      setKit(response.kit);
      setSuccess(
        category
          ? `${category} questions regenerated.`
          : "Questions regenerated."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to regenerate questions."
      );
    } finally {
      setRegenerating("");
    }
  }

  async function regenerateCompanyBrief() {
    if (!kitId) return;

    setRegenerating("company-brief");
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch<{ kit: Kit }>(
        `/kits/${kitId}/regenerate/company-brief`,
        {
          method: "POST",
        }
      );

      setKit(response.kit);
      setSuccess("Company brief regenerated.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to regenerate company brief."
      );
    } finally {
      setRegenerating("");
    }
  }

  async function regenerateSchedule() {
    if (!kitId) return;

    setRegenerating("schedule");
    setError("");
    setSuccess("");

    try {
      const response = await apiFetch<{ kit: Kit }>(
        `/kits/${kitId}/regenerate/schedule`,
        {
          method: "POST",
        }
      );

      setKit(response.kit);
      setSuccess("Preparation schedule regenerated.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to regenerate schedule."
      );
    } finally {
      setRegenerating("");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <p className="text-slate-400">
              Loading interview kit...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !kit) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-8 text-blue-400 hover:text-blue-300"
          >
            ← Back to Dashboard
          </button>

          <div className="rounded-2xl border border-red-900 bg-red-950/30 p-8">
            <h1 className="mb-2 text-xl font-semibold">
              Unable to load interview kit
            </h1>

            <p className="text-slate-400">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!kit) return null;

  const coveredRequirements =
    kit.role.requirements.length -
    kit.coverage.uncovered_requirement_ids.length;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-6">
      <div className="mx-auto max-w-7xl">

        {/* Top navigation */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            ← Back to Dashboard
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (!kitId) {
                  setError("Kit ID is missing.");
                  return;
                }

                router.push(`/kits/${kitId}/practice`);
              }}
              className="rounded-lg border border-emerald-700 px-5 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-950"
            >
              Practice Flashcards
            </button>

            <button
              type="button"
              onClick={saveKit}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {success && (
          <div className="mb-6 rounded-lg border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-400">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Header */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-blue-400">
                {kit.source.company}
              </p>

              <h1 className="text-3xl font-bold md:text-4xl">
                {kit.role.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
                <span>
                  📍 {kit.source.location}
                </span>

                <span>
                  • {kit.role.seniority}
                </span>

                <span>
                  • {kit.schedule.days_available} days
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-blue-900 bg-blue-950/20 px-5 py-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Builder Mode
              </p>

              <p className="mt-1 font-semibold text-blue-400">
                Editable Interview Kit
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Questions
            </p>

            <p className="mt-2 text-3xl font-bold">
              {kit.questions.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Flashcards
            </p>

            <p className="mt-2 text-3xl font-bold">
              {kit.flashcards.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Requirements covered
            </p>

            <p className="mt-2 text-3xl font-bold">
              {coveredRequirements}/
              {kit.role.requirements.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Coverage passes
            </p>

            <p className="mt-2 text-3xl font-bold">
              {kit.coverage.passes}
            </p>
          </div>
        </section>

        {/* Company Brief */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                Company Brief
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Edit the generated company research.
              </p>
            </div>

            <button
              onClick={regenerateCompanyBrief}
              disabled={regenerating === "company-brief"}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {regenerating === "company-brief"
                ? "Regenerating..."
                : "Regenerate Brief"}
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-blue-400">
                Summary
              </label>

              <textarea
                value={kit.company_brief.summary}
                onChange={(event) =>
                  updateBrief(
                    "summary",
                    event.target.value
                  )
                }
                rows={5}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-200 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-blue-400">
                What They Do
              </label>

              <textarea
                value={kit.company_brief.what_they_do}
                onChange={(event) =>
                  updateBrief(
                    "what_they_do",
                    event.target.value
                  )
                }
                rows={5}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Requirements */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <h2 className="mb-2 text-2xl font-semibold">
            Role Requirements
          </h2>

          <p className="mb-6 text-sm text-slate-400">
            These extracted requirements drive question coverage.
          </p>

          <div className="space-y-4">
            {kit.role.requirements.map(
              (requirement) => (
                <div
                  key={requirement.id}
                  className="rounded-xl border border-slate-700 bg-slate-950 p-5"
                >
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
                      {requirement.kind}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        requirement.priority === "must"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {requirement.priority}
                    </span>

                    {!kit.coverage.uncovered_requirement_ids.includes(
                      requirement.id
                    ) && (
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                        Covered
                      </span>
                    )}
                  </div>

                  <p className="text-slate-200">
                    {requirement.text}
                  </p>
                </div>
              )
            )}
          </div>
        </section>

        {/* Questions */}
        <section className="mb-8">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                Interview Questions
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Edit, reorder, pin, delete, add, or regenerate questions.
              </p>
            </div>

            <button
              onClick={addQuestion}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
            >
              + Add Question
            </button>
          </div>

          {/* Regeneration controls */}
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() =>
                  regenerateQuestions(category)
                }
                disabled={
                  regenerating ===
                  `questions-${category}`
                }
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                {regenerating ===
                `questions-${category}`
                  ? "Generating..."
                  : `Regenerate ${category}`}
              </button>
            ))}
          </div>

          <div className="space-y-5">
            {kit.questions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
                <p className="text-slate-400">
                  No questions yet.
                </p>

                <button
                  onClick={addQuestion}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
                >
                  Add First Question
                </button>
              </div>
            ) : (
              kit.questions.map(
                (question, index) => (
                  <article
                    key={question.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5 md:p-6"
                  >
                    {/* Question toolbar */}
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
                          Question {index + 1}
                        </span>

                        {question.edited && (
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                            Edited
                          </span>
                        )}

                        {question.pinned && (
                          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
                            📌 Pinned
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            moveQuestion(
                              question.id,
                              "up"
                            )
                          }
                          disabled={index === 0}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800 disabled:opacity-30"
                        >
                          ↑
                        </button>

                        <button
                          onClick={() =>
                            moveQuestion(
                              question.id,
                              "down"
                            )
                          }
                          disabled={
                            index ===
                            kit.questions.length - 1
                          }
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800 disabled:opacity-30"
                        >
                          ↓
                        </button>

                        <button
                          onClick={() =>
                            toggleQuestionPinned(
                              question.id
                            )
                          }
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800"
                        >
                          {question.pinned
                            ? "Unpin"
                            : "Pin"}
                        </button>

                        <button
                          onClick={() =>
                            deleteQuestion(
                              question.id
                            )
                          }
                          className="rounded-lg border border-red-900 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Category + difficulty */}
                    <div className="mb-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs text-slate-400">
                          Category
                        </label>

                        <select
                          value={question.category}
                          onChange={(event) =>
                            updateQuestion(
                              question.id,
                              "category",
                              event.target
                                .value as Question["category"]
                            )
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
                        >
                          {categories.map(
                            (category) => (
                              <option
                                key={category}
                                value={category}
                              >
                                {category}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs text-slate-400">
                          Difficulty
                        </label>

                        <select
                          value={question.difficulty}
                          onChange={(event) =>
                            updateQuestion(
                              question.id,
                              "difficulty",
                              Number(
                                event.target.value
                              )
                            )
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
                        >
                          <option value={1}>
                            1 — Easy
                          </option>
                          <option value={2}>
                            2 — Medium
                          </option>
                          <option value={3}>
                            3 — Hard
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Prompt */}
                    <div className="mb-5">
                      <label className="mb-2 block text-sm font-medium text-blue-400">
                        Question
                      </label>

                      <textarea
                        value={question.prompt}
                        onChange={(event) =>
                          updateQuestion(
                            question.id,
                            "prompt",
                            event.target.value
                          )
                        }
                        rows={4}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Answer */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-blue-400">
                        Answer Outline
                      </label>

                      <textarea
                        value={question.answer_outline}
                        onChange={(event) =>
                          updateQuestion(
                            question.id,
                            "answer_outline",
                            event.target.value
                          )
                        }
                        rows={6}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-200 outline-none focus:border-blue-500"
                      />
                    </div>
                  </article>
                )
              )
            )}
          </div>
        </section>

        {/* Flashcards */}
        <section className="mb-8">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                Flashcards
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Edit or manage your interview flashcards.
              </p>
            </div>

            <button
              onClick={addFlashcard}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-500"
            >
              + Add Flashcard
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {kit.flashcards.map(
              (flashcard, index) => (
                <article
                  key={flashcard.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-blue-400">
                        Flashcard {index + 1}
                      </span>

                      {flashcard.edited && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                          Edited
                        </span>
                      )}

                      {flashcard.pinned && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                          📌
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          toggleFlashcardPinned(
                            flashcard.id
                          )
                        }
                        className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs hover:bg-slate-800"
                      >
                        {flashcard.pinned
                          ? "Unpin"
                          : "Pin"}
                      </button>

                      <button
                        onClick={() =>
                          deleteFlashcard(
                            flashcard.id
                          )
                        }
                        className="rounded-lg border border-red-900 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-950"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <label className="mb-2 block text-xs text-slate-400">
                    Front
                  </label>

                  <textarea
                    value={flashcard.front}
                    onChange={(event) =>
                      updateFlashcard(
                        flashcard.id,
                        "front",
                        event.target.value
                      )
                    }
                    rows={3}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-200 outline-none focus:border-blue-500"
                  />

                  <label className="mb-2 mt-4 block text-xs text-slate-400">
                    Back
                  </label>

                  <textarea
                    value={flashcard.back}
                    onChange={(event) =>
                      updateFlashcard(
                        flashcard.id,
                        "back",
                        event.target.value
                      )
                    }
                    rows={4}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-slate-200 outline-none focus:border-blue-500"
                  />
                </article>
              )
            )}
          </div>
        </section>

        {/* Schedule */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                Preparation Schedule
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Deterministic schedule generated from the question set.
              </p>
            </div>

            <button
              onClick={regenerateSchedule}
              disabled={regenerating === "schedule"}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
            >
              {regenerating === "schedule"
                ? "Regenerating..."
                : "Regenerate Schedule"}
            </button>
          </div>

          <div className="space-y-4">
            {kit.schedule.days.map((day) => (
              <div
                key={day.day}
                className="rounded-xl border border-slate-700 bg-slate-950 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-blue-400">
                      Day {day.day}
                    </p>

                    <h3 className="mt-1 font-semibold">
                      {day.focus}
                    </h3>
                  </div>

                  <p className="text-sm text-slate-400">
                    {day.minutes} minutes
                  </p>
                </div>

                <p className="mt-3 text-sm text-slate-400">
                  {day.question_ids.length} question
                  {day.question_ids.length === 1
                    ? ""
                    : "s"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Sources */}
        <section className="mb-10 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:p-8">
          <h2 className="mb-5 text-2xl font-semibold">
            Research Sources
          </h2>

          {kit.company_brief.sources.length === 0 ? (
            <p className="text-slate-400">
              No accessible research sources were found.
            </p>
          ) : (
            <ul className="space-y-3">
              {kit.company_brief.sources.map(
                (source) => (
                  <li key={source}>
                    <a
                      href={source}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-blue-400 hover:text-blue-300"
                    >
                      {source}
                    </a>
                  </li>
                )
              )}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}