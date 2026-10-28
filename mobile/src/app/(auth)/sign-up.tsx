import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import {
  AuthScreen,
  Field,
  FooterLink,
  isEmail,
  PrimaryButton,
  SocialButtons,
} from '@/components/auth';
import { completeSignUp } from '@/lib/api';
import { parseProfile, supabase } from '@/lib/supabase';

export default function SignUp() {
  // Onboarding answers (name, age, sex, ...) collected before this screen
  const { profile } = useLocalSearchParams<{ profile?: string }>();
  const answers = parseProfile(profile);
  const name = typeof answers?.name === 'string' ? answers.name.trim().split(' ')[0] : undefined;
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
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) return Alert.alert('Could not create your account', error.message);
    // Email confirmation off: signed in already. On: the profile rides along to verify.
    if (data.session) {
      await completeSignUp(answers);
      return router.replace('/home');
    }
    router.push({ pathname: '/verify', params: { email: email.trim(), profile } });
  }

  return (
    <AuthScreen
      title={name ? `Almost done,\n${name}` : 'Create your\naccount'}
      subtitle="Save your profile to get your report insights.">
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
        placeholder="At least 6 characters"
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={onSubmit}
        error={errors.password}
      />
      <PrimaryButton title="Create account" onPress={onSubmit} />
      <SocialButtons profile={answers} />
      <FooterLink
        text="Already have an account?"
        action="Login"
        onPress={() => router.push('/sign-in')}
      />
    </AuthScreen>
  );
}
