import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="home" />
        {/* TEMP: auth + onboarding skipped so the app opens straight on home. To bring them back,
            delete this Protected block and uncomment the original screens below. */}
        <Stack.Protected guard={false}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        {/* Listed first: the first declared screen is the one the app opens on */}
        {/* <Stack.Screen name="(auth)" /> */}
        {/* From the intro: opens see-through over it with no animation, then plays the light
            sweep and reveals itself (see onboarding.tsx). Otherwise a normal push. */}
        {/* <Stack.Screen
          name="onboarding"
          options={({ route }) =>
            (route.params as { intro?: string } | undefined)?.intro
              ? { presentation: 'transparentModal', animation: 'none' }
              : {}
          }
        /> */}
      </Stack>
    </ThemeProvider>
  );
}
