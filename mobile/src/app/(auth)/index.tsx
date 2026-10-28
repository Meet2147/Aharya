import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { gradient, light } from '@/components/auth';

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const WHITE = '#FFFFFF';
const BLACK = '#000000';

// One line per tap, each rising from the bottom edge, like synced lyrics
const LINES = ['Your health,', 'made simple.', 'Reports, explained.', 'Meals, made for you.'];
const LINE_HEIGHT = 44;

// Soft white glow from the bottom edge, brightening as lines arrive
const GLOW = gradient(
  [
    light('255,255,255', 0.22, 'ellipse 40% 45% at 50% 100%'),
    light('110,110,110', 0.6, 'ellipse 80% 100% at 50% 100%'),
    light('90,90,90', 0.4, 'ellipse 35% 70% at 18% 100%'),
    light('90,90,90', 0.4, 'ellipse 35% 70% at 82% 100%'),
  ].join(', '),
);

// Intro is always black (like a splash), regardless of light/dark mode
export default function Welcome() {
  const [line, setLine] = useState(0);
  const [h, setH] = useState(800);
  // pos follows the newest line: it rises in and the glow brightens with it
  const [pos] = useState(() => new Animated.Value(-1));
  const [flash] = useState(() => new Animated.Value(0));
  const [content] = useState(() => new Animated.Value(1));
  const [leaving, setLeaving] = useState(false);
  const last = LINES.length - 1;

  // Back from onboarding: show the intro's last line again, words visible, glow settled
  useFocusEffect(
    useCallback(() => {
      flash.setValue(0);
      content.setValue(1);
      setLeaving(false);
    }, [flash, content]),
  );

  useEffect(() => {
    Animated.spring(pos, {
      toValue: line,
      damping: 16,
      stiffness: 80,
      useNativeDriver: true,
    }).start();
  }, [line, pos]);

  const label = (from: number, to: number) =>
    pos.interpolate({
      inputRange: [last - 1, last],
      outputRange: [from, to],
      extrapolate: 'clamp',
    });

  function next() {
    if (line < last) return setLine(line + 1);
    if (leaving) return;
    setLeaving(true);
    // Sine easing: gentle start and finish, no sudden burst
    const ease = Easing.inOut(Easing.sin);
    // Words drift away first, a calm light rises up from the bottom over them, then onboarding
    // fades in out of the light
    // Words drift away and the glow swells here, while onboarding opens see-through on top and
    // sweeps its light up over this screen
    Animated.parallel([
      Animated.timing(content, { toValue: 0, duration: 600, easing: ease, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 1, duration: 1100, easing: ease, useNativeDriver: true }),
    ]).start();
    router.push({ pathname: '/onboarding', params: { intro: '1' } });
  }

  return (
    <View style={styles.screen} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      <StatusBar style="light" />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          GLOW,
          {
            opacity: pos.interpolate({ inputRange: [-1, last], outputRange: [0, 1] }),
            transform: [
              { scaleY: pos.interpolate({ inputRange: [-1, last], outputRange: [0.5, 1.15] }) },
              // On "Get started" the soft glow swells up the screen as the light floods in
              { scaleY: flash.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) },
            ],
          },
        ]}
      />

      <AnimatedSafeArea style={[styles.safe, { opacity: content }]}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>aharya</Text>
          <Pressable
            onPress={() => router.push('/onboarding')}
            accessibilityRole="button"
            style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Whole middle of the screen is the tap target */}
        <Pressable
          style={styles.stage}
          onPress={next}
          accessibilityRole="button"
          disabled={line === last}
          accessibilityLabel={`${LINES[line]} Tap to continue`}>
          {/* Lines stack upward from an anchor; each new one rises from below the screen */}
          <Animated.View
            style={[
              styles.stack,
              { transform: [{ translateY: Animated.multiply(pos, -LINE_HEIGHT) }] },
            ]}>
            {LINES.map((l, i) => (
              <Animated.View
                key={l}
                style={[
                  styles.line,
                  {
                    top: i * LINE_HEIGHT,
                    // newest line is brightest, earlier ones stay readable
                    opacity: pos.interpolate({
                      inputRange: [i - 1, i, i + 1],
                      outputRange: [0, 1, 0.55],
                      extrapolate: 'clamp',
                    }),
                    transform: [
                      {
                        translateY: pos.interpolate({
                          inputRange: [i - 1, i],
                          outputRange: [h * 0.6, 0],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}>
                {/* Rises blurred and sharpens: a soft shadow-only copy crossfades into the crisp text */}
                <Animated.Text
                  numberOfLines={1}
                  style={[
                    styles.lyric,
                    styles.blurred,
                    {
                      opacity: pos.interpolate({
                        inputRange: [i - 1, i - 0.4, i],
                        outputRange: [1, 0.8, 0],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}>
                  {l}
                </Animated.Text>
                <Animated.Text
                  numberOfLines={1}
                  style={[
                    styles.lyric,
                    {
                      opacity: pos.interpolate({
                        inputRange: [i - 0.6, i],
                        outputRange: [0, 1],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}>
                  {l}
                </Animated.Text>
              </Animated.View>
            ))}
          </Animated.View>
        </Pressable>

        {/* A big, plainly labelled button: older users shouldn't have to guess that the text is tappable */}
        <Pressable
          onPress={next}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
          {/* Labels crossfade in step with the last line rising, rather than swapping */}
          <View>
            <Animated.Text style={[styles.ctaText, { opacity: label(0, 1) }]}>
              Get started
            </Animated.Text>
            <Animated.Text style={[styles.ctaText, styles.ctaOver, { opacity: label(1, 0) }]}>
              Continue
            </Animated.Text>
          </View>
          <Text style={styles.ctaArrow}>→</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/sign-in')}
          accessibilityRole="link"
          style={styles.signIn}>
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInBold}>Sign in</Text>
          </Text>
        </Pressable>
      </AnimatedSafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BLACK, overflow: 'hidden' },
  safe: { flex: 1, paddingHorizontal: 24 },
  glow: {
    position: 'absolute',
    left: -100,
    right: -100,
    bottom: 0,
    height: '70%',
    transformOrigin: 'bottom',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  brand: { color: WHITE, fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  skip: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  skipText: { color: WHITE, fontSize: 16, fontWeight: '600' },
  stage: { flex: 1 },
  // Newest line sits here; earlier lines climb above it
  stack: { position: 'absolute', left: 0, right: 0, bottom: '22%' },
  line: { position: 'absolute', left: 0, right: 0, height: LINE_HEIGHT },
  lyric: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: LINE_HEIGHT,
    color: WHITE,
    fontSize: 30,
    lineHeight: LINE_HEIGHT,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  // Transparent glyphs with a wide white shadow read as blurred text on every platform
  blurred: {
    color: 'transparent',
    textShadowColor: 'rgba(255,255,255,0.9)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  cta: {
    minHeight: 64,
    borderRadius: 32,
    backgroundColor: WHITE,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  ctaText: { color: BLACK, fontSize: 20, fontWeight: '700' },
  ctaOver: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  ctaArrow: { color: BLACK, fontSize: 22, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  signIn: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  signInText: { color: WHITE, fontSize: 16 },
  signInBold: { fontWeight: '700', textDecorationLine: 'underline' },
});
