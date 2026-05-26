import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncCronometerForUser } from "@/lib/cronometer/sync";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { date?: string; days?: number } = {};
  try {
    body = (await request.json()) as { date?: string; days?: number };
  } catch {
    body = {};
  }

  const result = await syncCronometerForUser(supabase, user.id, body);

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result);
}
