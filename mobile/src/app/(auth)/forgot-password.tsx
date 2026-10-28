import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { AuthScreen, Field, isEmail, PrimaryButton } from '@/components/auth';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();

  async function onSubmit() {
    if (!isEmail(email)) return setError('Enter a valid email address');
    setError(undefined);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (err) return Alert.alert('Could not send the code', err.message);
    router.push({ pathname: '/verify', params: { email: email.trim(), reset: '1' } });
  }

  return (
    <AuthScreen title={'Forgot\nPassword?'} subtitle="Enter your email and we'll send you a code.">
      <Field
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={onSubmit}
        error={error}
      />
      <PrimaryButton title="Send" onPress={onSubmit} />
    </AuthScreen>
  );
}
