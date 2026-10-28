import 'react-native-url-polyfill/auto';
import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { TurboModuleRegistry } from 'react-native';

import { clearCache } from '@/lib/cache';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      // No localStorage while the web build is statically rendered on the server
      storage: typeof localStorage === 'undefined' ? undefined : localStorage,
      autoRefreshToken: true,
      persistSession: typeof localStorage !== 'undefined',
      detectSessionInUrl: false,
    },
  },
);

/** Onboarding answers, keyed by step: text steps are strings, choice steps are arrays. */
export type Answers = Record<string, string | string[]>;

// The profile travels to sign-up as a URL param, so tolerate it being missing or malformed
export function parseProfile(json?: string): Answers | undefined {
  try {
    const v = JSON.parse(json ?? '');
    return v && typeof v === 'object' ? v : undefined;
  } catch {
    return undefined;
  }
}

// Only load the library if its native module is in this build. In Expo Go (or a dev build made
// before it was installed) importing it throws, and Metro shows that as a red screen even inside try/catch.
async function google() {
  if (!TurboModuleRegistry.get('RNGoogleSignin')) {
    throw new Error(
      'Google sign-in is not in this build. Run "npx expo run:ios" or "npx expo run:android" (it does not work in Expo Go).',
    );
  }
  const m = await import('@react-native-google-signin/google-signin');
  m.GoogleSignin.configure({
    // Web client ID is required on both platforms: it is the audience of the idToken Supabase verifies
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  return m;
}

/** Native Google sheet, then exchanges the idToken for a Supabase session. false = user cancelled. */
export async function signInWithGoogle() {
  const { GoogleSignin, isSuccessResponse } = await google();
  await GoogleSignin.hasPlayServices();
  // Forget the last Google account so the chooser always shows instead of silently reusing it
  await GoogleSignin.signOut().catch(() => {});
  const res = await GoogleSignin.signIn();
  if (!isSuccessResponse(res)) return false;
  if (!res.data.idToken) throw new Error('Google did not return an ID token.');
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: res.data.idToken,
  });
  if (error) throw error;
  return true;
}

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)?.trim() || null;
const num = (v?: string | string[]) => (first(v) ? Number(first(v)) : null);
const yes = (v?: string | string[]) => (first(v) ? first(v) === 'Yes' : null);

/** Onboarding answers in the shape of a saved profile. */
export const toProfile = (a: Answers): Profile => ({
  name: first(a.name),
  age: num(a.age),
  sex: first(a.sex),
  height_cm: num(a.height),
  weight_kg: num(a.weight),
  diet: first(a.diet),
  conditions: Array.isArray(a.conditions) ? a.conditions.filter((c) => c !== 'None') : [],
  allergies: first(a.allergies),
  phone: first(a.phone),
  alcohol: yes(a.alcohol),
  smoker: yes(a.smoker),
});

/** Saves the onboarding answers against the signed-in user (and their email). */
export async function saveProfile(a: Answers) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error('Not signed in.');
  const { error } = await supabase.from('profiles').upsert({
    id: data.user.id,
    email: data.user.email,
    ...toProfile(a),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export type Profile = {
  name: string | null;
  age: number | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  diet: string | null;
  conditions: string[];
  allergies: string | null;
  phone: string | null;
  alcohol: boolean | null;
  smoker: boolean | null;
};

/** The signed-in user's saved onboarding answers, or null. */
export async function getProfile() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: row, error } = await supabase
    .from('profiles')
    .select('name, age, sex, height_cm, weight_kg, diet, conditions, allergies, phone, alcohol, smoker')
    .eq('id', data.user.id)
    .maybeSingle();
  if (error) throw error;
  return row as Profile | null;
}

/** True if the signed-in user already finished onboarding. */
export async function hasProfile() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return false;
  const { data: row, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();
  if (error) throw error;
  return !!row;
}

export async function signOut() {
  await supabase.auth.signOut();
  clearCache();
  // Also clear Google's cached account so the account picker shows next time
  await google()
    .then(({ GoogleSignin }) => GoogleSignin.signOut())
    .catch(() => {});
}
