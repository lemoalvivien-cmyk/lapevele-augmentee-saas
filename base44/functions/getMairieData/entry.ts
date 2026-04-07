import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MAIRIE_ROLES = ["operator", "mayor", "deputy", "comms", "interco_admin"];

async function getAgentCommune(base44, userEmail) {
  const profiles = await base44.asServiceRole.entities.UserProfile.filter({ email: userEmail });
  if (!profiles.length) throw new Error("Profil mairie introuvable.");
  const profile = profiles[0];
  if (!MAIRIE_ROLES.includes(profile.role_local)) throw new Error("Rôle insuffisant.");
  const allowed = await base44.asServiceRole.entities.AllowedUser.filter({ email: userEmail, commune: profile.commune, statut_activation: "active" });
  if (!allowed.length) throw new Error("Accès non activé pour cette commune.");
  return profile.commune;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non authentifié" }, { status: 401 });

    const { operation, params = {} } = await req.json();
    const isAdmin = user.role === "admin";
    const sr = base44.asServiceRole;

    let commune = null;
    if (!isAdmin) {
      commune = await getAgentCommune(base44, user.email);
    }

    switch (operation) {

      case "dossiers": {
        const q = commune ? { commune } : {};
        const dossiers = await sr.entities.Dossier.filter(q, params.sort || "-created_date", params.limit || 300);
        return Response.json({ dossiers, commune });
      }

      case "dossier_detail": {
        const { dossierId } = params;
        if (!dossierId) return Response.json({ error: "dossierId requis" }, { status: 400 });
        const [dossiers, updates, tokens] = await Promise.all([
          sr.entities.Dossier.filter({ id: dossierId }),
          sr.entities.DossierUpdate.filter({ dossier: dossierId }, "created_date"),
          sr.entities.SuiviPublicToken.filter({ dossier: dossierId, actif: true }),
        ]);
        if (!dossiers.length) return Response.json({ error: "Dossier introuvable" }, { status: 404 });
        const dossier = dossiers[0];
        if (!isAdmin && commune && dossier.commune !== commune) {
          return Response.json({ error: "Accès non autorisé à ce dossier" }, { status: 403 });
        }
        return Response.json({ dossier, updates, token: tokens[0] || null, commune });
      }

      case "services": {
        const q = commune ? { commune, actif: true } : { actif: true };
        const services = await sr.entities.ServiceMunicipal.filter(q);
        return Response.json({ services, commune });
      }

      case "commune_config": {
        if (!commune && !isAdmin) return Response.json({ error: "Commune non définie" }, { status: 400 });
        const communes = commune
          ? await sr.entities.Commune.filter({ slug: commune })
          : await sr.entities.Commune.list();
        return Response.json({ commune_data: communes[0] || null, commune });
      }

      case "victories": {
        const q = commune ? { commune } : {};
        if (params.statut) q.statut = params.statut;
        const victories = await sr.entities.VictoryCard.filter(q, "-created_date", 100);
        return Response.json({ victories, commune });
      }

      case "digest": {
        const today = new Date().toISOString().slice(0, 10);
        const q = commune ? { commune, date_digest: today } : { date_digest: today };
        const digests = await sr.entities.DailyDigest.filter(q);
        return Response.json({ digest: digests[0] || null, commune });
      }

      case "allowed_users": {
        if (!isAdmin) return Response.json({ error: "Admin requis" }, { status: 403 });
        const users = await sr.entities.AllowedUser.list("-created_date");
        return Response.json({ users });
      }

      case "update_victory_card": {
        const { cardId, updates } = params;
        if (!cardId) return Response.json({ error: "cardId requis" }, { status: 400 });
        const cards = await sr.entities.VictoryCard.filter({ id: cardId });
        if (!cards.length) return Response.json({ error: "Carte introuvable" }, { status: 404 });
        if (!isAdmin && commune && cards[0].commune !== commune) {
          return Response.json({ error: "Accès non autorisé" }, { status: 403 });
        }
        const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => ["statut"].includes(k)));
        const updated = await sr.entities.VictoryCard.update(cardId, safe);
        return Response.json({ updated });
      }

      case "create_victory_card": {
        const { data } = params;
        if (!isAdmin && commune && data.commune !== commune) {
          return Response.json({ error: "Accès non autorisé" }, { status: 403 });
        }
        if (!isAdmin && commune) data.commune = commune;
        const card = await sr.entities.VictoryCard.create(data);
        return Response.json({ card });
      }

      case "create_village_post": {
        const { data } = params;
        if (!isAdmin && commune && data.commune !== commune) {
          return Response.json({ error: "Accès non autorisé" }, { status: 403 });
        }
        const post = await sr.entities.VillagePost.create({ ...data, created_by: user.email });
        return Response.json({ post });
      }

      case "create_daily_digest": {
        const { data } = params;
        if (!isAdmin && commune) data.commune = commune;
        const digest = await sr.entities.DailyDigest.create(data);
        return Response.json({ digest });
      }

      default:
        return Response.json({ error: "Opération inconnue" }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});