import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type PressableProps,
  type StyleProp,
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

// Palette: black and white only
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.6)';
const QUIET = 'rgba(255,255,255,0.42)';
const TRACK = 'rgba(255,255,255,0.1)';
const RIM = 'rgba(255,255,255,0.1)';
// The one place colour is allowed: marker status (always shown with the word too)
const STATUS = {
  Low: { color: '#FFB340', glow: 'rgba(255,179,64,0.35)' },
  Normal: { color: '#30D158', glow: 'rgba(48,209,88,0.3)' },
  High: { color: '#FF453A', glow: 'rgba(255,69,58,0.35)' },
};
// SF Rounded for numbers on iOS; Android keeps its system font
const ROUNDED = Platform.select({ ios: 'ui-rounded' });
// Critically damped: settles without overshoot, and re-targets from wherever it is mid-motion
const SPRING = { duration: 340, dampingRatio: 1 };

type Icon = { ios: SFSymbol; android: AndroidSymbol };
const sym = (i: Icon) => ({ ...i, web: i.android });

// ponytail: sample data until the plan and food log come from the backend
const REPORT_DATE = '12 Oct';
const KCAL = { eaten: 860, goal: 1350 };
const MACROS = [
  { name: 'Protein', eaten: 52, goal: 80 },
  { name: 'Fat', eaten: 30, goal: 45 },
  { name: 'Carbs', eaten: 96, goal: 150 },
];
// Last 30 days, oldest first: 1 = done, 0 = not
const HABITS = [
  { name: 'Meal plan', days: '110111011111101111011111110111', week: 6 },
  { name: 'Vitamin D', days: '000011111111101111111111111111', week: 7 },
];
const MARKERS = [
  { name: 'Vitamin D', value: '18', unit: 'ng/mL', status: 'Low' },
  { name: 'Cholesterol', value: '210', unit: 'mg/dL', status: 'High' },
  { name: 'Haemoglobin', value: '13.8', unit: 'g/dL', status: 'Normal' },
  { name: 'Sugar', value: '92', unit: 'mg/dL', status: 'Normal' },
] as const;

const soon = () => Alert.alert('Coming soon', 'This part is not ready yet.');

export default function Home() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // The dial takes what's left between the two side numbers: smaller on narrow phones
  const dialR = Math.max(60, Math.min(92, Math.floor((width - 80 - 2 * SIDE_W) / 2)));
  const [remaining, setRemaining] = useState(false);
  const [adding, setAdding] = useState(false);
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
            <Text style={styles.avatarText}>A</Text>
          </Press>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Daily nutrition</Text>
            <Text style={styles.cardNote} numberOfLines={1}>
              {REPORT_DATE} plan
            </Text>
          </View>

          <View style={styles.dialRow}>
            <Side value={KCAL.goal - KCAL.eaten} label="Remaining" />
            <Dial pct={KCAL.eaten / KCAL.goal} r={dialR}>
              <Text style={[styles.dialValue, dialR < 80 && styles.dialValueSmall]} numberOfLines={1}>
                {(remaining ? KCAL.goal - KCAL.eaten : KCAL.eaten).toLocaleString('en-GB')}
              </Text>
              <Text style={styles.dialLabel}>{remaining ? 'kcal left' : 'kcal eaten'}</Text>
            </Dial>
            <Side value={KCAL.goal} label="Target" />
          </View>

          <View style={styles.macros}>
            {MACROS.map((m) => (
              <View
                key={m.name}
                style={styles.macro}
                accessible
                accessibilityLabel={`${m.name}: ${m.eaten} of ${m.goal} grams`}>
                <Text style={styles.macroName}>{m.name}</Text>
                <View style={styles.macroTrack}>
                  <View style={[styles.macroFill, { width: `${Math.min(100, (100 * m.eaten) / m.goal)}%` }]} />
                </View>
                <Text style={styles.macroValue}>
                  {remaining ? `${m.goal - m.eaten}g left` : `${m.eaten} / ${m.goal}g`}
                </Text>
              </View>
            ))}
          </View>

          <Segmented options={['Eaten', 'Remaining']} index={remaining ? 1 : 0} onChange={(i) => setRemaining(i === 1)} />
        </View>

        <Text style={styles.section}>Habits</Text>
        <View style={styles.pair}>
          {HABITS.map((h) => (
            <Press
              key={h.name}
              onPress={soon}
              scale={0.97}
              accessibilityLabel={`${h.name}: ${h.week} of 7 days this week`}
              style={[styles.card, styles.habit]}>
              <Text style={styles.habitName}>{h.name}</Text>
              <Text style={styles.habitSub}>Last 30 days</Text>
              <View style={styles.dots}>
                {[0, 10, 20].map((row) => (
                  <View key={row} style={styles.dotRow}>
                    {[...h.days.slice(row, row + 10)].map((d, i) => (
                      <View key={i} style={[styles.dotCell, d === '1' && styles.dotOn]} />
                    ))}
                  </View>
                ))}
              </View>
              <View style={styles.habitFoot}>
                <Text style={styles.habitWeek}>
                  {h.week}/7<Text style={styles.habitWeekNote}> this week</Text>
                </Text>
                <SymbolView name={sym({ ios: 'chevron.right', android: 'chevron_right' })} size={13} weight="semibold" tintColor={QUIET} />
              </View>
            </Press>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Your markers</Text>
          <Pressable onPress={soon} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.link}>{REPORT_DATE} report</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.markers}>
          {MARKERS.map((m) => {
            const tone = STATUS[m.status];
            return (
              <Press
                key={m.name}
                onPress={soon}
                accessibilityLabel={`${m.name} ${m.value} ${m.unit}, ${m.status}`}
                style={styles.person}>
                <View style={[styles.bubble, { borderColor: tone.color, boxShadow: `0 0 14px ${tone.glow}` }]}>
                  <Text style={styles.bubbleValue}>{m.value}</Text>
                  <Text style={styles.bubbleUnit}>{m.unit}</Text>
                </View>
                <Text style={styles.personName} numberOfLines={1}>
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
        <Tab icon={{ ios: 'square.grid.2x2.fill', android: 'dashboard' }} label="Today" on />
        <Tab icon={{ ios: 'fork.knife', android: 'restaurant' }} label="Food log" />
        <View style={styles.tabCenter}>
          <Press
            onPress={() => setAdding((a) => !a)}
            accessibilityLabel={adding ? 'Close' : 'Add a report'}
            accessibilityState={{ expanded: adding }}
            style={styles.fab}>
            <PlusIcon open={adding} />
          </Press>
        </View>
        <Tab icon={{ ios: 'doc.text', android: 'description' }} label="Reports" />
        <Tab icon={{ ios: 'ellipsis.circle', android: 'more_horiz' }} label="More" />
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
              soon();
            }}
          />
        ))}
      </View>
    </View>
  );
}

// Fanned in an arc above the +: up-left, straight up, up-right
const REPORTS: { name: string; icon: Icon; angle: number }[] = [
  { name: 'Blood', icon: { ios: 'drop.fill', android: 'bloodtype' }, angle: 135 },
  { name: 'Urine', icon: { ios: 'flask.fill', android: 'science' }, angle: 90 },
  { name: 'InBody', icon: { ios: 'figure.stand', android: 'accessibility_new' }, angle: 45 },
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
        <SymbolView name={sym(report.icon)} size={22} tintColor={BLACK} />
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
      <SymbolView name={sym({ ios: 'plus', android: 'add' })} size={22} weight="semibold" tintColor={BLACK} />
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

/** Pressable that dips on touch-down (not release) and springs back, interruptible mid-motion. */
const APressable = Animated.createAnimatedComponent(Pressable);
function Press({
  style,
  scale = 0.95,
  ...props
}: Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scale?: number }) {
  const s = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }] }));
  return (
    <APressable
      accessibilityRole="button"
      {...props}
      onPressIn={(e) => {
        s.set(withSpring(scale, SPRING));
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withSpring(1, SPRING));
        props.onPressOut?.(e);
      }}
      style={[style, pressStyle]}
    />
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

function Side({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.side}>
      <Text style={styles.sideValue} numberOfLines={1} adjustsFontSizeToFit>
        {value.toLocaleString('en-GB')}
      </Text>
      <Text style={styles.sideLabel} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </View>
  );
}

/** Two-option switch whose white pill glides to the chosen side. */
const SEG_W = 116;
function Segmented({ options, index, onChange }: { options: string[]; index: number; onChange: (i: number) => void }) {
  const x = useSharedValue(index * SEG_W);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      <Animated.View style={[styles.segPill, pill]} />
      {options.map((o, i) => (
        <Pressable
          key={o}
          onPress={() => {
            x.set(withSpring(i * SEG_W, SPRING));
            onChange(i);
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === index }}
          style={styles.segItem}>
          <Text style={[styles.segText, i === index && styles.segTextOn]}>{o}</Text>
        </Pressable>
      ))}
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
      <SymbolView name={sym(icon)} size={21} tintColor={on ? WHITE : QUIET} />
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
  card: {
    padding: 20,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: '#0E0E0E',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: RIM,
  },
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
  macroName: { color: MUTED, fontSize: 13, fontWeight: '500' },
  macroTrack: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: TRACK, marginTop: 8, overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 2, backgroundColor: WHITE },
  macroValue: { color: WHITE, fontSize: 13, fontWeight: '500', fontFamily: ROUNDED, marginTop: 8 },

  seg: {
    flexDirection: 'row',
    alignSelf: 'center',
    padding: 4,
    marginTop: 22,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  segPill: { position: 'absolute', top: 4, left: 4, width: SEG_W, height: 40, borderRadius: 20, backgroundColor: WHITE },
  segItem: { width: SEG_W, height: 40, alignItems: 'center', justifyContent: 'center' },
  segText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  segTextOn: { color: BLACK },

  section: { color: WHITE, fontSize: 21, fontWeight: '600', letterSpacing: -0.3, marginTop: 32, marginBottom: 14 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  link: { color: MUTED, fontSize: 14 },

  pair: { flexDirection: 'row', gap: 12 },
  habit: { flex: 1, padding: 16 },
  habitName: { color: WHITE, fontSize: 16, fontWeight: '600' },
  habitSub: { color: QUIET, fontSize: 12, marginTop: 2 },
  // 30 days as 3 rows of 10
  dots: { gap: 4, marginTop: 14 },
  dotRow: { flexDirection: 'row', gap: 4 },
  dotCell: { flex: 1, aspectRatio: 1, borderRadius: 3, backgroundColor: TRACK },
  dotOn: { backgroundColor: WHITE },
  habitFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RIM,
  },
  habitWeek: { color: WHITE, fontSize: 16, fontWeight: '600', fontFamily: ROUNDED },
  habitWeekNote: { color: QUIET, fontSize: 12, fontWeight: '400' },

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
  personName: { color: WHITE, fontSize: 13, fontWeight: '500', marginTop: 10 },
  personRole: { fontSize: 12, fontWeight: '600', marginTop: 2 },

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
