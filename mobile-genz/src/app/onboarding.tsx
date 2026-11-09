import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Banner, Bar, Btn, C, Chip, F, Field, Page, T } from '@/components/ui';
import { getProfile, saveProfile, type Profile } from '@/lib/store';

type Draft = Partial<Omit<Profile, 'age' | 'height_cm' | 'weight_kg' | 'waist_cm'>> & {
  age?: string;
  height_cm?: string;
  weight_kg?: string;
  waist_cm?: string;
  consent?: boolean;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[6-9]\d{9}$/;
const digits = (s: string) => s.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');

function fromProfile(p: Profile | null): Draft {
  if (!p) return { allergies: '' };
  return {
    ...p,
    age: String(p.age),
    height_cm: p.height_cm ? String(p.height_cm) : '',
    weight_kg: p.weight_kg ? String(p.weight_kg) : '',
    waist_cm: p.waist_cm ? String(p.waist_cm) : '',
    consent: true,
  };
}

type Step = { title: string; sub?: string; ok: (d: Draft) => string | null; body: (d: Draft, set: (p: Draft) => void) => React.ReactNode };

const choice = <K extends keyof Draft>(key: K, options: [Draft[K], string][], color?: string) =>
  function Choices(d: Draft, set: (p: Draft) => void) {
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {options.map(([value, label]) => (
          <Chip key={String(value)} label={label} color={color} on={d[key] === value} onPress={() => set({ [key]: value } as Draft)} />
        ))}
      </View>
    );
  };

const STEPS: Step[] = [
  {
    title: 'first things first, what do we call you?',
    ok: (d) => ((d.name ?? '').trim().length >= 2 ? null : 'need at least 2 letters'),
    body: (d, set) => <Field label="name" autoFocus value={d.name ?? ''} onChangeText={(name) => set({ name })} placeholder="Rhea Mehta" />,
  },
  {
    title: 'how old are you?',
    sub: 'targets change a lot with age',
    ok: (d) => (Number(d.age) >= 18 && Number(d.age) <= 80 ? null : 'aharya is for ages 18 to 80'),
    body: (d, set) => (
      <Field label="age" keyboardType="number-pad" maxLength={2} value={d.age ?? ''} onChangeText={(age) => set({ age: digits(age) })} placeholder="27" />
    ),
  },
  {
    title: 'you are…',
    ok: (d) => (d.gender ? null : 'pick one'),
    body: choice('gender', [
      ['female', 'female'],
      ['male', 'male'],
      ['other', 'other / rather not say'],
    ]),
  },
  {
    title: 'how do you eat?',
    sub: 'we never sneak in anything off-limits',
    ok: (d) => (d.diet_type ? null : 'pick one'),
    body: choice(
      'diet_type',
      [
        ['veg', '🥦 veg'],
        ['eggetarian', '🥚 eggetarian'],
        ['non_veg', '🍗 non-veg'],
        ['jain', '🙏 jain'],
        ['vegan', '🌱 vegan'],
      ],
      C.pudina,
    ),
  },
  {
    title: 'whose ghar ka khana?',
    sub: 'your plan leans this way',
    ok: (d) => (d.cuisine ? null : 'pick one'),
    body: choice(
      'cuisine',
      [
        ['north', '🫓 north indian'],
        ['south', '🥥 south indian'],
        ['west', '🍛 gujju / marathi'],
        ['east', '🐟 bengali / east'],
      ],
      C.pink,
    ),
  },
  {
    title: 'how much do you move?',
    ok: (d) => (d.activity_level ? null : 'pick one'),
    body: choice(
      'activity_level',
      [
        ['sedentary', '🛋️ desk + couch era'],
        ['light', '🚶 walks sometimes'],
        ['moderate', '🏸 active 3-4 days'],
        ['active', '🏋️ gym rat'],
      ],
      C.lilac,
    ),
  },
  {
    title: 'quick honest check',
    sub: 'no judgement, it changes the plan',
    ok: (d) => (d.alcohol == null || d.smoker == null ? 'answer both' : null),
    body: (d, set) => (
      <View style={{ gap: 18 }}>
        <T v="h3">🍺 do you drink?</T>
        {choice('alcohol', [[true, 'yeah'], [false, 'nope']])(d, set)}
        <T v="h3">🚬 do you smoke?</T>
        {choice('smoker', [[true, 'yeah'], [false, 'nope']])(d, set)}
      </View>
    ),
  },
  {
    title: 'height & weight',
    sub: 'optional, but your calories get way more accurate',
    ok: (d) => {
      const h = Number(d.height_cm || 0);
      const w = Number(d.weight_kg || 0);
      const waist = Number(d.waist_cm || 0);
      if (h && (h < 120 || h > 220)) return 'height looks off (120–220 cm)';
      if (w && (w < 30 || w > 250)) return 'weight looks off (30–250 kg)';
      if (waist && (waist < 40 || waist > 200)) return 'waist looks off (40–200 cm)';
      return null;
    },
    body: (d, set) => (
      <View style={{ gap: 14 }}>
        <Field label="height (cm)" keyboardType="decimal-pad" value={d.height_cm ?? ''} onChangeText={(height_cm) => set({ height_cm })} placeholder="165" />
        <Field label="weight (kg)" keyboardType="decimal-pad" value={d.weight_kg ?? ''} onChangeText={(weight_kg) => set({ weight_kg })} placeholder="68" />
        <Field
          label="waist (cm)"
          keyboardType="decimal-pad"
          value={d.waist_cm ?? ''}
          onChangeText={(waist_cm) => set({ waist_cm })}
          placeholder="86"
          hint="measure around your belly button"
        />
      </View>
    ),
  },
  {
    title: 'anything you can’t eat?',
    sub: 'allergies, separated by commas. skip if none',
    ok: () => null,
    body: (d, set) => <Field label="allergies" value={d.allergies ?? ''} onChangeText={(allergies) => set({ allergies })} placeholder="peanuts, milk" />,
  },
  {
    title: 'where do we reach you?',
    sub: 'only for your plan. no spam, promise',
    ok: (d) => {
      if (!EMAIL.test((d.email ?? '').trim())) return 'that email looks off';
      if (!PHONE.test(digits(d.phone ?? ''))) return 'enter a 10-digit indian mobile number';
      if (!d.consent) return 'we need your ok to read your reports';
      return null;
    },
    body: (d, set) => (
      <View style={{ gap: 14 }}>
        <Field label="email" keyboardType="email-address" autoCapitalize="none" value={d.email ?? ''} onChangeText={(email) => set({ email })} placeholder="you@gmail.com" />
        <Field label="mobile" keyboardType="phone-pad" value={d.phone ?? ''} onChangeText={(phone) => set({ phone })} placeholder="98765 43210" />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!d.consent }}
          onPress={() => set({ consent: !d.consent })}
          style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
        >
          <View
            style={{
              width: 26,
              height: 26,
              borderWidth: 2.5,
              borderColor: C.ink,
              borderRadius: 8,
              backgroundColor: d.consent ? C.pudina : C.paper,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {d.consent ? <T v="small" style={{ fontFamily: F.bold }}>✓</T> : null}
          </View>
          <T v="small" style={{ flex: 1 }}>
            I agree to Aharya reading my health reports to make my plan. I can delete them any time.
          </T>
        </Pressable>
      </View>
    ),
  },
];

export default function Onboarding() {
  const [draft, setDraft] = useState<Draft>(() => fromProfile(getProfile()));
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const s = STEPS[step];
  const set = (patch: Draft) => {
    setError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };

  function next() {
    const problem = s.ok(draft);
    if (problem) return setError(problem);
    if (step < STEPS.length - 1) return setStep(step + 1);
    const num = (v?: string) => (v ? Number(v) : undefined);
    saveProfile({
      name: draft.name!.trim(),
      age: Number(draft.age),
      gender: draft.gender!,
      diet_type: draft.diet_type!,
      cuisine: draft.cuisine!,
      activity_level: draft.activity_level!,
      alcohol: draft.alcohol!,
      smoker: draft.smoker!,
      height_cm: num(draft.height_cm),
      weight_kg: num(draft.weight_kg),
      waist_cm: num(draft.waist_cm),
      allergies: (draft.allergies ?? '').trim(),
      email: draft.email!.trim().toLowerCase(),
      phone: digits(draft.phone!),
    });
    router.replace('/upload');
  }

  return (
    <Page style={{ gap: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="back"
          onPress={() => (step ? setStep(step - 1) : router.back())}
          hitSlop={12}
        >
          <T v="h2">←</T>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Bar value={(step + 1) / STEPS.length} color={C.turmeric} />
        </View>
        <T v="small" color={C.muted}>
          {step + 1}/{STEPS.length}
        </T>
      </View>
      <View style={{ gap: 8 }}>
        <T v="h2">{s.title}</T>
        {s.sub ? <T color={C.muted}>{s.sub}</T> : null}
      </View>
      {s.body(draft, set)}
      {error ? <Banner color="#FFD0C4">{error}</Banner> : null}
      <Btn label={step === STEPS.length - 1 ? 'done, next: reports →' : 'next →'} onPress={next} />
    </Page>
  );
}
