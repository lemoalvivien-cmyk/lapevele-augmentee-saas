import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ═════════════════════════════════════════════════════════════════════════════
// CONFIGURATION & CONSTANTS
// ═════════════════════════════════════════════════════════════════════════════

const VALID_MODES = ['public_help', 'rewrite_public', 'qualify_dossier', 'rewrite_mairie', 'generate_digest', 'generate_victory'];
const MAX_USER_INPUT = 3000;
const MAX_PAGE_CONTEXT = 1500;
const TIMEOUT_MS = 5000; // Réduit pour coûts
const QWEN_MODEL = 'qwen3.5-flash';

// ═════════════════════════════════════════════════════════════════════════════
// RATE LIMITING & CIRCUIT BREAKER
// ═════════════════════════════════════════════════════════════════════════════

const RATE_LIMITS = {
  public_help: { calls_per_hour: 60, per_user: true }, // Par utilisateur/session
  rewrite_public: { calls_per_hour: 30, per_user: true },
  qualify_dossier: { calls_per_hour: 1000, per_user: false }, // Admin seulement
  rewrite_mairie: { calls_per_hour: 100, per_user: false },
  generate_digest: { calls_per_hour: 50, per_user: false },
  generate_victory: { calls_per_hour: 100, per_user: false },
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // Erreurs successives avant suspend
const CIRCUIT_BREAKER_RESET_MS = 60000; // 1 min
const MODE_CONFIGS = {
  public_help: { max_tokens: 256, temperature: 0.5 },
  rewrite_public: { max_tokens: 512, temperature: 0.3 },
  qualify_dossier: { max_tokens: 256, temperature: 0.2 },
  rewrite_mairie: { max_tokens: 512, temperature: 0.4 },
  generate_digest: { max_tokens: 384, temperature: 0.4 },
  generate_victory: { max_tokens: 512, temperature: 0.4 },
};

let circuitBreakerState = { mode: null, failCount: 0, suspendUntil: 0 };

function getIdentifier(body) {
  const mode = body?.mode || 'unknown';
  const limit = RATE_LIMITS[mode];
  
  if (limit?.per_user) {
    // User-based: email ou session token
    const email = body?.email || body?.user_id;
    return `${mode}:${email || 'anon'}` || 'fallback';
  }
  // Global for admin modes
  return `${mode}:global`;
}

async function checkRateLimit(base44, identifier) {
  try {
    const now = new Date();
    const hourAgo = new Date(now - 3600000);
    
    const logs = await base44.asServiceRole.entities.RateLimitLog.filter({
      identifier,
      timestamp: { $gte: hourAgo.toISOString() },
    }).catch(() => []);

    const [mode] = identifier.split(':');
    const limit = RATE_LIMITS[mode]?.calls_per_hour || 100;
    const remaining = Math.max(0, limit - logs.length);
    
    return { allowed: logs.length < limit, remaining, limit };
  } catch {
    // Fallback: allow if DB fails
    return { allowed: true, remaining: -1, limit: -1 };
  }
}

async function recordRateLimitHit(base44, identifier) {
  try {
    await base44.asServiceRole.entities.RateLimitLog.create({
      action: 'qwen_assist',
      identifier,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  } catch {}
}

function checkCircuitBreaker() {
  const now = Date.now();
  if (circuitBreakerState.suspendUntil > now) {
    return {
      broken: true,
      message: `Circuit breaker actif — IA suspendue (reprend dans ${Math.ceil((circuitBreakerState.suspendUntil - now) / 1000)}s)`,
    };
  }
  // Reset if time passed
  circuitBreakerState = { mode: null, failCount: 0, suspendUntil: 0 };
  return { broken: false };
}

function recordCircuitBreakerFailure() {
  circuitBreakerState.failCount++;
  if (circuitBreakerState.failCount >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerState.suspendUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
    console.warn(`[CircuitBreaker] TRIPPED: IA suspendue 1 min après ${CIRCUIT_BREAKER_THRESHOLD} erreurs`);
  }
}

function recordCircuitBreakerSuccess() {
  circuitBreakerState.failCount = 0; // Reset on success
}

const SYSTEM_PROMPT = `Tu es l'assistant IA de La Pévèle Augmentée. 
Tu aides à comprendre, clarifier, reformuler et structurer. 
Tu n'inventes jamais de fonctionnalité absente. 
Tu n'inventes jamais de fait. 
Tu gardes un ton clair, humain, simple, local et utile. 
Tu privilégies l'action concrète au blabla. 
Tu ne demandes jamais de donnée personnelle sensible.`;

// ═════════════════════════════════════════════════════════════════════════════
// LOCAL FAQ — Cheap-first pour public_help
// ═════════════════════════════════════════════════════════════════════════════

const LOCAL_FAQ_INTENTS = [
  {
    patterns: ['signaler', 'probleme', 'pb', 'casse', 'accident', 'route', 'deterioration', 'report'],
    answer: 'Pour signaler un probleme dans votre commune, allez sur /signaler. C\'est simple et sans compte requis.',
  },
  {
    patterns: ['evenement', 'agenda', 'manifestation', 'concert', 'marche', 'fete', 'conference', 'atelier', 'sport', 'loisir', 'sortie'],
    answer: 'Pour voir les evenements locaux de votre commune, allez sur /agenda. Vous verrez tout ce qui se passe pres de chez vous.',
  },
  {
    patterns: ['compte', 'inscription', 'inscrire', 'creer', 'login', 'auth'],
    answer: 'Non, vous n\'avez pas besoin de compte pour signaler, proposer une idee ou aider. La plateforme est gratuite et accessible a tous.',
  },
  {
    patterns: ['suivi', 'suivre', 'demande', 'signalement', 'dossier', 'avancement', 'status', 'progression'],
    answer: 'Apres envoi de votre demande, vous recevez un lien securise pour suivre votre dossier en temps reel. Zero tracas.',
  },
  {
    patterns: ['proposer', 'idee', 'suggestion', 'initiative', 'projet', 'amelioration', 'creer', 'lancer'],
    answer: 'Pour proposer une idee ou un projet, allez sur /proposer. Votre idee sera examinee par votre commune.',
  },
  {
    patterns: ['aider', 'aide', 'volontaire', 'coup', 'benevole', 'donner', 'contribution', 'participer'],
    answer: 'Pour proposer votre aide aux initiatives locales, allez sur /aider. Cherchez des habitants ou associations qui ont besoin de vous.',
  },
  {
    patterns: ['place', 'village', 'fil', 'feed', 'actualite', 'vie', 'locale', 'communaute', 'publication'],
    answer: 'Pour voir la vie locale en direct, allez sur /place-du-village. C\'est le fil de votre commune avec victoires, actualites et demandes d\'aide.',
  },
  {
    patterns: ['contacter', 'mairie', 'contact', 'adresse', 'telephone', 'joindre', 'email'],
    answer: 'Vous pouvez contacter votre mairie via les informations affichees sur /place-du-village ou directement sur le site de votre commune.'
  },
];

// ═════════════════════════════════════════════════════════════════════════════
// MATCHING LOGIC
// ═════════════════════════════════════════════════════════════════════════════

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Keep only alphanumeric + spaces
    .trim();
}

function matchLocalIntent(userInput) {
  if (!userInput || typeof userInput !== 'string') return null;

  const normalized = normalizeText(userInput);
  const words = normalized.split(/\s+/);

  for (const intent of LOCAL_FAQ_INTENTS) {
    for (const pattern of intent.patterns) {
      const normalizedPattern = normalizeText(pattern);
      // Exact word match or substring match
      if (words.includes(normalizedPattern) || normalized.includes(normalizedPattern)) {
        return intent.answer;
      }
    }
  }

  return null;
}


const PROMPTS_BY_MODE = {
  public_help: `Tu réponds à une question d'un habitant sur La Pévèle Augmentée. 
Réponds en 2-3 phrases claires et directes.
Aide-le à trouver la page ou l'action qui correspond à son besoin.
Reste bienveillant et local.`,

  rewrite_public: `Tu reçois une description brute d'un citoyen (signalement, idée ou offre d'aide).
Réécris-la en titre court (max 80 caractères) et résumé (max 200 caractères).
Garde l'essence du message.
Rends-le clair et professionnel sans perdre la voix du citoyen.
Réponds au format JSON: {"titre": "...", "resume": "..."}`,

  qualify_dossier: `Tu analyses un dossier citoyen pour suggérer une catégorie et priorité.
Input: type d'action, titre, description.
Catégories possibles: voirie, espaces publics, commerce local, culture, sport, solidarité, emploi, autre.
Priorités: basse, normale, haute, urgente.
Réponds au format JSON: {"categorie": "...", "priorite": "..."}
Sois conservateur: si doute, préfère "normale" et "autre".`,

  rewrite_mairie: `Tu es rédacteur municipal. 
Tu reçois un brouillon texte d'une mairie (publication, message, communication).
Optimise-le: clarté, tonalité municipale, impact local.
Garde le message d'origine.
Réponds directement avec le texte optimisé.`,

  generate_digest: `Tu es journaliste local.
Tu reçois une liste de dossiers récents de citoyens.
Génère un "Point du jour" structuré:
- contenu_court: Résumé en 2 phrases du point du jour
- top_1: Point le plus important du jour (1 phrase)
- top_2: Deuxième point notable (1 phrase)
- top_3: Troisième point ou tendance (1 phrase)
Tone chaleureux et factuel.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans explication :
{
  "contenu_court": "...",
  "top_1": "...",
  "top_2": "...",
  "top_3": "..."
}`,

  generate_victory: `Tu es expert en communication de territoire.
Tu reçois un dossier citoyen résolu.
Génère une "carte victoire" pour la place du village:
- Titre accrocheur (max 80c)
- Résumé court (max 200c)
- Angle de communication (1 phrase)
- Chiffre clé si pertinent
Réponds au format JSON: {"titre": "...", "resume": "...", "angle": "...", "chiffre_cle": "..."}`,
};

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

function validateInput(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Body required and must be object'] };
  }

  const { mode, user_input, page_context } = body;

  // Mode validation
  if (!mode || typeof mode !== 'string') {
    errors.push('mode required (string)');
  } else if (!VALID_MODES.includes(mode)) {
    errors.push(`mode invalid — must be one of: ${VALID_MODES.join(', ')}`);
  }

  // User input validation
  if (user_input !== undefined) {
    if (typeof user_input !== 'string') {
      errors.push('user_input must be string');
    } else if (user_input.length > MAX_USER_INPUT) {
      errors.push(`user_input exceeds ${MAX_USER_INPUT} characters`);
    } else if (user_input.trim().length === 0) {
      errors.push('user_input cannot be empty');
    }
  }

  // Page context validation
  if (page_context !== undefined) {
    if (typeof page_context !== 'string') {
      errors.push('page_context must be string');
    } else if (page_context.length > MAX_PAGE_CONTEXT) {
      errors.push(`page_context exceeds ${MAX_PAGE_CONTEXT} characters`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// QWEN API CALL
// ═════════════════════════════════════════════════════════════════════════════

async function callBuiltinAI(base44, messages) {
  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const userMsg = messages.find(m => m.role === 'user')?.content || '';
  const prompt = systemMsg ? `${systemMsg}\n\n${userMsg}` : userMsg;

  const text = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
  return { text: typeof text === 'string' ? text : JSON.stringify(text) };
}

// ═════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═════════════════════════════════════════════════════════════════════════════

async function logJob(base44, mode, success, latency, opts = {}) {
  try {
    await base44.asServiceRole.entities.AIJobLog.create({
      mode,
      success,
      latency_ms: latency,
      commune_id: opts.commune_id || null,
      dossier_id: opts.dossier_id || null,
      error_code: opts.error_code || null,
      error_message: opts.error_message || null,
      input_length: opts.input_length || null,
      output_length: opts.output_length || null,
    });
  } catch (err) {
    console.error(`[AIJobLog] Failed to log: ${err.message}`);
    // Non-blocking — ne pas casser le flow si le log échoue
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═════════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);

    // Parse request
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate input
    const validation = validateInput(body);
    if (!validation.valid) {
      return Response.json(
        { success: false, errors: validation.errors },
        { status: 400 }
      );
    }

    const { mode, user_input = '', page_context = '', role, commune_id, dossier_id, email, user_id } = body;

    // ═════════════════════════════════════════════════════════════════════════════
    // CIRCUIT BREAKER CHECK
    // ═════════════════════════════════════════════════════════════════════════════

    const cbCheck = checkCircuitBreaker();
    if (cbCheck.broken) {
      const latency = Date.now() - startTime;
      await logJob(base44, mode, false, latency, {
        error_code: 'CIRCUIT_BREAKER',
        error_message: cbCheck.message,
      }).catch(() => {});
      return Response.json(
        { success: false, error: cbCheck.message, error_code: 'CIRCUIT_BREAKER' },
        { status: 503 }
      );
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // RATE LIMITING
    // ═════════════════════════════════════════════════════════════════════════════

    const identifier = getIdentifier({ ...body, mode });
    const rlCheck = await checkRateLimit(base44, identifier);
    if (!rlCheck.allowed) {
      const latency = Date.now() - startTime;
      await logJob(base44, mode, false, latency, {
        error_code: 'RATE_LIMITED',
        error_message: `Quota atteint (${rlCheck.limit}/heure)`,
      }).catch(() => {});
      return Response.json(
        {
          success: false,
          error: `Quota IA atteint pour ce mode. Limite: ${rlCheck.limit}/heure. Réessayez plus tard.`,
          error_code: 'RATE_LIMITED',
          retry_after_seconds: 300,
        },
        { status: 429 }
      );
    }
    await recordRateLimitHit(base44, identifier);

    // ═════════════════════════════════════════════════════════════════════════════
    // CHEAP-FIRST: Check local FAQ for public_help mode
    // ═════════════════════════════════════════════════════════════════════════════

    if (mode === 'public_help') {
      const localAnswer = matchLocalIntent(user_input);
      if (localAnswer) {
        const latency = Date.now() - startTime;
        // Log local FAQ hit (non-blocking)
        await logJob(base44, mode, true, latency, {
          input_length: user_input.length,
          output_length: localAnswer.length,
          commune_id,
          dossier_id,
          error_message: 'LOCAL_FAQ_HIT', // Marker for analytics
        }).catch(() => {});
        
        return Response.json({
          success: true,
          data: {
            text: localAnswer,
            mode: mode,
            latency_ms: latency,
            source: 'local_faq', // Indicate source for debugging
          },
        });
      }
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // No local match — proceed to Qwen call
    // ═════════════════════════════════════════════════════════════════════════════

    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `[Mode: ${mode}]\n\n${PROMPTS_BY_MODE[mode]}\n\nInput:\n${user_input}${page_context ? `\n\nContext:\n${page_context}` : ''}`,
      },
    ];

    // Call built-in AI
    let qwenResult;
    try {
      qwenResult = await callBuiltinAI(base44, messages, mode);
      recordCircuitBreakerSuccess(); // Reset CB on success
    } catch (err) {
      const latency = Date.now() - startTime;
      recordCircuitBreakerFailure(); // Increment CB counter
      
      const isTimeout = err.message.includes('Timeout');
      const errorCode = isTimeout ? 'TIMEOUT' : 'API_ERROR';
      
      await logJob(base44, mode, false, latency, {
        error_code: errorCode,
        error_message: err.message.substring(0, 500),
        input_length: user_input.length,
        commune_id,
        dossier_id,
      }).catch(() => {});

      // Fallback graceful message per mode
      const fallbacks = {
        public_help: 'Service IA indisponible. Essayez via /agenda ou /place-du-village directement.',
        rewrite_public: 'Service d\'amélioration IA indisponible. Vous pouvez envoyer votre texte tel quel.',
        qualify_dossier: 'Classification IA indisponible. Agent de mairie : qualifier manuellement.',
        rewrite_mairie: 'Service de rédaction IA indisponible. Utilisez le texte original.',
        generate_digest: 'Génération du point du jour échouée. Consultez manuellement les dossiers.',
        generate_victory: 'Génération VictoryCard échouée. Créez le brouillon manuellement.',
      };

      // Fallback: graceful mode-specific response
      let fallbackData = {};
      if (mode === 'generate_digest') {
        fallbackData = { contenu_court: fallbacks[mode], top_1: '', top_2: '', top_3: '' };
      } else {
        fallbackData = { text: fallbacks[mode] };
      }

      return Response.json(
        {
          success: false,
          error: fallbacks[mode] || 'IA service temporarily unavailable',
          error_code: errorCode,
          circuit_breaker_status: `${circuitBreakerState.failCount}/${CIRCUIT_BREAKER_THRESHOLD} failures`,
          data: fallbackData,
        },
        { status: 503 }
      );
    }

    const latency = Date.now() - startTime;
    const outputText = qwenResult.text || '';

    // Parse JSON for modes that require structured output
    let parsedData = { text: outputText };
    if (mode === 'generate_digest') {
      try {
        const cleanedText = outputText.replace(/```json|```/g, '').trim();
        parsedData = JSON.parse(cleanedText);
      } catch (parseErr) {
        // Fallback graceful: keep as plain text in contenu_court, leave top_1/2/3 empty
        console.warn(`[generate_digest] JSON parse failed, using fallback: ${parseErr.message}`);
        parsedData = { contenu_court: outputText, top_1: '', top_2: '', top_3: '' };
      }
    }

    // Log success
    await logJob(base44, mode, true, latency, {
      input_length: user_input.length,
      output_length: mode === 'generate_digest' ? JSON.stringify(parsedData).length : outputText.length,
      commune_id,
      dossier_id,
    }).catch(() => {});

    // Return response
    return Response.json({
      success: true,
      data: parsedData,
      latency_ms: latency,
      rate_limit_remaining: rlCheck.remaining,
    });
  } catch (err) {
    const latency = Date.now() - startTime;
    console.error(`[qwenAssist] Unhandled error: ${err.message}`);
    recordCircuitBreakerFailure();

    let fallbackData = {};
    if (body?.mode === 'generate_digest') {
      fallbackData = { contenu_court: 'Erreur interne. Réessayez.', top_1: '', top_2: '', top_3: '' };
    }

    return Response.json(
      {
        success: false,
        error: 'Internal server error',
        error_code: 'INTERNAL_ERROR',
        data: fallbackData,
      },
      { status: 500 }
    );
  }
});