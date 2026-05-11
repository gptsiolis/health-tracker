"use client";

import { useMemo, useState } from "react";
import { createVariable, deleteJournalEntry, logVariableEntry } from "./actions";

export type Bucket =
  | "symptoms"
  | "supplements"
  | "food"
  | "exercise"
  | "location"
  | "sleep"
  | "notes";

export type Variable = {
  id: string;
  name: string;
  bucket: Bucket;
  default_unit: string | null;
  default_amount: number | null;
  default_time: string | null;
};

export type JournalEntry = {
  id: string;
  variable_id: string;
  bucket: Bucket;
  entry_date: string;
  time_of_day: string | null;
  data: Record<string, number | string | null>;
  notes: string | null;
  variables:
    | {
        name: string;
      }
    | {
        name: string;
      }[]
    | null;
};

const bucketLabels: Record<Bucket, string> = {
  symptoms: "Symptoms",
  supplements: "Supplements",
  food: "Food",
  exercise: "Exercise",
  location: "Location",
  sleep: "Sleep",
  notes: "Notes",
};

const bucketOptions: Bucket[] = [
  "symptoms",
  "supplements",
  "food",
  "exercise",
  "location",
  "sleep",
  "notes",
];

export function VariableJournal({
  entries,
  selectedDate,
  variables,
}: {
  entries: JournalEntry[];
  selectedDate: string;
  variables: Variable[];
}) {
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return variables.slice(0, 8);
    }

    return variables
      .filter((variable) => variable.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [query, variables]);

  return (
    <section className="py-8">
      <div className="mx-auto max-w-2xl">
        <div className="relative">
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 pr-14 text-lg text-slate-950 outline-none focus:border-teal-700"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search variables..."
            value={query}
          />
          <button
            aria-label="Create variable"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md bg-teal-700 text-xl font-medium text-white hover:bg-teal-800"
            onClick={() => setIsCreating(true)}
            type="button"
          >
            +
          </button>
        </div>

        <div className="mt-2 rounded-md border border-slate-200 bg-white shadow-sm">
          {matches.length > 0 ? (
            matches.map((variable) => (
              <button
                className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50"
                key={variable.id}
                onClick={() => {
                  setSelectedVariable(variable);
                  setQuery("");
                }}
                type="button"
              >
                <span className="font-medium text-slate-950">{variable.name}</span>
                <span className="text-sm text-slate-500">
                  {bucketLabels[variable.bucket]}
                </span>
              </button>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-slate-500">
              No variables match. Use + to create one.
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {bucketOptions.map((bucket) => (
          <section className="rounded-md border border-slate-200 bg-white p-5" key={bucket}>
            <h2 className="text-lg font-medium text-slate-950">
              {bucketLabels[bucket]}
            </h2>
            <BucketEntries
              bucket={bucket}
              entries={entries.filter((entry) => entry.bucket === bucket)}
              selectedDate={selectedDate}
            />
          </section>
        ))}
      </div>

      {isCreating ? (
        <CreateVariableModal
          defaultName={query}
          onClose={() => setIsCreating(false)}
          selectedDate={selectedDate}
        />
      ) : null}

      {selectedVariable ? (
        <LogVariableModal
          onClose={() => setSelectedVariable(null)}
          selectedDate={selectedDate}
          variable={selectedVariable}
        />
      ) : null}
    </section>
  );
}

function BucketEntries({
  bucket,
  entries,
  selectedDate,
}: {
  bucket: Bucket;
  entries: JournalEntry[];
  selectedDate: string;
}) {
  if (entries.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">No entries yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {entries.map((entry) => (
        <li className="border-b border-slate-100 pb-3 last:border-0" key={entry.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-slate-950">
                {variableName(entry) ?? bucketLabels[bucket]}
              </p>
              <p className="mt-1 text-sm text-slate-600">{entrySummary(entry)}</p>
              {entry.notes ? (
                <p className="mt-1 text-sm text-slate-500">{entry.notes}</p>
              ) : null}
            </div>
            <p className="text-sm font-medium text-slate-500">
              {entry.time_of_day?.slice(0, 5) ?? "Anytime"}
            </p>
            <form action={deleteJournalEntry}>
              <input name="id" type="hidden" value={entry.id} />
              <input name="journal_date" type="hidden" value={selectedDate} />
              <button
                className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                type="submit"
              >
                Delete
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CreateVariableModal({
  defaultName,
  onClose,
  selectedDate,
}: {
  defaultName: string;
  onClose: () => void;
  selectedDate: string;
}) {
  return (
    <Modal title="Create variable" onClose={onClose}>
      <form action={createVariable} className="space-y-4">
        <input name="journal_date" type="hidden" value={selectedDate} />
        <TextInput defaultValue={defaultName} label="Name" name="name" required />
        <label className="block">
          <span className="text-sm font-medium text-slate-800">Bucket</span>
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
            name="bucket"
            required
          >
            {bucketOptions.map((bucket) => (
              <option key={bucket} value={bucket}>
                {bucketLabels[bucket]}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextInput label="Default amount" name="default_amount" type="number" />
          <TextInput label="Default unit" name="default_unit" />
          <TextInput label="Default time" name="default_time" type="time" />
        </div>
        <div className="flex justify-end gap-3">
          <button className="rounded-md border border-slate-300 px-4 py-2 text-slate-800" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800" type="submit">
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}

function LogVariableModal({
  onClose,
  selectedDate,
  variable,
}: {
  onClose: () => void;
  selectedDate: string;
  variable: Variable;
}) {
  return (
    <Modal title={variable.name} onClose={onClose}>
      <form action={logVariableEntry} className="space-y-4">
        <input name="journal_date" type="hidden" value={selectedDate} />
        <input name="variable_id" type="hidden" value={variable.id} />
        <input name="bucket" type="hidden" value={variable.bucket} />
        <TextInput
          defaultValue={variable.default_time?.slice(0, 5) ?? ""}
          label="Time"
          name="time_of_day"
          type="time"
        />
        <BucketFields variable={variable} />
        <label className="block">
          <span className="text-sm font-medium text-slate-800">Notes</span>
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
            name="notes"
          />
        </label>
        <div className="flex justify-end gap-3">
          <button className="rounded-md border border-slate-300 px-4 py-2 text-slate-800" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800" type="submit">
            Log entry
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BucketFields({ variable }: { variable: Variable }) {
  if (variable.bucket === "symptoms") {
    return <TextInput label="Score" max="10" min="1" name="score" required type="number" />;
  }

  if (variable.bucket === "supplements") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          defaultValue={variable.default_amount ?? ""}
          label="Dose"
          name="amount"
          type="number"
        />
        <TextInput
          defaultValue={variable.default_unit ?? ""}
          label="Unit"
          name="unit"
        />
      </div>
    );
  }

  if (variable.bucket === "food") {
    return (
      <div className="grid gap-4 sm:grid-cols-4">
        <TextInput label="Calories" name="calories" type="number" />
        <TextInput label="Protein" name="protein" type="number" />
        <TextInput label="Carbs" name="carbs" type="number" />
        <TextInput label="Fat" name="fat" type="number" />
      </div>
    );
  }

  if (variable.bucket === "exercise") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Duration" name="duration_min" type="number" />
        <TextInput label="Intensity" max="10" min="1" name="intensity" type="number" />
      </div>
    );
  }

  if (variable.bucket === "location") {
    return <TextInput label="End time" name="end_time" type="time" />;
  }

  if (variable.bucket === "sleep") {
    return (
      <div className="grid gap-4 sm:grid-cols-4">
        <TextInput label="Hours" name="hours" type="number" />
        <TextInput label="Score" name="score" type="number" />
        <TextInput label="RHR" name="rhr" type="number" />
        <TextInput label="HRV" name="hrv" type="number" />
      </div>
    );
  }

  return null;
}

function TextInput({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
        name={name}
        {...props}
      />
    </label>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-xl rounded-md bg-white p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          <button
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function entrySummary(entry: JournalEntry) {
  if (entry.bucket === "symptoms") {
    return `Score ${entry.data.score ?? "not set"}`;
  }

  if (entry.bucket === "supplements") {
    return [entry.data.amount, entry.data.unit].filter(Boolean).join(" ") || "Supplement";
  }

  if (entry.bucket === "food") {
    return `${entry.data.calories ?? "No"} cal, protein ${entry.data.protein ?? "not set"}g`;
  }

  if (entry.bucket === "exercise") {
    return `${entry.data.duration_min ?? "No"} min, intensity ${entry.data.intensity ?? "not set"}`;
  }

  if (entry.bucket === "location") {
    return entry.data.end_time ? `Until ${entry.data.end_time}` : "Location";
  }

  if (entry.bucket === "sleep") {
    return `${entry.data.hours ?? "No"} hours, score ${entry.data.score ?? "not set"}`;
  }

  return "Note";
}

function variableName(entry: JournalEntry) {
  if (Array.isArray(entry.variables)) {
    return entry.variables[0]?.name;
  }

  return entry.variables?.name;
}
