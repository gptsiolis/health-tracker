"use client";

import { useState } from "react";
import {
  addSymptomDefinition,
  archiveSymptomDefinition,
} from "./actions";

type SymptomDefinition = {
  id: string;
  key: string;
  name: string;
};

export function SymptomManager({
  selectedDate,
  symptomDefinitions,
}: {
  selectedDate: string;
  symptomDefinitions: SymptomDefinition[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Manage symptoms"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-xl font-medium text-slate-700 hover:bg-slate-50"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        ⋯
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-lg rounded-md bg-white p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-950">
                Manage symptoms
              </h2>
              <button
                className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <form action={addSymptomDefinition} className="flex gap-2">
              <input name="journal_date" type="hidden" value={selectedDate} />
              <input
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
                name="symptom_name"
                placeholder="New symptom"
                required
              />
              <button
                className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800"
                type="submit"
              >
                Add
              </button>
            </form>

            <ul className="mt-5 space-y-2">
              {symptomDefinitions.map((definition) => (
                <li
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
                  key={definition.id}
                >
                  <span className="font-medium text-slate-900">
                    {definition.name}
                  </span>
                  <form action={archiveSymptomDefinition}>
                    <input name="journal_date" type="hidden" value={selectedDate} />
                    <input
                      name="symptom_definition_id"
                      type="hidden"
                      value={definition.id}
                    />
                    <button
                      aria-label={`Delete ${definition.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-base font-medium text-red-700 hover:bg-red-50"
                      type="submit"
                    >
                      ×
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
