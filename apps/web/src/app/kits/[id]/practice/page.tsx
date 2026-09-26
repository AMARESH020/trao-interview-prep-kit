"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

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

type Kit = {
  _id: string;

  source: {
    company: string;
    role: string;
  };

  flashcards: Flashcard[];
};

export default function PracticePage() {
  const params = useParams();
  const kitId = params?.id as string | undefined;

  const [kit, setKit] = useState<Kit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!kitId) return;

    async function loadKit() {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch<{ kit: Kit }>(
          `/kits/${kitId}`,
        );

        setKit(response.kit);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load practice session.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadKit();
  }, [kitId]);

  /*
   * Practice ordering:
   *
   * 1. Unpracticed cards first.
   * 2. Then lowest confidence first.
   * 3. Original array order is used as the stable tie-breaker.
   *
   * This makes the next session deterministic and focuses
   * attention on weaker flashcards.
   */
  const orderedFlashcards = useMemo(() => {
    if (!kit) return [];

    return kit.flashcards
      .map((flashcard, index) => ({
        flashcard,
        originalIndex: index,
      }))
      .sort((a, b) => {
        const aConfidence =
          a.flashcard.confidence == null
            ? 0
            : a.flashcard.confidence;

        const bConfidence =
          b.flashcard.confidence == null
            ? 0
            : b.flashcard.confidence;

        if (aConfidence !== bConfidence) {
          return aConfidence - bConfidence;
        }

        return a.originalIndex - b.originalIndex;
      })
      .map((entry) => entry.flashcard);
  }, [kit]);

  const currentCard = orderedFlashcards[currentIndex];

  const practicedCount =
    kit?.flashcards.filter(
      (flashcard) => flashcard.covered,
    ).length ?? 0;

  const totalCards = orderedFlashcards.length;

  async function saveConfidence(confidence: number) {
    if (!kit || !currentCard || !kitId) return;

    setSaving(true);
    setError("");

    const updatedFlashcards = kit.flashcards.map(
      (flashcard) =>
        flashcard.id === currentCard.id
          ? {
              ...flashcard,
              confidence,
              covered: true,
            }
          : flashcard,
    );

    try {
      const response = await apiFetch<{ kit: Kit }>(
        `/kits/${kitId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            flashcards: updatedFlashcards,
          }),
        },
      );

      setKit(response.kit);
      setShowAnswer(false);

      /*
       * Stay within bounds when moving to the next card.
       */
      setCurrentIndex((index) =>
        index + 1 < orderedFlashcards.length
          ? index + 1
          : 0,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save practice result.",
      );
    } finally {
      setSaving(false);
    }
  }

  function restartSession() {
    setCurrentIndex(0);
    setShowAnswer(false);
    setError("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
        <div className="mx-auto max-w-3xl">
          <p className="text-slate-400">
            Loading practice session...
          </p>
        </div>
      </main>
    );
  }

  if (error && !kit) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-red-900 bg-red-950/30 p-6">
            <h1 className="text-lg font-semibold">
              Practice session unavailable
            </h1>

            <p className="mt-2 text-sm text-red-300">
              {error}
            </p>

            <Link
              href={`/kits/${kitId}`}
              className="mt-4 inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Back to Interview Kit
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!kit || totalCards === 0) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/kits/${kitId}`}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Interview Kit
          </Link>

          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h1 className="text-2xl font-semibold">
              No flashcards available
            </h1>

            <p className="mt-2 text-slate-400">
              Add flashcards in the Builder before starting
              practice.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href={`/kits/${kitId}`}
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Back to Interview Kit
            </Link>

            <h1 className="mt-3 text-3xl font-bold">
              Flashcard Practice
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              {kit.source.company} · {kit.source.role}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm">
            <div className="text-slate-400">
              Practiced
            </div>

            <div className="mt-1 text-xl font-semibold">
              {practicedCount}/{totalCards}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
            <span>
              Card {currentIndex + 1} of {totalCards}
            </span>

            <span>
              {currentCard?.covered
                ? "Previously practiced"
                : "Needs practice"}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{
                width: `${((currentIndex + 1) / totalCards) * 100}%`,
              }}
            />
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-10">
          <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Question
          </div>

          <h2 className="mt-4 text-2xl font-semibold leading-relaxed sm:text-3xl">
            {currentCard.front}
          </h2>

          {currentCard.requirement_ids.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {currentCard.requirement_ids.map(
                (requirementId) => (
                  <span
                    key={requirementId}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400"
                  >
                    {requirementId}
                  </span>
                ),
              )}
            </div>
          )}

          <div className="mt-10 border-t border-slate-800 pt-8">
            {!showAnswer ? (
              <button
                type="button"
                onClick={() => setShowAnswer(true)}
                className="w-full rounded-xl bg-white px-5 py-4 font-medium text-slate-950 transition hover:bg-slate-200"
              >
                Reveal Answer
              </button>
            ) : (
              <>
                <div className="rounded-xl border border-slate-700 bg-slate-950 p-5">
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Answer
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-200">
                    {currentCard.back}
                  </p>
                </div>

                <div className="mt-8">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">
                      How confident are you?
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      Your confidence determines the order of
                      future practice sessions.
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map(
                      (confidence) => (
                        <button
                          key={confidence}
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            saveConfidence(confidence)
                          }
                          className={`rounded-xl border px-3 py-4 text-center transition ${
                            currentCard.confidence ===
                            confidence
                              ? "border-white bg-white text-slate-950"
                              : "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          <span className="block text-lg font-semibold">
                            {confidence}
                          </span>

                          <span className="mt-1 block text-[10px] text-slate-400">
                            {confidence === 1
                              ? "Low"
                              : confidence === 5
                                ? "High"
                                : ""}
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setCurrentIndex((index) =>
                index > 0
                  ? index - 1
                  : totalCards - 1,
              );
              setShowAnswer(false);
            }}
            disabled={saving}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Previous
          </button>

          <button
            type="button"
            onClick={restartSession}
            disabled={saving}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Restart Session
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentIndex((index) =>
                index + 1 < totalCards
                  ? index + 1
                  : 0,
              );
              setShowAnswer(false);
            }}
            disabled={saving}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-50"
          >
            Skip
          </button>
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h3 className="font-semibold">
            Practice logic
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Unpracticed flashcards appear first. After you rate
            them, lower-confidence cards are prioritized in
            future sessions.
          </p>
        </div>
      </div>
    </main>
  );
}