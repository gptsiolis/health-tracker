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

function requiredText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  return text;
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

export async function deleteEntry(formData: FormData) {
  const { supabase } = await getUserId();
  const table = String(formData.get("table") ?? "");
  const id = String(formData.get("id") ?? "");
  const journalDate = selectedDate(formData);
  const allowedTables = [
    "exercise",
    "foods",
    "location",
    "sleep",
    "supplements",
    "symptoms",
  ];

  if (!allowedTables.includes(table) || !id) {
    redirect(`/dashboard?date=${journalDate}&message=Invalid delete request.`);
  }

  const { error } = await supabase.from(table).delete().eq("id", id);

  if (error) {
    redirect(
      `/dashboard?date=${journalDate}&message=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${journalDate}&message=Entry deleted.`);
}

export async function createVariable(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const journalDate = selectedDate(formData);
  const name = requiredText(formData.get("name"));
  const bucket = requiredText(formData.get("bucket"));
  const allowedBuckets = [
    "supplements",
    "food",
    "exercise",
    "location",
    "sleep",
    "notes",
  ];

  if (!name || !bucket || !allowedBuckets.includes(bucket)) {
    redirect(`/dashboard?date=${journalDate}&message=Variable needs a name and bucket.`);
  }

  const { error } = await supabase.from("variables").insert({
    user_id: userId,
    name,
    bucket,
    default_unit: optionalText(formData.get("default_unit")),
    default_amount: optionalNumber(formData.get("default_amount")),
    default_time: null,
    config: configForVariable(bucket, formData),
  });

  if (error) {
    redirect(
      `/dashboard?date=${journalDate}&message=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${journalDate}&message=Variable created.`);
}

export async function logVariableEntry(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const journalDate = selectedDate(formData);
  const variableId = requiredText(formData.get("variable_id"));
  const bucket = requiredText(formData.get("bucket"));
  const timeOfDay = optionalText(formData.get("time_of_day"));
  const notes = optionalText(formData.get("notes"));

  if (!variableId || !bucket) {
    redirect(`/dashboard?date=${journalDate}&message=Choose a variable first.`);
  }

  const data = dataForBucket(bucket, formData);

  const { error } = await supabase.from("journal_entries").insert({
    user_id: userId,
    variable_id: variableId,
    bucket,
    entry_date: journalDate,
    time_of_day: timeOfDay,
    data,
    notes,
  });

  if (error) {
    redirect(
      `/dashboard?date=${journalDate}&message=${encodeURIComponent(error.message)}`,
    );
  }

  await updateVariableDefaults({
    bucket,
    formData,
    supabase,
    timeOfDay,
    variableId,
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${journalDate}&message=Entry logged.`);
}

export async function saveDailyOutputs(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const journalDate = selectedDate(formData);
  const scores: Record<string, number> = {};

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("symptom_score_")) {
      scores[key.replace("symptom_score_", "")] = Number(value);
    }
  }

  const { data } = await supabase
    .from("symptoms")
    .select("notes")
    .eq("date", journalDate)
    .maybeSingle();
  const symptomMeta = parseSymptomMeta(data?.notes ?? null);

  const { error } = await supabase.from("symptoms").upsert({
    user_id: userId,
    date: journalDate,
    scores,
    notes: formatSymptomNotes({
      deletedSymptoms: symptomMeta.deletedSymptoms,
      text: optionalText(formData.get("symptom_notes")) ?? "",
    }),
  });

  if (error) {
    redirect(
      `/dashboard?date=${journalDate}&message=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${journalDate}&message=Daily symptoms saved.`);
}

export async function saveDailyJournalNote(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const journalDate = selectedDate(formData);

  const { error } = await supabase.from("daily_journal_notes").upsert({
    user_id: userId,
    date: journalDate,
    notes: String(formData.get("journal_notes") ?? ""),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    redirect(
      `/dashboard?date=${journalDate}&message=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${journalDate}&message=Journal note saved.`);
}

export async function deleteJournalEntry(formData: FormData) {
  const { supabase } = await getUserId();
  const journalDate = selectedDate(formData);
  const id = requiredText(formData.get("id"));

  if (!id) {
    redirect(`/dashboard?date=${journalDate}&message=Invalid delete request.`);
  }

  const { error } = await supabase.from("journal_entries").delete().eq("id", id);

  if (error) {
    redirect(
      `/dashboard?date=${journalDate}&message=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${journalDate}&message=Entry deleted.`);
}

function dataForBucket(bucket: string, formData: FormData) {
  if (bucket === "supplements") {
    return {
      amount: optionalNumber(formData.get("amount")),
      unit: optionalText(formData.get("unit")),
    };
  }

  if (bucket === "food") {
    return {
      calories: optionalNumber(formData.get("calories")),
      protein: optionalNumber(formData.get("protein")),
      carbs: optionalNumber(formData.get("carbs")),
      fat: optionalNumber(formData.get("fat")),
    };
  }

  if (bucket === "exercise") {
    return {
      duration_min: optionalNumber(formData.get("duration_min")),
      intensity: optionalNumber(formData.get("intensity")),
    };
  }

  if (bucket === "location") {
    return {
      end_time: optionalText(formData.get("end_time")),
    };
  }

  if (bucket === "sleep") {
    return {
      value: optionalNumber(formData.get("value")),
    };
  }

  return {};
}

async function updateVariableDefaults({
  bucket,
  formData,
  supabase,
  timeOfDay,
  variableId,
}: {
  bucket: string;
  formData: FormData;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  timeOfDay: string | null;
  variableId: string;
}) {
  const defaults: Record<string, number | string | null> = {
    default_time: timeOfDay,
  };

  if (bucket === "supplements") {
    defaults.default_amount = optionalNumber(formData.get("amount"));
    defaults.default_unit = optionalText(formData.get("unit"));
  }

  if (bucket === "sleep") {
    return;
  }

  await supabase.from("variables").update(defaults).eq("id", variableId);
}

function configForVariable(bucket: string, formData: FormData) {
  if (bucket !== "sleep") {
    return {};
  }

  const metricType = String(formData.get("sleep_metric_type") ?? "other_number");
  const configByMetric: Record<string, { label: string; unit?: string }> = {
    rhr: { label: "RHR", unit: "bpm" },
    hrv: { label: "HRV", unit: "ms" },
    sleep_hours: { label: "Sleep hours", unit: "hours" },
    sleep_score: { label: "Sleep score" },
  };
  const metricConfig = configByMetric[metricType] ?? {
    label: "Value",
    unit: optionalText(formData.get("sleep_unit")) ?? undefined,
  };

  return {
    field_type: "single_number",
    label: metricConfig.label,
    unit: metricConfig.unit,
    show_time: false,
  };
}

export async function addSymptomDefinition(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const journalDate = selectedDate(formData);
  const name = requiredText(formData.get("symptom_name"));

  if (!name) {
    redirect(`/dashboard?date=${journalDate}&message=Symptom needs a name.`);
  }

  const { error } = await supabase.from("symptom_definitions").insert({
    user_id: userId,
    key: symptomKey(name),
    name,
  });

  if (error) {
    redirect(
      `/dashboard?date=${journalDate}&message=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${journalDate}&message=Symptom added.`);
}

export async function archiveSymptomDefinition(formData: FormData) {
  const { supabase } = await getUserId();
  const journalDate = selectedDate(formData);
  const id = requiredText(formData.get("symptom_definition_id"));

  if (!id) {
    redirect(`/dashboard?date=${journalDate}&message=Invalid symptom.`);
  }

  const { error } = await supabase
    .from("symptom_definitions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(
      `/dashboard?date=${journalDate}&message=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${journalDate}&message=Symptom deleted.`);
}

export async function deleteSymptomDefinition(formData: FormData) {
  const { supabase, userId } = await getUserId();
  const journalDate = selectedDate(formData);
  const key = requiredText(formData.get("symptom_key"));

  if (!key) {
    redirect(`/dashboard?date=${journalDate}&message=Invalid symptom.`);
  }

  const { data } = await supabase
    .from("symptoms")
    .select("scores, notes")
    .eq("date", journalDate)
    .maybeSingle();

  const symptomMeta = parseSymptomMeta(data?.notes ?? null);
  const scores: Record<string, number> = {
    ...defaultSymptomScores(),
    ...((data?.scores as Record<string, number> | null) ?? {}),
  };
  const deletedSymptoms = Array.from(
    new Set([...symptomMeta.deletedSymptoms, key]),
  );
  delete scores[key];

  const { error } = await supabase.from("symptoms").upsert({
    user_id: userId,
    date: journalDate,
    scores,
    notes: formatSymptomNotes({
      deletedSymptoms,
      text: symptomMeta.text,
    }),
  });

  if (error) {
    redirect(
      `/dashboard?date=${journalDate}&message=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?date=${journalDate}&message=Symptom removed.`);
}

function defaultSymptomScores() {
  return {
    fatigue: 5,
    pain: 5,
    brain_fog: 5,
    mood: 5,
  };
}

function parseSymptomMeta(notes: string | null) {
  if (!notes) {
    return { deletedSymptoms: [] as string[], text: "" };
  }

  try {
    const parsed = JSON.parse(notes) as {
      deletedSymptoms?: string[];
      text?: string;
    };

    return {
      deletedSymptoms: parsed.deletedSymptoms ?? [],
      text: parsed.text ?? "",
    };
  } catch {
    return { deletedSymptoms: [] as string[], text: notes };
  }
}

function formatSymptomNotes({
  deletedSymptoms,
  text,
}: {
  deletedSymptoms: string[];
  text: string;
}) {
  return JSON.stringify({ deletedSymptoms, text });
}

function symptomKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
