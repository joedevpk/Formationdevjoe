import { supabase, isSupabaseConfigured } from '@/services/supabase';

export const AI_NOT_CONFIGURED = 'Assistant IA non configuré.';
export type AiMode = 'explain-code' | 'quiz' | 'debug' | 'plan' | 'pitch' | 'roadmap' | 'tutor';

/** La clé d'IA n'existe JAMAIS dans le frontend : l'appel passe par l'Edge Function `ai-assistant`. */
export async function askAssistant(mode: AiMode, prompt: string): Promise<{ text: string | null; error: string | null }> {
  if (!isSupabaseConfigured) return { text: null, error: AI_NOT_CONFIGURED };
  const { data, error } = await supabase.functions.invoke('ai-assistant', { body: { mode, prompt } });
  if (error || !data) return { text: null, error: AI_NOT_CONFIGURED };
  const d = data as { configured?: boolean; text?: string; error?: string };
  if (d.configured === false) return { text: null, error: AI_NOT_CONFIGURED };
  if (d.error) return { text: null, error: d.error };
  return { text: d.text ?? '', error: null };
}
