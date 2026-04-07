/**
 * emitSignal — Point d'entrée unifié du Graphe d'Intérêt Territorial
 *
 * Toute action critique de la plateforme appelle cette fonction. Elle écrit
 * un TerritorialSignal qui sera ensuite consommé par computeActionQueue
 * pour alimenter la Lame de Décision.
 *
 * Sécurité : auth requise (sauf pour signaux "system" depuis fonctions internes)
 * Rate limit : protégé par rateLimitCheck en amont (Cloudflare edge)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ALLOWED_TYPES = [
  "signale", "propose", "aide", "participe", "match",
  "achete", "vend", "sponsorise", "traite_dossier", "interesse_par",
  "consulte", "partage", "vote", "reagit"
];

const ALLOWED_TARGET_TYPES = [
  "lieu", "sujet", "user", "evenement", "transaction",
  "dossier", "listing", "sponsor"
];

// Poids par défaut selon le type — ajustables sans toucher au schéma
const DEFAULT_WEIGHTS: Record<string, number> = {
  signale: 1.0,
  propose: 0.8,
  aide: 0.7,
  participe: 0.6,
  match: 0.9,
  achete: 1.0,
  vend: 0.9,
  sponsorise: 1.0,
  traite_dossier: 1.0,
  interesse_par: 0.5,
  consulte: 0.2,
  partage: 0.4,
  vote: 0.6,
  reagit: 0.3,
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ success: false, error: "Méthode non autorisée" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);

  // Auth gate — seuls les utilisateurs authentifiés peuvent émettre des signaux
  const user = await base44.auth.me().catch(() => null);
  if (!user) {
    return Response.json({ success: false, error: "Authentification requise" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: "JSON invalide" }, { status: 400 });
  }

  const {
    type,
    target_type,
    target_id,
    payload = {},
    weight,
    commune,
    topic_tags = [],
    geo_lat,
    geo_lng,
    source_role: requestedRole,
  } = body;

  // Validation stricte des inputs
  if (!type || !ALLOWED_TYPES.includes(type)) {
    return Response.json({ success: false, error: `Type invalide. Autorisés: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
  }

  if (!target_type || !ALLOWED_TARGET_TYPES.includes(target_type)) {
    return Response.json({ success: false, error: `target_type invalide. Autorisés: ${ALLOWED_TARGET_TYPES.join(", ")}` }, { status: 400 });
  }

  // Détermine le rôle réel — l'utilisateur ne peut PAS prétendre être system/admin
  let source_role: string = "citoyen";
  if (user.role === "admin") {
    source_role = requestedRole === "system" ? "system" : "mairie";
  } else {
    // Lookup UserProfile pour rôle réel
    try {
      const profiles = await base44.asServiceRole.entities.UserProfile
        .filter({ email: user.email }).catch(() => []);
      const profile = profiles[0];
      if (profile?.role_local) {
        const MAIRIE_ROLES = ["operator", "mayor", "deputy", "comms", "interco_admin"];
        const ENTREPRISE_ROLES = ["entreprise", "commercant", "artisan"];
        if (MAIRIE_ROLES.includes(profile.role_local)) source_role = "mairie";
        else if (ENTREPRISE_ROLES.includes(profile.role_local)) source_role = "entreprise";
        else if (profile.role_local === "epci") source_role = "epci";
      }
    } catch (e) {
      console.warn("emitSignal: lookup role_local failed:", (e as Error).message);
    }
  }

  // Tags : sanitize (lowercase, trim, max 8 tags, max 32 chars chacun)
  const safeTags: string[] = (Array.isArray(topic_tags) ? topic_tags : [])
    .filter((t: unknown) => typeof t === "string")
    .map((t: string) => t.toLowerCase().trim().slice(0, 32))
    .filter((t: string) => t.length > 0)
    .slice(0, 8);

  // Géo : valider plage
  const safeLat = typeof geo_lat === "number" && geo_lat >= -90 && geo_lat <= 90 ? geo_lat : null;
  const safeLng = typeof geo_lng === "number" && geo_lng >= -180 && geo_lng <= 180 ? geo_lng : null;

  // Poids : forcé dans [0,1], défaut selon le type
  const safeWeight = typeof weight === "number"
    ? Math.max(0, Math.min(1, weight))
    : (DEFAULT_WEIGHTS[type] ?? 0.5);

  // Création du signal
  try {
    const signal = await base44.asServiceRole.entities.TerritorialSignal.create({
      type,
      source_user_id: user.id,
      source_role,
      target_type,
      target_id: target_id ?? "",
      payload,
      weight: safeWeight,
      commune: commune ?? "",
      topic_tags: safeTags,
      geo_lat: safeLat,
      geo_lng: safeLng,
      created_at: new Date().toISOString(),
      processed_at: null,
    });

    // Invalidation cache action queue (best-effort, ne pas bloquer)
    // Le cache edge expirera naturellement en 15 min sinon.
    return Response.json({
      success: true,
      signal_id: signal.id,
      type,
      weight: safeWeight,
      source_role,
    });
  } catch (e: any) {
    console.error("emitSignal create error:", e?.message);
    return Response.json({ success: false, error: "Erreur écriture signal" }, { status: 500 });
  }
});
