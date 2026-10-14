import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IntroLight, PrimaryButton, useAuthTheme } from '@/components/auth';
import { saveProfile, supabase, type Answers } from '@/lib/supabase';

// Copy can address the user by first name once we know it ('' before that)
type Say = string | ((name: string) => string);
const say = (t: Say, name: string) => (typeof t === 'string' ? t : t(name));

type Step = {
  key: string;
  title: Say;
  subtitle: Say;
  optional?: boolean;
} & (
  | {
      kind: 'input';
      placeholder: string;
      unit?: string;
      keyboardType?: KeyboardTypeOptions;
      range?: [number, number];
      maxLength?: number;
    }
  | { kind: 'choice' | 'multi'; options: Option[] }
);

type Option = { label: string; hint?: string };
const plain = (...labels: string[]): Option[] => labels.map((label) => ({ label }));

const STEPS: Step[] = [
  {
    key: 'name',
    kind: 'input',
    title: 'What should\nwe call you?',
    subtitle: 'Your first name is perfect.',
    placeholder: 'Your name',
    maxLength: 60,
  },
  {
    key: 'age',
    kind: 'input',
    title: (n) => (n ? `Lovely to meet\nyou, ${n}.` : 'How old\nare you?'),
    subtitle: (n) =>
      n ? 'How old are you? Healthy ranges shift with age.' : 'Healthy ranges shift with age.',
    placeholder: '25',
    unit: 'years',
    keyboardType: 'number-pad',
    range: [1, 120],
    maxLength: 3,
  },
  {
    key: 'sex',
    kind: 'choice',
    title: (n) => (n ? `And your sex,\n${n}?` : "What's your\nsex?"),
    subtitle: 'Some results are read differently for men and women.',
    options: plain('Female', 'Male', 'Other'),
  },
  {
    key: 'height',
    kind: 'input',
    title: (n) => (n ? `How tall are\nyou, ${n}?` : 'How tall\nare you?'),
    subtitle: 'This helps us size your meals just right.',
    placeholder: '170',
    unit: 'cm',
    keyboardType: 'decimal-pad',
    range: [50, 250],
    maxLength: 5,
  },
  {
    key: 'weight',
    kind: 'input',
    title: 'And your\nweight?',
    subtitle: 'Only used to plan your portions. It stays private.',
    placeholder: '65',
    unit: 'kg',
    keyboardType: 'decimal-pad',
    range: [10, 300],
    maxLength: 5,
  },
  {
    key: 'diet',
    kind: 'choice',
    title: (n) => (n ? `What do you\nlike to eat, ${n}?` : 'What do\nyou eat?'),
    subtitle: "We'll only suggest food you'd actually enjoy.",
    options: [
      {
        label: 'Vegetarian',
        hint: 'No meat, fish or eggs',
      },
      {
        label: 'Eggetarian',
        hint: 'Vegetarian, plus eggs',
      },
      {
        label: 'Non-vegetarian',
        hint: 'Includes meat, fish and eggs',
      },
      {
        label: 'Vegan',
        hint: 'No animal products, including dairy',
      },
    ],
  },
  {
    key: 'conditions',
    kind: 'multi',
    optional: true,
    title: 'Anything we\nshould know?',
    subtitle: (n) =>
      `Any health conditions${n ? `, ${n}` : ''}? Pick all that apply, so your plan stays safe.`,
    options: plain(
      'Diabetes',
      'Thyroid',
      'Blood pressure',
      'Cholesterol',
      'PCOS',
      'Kidney',
      'None',
    ),
  },
  {
    key: 'allergies',
    kind: 'input',
    optional: true,
    title: (n) => (n ? `Last one, ${n}.\nAny allergies?` : 'Any food\nallergies?'),
    subtitle: "We'll keep these well away from your plate.",
    placeholder: 'e.g. peanuts, lactose',
    maxLength: 120,
  },
];

/** Returns an error message, or undefined when the answer is acceptable. */
function validate(step: Step, value: string | string[] | undefined): string | undefined {
  if (step.kind !== 'input') {
    return step.optional || (value?.length ?? 0) > 0 ? undefined : 'Select an option';
  }
  const v = typeof value === 'string' ? value.trim() : '';
  if (!v) return step.optional ? undefined : 'This is required';
  if (step.range) {
    const n = Number(v);
    const [min, max] = step.range;
    if (!(n >= min && n <= max)) return `Enter a number between ${min} and ${max}`;
  }
}

/** The question, then its explanation fading in just after. Remounted per step (keyed). */
function Question({ title, subtitle, delay }: { title: string; subtitle: string; delay: number }) {
  const { styles } = useAuthTheme();
  const [hint] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(hint, {
      toValue: 1,
      duration: 450,
      delay: delay + 200,
      useNativeDriver: true,
    }).start();
  }, [delay, hint]);

  return (
    <>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Animated.Text style={[styles.subtitle, { opacity: hint }]}>{subtitle}</Animated.Text>
    </>
  );
}

export default function Onboarding() {
  const { c, styles } = useAuthTheme();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string>();
  // From the intro this screen opens see-through over it and plays the whole light sweep itself
  // (0 below the screen, 1 covering it, 2 gone off the top). One animation, one screen, so there
  // is no hand-off to glitch. The page fades in underneath as the light passes.
  const { intro } = useLocalSearchParams<{ intro?: string }>();
  const [sweep] = useState(() => new Animated.Value(intro ? 0 : 2));
  const input = useRef<TextInput>(null);
  useEffect(() => {
    if (!intro) return;
    Animated.timing(sweep, {
      toValue: 2,
      duration: 2200,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    }).start(() => input.current?.focus()); // keyboard once settled, not through the light
  }, [sweep, intro]);

  const step = STEPS[index];
  const value = answers[step.key];
  // First name, once the name question has been answered
  const name =
    index > 0 && typeof answers.name === 'string' ? answers.name.trim().split(' ')[0] : '';
  const title = say(step.title, name);
  const last = index === STEPS.length - 1;

  const set = (v: string | string[]) => {
    setAnswers((a) => ({ ...a, [step.key]: v }));
    setError(undefined);
  };

  function next() {
    const err = validate(step, value);
    if (err) return setError(err);
    if (!last) return setIndex(index + 1);
    finish(answers);
  }

  // New users: profile first, then sign-up saves it with the account.
  // Already signed in (Google login with no profile yet): save it now.
  async function finish(profile: Answers) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      // ponytail: sign-up skipped for now, so the answers aren't saved yet. To restore:
      // router.push({ pathname: '/sign-up', params: { profile: JSON.stringify(profile) } });
      router.replace('/home');
      return;
    }
    try {
      await saveProfile(profile);
      router.replace('/home');
    } catch (e) {
      Alert.alert('Could not save your profile', e instanceof Error ? e.message : String(e));
    }
  }

  function back() {
    setError(undefined);
    if (index === 0) router.back();
    else setIndex(index - 1);
  }

  // Android back button steps back through questions instead of leaving onboarding
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index === 0) return false;
      back();
      return true;
    });
    return () => sub.remove();
  });

  function toggle(option: string) {
    if (step.kind === 'choice') return set([option]);
    const selected = (value as string[] | undefined) ?? [];
    // "None" is exclusive: picking it clears the rest, picking anything else clears it
    if (option === 'None') return set(selected.includes('None') ? [] : ['None']);
    const rest = selected.filter((x) => x !== 'None');
    set(rest.includes(option) ? rest.filter((x) => x !== option) : [...rest, option]);
  }

  return (
    <View style={local.fill1}>
      {/* Page background fades in under the light while it covers the screen */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: c.bg,
            opacity: sweep.interpolate({
              inputRange: [0.7, 1.3],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          },
        ]}
      />
      <SafeAreaView style={local.fill1}>
        <StatusBar style={c.statusBar} />
        {/* The page fades and drifts up into place as the light moves off it */}
        <Animated.View
          style={[
            local.fill1,
            {
              opacity: sweep.interpolate({
                inputRange: [1.15, 1.75],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  translateY: sweep.interpolate({
                    inputRange: [1.15, 2],
                    outputRange: [18, 0],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}>
          <KeyboardAvoidingView
            style={local.fill1}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={local.topBar}>
              <Pressable
                onPress={back}
                disabled={index === 0 && !router.canGoBack()}
                accessibilityRole="button"
                accessibilityLabel="Previous question"
                style={[local.iconBtn, index === 0 && !router.canGoBack() && local.hidden]}>
                <SymbolView
                  name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                  size={22}
                  tintColor={c.title}
                />
              </Pressable>
              <View
                style={[local.track, { backgroundColor: c.border }]}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel={`Question ${index + 1} of ${STEPS.length}`}>
                <View
                  style={[
                    local.fill,
                    { backgroundColor: c.title, width: `${((index + 1) / STEPS.length) * 100}%` },
                  ]}
                />
              </View>
              <Text style={[local.count, { color: c.muted }]}>
                {index + 1}/{STEPS.length}
              </Text>
            </View>

            <ScrollView
              key={step.key}
              contentContainerStyle={local.body}
              keyboardShouldPersistTaps="handled">
              <Question
                title={title}
                subtitle={say(step.subtitle, name)}
                // on arrival from the intro, wait for the page to appear under the passing light
                delay={intro && index === 0 ? 1250 : 0}
              />

              {step.kind === 'input' ? (
                <View style={[local.bigField, { borderBottomColor: error ? c.error : c.title }]}>
                  <TextInput
                    ref={input}
                    style={[local.bigInput, { color: c.text }]}
                    value={(value as string) ?? ''}
                    onChangeText={set}
                    placeholder={step.placeholder}
                    placeholderTextColor={c.placeholder}
                    keyboardType={step.keyboardType}
                    maxLength={step.maxLength}
                    autoCapitalize={step.key === 'name' ? 'words' : 'sentences'}
                    autoComplete={step.key === 'name' ? 'name' : 'off'}
                    accessibilityLabel={title.replace('\n', ' ')}
                    autoFocus={!intro || index > 0}
                    returnKeyType={last ? 'done' : 'next'}
                    onSubmitEditing={next}
                  />
                  {!!step.unit && <Text style={[local.unit, { color: c.muted }]}>{step.unit}</Text>}
                </View>
              ) : (
                // Large separate cards: obviously tappable, and the selected one is filled
                <View
                  style={local.cards}
                  accessibilityRole={step.kind === 'choice' ? 'radiogroup' : undefined}>
                  {step.options.map(({ label, hint }) => {
                    const on = ((value as string[] | undefined) ?? []).includes(label);
                    const fg = on ? c.buttonText : c.text;
                    return (
                      <Pressable
                        key={label}
                        onPress={() => toggle(label)}
                        accessibilityRole={step.kind === 'choice' ? 'radio' : 'checkbox'}
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={hint ? `${label}. ${hint}` : label}
                        style={({ pressed }) => [
                          local.card,
                          { backgroundColor: on ? c.buttonBg : c.card },
                          pressed && local.cardPressed,
                        ]}>
                        <View style={local.cardText}>
                          <Text style={[local.cardLabel, { color: fg }]}>{label}</Text>
                          {!!hint && (
                            <Text
                              style={[
                                local.hint,
                                { color: on ? fg : c.muted },
                                on && local.hintOn,
                              ]}>
                              {hint}
                            </Text>
                          )}
                        </View>
                        <View
                          style={[
                            local.mark,
                            step.kind === 'multi' && local.markSquare,
                            { borderColor: on ? fg : c.border },
                            on && { backgroundColor: fg },
                          ]}>
                          {on && (
                            <SymbolView
                              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                              size={13}
                              weight="bold"
                              tintColor={c.buttonBg}
                            />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {!!error && <Text style={styles.error}>{error}</Text>}
            </ScrollView>

            <View style={local.footer}>
              <PrimaryButton title={last ? 'Finish' : 'Continue'} onPress={next} />
              {step.optional && (
                <Pressable
                  onPress={() => {
                    const skipped = { ...answers, [step.key]: step.kind === 'input' ? '' : [] };
                    setAnswers(skipped);
                    setError(undefined);
                    if (last) finish(skipped);
                    else setIndex(index + 1);
                  }}
                  accessibilityRole="button"
                  style={styles.linkHit}>
                  <Text style={styles.link}>Skip</Text>
                </Pressable>
              )}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
      <IntroLight progress={sweep} />
    </View>
  );
}

const local = StyleSheet.create({
  fill1: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  hidden: { opacity: 0 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  count: { minWidth: 32, fontSize: 13, fontWeight: '600', textAlign: 'right', marginRight: 12 },
  body: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  bigField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 40,
    borderBottomWidth: 2,
  },
  bigInput: { flex: 1, fontSize: 32, fontWeight: '600', minHeight: 64 },
  unit: { fontSize: 20, fontWeight: '600' },
  cards: { marginTop: 32, gap: 10 },
  card: {
    minHeight: 64,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardPressed: { transform: [{ scale: 0.98 }] },
  cardText: { flex: 1, gap: 3 },
  cardLabel: { fontSize: 17, fontWeight: '600' },
  hint: { fontSize: 14, lineHeight: 19 },
  hintOn: { opacity: 0.85 },
  mark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markSquare: { borderRadius: 7 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
});
