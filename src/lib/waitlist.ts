import { supabase, isSupabaseConfigured } from '@/services/supabase';

export type WaitlistResult = 'ok' | 'invalid' | 'unavailable';

/**
 * « Me prévenir » : stocke l'email dans course_waitlist.
 * Un doublon (index unique course_id + lower(email)) est traité comme un succès :
 * on ne révèle jamais si une adresse était déjà inscrite.
 */
export async function joinWaitlist(courseId: string, email: string): Promise<WaitlistResult> {
  const clean = email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean) || clean.length > 320) return 'invalid';
  if (!isSupabaseConfigured || courseId.startsWith('demo-')) return 'unavailable';
  try {
    const { error } = await supabase.from('course_waitlist').insert({ course_id: courseId, email: clean });
    if (!error || error.code === '23505') return 'ok';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}
