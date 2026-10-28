import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BLACK,
  Glyph,
  card,
  MEAL_SLOTS,
  planToday,
  upNext,
  MUTED,
  Press,
  QUIET,
  ROUNDED,
  STATUS,
  TRACK,
  WHITE,
  type Icon,
} from '@/components/ui';
import { DotsThreeCircleIcon as DotsThreeCircle } from 'phosphor-react-native/src/icons/DotsThreeCircle';
import { DropIcon as Drop } from 'phosphor-react-native/src/icons/Drop';
import { FileTextIcon as FileText } from 'phosphor-react-native/src/icons/FileText';
import { FlaskIcon as Flask } from 'phosphor-react-native/src/icons/Flask';
import { ForkKnifeIcon as ForkKnife } from 'phosphor-react-native/src/icons/ForkKnife';
import { PersonSimpleIcon as PersonSimple } from 'phosphor-react-native/src/icons/PersonSimple';
import { PlusIcon as Plus } from 'phosphor-react-native/src/icons/Plus';
import { SquaresFourIcon as SquaresFour } from 'phosphor-react-native/src/icons/SquaresFour';
import { UserIcon as User } from 'phosphor-react-native/src/icons/User';
import { PENDING, useAssessment } from '@/hooks/use-assessment';
import { getBiomarkers, getPlan, latestAssessmentId, type Biomarker, type Plan } from '@/lib/api';
import { useCached } from '@/lib/cache';
import { getProfile } from '@/lib/supabase';

const FLAG = { low: 'Low', high: 'High', abnormal: 'High', normal: 'Normal' } as const;
const RANK = { Low: 0, High: 0, Normal: 1 };

/** The latest report's markers, out-of-range first. */
function toMarkers(list: Biomarker[]) {
  return list
    .filter((b) => b.code && b.flag && typeof b.value === 'number')
    .map((b) => ({ name: b.name, value: String(b.value), unit: b.unit ?? '', status: FLAG[b.flag!] }))
    .sort((a, b) => RANK[a.status] - RANK[b.status])
    .slice(0, 10);
}

function useLatestReport() {
  // Read on mount; the upload page replaces home, so a new report remounts it
  const [id] = useState(latestAssessmentId);
  const assessment = useAssessment(id);
  // Markers are saved once reading is done; the meal plan can take minutes more
  const read = !!assessment?.stage && assessment.stage !== 'extracting';
  const biomarkers = useCached(id && read ? `biomarkers.${id}` : null, () => getBiomarkers(id!));
  const markers = biomarkers ? toMarkers(biomarkers) : [];
  // Today's meals come from the finished plan
  const done = assessment?.status === 'completed';
  const plan = useCached(id && done ? `plan.${id}` : null, () => getPlan(id!));
  // The avatar shows the user's own initial
  const name = useCached('profile', getProfile)?.name ?? undefined;
  return { id, assessment, markers, plan, name };
}

function todaysMeals(plan: Plan, since: string) {
  const t = planToday(plan.weeks, since);
  return plan.weeks[t.week].days[t.day];
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const soon = () => Alert.alert('Coming soon', 'This part is not ready yet.');

export default function Home() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // The dial takes what's left between the two side numbers: smaller on narrow phones
  const dialR = Math.max(60, Math.min(92, Math.floor((width - 80 - 2 * SIDE_W) / 2)));
  const [adding, setAdding] = useState(false);
  const { id, assessment, markers, plan, name } = useLatestReport();
  const t = assessment?.targets;
  const blood = assessment?.reports.find((r) => r.kind === 'blood');
  const reportDate = assessment ? shortDate(blood?.report_date ?? assessment.created_at) : undefined;
  const status = assessment?.status;
  const meals = plan && assessment ? todaysMeals(plan, assessment.created_at) : undefined;
  // What to say where data isn't there yet; the doctor warning always shows
  const waiting = !id
    ? 'Add your blood report with the + button to get your daily targets.'
    : status === 'failed'
      ? (assessment?.error ?? 'We could not read that report. Try adding it again with the + button.')
      : status === 'needs_doctor'
        ? 'Some results need a doctor. Please see one before starting a diet plan.'
        : 'Working out your targets from your report…';
  const note =
    status === 'needs_doctor'
      ? waiting
      : markers.length > 0
        ? ''
        : !id
          ? 'Your markers will show here once your report is read.'
          : status && PENDING.includes(status)
            ? 'Reading your reports…'
            : status === 'failed'
              ? waiting
              : 'Loading your markers…';

  const tabPad = Math.max(insets.bottom, 10);
  const today = new Date()
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.date}>{today}</Text>
            <Text style={styles.title} accessibilityRole="header">
              Today
            </Text>
          </View>
          <Press onPress={soon} accessibilityLabel="Profile" style={styles.avatar}>
            {name ? (
              <Text style={styles.avatarText}>{name.trim().charAt(0).toUpperCase()}</Text>
            ) : (
              <Glyph icon={User} size={20} color={BLACK} />
            )}
          </Press>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Daily targets</Text>
            {!!reportDate && t && (
              <Text style={styles.cardNote} numberOfLines={1}>
                From {reportDate} report
              </Text>
            )}
          </View>
          {t ? (
            <>
              <View style={styles.dialRow}>
                <Side value={`${t.protein_g}g`} label="Protein" />
                <Dial pct={1} r={dialR}>
                  <Text style={[styles.dialValue, dialR < 80 && styles.dialValueSmall]} numberOfLines={1}>
                    {t.calories_kcal.toLocaleString('en-GB')}
                  </Text>
                  <Text style={styles.dialLabel}>kcal a day</Text>
                </Dial>
                <Side value={`${t.water_l}L`} label="Water" />
              </View>
              <View style={styles.macros}>
                {[
                  ['Carbs', t.carbs_g],
                  ['Fat', t.fat_g],
                  ['Fibre', t.fibre_g],
                ].map(([k, v]) => (
                  <View key={k} style={styles.macro} accessible accessibilityLabel={`${k}: ${v} grams a day`}>
                    <Text style={styles.macroValue}>{v}g</Text>
                    <Text style={styles.macroName}>{k}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={[styles.empty, styles.cardEmpty]}>{waiting}</Text>
          )}
        </View>

        {meals && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>{"Today's meals"}</Text>
              <Pressable onPress={() => router.push('/plan')} accessibilityRole="button" hitSlop={10}>
                <Text style={styles.link}>Full plan</Text>
              </Pressable>
            </View>
            <MealCards meals={meals.meals} />
          </>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Your markers</Text>
          <Pressable onPress={() => router.push(id ? '/plan' : '/upload')} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.link}>{reportDate ? `${reportDate} report` : 'Add report'}</Text>
          </Pressable>
        </View>
        {!!note && <Text style={styles.empty}>{note}</Text>}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.markers}>
          {markers.map((m) => {
            const tone = STATUS[m.status];
            return (
              <Press
                key={m.name}
                onPress={() => router.push('/plan')}
                accessibilityLabel={`${m.name} ${m.value} ${m.unit}, ${m.status}`}
                style={styles.person}>
                <View style={[styles.bubble, { borderColor: tone.color, boxShadow: `0 0 14px ${tone.glow}` }]}>
                  <Text style={styles.bubbleValue}>{m.value}</Text>
                  <Text style={styles.bubbleUnit}>{m.unit}</Text>
                </View>
                <Text style={styles.personName} numberOfLines={2}>
                  {m.name}
                </Text>
                <Text style={[styles.personRole, { color: tone.color }]}>{m.status}</Text>
              </Press>
            );
          })}
        </ScrollView>
      </ScrollView>

      <Scrim open={adding} onPress={() => setAdding(false)} />

      <View style={[styles.tabBar, { paddingBottom: tabPad }]} accessibilityRole="tablist">
        <Tab icon={SquaresFour} label="Today" on />
        <Tab icon={ForkKnife} label="Food log" />
        <View style={styles.tabCenter}>
          <Press
            onPress={() => setAdding((a) => !a)}
            accessibilityLabel={adding ? 'Close' : 'Add a report'}
            accessibilityState={{ expanded: adding }}
            style={styles.fab}>
            <PlusIcon open={adding} />
          </Press>
        </View>
        <Tab icon={FileText} label="Reports" />
        <Tab icon={DotsThreeCircle} label="More" />
      </View>

      {/* The three report types fan out of the + (anchored on its centre) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {REPORTS.map((r, i) => (
          <FanItem
            key={r.name}
            report={r}
            index={i}
            open={adding}
            left={width / 2 - FAN_SIZE / 2}
            bottom={tabPad + 26 - FAN_SIZE / 2}
            onPress={() => {
              setAdding(false);
              router.push({ pathname: '/upload', params: { kind: r.kind } });
            }}
          />
        ))}
      </View>
    </View>
  );
}

// Fanned in an arc above the +: up-left, straight up, up-right
const REPORTS: { kind: string; name: string; icon: Icon; angle: number }[] = [
  { kind: 'blood', name: 'Blood', icon: Drop, angle: 135 },
  { kind: 'urine', name: 'Urine', icon: Flask, angle: 90 },
  { kind: 'inbody', name: 'InBody', icon: PersonSimple, angle: 45 },
];
const FAN_SIZE = 60;
const FAN_RADIUS = 120;
// A little overshoot: the circles are thrown out of the button, so a soft pop reads as physical
const FAN_OUT = { duration: 420, dampingRatio: 0.72 };
const FAN_IN = { duration: 260, dampingRatio: 1 };

function FanItem({
  report,
  index,
  open,
  left,
  bottom,
  onPress,
}: {
  report: (typeof REPORTS)[number];
  index: number;
  open: boolean;
  left: number;
  bottom: number;
  onPress: () => void;
}) {
  const p = useSharedValue(0);
  useEffect(() => {
    // Out left-to-right, back in right-to-left, so the arc unfolds and folds like one motion
    const delay = (open ? index : REPORTS.length - 1 - index) * 35;
    p.set(withDelay(delay, withSpring(open ? 1 : 0, open ? FAN_OUT : FAN_IN)));
  }, [open, index, p]);
  const rad = (report.angle * Math.PI) / 180;
  const dx = Math.cos(rad) * FAN_RADIUS;
  const dy = -Math.sin(rad) * FAN_RADIUS;
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.get() * 1.5),
    transform: [{ translateX: dx * p.get() }, { translateY: dy * p.get() }, { scale: 0.3 + 0.7 * p.get() }],
  }));
  return (
    <Animated.View style={[styles.fanItem, { left, bottom }, style]} pointerEvents={open ? 'box-none' : 'none'}>
      <Press onPress={onPress} accessibilityLabel={`Upload ${report.name.toLowerCase()} report`} style={styles.fanCircle}>
        <Glyph icon={report.icon} size={22} color={BLACK} />
      </Press>
      <Text style={styles.fanLabel}>{report.name}</Text>
    </Animated.View>
  );
}

/** The + turns a quarter-and-a-bit into an x while the fan is open. */
function PlusIcon({ open }: { open: boolean }) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.set(withSpring(open ? 45 : 0, FAN_IN));
  }, [open, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.get()}deg` }] }));
  return (
    <Animated.View style={style}>
      <Glyph icon={Plus} size={22} weight="bold" color={BLACK} />
    </Animated.View>
  );
}

/** Dims the screen behind the fan; tapping anywhere folds it away. */
function Scrim({ open, onPress }: { open: boolean; onPress: () => void }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.set(withSpring(open ? 1 : 0, FAN_IN));
  }, [open, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, style]} pointerEvents={open ? 'auto' : 'none'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} accessibilityLabel="Close" />
    </Animated.View>
  );
}

/** Today's meals as a row of cards; the one due now is lit and scrolled into view. */
const MEAL_W = 156;
const MEAL_GAP = 10;
function MealCards({ meals }: { meals: { slot: string; name: string; kcal: number; portion: string }[] }) {
  const now = upNext(meals);
  const row = useRef<ComponentRef<typeof ScrollView>>(null);
  const placed = useRef(false);
  return (
    <ScrollView
      ref={row}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.mealRow}
      snapToInterval={MEAL_W + MEAL_GAP}
      decelerationRate="fast"
      // Start once at the meal that's due, keeping the one before it peeking in
      onContentSizeChange={() => {
        if (placed.current) return;
        placed.current = true;
        row.current?.scrollTo({ x: Math.max(0, now - 0.3) * (MEAL_W + MEAL_GAP), animated: false });
      }}>
      {meals.map((m, i) => {
        const slot = MEAL_SLOTS[m.slot];
        const lit = i === now;
        const done = i < now;
        return (
          <Press
            key={`${m.slot}-${i}`}
            onPress={() => router.push('/plan')}
            scale={0.97}
            accessibilityLabel={`${slot?.name ?? m.slot}${lit ? ', up next' : ''}: ${m.name}, ${m.kcal} kcal`}
            style={[styles.mealCard, lit && styles.mealCardLit, done && styles.mealCardDone]}>
            <View style={styles.mealCardTop}>
              <View style={[styles.mealIcon, lit && styles.mealIconLit]}>
                <Glyph
                  icon={slot?.icon ?? ForkKnife}
                  size={16}
                  color={WHITE}
                />
              </View>
              {lit && <Text style={styles.upNext}>Up next</Text>}
            </View>
            <Text style={[styles.mealSlot, lit && styles.litQuiet]}>{slot?.name ?? m.slot}</Text>
            <Text style={[styles.mealName, lit && styles.litText]} numberOfLines={3}>
              {m.name}
            </Text>
            <Text style={[styles.mealKcal, lit && styles.litText]}>
              {m.kcal}
              <Text style={[styles.mealUnit, lit && styles.litQuiet]}> kcal</Text>
            </Text>
          </Press>
        );
      })}
    </ScrollView>
  );
}

// The dial: ticks fanned over 270°, open at the bottom, filled up to the day's intake
const TICKS = 46;
const SWEEP = 270;
const TW = 3;
const SIDE_W = 68;

function Dial({ pct, r, children }: { pct: number; r: number; children: React.ReactNode }) {
  const filled = Math.round(Math.min(1, pct) * (TICKS - 1));
  const TL = Math.round(r * 0.15);
  return (
    <View style={{ width: 2 * r, height: 2 * r * 0.88 }}>
      {Array.from({ length: TICKS }, (_, i) => {
        const tick: ViewStyle = {
          left: r - TW / 2,
          width: TW,
          height: TL,
          transformOrigin: [TW / 2, r, 0],
          transform: [{ rotate: `${-SWEEP / 2 + (SWEEP * i) / (TICKS - 1)}deg` }],
        };
        return (
          <View key={i} style={[styles.tick, tick]}>
            {i <= filled && (
              // The fill sweeps round once on first show
              <Animated.View entering={FadeIn.delay(120 + i * 14).duration(200)} style={[StyleSheet.absoluteFill, styles.tickOn]} />
            )}
          </View>
        );
      })}
      <View style={[styles.dialCenter, { width: 2 * r, height: 2 * r }]}>{children}</View>
    </View>
  );
}

function Side({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.side}>
      <Text style={styles.sideValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.sideLabel} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </View>
  );
}

function Tab({ icon, label, on }: { icon: Icon; label: string; on?: boolean }) {
  return (
    <Pressable
      onPress={on ? undefined : soon}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!on }}
      style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}>
      {/* Phosphor's convention: the selected tab's icon is filled, the rest are outlines */}
      <Glyph icon={icon} size={22} weight={on ? 'fill' : 'regular'} color={on ? WHITE : QUIET} />
      <Text style={[styles.tabLabel, on && styles.tabLabelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLACK },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 130 },

  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 24 },
  date: { color: QUIET, fontSize: 12, fontWeight: '600', letterSpacing: 1.2 },
  title: { color: WHITE, fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -1, marginTop: 4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
    marginBottom: 2,
  },
  avatarText: { color: BLACK, fontSize: 18, fontWeight: '600', fontFamily: ROUNDED },

  // Cards: lifted a step off the black, hairline rim, continuous corners
  card,
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardTitle: { color: WHITE, fontSize: 19, fontWeight: '600', letterSpacing: -0.3 },
  cardNote: { color: QUIET, fontSize: 13 },

  dialRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  side: { width: SIDE_W, alignItems: 'center' },
  sideValue: { color: WHITE, fontSize: 22, fontWeight: '500', fontFamily: ROUNDED, letterSpacing: -0.4 },
  sideLabel: { color: QUIET, fontSize: 12, marginTop: 2 },
  tick: { position: 'absolute', top: 0, borderRadius: 2, backgroundColor: TRACK },
  tickOn: { borderRadius: 2, backgroundColor: WHITE },
  dialCenter: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  dialValue: { color: WHITE, fontSize: 44, lineHeight: 50, fontWeight: '600', fontFamily: ROUNDED, letterSpacing: -1.5 },
  dialValueSmall: { fontSize: 34, lineHeight: 40, letterSpacing: -1 },
  dialLabel: { color: QUIET, fontSize: 13 },

  macros: { flexDirection: 'row', gap: 16, marginTop: 10 },
  macro: { flex: 1, alignItems: 'center' },
  macroName: { color: QUIET, fontSize: 12, marginTop: 2 },
  macroValue: { color: WHITE, fontSize: 18, fontWeight: '500', fontFamily: ROUNDED },

  section: { color: WHITE, fontSize: 21, fontWeight: '600', letterSpacing: -0.3, marginTop: 32, marginBottom: 14 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  link: { color: MUTED, fontSize: 14 },

  cardEmpty: { marginTop: 12, marginBottom: 0 },
  mealRow: { paddingHorizontal: 20, gap: MEAL_GAP },
  mealCard: {
    ...card,
    width: MEAL_W,
    minHeight: 188,
    padding: 16,
    borderRadius: 24,
  },
  mealCardLit: { backgroundColor: WHITE, borderColor: WHITE },
  mealCardDone: { opacity: 0.55 },
  mealCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  mealIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  mealIconLit: { backgroundColor: BLACK },
  upNext: { color: BLACK, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  mealSlot: { color: QUIET, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  mealName: { color: WHITE, fontSize: 15, fontWeight: '600', lineHeight: 20, marginTop: 4, flex: 1 },
  mealKcal: { color: WHITE, fontSize: 22, fontWeight: '600', fontFamily: ROUNDED, letterSpacing: -0.4, marginTop: 10 },
  mealUnit: { color: QUIET, fontSize: 12, fontWeight: '500', letterSpacing: 0 },
  litText: { color: BLACK },
  litQuiet: { color: 'rgba(0,0,0,0.5)' },

  bleed: { marginHorizontal: -20 },
  markers: { paddingHorizontal: 20, gap: 6 },
  person: { alignItems: 'center', width: 84 },
  bubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    backgroundColor: '#0E0E0E',
  },
  bubbleValue: { color: WHITE, fontSize: 18, fontWeight: '500', fontFamily: ROUNDED, letterSpacing: -0.3 },
  bubbleUnit: { color: QUIET, fontSize: 9, fontWeight: '600', marginTop: -1 },
  personName: { color: WHITE, fontSize: 13, fontWeight: '500', marginTop: 10, textAlign: 'center' },
  personRole: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  empty: { color: MUTED, fontSize: 14, lineHeight: 20, marginBottom: 14 },

  scrim: { backgroundColor: 'rgba(0,0,0,0.72)' },
  // Width wider than the circle so the label fits; centred on the + by the left/bottom passed in
  fanItem: { position: 'absolute', width: FAN_SIZE, alignItems: 'center', overflow: 'visible' },
  fanCircle: {
    width: FAN_SIZE,
    height: FAN_SIZE,
    borderRadius: FAN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  fanLabel: { position: 'absolute', top: FAN_SIZE + 6, left: (FAN_SIZE - 90) / 2, width: 90, textAlign: 'center', color: WHITE, fontSize: 13, fontWeight: '600' },

  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    backgroundColor: 'rgba(10,10,10,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  tab: { flex: 1, alignItems: 'center', gap: 4, minHeight: 48, justifyContent: 'center' },
  tabPressed: { opacity: 0.6 },
  tabLabel: { color: QUIET, fontSize: 11, fontWeight: '500' },
  tabLabelOn: { color: WHITE },
  tabCenter: { flex: 1, alignItems: 'center' },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
    boxShadow: '0 6px 20px rgba(255,255,255,0.18)',
  },
});
