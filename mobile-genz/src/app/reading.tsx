import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Bar, Btn, C, F, Page, Sticker, T } from '@/components/ui';
import { currentId, refresh, type Data } from '@/lib/api';

const STAGES = [
  { key: 'extracting', emoji: '🔍', label: 'reading your reports' },
  { key: 'analysing', emoji: '🧪', label: 'checking every number' },
  { key: 'planning', emoji: '🍳', label: 'cooking your plan' },
];

/** Polls the server while it reads the reports, then hands over to home. */
export default function Reading() {
  const [data, setData] = useState<Data | null>(null);
  const [offline, setOffline] = useState(false);
  const id = currentId();

  useEffect(() => {
    if (!id) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const d = await refresh(id!);
        if (!live) return;
        setData(d);
        setOffline(false);
        if (d.assessment.status === 'completed') return router.replace('/home');
        if (d.assessment.status === 'queued' || d.assessment.status === 'processing') timer = setTimeout(poll, 3000);
      } catch {
        if (!live) return;
        setOffline(true);
        timer = setTimeout(poll, 8000);
      }
    }
    poll();
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [id]);

  const a = data?.assessment;

  if (a?.status === 'needs_doctor') {
    const urgent = a.findings.filter((f) => f.severity === 'urgent');
    return (
      <Page>
        <T v="h1">let’s pause the meal plan</T>
        <T color={C.muted}>
          something in your report needs a doctor before any diet change. this isn’t a diagnosis, just a flag worth taking
          seriously.
        </T>
        {urgent.map((f) => (
          <Sticker key={f.code} color="#FFD0C4">
            <T v="h3" style={{ fontFamily: F.bold }}>
              {f.title}
            </T>
            <T style={{ marginTop: 4 }}>{f.message}</T>
          </Sticker>
        ))}
        <Btn label="upload a newer report" onPress={() => router.replace('/upload')} />
      </Page>
    );
  }

  if (a?.status === 'failed') {
    return (
      <Page>
        <T v="h1">we couldn’t read that 😵‍💫</T>
        <Sticker color="#FFD0C4">
          <T>{a.error ?? 'something went wrong while reading your reports.'}</T>
        </Sticker>
        <T color={C.muted}>try a clearer photo or the original PDF from your lab.</T>
        <Btn label="try again" onPress={() => router.replace('/upload')} />
      </Page>
    );
  }

  const current = Math.max(0, STAGES.findIndex((s) => s.key === a?.stage));
  return (
    <Page style={{ gap: 24 }}>
      <T v="h1">hang tight, we’re on it ⏳</T>
      <T color={C.muted}>usually under a minute. you can leave this screen, we’ll keep going.</T>
      <Bar value={(current + 1) / (STAGES.length + 1)} color={C.pudina} />
      {STAGES.map((s, i) => (
        <Sticker key={s.key} color={i < current ? '#BFF0D4' : i === current ? C.turmeric : C.paper} offset={i === current ? 5 : 3}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <T v="h2">{i < current ? '✅' : s.emoji}</T>
            <T v="h3" style={{ fontFamily: i === current ? F.bold : F.semi, flex: 1 }}>
              {s.label}
              {i === current ? '…' : ''}
            </T>
          </View>
        </Sticker>
      ))}
      {offline ? (
        <T v="small" color={C.chilli}>
          can’t reach the server, retrying…
        </T>
      ) : null}
      {!id ? <Btn label="upload reports" onPress={() => router.replace('/upload')} /> : null}
    </Page>
  );
}
