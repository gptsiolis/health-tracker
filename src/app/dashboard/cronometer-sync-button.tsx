"use client";

import { useFormStatus } from "react-dom";
import { syncCronometer } from "./actions";

export function CronometerSyncButton({
  lastSyncedAt,
  selectedDate,
}: {
  lastSyncedAt: string | null;
  selectedDate: string;
}) {
  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <form action={syncCronometer}>
        <input name="journal_date" type="hidden" value={selectedDate} />
        <SyncButton />
      </form>
      <p className="text-xs text-slate-500">
        {lastSyncedAt
          ? `Last synced ${formatRelative(lastSyncedAt)}`
          : "Never synced"}
      </p>
    </div>
  );
}

function SyncButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      disabled={pending}
      type="submit"
    >
      {pending ? "Syncing…" : "Sync Cronometer"}
    </button>
  );
}

function formatRelative(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) {
    return "recently";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} min ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hr ago`;
  return `${Math.floor(diffSeconds / 86400)} d ago`;
}
