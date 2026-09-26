"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Kit = {
  _id: string;
  source: {
    company: string;
    role: string;
    location: string;
  };
  questions?: unknown[];
  flashcards?: unknown[];
  schedule?: {
    days_available: number;
  };
};

type User = {
  email: string;
  name?: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [kits, setKits] = useState<Kit[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setError("");

        // Check logged-in user first.
        const userData = await apiFetch<{ user: User }>("/auth/me");

        if (!mounted) {
          return;
        }

        setUser(userData.user);

        // Load the user's interview kits.
        const kitsData = await apiFetch<{ kits: Kit[] }>("/kits");

        if (!mounted) {
          return;
        }

        setKits(kitsData.kits ?? []);
      } catch (err) {
        console.error("Dashboard load error:", err);

        if (!mounted) {
          return;
        }

        // A signed-out user should be sent to the login page.
        if (
          err instanceof Error &&
          (
            err.message === "Authentication required" ||
            err.message === "Not authenticated" ||
            err.message === "User no longer exists"
          )
        ) {
          router.push("/login");
          return;
        }

        setError("Unable to load your interview kits.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      setError("");

      await apiFetch("/auth/logout", {
        method: "POST",
      });

      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      setLoggingOut(false);
      setError("Unable to logout. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-blue-400">
              Trao AI
            </p>

            <h1 className="text-4xl font-bold">
              Interview Dashboard
            </h1>

            <p className="mt-2 text-slate-400">
              Manage your personalized interview preparation kits.
            </p>
          </div>

          {/* User information + actions */}
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {user && (
              <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3">
                <p className="text-xs text-slate-400">
                  Logged in as
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  {user.email}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-lg border border-red-800 bg-red-950/40 px-5 py-3 font-medium text-red-300 transition hover:bg-red-900/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>

            <a
              href="/dashboard/create-kit"
              className="rounded-lg bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500"
            >
              + Create Kit
            </a>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">
              Loading your interview kits...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-red-300">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && kits.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-12 text-center">
            <h2 className="text-2xl font-semibold">
              No interview kits yet
            </h2>

            <p className="mt-2 text-slate-400">
              Create your first personalized interview preparation kit.
            </p>

            <a
              href="/dashboard/create-kit"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-500"
            >
              Create Interview Kit
            </a>
          </div>
        )}

        {/* Kits */}
        {!loading && !error && kits.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {kits.map((kit) => (
              <div
                key={kit._id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500"
              >
                <p className="text-sm text-blue-400">
                  {kit.source.company}
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  {kit.source.role}
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  📍 {kit.source.location}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-800 p-3">
                    <p className="text-xs text-slate-400">
                      Questions
                    </p>

                    <p className="mt-1 text-lg font-semibold">
                      {kit.questions?.length ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-800 p-3">
                    <p className="text-xs text-slate-400">
                      Flashcards
                    </p>

                    <p className="mt-1 text-lg font-semibold">
                      {kit.flashcards?.length ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-slate-800 p-3">
                  <p className="text-xs text-slate-400">
                    Preparation plan
                  </p>

                  <p className="mt-1">
                    {kit.schedule?.days_available ?? 0} days
                  </p>
                </div>

                <a
                  href={`/kits/${kit._id}`}
                  className="mt-6 block rounded-lg border border-slate-700 px-4 py-3 text-center font-medium hover:bg-slate-800"
                >
                  View Interview Kit →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}