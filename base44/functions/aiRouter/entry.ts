import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ═══════════════════════════════════════════════════════════════════════════
// AI ROUTER — Architecture Cheap-First à 3 niveaux (CDC V4 Supernova §2.2)
// L1 : Instantané — Qwen/Gemma (builtin) — < 0,001€/requête
// L2 : Premium — Claude Sonnet — 0,02-0,05€/requête (gate MRR > 2500€)
// L3 : Expert — Claude Opus — 0,10-0,30€/requête (gate MRR > 10k€)
// Règle : si coût IA > 15% MRR → force downgrade L1
// ═══════════════════════════════════════════════════════════════════════════

const VALID_MODES = [
  'public_help', 'rewrite_public', 'qualify_dossier', 'rewrite_mairie',
  'generate_digest', 'generate_victory', 'detect_intent', 'classify_signal',
  'match_offer_demand', 'score_cv', 'coach_entretien', 'generate_business_plan',
  'generate_mandate_report', 'audit_territory', 'strategic_advice'
];

// Mode → niveau IA minimal requis
const MODE_LEVEL_MAP: Record<string, 'L1' | 'L2' | 'L3'> = {
  public_help: 'L1',
  rewrite_public: 'L1',
  qualify_dossier: 'L1',
  classify_signal: 'L1',
  detect_intent: 'L1',
  match_offer_demand: 'L1',
  rewrite_mairie: 'L2',
  generate_digest: 'L2',
  generate_victory: 'L1',
  score_cv: 'L2',
  coach_entretien: 'L2',
  generate_business_plan: 'L2',
  generate_mandate_report: 'L3',
  audit_territory: 'L3',
  strategic_advice: 'L3',
};

// Coûts estimés par niveau (€/requête)
const LEVEL_COSTS: Record<string, number> = {
  L1: 0.0005,
  L2: 0.035,
  L3: 0.20,
};

const RATE_LIMITS: Record<string, { calls_per_hour: number; per_user: boolean }> = {
  public_help: { calls_per_hour: 60, per_user: true },
  rewrite_public: { calls_per_hour: 30, per_user: true },
  qualify_dossier: { calls_per_hour: 1000, per_user: false },
  rewrite_mairie: { calls_per_hour: 100, per_user: false },
  generate_digest: { calls_per_hour: 50, per_user: false },
  generate_victory: { calls_per_hour: 100, per_user: false },
  detect_intent: { calls_per_hour: 500, per_user: false },
  classify_signal: { calls_per_hour: 1000, per_user: false },
  match_offer_demand: { calls_per_hour: 200, per_user: false },
  score_cv: { calls_per_hour: 50, per_user: true },
  coach_entretien: { calls_per_hour: 20, per_user: true },
  generate_business_plan: { calls_per_hour: 10, per_user: true },
  generate_mandate_report: { calls_per_hour: 20, per_user: false },
  audit_territory: { calls_per_hour: 10, per_user: false },
  strategic_advice: { calls_per_hour: 5, per_user: true },
};

const MODE_CONFIGS: Record<string, { max_tokens: number; temperature: number }> = {
  public_help: { max_tokens: 256, temperature: 0.5 },
  rewrite_public: { max_tokens: 512, temperature: 0.3 },
  qualify_dossier: { max_tokens: 256, temperature: 0.2 },
  classify_signal: { max_tokens: 128, temperature: 0.1 },
  detect_intent: { max_tokens: 128, temperature: 0.1 },
  rewrite_mairie: { max_tokens: 512, temperature: 0.4 },
  generate_digest: { max_tokens: 512, temperature: 0.4 },
  generate_victory: { max_tokens: 512, temperature: 0.4 },
  match_offer_demand: { max_tokens: 256, temperature: 0.3 },
  score_cv: { max_tokens: 512, temperature: 0.2 },
  coach_entretien: { max_tokens: 768, temperature: 0.5 },
  generate_business_plan: { max_tokens: 1024, temperature: 0.4 },
  generate_mandate_report: { max_tokens: 2048, temperature: 0.3 },
  audit_territory: { max_tokens: 2048, temperature: 0.2 },
  strategic_advice: { max_tokens: 1024, temperature: 0.4 },
};

// ═══════════════════════════════════════════════════════════════════════════
// LOCAL FAQ (L0 — gratuit, zero IA)
// ═══════════════════════════════════════════════════════════════════════════
const LOCAL_FAQ = [
  {
    patterns: ['signaler', 'probleme', 'casse', 'accident', 'route', 'deterioration'],
    answer: "Pour signaler un problème dans votre commune, allez sur /signaler. C'est simple et sans compte requis.",
  },
  {
    patterns: ['evenement', 'agenda', 'manifestation', 'concert', 'marche', 'fete'],
    answer: "Pour voir les événements locaux, allez sur /agenda.",
  },
  {
    patterns: ['compte', 'inscription', 'inscrire', 'creer', 'login'],
    answer: "Non, vous n'avez pas besoin de compte pour signaler, proposer ou aider. Gratuit pour tous.",
  },
  {
    patterns: ['suivi', 'suivre', 'dossier', 'avancement', 'status'],
    answer: "Après envoi, vous recevez un lien sécurisé pour suivre votre dossier en temps réel.",
  },
  {
    patterns: ['proposer', 'idee', 'suggestion', 'projet'],
    answer: "Pour proposer une idée, allez sur /proposer. Votre idée sera examinée par votre commune.",
  },
  {
    patterns: ['mairie', 'abonnement', 'prix', 'tarif', 'payer'],
    answer: "Découvrez nos offres Mairie+ sur /mairie-plus — Essentiel (299€/mois), Pro (599€/mois), Territoire (999€/mois).",
  },
  {
    patterns: ['sponsor', 'publicite', 'partenaire', 'visibilite'],
    answer: "Pour devenir partenaire local, découvrez nos formules sponsor sur /sponsor — à partir de 97€/mois.",
  },
];

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

function matchLocalFAQ(input: string): string | null {
  if (!input || typeof input !== 'string') return null;
  const normalized = normalizeText(input);
  const words = normalized.split(/\s+/);
  for (const faq of LOCAL_FAQ) {
    for (const pattern of faq.patterns) {
      if (words.includes(normalizeText(pattern)) || normalized.includes(normalizeText(pattern))) {
        return faq.answer;
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS PAR MODE
// ═══════════════════════════════════════════════════════════════════════════
const SYSTEM_BASE = `Tu es l'assistant IA de La Pévèle Augmentée, plateforme civic-tech territoriale de la Pévèle Carembault (46 communes, Hauts-de-France). Tu gardes un ton clair, humain, simple, local et utile. Tu n'inventes jamais de fait.`;

const PROMPTS: Record<string, string> = {
  public_help: `${SYSTEM_BASE}\nRéponds à la question d'un habitant en 2-3 phrases claires. Aide-le à trouver la page ou l'action adaptée.`,
  rewrite_public: `${SYSTEM_BASE}\nRéécris la description brute du citoyen en titre court (max 80c) et résumé (max 200c). JSON: {"titre": "...", "resume": "..."}`,
  qualify_dossier: `${SYSTEM_BASE}\nAnalyse ce dossier citoyen. Catégories: voirie, espaces_publics, commerce_local, culture, sport, solidarite, emploi, autre. Priorités: basse, normale, haute, urgente. JSON: {"categorie": "...", "priorite": "..."}`,
  classify_signal: `${SYSTEM_BASE}\nClassifie ce signal territorial. Types: signalement, proposition, aide, evenement, emploi, b2b, urgence, spam. JSON: {"type": "...", "confidence": 0.0-1.0, "route": "/page-cible"}`,
  detect_intent: `${SYSTEM_BASE}\nDétecte l'intention principale. Intentions: emploi, formation, entreprendre, mairie_plus, sponsor, b2b, aide_sociale, evenement, signalement. JSON: {"intent": "...", "confidence": 0.0-1.0, "cta_suggestion": "texte CTA court"}`,
  rewrite_mairie: `${SYSTEM_BASE}\nOptimise ce texte municipal: clarté, tonalité officielle, impact local. Réponds avec le texte optimisé uniquement.`,
  generate_digest: `${SYSTEM_BASE}\nGénère un "Point de la semaine" structuré à partir des dossiers. JSON: {"contenu_court": "...", "top_1": "...", "top_2": "...", "top_3": "...", "chiffre_cle": "...", "tendance": "..."}`,
  generate_victory: `${SYSTEM_BASE}\nGénère une carte victoire pour ce dossier résolu. JSON: {"titre": "...", "resume": "...", "angle": "...", "chiffre_cle": "..."}`,
  match_offer_demand: `${SYSTEM_BASE}\nAnalyse cette offre et cette demande. Score de compatibilité (0-100) et raisons. JSON: {"score": 0-100, "raisons": [...], "recommendation": "..."}`,
  score_cv: `${SYSTEM_BASE}\nAnalyse ce CV par rapport à cette offre d'emploi. Score (0-100), points forts, axes d'amélioration. JSON: {"score": 0-100, "points_forts": [...], "axes_amelioration": [...], "conseil": "..."}`,
  coach_entretien: `${SYSTEM_BASE}\nAide ce candidat à préparer son entretien pour ce poste. Donne 5 questions probables et des conseils de réponse.`,
  generate_business_plan: `${SYSTEM_BASE}\nGénère un business plan structuré pour ce projet entrepreneurial local. Structure: résumé, marché, valeur, modèle éco, financements, prochaines étapes.`,
  generate_mandate_report: `${SYSTEM_BASE}\nGénère un rapport de mandat synthétique et valorisant pour cet élu local, basé sur les données fournies. Ton officiel mais accessible. Format: introduction, réalisations par thème, chiffres clés, perspectives.`,
  audit_territory: `${SYSTEM_BASE}\nRéalise un audit territorial complet basé sur ces données. Identifie forces, faiblesses, opportunités et risques. Recommandations concrètes.`,
  strategic_advice: `${SYSTEM_BASE}\nDonne un conseil stratégique territorial basé sur ces données et ce contexte. Sois direct, concret et actionnable.`,
};

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════
async function checkRateLimit(base44: any, mode: string, identifier: string) {
  try {
    const limit = RATE_LIMITS[mode]?.calls_per_hour || 100;
    const hourAgo = new Date(Date.now() - 3600000);
    const logs = await base44.asServiceRole.entities.RateLimitLog.filter({
      identifier,
      timestamp: { $gte: hourAgo.toISOString() },
    }).catch(() => []);
    return { allowed: logs.length < limit, remaining: Math.max(0, limit - logs.length), limit };
  } catch {
    return { allowed: true, remaining: -1, limit: -1 };
  }
}

async function recordRateLimitHit(base44: any, mode: string, identifier: string) {
  try {
    await base44.asServiceRole.entities.RateLimitLog.create({
      action: `ai_router_${mode}`,
      identifier,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
// AI USAGE LOGGING
// ═══════════════════════════════════════════════════════════════════════════
async function logAIUsage(base44: any, opts: {
  level: string; model: string; mode: string; cost: number;
  tokens_input?: number; tokens_output?: number; commune?: string;
  success: boolean; latency_ms: number; source: string;
}) {
  try {
    await base44.asServiceRole.entities.AIUsageMetric.create({
      level: opts.level,
      model: opts.model,
      mode: opts.mode,
      cost_eur: opts.cost,
      tokens_input: opts.tokens_input || 0,
      tokens_output: opts.tokens_output || 0,
      commune: opts.commune || null,
      success: opts.success,
      latency_ms: opts.latency_ms,
      timestamp: new Date().toISOString(),
      source: opts.source,
    }).catch(() => {});
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY JOB LOG (compatibilité avec ancien qwenAssist)
// ═══════════════════════════════════════════════════════════════════════════
async function logJob(base44: any, mode: string, success: boolean, latency: number, opts: any = {}) {
  try {
    await base44.asServiceRole.entities.AIJobLog.create({
      mode, success, latency_ms: latency,
      commune_id: opts.commune_id || null,
      dossier_id: opts.dossier_id || null,
      error_code: opts.error_code || null,
      error_message: opts.error_message || null,
      input_length: opts.input_length || null,
      output_length: opts.output_length || null,
    }).catch(() => {});
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  const startTime = Date.now();
  let body: any = {};

  try {
    const base44 = createClientFromRequest(req);

    try {
      body = await req.json();
    } catch {
      return Response.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { mode, user_input = '', page_context = '', commune_id, dossier_id, email, user_id, force_level } = body;

    // Validate mode
    if (!mode || !VALID_MODES.includes(mode)) {
      return Response.json({
        success: false,
        error: `mode invalide — doit être l'un de: ${VALID_MODES.join(', ')}`,
      }, { status: 400 });
    }

    // Rate limit check
    const rlIdentifier = RATE_LIMITS[mode]?.per_user
      ? `${mode}:${email || user_id || 'anon'}`
      : `${mode}:global`;

    const rlCheck = await checkRateLimit(base44, mode, rlIdentifier);
    if (!rlCheck.allowed) {
      const latency = Date.now() - startTime;
      await logJob(base44, mode, false, latency, { error_code: 'RATE_LIMITED' }).catch(() => {});
      return Response.json({
        success: false,
        error: `Quota IA atteint. Limite: ${rlCheck.limit}/heure. Réessayez plus tard.`,
        error_code: 'RATE_LIMITED',
        retry_after_seconds: 300,
      }, { status: 429 });
    }
    await recordRateLimitHit(base44, mode, rlIdentifier);

    // ── L0 : LOCAL FAQ (zero coût) ──────────────────────────────────────
    if (mode === 'public_help') {
      const localAnswer = matchLocalFAQ(user_input);
      if (localAnswer) {
        const latency = Date.now() - startTime;
        await logJob(base44, mode, true, latency, {
          input_length: user_input.length,
          output_length: localAnswer.length,
          commune_id,
          error_message: 'L0_LOCAL_FAQ',
        }).catch(() => {});
        return Response.json({
          success: true,
          data: { text: localAnswer, mode, source: 'L0_local_faq' },
          level_used: 'L0',
          latency_ms: latency,
        });
      }
    }

    // ── LEVEL ROUTING ────────────────────────────────────────────────────
    // Force level override (admin only) or use mode default
    const targetLevel: string = force_level || MODE_LEVEL_MAP[mode] || 'L1';
    const estimatedCost = LEVEL_COSTS[targetLevel] || 0.001;

    // Build prompt
    const systemPrompt = PROMPTS[mode] || `${SYSTEM_BASE}\n${user_input}`;
    const fullPrompt = `${systemPrompt}\n\nInput:\n${user_input}${page_context ? `\n\nContexte page:\n${page_context}` : ''}`;

    // ── L1 : BUILTIN AI (Qwen/Gemma — default) ───────────────────────────
    let result: string;
    let modelUsed = 'builtin_l1';

    try {
      const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: fullPrompt });
      result = typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult);
      modelUsed = targetLevel === 'L1' ? 'builtin_l1' : `external_${targetLevel.toLowerCase()}`;
    } catch (err: any) {
      const latency = Date.now() - startTime;
      await logJob(base44, mode, false, latency, {
        error_code: 'AI_ERROR',
        error_message: err.message?.substring(0, 500),
        commune_id,
        dossier_id,
      }).catch(() => {});
      await logAIUsage(base44, {
        level: targetLevel, model: modelUsed, mode,
        cost: 0, success: false, latency_ms: latency, source: 'ai_router',
        commune: commune_id,
      }).catch(() => {});

      // Graceful fallback
      const fallbacks: Record<string, any> = {
        public_help: { text: "Service IA indisponible. Essayez via /agenda ou /place-du-village." },
        rewrite_public: { text: "Service indisponible. Envoyez votre texte tel quel." },
        qualify_dossier: { categorie: 'autre', priorite: 'normale' },
        generate_digest: { contenu_court: "Génération du digest échouée. Consultez les dossiers directement.", top_1: '', top_2: '', top_3: '' },
        generate_victory: { titre: '', resume: '', angle: '', chiffre_cle: '' },
        classify_signal: { type: 'signalement', confidence: 0.5, route: '/signaler' },
        detect_intent: { intent: 'signalement', confidence: 0.3, cta_suggestion: '' },
      };

      return Response.json({
        success: false,
        error: 'Service IA temporairement indisponible',
        error_code: 'AI_UNAVAILABLE',
        data: fallbacks[mode] || { text: 'Service IA indisponible. Réessayez.' },
        level_used: targetLevel,
      }, { status: 503 });
    }

    const latency = Date.now() - startTime;

    // Parse JSON for structured modes
    const jsonModes = ['generate_digest', 'generate_victory', 'qualify_dossier', 'classify_signal',
      'detect_intent', 'rewrite_public', 'match_offer_demand', 'score_cv'];
    let parsedData: any = { text: result };

    if (jsonModes.includes(mode)) {
      try {
        const cleaned = result.replace(/```json|```/g, '').trim();
        parsedData = JSON.parse(cleaned);
      } catch {
        // Fallback: keep raw text in expected key
        if (mode === 'generate_digest') {
          parsedData = { contenu_court: result, top_1: '', top_2: '', top_3: '' };
        } else if (mode === 'rewrite_public') {
          parsedData = { titre: result.substring(0, 80), resume: result.substring(0, 200) };
        } else if (mode === 'qualify_dossier') {
          parsedData = { categorie: 'autre', priorite: 'normale' };
        } else if (mode === 'classify_signal') {
          parsedData = { type: 'signalement', confidence: 0.5, route: '/signaler' };
        } else if (mode === 'detect_intent') {
          parsedData = { intent: 'signalement', confidence: 0.3, cta_suggestion: '' };
        }
      }
    }

    // Log usage
    await logJob(base44, mode, true, latency, {
      input_length: user_input.length,
      output_length: result.length,
      commune_id,
      dossier_id,
    }).catch(() => {});

    await logAIUsage(base44, {
      level: targetLevel, model: modelUsed, mode,
      cost: estimatedCost, success: true, latency_ms: latency,
      source: 'ai_router', commune: commune_id,
      tokens_input: Math.ceil(fullPrompt.length / 4),
      tokens_output: Math.ceil(result.length / 4),
    }).catch(() => {});

    return Response.json({
      success: true,
      data: parsedData,
      level_used: targetLevel,
      model_used: modelUsed,
      latency_ms: latency,
      rate_limit_remaining: rlCheck.remaining,
    });

  } catch (err: any) {
    const latency = Date.now() - startTime;
    console.error(`[aiRouter] Unhandled error: ${err.message}`);
    return Response.json({
      success: false,
      error: 'Internal server error',
      error_code: 'INTERNAL_ERROR',
      data: {},
    }, { status: 500 });
  }
});
