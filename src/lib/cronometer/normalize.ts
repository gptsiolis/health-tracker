import type { DiaryEntry, NormalizedFoodEntry } from "./types";

const NUTRIENT_IDS = {
  energy: 208,
  protein: 203,
  fat: 204,
  carbs: 205,
  fiber: 291,
  sugar: 269,
  sodium: 307,
} as const;

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function pickFoodName(entry: DiaryEntry): string {
  if (typeof entry.foodName === "string" && entry.foodName.trim()) {
    return entry.foodName.trim();
  }

  const nested = entry.food;
  if (nested && typeof nested.name === "string" && nested.name.trim()) {
    return nested.name.trim();
  }

  return "Unknown food";
}

function pickBrand(entry: DiaryEntry): string | null {
  const nested = entry.food;
  if (nested && typeof nested.brand === "string" && nested.brand.trim()) {
    return nested.brand.trim();
  }

  const brand = (entry as Record<string, unknown>).brand;
  if (typeof brand === "string" && brand.trim()) {
    return brand.trim();
  }

  return null;
}

function pickUnit(entry: DiaryEntry): string | null {
  if (typeof entry.measureName === "string" && entry.measureName.trim()) {
    return entry.measureName.trim();
  }

  if (typeof entry.unitName === "string" && entry.unitName.trim()) {
    return entry.unitName.trim();
  }

  if (typeof entry.grams === "number") {
    return "g";
  }

  return null;
}

function pickAmount(entry: DiaryEntry): number | null {
  const amount = readNumber(entry.amount);
  if (amount !== null) {
    return amount;
  }

  return readNumber(entry.grams);
}

function readNutrient(
  entry: DiaryEntry,
  id: number,
  fallbackKey: keyof DiaryEntry,
): number | null {
  const nutrients = entry.nutrients;
  if (nutrients && typeof nutrients === "object") {
    const byId = (nutrients as Record<string, unknown>)[String(id)];
    const direct = readNumber(byId);
    if (direct !== null) {
      return direct;
    }
  }

  return readNumber(entry[fallbackKey]);
}

function readTime(entry: DiaryEntry): string | null {
  if (typeof entry.time !== "string") {
    return null;
  }

  const match = entry.time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const hours = match[1].padStart(2, "0");
  const minutes = match[2];
  const seconds = match[3] ?? "00";
  return `${hours}:${minutes}:${seconds}`;
}

function readEntryDate(entry: DiaryEntry, fallbackDate: string): string {
  if (typeof entry.day !== "string") {
    return fallbackDate;
  }

  const [yearText, monthText, dayText] = entry.day.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return fallbackDate;
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function collectMicros(entry: DiaryEntry): Record<string, number> {
  const nutrients = entry.nutrients;
  if (!nutrients || typeof nutrients !== "object") {
    return {};
  }

  const macroIds = new Set<number>([
    NUTRIENT_IDS.energy,
    NUTRIENT_IDS.protein,
    NUTRIENT_IDS.fat,
    NUTRIENT_IDS.carbs,
  ]);

  const micros: Record<string, number> = {};
  for (const [key, rawValue] of Object.entries(nutrients)) {
    const numericId = Number(key);
    if (Number.isNaN(numericId) || macroIds.has(numericId)) {
      continue;
    }
    const value = readNumber(rawValue);
    if (value !== null) {
      micros[key] = value;
    }
  }

  return micros;
}

export function normalizeDiaryEntry(
  entry: DiaryEntry,
  fallbackDate: string,
): NormalizedFoodEntry | null {
  if (entry.type && entry.type !== "Serving") {
    return null;
  }

  const externalId = entry.servingId ?? (entry as { id?: number | string }).id;
  if (externalId === undefined || externalId === null) {
    return null;
  }

  return {
    externalId: String(externalId),
    entryDate: readEntryDate(entry, fallbackDate),
    timeOfDay: readTime(entry),
    foodName: pickFoodName(entry),
    brand: pickBrand(entry),
    amount: pickAmount(entry),
    unit: pickUnit(entry),
    calories: readNutrient(entry, NUTRIENT_IDS.energy, "calories" as keyof DiaryEntry),
    protein: readNutrient(entry, NUTRIENT_IDS.protein, "protein" as keyof DiaryEntry),
    carbs: readNutrient(entry, NUTRIENT_IDS.carbs, "carbs" as keyof DiaryEntry),
    fat: readNutrient(entry, NUTRIENT_IDS.fat, "fat" as keyof DiaryEntry),
    micros: collectMicros(entry),
  };
}

export function normalizeDiary(
  entries: DiaryEntry[],
  fallbackDate: string,
): NormalizedFoodEntry[] {
  const normalized: NormalizedFoodEntry[] = [];
  for (const entry of entries) {
    const result = normalizeDiaryEntry(entry, fallbackDate);
    if (result) {
      normalized.push(result);
    }
  }
  return normalized;
}
