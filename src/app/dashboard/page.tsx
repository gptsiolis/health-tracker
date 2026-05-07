import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { saveDailyEntry } from "./actions";

type DashboardPageProps = {
  searchParams: Promise<{
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

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const { message } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [symptoms, supplements, exercise, locations] = await Promise.all([
    supabase
      .from("symptoms")
      .select("id, date, scores, notes")
      .order("date", { ascending: false })
      .limit(7),
    supabase
      .from("supplements")
      .select("id, name, dose, unit, taken_at, notes")
      .order("taken_at", { ascending: false })
      .limit(7),
    supabase
      .from("exercise")
      .select("id, type, duration_min, intensity, done_at, notes")
      .order("done_at", { ascending: false })
      .limit(7),
    supabase
      .from("location")
      .select("id, label, started_at, ended_at")
      .order("started_at", { ascending: false })
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

          <form action="/logout" method="post">
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-white"
              type="submit"
            >
              Log out
            </button>
          </form>
        </header>

        {message ? (
          <p className="mt-6 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            {message}
          </p>
        ) : null}

        <form action={saveDailyEntry} className="py-8">
          <section className="grid gap-6 lg:grid-cols-2">
            <FormPanel title="Symptoms">
              <div className="space-y-4">
                <TextInput label="Date" name="date" type="date" required />
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
                  label="Taken at"
                  name="supplement_taken_at"
                  type="datetime-local"
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
                  label="Done at"
                  name="exercise_done_at"
                  type="datetime-local"
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
                  label="Started at"
                  name="location_started_at"
                  type="datetime-local"
                />
                <TextInput
                  label="Ended at"
                  name="location_ended_at"
                  type="datetime-local"
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

        <section className="grid gap-6 pb-10 lg:grid-cols-2">
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
