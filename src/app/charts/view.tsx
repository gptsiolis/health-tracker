"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartRow = {
  date: string;
  fatigue?: number;
  pain?: number;
  brain_fog?: number;
  mood?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sleep_hours?: number;
  sleep_score?: number;
  rhr?: number;
  hrv?: number;
  exercise_minutes?: number;
  exercise_intensity?: number;
};

type MetricKey = Exclude<keyof ChartRow, "date">;

const metrics: { key: MetricKey; label: string; color: string }[] = [
  { key: "fatigue", label: "Fatigue", color: "#0f766e" },
  { key: "pain", label: "Pain", color: "#b91c1c" },
  { key: "brain_fog", label: "Brain fog", color: "#7c3aed" },
  { key: "mood", label: "Mood", color: "#0369a1" },
  { key: "sleep_hours", label: "Sleep hours", color: "#1d4ed8" },
  { key: "sleep_score", label: "Sleep score", color: "#047857" },
  { key: "rhr", label: "RHR", color: "#be123c" },
  { key: "hrv", label: "HRV", color: "#4338ca" },
  { key: "calories", label: "Calories", color: "#c2410c" },
  { key: "protein", label: "Protein", color: "#15803d" },
  { key: "carbs", label: "Carbs", color: "#a16207" },
  { key: "fat", label: "Fat", color: "#6d28d9" },
  { key: "fiber", label: "Fiber", color: "#0891b2" },
  { key: "exercise_minutes", label: "Exercise minutes", color: "#0e7490" },
  { key: "exercise_intensity", label: "Exercise intensity", color: "#db2777" },
];

const defaultMetrics: MetricKey[] = [
  "fatigue",
  "pain",
  "sleep_hours",
  "hrv",
  "calories",
];

export function ChartsView({ rows }: { rows: ChartRow[] }) {
  const [selectedMetrics, setSelectedMetrics] =
    useState<MetricKey[]>(defaultMetrics);
  const normalizedRows = useMemo(
    () => normalizeRows(rows, selectedMetrics),
    [rows, selectedMetrics],
  );

  function toggleMetric(metric: MetricKey) {
    setSelectedMetrics((current) =>
      current.includes(metric)
        ? current.filter((item) => item !== metric)
        : [...current, metric],
    );
  }

  return (
    <section className="py-8">
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium text-slate-950">Metrics</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <label
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800"
              key={metric.key}
            >
              <input
                checked={selectedMetrics.includes(metric.key)}
                className="accent-teal-700"
                onChange={() => toggleMetric(metric.key)}
                type="checkbox"
              />
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: metric.color }}
              />
              {metric.label}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium text-slate-950">Normalized overlay</h2>
        <div className="mt-5 h-[440px]">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={normalizedRows} margin={{ left: 8, right: 24 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip />
              <Legend />
              {metrics
                .filter((metric) => selectedMetrics.includes(metric.key))
                .map((metric) => (
                  <Line
                    connectNulls
                    dataKey={metric.key}
                    dot={false}
                    key={metric.key}
                    name={metric.label}
                    stroke={metric.color}
                    strokeWidth={2}
                    type="monotone"
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function normalizeRows(rows: ChartRow[], selectedMetrics: MetricKey[]) {
  const ranges = Object.fromEntries(
    selectedMetrics.map((metric) => [metric, metricRange(rows, metric)]),
  ) as Record<MetricKey, { min: number; max: number } | null>;

  return rows.map((row) => {
    const normalizedRow: Record<string, string | number | null> = {
      date: row.date.slice(5),
    };

    for (const metric of selectedMetrics) {
      const value = row[metric];
      const range = ranges[metric];

      if (typeof value !== "number" || !range) {
        normalizedRow[metric] = null;
      } else if (range.max === range.min) {
        normalizedRow[metric] = 50;
      } else {
        normalizedRow[metric] =
          Math.round(((value - range.min) / (range.max - range.min)) * 1000) /
          10;
      }
    }

    return normalizedRow;
  });
}

function metricRange(rows: ChartRow[], metric: MetricKey) {
  const values = rows
    .map((row) => row[metric])
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return null;
  }

  return {
    max: Math.max(...values),
    min: Math.min(...values),
  };
}
