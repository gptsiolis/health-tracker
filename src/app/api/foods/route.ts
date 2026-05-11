import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type FoodPayload = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  micros: Record<string, number | string | null>;
  foods_list: string[];
  eaten_at: string;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const payload = (await request.json()) as FoodPayload;

  const { error } = await supabase.from("foods").insert({
    user_id: user.id,
    calories: payload.calories,
    protein: payload.protein,
    carbs: payload.carbs,
    fat: payload.fat,
    micros: payload.micros,
    foods_list: payload.foods_list,
    eaten_at: payload.eaten_at,
    source: "cronometer_screenshot",
    raw_image_url: null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
