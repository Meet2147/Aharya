import { router } from 'expo-router';
import { Linking, Pressable, Share, View } from 'react-native';

import { SampleBanner } from '@/components/sample-banner';
import { Bar, Btn, C, F, Page, Sticker, T, tap } from '@/components/ui';
import { WeekPicker } from '@/components/week-picker';
import type { Data } from '@/lib/api';
import { useBasket } from '@/lib/basket';
import { category, CATEGORY_ORDER, kiranaMessage, need, pack, shopById, whatsappUrl } from '@/lib/shops';
import { getProfile, read } from '@/lib/store';

export function Haul({ data, week, setWeek }: { data: Data; week: number; setWeek: (w: number) => void }) {
  const items = data.plan!.weeks[week].grocery;
  const { basket, toBuy, left, toggleHave } = useBasket(week, items);
  const groups = [...new Set([...CATEGORY_ORDER, ...items.map((i) => i.category)])]
    .map((key) => ({ key, items: items.filter((i) => i.category === key) }))
    .filter((g) => g.items.length);
  const shop = shopById(read('shop', 'blinkit'));
  const name = data.sample ? undefined : getProfile()?.name;
  const message = () => kiranaMessage(week + 1, toBuy, name);

  return (
    <Page bottom={110}>
      {data.sample ? <SampleBanner /> : null}
      <T v="h1">week {week + 1} haul 🛒</T>
      <WeekPicker weeks={data.plan!.weeks.length} week={week} setWeek={setWeek} />

      <Sticker color={C.turmeric} style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <T v="h1" style={{ fontSize: 44 }}>
              {toBuy.length}
            </T>
            <T v="small" style={{ fontFamily: F.semi }}>
              items to buy · {basket.have.length} already at home
            </T>
          </View>
          <T v="small" style={{ fontFamily: F.semi, textAlign: 'right' }}>
            {toBuy.length - left.length} in cart{'\n'}
            {left.length} to go
          </T>
        </View>
        <Bar value={toBuy.length ? (toBuy.length - left.length) / toBuy.length : 1} color={C.chilli} />
        <Btn
          label={left.length ? `fill my ${shop.name} cart ⚡` : 'cart’s loaded ✨ review'}
          color={C.paper}
          onPress={() => router.push({ pathname: '/cart-run', params: { week: String(week) } })}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn
            small
            style={{ flex: 1 }}
            label="💬 send to kirana"
            color="#BFF0D4"
            onPress={() => Linking.openURL(whatsappUrl(message(), read('kirana', '')))}
          />
          <Btn small style={{ flex: 1 }} label="📤 share list" color={C.paper} onPress={() => Share.share({ message: message() })} />
        </View>
      </Sticker>

      <T v="small" color={C.muted}>
        tap anything you already have at home and it drops off the list.
      </T>

      {groups.map((g) => {
        const cat = category(g.key);
        return (
          <Sticker key={g.key} color={cat.color} style={{ gap: 4 }}>
            <T v="h3" style={{ fontFamily: F.bold, marginBottom: 4 }}>
              {cat.emoji} {cat.label}
            </T>
            {g.items.map((item) => {
              const have = basket.have.includes(item.name);
              const added = basket.added.includes(item.name);
              return (
                <Pressable
                  key={item.name}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: have }}
                  accessibilityLabel={`already have ${item.name}`}
                  onPress={() => {
                    tap();
                    toggleHave(item.name);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      borderWidth: 2.5,
                      borderColor: C.ink,
                      backgroundColor: have ? C.ink : C.paper,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {have ? (
                      <T v="small" color={C.paper} style={{ fontFamily: F.bold }}>
                        ✓
                      </T>
                    ) : null}
                  </View>
                  <View style={{ flex: 1, opacity: have ? 0.45 : 1 }}>
                    <T style={{ fontFamily: F.semi, textDecorationLine: have ? 'line-through' : 'none' }}>{item.name}</T>
                    <T v="small" color={C.muted}>
                      {have ? 'got it at home' : pack(item) ? `need ${need(item)} · grab ${pack(item)}` : `need ${need(item)}`}
                    </T>
                  </View>
                  {added && !have ? (
                    <View style={{ borderWidth: 2, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 8, backgroundColor: C.paper }}>
                      <T v="small" style={{ fontFamily: F.bold }}>
                        in cart
                      </T>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </Sticker>
        );
      })}
    </Page>
  );
}
