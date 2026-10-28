import { Platform, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import type { Icon as PhosphorIcon, IconWeight } from 'phosphor-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { CoffeeIcon as Coffee } from 'phosphor-react-native/src/icons/Coffee';
import { LeafIcon as Leaf } from 'phosphor-react-native/src/icons/Leaf';
import { MoonStarsIcon as MoonStars } from 'phosphor-react-native/src/icons/MoonStars';
import { SunIcon as Sun } from 'phosphor-react-native/src/icons/Sun';
import { SunHorizonIcon as SunHorizon } from 'phosphor-react-native/src/icons/SunHorizon';

// Palette: black and white only
export const BLACK = '#000000';
export const WHITE = '#FFFFFF';
export const MUTED = 'rgba(255,255,255,0.6)';
export const QUIET = 'rgba(255,255,255,0.42)';
export const TRACK = 'rgba(255,255,255,0.1)';
export const RIM = 'rgba(255,255,255,0.1)';
// The one place colour is allowed: marker status (always shown with the word too)
export const STATUS = {
  Low: { color: '#FFB340', glow: 'rgba(255,179,64,0.35)' },
  Normal: { color: '#30D158', glow: 'rgba(48,209,88,0.3)' },
  High: { color: '#FF453A', glow: 'rgba(255,69,58,0.35)' },
};
// Macro colours, kept clear of the status red/amber/green above
export const MACRO = { protein: '#5E9EFF', carbs: '#FFD60A', fat: '#BF5AF2' };
// SF Rounded for numbers on iOS; Android keeps its system font
export const ROUNDED = Platform.select({ ios: 'ui-rounded' });
// Critically damped: settles without overshoot, and re-targets from wherever it is mid-motion
export const SPRING = { duration: 340, dampingRatio: 1 };

// Phosphor icons (phosphoricons.com), imported one file each so only the ones used are bundled
export type Icon = PhosphorIcon;

/** An icon, filled by default; bold for the thin line glyphs (check, caret, x, plus). */
export function Glyph({ icon: I, size, color, weight = 'fill' }: { icon: Icon; size: number; color: string; weight?: IconWeight }) {
  return <I size={size} color={color} weight={weight} />;
}

/** The plan's five meals of the day, in order, with the hour each one ends (for "up next"). */
export const MEAL_SLOTS: Record<string, { name: string; icon: Icon; time: string; until: number }> = {
  breakfast: { name: 'Breakfast', icon: SunHorizon, time: '7–9 AM', until: 10 },
  mid_morning: { name: 'Mid-morning', icon: Coffee, time: '11 AM', until: 12 },
  lunch: { name: 'Lunch', icon: Sun, time: '1–2 PM', until: 15 },
  evening_snack: { name: 'Evening snack', icon: Leaf, time: '5 PM', until: 19 },
  dinner: { name: 'Dinner', icon: MoonStars, time: '8 PM', until: 24 },
};

/** The meal whose time it is now: the first one whose slot hasn't ended yet. */
export function upNext(meals: { slot: string }[]) {
  const hour = new Date().getHours();
  const i = meals.findIndex((m) => hour < (MEAL_SLOTS[m.slot]?.until ?? 24));
  return i < 0 ? meals.length - 1 : i;
}

/** Which week and day of the plan is today: it repeats from the day the report was sent. */
export function planToday(weeks: { days: unknown[] }[], since: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000));
  const week = Math.floor(days / 7) % weeks.length;
  return { week, day: days % weeks[week].days.length };
}

/** Cards: lifted a step off the black, hairline rim, continuous corners */
export const card: ViewStyle = {
  padding: 20,
  borderRadius: 28,
  borderCurve: 'continuous',
  backgroundColor: '#0E0E0E',
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: RIM,
};

/** Pressable that dips on touch-down (not release) and springs back, interruptible mid-motion. */
const APressable = Animated.createAnimatedComponent(Pressable);
export function Press({
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
