"use client";

import { useState } from "react";

type SleepImportRow = {
  hours: number | null;
  bedtime: string | null;
  wake_time: string | null;
  rhr: number | null;
  hrv: number | null;
  sleep_score: number | null;
};

export function WhoopImporter() {
  const [rows, setRows] = useState<SleepImportRow[]>([]);
  const [status, setStatus] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  async function loadCsv(file: File | null) {
    setStatus("");
    setRows([]);

    if (!file) {
      return;
    }

    const text = await file.text();
    const parsedRows = parseWhoopCsv(text);
    setRows(parsedRows);
    setStatus(`Parsed ${parsedRows.length} sleep rows.`);
  }

  async function importRows() {
    setIsImporting(true);
    setStatus("Importing sleep rows...");

    try {
      const response = await fetch("/api/whoop/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not import Whoop sleep rows.");
      }

      setStatus(`Imported ${data.count} sleep rows.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="py-8">
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium text-slate-950">Upload CSV</h2>
        <label className="mt-5 block">
          <span className="text-sm font-medium text-slate-800">
            physiological_cycles.csv
          </span>
          <input
            accept=".csv,text/csv"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
            onChange={(event) => loadCsv(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>

        {status ? (
          <p className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {status}
          </p>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="mt-6 rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-medium text-slate-950">Preview</h2>
            <button
              className="rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isImporting}
              onClick={importRows}
              type="button"
            >
              {isImporting ? "Importing..." : "Import sleep rows"}
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-2 pr-4">Bedtime</th>
                  <th className="py-2 pr-4">Wake</th>
                  <th className="py-2 pr-4">Hours</th>
                  <th className="py-2 pr-4">RHR</th>
                  <th className="py-2 pr-4">HRV</th>
                  <th className="py-2 pr-4">Sleep score</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((row, index) => (
                  <tr className="border-b border-slate-100" key={`${row.bedtime}-${index}`}>
                    <td className="py-2 pr-4">{formatDateTime(row.bedtime)}</td>
                    <td className="py-2 pr-4">{formatDateTime(row.wake_time)}</td>
                    <td className="py-2 pr-4">{row.hours ?? ""}</td>
                    <td className="py-2 pr-4">{row.rhr ?? ""}</td>
                    <td className="py-2 pr-4">{row.hrv ?? ""}</td>
                    <td className="py-2 pr-4">{row.sleep_score ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function parseWhoopCsv(text: string): SleepImportRow[] {
  const [headerRow, ...dataRows] = parseCsv(text);
  const headers = headerRow.map((header) => header.trim());

  return dataRows
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])))
    .filter((row) => row["Sleep onset"] && row["Wake onset"])
    .map((row) => ({
      hours: minutesToHours(numberOrNull(row["Asleep duration (min)"])),
      bedtime: dateTimeOrNull(row["Sleep onset"]),
      wake_time: dateTimeOrNull(row["Wake onset"]),
      rhr: numberOrNull(row["Resting heart rate (bpm)"]),
      hrv: numberOrNull(row["Heart rate variability (ms)"]),
      sleep_score: numberOrNull(row["Sleep performance %"]),
    }));
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((csvRow) => csvRow.some((cell) => cell.trim() !== ""));
}

function numberOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function minutesToHours(minutes: number | null) {
  return minutes === null ? null : Math.round((minutes / 60) * 100) / 100;
}

function dateTimeOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
