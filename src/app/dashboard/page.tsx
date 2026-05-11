import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveDailyEntry, saveManualFood } from "./actions";

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

  const [symptoms, supplements, exercise, locations, foods] = await Promise.all([
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
              href="/cronometer"
            >
              Cronometer upload
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

        <form action={saveDailyEntry} className="py-8">
          <input name="journal_date" type="hidden" value={selectedDate} />
          <section className="grid gap-6 lg:grid-cols-2">
            <FormPanel title="Symptoms">
              <div className="space-y-4">
                <Slider label="Fatigue" name="fatigue" />
                <Slider label="Pain" name="pain" />
                <Slider label="Brain fog" name="brain_fog" />
                <Slider label="Mood" name="mood" />
                <TextArea label="Notes" name="symptom_notes" />
              </div>
            </FormPanel>

            <FormPanel title="Supplements">
              <div className="space-y-4">
                <TextInput label="Name" name="supplement_name" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Dose"
                    name="supplement_dose"
                    type="number"
                    step="0.01"
                  />
                  <TextInput label="Unit" name="supplement_unit" placeholder="mg" />
                </div>
                <TextInput
                  label="Time"
                  name="supplement_time"
                  type="time"
                />
                <TextArea label="Notes" name="supplement_notes" />
              </div>
            </FormPanel>

            <FormPanel title="Exercise">
              <div className="space-y-4">
                <TextInput
                  label="Type"
                  name="exercise_type"
                  placeholder="Walk"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Duration"
                    name="exercise_duration_min"
                    type="number"
                    placeholder="Minutes"
                  />
                  <TextInput
                    label="Intensity"
                    name="exercise_intensity"
                    type="number"
                    min="1"
                    max="10"
                  />
                </div>
                <TextInput
                  label="Time"
                  name="exercise_time"
                  type="time"
                />
                <TextArea label="Notes" name="exercise_notes" />
              </div>
            </FormPanel>

            <FormPanel title="Location">
              <div className="space-y-4">
                <TextInput
                  label="Label"
                  name="location_label"
                  placeholder="Home"
                />
                <TextInput
                  label="Start time"
                  name="location_start_time"
                  type="time"
                />
                <TextInput
                  label="End time"
                  name="location_end_time"
                  type="time"
                />
              </div>
            </FormPanel>
          </section>

          <div className="mt-6 flex justify-end">
            <button
              className="rounded-md bg-teal-700 px-5 py-2.5 font-medium text-white hover:bg-teal-800"
              type="submit"
            >
              Save daily entry
            </button>
          </div>
        </form>

        <section className="pb-10">
          <FormPanel title="Food">
            <form action={saveManualFood} className="space-y-4">
              <input name="journal_date" type="hidden" value={selectedDate} />
              <TextInput
                label="Time"
                name="food_time"
                type="time"
              />
              <div className="grid gap-4 sm:grid-cols-4">
                <TextInput label="Calories" name="calories" type="number" />
                <TextInput label="Protein" name="protein" type="number" step="0.1" />
                <TextInput label="Carbs" name="carbs" type="number" step="0.1" />
                <TextInput label="Fat" name="fat" type="number" step="0.1" />
              </div>
              <TextArea label="Foods list" name="foods_list" />
              <TextArea label="Micros JSON" name="micros" />
              <div className="flex justify-end">
                <button
                  className="rounded-md bg-teal-700 px-5 py-2.5 font-medium text-white hover:bg-teal-800"
                  type="submit"
                >
                  Save food
                </button>
              </div>
            </form>
          </FormPanel>
        </section>

        <section className="grid gap-6 pb-10 lg:grid-cols-2">
          <EntryPanel title="Recent foods">
            <FoodList entries={(foods.data ?? []) as FoodEntry[]} />
          </EntryPanel>

          <EntryPanel title="Recent symptoms">
            <SymptomList entries={(symptoms.data ?? []) as SymptomEntry[]} />
          </EntryPanel>

          <EntryPanel title="Recent supplements">
            <SupplementList
              entries={(supplements.data ?? []) as SupplementEntry[]}
            />
          </EntryPanel>

          <EntryPanel title="Recent exercise">
            <ExerciseList entries={(exercise.data ?? []) as ExerciseEntry[]} />
          </EntryPanel>

          <EntryPanel title="Recent locations">
            <LocationList entries={(locations.data ?? []) as LocationEntry[]} />
          </EntryPanel>
        </section>

        <section className="pb-10">
          <EntryPanel title="Timeline">
            <Timeline
              exercise={(exercise.data ?? []) as ExerciseEntry[]}
              foods={(foods.data ?? []) as FoodEntry[]}
              locations={(locations.data ?? []) as LocationEntry[]}
              supplements={(supplements.data ?? []) as SupplementEntry[]}
              symptoms={(symptoms.data ?? []) as SymptomEntry[]}
            />
          </EntryPanel>
        </section>
      </div>
    </main>
  );
}

function FormPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-medium text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
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

function TextInput({
  label,
  name,
  type = "text",
  required = false,
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
        name={name}
        type={type}
        required={required}
        {...props}
      />
    </label>
  );
}

function TextArea({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <textarea
        className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
        name={name}
      />
    </label>
  );
}

function Slider({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <span className="text-xs text-slate-500">1</span>
        <input
          className="w-full accent-teal-700"
          defaultValue="5"
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

function EmptyList() {
  return <p className="text-sm text-slate-500">No entries yet.</p>;
}

function FoodList({ entries }: { entries: FoodEntry[] }) {
  if (entries.length === 0) {
    return <EmptyList />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <p className="font-medium text-slate-950">
            {entry.foods_list.length > 0
              ? entry.foods_list.join(", ")
              : "Food entry"}
          </p>
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

function SymptomList({ entries }: { entries: SymptomEntry[] }) {
  if (entries.length === 0) {
    return <EmptyList />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <p className="font-medium text-slate-950">{entry.date}</p>
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

function SupplementList({ entries }: { entries: SupplementEntry[] }) {
  if (entries.length === 0) {
    return <EmptyList />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <p className="font-medium text-slate-950">{entry.name}</p>
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

function ExerciseList({ entries }: { entries: ExerciseEntry[] }) {
  if (entries.length === 0) {
    return <EmptyList />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <p className="font-medium text-slate-950">{entry.type}</p>
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

function LocationList({ entries }: { entries: LocationEntry[] }) {
  if (entries.length === 0) {
    return <EmptyList />;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <p className="font-medium text-slate-950">{entry.label}</p>
          <p className="mt-1 text-sm text-slate-600">
            {formatDateTime(entry.started_at)} to{" "}
            {entry.ended_at ? formatDateTime(entry.ended_at) : "now"}
          </p>
        </li>
      ))}
    </ul>
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
  supplements,
  symptoms,
}: {
  exercise: ExerciseEntry[];
  foods: FoodEntry[];
  locations: LocationEntry[];
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
