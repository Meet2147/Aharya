import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { gradient } from '@/components/auth';

// Fixed look, independent of system theme: deep teal-sage at the top fading to a pale mist
const BG = gradient(
  'linear-gradient(180deg, #2E4F4B 0%, #4E6E69 22%, #8EA8A3 52%, #C9D7D3 78%, #E3EBE8 100%)',
);
const INK = '#0E1A19';
const MUTED = 'rgba(14,26,25,0.55)';
const WHITE = '#FFFFFF';
const DARK = '#14201F';
// SF Rounded for numbers on iOS; Android keeps its system font
const ROUNDED = Platform.select({ ios: 'ui-rounded' });

type Icon = { ios: SFSymbol; android: AndroidSymbol };

// ponytail: sample data until reports come from the backend
const NAME = 'Aditya';
const REPORT_DATE = '12 Oct';
// Ordered so anything needing attention comes first; `aim` gives the healthy range for context
const MARKERS = [
  { name: 'Vitamin D', value: '18', unit: 'ng/mL', status: 'Low', aim: '30–100' },
  { name: 'Cholesterol', value: '210', unit: 'mg/dL', status: 'Borderline', aim: 'under 200' },
  { name: 'Haemoglobin', value: '13.8', unit: 'g/dL', status: 'Normal', aim: '12–16' },
  { name: 'Sugar', value: '92', unit: 'mg/dL', status: 'Normal', aim: '70–100' },
] as const;
// Colour only on the status word; dark enough to read on frosted glass
const STATUS = { Low: '#C2410C', Borderline: '#A15C07', Normal: '#0B6E70' };
const attention = MARKERS.filter((m) => m.status !== 'Normal').length;
const TABS: { label: string; icon: Icon }[] = [
  { label: 'Home', icon: { ios: 'house.fill', android: 'home' } },
  { label: 'Reports', icon: { ios: 'doc.text', android: 'description' } },
  { label: 'Diet', icon: { ios: 'fork.knife', android: 'restaurant' } },
  { label: 'Profile', icon: { ios: 'person', android: 'person' } },
];

const soon = () => Alert.alert('Coming soon', 'This part is not ready yet.');

export default function Home() {
  const [tab, setTab] = useState(0);
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={[styles.root, BG]}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <GlassCircle icon={{ ios: 'drop.fill', android: 'water_drop' }} label="Aharya" />
            <View style={styles.flex} />
            <GlassCircle
              icon={{ ios: 'bell', android: 'notifications' }}
              label="Notifications"
              dot
            />
            <Pressable onPress={soon} accessibilityRole="button" accessibilityLabel="Profile">
              <View style={[styles.avatar, AVATAR]}>
                <Text style={styles.avatarText}>{NAME[0]}</Text>
              </View>
            </Pressable>
          </View>

          <Text style={styles.welcome} accessibilityRole="header">
            Welcome, <Text style={styles.bold}>{NAME}!</Text> here&apos;s your{' '}
            <Text style={styles.welcomeStrong}>health snapshot for today</Text>
          </Text>
          <Text style={styles.date}>Today is {today}</Text>

          <Pressable
            onPress={soon}
            accessibilityRole="search"
            style={[styles.glass, styles.search]}>
            <View style={styles.searchIcon}>
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                size={16}
                tintColor={INK}
              />
            </View>
            <Text style={styles.searchText}>Search reports or foods</Text>
          </Pressable>

          <SectionHead
            title="Your markers"
            note={`${attention ? `${attention} need attention` : 'All in range'} · ${REPORT_DATE} report`}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.row}>
            {/* One idea per line: what it is, the number, then how it's doing against the target */}
            {MARKERS.map((m) => (
              <Pressable
                key={m.name}
                onPress={soon}
                accessibilityRole="button"
                accessibilityLabel={`${m.name} ${m.value} ${m.unit}, ${m.status}. Healthy range ${m.aim}.`}
                style={({ pressed }) => [styles.glass, styles.stat, pressed && styles.pressed]}>
                <Text style={styles.statName}>{m.name}</Text>
                <Text style={styles.statValue}>
                  {m.value}
                  <Text style={styles.statUnit}> {m.unit}</Text>
                </Text>
                <Text style={[styles.statusText, { color: STATUS[m.status] }]}>{m.status}</Text>
                <Text style={styles.aim}>Aim {m.aim}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <SectionHead title="Today's diet plan" />
          <Pressable
            onPress={soon}
            accessibilityRole="button"
            style={[styles.glass, styles.feature]}>
            <View style={[StyleSheet.absoluteFill, FEATURE_GLOW]} />
            <Text style={styles.featureTitle}>{'Vitamin D\nboost plan'}</Text>
            <Text style={styles.featureSub}>3 meals · built from your 12 Oct report</Text>
            <View style={styles.featureFoot}>
              <View style={[styles.glass, styles.pill]}>
                <Text style={styles.pillText}>1,350 kcal</Text>
              </View>
              <View style={[styles.glass, styles.pill]}>
                <Text style={styles.pillText}>High protein</Text>
              </View>
              <View style={styles.flex} />
              <View style={styles.play}>
                <SymbolView
                  name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                  size={16}
                  weight="bold"
                  tintColor={WHITE}
                />
              </View>
            </View>
          </Pressable>
        </ScrollView>

        {/* Floating tab bar */}
        <SafeAreaView edges={['bottom']} style={styles.tabWrap} pointerEvents="box-none">
          <View style={styles.tabBar}>
            {TABS.map((t, i) => {
              const on = i === tab;
              return (
                <Pressable
                  key={t.label}
                  onPress={() => (i === 0 ? setTab(0) : soon())}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t.label}
                  style={[styles.tab, on && styles.tabOn]}>
                  <SymbolView
                    name={{ ...t.icon, web: t.icon.android }}
                    size={18}
                    tintColor={on ? DARK : WHITE}
                  />
                  {on && <Text style={styles.tabText}>{t.label}</Text>}
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

function GlassCircle({ icon, label, dot }: { icon: Icon; label: string; dot?: boolean }) {
  return (
    <Pressable
      onPress={soon}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.glass, styles.circle]}>
      <SymbolView name={{ ...icon, web: icon.android }} size={18} tintColor={WHITE} />
      {dot && <View style={styles.dot} />}
    </Pressable>
  );
}

function SectionHead({ title, note }: { title: string; note?: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.flex}>
        <Text style={styles.section}>{title}</Text>
        {!!note && <Text style={styles.note}>{note}</Text>}
      </View>
      <Pressable onPress={soon} accessibilityRole="button" hitSlop={10}>
        <Text style={styles.viewMore}>View all</Text>
      </Pressable>
    </View>
  );
}

// Apple Contacts-style monogram
const AVATAR = gradient('linear-gradient(180deg, #A5ABB8 0%, #858A96 100%)');
const FEATURE_GLOW = gradient(
  'radial-gradient(ellipse 70% 90% at 100% 100%, rgba(111,195,190,0.55) 0%, rgba(111,195,190,0) 70%)',
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#4E6E69' },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  // Frosted glass: translucent white, a bright hairline rim, continuous corners
  glass: {
    backgroundColor: 'rgba(255,255,255,0.38)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.7)',
    borderCurve: 'continuous',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF453A',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: WHITE, fontSize: 18, fontWeight: '600', fontFamily: ROUNDED },
  welcome: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 27,
    lineHeight: 35,
    fontWeight: '300',
    marginTop: 28,
  },
  bold: { color: WHITE, fontWeight: '700' },
  welcomeStrong: { color: WHITE, fontWeight: '500' },
  date: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 10 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 8,
    marginTop: 22,
  },
  searchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchText: { color: MUTED, fontSize: 16 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 28,
    marginBottom: 12,
  },
  note: { color: MUTED, fontSize: 14, marginTop: 2 },
  section: { color: INK, fontSize: 20, fontWeight: '600' },
  viewMore: { color: MUTED, fontSize: 15 },
  // Horizontal list runs to the screen edges
  bleed: { marginHorizontal: -20 },
  row: { paddingHorizontal: 20, gap: 12 },
  stat: { width: 150, borderRadius: 22, padding: 16 },
  statName: { color: MUTED, fontSize: 14, fontWeight: '500' },
  statValue: {
    color: INK,
    fontSize: 30,
    fontWeight: '600',
    fontFamily: ROUNDED,
    marginTop: 6,
  },
  statUnit: { color: MUTED, fontSize: 13, fontWeight: '600', fontFamily: ROUNDED },
  statusText: { fontSize: 15, fontWeight: '600', marginTop: 14 },
  aim: { color: MUTED, fontSize: 13, marginTop: 2 },
  pressed: { opacity: 0.8 },
  feature: { borderRadius: 28, padding: 20, overflow: 'hidden' },
  featureTitle: { color: INK, fontSize: 26, lineHeight: 31, fontWeight: '600' },
  featureSub: { color: MUTED, fontSize: 14, marginTop: 8 },
  featureFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 },
  pill: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: WHITE },
  pillText: { color: INK, fontSize: 13, fontWeight: '600' },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    marginBottom: 10,
    borderRadius: 34,
    borderCurve: 'continuous',
    backgroundColor: DARK,
  },
  tab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tabOn: {
    width: 'auto',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    backgroundColor: WHITE,
    borderColor: WHITE,
  },
  tabText: { color: DARK, fontSize: 15, fontWeight: '600' },
});
