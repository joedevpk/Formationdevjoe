// Edge Function « ai-assistant » — la clé d'API reste ICI (secrets Supabase), jamais dans le frontend.
// Secrets requis pour activer : AI_API_KEY et AI_MODEL (ex. via `supabase secrets set AI_API_KEY=… AI_MODEL=…`).
// Sans secrets, la fonction répond { configured: false } et l'app affiche « Assistant IA non configuré. ».
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SYSTEM: Record<string, string> = {
  tutor: "Tu es un assistant pédagogique pour apprenants en développement web. Explique simplement, en français, et encourage l'apprenant à comprendre plutôt qu'à copier.",
  'explain-code': 'Explique ce code ligne par ligne, en français, pour un débutant.',
  quiz: 'Génère un quiz de 5 questions à choix multiples sur le sujet, avec les réponses à la fin.',
  debug: "Aide à déboguer : identifie la cause probable et propose une correction expliquée.",
  plan: 'Génère un plan de projet réaliste par étapes.',
  pitch: 'Aide à structurer un pitch : problème, solution, marché, modèle économique, impact.',
  roadmap: "Génère une roadmap d'apprentissage personnalisée.",
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée' }, 405);

  const apiKey = Deno.env.get('AI_API_KEY');
  const model = Deno.env.get('AI_MODEL');
  if (!apiKey || !model) return json({ configured: false });

  // Exige un utilisateur connecté
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'Non autorisé' }, 401);
  const userRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, { headers: { Authorization: auth, apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' } });
  if (!userRes.ok) return json({ error: 'Non autorisé' }, 401);

  let body: { mode?: string; prompt?: string };
  try { body = await req.json(); } catch { return json({ error: 'Requête invalide' }, 400); }
  const prompt = String(body.prompt ?? '').slice(0, 4000);
  if (!prompt.trim()) return json({ error: 'Question vide' }, 400);
  const system = SYSTEM[String(body.mode)] ?? SYSTEM.tutor;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 800, system, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!r.ok) return json({ error: "L'assistant est momentanément indisponible." }, 502);
  const data = await r.json() as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
  return json({ configured: true, text });
});
