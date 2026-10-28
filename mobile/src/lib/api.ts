import type { DocumentPickerAsset } from 'expo-document-picker';
import { File } from 'expo-file-system';

import { Alert } from 'react-native';

import { getProfile, saveProfile, supabase, toProfile, type Answers } from '@/lib/supabase';

// Set EXPO_PUBLIC_API_URL=http://<your-mac-ip>:8000 to use a local server instead
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://aharya.fastapicloud.dev';

export type ReportKind = 'blood' | 'urine' | 'inbody';
export type Status = 'queued' | 'processing' | 'completed' | 'needs_doctor' | 'failed';
export type Assessment = {
  assessment_id: string;
  status: Status;
  stage: 'extracting' | 'analysing' | 'planning' | 'done' | null;
  error: string | null;
  warnings: string[];
  findings: Finding[];
  recommended_tests: { test: string; why: string }[];
  targets: {
    calories_kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fibre_g: number;
    water_l: number;
    notes: string[];
  } | null;
  reports: { kind: ReportKind; report_date: string | null }[];
  created_at: string;
};
export type Finding = {
  code: string;
  severity: 'urgent' | 'see_doctor' | 'attention' | string;
  title: string;
  message: string;
  diet_actions: string[];
};
export type Meal = { slot: string; name: string; portion: string; kcal: number; protein_g: number };
export type Plan = {
  weeks: {
    week: number;
    days: { day: number; meals: Meal[]; total_kcal: number; total_protein_g: number }[];
    grocery: { name: string; quantity: number; unit: string; category: string }[];
  }[];
  guidance: string[];
  warnings: string[];
  disclaimer: string;
};
export type Biomarker = {
  code: string | null;
  name: string;
  value: number | string;
  unit: string | null;
  flag: 'low' | 'high' | 'normal' | 'abnormal' | null;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const d = body?.detail;
    throw new Error(
      typeof d === 'string' ? d : Array.isArray(d) ? d[0]?.msg : d?.message ?? `Request failed (${res.status})`,
    );
  }
  return body as T;
}

// ponytail: latest assessment id lives on this device; add GET /v1/assessments per user once the API has auth
const LATEST = 'aharya.assessment';
// No localStorage while the web build is statically rendered
export const latestAssessmentId = () =>
  typeof localStorage === 'undefined' ? null : localStorage.getItem(LATEST);

const DIET = { Vegetarian: 'veg', Eggetarian: 'eggetarian', 'Non-vegetarian': 'non_veg', Vegan: 'vegan' };

/**
 * Sends the reports with the user's profile; blood is required.
 * answers: onboarding answers, used before the account exists (no email yet). Otherwise the saved profile.
 */
export async function submitAssessment(reports: Partial<Record<ReportKind, DocumentPickerAsset>>, answers?: Answers) {
  const [{ data }, saved] = await Promise.all([supabase.auth.getUser(), answers ? null : getProfile()]);
  const p = answers ? toProfile(answers) : saved;
  if (!p) throw new Error('Finish your profile first.');
  const form = new FormData();
  const fields: Record<string, unknown> = {
    name: p.name,
    age: p.age,
    gender: p.sex?.toLowerCase(),
    alcohol: p.alcohol,
    smoker: p.smoker,
    email: data.user?.email,
    phone: p.phone,
    consent: true,
    diet_type: DIET[p.diet as keyof typeof DIET],
    conditions: p.conditions.join(','),
    allergies: p.allergies,
    height_cm: p.height_cm,
    weight_kg: p.weight_kg,
  };
  for (const [k, v] of Object.entries(fields)) if (v != null && v !== '') form.append(k, String(v));
  for (const [kind, a] of Object.entries(reports)) {
    // Web gives a browser File; on native, Expo's fetch needs an expo-file-system File (not { uri, name, type })
    form.append(`${kind}_report`, a.file ?? new File(a.uri), a.name);
  }
  const res = await call<{ assessment_id: string }>('/v1/assessments', { method: 'POST', body: form });
  localStorage.setItem(LATEST, res.assessment_id);
  return res.assessment_id;
}

// The progress page, which moves on to home once the report is fully read and planned
export const READING = '/plan?next=home';

/** Right after a new account exists: save the onboarding answers (reports were already sent). */
export async function completeSignUp(answers?: Answers) {
  if (!answers) return;
  await saveProfile(answers).catch((e) =>
    Alert.alert('Could not save your profile', e instanceof Error ? e.message : String(e)),
  );
}

export const getAssessment = (id: string) => call<Assessment>(`/v1/assessments/${id}`);
export const getBiomarkers = (id: string) =>
  call<{ biomarkers: Biomarker[] }>(`/v1/assessments/${id}/biomarkers`).then((r) => r.biomarkers);
export const getPlan = (id: string) => call<Plan>(`/v1/assessments/${id}/plan`);
