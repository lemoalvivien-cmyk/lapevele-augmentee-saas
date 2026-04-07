/**
 * computeActionQueue — Le cerveau de la Lame de Décision
 *
 * Lit les TerritorialSignal récents pertinents pour un user, calcule des
 * scores selon (récence, proximité, affinité, rôle) et retourne :
 *   - 1 action principale (la Lame)
 *   - 2 actions de fallback
 *
 * Cache : 15 minutes côté edge (Cloudflare KV) — pas d'appel répété.
 * Sécurité : un user ne peut interroger QUE sa propre queue (sauf admin).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

type Signal = {
  id: string;
  type: string;
  source_user_id: string;
  source_role: string;
  target_type: string;
  target_id: string;
  payload: any;
  weight: number;
  commune?: string;
  topic_tags?: string[];
  geo_lat?: number | null;
  geo_lng?: number | null;
  created_at: string;
};

type Action = {
  id: string;
  verb: string;        // verbe d'action (1 mot)
  title: string;       // titre court (12 mots max)
  cta: string;         // libellé bouton
  href: string;        // route cible
  icon: string;        // emoji
  score: number;       // score interne (debug)
  reason: string;      // justification (debug/UX)
};

const TAU_DAYS = 7; // demi-vie de récence

function recencyWeight(createdAt: string): number {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  return Math.exp(-ageDays / TAU_DAYS);
}

function geoProximity(latA?: number | null, lngA?: number | null, latB?: number | null, lngB?: number | null): number {
  if (latA == null || lngA == null || latB == null || lngB == null) return 0.5;
  // Approximation rapide (équirectangulaire) — suffisante à l'échelle d'une commune
  const R = 6371;
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLng = ((lngB - lngA) * Math.PI) / 180;
  const x = dLng * Math.cos(((latA + latB) * Math.PI) / 360);
  const dist = Math.sqrt(x * x + dLat * dLat) * R;
  return 1 / (1 + dist);
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return Response.json({ success: false, error: "Méthode non autorisée" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) {
    return Response.json({ success: false, error: "Authentification requise" }, { status: 401 });
  }

  let body: any = {};
  if (req.method === "POST") {
    body = await req.json().catch(() => ({}));
  }

  const requested_user_id = body.user_id ?? user.id;
  const isAdmin = user.role === "admin";

  // Sécurité : owner check
  if (requested_user_id !== user.id && !isAdmin) {
    return Response.json({ success: false, error: "Accès refusé" }, { status: 403 });
  }

  const userLat = typeof body.geo_lat === "number" ? body.geo_lat : null;
  const userLng = typeof body.geo_lng === "number" ? body.geo_lng : null;
  const userCommune = body.commune ?? null;

  // 1) Récupérer le profil pour connaître rôle + intérêts
  const profiles = await base44.asServiceRole.entities.UserProfile
    .filter({ email: user.email }).catch(() => []);
  const profile = profiles[0] ?? null;
  const userRole = profile?.role_local ?? "citoyen";
  const userInterests: string[] = Array.isArray(profile?.interets) ? profile.interets : [];

  // 2) Récupérer les signaux récents pertinents (limit 200, dernière semaine)
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  let signals: Signal[] = [];
  try {
    // Filtre côté serveur sur la commune si fourni, sinon global
    const filter: any = userCommune ? { commune: userCommune } : {};
    signals = await base44.asServiceRole.entities.TerritorialSignal
      .filter(filter, "-created_at", 200)
      .catch(() => []);
    signals = signals.filter((s) => s.created_at >= since);
  } catch (e: any) {
    console.warn("computeActionQueue: signal fetch error:", e?.message);
  }

  // 3) Scoring
  const scored = signals.map((s) => {
    // Composantes du score
    const recency = recencyWeight(s.created_at);
    const proximity = geoProximity(userLat, userLng, s.geo_lat ?? null, s.geo_lng ?? null);
    const interestMatch = (s.topic_tags ?? []).some((tag: string) => userInterests.includes(tag)) ? 1 : 0.3;

    // Filtrage par rôle : on ne propose pas à un mairie une action citoyenne, etc.
    let roleBoost = 1;
    if (userRole === "mairie" || userRole === "operator" || userRole === "mayor") {
      roleBoost = ["signale", "propose", "traite_dossier"].includes(s.type) ? 1.4 : 0.6;
    } else if (userRole === "entreprise" || userRole === "commercant") {
      roleBoost = ["interesse_par", "achete", "vend", "sponsorise"].includes(s.type) ? 1.4 : 0.7;
    } else {
      // citoyen
      roleBoost = ["participe", "match", "achete", "aide", "propose"].includes(s.type) ? 1.2 : 0.9;
    }

    const score = s.weight * recency * (0.4 + 0.3 * proximity + 0.3 * interestMatch) * roleBoost;
    return { signal: s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 6); // candidats pour la Lame

  // 4) Mapper les signaux en Actions humaines
  const actions: Action[] = top.map(({ signal, score }) => {
    const id = signal.id;
    let verb = "Voir", icon = "👀", cta = "Découvrir", href = "/agir", title = "Une opportunité près de chez vous", reason = "Signal récent";

    switch (signal.type) {
      case "signale":
        if (userRole === "mairie" || userRole === "operator" || userRole === "mayor") {
          verb = "Traiter"; icon = "📋"; cta = "Voir le dossier"; href = `/mairie/dossiers/${signal.target_id || ""}`;
          title = signal.payload?.titre ?? "Nouveau signalement à traiter";
          reason = "Dossier citoyen en attente";
        } else {
          verb = "Soutenir"; icon = "📣"; cta = "Voir le signalement"; href = `/place-du-village`;
          title = signal.payload?.titre ?? "Un voisin a signalé un problème";
          reason = "Signalement récent dans votre quartier";
        }
        break;
      case "propose":
        verb = "Découvrir"; icon = "💡"; cta = "Voir la proposition"; href = `/place-du-village`;
        title = signal.payload?.titre ?? "Une nouvelle idée dans votre commune";
        reason = "Proposition citoyenne";
        break;
      case "participe":
      case "match":
        verb = "Rejoindre"; icon = "🎉"; cta = "Voir l'événement"; href = `/flash-date`;
        title = signal.payload?.titre ?? "Un événement près de chez vous";
        reason = "Événement local pertinent";
        break;
      case "vend":
        verb = "Acheter"; icon = "🛍️"; cta = "Voir l'annonce"; href = `/marketplace/listing/${signal.target_id || ""}`;
        title = signal.payload?.titre ?? "Nouvelle annonce locale";
        reason = "Marketplace de votre commune";
        break;
      case "sponsorise":
        verb = "Découvrir"; icon = "✨"; cta = "Voir le sponsor"; href = `/sponsor`;
        title = signal.payload?.titre ?? "Un commerce local soutient votre commune";
        reason = "Sponsor local";
        break;
      case "traite_dossier":
        verb = "Lire"; icon = "📨"; cta = "Voir la réponse"; href = `/mon-suivi/${signal.payload?.token ?? ""}`;
        title = "La mairie a répondu à un dossier";
        reason = "Mise à jour mairie";
        break;
      case "interesse_par":
        verb = "Explorer"; icon = "🔍"; cta = "Voir les opportunités"; href = `/b2b`;
        title = "Une audience qualifiée correspond à votre offre";
        reason = "Match B2B";
        break;
      default:
        break;
    }

    return { id, verb, title: title.slice(0, 80), cta, href, icon, score: Math.round(score * 1000) / 1000, reason };
  });

  // Dédoublonnage par href + titre
  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    const k = `${a.href}::${a.title}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Si aucune action pertinente : fallback générique selon rôle
  if (unique.length === 0) {
    if (userRole === "mairie" || userRole === "operator" || userRole === "mayor") {
      unique.push({
        id: "fallback-mairie",
        verb: "Consulter",
        title: "Aucun dossier urgent. Consultez votre tableau de bord.",
        cta: "Tableau de bord",
        href: "/mairie/tableau-de-bord",
        icon: "🏛️",
        score: 0,
        reason: "Fallback rôle mairie",
      });
    } else {
      unique.push({
        id: "fallback-citoyen",
        verb: "Agir",
        title: "Signalez un problème ou proposez une idée pour votre commune.",
        cta: "Agir maintenant",
        href: "/agir",
        icon: "✊",
        score: 0,
        reason: "Fallback citoyen",
      });
    }
  }

  // Cache headers — 15 minutes côté edge
  return new Response(
    JSON.stringify({
      success: true,
      user_id: requested_user_id,
      role: userRole,
      generated_at: new Date().toISOString(),
      lame: unique[0],
      fallbacks: unique.slice(1, 3),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=900",
      },
    }
  );
});
