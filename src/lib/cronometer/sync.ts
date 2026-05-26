import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CronometerError,
  getDiary,
  getFood,
  type CronometerFood,
} from "./client";
import { normalizeDiary, type FoodLookup } from "./normalize";
import type { DiaryEntry, NormalizedFoodEntry } from "./types";

const EXTERNAL_SOURCE = "cronometer";
const VANCOUVER_TZ = "America/Vancouver";

export type SyncOptions = {
  date?: string;
  days?: number;
};

export type SyncResult = {
  ok: boolean;
  dates: string[];
  inserted: number;
  skipped: number;
  lastSyncedAt: string | null;
  error?: string;
};

function todayInVancouver(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: VANCOUVER_TZ,
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function offsetDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildEntryData(entry: NormalizedFoodEntry) {
  return {
    food_name: entry.foodName,
    meal_group: entry.mealGroup,
    amount: entry.amount,
    unit: entry.unit,
    grams: entry.grams,
    calories: entry.calories,
    protein: entry.protein,
    carbs: entry.carbs,
    fat: entry.fat,
    micros: entry.micros,
  };
}

async function fetchFoodLookup(entries: DiaryEntry[]): Promise<FoodLookup> {
  const uniqueIds = Array.from(
    new Set(
      entries
        .map((entry) => entry.foodId)
        .filter((id): id is number => typeof id === "number"),
    ),
  );

  const lookup: FoodLookup = new Map();
  const foods = await Promise.all(
    uniqueIds.map(async (foodId) => {
      try {
        return await getFood(foodId);
      } catch {
        return null;
      }
    }),
  );

  for (let index = 0; index < uniqueIds.length; index++) {
    const food = foods[index];
    if (food) {
      lookup.set(uniqueIds[index], food as CronometerFood);
    }
  }

  return lookup;
}

async function resolveVariableId(
  supabase: SupabaseClient,
  userId: string,
  foodName: string,
  cache: Map<string, string>,
): Promise<string> {
  const cacheKey = foodName.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { data: existing } = await supabase
    .from("variables")
    .select("id")
    .eq("user_id", userId)
    .eq("bucket", "food")
    .eq("name", foodName)
    .maybeSingle();

  if (existing?.id) {
    cache.set(cacheKey, existing.id as string);
    return existing.id as string;
  }

  const { data: inserted, error } = await supabase
    .from("variables")
    .insert({ user_id: userId, name: foodName, bucket: "food" })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to create food variable");
  }

  cache.set(cacheKey, inserted.id as string);
  return inserted.id as string;
}

export async function syncCronometerForUser(
  supabase: SupabaseClient,
  userId: string,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const baseDate = options.date ?? todayInVancouver();
  const dayCount = Math.max(1, Math.min(7, options.days ?? 2));
  const dates: string[] = [];
  for (let offset = 0; offset < dayCount; offset++) {
    dates.push(offsetDate(baseDate, -offset));
  }

  let inserted = 0;
  let skipped = 0;
  const variableCache = new Map<string, string>();

  try {
    for (const date of dates) {
      const diary = await getDiary(date);
      const rawEntries = (diary.diary ?? []) as DiaryEntry[];
      const foodLookup = await fetchFoodLookup(rawEntries);
      const normalized = normalizeDiary(rawEntries, foodLookup, date);

      for (const entry of normalized) {
        const variableId = await resolveVariableId(
          supabase,
          userId,
          entry.foodName,
          variableCache,
        );

        const { error, count } = await supabase
          .from("journal_entries")
          .upsert(
            {
              user_id: userId,
              variable_id: variableId,
              bucket: "food",
              entry_date: entry.entryDate,
              time_of_day: entry.timeOfDay,
              data: buildEntryData(entry),
              external_source: EXTERNAL_SOURCE,
              external_id: entry.externalId,
            },
            {
              onConflict: "user_id,external_source,external_id",
              count: "exact",
            },
          );

        if (error) {
          throw new Error(error.message);
        }

        if (count && count > 0) {
          inserted += count;
        } else {
          skipped += 1;
        }
      }
    }

    const lastSyncedAt = new Date().toISOString();
    await supabase
      .from("cronometer_sync_state")
      .upsert(
        {
          user_id: userId,
          last_synced_at: lastSyncedAt,
          last_error: null,
          updated_at: lastSyncedAt,
        },
        { onConflict: "user_id" },
      );

    return { ok: true, dates, inserted, skipped, lastSyncedAt };
  } catch (error) {
    const message =
      error instanceof CronometerError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Cronometer sync failed";

    await supabase
      .from("cronometer_sync_state")
      .upsert(
        {
          user_id: userId,
          last_error: message,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    return { ok: false, dates, inserted, skipped, lastSyncedAt: null, error: message };
  }
}
