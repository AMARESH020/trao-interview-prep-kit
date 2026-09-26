"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function CreateKitPage() {
  const router = useRouter();

  const [company, setCompany] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [daysAvailable, setDaysAvailable] = useState(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (
      !Number.isInteger(daysAvailable) ||
      daysAvailable < 1 ||
      daysAvailable > 60
    ) {
      setError(
        "Days available must be between 1 and 60."
      );
      return;
    }

    if (!company.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!companyUrl.trim()) {
      setError("Company website is required.");
      return;
    }

    if (!role.trim()) {
      setError("Job role is required.");
      return;
    }

    if (!location.trim()) {
      setError("Location is required.");
      return;
    }

    if (jobDescription.trim().length < 20) {
      setError(
        "Job description must contain at least 20 characters."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Send only the generation inputs to the backend.
       *
       * The backend now performs:
       * JD extraction
       * company research
       * question generation
       * flashcard generation
       * coverage checking
       * second-pass generation
       * deterministic scheduling
       * final validation
       * MongoDB persistence
       */
      await apiFetch("/kits", {
        method: "POST",
        body: JSON.stringify({
          jd: jobDescription.trim(),

          source: {
            company: company.trim(),
            company_url: companyUrl.trim(),
            role: role.trim(),
            location: location.trim(),
          },

          schedule: {
            days_available: daysAvailable,
          },
        }),
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create interview kit"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-bold">Trao AI</p>

            <p className="text-xs text-slate-400">
              Interview Prep Kit
            </p>
          </div>

          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Dashboard
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-400">
            New Interview Kit
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Create your preparation kit
          </h1>

          <p className="mt-3 text-slate-400">
            Add the job and company information to create a
            personalized interview preparation kit.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          {error && (
            <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Company
            </label>

            <input
              value={company}
              onChange={(e) =>
                setCompany(e.target.value)
              }
              placeholder="Example: Trao AI"
              required
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Company Website
            </label>

            <input
              type="url"
              value={companyUrl}
              onChange={(e) =>
                setCompanyUrl(e.target.value)
              }
              placeholder="https://example.com"
              required
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:opacity-50"
            />

            <p className="mt-2 text-xs text-slate-500">
              The backend will research the website and
              rank relevant company pages automatically.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Job Role
            </label>

            <input
              value={role}
              onChange={(e) =>
                setRole(e.target.value)
              }
              placeholder="Software Engineer"
              required
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Location
            </label>

            <input
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
              placeholder="Bengaluru"
              required
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Days Available Before Interview
            </label>

            <input
              type="number"
              min={1}
              max={60}
              value={daysAvailable}
              onChange={(e) =>
                setDaysAvailable(
                  Number(e.target.value)
                )
              }
              required
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:opacity-50"
            />

            <p className="mt-2 text-xs text-slate-500">
              Enter how many days you have before the
              interview. The backend scheduler creates
              exactly this number of preparation days.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Job Description
            </label>

            <textarea
              value={jobDescription}
              onChange={(e) =>
                setJobDescription(e.target.value)
              }
              placeholder="Paste the complete job description here..."
              required
              disabled={loading}
              rows={10}
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500 disabled:opacity-50"
            />

            <p className="mt-2 text-xs text-slate-500">
              {jobDescription.length} characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Researching and generating kit..."
              : "Create Interview Kit"}
          </button>

          {loading && (
            <div className="rounded-lg border border-blue-900 bg-blue-950/30 p-4 text-sm text-blue-300">
              <p className="font-medium">
                Building your interview kit
              </p>

              <p className="mt-1 text-blue-400/80">
                Extracting requirements, researching the
                company, generating questions, checking
                coverage, and creating your study schedule.
              </p>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}