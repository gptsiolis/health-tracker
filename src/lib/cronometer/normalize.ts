import type { CronometerFood } from "./client";
import type { DiaryEntry, MealGroup, NormalizedFoodEntry } from "./types";

const NUTRIENT_IDS = {
  energy: 208,
  protein: 203,
  fat: 204,
  carbs: 205,
} as const;

const MACRO_IDS = new Set<number>([
  NUTRIENT_IDS.energy,
  NUTRIENT_IDS.protein,
  NUTRIENT_IDS.fat,
  NUTRIENT_IDS.carbs,
]);

const MEAL_GROUP_BY_CODE: Record<number, { group: MealGroup; time: string }> = {
  1: { group: "breakfast", time: "08:00:00" },
  2: { group: "lunch", time: "12:00:00" },
  3: { group: "dinner", time: "18:00:00" },
  4: { group: "snacks", time: "15:00:00" },
};

export type FoodLookup = Map<number, CronometerFood>;

function nutrientPer100g(food: CronometerFood, id: number): number | null {
  const nutrient = food.nutrients?.find((n) => n.id === id);
  if (!nutrient || typeof nutrient.amount !== "number") {
    return null;
  }
  return nutrient.amount;
}

function scaleToServing(per100g: number | null, grams: number | null): number | null {
  if (per100g === null || grams === null) {
    return null;
  }
  return Math.round(((per100g * grams) / 100) * 100) / 100;
}

function measureFor(food: CronometerFood, measureId: number) {
  return food.measures?.find((m) => m.id === measureId);
}

function readDay(entry: DiaryEntry, fallback: string): string {
  if (typeof entry.day !== "string") {
    return fallback;
  }
  const [yearText, monthText, dayText] = entry.day.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) {
    return fallback;
  }
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function readMealGroup(order: number | undefined): { group: MealGroup; time: string | null } {
  if (typeof order !== "number") {
    return { group: "uncategorized", time: null };
  }
  const code = order >> 16;
  return MEAL_GROUP_BY_CODE[code] ?? { group: "uncategorized", time: null };
}

export function normalizeDiaryEntry(
  entry: DiaryEntry,
  foods: FoodLookup,
  fallbackDate: string,
): NormalizedFoodEntry | null {
  if (entry.type && entry.type !== "Serving") {
    return null;
  }
  if (entry.servingId === undefined || entry.servingId === null) {
    return null;
  }
  if (typeof entry.foodId !== "number") {
    return null;
  }

  const food = foods.get(entry.foodId);
  const grams = typeof entry.grams === "number" ? entry.grams : null;
  const measure =
    typeof entry.measureId === "number" && food
      ? measureFor(food, entry.measureId)
      : undefined;

  const amount =
    measure && grams !== null && typeof measure.value === "number" && measure.value > 0
      ? Math.round((grams / measure.value) * 100) / 100
      : null;

  const calories = food
    ? scaleToServing(nutrientPer100g(food, NUTRIENT_IDS.energy), grams)
    : null;
  const protein = food
    ? scaleToServing(nutrientPer100g(food, NUTRIENT_IDS.protein), grams)
    : null;
  const carbs = food
    ? scaleToServing(nutrientPer100g(food, NUTRIENT_IDS.carbs), grams)
    : null;
  const fat = food
    ? scaleToServing(nutrientPer100g(food, NUTRIENT_IDS.fat), grams)
    : null;

  const micros: Record<string, number> = {};
  if (food?.nutrients && grams !== null) {
    for (const nutrient of food.nutrients) {
      if (MACRO_IDS.has(nutrient.id)) continue;
      const value = scaleToServing(nutrient.amount, grams);
      if (value !== null) {
        micros[String(nutrient.id)] = value;
      }
    }
  }

  const meal = readMealGroup(entry.order);

  return {
    externalId: String(entry.servingId),
    entryDate: readDay(entry, fallbackDate),
    timeOfDay: meal.time,
    foodName: food?.name?.trim() || `Cronometer food #${entry.foodId}`,
    mealGroup: meal.group,
    amount,
    unit: measure?.name ?? (grams !== null ? "g" : null),
    grams,
    calories,
    protein,
    carbs,
    fat,
    micros,
  };
}

export function normalizeDiary(
  entries: DiaryEntry[],
  foods: FoodLookup,
  fallbackDate: string,
): NormalizedFoodEntry[] {
  const normalized: NormalizedFoodEntry[] = [];
  for (const entry of entries) {
    const result = normalizeDiaryEntry(entry, foods, fallbackDate);
    if (result) {
      normalized.push(result);
    }
  }
  return normalized;
}
