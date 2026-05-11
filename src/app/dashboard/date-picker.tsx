"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

export function DatePickerButton({ selectedDate }: { selectedDate: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function openPicker() {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    if (pickerInput.showPicker) {
      pickerInput.showPicker();
    } else {
      pickerInput.click();
    }
  }

  return (
    <div className="relative">
      <button
        aria-label="Choose date"
        className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-xl text-slate-700 hover:bg-white"
        onClick={openPicker}
        type="button"
      >
        📅
      </button>
      <input
        aria-label="Choose date"
        className="pointer-events-none absolute inset-0 opacity-0"
        defaultValue={selectedDate}
        onChange={(event) => {
          router.push(`/dashboard?date=${event.target.value}`);
        }}
        ref={inputRef}
        tabIndex={-1}
        type="date"
      />
    </div>
  );
}
