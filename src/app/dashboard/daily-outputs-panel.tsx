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
  const hasSavedSymptoms = Boolean(symptomEntry);
  const [isLocked, setIsLocked] = useState(hasSavedSymptoms);
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
        <div>
          <h2 className="text-lg font-medium text-slate-950">Daily symptoms</h2>
          {hasSavedSymptoms ? (
            <p className="mt-1 text-sm text-slate-500">
              {isLocked ? "Saved. Unlock to make changes." : "Editing saved symptoms."}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {isLocked ? (
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              onClick={() => setIsLocked(false)}
              type="button"
            >
              Edit
            </button>
          ) : null}
          <SymptomManager
            selectedDate={selectedDate}
            symptomDefinitions={symptomDefinitions}
          />
        </div>
      </div>
      <form
        action={saveDailyOutputs}
        className="mt-4 space-y-4"
        onSubmit={() => setIsLocked(true)}
      >
        <input name="journal_date" type="hidden" value={selectedDate} />
        {scoreEntries.map(([key, value]) => (
          <SymptomSlider
            defaultValue={value}
            key={key}
            label={
              symptomDefinitions.find((definition) => definition.key === key)
                ?.name ?? formatSymptomLabel(key)
            }
            disabled={isLocked}
            name={`symptom_score_${key}`}
            selectedDate={selectedDate}
            symptomKey={key}
          />
        ))}
        <div className="flex justify-end">
          <button
            className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isLocked}
            type="submit"
          >
            {hasSavedSymptoms ? "Save changes" : "Save symptoms"}
          </button>
        </div>
      </form>
    </section>
  );
}

function SymptomSlider({
  defaultValue,
  disabled,
  label,
  name,
  selectedDate,
  symptomKey,
}: {
  defaultValue: number;
  disabled: boolean;
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
              className={`absolute top-0 -translate-x-1/2 rounded-md px-2 py-0.5 text-xs font-semibold text-white shadow-sm ${
                disabled ? "bg-slate-500" : "bg-teal-700"
              }`}
              style={{ left: `${scorePosition}%` }}
            >
              {value}
            </span>
            <input
              className="w-full accent-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={disabled}
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
          className="mb-0.5 flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-base font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
          disabled={disabled}
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
