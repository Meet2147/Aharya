import Constants from 'expo-constants';
import type { DocumentPickerAsset } from 'expo-document-picker';

import { getProfile, supabase } from '@/lib/supabase';

// In dev the API runs on the same machine as Metro, so reuse its LAN host (works on a real phone).
const host = Constants.expoConfig?.hostUri?.split(':')[0];
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (host ? `http://${host}:8000` : 'http://127.0.0.1:8000');

export type ReportKind = 'blood' | 'urine' | 'inbody';
export type Status = 'queued' | 'processing' | 'completed' | 'needs_doctor' | 'failed';
export type Assessment = {
  assessment_id: string;
  status: Status;
  error: string | null;
  targets: { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null;
  reports: { kind: ReportKind; report_date: string | null }[];
  created_at: string;
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

/** Sends the signed-in user's profile with the picked reports; blood is required. */
export async function submitAssessment(reports: Partial<Record<ReportKind, DocumentPickerAsset>>) {
  const [{ data }, p] = await Promise.all([supabase.auth.getUser(), getProfile()]);
  if (!data.user?.email || !p) throw new Error('Sign in and finish your profile first.');
  const form = new FormData();
  const fields: Record<string, unknown> = {
    name: p.name,
    age: p.age,
    gender: p.sex?.toLowerCase(),
    alcohol: p.alcohol,
    smoker: p.smoker,
    email: data.user.email,
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
    // Web gives a real File; native FormData takes { uri, name, type }
    form.append(`${kind}_report`, a.file ?? ({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/pdf' } as never));
  }
  const res = await call<{ assessment_id: string }>('/v1/assessments', { method: 'POST', body: form });
  localStorage.setItem(LATEST, res.assessment_id);
  return res.assessment_id;
}

export const getAssessment = (id: string) => call<Assessment>(`/v1/assessments/${id}`);
export const getBiomarkers = (id: string) =>
  call<{ biomarkers: Biomarker[] }>(`/v1/assessments/${id}/biomarkers`).then((r) => r.biomarkers);
