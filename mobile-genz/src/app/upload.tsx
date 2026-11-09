import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Banner, Btn, C, Chip, F, Page, Sticker, T, tap } from '@/components/ui';
import { submitAssessment, type ReportKind } from '@/lib/api';
import { getProfile } from '@/lib/store';

const SLOTS: { kind: ReportKind; emoji: string; title: string; sub: string; color: string; required?: boolean }[] = [
  { kind: 'blood', emoji: '🩸', title: 'blood report', sub: 'required · CBC, lipid, sugar, thyroid… whatever you have', color: '#FFD0C4', required: true },
  { kind: 'urine', emoji: '🧪', title: 'urine report', sub: 'optional', color: '#FFE7A3' },
  { kind: 'inbody', emoji: '⚖️', title: 'InBody / body scan', sub: 'optional · makes calories super accurate', color: '#DDEBFF' },
];

export default function Upload() {
  const [files, setFiles] = useState<Partial<Record<ReportKind, DocumentPicker.DocumentPickerAsset>>>({});
  const [weeks, setWeeks] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = getProfile()?.name.split(' ')[0];

  async function pick(kind: ReportKind) {
    tap();
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets[0]) return;
    setError(null);
    setFiles((f) => ({ ...f, [kind]: res.assets[0] }));
  }

  async function send() {
    if (!files.blood) return setError('add your blood report first');
    setBusy(true);
    setError(null);
    try {
      await submitAssessment(files, weeks);
      router.replace('/reading');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <T v="h1">drop the receipts{name ? `, ${name}` : ''} 📄</T>
      <T color={C.muted}>PDF or a photo straight from your phone. any Indian lab works.</T>

      {SLOTS.map((s) => {
        const file = files[s.kind];
        return (
          <Pressable key={s.kind} accessibilityRole="button" accessibilityLabel={`add ${s.title}`} onPress={() => pick(s.kind)}>
            <Sticker color={file ? s.color : C.paper}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <T v="h1" style={{ fontSize: 34 }}>
                  {s.emoji}
                </T>
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="h3" style={{ fontFamily: F.bold }}>
                    {s.title}
                  </T>
                  <T v="small" color={C.muted} numberOfLines={1}>
                    {file ? `✓ ${file.name}` : s.sub}
                  </T>
                </View>
                <T v="h2">{file ? '↺' : '+'}</T>
              </View>
            </Sticker>
          </Pressable>
        );
      })}

      <View style={{ gap: 10 }}>
        <T v="h3">how many weeks of plan?</T>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[1, 2, 3, 4].map((w) => (
            <Chip key={w} label={`${w} wk`} on={weeks === w} onPress={() => setWeeks(w)} />
          ))}
        </View>
      </View>

      {error ? <Banner color="#FFD0C4">{error}</Banner> : null}
      <Btn label={busy ? 'sending…' : 'cook my plan 🍳'} onPress={send} disabled={busy} />
      <T v="small" color={C.muted} style={{ textAlign: 'center' }}>
        your reports are only used to make your plan.
      </T>
    </Page>
  );
}
