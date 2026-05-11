import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SleepImportRow = {
  hours: number | null;
  bedtime: string | null;
  wake_time: string | null;
  rhr: number | null;
  hrv: number | null;
  sleep_score: number | null;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const payload = (await request.json()) as { rows?: SleepImportRow[] };
  const rows = payload.rows ?? [];
  const validRows = rows.filter((row) => row.bedtime || row.wake_time);

  if (validRows.length === 0) {
    return NextResponse.json(
      { error: "No sleep rows found to import." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("sleep").insert(
    validRows.map((row) => ({
      user_id: user.id,
      hours: row.hours,
      bedtime: row.bedtime,
      wake_time: row.wake_time,
      rhr: row.rhr,
      hrv: row.hrv,
      sleep_score: row.sleep_score,
      source: "whoop_csv",
    })),
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ count: validRows.length });
}
