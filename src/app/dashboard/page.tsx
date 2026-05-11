import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deleteEntry, saveDailyJournalNote, saveDailyOutputs } from "./actions";
import {
  VariableJournal,
  type JournalEntry,
  type Variable,
} from "./variable-journal";

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

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { date, message } = await searchParams;
  const selectedDate = date && isValidDateOnly(date) ? date : todayDate();
  const nextDate = addDays(selectedDate, 1);
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
      .select("id, name, bucket, default_unit, default_amount, default_time")
      .is("archived_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("journal_entries")
      .select("id, variable_id, bucket, entry_date, time_of_day, data, notes, variables(name)")
      .eq("entry_date", selectedDate)
      .order("time_of_day", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("daily_journal_notes")
      .select("notes")
      .eq("date", selectedDate)
      .maybeSingle(),
  ]);

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
              Charts
            </Link>
            <Link
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white"
              href="/cronometer"
            >
              Cronometer upload
            </Link>
            <Link
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white"
              href="/whoop"
            >
              Whoop import
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

        <section className="flex flex-col gap-3 border-b border-slate-200 py-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Journal date</p>
            <h2 className="text-2xl font-semibold text-slate-950">
              {selectedDateLabel}
            </h2>
          </div>

          <form className="flex items-end gap-3" method="get">
            <label className="block">
              <span className="text-sm font-medium text-slate-800">Change date</span>
              <input
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
                defaultValue={selectedDate}
                name="date"
                type="date"
              />
            </label>
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white"
              type="submit"
            >
              Go
            </button>
          </form>
        </section>

        {message ? (
          <p className="mt-6 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            {message}
          </p>
        ) : null}

        <VariableJournal
          entries={(journalEntries.data ?? []) as JournalEntry[]}
          selectedDate={selectedDate}
          variables={(variables.data ?? []) as Variable[]}
        />

        <section className="grid gap-6 pb-10 lg:grid-cols-2">
          <DailyJournalPanel
            note={(dailyJournalNote.data as DailyJournalNote | null)?.notes ?? ""}
            selectedDate={selectedDate}
          />
          <DailyOutputsPanel
            selectedDate={selectedDate}
            symptoms={(symptoms.data ?? []) as SymptomEntry[]}
          />
        </section>

        <section className="grid gap-6 pb-10 lg:grid-cols-2">
          <EntryPanel title="Recent foods">
            <FoodList
              entries={(foods.data ?? []) as FoodEntry[]}
              selectedDate={selectedDate}
            />
          </EntryPanel>

          <EntryPanel title="Sleep">
            <SleepList
              entries={(sleep.data ?? []) as SleepEntry[]}
              selectedDate={selectedDate}
            />
          </EntryPanel>

          <EntryPanel title="Recent symptoms">
            <SymptomList
              entries={(symptoms.data ?? []) as SymptomEntry[]}
              selectedDate={selectedDate}
            />
          </EntryPanel>

          <EntryPanel title="Recent supplements">
            <SupplementList
              entries={(supplements.data ?? []) as SupplementEntry[]}
              selectedDate={selectedDate}
            />
          </EntryPanel>

          <EntryPanel title="Recent exercise">
            <ExerciseList
              entries={(exercise.data ?? []) as ExerciseEntry[]}
              selectedDate={selectedDate}
            />
          </EntryPanel>

          <EntryPanel title="Recent locations">
            <LocationList
              entries={(locations.data ?? []) as LocationEntry[]}
              selectedDate={selectedDate}
            />
          </EntryPanel>
        </section>

        <section className="pb-10">
          <EntryPanel title="Timeline">
            <Timeline
              exercise={(exercise.data ?? []) as ExerciseEntry[]}
              foods={(foods.data ?? []) as FoodEntry[]}
              locations={(locations.data ?? []) as LocationEntry[]}
              sleep={(sleep.data ?? []) as SleepEntry[]}
              supplements={(supplements.data ?? []) as SupplementEntry[]}
              symptoms={(symptoms.data ?? []) as SymptomEntry[]}
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

function DailyOutputsPanel({
  selectedDate,
  symptoms,
}: {
  selectedDate: string;
  symptoms: SymptomEntry[];
}) {
  const current = symptoms[0];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-medium text-slate-950">Daily symptoms</h2>
      <form action={saveDailyOutputs} className="mt-4 space-y-4">
        <input name="journal_date" type="hidden" value={selectedDate} />
        <OutputSlider
          defaultValue={current?.scores.fatigue ?? 5}
          label="Fatigue"
          name="fatigue"
        />
        <OutputSlider
          defaultValue={current?.scores.pain ?? 5}
          label="Pain"
          name="pain"
        />
        <OutputSlider
          defaultValue={current?.scores.brain_fog ?? 5}
          label="Brain fog"
          name="brain_fog"
        />
        <OutputSlider
          defaultValue={current?.scores.mood ?? 5}
          label="Mood"
          name="mood"
        />
        <label className="block">
          <span className="text-sm font-medium text-slate-800">Notes</span>
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
            defaultValue={current?.notes ?? ""}
            name="symptom_notes"
          />
        </label>
        <div className="flex justify-end">
          <button
            className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800"
            type="submit"
          >
            Save symptoms
          </button>
        </div>
      </form>
    </section>
  );
}

function OutputSlider({
  defaultValue,
  label,
  name,
}: {
  defaultValue: number;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-xs text-slate-500">1</span>
        <input
          className="w-full accent-teal-700"
          defaultValue={defaultValue}
          max="10"
          min="1"
          name={name}
          type="range"
        />
        <span className="text-xs text-slate-500">10</span>
      </div>
    </label>
  );
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

function FoodList({
  entries,
  selectedDate,
}: {
  entries: FoodEntry[];
  selectedDate: string;
}) {
  if (entries.length === 0) {
    return <EmptyList />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <ListItemHeader
            id={entry.id}
            selectedDate={selectedDate}
            table="foods"
            title={
              entry.foods_list.length > 0
                ? entry.foods_list.join(", ")
                : "Food entry"
            }
          />
          <p className="mt-1 text-sm text-slate-600">
            {entry.calories ?? "No calories"} cal, protein{" "}
            {entry.protein ?? "not set"}g, carbs {entry.carbs ?? "not set"}g,
            fat {entry.fat ?? "not set"}g
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(entry.eaten_at)} · {entry.source}
          </p>
        </li>
      ))}
    </ul>
  );
}

function SleepList({
  entries,
  selectedDate,
}: {
  entries: SleepEntry[];
  selectedDate: string;
}) {
  if (entries.length === 0) {
    return <EmptyList />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <ListItemHeader
            id={entry.id}
            selectedDate={selectedDate}
            table="sleep"
            title={`${entry.hours ?? "No"} hours asleep`}
          />
          <p className="mt-1 text-sm text-slate-600">
            Score {entry.sleep_score ?? "not set"}, RHR {entry.rhr ?? "not set"},
            HRV {entry.hrv ?? "not set"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(entry.bedtime)} to {formatDateTime(entry.wake_time)}
          </p>
        </li>
      ))}
    </ul>
  );
}

function SymptomList({
  entries,
  selectedDate,
}: {
  entries: SymptomEntry[];
  selectedDate: string;
}) {
  if (entries.length === 0) {
    return <EmptyList />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <ListItemHeader
            id={entry.id}
            selectedDate={selectedDate}
            table="symptoms"
            title={entry.date}
          />
          <p className="mt-1 text-sm text-slate-600">
            Fatigue {entry.scores.fatigue}, pain {entry.scores.pain}, brain fog{" "}
            {entry.scores.brain_fog}, mood {entry.scores.mood}
          </p>
          {entry.notes ? <p className="mt-1 text-sm text-slate-500">{entry.notes}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function SupplementList({
  entries,
  selectedDate,
}: {
  entries: SupplementEntry[];
  selectedDate: string;
}) {
  if (entries.length === 0) {
    return <EmptyList />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <ListItemHeader
            id={entry.id}
            selectedDate={selectedDate}
            table="supplements"
            title={entry.name}
          />
          <p className="mt-1 text-sm text-slate-600">
            {[entry.dose, entry.unit].filter(Boolean).join(" ")} on{" "}
            {formatDateTime(entry.taken_at)}
          </p>
          {entry.notes ? <p className="mt-1 text-sm text-slate-500">{entry.notes}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function ExerciseList({
  entries,
  selectedDate,
}: {
  entries: ExerciseEntry[];
  selectedDate: string;
}) {
  if (entries.length === 0) {
    return <EmptyList />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <ListItemHeader
            id={entry.id}
            selectedDate={selectedDate}
            table="exercise"
            title={entry.type}
          />
          <p className="mt-1 text-sm text-slate-600">
            {entry.duration_min ?? "No duration"} min, intensity{" "}
            {entry.intensity ?? "not set"} on {formatDateTime(entry.done_at)}
          </p>
          {entry.notes ? <p className="mt-1 text-sm text-slate-500">{entry.notes}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function LocationList({
  entries,
  selectedDate,
}: {
  entries: LocationEntry[];
  selectedDate: string;
}) {
  if (entries.length === 0) {
    return <EmptyList />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <ListItemHeader
            id={entry.id}
            selectedDate={selectedDate}
            table="location"
            title={entry.label}
          />
          <p className="mt-1 text-sm text-slate-600">
            {formatDateTime(entry.started_at)} to{" "}
            {entry.ended_at ? formatDateTime(entry.ended_at) : "now"}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ListItemHeader({
  id,
  selectedDate,
  table,
  title,
}: {
  id: string;
  selectedDate: string;
  table: string;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="font-medium text-slate-950">{title}</p>
      <form action={deleteEntry}>
        <input name="id" type="hidden" value={id} />
        <input name="table" type="hidden" value={table} />
        <input name="journal_date" type="hidden" value={selectedDate} />
        <button
          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
          type="submit"
        >
          Delete
        </button>
      </form>
    </div>
  );
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
  symptoms,
}: {
  exercise: ExerciseEntry[];
  foods: FoodEntry[];
  locations: LocationEntry[];
  sleep: SleepEntry[];
  supplements: SupplementEntry[];
  symptoms: SymptomEntry[];
}) {
  const items: TimelineItem[] = [
    ...symptoms.map((entry) => ({
      id: `symptoms-${entry.id}`,
      time: null,
      title: "Symptoms",
      detail: `Fatigue ${entry.scores.fatigue}, pain ${entry.scores.pain}, brain fog ${entry.scores.brain_fog}, mood ${entry.scores.mood}`,
    })),
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
