"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getUserId() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, userId: user.id };
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (value === null || String(value).trim() === "") {
    return null;
  }

  return Number(value);
}

function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}

function selectedDate(formData: FormData) {
  return String(formData.get("journal_date") ?? "").trim();
}

function timestampForDate(date: string, timeValue: FormDataEntryValue | null) {
  const time = optionalText(timeValue) ?? "12:00";
  return `${date}T${time}`;
}

export async function saveDailyEntry(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const journalDate = selectedDate(formData);

  const scores = {
    fatigue: Number(formData.get("fatigue")),
    pain: Number(formData.get("pain")),
    brain_fog: Number(formData.get("brain_fog")),
    mood: Number(formData.get("mood")),
  };

  const supplementName = String(formData.get("supplement_name") ?? "").trim();
  const supplementTakenAt = timestampForDate(
    journalDate,
    formData.get("supplement_time"),
  );
  const exerciseType = String(formData.get("exercise_type") ?? "").trim();
  const exerciseDoneAt = timestampForDate(journalDate, formData.get("exercise_time"));
  const locationLabel = String(formData.get("location_label") ?? "").trim();
  const locationStartedAt = timestampForDate(
    journalDate,
    formData.get("location_start_time"),
  );
  const locationEndTime = optionalText(formData.get("location_end_time"));

  const requests = [
    supabase.from("symptoms").upsert({
      user_id: userId,
      date: journalDate,
      scores,
      notes: optionalText(formData.get("symptom_notes")),
    }),
  ];

  if (supplementName) {
    requests.push(
      supabase.from("supplements").insert({
        user_id: userId,
        name: supplementName,
        dose: optionalNumber(formData.get("supplement_dose")),
        unit: optionalText(formData.get("supplement_unit")),
        taken_at: supplementTakenAt,
        notes: optionalText(formData.get("supplement_notes")),
      }),
    );
  }

  if (exerciseType) {
    requests.push(
      supabase.from("exercise").insert({
        user_id: userId,
        type: exerciseType,
        duration_min: optionalNumber(formData.get("exercise_duration_min")),
        intensity: optionalNumber(formData.get("exercise_intensity")),
        done_at: exerciseDoneAt,
        notes: optionalText(formData.get("exercise_notes")),
      }),
    );
  }

  if (locationLabel) {
    requests.push(
      supabase.from("location").insert({
        user_id: userId,
        label: locationLabel,
        started_at: locationStartedAt,
        ended_at: locationEndTime ? timestampForDate(journalDate, locationEndTime) : null,
      }),
    );
  }

  const results = await Promise.all(requests);
  const firstError = results.find((result) => result.error)?.error;

  if (firstError) {
    redirect(`/dashboard?message=${encodeURIComponent(firstError.message)}`);
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${journalDate}&message=Daily entry saved.`);
}

export async function saveManualFood(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const journalDate = selectedDate(formData);
  const eatenAt = timestampForDate(journalDate, formData.get("food_time"));
  const foodsList = String(formData.get("foods_list") ?? "")
    .split("\n")
    .map((food) => food.trim())
    .filter(Boolean);
  const microsText = String(formData.get("micros") ?? "").trim();
  let micros: Record<string, number | string | null> = {};

  if (microsText) {
    try {
      micros = JSON.parse(microsText) as Record<string, number | string | null>;
    } catch {
      redirect("/dashboard?message=Micros must be valid JSON.");
    }
  }

  if (!eatenAt || Number.isNaN(new Date(eatenAt).getTime())) {
    redirect(
      `/dashboard?date=${journalDate}&message=Food needs a valid journal date.`,
    );
  }

  const { error } = await supabase.from("foods").insert({
    user_id: userId,
    calories: optionalNumber(formData.get("calories")),
    protein: optionalNumber(formData.get("protein")),
    carbs: optionalNumber(formData.get("carbs")),
    fat: optionalNumber(formData.get("fat")),
    micros,
    foods_list: foodsList,
    eaten_at: eatenAt,
    source: "manual",
    raw_image_url: null,
  });

  if (error) {
    redirect(
      `/dashboard?date=${journalDate}&message=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${journalDate}&message=Food saved.`);
}
