import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ParsedNutrition = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  micros: Record<string, number | string | null>;
  foods_list: string[];
  confidence: "high" | "medium" | "low";
  warnings: string[];
  raw_text: string;
};

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY in .env.local." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Upload an image file." }, { status: 400 });
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  const imageUrl = `data:${image.type};base64,${bytes.toString("base64")}`;
  try {
    const parsed = await parseCronometerImage(imageUrl);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not parse Cronometer screenshot.",
      },
      { status: 500 },
    );
  }
}

async function parseCronometerImage(imageUrl: string): Promise<ParsedNutrition> {
  try {
    return await parseStructuredNutrition(imageUrl);
  } catch (error) {
    if (!isRefusalError(error)) {
      throw error;
    }

    const rawText = await transcribeVisibleText(imageUrl);
    return parseRawCronometerText(rawText);
  }
}

async function parseStructuredNutrition(
  imageUrl: string,
): Promise<ParsedNutrition> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Transcribe nutrition facts from this Cronometer screenshot.",
                "This is an OCR task for user-provided nutrition information.",
                "Do not provide medical, diet, or health advice.",
                "Use only text and numbers that are clearly visible in the image.",
                "Do not estimate, calculate, or infer hidden values.",
                "If a value is unclear, return null for that value and add a warning.",
                "Extract calories, protein, carbs, and fat from the visible daily summary totals only.",
                "Use grams for protein, carbs, and fat.",
                "Put visible vitamins, minerals, and other micronutrients in micros using the label shown in the screenshot.",
                "Include units in micros values when the screenshot shows a unit, for example '320 mg' or '85%'.",
                "Put visible food names in foods_list. Do not invent foods.",
                "Set confidence to high only when the main totals are clearly readable.",
              ].join(" "),
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "cronometer_nutrition",
          strict: false,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              calories: { type: ["number", "null"] },
              protein: { type: ["number", "null"] },
              carbs: { type: ["number", "null"] },
              fat: { type: ["number", "null"] },
              micros: {
                type: "object",
                additionalProperties: {
                  type: ["number", "string", "null"],
                },
              },
              foods_list: {
                type: "array",
                items: { type: "string" },
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
              },
              warnings: {
                type: "array",
                items: { type: "string" },
              },
              raw_text: { type: "string" },
            },
            required: [
              "calories",
              "protein",
              "carbs",
              "fat",
              "micros",
              "foods_list",
              "confidence",
              "warnings",
              "raw_text",
            ],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: ${errorText}`);
  }

  const data = await response.json();
  const outputText = extractOutputText(data);

  return JSON.parse(outputText) as ParsedNutrition;
}

async function transcribeVisibleText(imageUrl: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "Transcribe visible text from this app screenshot.",
                "This is only an OCR task.",
                "Do not interpret, advise, summarize, or classify anything.",
                "Return plain text lines in reading order.",
              ].join(" "),
            },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "high",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI OCR request failed: ${errorText}`);
  }

  const data = await response.json();
  return extractOutputText(data);
}

function parseRawCronometerText(rawText: string): ParsedNutrition {
  return {
    calories: findNumber(rawText, /\b(?:calories|energy|kcal)\b[^\d]*(\d+(?:\.\d+)?)/i),
    protein: findNumber(rawText, /\bprotein\b[^\d]*(\d+(?:\.\d+)?)/i),
    carbs: findNumber(rawText, /\b(?:carbs|carbohydrates)\b[^\d]*(\d+(?:\.\d+)?)/i),
    fat: findNumber(rawText, /\bfat\b[^\d]*(\d+(?:\.\d+)?)/i),
    micros: {},
    foods_list: [],
    confidence: "low",
    warnings: [
      "OpenAI refused structured extraction, so the app used OCR text and simple local parsing.",
      "Review all fields carefully before saving.",
    ],
    raw_text: rawText,
  };
}

function findNumber(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

function isRefusalError(error: unknown) {
  return error instanceof Error && error.message.includes("OpenAI refused");
}

function extractOutputText(data: unknown) {
  if (
    typeof data === "object" &&
    data !== null &&
    "output_text" in data &&
    typeof data.output_text === "string"
  ) {
    return data.output_text;
  }

  const nestedText = findTextValue(data);

  if (nestedText) {
    return nestedText;
  }

  throw new Error(
    `OpenAI response did not include text output. Response shape: ${JSON.stringify(data).slice(0, 1000)}`,
  );
}

function findTextValue(value: unknown): string | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  if (
    "type" in value &&
    value.type === "output_text" &&
    "text" in value &&
    typeof value.text === "string"
  ) {
    return value.text;
  }

  if (
    "type" in value &&
    value.type === "refusal" &&
    "refusal" in value &&
    typeof value.refusal === "string"
  ) {
    throw new Error(`OpenAI refused to parse the image: ${value.refusal}`);
  }

  if (
    "type" in value &&
    value.type === "json_schema" &&
    "text" in value &&
    typeof value.text === "string"
  ) {
    return value.text;
  }

  if ("parsed" in value && typeof value.parsed === "object") {
    return JSON.stringify(value.parsed);
  }

  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const text = findTextValue(item);
        if (text) {
          return text;
        }
      }
    } else {
      const text = findTextValue(child);
      if (text) {
        return text;
      }
    }
  }

  return null;
}
