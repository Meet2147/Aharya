import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Banner, Bar, Btn, C, F, Page, Sticker, T, tap } from '@/components/ui';
import { savedData } from '@/lib/api';
import { useBasket } from '@/lib/basket';
import { category, CATEGORY_ORDER, need, pack, searchTerm, SHOPS, shopById } from '@/lib/shops';
import { useStored } from '@/lib/store';

/**
 * "Fill my cart": walks through the haul one item at a time. Each item opens the chosen
 * store's search for it; the user adds it there, comes back and taps "added".
 */
export default function CartRun() {
  const params = useLocalSearchParams<{ week?: string }>();
  const week = Number(params.week ?? 0);
  const items = savedData()?.plan?.weeks[week]?.grocery ?? [];
  const { toBuy, left, markAdded, resetAdded } = useBasket(week, items);
  const [shopId, setShopId] = useStored('shop', 'blinkit');
  const [skipped, setSkipped] = useState<string[]>([]);
  const [opened, setOpened] = useState(false);
  const shop = shopById(shopId);
  // Same order as the haul screen: by aisle
  const rank = (c: string) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length);
  const queue = left.filter((i) => !skipped.includes(i.name)).sort((a, b) => rank(a.category) - rank(b.category));
  const item = queue[0];
  const done = toBuy.length - left.length;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <Page>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T v="h2">fill my cart ⚡</T>
        <Pressable accessibilityRole="button" accessibilityLabel="close" onPress={close} hitSlop={12}>
          <T v="h2">✕</T>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <T v="label" color={C.muted}>
          shopping on
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SHOPS.map((s) => {
            const on = s.id === shop.id;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  tap();
                  setShopId(s.id);
                }}
                style={{
                  borderWidth: 2.5,
                  borderColor: C.ink,
                  borderRadius: 999,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  backgroundColor: on ? s.color : C.paper,
                }}
              >
                <T style={{ fontFamily: F.bold }} color={on ? s.text : C.ink}>
                  {s.name}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Bar value={toBuy.length ? done / toBuy.length : 1} color={C.pudina} />
        <T v="small" color={C.muted}>
          {done} of {toBuy.length} in your cart
        </T>
      </View>

      {item ? (
        <>
          <Sticker color={category(item.category).color} offset={6} style={{ gap: 6, paddingVertical: 24, alignItems: 'center' }}>
            <T v="h1" style={{ fontSize: 56, lineHeight: 64 }}>
              {category(item.category).emoji}
            </T>
            <T v="h2" style={{ textAlign: 'center' }}>
              {item.name}
            </T>
            <T style={{ fontFamily: F.semi, textAlign: 'center' }}>
              {pack(item) ? `need ${need(item)} → grab ${pack(item)}` : `need ${need(item)}`}
            </T>
            <T v="small" color={C.muted}>
              {queue.length - 1} more after this
            </T>
          </Sticker>

          <Btn
            label={`find it on ${shop.name} ↗`}
            color={shop.color}
            textColor={shop.text}
            onPress={() => {
              setOpened(true);
              Linking.openURL(shop.search(searchTerm(item.name)));
            }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Btn
              style={{ flex: 1 }}
              label="added ✓"
              color={opened ? C.pudina : C.paper}
              onPress={() => {
                markAdded(item.name);
                setOpened(false);
              }}
            />
            <Btn
              style={{ flex: 1 }}
              label="skip"
              color={C.paper}
              onPress={() => {
                setSkipped((s) => [...s, item.name]);
                setOpened(false);
              }}
            />
          </View>
          <Banner>
            one tap per item: we open it in {shop.name}, you yeet it into the cart, come back, tap “added”. grocery apps
            don’t let other apps fill carts (yet).
          </Banner>
        </>
      ) : (
        <>
          <Sticker color={C.turmeric} offset={6} style={{ alignItems: 'center', gap: 6, paddingVertical: 28 }}>
            <T v="h1" style={{ fontSize: 56, lineHeight: 64 }}>
              {left.length ? '⏭️' : '🛒✨'}
            </T>
            <T v="h2" style={{ textAlign: 'center' }}>
              {left.length ? `${left.length} skipped` : 'cart’s loaded'}
            </T>
            <T style={{ textAlign: 'center' }}>
              {left.length ? 'go back through the skipped ones, or check out what you have.' : `head to ${shop.name} to check out.`}
            </T>
          </Sticker>
          <Btn label={`open ${shop.name} to check out ↗`} color={shop.color} textColor={shop.text} onPress={() => Linking.openURL(shop.home)} />
          {left.length ? <Btn label="go through skipped ones" color={C.paper} onPress={() => setSkipped([])} /> : null}
          <Btn
            label="start the cart run again"
            color={C.paper}
            onPress={() => {
              resetAdded();
              setSkipped([]);
            }}
          />
          <Btn label="back to my haul" color={C.paper} onPress={close} />
        </>
      )}
    </Page>
  );
}
