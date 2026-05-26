import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ChartsView, type ChartRow } from "./view";

type ChartsPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
};

type SymptomRow = {
  date: string;
  scores: Record<string, number>;
};

type NutritionRow = {
  entry_date: string;
  data: { value?: number | string | null } | null;
  variables:
    | { name: string }
    | { name: string }[]
    | null;
};

type SleepRow = {
  hours: number | null;
  rhr: number | null;
  hrv: number | null;
  sleep_score: number | null;
  wake_time: string | null;
};

type ExerciseRow = {
  duration_min: number | null;
  intensity: number | null;
  done_at: string;
};

export default async function ChartsPage({ searchParams }: ChartsPageProps) {
  const { from, to } = await searchParams;
  const toDate = to && isValidDateOnly(to) ? to : todayDate();
  const fromDate = from && isValidDateOnly(from) ? from : addDays(toDate, -30);
  const afterToDate = addDays(toDate, 1);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [symptoms, nutrition, sleep, exercise] = await Promise.all([
    supabase
      .from("symptoms")
      .select("date, scores")
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true }),
    supabase
      .from("journal_entries")
      .select("entry_date, data, variables(name)")
      .eq("bucket", "nutrition")
      .gte("entry_date", fromDate)
      .lte("entry_date", toDate),
    supabase
      .from("sleep")
      .select("hours, rhr, hrv, sleep_score, wake_time")
      .gte("wake_time", fromDate)
      .lt("wake_time", afterToDate),
    supabase
      .from("exercise")
      .select("duration_min, intensity, done_at")
      .gte("done_at", fromDate)
      .lt("done_at", afterToDate),
  ]);

  const rows = buildChartRows({
    exercise: (exercise.data ?? []) as ExerciseRow[],
    nutrition: (nutrition.data ?? []) as NutritionRow[],
    fromDate,
    sleep: (sleep.data ?? []) as SleepRow[],
    symptoms: (symptoms.data ?? []) as SymptomRow[],
    toDate,
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link className="text-sm font-medium text-teal-800" href="/dashboard">
              Back to dashboard
            </Link>
            <h1 className="mt-4 text-2xl font-semibold text-slate-950">
              Charts
            </h1>
          </div>

          <form className="flex flex-wrap items-end gap-3" method="get">
            <DateInput label="From" name="from" value={fromDate} />
            <DateInput label="To" name="to" value={toDate} />
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white"
              type="submit"
            >
              Update
            </button>
          </form>
        </header>

        <ChartsView rows={rows} />
      </div>
    </main>
  );
}

function DateInput({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
        defaultValue={value}
        name={name}
        type="date"
      />
    </label>
  );
}

function buildChartRows({
  exercise,
  nutrition,
  fromDate,
  sleep,
  symptoms,
  toDate,
}: {
  exercise: ExerciseRow[];
  nutrition: NutritionRow[];
  fromDate: string;
  sleep: SleepRow[];
  symptoms: SymptomRow[];
  toDate: string;
}) {
  const rows = new Map<string, ChartRow>();

  for (const date of datesBetween(fromDate, toDate)) {
    rows.set(date, { date });
  }

  for (const row of symptoms) {
    const chartRow = rows.get(row.date);
    if (!chartRow) continue;
    chartRow.fatigue = row.scores.fatigue;
    chartRow.pain = row.scores.pain;
    chartRow.brain_fog = row.scores.brain_fog;
    chartRow.mood = row.scores.mood;
  }

  for (const row of nutrition) {
    const chartRow = rows.get(row.entry_date);
    if (!chartRow) continue;
    const name = nutritionName(row.variables);
    const value = toNumber(row.data?.value);
    if (value === null) continue;
    if (name === "Calories") chartRow.calories = value;
    else if (name === "Protein") chartRow.protein = value;
    else if (name === "Carbs") chartRow.carbs = value;
    else if (name === "Fat") chartRow.fat = value;
    else if (name === "Fiber") chartRow.fiber = value;
  }

  for (const row of sleep) {
    if (!row.wake_time) continue;
    const chartRow = rows.get(dateOnly(row.wake_time));
    if (!chartRow) continue;
    chartRow.sleep_hours = row.hours ?? chartRow.sleep_hours;
    chartRow.sleep_score = row.sleep_score ?? chartRow.sleep_score;
    chartRow.rhr = row.rhr ?? chartRow.rhr;
    chartRow.hrv = row.hrv ?? chartRow.hrv;
  }

  for (const row of exercise) {
    const chartRow = rows.get(dateOnly(row.done_at));
    if (!chartRow) continue;
    chartRow.exercise_minutes = addValue(
      chartRow.exercise_minutes,
      row.duration_min,
    );
    chartRow.exercise_intensity = row.intensity ?? chartRow.exercise_intensity;
  }

  return Array.from(rows.values());
}

function addValue(current: number | undefined, next: number | null) {
  return next === null ? current : (current ?? 0) + next;
}

function nutritionName(
  variables: { name: string } | { name: string }[] | null,
): string | null {
  if (!variables) return null;
  if (Array.isArray(variables)) return variables[0]?.name ?? null;
  return variables.name;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function datesBetween(fromDate: string, toDate: string) {
  const dates: string[] = [];
  let current = fromDate;

  while (current <= toDate) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

function dateOnly(value: string) {
  return value.slice(0, 10);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateOnlyValue: string, days: number) {
  const date = new Date(`${dateOnlyValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isValidDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}
