export type DiaryEntry = {
  servingId?: number | string;
  foodId?: number;
  measureId?: number;
  grams?: number;
  day?: string;
  order?: number;
  type?: string;
};

export type MealGroup = "breakfast" | "lunch" | "dinner" | "snacks" | "uncategorized";

export type DiaryResponse = {
  diary?: DiaryEntry[];
  summary?: Record<string, unknown>;
};

export type NormalizedFoodEntry = {
  externalId: string;
  entryDate: string;
  timeOfDay: string | null;
  foodName: string;
  mealGroup: MealGroup;
  amount: number | null;
  unit: string | null;
  grams: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  micros: Record<string, number>;
};

export type CronometerSession = {
  userId: number;
  token: string;
  fetchedAt: number;
};
