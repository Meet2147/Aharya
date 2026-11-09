import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eats } from '@/components/eats';
import { Haul } from '@/components/haul';
import { C, F, T, tap } from '@/components/ui';
import { You } from '@/components/you';
import { planToday, savedData } from '@/lib/api';
import { useStored } from '@/lib/store';

const TABS = [
  { key: 'eats', emoji: '🍛', label: 'eats' },
  { key: 'haul', emoji: '🛒', label: 'haul' },
  { key: 'you', emoji: '🫶', label: 'you' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default function Home() {
  const data = savedData();
  const [tab, setTab] = useStored<Tab>('tab', 'eats');
  const today = data?.plan ? planToday(data.plan, data.assessment.created_at) : { week: 0, day: 0 };
  const [week, setWeek] = useStored('week', today.week);
  const insets = useSafeAreaInsets();

  if (!data) return <Redirect href="/welcome" />;
  if (!data.plan) return <Redirect href="/reading" />;
  const w = Math.min(week, data.plan.weeks.length - 1);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {tab === 'eats' ? <Eats data={data} week={w} setWeek={setWeek} today={today} /> : null}
      {tab === 'haul' ? <Haul data={data} week={w} setWeek={setWeek} /> : null}
      {tab === 'you' ? <You data={data} /> : null}

      {/* Floating tab bar */}
      <View style={[styles.barWrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
        <View style={styles.shadow} />
        <View style={styles.bar}>
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <Pressable
                key={t.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t.label}
                onPress={() => {
                  tap();
                  setTab(t.key);
                }}
                style={[styles.tab, on && { backgroundColor: C.turmeric }]}
              >
                <T v="h3">{t.emoji}</T>
                <T v="small" style={{ fontFamily: on ? F.bold : F.semi }}>
                  {t.label}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barWrap: { position: 'absolute', left: 20, right: 24 },
  shadow: { position: 'absolute', top: 4, left: 4, right: -4, bottom: -4, backgroundColor: C.ink, borderRadius: 999 },
  bar: {
    flexDirection: 'row',
    backgroundColor: C.paper,
    borderWidth: 2.5,
    borderColor: C.ink,
    borderRadius: 999,
    padding: 5,
    gap: 4,
  },
  tab: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 999 },
});
