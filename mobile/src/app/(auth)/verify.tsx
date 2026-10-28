import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthScreen, PrimaryButton, useAuthTheme } from '@/components/auth';
import { completeSignUp } from '@/lib/api';
import { parseProfile, supabase } from '@/lib/supabase';

// Supabase's default email OTP length
const LENGTH = 6;

export default function Verify() {
  const { c, styles: authStyles } = useAuthTheme();
  const { email = '', reset, profile } = useLocalSearchParams<{ email?: string; reset?: string; profile?: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();

  async function onSubmit() {
    if (code.length !== LENGTH) return setError(`Enter the ${LENGTH}-digit code`);
    setError(undefined);
    const { error: err } = await supabase.auth.verifyOtp({ email, token: code, type: reset ? 'recovery' : 'email' });
    if (err) return setError(err.message);
    if (reset) return router.push('/new-password');
    await completeSignUp(parseProfile(profile));
    router.replace('/home');
  }

  async function resend() {
    const { error: err } = reset
      ? await supabase.auth.resetPasswordForEmail(email)
      : await supabase.auth.resend({ type: 'signup', email });
    Alert.alert(err ? 'Could not resend' : 'Code sent', err?.message ?? 'Check your inbox for a new code.');
  }

  return (
    <AuthScreen
      title={'Verify\nYour Email'}
      subtitle={`Enter the ${LENGTH}-digit code sent to ${email || 'your email'}.`}>
      <View>
        {/* One invisible input over the boxes: native paste + SMS autofill for free */}
        <View style={styles.boxes}>
          {Array.from({ length: LENGTH }, (_, i) => (
            <View
              key={i}
              style={[
                styles.box,
                { borderColor: c.border, backgroundColor: c.surface },
                i === code.length && { borderColor: c.link, borderWidth: 2 },
                !!error && { borderColor: c.error },
              ]}>
              <Text style={[styles.digit, { color: c.text }]}>{code[i] ?? ''}</Text>
            </View>
          ))}
          <TextInput
            style={styles.hiddenInput}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, LENGTH))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={LENGTH}
            autoFocus
            accessibilityLabel="Verification code"
            onSubmitEditing={onSubmit}
          />
        </View>
        {!!error && <Text style={authStyles.error}>{error}</Text>}
      </View>
      <Pressable
        onPress={resend}
        accessibilityRole="button"
        style={authStyles.linkHit}>
        <Text style={authStyles.link}>Resend code</Text>
      </Pressable>
      <PrimaryButton title="Verify" onPress={onSubmit} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  box: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 72,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digit: { fontSize: 24, fontWeight: '700' },
  hiddenInput: { ...StyleSheet.absoluteFill, opacity: 0.01, color: 'transparent' },
});
