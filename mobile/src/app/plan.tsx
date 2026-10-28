import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  LinearTransition,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { CaretDownIcon as CaretDown } from 'phosphor-react-native/src/icons/CaretDown';
import { CaretLeftIcon as CaretLeft } from 'phosphor-react-native/src/icons/CaretLeft';
import { CaretUpIcon as CaretUp } from 'phosphor-react-native/src/icons/CaretUp';
import { CheckIcon as Check } from 'phosphor-react-native/src/icons/Check';
import { DropIcon as Drop } from 'phosphor-react-native/src/icons/Drop';
import { EyeIcon as Eye } from 'phosphor-react-native/src/icons/Eye';
import { InfoIcon as Info } from 'phosphor-react-native/src/icons/Info';
import { LeafIcon as Leaf } from 'phosphor-react-native/src/icons/Leaf';
import { StethoscopeIcon as Stethoscope } from 'phosphor-react-native/src/icons/Stethoscope';
import { WarningIcon as Warning } from 'phosphor-react-native/src/icons/Warning';
import { XIcon as X } from 'phosphor-react-native/src/icons/X';

import {
  BLACK,
  card,
  Glyph,
  MACRO,
  MEAL_SLOTS as SLOT,
  MUTED,
  planToday,
  Press,
  QUIET,
  ROUNDED,
  STATUS,
  TRACK,
  upNext,
  WHITE,
  type Icon,
} from '@/components/ui';
import { PENDING, useAssessment } from '@/hooks/use-assessment';
import { dateKey, readEaten, useEaten } from '@/hooks/use-eaten';
import { getPlan, latestAssessmentId, type Assessment, type Finding, type Meal, type Plan } from '@/lib/api';
import { gradient, light } from '@/components/auth';
import { useCached } from '@/lib/cache';

const STEPS = [
  { stage: 'extracting', label: 'Reading your reports' },
  { stage: 'analysing', label: 'Checking your results' },
  { stage: 'planning', label: 'Writing your meal plan' },
];
const SEVERITY: Record<string, { name: string; icon: Icon }> = {
  urgent: { name: 'Urgent', icon: Warning },
  see_doctor: { name: 'See a doctor', icon: Stethoscope },
  attention: { name: 'Keep an eye on', icon: Eye },
};
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
const PAD = 20;

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const canGoBack = useCanGoBack();
  // next: part of first-time setup, so move on by itself once the reports are read.
  // home: straight after sign-up. sign-up: still in onboarding (profile = its answers), account next.
  const { next, profile } = useLocalSearchParams<{ next?: 'home' | 'sign-up'; profile?: string }>();
  const toSignUp = () => router.replace({ pathname: '/sign-up', params: { profile } });
  const [id] = useState(latestAssessmentId);
  const a = useAssessment(id);
  useEffect(() => {
    if (a?.status !== 'completed') return;
    if (next === 'home') router.replace('/home');
    if (next === 'sign-up') router.replace({ pathname: '/sign-up', params: { profile } });
  }, [next, profile, a?.status]);
  // In onboarding, a doctor warning or failure still lets the user go on and make their account
  const onward = next === 'sign-up' ? toSignUp : undefined;

  // Back (button or Android's back) returns to home, opening it if it isn't underneath this page
  const leave = () => (canGoBack ? router.back() : router.replace('/home'));
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // During first-time setup the reports are still being read: stay until they are
      if (!next) leave();
      return true;
    });
    return () => sub.remove();
  });
  const done = a?.status === 'completed';
  const plan = useCached(id && done ? `plan.${id}` : null, () => getPlan(id!));

  const nav = (
    <View style={styles.nav}>
      {!next && (
        <Press onPress={leave} accessibilityLabel={canGoBack ? 'Back' : 'Home'} style={styles.navButton}>
          <Glyph icon={canGoBack ? CaretLeft : X} size={17} weight="bold" color={WHITE} />
        </Press>
      )}
    </View>
  );

  // The finished plan is a paged layout of its own; every other state is a single scrolling page
  if (a && plan && done && !next) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
        <StatusBar style="light" />
        <View style={styles.padded}>{nav}</View>
        <Result a={a} plan={plan} bottom={insets.bottom} />
      </View>
    );
  }

  let body;
  if (!id) body = <Empty />;
  // A doctor warning or a failure stays here so it is read, not skipped past
  else if (!a || PENDING.includes(a.status) || (next && a.status === 'completed'))
    body = <Progress stage={a?.stage ?? null} done={a?.status === 'completed'} />;
  else if (a.status === 'failed') body = <Failed error={a.error} profile={profile} onward={onward} />;
  else if (a.status === 'needs_doctor') body = <Doctor a={a} onward={onward} />;
  else body = <ActivityIndicator color={WHITE} style={styles.loading} />;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>
        {nav}
        {body}
      </ScrollView>
    </View>
  );
}

function Title({ children, sub }: { children: string; sub?: string }) {
  return (
    <>
      <Text style={styles.title} accessibilityRole="header">
        {children}
      </Text>
      {!!sub && <Text style={styles.subtitle}>{sub}</Text>}
    </>
  );
}

function Progress({ stage, done }: { stage: string | null; done?: boolean }) {
  const at = done ? STEPS.length : Math.max(0, STEPS.findIndex((s) => s.stage === stage));
  return (
    <>
      <Title sub="This can take a few minutes. You can leave this page; we'll keep working and your plan will be here.">
        {'Building\nyour plan'}
      </Title>
      <View style={[styles.card, styles.steps]}>
        {STEPS.map((s, i) => {
          const state = i < at ? 'done' : i === at ? 'active' : 'waiting';
          return (
            <View key={s.stage} style={styles.step} accessible accessibilityLabel={`${s.label}, ${state}`}>
              <View style={[styles.stepDot, state === 'done' && styles.stepDotDone]}>
                {state === 'done' && <Glyph icon={Check} size={12} weight="bold" color={BLACK} />}
                {state === 'active' && <ActivityIndicator size="small" color={WHITE} />}
              </View>
              <Text style={[styles.stepText, state === 'waiting' && styles.stepTextWaiting]}>{s.label}</Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

function Empty() {
  return (
    <>
      <Title sub="Add your blood report and we'll build a meal plan around your results.">{'No plan\nyet'}</Title>
      <CTA title="Add reports" onPress={() => router.replace('/upload')} />
    </>
  );
}

function Failed({ error, profile, onward }: { error: string | null; profile?: string; onward?: () => void }) {
  return (
    <>
      <Title sub={error ?? 'Something went wrong while reading your reports.'}>{"We couldn't\nread that"}</Title>
      <CTA title="Try again" onPress={() => router.replace({ pathname: '/upload', params: profile ? { profile } : {} })} />
      {onward && <Link title="Continue without reports" onPress={onward} />}
    </>
  );
}

function Link({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.link}>
      <Text style={styles.linkText}>{title}</Text>
    </Pressable>
  );
}

function Doctor({ a, onward }: { a: Assessment; onward?: () => void }) {
  return (
    <>
      <Title sub="Some of your results need a doctor's attention before you change your diet. Please book a visit soon and take this report with you.">
        {'See a doctor\nfirst'}
      </Title>
      <Text style={styles.section}>What we found</Text>
      <FindingList list={a.findings} />
      {onward && <CTA title="Create your account" onPress={onward} />}
    </>
  );
}

function CTA({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} style={styles.cta}>
      <Text style={styles.ctaText}>{title}</Text>
    </Press>
  );
}

// ---- The finished plan: a segmented control over swipeable pages, like Health and Fitness ----

const TABS = ['Meals', 'Targets', 'Findings'];

function Result({ a, plan, bottom }: { a: Assessment; plan: Plan; bottom: number }) {
  const { width } = useWindowDimensions();
  const pager = useAnimatedRef<Animated.ScrollView>();
  // The pager's live offset drives the segment highlight, so it tracks the finger 1:1 mid-swipe
  const x = useSharedValue(0);
  const [tab, setTab] = useState(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.set(e.contentOffset.x);
  });
  const go = (i: number) => {
    setTab(i);
    pager.current?.scrollTo({ x: i * width, animated: true });
  };
  const page = { width, paddingHorizontal: PAD, paddingBottom: bottom + 40 };

  return (
    <View style={styles.flex}>
      <View style={styles.padded}>
        <Text style={styles.title} accessibilityRole="header">
          Your plan
        </Text>
        <Segmented tabs={TABS} x={x} pageWidth={width} index={tab} onChange={go} />
      </View>
      <Animated.ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => setTab(Math.round(e.nativeEvent.contentOffset.x / width))}>
        <ScrollView style={{ width }} contentContainerStyle={page} showsVerticalScrollIndicator={false}>
          <MealsPage a={a} plan={plan} />
        </ScrollView>
        <ScrollView style={{ width }} contentContainerStyle={page} showsVerticalScrollIndicator={false}>
          <TargetsPage a={a} />
        </ScrollView>
        <ScrollView style={{ width }} contentContainerStyle={page} showsVerticalScrollIndicator={false}>
          <FindingsPage a={a} plan={plan} />
        </ScrollView>
      </Animated.ScrollView>
    </View>
  );
}

/** iOS segmented control: the white thumb follows the pages under it, so a swipe drags it too. */
function Segmented({
  tabs,
  x,
  pageWidth,
  index,
  onChange,
}: {
  tabs: string[];
  x: { get: () => number };
  pageWidth: number;
  index: number;
  onChange: (i: number) => void;
}) {
  const seg = (pageWidth - 2 * PAD - 4) / tabs.length;
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.get(), [0, pageWidth * (tabs.length - 1)], [0, seg * (tabs.length - 1)], 'clamp') }],
  }));
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      <Animated.View style={[styles.segThumb, { width: seg }, thumb]} />
      {tabs.map((t, i) => (
        <Pressable
          key={t}
          onPress={() => onChange(i)}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === index }}
          style={[styles.segItem, { width: seg }]}>
          <Text style={[styles.segText, i === index && styles.segTextOn]}>{t}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** "Moong dal chilla with mint chutney and curd" -> the dish, and what comes with it */
function splitDish(name: string) {
  const i = name.search(/\swith\s/i);
  return i < 0 ? [name, ''] : [name.slice(0, i), name.slice(i + 1)];
}

/** The day's meals: day pills, the day against its targets, then one editorial card per meal. */
function MealsPage({ a, plan }: { a: Assessment; plan: Plan }) {
  // Opens on today's day of the plan
  const today = planToday(plan.weeks, a.created_at);
  const [week, setWeek] = useState(today.week);
  const [day, setDay] = useState(today.day);
  const w = plan.weeks[week];
  const d = w.days[day];
  // Each plan day is a real date: the plan repeats from the day the report was sent
  const offset = (i: number) => week * 7 + i - (today.week * 7 + today.day);
  const dateOf = (i: number) => {
    const at = new Date();
    at.setDate(at.getDate() + offset(i));
    return at;
  };
  const isToday = offset(day) === 0;
  const future = offset(day) > 0;
  // Today and past days can be ticked; "up next" (today only) skips meals already ticked off
  const [eaten, toggle] = useEaten(dateKey(dateOf(day)));
  const due = isToday ? upNext(d.meals) : -1;
  const now = isToday ? d.meals.findIndex((_, i) => i >= due && !eaten.includes(i)) : -1;
  const t = a.targets!;

  return (
    <>
      {plan.weeks.length > 1 && (
        <Text style={styles.weekSwitch} onPress={() => (setWeek((week + 1) % plan.weeks.length), setDay(0))}>
          Week {w.week} of {plan.weeks.length} ›
        </Text>
      )}
      <View style={styles.strip} accessibilityRole="tablist">
        {w.days.map((x, i) => {
          const date = dateOf(i);
          const ticked = i === day ? eaten : readEaten(dateKey(date));
          const ate = x.meals.reduce((n, m, k) => n + (ticked.includes(k) ? m.kcal : 0), 0);
          return (
            <DayDot
              key={x.day}
              date={date}
              pct={offset(i) > 0 ? 0 : ate / x.total_kcal}
              on={i === day}
              today={offset(i) === 0}
              onPress={() => setDay(i)}
            />
          );
        })}
      </View>

      <Animated.View key={`${week}-${day}`} entering={FadeIn.duration(220)}>
        <DayProgress
          title={isToday ? 'Today' : dateOf(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
          meals={d.meals}
          eaten={future ? [] : eaten}
          planned={future}
          kcalTarget={t.calories_kcal}
          proteinTarget={t.protein_g}
        />
        <View style={styles.mealStack}>
          {d.meals.map((m, i) => (
            <MealCard
              key={`${m.slot}-${i}`}
              meal={m}
              dayKcal={d.total_kcal}
              lit={i === now}
              eaten={!future && eaten.includes(i)}
              onToggle={future ? undefined : () => toggle(i)}
            />
          ))}
        </View>
      </Animated.View>
    </>
  );
}

const DOT = 40;
const DOT_STROKE = 2.5;

/** One day in the week strip: weekday letter, then the date inside a ring that fills with what was eaten. */
function DayDot({
  date,
  pct,
  on,
  today,
  onPress,
}: {
  date: Date;
  pct: number;
  on: boolean;
  today: boolean;
  onPress: () => void;
}) {
  const r = DOT / 2 - DOT_STROKE / 2;
  const len = 2 * Math.PI * r;
  const long = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={`${long}${today ? ', today' : ''}${pct > 0 ? `, ${Math.round(pct * 100)}% eaten` : ''}`}
      accessibilityState={{ selected: on }}
      style={styles.dayDot}>
      <Text style={[styles.dayLetter, today && styles.dayLetterToday]}>
        {date.toLocaleDateString('en-GB', { weekday: 'narrow' })}
      </Text>
      <View style={styles.dayRingBox}>
        <Svg width={DOT} height={DOT} style={styles.ringSvg}>
          <Circle cx={DOT / 2} cy={DOT / 2} r={r} stroke={TRACK} strokeWidth={DOT_STROKE} fill={on ? WHITE : 'none'} />
          {pct > 0 && (
            <Circle
              cx={DOT / 2}
              cy={DOT / 2}
              r={r}
              stroke={on ? MUTED : WHITE}
              strokeWidth={DOT_STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${len * Math.min(1, pct)} ${len}`}
            />
          )}
        </Svg>
        <Text style={[styles.dayDate, on && styles.dayDateOn]}>{date.getDate()}</Text>
      </View>
    </Pressable>
  );
}

/**
 * The day at a glance: one bar cut into the day's meals (each segment as wide as its share of the
 * day), filling meal by meal as they're ticked. Calories in white, protein in blue below.
 */
function DayProgress({
  title,
  meals,
  eaten,
  planned,
  kcalTarget,
  proteinTarget,
}: {
  title: string;
  meals: Meal[];
  eaten: number[];
  planned: boolean;
  kcalTarget: number;
  proteinTarget: number;
}) {
  const on = meals.map((_, i) => !planned && eaten.includes(i));
  const sum = (k: 'kcal' | 'protein_g') => meals.reduce((n, m, i) => n + (planned || on[i] ? m[k] : 0), 0);
  const kcal = sum('kcal');
  const protein = sum('protein_g');
  return (
    <View style={styles.progress}>
      <View style={styles.progressHead}>
        <Text style={styles.progressTitle}>{title}</Text>
        <Text style={styles.progressCount}>
          {planned ? `${meals.length} meals planned` : `${eaten.length} of ${meals.length} meals`}
        </Text>
      </View>
      <Text style={styles.progressValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {kcal.toLocaleString('en-GB')}
        <Text style={styles.progressOf}> / {kcalTarget.toLocaleString('en-GB')} kcal</Text>
      </Text>
      <Segments weights={meals.map((m) => m.kcal)} on={on} tone={WHITE} height={10} />

      <View style={styles.proteinRow}>
        <View style={[styles.dot, { backgroundColor: MACRO.protein }]} />
        <Text style={styles.proteinValue}>
          {protein} g<Text style={styles.progressOf}> / {proteinTarget} g protein</Text>
        </Text>
      </View>
      <Segments weights={meals.map((m) => m.protein_g)} on={on} tone={MACRO.protein} height={5} />
    </View>
  );
}

/** A bar cut into one segment per meal; each fills (springing across) when its meal is ticked. */
function Segments({ weights, on, tone, height }: { weights: number[]; on: boolean[]; tone: string; height: number }) {
  return (
    <View style={[styles.segments, { height }]}>
      {weights.map((w, i) => (
        <Segment key={i} weight={w} on={on[i]} tone={tone} radius={height / 2} />
      ))}
    </View>
  );
}

function Segment({ weight, on, tone, radius }: { weight: number; on: boolean; tone: string; radius: number }) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.set(withSpring(on ? 1 : 0, { duration: 420, dampingRatio: 1 }));
  }, [p, on]);
  const fill = useAnimatedStyle(() => ({ width: `${p.get() * 100}%` }));
  return (
    <View style={[styles.segment, { flex: Math.max(weight, 1), borderRadius: radius }]}>
      <Animated.View style={[styles.segmentFill, { backgroundColor: tone, borderRadius: radius }, fill]} />
    </View>
  );
}

/** Round checkbox for "I've eaten this": a ring that fills with a check, with a little press dip. */
// Eaten: the same green as a "Normal" marker, so done reads as good across the app
const DONE = STATUS.Normal.color;

function Tick({ on, dark, label: name, onPress }: { on: boolean; dark: boolean; label: string; onPress: () => void }) {
  const ink = dark ? BLACK : WHITE;
  return (
    <Press
      onPress={onPress}
      scale={0.85}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityLabel={`Ate ${name}`}
      accessibilityState={{ checked: on }}
      style={[styles.tick, { borderColor: on ? DONE : ink }, on && { backgroundColor: DONE }]}>
      {on && <Glyph icon={Check} size={14} weight="bold" color={WHITE} />}
    </Press>
  );
}

/**
 * One meal as an editorial card: the dish set large, its sides quieter, portions as chips,
 * and how much of the day it carries. The meal due now (today only) is lit white.
 */
function MealCard({
  meal: m,
  dayKcal,
  lit,
  eaten,
  onToggle,
}: {
  meal: Meal;
  dayKcal: number;
  lit: boolean;
  eaten: boolean;
  onToggle?: () => void;
}) {
  const slot = SLOT[m.slot] ?? { name: label(m.slot), icon: Info, time: '' };
  const [dish, sides] = splitDish(m.name);
  const parts = m.portion.split(/\s*\+\s*/).filter(Boolean);
  const share = Math.round((100 * m.kcal) / dayKcal);
  const ink = lit ? BLACK : WHITE;
  return (
    <View
      style={[styles.mealCard, lit && styles.mealCardLit, eaten && styles.past]}>
      {/* A soft light from the top-right corner, like the rest of the app's glows */}
      {!lit && <View pointerEvents="none" style={[StyleSheet.absoluteFill, gradient(light('255,255,255', 0.09, 'circle at 100% 0%'))]} />}
      <View style={styles.mealHead}>
        <View style={[styles.iconCircle, lit && styles.iconCircleLit]}>
          <Glyph icon={slot.icon} size={16} color={WHITE} />
        </View>
        <Text style={[styles.mealSlot, lit && styles.litQuiet]}>
          {slot.name}
          {!!slot.time && <Text style={styles.mealTime}> · {slot.time}</Text>}
        </Text>
        {lit && (
          <View style={styles.nextPill}>
            <Text style={styles.nextText}>Up next</Text>
          </View>
        )}
        {onToggle && <Tick on={eaten} dark={lit} label={`${slot.name}: ${dish}`} onPress={onToggle} />}
      </View>

      <Text style={[styles.dish, { color: ink }]}>{dish}</Text>
      {!!sides && <Text style={[styles.sides, lit && styles.litQuiet]}>{sides}</Text>}

      <View style={styles.portions}>
        {parts.map((p) => (
          <View key={p} style={[styles.portion, lit && styles.portionLit]}>
            <Text style={[styles.portionText, { color: ink }]}>{p}</Text>
          </View>
        ))}
      </View>

      <View style={styles.mealFoot}>
        <Text style={[styles.mealKcal, { color: ink }]}>
          {m.kcal}
          <Text style={[styles.mealUnit, lit && styles.litQuiet]}> kcal</Text>
        </Text>
        <View style={styles.flex} />
        <View style={styles.proteinTag}>
          <View style={[styles.dot, { backgroundColor: MACRO.protein }]} />
          <Text style={[styles.proteinText, { color: ink }]}>{m.protein_g}g protein</Text>
        </View>
      </View>
      <View style={styles.shareRow}>
        <View style={[styles.shareTrack, lit && styles.shareTrackLit]}>
          <View style={[styles.shareFill, { width: `${Math.min(100, share)}%`, backgroundColor: ink }]} />
        </View>
        <Text style={[styles.shareText, lit && styles.litQuiet]}>{share}% of day</Text>
      </View>
    </View>
  );
}

/** Fitness-style rings: each macro's share of the day's calories, around the calorie target. */
function TargetsPage({ a }: { a: Assessment }) {
  const t = a.targets!;
  // 4 kcal per gram of protein and carbs, 9 per gram of fat
  const macros = [
    { name: 'Protein', g: t.protein_g, kcal: t.protein_g * 4, tone: MACRO.protein },
    { name: 'Carbs', g: t.carbs_g, kcal: t.carbs_g * 4, tone: MACRO.carbs },
    { name: 'Fat', g: t.fat_g, kcal: t.fat_g * 9, tone: MACRO.fat },
  ];
  const total = macros.reduce((n, m) => n + m.kcal, 0);
  return (
    <>
      <View style={styles.rings}>
        <Rings values={macros.map((m) => ({ pct: m.kcal / total, tone: m.tone }))} />
        <View style={styles.ringsCenter} pointerEvents="none">
          <Text style={styles.ringsValue}>{t.calories_kcal.toLocaleString('en-GB')}</Text>
          <Text style={styles.ringsUnit}>kcal a day</Text>
        </View>
      </View>

      <Text style={styles.groupLabel}>Macros</Text>
      {macros.map((m, i) => (
        <ListRow
          key={m.name}
          lead={<View style={[styles.legendDot, { backgroundColor: m.tone }]} />}
          title={m.name}
          value={`${m.g} g`}
          note={`${Math.round((100 * m.kcal) / total)}%`}
          last={i === macros.length - 1}
        />
      ))}

      <Text style={styles.groupLabel}>Every day</Text>
      <ListRow lead={<Glyph icon={Leaf} size={18} color={WHITE} />} title="Fibre" value={`${t.fibre_g} g`} />
      <ListRow lead={<Glyph icon={Drop} size={18} color={WHITE} />} title="Water" value={`${t.water_l} L`} last />
    </>
  );
}

function ListRow({
  lead,
  title,
  value,
  note,
  last,
}: {
  lead: React.ReactNode;
  title: string;
  value: string;
  note?: string;
  last?: boolean;
}) {
  return (
    <View style={styles.listRow} accessible accessibilityLabel={`${title}: ${value}${note ? `, ${note} of calories` : ''}`}>
      <View style={styles.listLead}>{lead}</View>
      <View style={[styles.listBody, !last && styles.rule]}>
        <Text style={styles.listTitle}>{title}</Text>
        {!!note && <Text style={styles.listNote}>{note}</Text>}
        <Text style={styles.listValue}>{value}</Text>
      </View>
    </View>
  );
}

const ACircle = Animated.createAnimatedComponent(Circle);
const RING = 220;
const STROKE = 16;
const GAP = 5;

function Rings({ values }: { values: { pct: number; tone: string }[] }) {
  return (
    <Svg width={RING} height={RING} style={styles.ringSvg}>
      {values.map((v, i) => (
        <Ring key={v.tone} r={RING / 2 - STROKE / 2 - i * (STROKE + GAP)} pct={v.pct} tone={v.tone} delay={i * 120} />
      ))}
    </Svg>
  );
}

/** One ring: a faint full track, then the coloured arc drawing itself in from the top. */
function Ring({ r, pct, tone, delay }: { r: number; pct: number; tone: string; delay: number }) {
  const len = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    const id = setTimeout(() => p.set(withTiming(pct, { duration: 900, easing: Easing.out(Easing.cubic) })), delay);
    return () => clearTimeout(id);
  }, [p, pct, delay]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - p.get()) }));
  const c = RING / 2;
  return (
    <>
      <Circle cx={c} cy={c} r={r} stroke={tone} strokeOpacity={0.18} strokeWidth={STROKE} fill="none" />
      <ACircle
        cx={c}
        cy={c}
        r={r}
        stroke={tone}
        strokeWidth={STROKE}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${len} ${len}`}
        animatedProps={arc}
      />
    </>
  );
}

function FindingsPage({ a, plan }: { a: Assessment; plan: Plan }) {
  return (
    <>
      {a.findings.length ? (
        <FindingList list={a.findings} />
      ) : (
        <Text style={styles.body}>Nothing in your reports needs attention.</Text>
      )}
      {[...a.warnings, ...plan.warnings].map((x) => (
        <Text key={x} style={styles.footnote}>
          {x}
        </Text>
      ))}
      <Text style={styles.footnote}>{plan.disclaimer}</Text>
    </>
  );
}

function FindingList({ list }: { list: Finding[] }) {
  return (
    <View style={styles.findings}>
      {list.map((f, i) => (
        <FindingRow key={f.code} f={f} last={i === list.length - 1} />
      ))}
    </View>
  );
}

/** One line per finding; tap to open what it means and what to eat. Urgent ones start open. */
function FindingRow({ f, last }: { f: Finding; last: boolean }) {
  const [open, setOpen] = useState(f.severity === 'urgent');
  const sev = SEVERITY[f.severity] ?? { name: label(f.severity), icon: Info };
  return (
    <Animated.View layout={LinearTransition.duration(220)} style={styles.listRow}>
      <View style={[styles.listLead, styles.findingLead]}>
        <Glyph icon={sev.icon} size={18} color={WHITE} />
      </View>
      <View style={[styles.flex, !last && styles.rule]}>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${f.title}, ${sev.name}`}
          style={styles.findingHead}>
          <View style={styles.flex}>
            <Text style={styles.listTitle}>{f.title}</Text>
            <Text style={styles.findingTag}>{sev.name}</Text>
          </View>
          <Glyph icon={open ? CaretUp : CaretDown} size={13} weight="bold" color={QUIET} />
        </Pressable>
        {open && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.findingBody}>
            <Text style={styles.body}>{f.message}</Text>
            {f.diet_actions.map((d) => (
              <View key={d} style={styles.action}>
                <Glyph icon={Check} size={11} weight="bold" color={WHITE} />
                <Text style={[styles.actionText, styles.flex]}>{d}</Text>
              </View>
            ))}
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLACK },
  flex: { flex: 1 },
  padded: { paddingHorizontal: PAD },
  nav: { flexDirection: 'row', minHeight: 44 },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  loading: { marginTop: 80 },
  title: { color: WHITE, fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.8, marginTop: 10 },
  subtitle: { color: MUTED, fontSize: 15, lineHeight: 22, marginTop: 10 },
  section: { color: WHITE, fontSize: 21, fontWeight: '600', letterSpacing: -0.3, marginTop: 32, marginBottom: 6 },
  card,
  body: { color: MUTED, fontSize: 14, lineHeight: 20 },
  footnote: { color: QUIET, fontSize: 12, lineHeight: 17, marginTop: 18 },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.14)' },
  past: { opacity: 0.45 },
  dot: { width: 6, height: 6, borderRadius: 3 },

  steps: { marginTop: 28, gap: 20 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: TRACK,
  },
  stepDotDone: { backgroundColor: WHITE, borderColor: WHITE },
  stepText: { color: WHITE, fontSize: 16, fontWeight: '500' },
  stepTextWaiting: { color: QUIET },
  cta: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
    marginTop: 28,
  },
  ctaText: { color: BLACK, fontSize: 16, fontWeight: '600' },
  link: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 8 },
  linkText: { color: MUTED, fontSize: 15, fontWeight: '500' },

  // Segmented control
  seg: {
    flexDirection: 'row',
    padding: 2,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  segThumb: { position: 'absolute', top: 2, left: 2, bottom: 2, borderRadius: 8, backgroundColor: WHITE },
  segItem: { height: 34, alignItems: 'center', justifyContent: 'center' },
  segText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  segTextOn: { color: BLACK },

  // Meals: day pills, meters, editorial cards
  weekSwitch: { color: MUTED, fontSize: 14, fontWeight: '600', marginTop: 14 },
  strip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  dayDot: { alignItems: 'center', gap: 6, minWidth: 40 },
  dayLetter: { color: QUIET, fontSize: 12, fontWeight: '600' },
  dayLetterToday: { color: WHITE, fontWeight: '800' },
  dayRingBox: { width: DOT, height: DOT, alignItems: 'center', justifyContent: 'center' },
  dayDate: { position: 'absolute', color: WHITE, fontSize: 15, fontWeight: '600', fontFamily: ROUNDED },
  dayDateOn: { color: BLACK },

  progress: {
    marginTop: 26,
    paddingBottom: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  progressHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  progressTitle: { color: WHITE, fontSize: 15, fontWeight: '600' },
  progressCount: { color: QUIET, fontSize: 13, fontWeight: '500', fontFamily: ROUNDED },
  progressValue: { color: WHITE, fontSize: 40, fontWeight: '600', fontFamily: ROUNDED, letterSpacing: -1.4, marginTop: 6 },
  progressOf: { color: QUIET, fontSize: 14, fontWeight: '500', letterSpacing: 0 },
  segments: { flexDirection: 'row', gap: 3, marginTop: 12 },
  segment: { backgroundColor: TRACK, overflow: 'hidden' },
  segmentFill: { height: '100%' },
  proteinRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
  proteinValue: { color: WHITE, fontSize: 17, fontWeight: '600', fontFamily: ROUNDED },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  iconCircleLit: { backgroundColor: BLACK },
  mealStack: { gap: 12, marginTop: 20 },
  mealCard: { ...card, overflow: 'hidden', padding: 20 },
  mealCardLit: { backgroundColor: WHITE, borderColor: WHITE },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealSlot: { flex: 1, color: MUTED, fontSize: 13, fontWeight: '600' },
  mealTime: { fontWeight: '400' },
  tick: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPill: { paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: BLACK },
  nextText: { color: WHITE, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  dish: { fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.6, marginTop: 18 },
  sides: { color: MUTED, fontSize: 15, lineHeight: 20, marginTop: 4 },
  portions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  portion: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
  portionLit: { backgroundColor: 'rgba(0,0,0,0.07)' },
  portionText: { fontSize: 13, fontWeight: '500' },
  mealFoot: { flexDirection: 'row', alignItems: 'baseline', marginTop: 18 },
  mealKcal: { fontSize: 30, fontWeight: '600', fontFamily: ROUNDED, letterSpacing: -1 },
  mealUnit: { color: QUIET, fontSize: 13, fontWeight: '500', letterSpacing: 0 },
  proteinTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proteinText: { fontSize: 13, fontWeight: '600', fontFamily: ROUNDED },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  shareTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: TRACK, overflow: 'hidden' },
  shareTrackLit: { backgroundColor: 'rgba(0,0,0,0.1)' },
  shareFill: { height: '100%', borderRadius: 2 },
  shareText: { color: QUIET, fontSize: 11, fontWeight: '600', fontFamily: ROUNDED },
  litQuiet: { color: 'rgba(0,0,0,0.55)' },

  // Targets: rings + plain list
  rings: { alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  ringSvg: { transform: [{ rotate: '-90deg' }] },
  ringsCenter: { position: 'absolute', alignItems: 'center' },
  ringsValue: { color: WHITE, fontSize: 30, fontWeight: '600', fontFamily: ROUNDED, letterSpacing: -1 },
  ringsUnit: { color: QUIET, fontSize: 12 },
  groupLabel: {
    color: QUIET,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 32,
    marginBottom: 2,
  },
  listRow: { flexDirection: 'row' },
  listLead: { width: 36, paddingTop: 17 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  listBody: { flex: 1, flexDirection: 'row', alignItems: 'baseline', paddingVertical: 15, gap: 8 },
  listTitle: { flex: 1, color: WHITE, fontSize: 16, fontWeight: '500' },
  listNote: { color: QUIET, fontSize: 13, fontFamily: ROUNDED },
  listValue: { color: WHITE, fontSize: 16, fontWeight: '600', fontFamily: ROUNDED, minWidth: 56, textAlign: 'right' },

  // Findings: plain disclosure list
  findings: { marginTop: 10 },
  findingLead: { paddingTop: 16 },
  findingHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, minHeight: 44 },
  findingTag: { color: QUIET, fontSize: 12, marginTop: 2 },
  findingBody: { paddingBottom: 16 },
  action: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'flex-start' },
  actionText: { color: WHITE, fontSize: 14, lineHeight: 19, marginTop: -2 },
});
