import { router } from 'expo-router';
import { Alert, Platform, View } from 'react-native';

import { SampleBanner } from '@/components/sample-banner';
import { Btn, C, F, Field, Page, Sticker, T } from '@/components/ui';
import type { Data } from '@/lib/api';
import { clearAll, getProfile, useStored } from '@/lib/store';

const SEVERITY: Record<string, { label: string; color: string }> = {
  urgent: { label: 'see a doctor now', color: '#FF8A75' },
  see_doctor: { label: 'see a doctor', color: '#FFD0C4' },
  attention: { label: 'fix with food', color: C.butter },
  info: { label: 'good to know', color: '#DDEBFF' },
};
const DIET: Record<string, string> = { veg: '🥦 veg', eggetarian: '🥚 eggetarian', non_veg: '🍗 non-veg', jain: '🙏 jain', vegan: '🌱 vegan' };

function confirm(title: string, message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'cancel', style: 'cancel' },
    { text: 'yes', style: 'destructive', onPress: onYes },
  ]);
}

export function You({ data }: { data: Data }) {
  const a = data.assessment;
  const plan = data.plan!;
  const profile = data.sample ? null : getProfile();
  const [kirana, setKirana] = useStored('kirana', '');

  return (
    <Page bottom={110}>
      {data.sample ? <SampleBanner /> : null}
      <T v="h1">the tea on you ☕</T>

      {profile ? (
        <Sticker color={C.lilac}>
          <T v="h2">{profile.name}</T>
          <T style={{ fontFamily: F.semi, marginTop: 4 }}>
            {profile.age} · {profile.gender} · {DIET[profile.diet_type]} · {profile.cuisine} indian
          </T>
          <T v="small" style={{ marginTop: 4 }}>
            {[profile.height_cm && `${profile.height_cm} cm`, profile.weight_kg && `${profile.weight_kg} kg`, profile.allergies && `no ${profile.allergies}`]
              .filter(Boolean)
              .join(' · ') || 'add height and weight for sharper calories'}
          </T>
        </Sticker>
      ) : null}

      <T v="h2">what your report says</T>
      {a.findings.length ? (
        a.findings.map((f) => {
          const s = SEVERITY[f.severity] ?? SEVERITY.info;
          return (
            <Sticker key={f.code} color={s.color} offset={3} style={{ gap: 4 }}>
              <T v="label">{s.label}</T>
              <T v="h3" style={{ fontFamily: F.bold }}>
                {f.title}
              </T>
              <T v="small">{f.message}</T>
            </Sticker>
          );
        })
      ) : (
        <Sticker color="#BFF0D4">
          <T v="h3" style={{ fontFamily: F.bold }}>
            nothing flagged 🎉
          </T>
        </Sticker>
      )}

      {a.warnings.length ? (
        <Sticker color={C.paper} style={{ gap: 6 }}>
          <T v="label" color={C.muted}>
            heads up
          </T>
          {a.warnings.map((w) => (
            <T key={w} v="small">
              • {w}
            </T>
          ))}
        </Sticker>
      ) : null}

      {a.recommended_tests.length ? (
        <>
          <T v="h2">tests worth adding next time</T>
          <Sticker color={C.paper} style={{ gap: 8 }}>
            {a.recommended_tests.map((t) => (
              <View key={t.test}>
                <T style={{ fontFamily: F.semi }}>🧾 {t.test}</T>
                <T v="small" color={C.muted}>
                  {t.why}
                </T>
              </View>
            ))}
          </Sticker>
        </>
      ) : null}

      <T v="h2">house rules 📌</T>
      <Sticker color={C.butter} style={{ gap: 8 }}>
        {plan.guidance.map((g) => (
          <T key={g} v="small" style={{ fontFamily: F.semi }}>
            ✦ {g}
          </T>
        ))}
      </Sticker>

      <T v="h2">your kirana</T>
      <Field
        label="kirana whatsapp number"
        keyboardType="phone-pad"
        value={kirana}
        onChangeText={setKirana}
        placeholder="98765 43210"
        hint="saved on this phone. 'send to kirana' opens their chat directly."
      />

      <View style={{ gap: 12, marginTop: 8 }}>
        {!data.sample ? <Btn label="upload new reports 📄" onPress={() => router.push('/upload')} /> : null}
        {profile ? <Btn label="edit my profile" color={C.paper} onPress={() => router.push('/onboarding')} /> : null}
        <Btn
          label="start over"
          color={C.paper}
          textColor={C.chilli}
          onPress={() =>
            confirm('start over?', 'this clears your profile, plan and haul from this phone.', () => {
              clearAll();
              router.replace('/welcome');
            })
          }
        />
      </View>

      <T v="small" color={C.muted}>
        {plan.disclaimer}
      </T>
    </Page>
  );
}
