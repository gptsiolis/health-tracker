import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CronometerUploader } from "./uploader";

export default async function CronometerPage() {
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
        <header className="border-b border-slate-200 pb-6">
          <Link className="text-sm font-medium text-teal-800" href="/dashboard">
            Back to dashboard
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-slate-950">
            Cronometer screenshot
          </h1>
        </header>

        <CronometerUploader />
      </div>
    </main>
  );
}
