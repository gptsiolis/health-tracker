export type MacroField = {
  key: "calories" | "protein" | "carbs" | "fat";
  name: string;
  unit: string;
};

export type MicroField = {
  key: string;
  name: string;
  unit: string;
  microId: number;
  category: "headline" | "vitamin" | "mineral" | "fat" | "other";
};

export const MACRO_FIELDS: MacroField[] = [
  { key: "calories", name: "Calories", unit: "kcal" },
  { key: "protein", name: "Protein", unit: "g" },
  { key: "carbs", name: "Carbs", unit: "g" },
  { key: "fat", name: "Fat", unit: "g" },
];

export const MICRO_FIELDS: MicroField[] = [
  // Shown in the headline macro tile
  { key: "fiber", name: "Fiber", unit: "g", microId: 291, category: "headline" },

  // Vitamins
  { key: "vitamin_a", name: "Vitamin A", unit: "µg", microId: 320, category: "vitamin" },
  { key: "vitamin_c", name: "Vitamin C", unit: "mg", microId: 401, category: "vitamin" },
  { key: "vitamin_d", name: "Vitamin D", unit: "IU", microId: 324, category: "vitamin" },
  { key: "vitamin_e", name: "Vitamin E", unit: "mg", microId: 323, category: "vitamin" },
  { key: "vitamin_k", name: "Vitamin K", unit: "µg", microId: 430, category: "vitamin" },
  { key: "b1", name: "B1 Thiamin", unit: "mg", microId: 404, category: "vitamin" },
  { key: "b2", name: "B2 Riboflavin", unit: "mg", microId: 405, category: "vitamin" },
  { key: "b3", name: "B3 Niacin", unit: "mg", microId: 406, category: "vitamin" },
  { key: "b5", name: "B5 Pantothenic", unit: "mg", microId: 410, category: "vitamin" },
  { key: "b6", name: "B6", unit: "mg", microId: 415, category: "vitamin" },
  { key: "folate", name: "Folate (B9)", unit: "µg", microId: 417, category: "vitamin" },
  { key: "b12", name: "B12", unit: "µg", microId: 418, category: "vitamin" },
  { key: "choline", name: "Choline", unit: "mg", microId: 421, category: "vitamin" },

  // Minerals
  { key: "calcium", name: "Calcium", unit: "mg", microId: 301, category: "mineral" },
  { key: "iron", name: "Iron", unit: "mg", microId: 303, category: "mineral" },
  { key: "magnesium", name: "Magnesium", unit: "mg", microId: 304, category: "mineral" },
  { key: "phosphorus", name: "Phosphorus", unit: "mg", microId: 305, category: "mineral" },
  { key: "potassium", name: "Potassium", unit: "mg", microId: 306, category: "mineral" },
  { key: "sodium", name: "Sodium", unit: "mg", microId: 307, category: "mineral" },
  { key: "zinc", name: "Zinc", unit: "mg", microId: 309, category: "mineral" },
  { key: "copper", name: "Copper", unit: "mg", microId: 312, category: "mineral" },
  { key: "manganese", name: "Manganese", unit: "mg", microId: 315, category: "mineral" },
  { key: "selenium", name: "Selenium", unit: "µg", microId: 317, category: "mineral" },

  // Fats
  { key: "saturated_fat", name: "Saturated Fat", unit: "g", microId: 606, category: "fat" },
  { key: "mono_fat", name: "Mono Fat", unit: "g", microId: 645, category: "fat" },
  { key: "poly_fat", name: "Poly Fat", unit: "g", microId: 646, category: "fat" },
  { key: "trans_fat", name: "Trans Fat", unit: "g", microId: 605, category: "fat" },
  { key: "cholesterol", name: "Cholesterol", unit: "mg", microId: 601, category: "fat" },
  { key: "omega3_ala", name: "Omega-3 ALA", unit: "g", microId: 851, category: "fat" },
  { key: "omega3_epa", name: "Omega-3 EPA", unit: "g", microId: 629, category: "fat" },
  { key: "omega3_dha", name: "Omega-3 DHA", unit: "g", microId: 621, category: "fat" },
  { key: "omega6_la", name: "Omega-6 LA", unit: "g", microId: 675, category: "fat" },

  // Other
  { key: "sugar", name: "Sugar", unit: "g", microId: 269, category: "other" },
  { key: "net_carbs", name: "Net Carbs", unit: "g", microId: -1205, category: "other" },
  { key: "caffeine", name: "Caffeine", unit: "mg", microId: 10009, category: "other" },
];

export const FIBER_MICRO_ID = 291;
