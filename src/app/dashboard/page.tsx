import { redirect } from "next/navigation";
import Link from "next/link";
import { DailyOutputsPanel } from "./daily-outputs-panel";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveDailyJournalNote } from "./actions";
import {
  VariableJournal,
  type JournalEntry,
  type Variable,
} from "./variable-journal";
import { DatePickerButton } from "./date-picker";

type DashboardPageProps = {
  searchParams: Promise<{
    date?: string;
    message?: string;
  }>;
};

type SymptomEntry = {
  id: string;
  date: string;
  scores: Record<string, number>;
  notes: string | null;
};

type SupplementEntry = {
  id: string;
  name: string;
  dose: number | null;
  unit: string | null;
  taken_at: string;
  notes: string | null;
};

type ExerciseEntry = {
  id: string;
  type: string;
  duration_min: number | null;
  intensity: number | null;
  done_at: string;
  notes: string | null;
};

type LocationEntry = {
  id: string;
  label: string;
  started_at: string;
  ended_at: string | null;
};

type FoodEntry = {
  id: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  foods_list: string[];
  eaten_at: string;
  source: string;
};

type SleepEntry = {
  id: string;
  hours: number | null;
  bedtime: string | null;
  wake_time: string | null;
  rhr: number | null;
  hrv: number | null;
  sleep_score: number | null;
};

type DailyJournalNote = {
  notes: string;
};

type SymptomDefinition = {
  id: string;
  key: string;
  name: string;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { date, message } = await searchParams;
  const selectedDate = date && isValidDateOnly(date) ? date : todayDate();
  const nextDate = addDays(selectedDate, 1);
  const previousDate = addDays(selectedDate, -1);
  const selectedDateLabel = formatDateOnly(selectedDate);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    symptoms,
    supplements,
    exercise,
    locations,
    foods,
    sleep,
    variables,
    journalEntries,
    dailyJournalNote,
    symptomDefinitions,
  ] =
    await Promise.all([
    supabase
      .from("symptoms")
      .select("id, date, scores, notes")
      .eq("date", selectedDate)
      .order("date", { ascending: false })
      .limit(7),
    supabase
      .from("supplements")
      .select("id, name, dose, unit, taken_at, notes")
      .gte("taken_at", selectedDate)
      .lt("taken_at", nextDate)
      .order("taken_at", { ascending: false })
      .limit(7),
    supabase
      .from("exercise")
      .select("id, type, duration_min, intensity, done_at, notes")
      .gte("done_at", selectedDate)
      .lt("done_at", nextDate)
      .order("done_at", { ascending: false })
      .limit(7),
    supabase
      .from("location")
      .select("id, label, started_at, ended_at")
      .gte("started_at", selectedDate)
      .lt("started_at", nextDate)
      .order("started_at", { ascending: false })
      .limit(7),
    supabase
      .from("foods")
      .select("id, calories, protein, carbs, fat, foods_list, eaten_at, source")
      .gte("eaten_at", selectedDate)
      .lt("eaten_at", nextDate)
      .order("eaten_at", { ascending: false })
      .limit(7),
    supabase
      .from("sleep")
      .select("id, hours, bedtime, wake_time, rhr, hrv, sleep_score")
      .gte("wake_time", selectedDate)
      .lt("wake_time", nextDate)
      .order("wake_time", { ascending: false })
      .limit(7),
    supabase
      .from("variables")
      .select("id, name, bucket, default_unit, default_amount, default_time, config")
      .is("archived_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("journal_entries")
      .select("id, variable_id, bucket, entry_date, time_of_day, data, notes, variables(name, config)")
      .eq("entry_date", selectedDate)
      .order("time_of_day", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("daily_journal_notes")
      .select("notes")
      .eq("date", selectedDate)
      .maybeSingle(),
    supabase
      .from("symptom_definitions")
      .select("id, key, name")
      .is("archived_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  let activeSymptomDefinitions = (symptomDefinitions.data ??
    []) as SymptomDefinition[];
  let activeVariables = (variables.data ?? []) as Variable[];

  if (activeSymptomDefinitions.length === 0) {
    const { data: seededSymptoms } = await supabase
      .from("symptom_definitions")
      .insert(
        defaultSymptomDefinitions().map((definition, index) => ({
          user_id: user.id,
          key: definition.key,
          name: definition.name,
          sort_order: index,
        })),
      )
      .select("id, key, name")
      .order("sort_order", { ascending: true });

    activeSymptomDefinitions = (seededSymptoms ?? []) as SymptomDefinition[];
  }

  if (!activeVariables.some((variable) => variable.bucket === "sleep")) {
    const { data: seededSleepVariables } = await supabase
      .from("variables")
      .insert(
        defaultSleepVariables().map((variable) => ({
          user_id: user.id,
          ...variable,
        })),
      )
      .select("id, name, bucket, default_unit, default_amount, default_time, config");

    activeVariables = [
      ...activeVariables,
      ...((seededSleepVariables ?? []) as Variable[]),
    ].sort((first, second) => first.name.localeCompare(second.name));
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Health Tracker
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as {user.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white"
              href="/charts"
            >
              Data
            </Link>
            <form action="/logout" method="post">
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white"
                type="submit"
              >
                Log out
              </button>
            </form>
          </div>
        </header>

        <section className="border-b border-slate-200 py-6">
          <div className="flex items-center justify-center gap-4">
            <Link
              aria-label="Previous day"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-xl text-slate-700 hover:bg-white"
              href={`/dashboard?date=${previousDate}`}
            >
              ‹
            </Link>
            <div className="min-w-56 text-center">
              <p className="text-sm font-medium text-slate-500">Journal date</p>
              <h2 className="text-2xl font-semibold text-slate-950">
                {selectedDateLabel}
              </h2>
            </div>
            <Link
              aria-label="Next day"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-xl text-slate-700 hover:bg-white"
              href={`/dashboard?date=${nextDate}`}
            >
              ›
            </Link>
            <DatePickerButton selectedDate={selectedDate} />
          </div>
        </section>

        {message ? (
          <p className="mt-6 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            {message}
          </p>
        ) : null}

        <VariableJournal
          entries={(journalEntries.data ?? []) as JournalEntry[]}
          selectedDate={selectedDate}
          variables={activeVariables}
        />

        <section className="pb-8">
          <DailyJournalPanel
            note={(dailyJournalNote.data as DailyJournalNote | null)?.notes ?? ""}
            selectedDate={selectedDate}
          />
        </section>

        <div className="mb-8 border-t border-slate-300" />

        <section className="pb-10">
          <DailyOutputsPanel
            selectedDate={selectedDate}
            symptomDefinitions={activeSymptomDefinitions}
            symptomEntry={((symptoms.data ?? []) as SymptomEntry[])[0] ?? null}
          />
        </section>

        <section className="pb-10">
          <EntryPanel title="Timeline">
            <Timeline
              exercise={(exercise.data ?? []) as ExerciseEntry[]}
              foods={(foods.data ?? []) as FoodEntry[]}
              locations={(locations.data ?? []) as LocationEntry[]}
              sleep={(sleep.data ?? []) as SleepEntry[]}
              supplements={(supplements.data ?? []) as SupplementEntry[]}
            />
          </EntryPanel>
        </section>
      </div>
    </main>
  );
}

function DailyJournalPanel({
  note,
  selectedDate,
}: {
  note: string;
  selectedDate: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-medium text-slate-950">Daily journal</h2>
      <form action={saveDailyJournalNote} className="mt-4 space-y-4">
        <input name="journal_date" type="hidden" value={selectedDate} />
        <textarea
          className="min-h-40 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
          defaultValue={note}
          name="journal_notes"
        />
        <div className="flex justify-end">
          <button
            className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800"
            type="submit"
          >
            Save journal
          </button>
        </div>
      </form>
    </section>
  );
}

function defaultSymptomDefinitions(): SymptomDefinition[] {
  return [
    { id: "default-fatigue", key: "fatigue", name: "Fatigue" },
    { id: "default-pain", key: "pain", name: "Pain" },
    { id: "default-brain-fog", key: "brain_fog", name: "Brain fog" },
    { id: "default-mood", key: "mood", name: "Mood" },
  ];
}

function defaultSleepVariables() {
  return [
    sleepVariable("RHR", "RHR", "bpm"),
    sleepVariable("HRV", "HRV", "ms"),
    sleepVariable("Sleep hours", "Sleep hours", "hours"),
    sleepVariable("Sleep score", "Sleep score"),
  ];
}

function sleepVariable(name: string, label: string, unit?: string) {
  return {
    name,
    bucket: "sleep",
    default_unit: null,
    default_amount: null,
    default_time: null,
    config: {
      field_type: "single_number",
      label,
      unit,
      show_time: false,
    },
  };
}

function EntryPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-medium text-slate-950">{title}</h2>
      <div className="mt-3 rounded-md border border-slate-200 bg-white p-4">
        {children}
      </div>
    </section>
  );
}

function EmptyList() {
  return <p className="text-sm text-slate-500">No entries yet.</p>;
}

type TimelineItem = {
  id: string;
  time: string | null;
  title: string;
  detail: string;
};

function Timeline({
  exercise,
  foods,
  locations,
  sleep,
  supplements,
}: {
  exercise: ExerciseEntry[];
  foods: FoodEntry[];
  locations: LocationEntry[];
  sleep: SleepEntry[];
  supplements: SupplementEntry[];
}) {
  const items: TimelineItem[] = [
    ...foods.map((entry) => ({
      id: `food-${entry.id}`,
      time: timeFromDateTime(entry.eaten_at),
      title:
        entry.foods_list.length > 0 ? entry.foods_list.join(", ") : "Food entry",
      detail: `${entry.calories ?? "No"} calories`,
    })),
    ...supplements.map((entry) => ({
      id: `supplement-${entry.id}`,
      time: timeFromDateTime(entry.taken_at),
      title: entry.name,
      detail: [entry.dose, entry.unit].filter(Boolean).join(" ") || "Supplement",
    })),
    ...exercise.map((entry) => ({
      id: `exercise-${entry.id}`,
      time: timeFromDateTime(entry.done_at),
      title: entry.type,
      detail: `${entry.duration_min ?? "No"} min, intensity ${entry.intensity ?? "not set"}`,
    })),
    ...locations.map((entry) => ({
      id: `location-${entry.id}`,
      time: timeFromDateTime(entry.started_at),
      title: entry.label,
      detail: entry.ended_at ? `Until ${timeFromDateTime(entry.ended_at)}` : "Location",
    })),
    ...sleep.map((entry) => ({
      id: `sleep-${entry.id}`,
      time: timeFromDateTime(entry.wake_time ?? ""),
      title: "Sleep",
      detail: `${entry.hours ?? "No"} hours, score ${entry.sleep_score ?? "not set"}, RHR ${entry.rhr ?? "not set"}, HRV ${entry.hrv ?? "not set"}`,
    })),
  ].sort((first, second) => {
    if (!first.time && !second.time) return 0;
    if (!first.time) return 1;
    if (!second.time) return -1;
    return first.time.localeCompare(second.time);
  });

  if (items.length === 0) {
    return <EmptyList />;
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li className="grid gap-3 border-b border-slate-100 pb-3 last:border-0 sm:grid-cols-[80px_1fr]" key={item.id}>
          <p className="text-sm font-medium text-slate-500">
            {item.time ?? "Anytime"}
          </p>
          <div>
            <p className="font-medium text-slate-950">{item.title}</p>
            <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function todayDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Vancouver",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(dateOnly: string, days: number) {
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isValidDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "America/Vancouver",
  }).format(new Date(`${value}T12:00:00`));
}

function timeFromDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
