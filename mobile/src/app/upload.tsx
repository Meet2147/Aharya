import * as DocumentPicker from 'expo-document-picker';
import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeftIcon as CaretLeft } from 'phosphor-react-native/src/icons/CaretLeft';
import { CheckIcon as Check } from 'phosphor-react-native/src/icons/Check';
import { DropIcon as Drop } from 'phosphor-react-native/src/icons/Drop';
import { FlaskIcon as Flask } from 'phosphor-react-native/src/icons/Flask';
import { PersonSimpleIcon as PersonSimple } from 'phosphor-react-native/src/icons/PersonSimple';
import { XIcon as X } from 'phosphor-react-native/src/icons/X';

import { BLACK, Glyph, card, MUTED, Press, QUIET, RIM, WHITE, type Icon } from '@/components/ui';
import { READING, submitAssessment, type ReportKind } from '@/lib/api';
import { parseProfile, supabase } from '@/lib/supabase';

const SLOTS: { kind: ReportKind; name: string; hint: string; required?: boolean; icon: Icon }[] = [
  {
    kind: 'blood',
    name: 'Blood report',
    hint: 'Sugar, cholesterol, thyroid, vitamins',
    required: true,
    icon: Drop,
  },
  {
    kind: 'urine',
    name: 'Urine report',
    hint: 'Kidney and sugar checks',
    icon: Flask,
  },
  {
    kind: 'inbody',
    name: 'InBody report',
    hint: 'Body fat, muscle and metabolism',
    icon: PersonSimple,
  },
];

type Files = Partial<Record<ReportKind, DocumentPicker.DocumentPickerAsset>>;

export default function Upload() {
  const insets = useSafeAreaInsets();
  const canGoBack = useCanGoBack();
  // kind: opened from a circle on the + menu, so go straight to that report's file picker.
  // profile: opened from onboarding: reading, then sign-up (or home, if already signed in) comes next.
  const { kind, profile } = useLocalSearchParams<{ kind?: ReportKind; profile?: string }>();
  const onboarding = profile !== undefined;
  const [files, setFiles] = useState<Files>({});
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const ready = !!files.blood && consent && !sending;

  const pick = (k: ReportKind) =>
    DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'] }).then((res) => {
      if (!res.canceled) setFiles((f) => ({ ...f, [k]: res.assets[0] }));
    });

  useEffect(() => {
    // Browsers only open a file picker from a tap, so web waits for one
    if (kind && Platform.OS !== 'web') pick(kind);
  }, [kind]);

  async function skip() {
    const { data } = await supabase.auth.getSession();
    if (data.session) return router.replace('/home');
    router.push({ pathname: '/sign-up', params: { profile } });
  }

  async function send() {
    if (!ready) return;
    setSending(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (onboarding && !data.session) {
        // No account yet: read the reports from the onboarding answers, and sign up once they're read
        await submitAssessment(files, parseProfile(profile));
        return router.replace({ pathname: '/plan', params: { next: 'sign-up', profile } });
      }
      await submitAssessment(files);
      router.replace(onboarding ? READING : '/plan');
    } catch (e) {
      setSending(false);
      Alert.alert('Could not send your reports', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.nav}>
          {canGoBack ? (
            <Press onPress={() => router.back()} accessibilityLabel="Back" style={styles.navButton}>
              <Glyph icon={CaretLeft} size={18} weight="bold" color={WHITE} />
            </Press>
          ) : (
            <View />
          )}
          {(onboarding || !canGoBack) && (
            <Pressable
              onPress={() => (onboarding ? skip() : router.replace('/home'))}
              accessibilityRole="button"
              hitSlop={12}>
              <Text style={styles.skip}>Skip for now</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Add your{'\n'}reports
        </Text>
        <Text style={styles.subtitle}>
          A PDF or a clear photo works. Your blood report is all we need; urine and InBody make the plan sharper.
        </Text>

        <View style={styles.slots}>
          {SLOTS.map((s) => {
            const file = files[s.kind];
            return (
              <Press
                key={s.kind}
                onPress={() => pick(s.kind)}
                scale={0.98}
                accessibilityLabel={`${s.name}, ${s.required ? 'required' : 'optional'}${file ? `, ${file.name} added` : ''}`}
                style={[styles.slot, !!file && styles.slotDone]}>
                <View style={[styles.slotIcon, !!file && styles.slotIconDone]}>
                  <Glyph
                    icon={file ? Check : s.icon}
                    size={20}
                    weight="bold"
                    color={file ? BLACK : WHITE}
                  />
                </View>
                <View style={styles.flex}>
                  <View style={styles.slotHead}>
                    <Text style={styles.slotName}>{s.name}</Text>
                    <Text style={styles.slotTag}>{s.required ? 'Required' : 'Optional'}</Text>
                  </View>
                  <Text style={styles.slotHint} numberOfLines={1}>
                    {file ? file.name : s.hint}
                  </Text>
                </View>
                {file ? (
                  <Pressable
                    onPress={() => setFiles(({ [s.kind]: _, ...rest }) => rest)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${s.name}`}
                    hitSlop={10}
                    style={styles.remove}>
                    <Glyph icon={X} size={12} weight="bold" color={MUTED} />
                  </Pressable>
                ) : (
                  <Text style={styles.choose}>Choose</Text>
                )}
              </Press>
            );
          })}
        </View>

        <Pressable
          onPress={() => setConsent((c) => !c)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          style={styles.consent}>
          <View style={[styles.box, consent && styles.boxOn]}>
            {consent && <Glyph icon={Check} size={13} weight="bold" color={BLACK} />}
          </View>
          <Text style={styles.consentText}>
            I agree to Aharya reading these reports to build my nutrition plan. It is guidance, not a diagnosis.
          </Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Press
          onPress={send}
          disabled={!ready}
          accessibilityLabel="Analyse reports"
          accessibilityState={{ disabled: !ready, busy: sending }}
          style={[styles.cta, !ready && !sending && styles.ctaOff]}>
          {sending ? <ActivityIndicator color={BLACK} /> : <Text style={styles.ctaText}>Analyse reports</Text>}
        </Press>
        {!files.blood && <Text style={styles.footNote}>Add your blood report to continue</Text>}
        {!!files.blood && !consent && <Text style={styles.footNote}>Tick the box above to continue</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLACK },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skip: { color: MUTED, fontSize: 15, fontWeight: '500' },
  title: { color: WHITE, fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -1, marginTop: 18 },
  subtitle: { color: MUTED, fontSize: 15, lineHeight: 22, marginTop: 10 },

  slots: { gap: 12, marginTop: 28 },
  slot: { ...card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22 },
  slotDone: { borderColor: 'rgba(255,255,255,0.35)' },
  slotIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  slotIconDone: { backgroundColor: WHITE },
  slotHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  slotName: { color: WHITE, fontSize: 16, fontWeight: '600' },
  slotTag: { color: QUIET, fontSize: 12, fontWeight: '500' },
  slotHint: { color: MUTED, fontSize: 13, marginTop: 3 },
  choose: { color: WHITE, fontSize: 14, fontWeight: '600' },
  remove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  consent: { flexDirection: 'row', gap: 12, marginTop: 24, paddingVertical: 6, alignItems: 'flex-start' },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: WHITE, borderColor: WHITE },
  consentText: { flex: 1, color: MUTED, fontSize: 14, lineHeight: 20 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RIM,
  },
  cta: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: WHITE },
  ctaOff: { opacity: 0.35 },
  ctaText: { color: BLACK, fontSize: 16, fontWeight: '600' },
  footNote: { color: QUIET, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
