import { router } from 'expo-router';
import { View } from 'react-native';

import { Btn, C, F, Page, Sticker, T } from '@/components/ui';
import { loadSample } from '@/lib/api';

export default function Welcome() {
  return (
    <Page style={{ gap: 26 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Sticker color={C.turmeric} offset={3} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 }}>
          <T v="h3" style={{ fontFamily: F.bold }}>
            aharya
          </T>
        </Sticker>
        <T v="small" color={C.muted}>
          food that fits your reports
        </T>
      </View>

      <T v="h1" style={{ fontSize: 46, lineHeight: 47 }}>
        your blood report → meals that actually{' '}
        <T v="h1" color={C.chilli} style={{ fontSize: 46, lineHeight: 47 }}>
          slap
        </T>
      </T>

      {/* The whole product in three stickers */}
      <View style={{ height: 372 }}>
        <Sticker color={C.paper} rotate="-6deg" outer={{ position: 'absolute', left: 0, top: 4, width: '60%' }}>
          <T v="label" color={C.muted}>
            🩸 your report
          </T>
          <Row label="LDL" value="148" tag="high" color={C.chilli} />
          <Row label="sugar" value="112" tag="hmm" color={C.turmeric} />
          <Row label="Hb" value="14.2" tag="ok" color={C.pudina} />
        </Sticker>
        <Sticker color={C.butter} rotate="5deg" outer={{ position: 'absolute', right: 0, top: 150, width: '58%' }}>
          <T v="label" color={C.muted}>
            🍛 today
          </T>
          <T v="body" style={{ fontFamily: F.semi, marginTop: 6 }}>
            moong dal chilla + curd
          </T>
          <T v="body" style={{ fontFamily: F.semi }}>
            jowar bhakri + pitla
          </T>
          <T v="small" color={C.muted} style={{ marginTop: 4 }}>
            1,600 kcal · 86 g protein
          </T>
        </Sticker>
        <Sticker color={C.pink} rotate="-3deg" outer={{ position: 'absolute', left: 24, bottom: 0 }} style={{ paddingVertical: 10 }}>
          <T v="h3" style={{ fontFamily: F.bold }}>
            🛒 23 items → your cart
          </T>
        </Sticker>
      </View>

      <T v="body" color={C.muted}>
        upload your lab report. we read it, flag what matters, and plan a week of desi home food with a grocery haul
        you can send to Blinkit, Zepto or your kirana. no quinoa. no kale.
      </T>

      <View style={{ gap: 12 }}>
        <Btn label="let's cook 🔥" onPress={() => router.push('/onboarding')} />
        <Btn
          label="peek a sample plan 👀"
          color={C.paper}
          onPress={() => {
            loadSample();
            router.replace('/home');
          }}
        />
      </View>
      <T v="small" color={C.muted} style={{ textAlign: 'center' }}>
        nutrition guidance, not a diagnosis. your reports stay yours.
      </T>
    </Page>
  );
}

function Row({ label, value, tag, color }: { label: string; value: string; tag: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
      <T v="body" style={{ fontFamily: F.semi }}>
        {label} {value}
      </T>
      <View style={{ backgroundColor: color, borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 8 }}>
        <T v="small" style={{ fontFamily: F.bold }}>
          {tag}
        </T>
      </View>
    </View>
  );
}
