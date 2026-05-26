"use client";

import { useMemo, useState } from "react";
import { createVariable, deleteJournalEntry, logVariableEntry } from "./actions";

export type Bucket =
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
  config: VariableConfig;
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
        config: VariableConfig | null;
      }
    | {
        name: string;
        config: VariableConfig | null;
      }[]
    | null;
};

type VariableConfig = {
  field_type?: "single_number";
  label?: string;
  unit?: string;
  show_time?: boolean;
};

const bucketLabels: Record<Bucket, string> = {
  supplements: "Supplements",
  food: "Food",
  exercise: "Exercise",
  location: "Location",
  sleep: "Sleep",
  notes: "Notes",
};

const bucketOptions: Bucket[] = [
  "supplements",
  "food",
  "exercise",
  "location",
  "sleep",
  "notes",
];

const creatableBucketOptions: Bucket[] = bucketOptions.filter(
  (bucket) => bucket !== "food",
);

const sleepMetricOptions = [
  { label: "RHR", value: "rhr" },
  { label: "HRV", value: "hrv" },
  { label: "Sleep hours", value: "sleep_hours" },
  { label: "Sleep score", value: "sleep_score" },
  { label: "Other number", value: "other_number" },
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
      return [];
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
            placeholder="Search..."
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

        {query.trim() ? (
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
        ) : null}

        <NutritionTotals entries={entries} />
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

function NutritionTotals({ entries }: { entries: JournalEntry[] }) {
  const totals = useMemo(() => {
    const sum = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    for (const entry of entries) {
      if (entry.bucket !== "food") continue;
      const data = entry.data as Record<string, unknown>;
      sum.calories += toNumber(data.calories);
      sum.protein += toNumber(data.protein);
      sum.carbs += toNumber(data.carbs);
      sum.fat += toNumber(data.fat);
      const micros = data.micros as Record<string, unknown> | undefined;
      sum.fiber += toNumber(micros?.["291"]);
    }
    return sum;
  }, [entries]);

  const items: Array<{ label: string; value: number; suffix: string }> = [
    { label: "Calories", value: totals.calories, suffix: "" },
    { label: "Protein", value: totals.protein, suffix: "g" },
    { label: "Carbs", value: totals.carbs, suffix: "g" },
    { label: "Fat", value: totals.fat, suffix: "g" },
    { label: "Fiber", value: totals.fiber, suffix: "g" },
  ];

  return (
    <div className="mt-4 grid grid-cols-5 gap-2 rounded-md border border-slate-200 bg-white p-3">
      {items.map((item) => (
        <div className="text-center" key={item.label}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {item.label}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-950">
            {Math.round(item.value)}
            {item.suffix ? (
              <span className="ml-0.5 text-sm font-normal text-slate-500">
                {item.suffix}
              </span>
            ) : null}
          </p>
        </div>
      ))}
    </div>
  );
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
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
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-950">
                {variableName(entry) ?? bucketLabels[bucket]}
              </p>
              <p className="mt-1 text-sm text-slate-600">{entrySummary(entry)}</p>
              {entry.notes ? (
                <p className="mt-1 text-sm text-slate-500">{entry.notes}</p>
              ) : null}
            </div>
            <div className="flex min-w-28 items-center justify-end gap-2">
              <p className="w-20 text-right text-sm font-medium text-slate-500">
                {formatTimeOfDay(entry.time_of_day) ?? "Anytime"}
              </p>
              <form action={deleteJournalEntry}>
                <input name="id" type="hidden" value={entry.id} />
                <input name="journal_date" type="hidden" value={selectedDate} />
                <button
                  aria-label="Delete entry"
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-base font-medium text-red-700 hover:bg-red-50"
                  type="submit"
                >
                  ×
                </button>
              </form>
            </div>
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
  const [bucket, setBucket] = useState<Bucket>("supplements");
  const [sleepMetric, setSleepMetric] = useState("rhr");

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
            onChange={(event) => setBucket(event.target.value as Bucket)}
            required
            value={bucket}
          >
            {creatableBucketOptions.map((bucket) => (
              <option key={bucket} value={bucket}>
                {bucketLabels[bucket]}
              </option>
            ))}
          </select>
        </label>
        {bucket === "sleep" ? (
          <>
            <label className="block">
              <span className="text-sm font-medium text-slate-800">
                Sleep metric type
              </span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
                name="sleep_metric_type"
                onChange={(event) => setSleepMetric(event.target.value)}
                value={sleepMetric}
              >
                {sleepMetricOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {sleepMetric === "other_number" ? (
              <TextInput label="Display unit" name="sleep_unit" />
            ) : null}
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Default amount" name="default_amount" type="number" />
            <TextInput label="Default unit" name="default_unit" />
          </div>
        )}
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
        {shouldShowTime(variable) ? (
          <HourSelect
            defaultValue={variable.default_time?.slice(0, 5) ?? ""}
            label="Time"
            name="time_of_day"
          />
        ) : null}
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
    return <HourSelect label="End time" name="end_time" />;
  }

  if (variable.bucket === "sleep") {
    return <TextInput label={variable.config.label ?? "Value"} name="value" type="number" />;
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
  const inputProps = {
    step: props.type === "number" ? "any" : undefined,
    ...props,
  };

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
        name={name}
        {...inputProps}
      />
    </label>
  );
}

function HourSelect({
  defaultValue,
  label,
  name,
}: {
  defaultValue?: string;
  label: string;
  name: string;
}) {
  const normalized = defaultValue ? defaultValue.split(":")[0].padStart(2, "0") + ":00" : "";

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <select
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
        defaultValue={normalized}
        name={name}
      >
        <option value="">Anytime</option>
        {Array.from({ length: 24 }, (_, hour) => {
          const value = `${hour.toString().padStart(2, "0")}:00`;
          return (
            <option key={value} value={value}>
              {formatHourLabel(hour)}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function formatHourLabel(hour: number) {
  const period = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
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
  if (entry.bucket === "supplements") {
    return [entry.data.amount, entry.data.unit].filter(Boolean).join(" ") || "Supplement";
  }

  if (entry.bucket === "food") {
    const data = entry.data as Record<string, unknown>;
    const micros = data.micros as Record<string, unknown> | undefined;
    const parts: string[] = [];
    const amount = data.amount;
    const unit = data.unit;
    if (amount !== null && amount !== undefined && amount !== "") {
      parts.push([amount, unit].filter(Boolean).join(" "));
    }
    if (data.calories !== null && data.calories !== undefined) {
      parts.push(`${Math.round(Number(data.calories))} cal`);
    }
    if (data.protein !== null && data.protein !== undefined) {
      parts.push(`${Math.round(Number(data.protein))}g protein`);
    }
    if (data.carbs !== null && data.carbs !== undefined) {
      parts.push(`${Math.round(Number(data.carbs))}g carbs`);
    }
    if (data.fat !== null && data.fat !== undefined) {
      parts.push(`${Math.round(Number(data.fat))}g fat`);
    }
    const fiber = micros?.["291"];
    if (fiber !== null && fiber !== undefined && fiber !== "") {
      parts.push(`${Math.round(Number(fiber))}g fiber`);
    }
    return parts.length > 0 ? parts.join(" · ") : "Food";
  }

  if (entry.bucket === "exercise") {
    return `${entry.data.duration_min ?? "No"} min, intensity ${entry.data.intensity ?? "not set"}`;
  }

  if (entry.bucket === "location") {
    return entry.data.end_time
      ? `Until ${formatTimeOfDay(String(entry.data.end_time))}`
      : "Location";
  }

  if (entry.bucket === "sleep") {
    if ("value" in entry.data) {
      return formatValueWithUnit(entry.data.value, entryConfig(entry)?.unit);
    }

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

function entryConfig(entry: JournalEntry) {
  if (Array.isArray(entry.variables)) {
    return entry.variables[0]?.config ?? null;
  }

  return entry.variables?.config ?? null;
}

function formatValueWithUnit(
  value: number | string | null | undefined,
  unit: string | undefined,
) {
  if (value === null || value === undefined || value === "") {
    return "No value";
  }

  return [value, unit].filter(Boolean).join(" ");
}

function shouldShowTime(variable: Variable) {
  if (variable.bucket === "sleep") {
    return variable.config.show_time === true;
  }

  return true;
}

function formatTimeOfDay(value: string | null) {
  if (!value) {
    return null;
  }

  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    ...(minutes === 0 ? {} : { minute: "2-digit" }),
  }).format(new Date(2000, 0, 1, hours, minutes));
}
