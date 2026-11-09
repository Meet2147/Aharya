import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// "Masala Pop": cream paper, turmeric and chilli, thick ink outlines, hard sticker shadows
export const C = {
  bg: '#FFF4DE',
  paper: '#FFFFFF',
  ink: '#141414',
  muted: '#5C5346',
  turmeric: '#FFB800',
  chilli: '#FF4D2E',
  pudina: '#2EC4B6',
  pink: '#FF8FB1',
  lilac: '#B9A6FF',
  butter: '#FFE7A3',
};

export const F = {
  regular: 'BricolageGrotesque_400Regular',
  semi: 'BricolageGrotesque_600SemiBold',
  bold: 'BricolageGrotesque_800ExtraBold',
};

const BORDER = 2.5;
const RADIUS = 20;

export function tap() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'label';
const TEXT: Record<Variant, TextStyle> = {
  h1: { fontFamily: F.bold, fontSize: 40, lineHeight: 42, letterSpacing: -1.2 },
  h2: { fontFamily: F.bold, fontSize: 28, lineHeight: 31, letterSpacing: -0.6 },
  h3: { fontFamily: F.semi, fontSize: 19, lineHeight: 24 },
  body: { fontFamily: F.regular, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: F.regular, fontSize: 13.5, lineHeight: 18 },
  label: { fontFamily: F.semi, fontSize: 12.5, letterSpacing: 0.6, textTransform: 'uppercase' },
};

export function T({
  v = 'body',
  color = C.ink,
  style,
  children,
  ...rest
}: {
  v?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text style={[TEXT[v], { color }, style]} {...rest}>
      {children}
    </Text>
  );
}

/** A card with a thick outline and a hard, offset shadow, like a sticker on a laptop. */
export function Sticker({
  color = C.paper,
  shadow = C.ink,
  offset = 4,
  rotate,
  style,
  outer,
  children,
}: {
  color?: string;
  shadow?: string;
  offset?: number;
  rotate?: string;
  style?: StyleProp<ViewStyle>;
  outer?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View style={[{ marginRight: offset, marginBottom: offset }, rotate ? { transform: [{ rotate }] } : null, outer]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { top: offset, left: offset, right: -offset, bottom: -offset, backgroundColor: shadow, borderRadius: RADIUS },
        ]}
      />
      <View style={[styles.sticker, { backgroundColor: color }, style]}>{children}</View>
    </View>
  );
}

/** Chunky button: the face drops onto its shadow while pressed. */
export function Btn({
  label,
  onPress,
  color = C.turmeric,
  textColor = C.ink,
  disabled,
  small,
  style,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [down, setDown] = useState(false);
  const offset = small ? 3 : 4;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[{ marginRight: offset, marginBottom: offset, opacity: disabled ? 0.45 : 1 }, style]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { top: offset, left: offset, right: -offset, bottom: -offset, backgroundColor: C.ink, borderRadius: 999 },
        ]}
      />
      <View
        style={[
          styles.btn,
          small && styles.btnSmall,
          { backgroundColor: color },
          down && { transform: [{ translateX: offset }, { translateY: offset }] },
        ]}
      >
        <T v={small ? 'small' : 'h3'} color={textColor} style={{ fontFamily: F.bold, textAlign: 'center' }}>
          {label}
        </T>
      </View>
    </Pressable>
  );
}

/** Selectable pill. */
export function Chip({
  label,
  on,
  onPress,
  color = C.turmeric,
}: {
  label: string;
  on?: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.chip, { backgroundColor: on ? color : C.paper }, on && styles.chipOn]}
    >
      <T v="body" style={{ fontFamily: F.semi }}>
        {label}
      </T>
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T v="label" color={C.muted}>
        {label}
      </T>
      <TextInput placeholderTextColor="#A39886" {...props} style={[styles.input, props.style]} />
      {hint ? (
        <T v="small" color={C.muted}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

/** Scrollable page on the cream background, padded clear of the notch and home bar. */
export function Page({
  children,
  bottom = 40,
  style,
}: {
  children: ReactNode;
  bottom?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={[
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + bottom, paddingHorizontal: 20, gap: 18 },
        style,
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Bar({ value, color = C.chilli }: { value: number; color?: string }) {
  return (
    <View style={styles.bar}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height: '100%', backgroundColor: color }} />
    </View>
  );
}

export function Banner({ children, color = C.butter }: { children: ReactNode; color?: string }) {
  return (
    <View style={[styles.banner, { backgroundColor: color }]}>
      <T v="small" style={{ fontFamily: F.semi }}>
        {children}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  sticker: {
    borderWidth: BORDER,
    borderColor: C.ink,
    borderRadius: RADIUS,
    padding: 16,
  },
  btn: {
    borderWidth: BORDER,
    borderColor: C.ink,
    borderRadius: 999,
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 14 },
  chip: {
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  chipOn: { transform: [{ translateY: -1 }] },
  input: {
    borderWidth: BORDER,
    borderColor: C.ink,
    borderRadius: 16,
    backgroundColor: C.paper,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: F.semi,
    fontSize: 18,
    color: C.ink,
  },
  bar: {
    height: 14,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: C.paper,
  },
  banner: {
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
