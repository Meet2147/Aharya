import { ScrollView } from 'react-native';

import { C, Chip } from '@/components/ui';

export function WeekPicker({ weeks, week, setWeek }: { weeks: number; week: number; setWeek: (w: number) => void }) {
  if (weeks < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {Array.from({ length: weeks }, (_, i) => (
        <Chip key={i} label={`week ${i + 1}`} on={week === i} onPress={() => setWeek(i)} color={C.lilac} />
      ))}
    </ScrollView>
  );
}
