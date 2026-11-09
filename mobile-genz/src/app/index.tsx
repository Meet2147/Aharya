import { Redirect } from 'expo-router';

import { currentId, savedData } from '@/lib/api';
import { getProfile, read } from '@/lib/store';

/** Opens wherever the user left off. */
export default function Index() {
  if (read('sample', false) && savedData()) return <Redirect href="/home" />;
  if (!getProfile()) return <Redirect href="/welcome" />;
  const id = currentId();
  if (!id) return <Redirect href="/upload" />;
  const data = savedData();
  if (data?.assessment.assessment_id === id && data.assessment.status !== 'failed') return <Redirect href="/home" />;
  return <Redirect href="/reading" />;
}
