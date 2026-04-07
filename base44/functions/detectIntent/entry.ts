import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ═══════════════════════════════════════════════════════════════════════════
// DETECT INTENT — Scoring d'intention dans l'assistant public
// Génère un CTA adapté selon l'intent détecté
// ═══════════════════════════════════════════════════════════════════════════

const INTENT_RULES: Array<{
  intent: string;
  patterns: string[];
  cta_label: string;
  cta_url: string;
  confidence_boost: number;
}> = [
  {
    intent: 'emploi',
    patterns: ['emploi', 'travail', 'job', 'poste', 'recrutement', 'cdi', 'cdd', 'stage', 'alternance', 'chomage', 'pole emploi'],
    cta_label: '🎯 Voir les offres d\'emploi locales',
    cta_url: '/emploi-business-local',
    confidence_boost: 0.2,
  },
  {
    intent: 'entreprendre',
    patterns: ['entreprise', 'creation', 'lancer', 'business', 'auto-entrepreneur', 'micro', 'siret', 'statut', 'subvention', 'aide', 'financement'],
    cta_label: '🚀 Aide à la création d\'entreprise',
    cta_url: '/services',
    confidence_boost: 0.25,
  },
  {
    intent: 'mairie_plus',
    patterns: ['mairie', 'abonnement', 'plateforme', 'outil', 'gestion', 'dossier', 'pilotage', 'tableau de bord', 'prix', 'tarif', 'essai'],
    cta_label: '🏛️ Découvrir Mairie+ (à partir de 299€/mois)',
    cta_url: '/mairie-plus',
    confidence_boost: 0.3,
  },
  {
    intent: 'sponsor',
    patterns: ['sponsor', 'publicite', 'partenaire', 'visibilite', 'annonce', 'communication locale', 'client'],
    cta_label: '📣 Devenir partenaire local',
    cta_url: '/sponsor',
    confidence_boost: 0.35,
  },
  {
    intent: 'b2b',
    patterns: ['b2b', 'prospect', 'client', 'partenaire', 'mise en relation', 'reseau', 'affaire', 'opportunite', 'wiinup', 'facilitateur'],
    cta_label: '🤝 Module B2B territorial',
    cta_url: '/b2b',
    confidence_boost: 0.3,
  },
  {
    intent: 'aide_sociale',
    patterns: ['aide', 'social', 'isolement', 'seniorite', 'handicap', 'pauvrete', 'urgence', 'voisin', 'besoin', 'vulnerable'],
    cta_label: '❤️ Proposer ou demander de l\'aide',
    cta_url: '/aider',
    confidence_boost: 0.2,
  },
  {
    intent: 'evenement',
    patterns: ['evenement', 'agenda', 'manifestation', 'fete', 'concert', 'sport', 'atelier', 'reunion', 'sortie'],
    cta_label: '📅 Voir l\'agenda local',
    cta_url: '/agenda',
    confidence_boost: 0.15,
  },
  {
    intent: 'signalement',
    patterns: ['signaler', 'probleme', 'casse', 'deterioration', 'danger', 'route', 'lampadaire', 'dechet', 'tag'],
    cta_label: '🚨 Signaler un problème',
    cta_url: '/signaler',
    confidence_boost: 0.15,
  },
  {
    intent: 'formation',
    patterns: ['formation', 'cours', 'apprendre', 'competence', 'diplome', 'certification', 'cpf', 'reconversion'],
    cta_label: '📚 Formations locales disponibles',
    cta_url: '/services',
    confidence_boost: 0.2,
  },
];

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
}

function detectIntentLocal(input: string): {
  intent: string; confidence: number; cta_label: string; cta_url: string;
} {
  if (!input) return { intent: 'general', confidence: 0, cta_label: '', cta_url: '' };

  const normalized = normalizeText(input);
  const words = normalized.split(/\s+/);

  let bestMatch = { intent: 'general', confidence: 0, cta_label: '', cta_url: '' };
  let maxScore = 0;

  for (const rule of INTENT_RULES) {
    let score = 0;
    let matchedPatterns = 0;

    for (const pattern of rule.patterns) {
      const np = normalizeText(pattern);
      if (words.includes(np) || normalized.includes(np)) {
        matchedPatterns++;
        score += 1;
        // Bonus si le mot est au début
        if (normalized.startsWith(np)) score += 0.5;
      }
    }

    if (score > 0) {
      const confidence = Math.min(0.95, (score / rule.patterns.length) * 3 + rule.confidence_boost);
      if (confidence > maxScore) {
        maxScore = confidence;
        bestMatch = {
          intent: rule.intent,
          confidence: Math.round(confidence * 100) / 100,
          cta_label: rule.cta_label,
          cta_url: rule.cta_url,
        };
      }
    }
  }

  return bestMatch;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const { user_input, commune, session_id } = body;

    if (!user_input || typeof user_input !== 'string') {
      return Response.json({ success: false, error: 'user_input requis' }, { status: 400 });
    }

    const detection = detectIntentLocal(user_input);

    // Log le signal (non-bloquant)
    if (detection.confidence > 0.3) {
      base44.asServiceRole.entities.IntentSignal.create({
        intent: detection.intent as any,
        confidence: detection.confidence,
        source: 'public_assistant',
        commune: commune || null,
        session_id: session_id || null,
        user_input: user_input.substring(0, 200),
        suggestion_shown: detection.cta_label,
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }

    return Response.json({
      success: true,
      data: {
        intent: detection.intent,
        confidence: detection.confidence,
        cta_label: detection.cta_label,
        cta_url: detection.cta_url,
        show_cta: detection.confidence >= 0.4,
      },
    });

  } catch (err: any) {
    console.error(`[detectIntent] Error: ${err.message}`);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
});
