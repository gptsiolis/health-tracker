export type DiaryEntry = {
  servingId?: number | string;
  foodId?: number;
  foodName?: string;
  food?: { name?: string; brand?: string } & Record<string, unknown>;
  measureId?: number;
  measureName?: string;
  grams?: number;
  amount?: number;
  unitName?: string;
  day?: string;
  time?: string;
  order?: number;
  type?: string;
  nutrients?: Record<string, number>;
} & Record<string, unknown>;

export type DiaryResponse = {
  diary?: DiaryEntry[];
  summary?: Record<string, unknown>;
};

export type NormalizedFoodEntry = {
  externalId: string;
  entryDate: string;
  timeOfDay: string | null;
  foodName: string;
  brand: string | null;
  amount: number | null;
  unit: string | null;
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
