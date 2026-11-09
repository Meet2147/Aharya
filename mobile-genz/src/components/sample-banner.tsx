import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Banner, F, T } from '@/components/ui';
import { write } from '@/lib/store';

/** Shown on every tab while the user is looking at the bundled sample. */
export function SampleBanner() {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        write('sample', false);
        write('data', null);
        router.replace('/');
      }}
    >
      <Banner>
        👀 this is a sample plan for a made-up person.{' '}
        <T v="small" style={{ fontFamily: F.bold, textDecorationLine: 'underline' }}>
          get yours →
        </T>
      </Banner>
    </Pressable>
  );
}
