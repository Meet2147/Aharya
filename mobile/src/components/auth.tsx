import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { completeSignUp } from '@/lib/api';
import { hasProfile, signInWithGoogle, type Answers } from '@/lib/supabase';

const brand = {
  white: '#FFFFFF',
  black: '#000000',
};

// Black and white only
const palettes = {
  dark: {
    ...brand,
    bg: brand.black,
    title: brand.white,
    text: brand.white,
    muted: 'rgba(255,255,255,0.7)',
    placeholder: 'rgba(255,255,255,0.5)',
    surface: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.35)',
    card: '#1C1C1E',
    link: brand.white,
    error: '#FFB4A9',
    buttonBg: brand.white,
    buttonText: brand.black,
    socialBg: 'rgba(255,255,255,0.12)',
    socialText: brand.white,
    statusBar: 'light' as 'light' | 'dark',
  },
  light: {
    ...brand,
    bg: brand.white,
    title: brand.black,
    text: brand.black,
    muted: 'rgba(0,0,0,0.6)',
    placeholder: 'rgba(0,0,0,0.45)',
    surface: 'rgba(0,0,0,0.04)',
    border: 'rgba(0,0,0,0.45)',
    card: '#F2F2F2',
    link: brand.black,
    error: '#B42318',
    buttonBg: brand.black,
    buttonText: brand.white,
    socialBg: '#F2F2F2',
    socialText: brand.black,
    statusBar: 'dark' as 'light' | 'dark',
  },
};

export type AuthPalette = typeof palettes.dark;

const makeStyles = (c: AuthPalette) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.bg },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 32 },
    title: { color: c.title, fontSize: 36, fontWeight: '700', lineHeight: 42 },
    subtitle: { color: c.muted, fontSize: 16, lineHeight: 24, marginTop: 12 },
    body: { marginTop: 32, gap: 16 },
    label: { color: c.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    fieldError: { borderColor: c.error },
    input: { flex: 1, minHeight: 50, fontSize: 16, color: c.text },
    toggle: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
    link: { color: c.link, fontWeight: '600', fontSize: 15 },
    linkHit: { minHeight: 44, justifyContent: 'center', alignSelf: 'center' },
    error: { color: c.error, fontSize: 13, marginTop: 6 },
    button: {
      minHeight: 52,
      borderRadius: 999,
      backgroundColor: c.buttonBg,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    buttonText: { color: c.buttonText, fontSize: 17, fontWeight: '700' },
    pressed: { opacity: 0.8 },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
    line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.border },
    muted: { color: c.muted, fontSize: 15 },
    social: {
      minHeight: 52,
      borderRadius: 999,
      backgroundColor: c.socialBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Icon pinned left, label stays centred on the button
    brandLogo: { position: 'absolute', left: 22, width: 20, height: 20 },
    // Apple's glyph is taller than wide; nudge up so it sits optically centred
    appleLogo: { position: 'absolute', left: 23, width: 17, height: 20, top: 14 },
    socialText: { color: c.socialText, fontSize: 16, fontWeight: '500' },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  });

const themes = {
  dark: { c: palettes.dark, styles: makeStyles(palettes.dark) },
  light: { c: palettes.light, styles: makeStyles(palettes.light) },
};

/** Follows the device setting: black background in dark mode, white in light mode. */
export function useAuthTheme() {
  return themes[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

// Native uses RN's gradient style; web uses plain CSS
export const gradient = (g: string) =>
  Platform.OS === 'web' ? { backgroundImage: g } : { experimental_backgroundImage: g };

/** Soft radial light from the bottom edge, with an eased (many-stop) falloff: no rim, no banding. */
export const light = (rgb: string, alpha: number, shape: string) => {
  const stops = Array.from({ length: 11 }, (_, i) => {
    const t = i / 10;
    return `rgba(${rgb},${(alpha * (1 - t) ** 2).toFixed(3)}) ${t * 100}%`;
  });
  return `radial-gradient(${shape}, ${stops.join(', ')})`;
};

// The intro's closing light is one tall band (no joins, so no seams) that travels up through the
// screen: a clear-to-grey feather on top, a grey body as tall as the screen with a soft white core
// at its base, and a grey-to-clear feather below. Feathers are fractions of screen height.
const TOP = 0.6;
const BOTTOM = 0.6;
const SPAN = TOP + 1 + BOTTOM;
const t = (100 * TOP) / SPAN; // body top, % of the band
const b = (100 * (TOP + 1)) / SPAN; // body bottom
const SWEEP = gradient(
  [
    light('255,255,255', 0.3, `ellipse 90% 30% at 50% ${b}%`),
    `linear-gradient(180deg, rgba(64,64,64,0) 0%, rgba(64,64,64,0.07) ${t * 0.4}%, rgba(64,64,64,0.25) ${t * 0.7}%, rgba(64,64,64,0.52) ${t}%, rgba(64,64,64,0.68) ${(t + b) / 2}%, rgba(64,64,64,0.75) ${b}%, rgba(64,64,64,0.5) ${b + (100 - b) * 0.3}%, rgba(64,64,64,0.18) ${b + (100 - b) * 0.65}%, rgba(64,64,64,0) 100%)`,
  ].join(', '),
);

/**
 * The light that carries the intro into onboarding. progress 0 = below the screen, 1 = filling
 * it, 2 = gone off the top. The intro sweeps it 0 -> 1; onboarding opens on that frame and carries
 * it on 1 -> 2, so the light clears from the bottom up with no visible cut between screens.
 */
export function IntroLight({
  progress,
}: {
  progress: Animated.Value;
}) {
  // Start from the full screen height (what a full-screen view measures, edge to edge) so both
  // screens draw the same frame from their very first render: no jump at the hand-off
  const [h, setH] = useState(() => Math.round(Dimensions.get('screen').height));
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setH(Math.round(e.nativeEvent.layout.height))}
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: -Math.round(h * TOP),
            height: Math.round(h * SPAN),
          },
          SWEEP,
          {
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [Math.round(h * (1 + TOP)), 0, -Math.round(h * (1 + BOTTOM))],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

export const isEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { c, styles } = useAuthTheme();
  return (
    <SafeAreaView style={styles.flex}>
      <StatusBar style={c.statusBar} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <View style={styles.body}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  error?: string;
  secure?: boolean;
};

export function Field({ label, error, secure, ...input }: FieldProps) {
  const { c, styles } = useAuthTheme();
  const [hidden, setHidden] = useState(true);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, !!error && styles.fieldError]}>
        <TextInput
          style={styles.input}
          accessibilityLabel={label}
          placeholderTextColor={c.placeholder}
          autoCapitalize="none"
          secureTextEntry={secure && hidden}
          {...input}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? `Show ${label}` : `Hide ${label}`}
            style={styles.toggle}>
            <Text style={styles.link}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

export function PrimaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  const { styles } = useAuthTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

/** profile: onboarding answers to save with the new account (sign-up); omitted on sign-in. */
export function SocialButtons({ profile }: { profile?: Answers }) {
  const { c, styles } = useAuthTheme();
  const [busy, setBusy] = useState(false);
  // ponytail: Apple not wired yet, add expo-apple-authentication + Supabase Apple provider
  const soon = () => Alert.alert('Coming soon', 'Apple sign-in is not available yet.');

  async function google() {
    setBusy(true);
    try {
      if (!(await signInWithGoogle())) return setBusy(false); // cancelled
      // Spinner stays on: this screen is replaced, so the button never flashes back
      if (profile) {
        await completeSignUp(profile);
        return router.replace('/home');
      }
      // Signed in from the login screen with no saved profile yet: collect it first
      router.replace((await hasProfile()) ? '/home' : '/onboarding');
    } catch (e) {
      setBusy(false);
      Alert.alert('Google sign-in failed', e instanceof Error ? e.message : String(e));
    }
  }
  return (
    <>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.muted}>or</Text>
        <View style={styles.line} />
      </View>
      <Pressable
        onPress={soon}
        accessibilityRole="button"
        style={({ pressed }) => [styles.social, pressed && styles.pressed]}>
        <Image
          source={require('@/assets/images/brands/apple.svg')}
          style={styles.appleLogo}
          tintColor={c.socialText}
          contentFit="contain"
          accessible={false}
        />
        <Text style={styles.socialText}>Continue with Apple</Text>
      </Pressable>
      <Pressable
        onPress={google}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ busy }}
        style={({ pressed }) => [styles.social, pressed && styles.pressed]}>
        {/* Stays up from picking the account until home replaces this screen */}
        {busy ? (
          <ActivityIndicator color={c.socialText} accessibilityLabel="Signing in" />
        ) : (
          <>
            <Image
              source={require('@/assets/images/brands/google.svg')}
              style={styles.brandLogo}
              contentFit="contain"
              accessible={false}
            />
            <Text style={styles.socialText}>Continue with Google</Text>
          </>
        )}
      </Pressable>
    </>
  );
}

export function FooterLink({
  text,
  action,
  onPress,
}: {
  text: string;
  action: string;
  onPress: () => void;
}) {
  const { styles } = useAuthTheme();
  return (
    <View style={styles.footer}>
      <Text style={styles.muted}>{text} </Text>
      <Pressable onPress={onPress} accessibilityRole="link" style={styles.toggle}>
        <Text style={styles.link}>{action}</Text>
      </Pressable>
    </View>
  );
}
