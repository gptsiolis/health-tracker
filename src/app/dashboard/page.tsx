import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Health Tracker
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as {user.email}
            </p>
          </div>

          <form action="/logout" method="post">
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white"
              type="submit"
            >
              Log out
            </button>
          </form>
        </header>

        <section className="py-10">
          <h2 className="text-lg font-medium text-slate-950">Dashboard</h2>
          <p className="mt-2 text-slate-600">
            No entries yet. Manual logging comes next in Phase 2.
          </p>
        </section>
      </div>
    </main>
  );
}
