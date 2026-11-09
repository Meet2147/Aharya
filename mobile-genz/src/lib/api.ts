import type { DocumentPickerAsset } from 'expo-document-picker';
import { File } from 'expo-file-system';

import sample from '@/data/sample.json';
import { getProfile, read, write } from '@/lib/store';

// Set EXPO_PUBLIC_API_URL=http://<your-mac-ip>:8000 to use a local server instead
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://aharya.fastapicloud.dev';

export type ReportKind = 'blood' | 'urine' | 'inbody';
export type Status = 'queued' | 'processing' | 'completed' | 'needs_doctor' | 'failed';
export type Finding = {
  code: string;
  severity: 'urgent' | 'see_doctor' | 'attention' | 'info' | string;
  title: string;
  message: string;
  diet_actions: string[];
};
export type Targets = {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  water_l: number;
  notes: string[];
};
export type Assessment = {
  assessment_id: string;
  status: Status;
  stage: 'extracting' | 'analysing' | 'planning' | 'done' | null;
  error: string | null;
  warnings: string[];
  findings: Finding[];
  recommended_tests: { test: string; why: string }[];
  targets: Targets | null;
  created_at: string;
};
export type Meal = { slot: string; name: string; portion: string; kcal: number; protein_g: number };
export type GroceryItem = { name: string; quantity: number; unit: string; category: string };
export type Plan = {
  weeks: {
    week: number;
    days: { day: number; meals: Meal[]; total_kcal: number; total_protein_g: number }[];
    grocery: GroceryItem[];
  }[];
  guidance: string[];
  warnings: string[];
  disclaimer: string;
};
/** What the app shows: the assessment, plus its plan once there is one. */
export type Data = { assessment: Assessment; plan: Plan | null; sample?: boolean };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error("can't reach the server rn. check your internet and try again.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const d = body?.detail;
    throw new Error(
      typeof d === 'string' ? d : Array.isArray(d) ? d[0]?.msg : (d?.message ?? `request failed (${res.status})`),
    );
  }
  return body as T;
}

export const getAssessment = (id: string) => call<Assessment>(`/v1/assessments/${id}`);
export const getPlan = (id: string) => call<Plan>(`/v1/assessments/${id}/plan`);

/** Sends the saved profile and the picked reports. Returns the new assessment id. */
export async function submitAssessment(reports: Partial<Record<ReportKind, DocumentPickerAsset>>, weeks: number) {
  const p = getProfile();
  if (!p) throw new Error('finish your profile first.');
  const form = new FormData();
  const fields: Record<string, unknown> = {
    name: p.name,
    age: p.age,
    gender: p.gender,
    alcohol: p.alcohol,
    smoker: p.smoker,
    email: p.email,
    phone: p.phone,
    consent: true,
    diet_type: p.diet_type,
    cuisine: p.cuisine,
    activity_level: p.activity_level,
    allergies: p.allergies,
    height_cm: p.height_cm,
    weight_kg: p.weight_kg,
    waist_cm: p.waist_cm,
    weeks,
  };
  for (const [k, v] of Object.entries(fields)) if (v != null && v !== '') form.append(k, String(v));
  for (const [kind, a] of Object.entries(reports)) {
    // Web gives a browser File; on native, Expo's fetch needs an expo-file-system File
    form.append(`${kind}_report`, (a.file ?? new File(a.uri)) as unknown as Blob, a.name);
  }
  const res = await call<{ assessment_id: string }>('/v1/assessments', { method: 'POST', body: form });
  write('assessment_id', res.assessment_id);
  write('sample', false);
  return res.assessment_id;
}

export const currentId = () => read<string | null>('assessment_id', null);

export function loadSample() {
  write('sample', true);
  write('data', { ...(sample as unknown as Data), sample: true });
}

export const savedData = () => read<Data | null>('data', null);

/** Fetches the assessment and, when it is finished, its plan; saves both on the phone. */
export async function refresh(id: string): Promise<Data> {
  const assessment = await getAssessment(id);
  const plan = assessment.status === 'completed' ? await getPlan(id) : null;
  const data = { assessment, plan };
  if (assessment.status !== 'queued' && assessment.status !== 'processing') write('data', data);
  return data;
}

/** Which week and day of the plan is today: it repeats from the day the reports were sent. */
export function planToday(plan: Plan, since: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000));
  const week = Math.floor(days / 7) % plan.weeks.length;
  return { week, day: days % 7 };
}
