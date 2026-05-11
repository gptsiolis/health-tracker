"use client";

import { useState } from "react";
import {
  deleteSymptomDefinition,
  saveDailyOutputs,
} from "./actions";
import { SymptomManager } from "./symptom-manager";

type SymptomEntry = {
  scores: Record<string, number>;
  notes: string | null;
};

type SymptomDefinition = {
  id: string;
  key: string;
  name: string;
};

export function DailyOutputsPanel({
  selectedDate,
  symptomDefinitions,
  symptomEntry,
}: {
  selectedDate: string;
  symptomDefinitions: SymptomDefinition[];
  symptomEntry: SymptomEntry | null;
}) {
  const symptomMeta = parseSymptomMeta(symptomEntry?.notes ?? null);
  const scores = Object.fromEntries(
    symptomDefinitions
      .filter((definition) => !symptomMeta.deletedSymptoms.includes(definition.key))
      .map((definition) => [
        definition.key,
        symptomEntry?.scores[definition.key] ?? 5,
      ]),
  );
  const scoreEntries = Object.entries(scores);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium text-slate-950">Daily symptoms</h2>
        <SymptomManager
          selectedDate={selectedDate}
          symptomDefinitions={symptomDefinitions}
        />
      </div>
      <form action={saveDailyOutputs} className="mt-4 space-y-4">
        <input name="journal_date" type="hidden" value={selectedDate} />
        {scoreEntries.map(([key, value]) => (
          <SymptomSlider
            defaultValue={value}
            key={key}
            label={
              symptomDefinitions.find((definition) => definition.key === key)
                ?.name ?? formatSymptomLabel(key)
            }
            name={`symptom_score_${key}`}
            selectedDate={selectedDate}
            symptomKey={key}
          />
        ))}
        <label className="block">
          <span className="text-sm font-medium text-slate-800">Notes</span>
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
            defaultValue={symptomMeta.text}
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

function SymptomSlider({
  defaultValue,
  label,
  name,
  selectedDate,
  symptomKey,
}: {
  defaultValue: number;
  label: string;
  name: string;
  selectedDate: string;
  symptomKey: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const scorePosition = Math.min(95, Math.max(5, ((value - 1) / 9) * 100));

  return (
    <div className="flex items-end gap-3">
      <label className="block flex-1">
        <span className="text-sm font-medium text-slate-800">{label}</span>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-xs text-slate-500">1</span>
          <div className="relative flex-1 pt-7">
            <span
              className="absolute top-0 -translate-x-1/2 rounded-md bg-teal-700 px-2 py-0.5 text-xs font-semibold text-white shadow-sm"
              style={{ left: `${scorePosition}%` }}
            >
              {value}
            </span>
            <input
              className="w-full accent-teal-700"
              max="10"
              min="1"
              name={name}
              onChange={(event) => setValue(Number(event.target.value))}
              type="range"
              value={value}
            />
          </div>
          <span className="text-xs text-slate-500">10</span>
        </div>
      </label>
      <form action={deleteSymptomDefinition}>
        <input name="journal_date" type="hidden" value={selectedDate} />
        <input name="symptom_key" type="hidden" value={symptomKey} />
        <button
          aria-label={`Remove ${label}`}
          className="mb-0.5 flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-base font-medium text-red-700 hover:bg-red-50"
          type="submit"
        >
          ×
        </button>
      </form>
    </div>
  );
}

function parseSymptomMeta(notes: string | null) {
  if (!notes) {
    return { deletedSymptoms: [] as string[], text: "" };
  }

  try {
    const parsed = JSON.parse(notes) as {
      deletedSymptoms?: string[];
      text?: string;
    };

    return {
      deletedSymptoms: parsed.deletedSymptoms ?? [],
      text: parsed.text ?? "",
    };
  } catch {
    return { deletedSymptoms: [] as string[], text: notes };
  }
}

function formatSymptomLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
