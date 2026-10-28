import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text } from 'react-native';

import {
  AuthScreen,
  Field,
  FooterLink,
  isEmail,
  PrimaryButton,
  SocialButtons,
  useAuthTheme,
} from '@/components/auth';
import { hasProfile, supabase } from '@/lib/supabase';

export default function SignIn() {
  const { styles } = useAuthTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  async function onSubmit() {
    const next = {
      email: isEmail(email) ? undefined : 'Enter a valid email address',
      password: password.length >= 6 ? undefined : 'Password must be at least 6 characters',
    };
    setErrors(next);
    if (next.email || next.password) return;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return Alert.alert('Could not sign in', error.message);
    router.replace((await hasProfile()) ? '/home' : '/onboarding');
  }

  return (
    <AuthScreen title={'Hey,\nWelcome Back'} subtitle="Sign in to see your report insights.">
      <Field
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
      />
      <Field
        label="Password"
        secure
        placeholder="Your password"
        autoComplete="password"
        textContentType="password"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={onSubmit}
        error={errors.password}
      />
      <Pressable
        onPress={() => router.push('/forgot-password')}
        accessibilityRole="link"
        style={styles.linkHit}>
        <Text style={styles.link}>Forgot password?</Text>
      </Pressable>
      <PrimaryButton title="Sign in" onPress={onSubmit} />
      <SocialButtons />
      <FooterLink
        text="Don't have an account?"
        action="Sign up"
        onPress={() => router.push('/onboarding')}
      />
    </AuthScreen>
  );
}
