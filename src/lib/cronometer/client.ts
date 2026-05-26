import type { CronometerSession, DiaryResponse } from "./types";

const BASE_URL = "https://mobile.cronometer.com";
const TIMEZONE = "America/Vancouver";

const APP_AUTH = {
  api: 3,
  os: "Android",
  build: "2807",
  flavour: "free",
} as const;

const HEADERS = {
  "user-agent": "Dart/3.9 (dart:io)",
  "content-type": "text/plain; charset=utf-8",
  "accept-encoding": "gzip",
};

let cachedSession: CronometerSession | null = null;

export class CronometerError extends Error {}

function readCredentials() {
  const email = process.env.CRONOMETER_EMAIL;
  const password = process.env.CRONOMETER_PASSWORD;

  if (!email || !password) {
    throw new CronometerError(
      "CRONOMETER_EMAIL and CRONOMETER_PASSWORD env vars must be set",
    );
  }

  return { email, password };
}

async function login(): Promise<CronometerSession> {
  const { email, password } = readCredentials();

  const payload = {
    email,
    password,
    timezone: TIMEZONE,
    userCode: null,
    build: "4.48.2 b2807-a",
    device: "Android 14 (SDK 34), Google Pixel 6 Pro",
    firebaseToken: "",
    features: {
      food_search_config: '{"newSearch": true, "newSpellcheck": true}',
      use_gpt_autofill: "true",
    },
    auth: { userId: null, token: null, ...APP_AUTH },
    lastSeen: 0,
    config: { call_version: 2 },
  };

  const response = await fetch(`${BASE_URL}/api/v2/login`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new CronometerError(
      `Cronometer login failed with status ${response.status}`,
    );
  }

  const data = (await response.json()) as {
    id?: number;
    sessionKey?: string;
    result?: string;
  };

  if (!data.id || !data.sessionKey) {
    throw new CronometerError(`Cronometer login rejected: ${JSON.stringify(data)}`);
  }

  return { userId: data.id, token: data.sessionKey, fetchedAt: Date.now() };
}

async function ensureSession(force = false): Promise<CronometerSession> {
  if (!force && cachedSession) {
    return cachedSession;
  }

  cachedSession = await login();
  return cachedSession;
}

function buildAuthBlock(session: CronometerSession) {
  return { userId: session.userId, token: session.token, ...APP_AUTH };
}

async function postV2<T>(endpoint: string, payload: Record<string, unknown>): Promise<T> {
  let session = await ensureSession();

  for (let attempt = 0; attempt < 2; attempt++) {
    const body = { ...payload, auth: buildAuthBlock(session), lastSeen: 0 };
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(body),
    });

    if (response.status === 401 || response.status === 403) {
      cachedSession = null;
      session = await ensureSession(true);
      continue;
    }

    if (!response.ok) {
      throw new CronometerError(
        `Cronometer ${endpoint} returned ${response.status}`,
      );
    }

    const data = (await response.json()) as unknown;

    if (
      data &&
      typeof data === "object" &&
      (data as { result?: string }).result === "FAILURE"
    ) {
      if (attempt === 0) {
        cachedSession = null;
        session = await ensureSession(true);
        continue;
      }
      throw new CronometerError(
        `Cronometer ${endpoint} reported FAILURE: ${JSON.stringify(data)}`,
      );
    }

    return data as T;
  }

  throw new CronometerError(`Cronometer ${endpoint} failed after retry`);
}

function formatCronometerDay(isoDate: string): string {
  const [yearText, monthText, dayText] = isoDate.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    throw new CronometerError(`Invalid date for Cronometer: ${isoDate}`);
  }

  return `${year}-${month}-${day}`;
}

export async function getDiary(isoDate: string): Promise<DiaryResponse> {
  return postV2<DiaryResponse>("/api/v2/get_diary", {
    day: formatCronometerDay(isoDate),
    config: { call_version: 1 },
  });
}

export function resetCronometerSession() {
  cachedSession = null;
}
