import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { SampleBanner } from '@/components/sample-banner';
import { Bar, C, F, Page, Sticker, T, tap } from '@/components/ui';
import { WeekPicker } from '@/components/week-picker';
import type { Data } from '@/lib/api';
import { getProfile, useStored } from '@/lib/store';

const SLOTS: Record<string, { emoji: string; label: string; color: string }> = {
  breakfast: { emoji: '🍳', label: 'breakfast', color: C.butter },
  mid_morning: { emoji: '🍎', label: 'mid-morning', color: '#FFD3DF' },
  lunch: { emoji: '🍛', label: 'lunch', color: '#FFE0B8' },
  evening_snack: { emoji: '🫖', label: 'evening snack', color: '#BFF0D4' },
  dinner: { emoji: '🌙', label: 'dinner', color: '#E6DEFF' },
};

export function Eats({
  data,
  week,
  setWeek,
  today,
}: {
  data: Data;
  week: number;
  setWeek: (w: number) => void;
  today: { week: number; day: number };
}) {
  const plan = data.plan!;
  const targets = data.assessment.targets;
  const isThisWeek = week === today.week;
  const [picked, setPicked] = useState<number | null>(null);
  const day = picked ?? (isThisWeek ? today.day : 0);
  const d = plan.weeks[week].days[day];
  const [eaten, setEaten] = useStored<number[]>(`eaten.w${week}d${day}`, []);
  const eatenKcal = d.meals.reduce((sum, m, i) => sum + (eaten.includes(i) ? m.kcal : 0), 0);
  const name = data.sample ? 'Rhea' : getProfile()?.name.split(' ')[0];

  return (
    <Page bottom={110}>
      {data.sample ? <SampleBanner /> : null}
      <View>
        <T v="label" color={C.muted}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
        </T>
        <T v="h1">hey {name ?? 'you'} 👋</T>
      </View>

      {targets ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Stat emoji="🔥" value={`${targets.calories_kcal}`} unit="kcal" color={C.turmeric} />
          <Stat emoji="💪" value={`${targets.protein_g}g`} unit="protein" color={C.pink} />
          <Stat emoji="🍚" value={`${targets.carbs_g}g`} unit="carbs" color={C.butter} />
          <Stat emoji="🥑" value={`${targets.fat_g}g`} unit="fat" color={C.lilac} />
        </View>
      ) : null}

      <WeekPicker weeks={plan.weeks.length} week={week} setWeek={(w) => (setPicked(null), setWeek(w))} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
        {plan.weeks[week].days.map((x, i) => {
          const on = i === day;
          const isToday = isThisWeek && i === today.day;
          return (
            <Pressable
              key={x.day}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                tap();
                setPicked(i);
              }}
              style={{
                width: 58,
                paddingVertical: 10,
                alignItems: 'center',
                borderWidth: 2.5,
                borderColor: C.ink,
                borderRadius: 18,
                backgroundColor: on ? C.chilli : C.paper,
              }}
            >
              <T v="small" color={on ? C.paper : C.muted} style={{ fontFamily: F.semi }}>
                {isToday ? 'today' : 'day'}
              </T>
              <T v="h2" color={on ? C.paper : C.ink}>
                {x.day}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>

      <Sticker color={C.paper} style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="h3" style={{ fontFamily: F.bold }}>
            {eaten.length}/{d.meals.length} meals ticked
          </T>
          <T v="small" color={C.muted}>
            {eatenKcal} / {d.total_kcal} kcal
          </T>
        </View>
        <Bar value={eatenKcal / d.total_kcal} color={C.pudina} />
      </Sticker>

      {d.meals.map((m, i) => {
        const slot = SLOTS[m.slot] ?? { emoji: '🍽️', label: m.slot, color: C.paper };
        const done = eaten.includes(i);
        return (
          <Sticker key={i} color={done ? '#EFEAE0' : slot.color} offset={done ? 2 : 4}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <T v="h1" style={{ fontSize: 32 }}>
                {slot.emoji}
              </T>
              <View style={{ flex: 1, gap: 3 }}>
                <T v="label" color={C.muted}>
                  {slot.label}
                </T>
                <T v="h3" style={{ fontFamily: F.bold, textDecorationLine: done ? 'line-through' : 'none' }}>
                  {m.name}
                </T>
                <T v="small" color={C.muted}>
                  {m.portion}
                </T>
                <T v="small" style={{ fontFamily: F.semi }}>
                  {m.kcal} kcal · {m.protein_g} g protein
                </T>
              </View>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done }}
                accessibilityLabel={`ate ${m.name}`}
                hitSlop={10}
                onPress={() => {
                  tap();
                  setEaten(done ? eaten.filter((x) => x !== i) : [...eaten, i]);
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  borderWidth: 2.5,
                  borderColor: C.ink,
                  backgroundColor: done ? C.pudina : C.paper,
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'center',
                }}
              >
                <T v="h3" style={{ fontFamily: F.bold }}>
                  {done ? '✓' : ''}
                </T>
              </Pressable>
            </View>
          </Sticker>
        );
      })}
    </Page>
  );
}

function Stat({ emoji, value, unit, color }: { emoji: string; value: string; unit: string; color: string }) {
  return (
    <Sticker color={color} offset={3} outer={{ flexBasis: '46%', flexGrow: 1 }} style={{ paddingVertical: 12 }}>
      <T v="h2">
        {emoji} {value}
      </T>
      <T v="small" style={{ fontFamily: F.semi }}>
        {unit} / day
      </T>
    </Sticker>
  );
}
