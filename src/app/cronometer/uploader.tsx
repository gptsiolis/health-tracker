"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { createWorker, PSM } from "tesseract.js";

type ParsedNutrition = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  micros: Record<string, number | string | null>;
  foods_list: string[];
  confidence?: "high" | "medium" | "low";
  warnings?: string[];
  raw_text?: string;
};

const emptyNutrition: ParsedNutrition = {
  calories: null,
  protein: null,
  carbs: null,
  fat: null,
  micros: {},
  foods_list: [],
  confidence: undefined,
  warnings: [],
  raw_text: "",
};

export function CronometerUploader() {
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedNutrition>(emptyNutrition);
  const [microsText, setMicrosText] = useState("{}");
  const [foodsText, setFoodsText] = useState("");
  const [eatenAt, setEatenAt] = useState("");
  const [status, setStatus] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canSave = useMemo(() => {
    return Boolean(eatenAt && parsed);
  }, [eatenAt, parsed]);

  function chooseImage(file: File | null) {
    setImage(file);
    setStatus("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function parseImage() {
    if (!image) {
      setStatus("Choose a screenshot first.");
      return;
    }

    setIsParsing(true);
    setStatus("Reading screenshot text...");

    try {
      const rawText = await readTextFromImage(image);
      const data = parseCronometerText(rawText);

      setParsed(data);
      setMicrosText(JSON.stringify(data.micros, null, 2));
      setFoodsText(data.foods_list.join("\n"));
      setStatus("Review and correct the parsed values.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Parse failed.");
    } finally {
      setIsParsing(false);
    }
  }

  async function saveFood() {
    setIsSaving(true);
    setStatus("Saving food entry...");

    try {
      const micros = JSON.parse(microsText || "{}");
      const foodsList = foodsText
        .split("\n")
        .map((food) => food.trim())
        .filter(Boolean);

      const response = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed,
          micros,
          foods_list: foodsList,
          eaten_at: eatenAt,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not save food entry.");
      }

      setStatus("Food entry saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium text-slate-950">Upload</h2>

        <label className="mt-5 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:bg-slate-100">
          <span className="font-medium text-slate-800">
            Choose a Cronometer screenshot
          </span>
          <span className="mt-1 text-sm text-slate-500">PNG, JPG, or WEBP</span>
          <input
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => chooseImage(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>

        {previewUrl ? (
          <Image
            alt="Cronometer screenshot preview"
            className="mt-5 max-h-[520px] w-full rounded-md border border-slate-200 object-contain"
            height={1200}
            unoptimized
            src={previewUrl}
            width={900}
          />
        ) : null}

        <button
          className="mt-5 w-full rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!image || isParsing}
          onClick={parseImage}
          type="button"
        >
          {isParsing ? "Parsing..." : "Parse screenshot"}
        </button>

        {status ? (
          <p className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
            {status}
          </p>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium text-slate-950">Review</h2>

        <div className="mt-5 space-y-4">
          <TextInput
            label="Eaten at"
            onChange={(value) => setEatenAt(value)}
            type="datetime-local"
            value={eatenAt}
          />
          {parsed.confidence ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <p className="font-medium">Parser confidence: {parsed.confidence}</p>
              {parsed.warnings && parsed.warnings.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {parsed.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <NumberInput
            label="Calories"
            onChange={(value) => setParsed({ ...parsed, calories: value })}
            value={parsed.calories}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberInput
              label="Protein"
              onChange={(value) => setParsed({ ...parsed, protein: value })}
              value={parsed.protein}
            />
            <NumberInput
              label="Carbs"
              onChange={(value) => setParsed({ ...parsed, carbs: value })}
              value={parsed.carbs}
            />
            <NumberInput
              label="Fat"
              onChange={(value) => setParsed({ ...parsed, fat: value })}
              value={parsed.fat}
            />
          </div>

          <label className="block">
            <span className="text-sm font-medium text-slate-800">Foods</span>
            <textarea
              className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
              onChange={(event) => setFoodsText(event.target.value)}
              value={foodsText}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-800">Micros JSON</span>
            <textarea
              className="mt-1 min-h-40 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-950 outline-none focus:border-teal-700"
              onChange={(event) => setMicrosText(event.target.value)}
              value={microsText}
            />
          </label>

          {parsed.raw_text ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-800">Raw OCR</span>
              <textarea
                className="mt-1 min-h-40 w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700 outline-none"
                readOnly
                value={parsed.raw_text}
              />
            </label>
          ) : null}

          <button
            className="w-full rounded-md bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!canSave || isSaving}
            onClick={saveFood}
            type="button"
          >
            {isSaving ? "Saving..." : "Save food entry"}
          </button>
        </div>
      </div>
    </section>
  );
}

async function readTextFromImage(image: File) {
  const worker = await createWorker("eng");

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });

    const processedImage = await preprocessImage(image);
    const processedResult = await worker.recognize(processedImage);
    const originalResult = await worker.recognize(image);

    return chooseBetterOcrText(
      processedResult.data.text,
      originalResult.data.text,
    );
  } finally {
    await worker.terminate();
  }
}

async function preprocessImage(image: File) {
  const bitmap = await createImageBitmap(image);
  const scale = 3;
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;

  const context = canvas.getContext("2d");

  if (!context) {
    return image;
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const average = (data[index] + data[index + 1] + data[index + 2]) / 3;
    const contrast = Math.max(0, Math.min(255, (average - 128) * 2.2 + 128));
    const value = contrast > 170 ? 255 : 0;

    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  context.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not prepare image for OCR."));
      }
    }, "image/png");
  });
}

function chooseBetterOcrText(first: string, second: string) {
  return scoreOcrText(first) >= scoreOcrText(second) ? first : second;
}

function scoreOcrText(text: string) {
  const usefulWords = [
    "calories",
    "energy",
    "protein",
    "carbs",
    "carbohydrates",
    "fat",
    "cronometer",
  ];
  const lettersAndNumbers = text.replace(/[^a-z0-9]/gi, "").length;
  const nutritionWords = usefulWords.filter((word) =>
    text.toLowerCase().includes(word),
  ).length;

  return lettersAndNumbers + nutritionWords * 100;
}

function parseCronometerText(rawText: string): ParsedNutrition {
  return {
    calories: findNumber(rawText, /\b(?:calories|energy|kcal)\b[^\d]*(\d+(?:\.\d+)?)/i),
    protein: findNumber(rawText, /\bprotein\b[^\d]*(\d+(?:\.\d+)?)/i),
    carbs: findNumber(rawText, /\b(?:carbs|carbohydrates)\b[^\d]*(\d+(?:\.\d+)?)/i),
    fat: findNumber(rawText, /\bfat\b[^\d]*(\d+(?:\.\d+)?)/i),
    micros: {},
    foods_list: [],
    confidence: "low",
    warnings: [
      "Local OCR was used. Review all values before saving.",
      "Foods and micronutrients are not auto-filled yet.",
    ],
    raw_text: rawText,
  };
}

function findNumber(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
        onChange={(event) =>
          onChange(event.target.value === "" ? null : Number(event.target.value))
        }
        type="number"
        value={value ?? ""}
      />
    </label>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-teal-700"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}
