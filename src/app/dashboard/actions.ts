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

export async function saveDailyEntry(formData: FormData) {
  const { supabase, userId } = await getUserId();

  const scores = {
    fatigue: Number(formData.get("fatigue")),
    pain: Number(formData.get("pain")),
    brain_fog: Number(formData.get("brain_fog")),
    mood: Number(formData.get("mood")),
  };

  const supplementName = String(formData.get("supplement_name") ?? "").trim();
  const supplementTakenAt = optionalText(formData.get("supplement_taken_at"));
  const exerciseType = String(formData.get("exercise_type") ?? "").trim();
  const exerciseDoneAt = optionalText(formData.get("exercise_done_at"));
  const locationLabel = String(formData.get("location_label") ?? "").trim();
  const locationStartedAt = optionalText(formData.get("location_started_at"));

  const requests = [
    supabase.from("symptoms").upsert({
      user_id: userId,
      date: String(formData.get("date")),
      scores,
      notes: optionalText(formData.get("symptom_notes")),
    }),
  ];

  if (supplementName && supplementTakenAt) {
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

  if (exerciseType && exerciseDoneAt) {
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

  if (locationLabel && locationStartedAt) {
    requests.push(
      supabase.from("location").insert({
        user_id: userId,
        label: locationLabel,
        started_at: locationStartedAt,
        ended_at: optionalText(formData.get("location_ended_at")),
      }),
    );
  }

  const results = await Promise.all(requests);
  const firstError = results.find((result) => result.error)?.error;

  if (firstError) {
    redirect(`/dashboard?message=${encodeURIComponent(firstError.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Daily entry saved.");
}
