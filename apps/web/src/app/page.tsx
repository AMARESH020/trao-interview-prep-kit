import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/80 p-10 shadow-2xl">
        <div className="text-center">
          <p className="text-lg font-semibold text-blue-400">
            Trao AI
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Interview Prep Kit
          </h1>

          <p className="mt-4 text-lg text-slate-400">
            AI-powered interview preparation platform
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-500"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="rounded-xl border border-slate-600 bg-slate-800 px-7 py-3 font-semibold text-white transition hover:bg-slate-700"
            >
              Create Account
            </Link>
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-700 bg-slate-950 p-5">
          <p className="text-sm font-medium text-slate-400">
            API Status
          </p>

          <p className="mt-3 text-base text-white">
            OK: Trao API is running
          </p>
        </div>

        <div className="mt-8 text-center text-sm text-slate-500">
          Prepare smarter. Practice better. Interview with confidence.
        </div>
      </div>
    </main>
  );
}