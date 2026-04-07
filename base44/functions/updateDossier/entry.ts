import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MAIRIE_ROLES = ["operator", "mayor", "deputy", "comms", "interco_admin"];
const ALLOWED_FIELDS = ["statut", "service_assigne", "visible_place_du_village", "photo_apres", "resolved_at", "categorie", "priorite"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non authentifié" }, { status: 401 });

    const { dossierId, updates } = await req.json();
    if (!dossierId) return Response.json({ error: "dossierId requis" }, { status: 400 });

    const isAdmin = user.role === "admin";
    let commune = null;

    if (!isAdmin) {
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ email: user.email });
      if (!profiles.length || !MAIRIE_ROLES.includes(profiles[0].role_local)) {
        return Response.json({ error: "Rôle insuffisant" }, { status: 403 });
      }
      commune = profiles[0].commune;
    }

    const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => ALLOWED_FIELDS.includes(k)));
    if (!Object.keys(safe).length) return Response.json({ error: "Aucun champ autorisé" }, { status: 400 });

    const dossiers = await base44.asServiceRole.entities.Dossier.filter({ id: dossierId });
    if (!dossiers.length) return Response.json({ error: 'Dossier introuvable' }, { status: 404 });
    const dossier = dossiers[0];
    if (!isAdmin && commune && dossier.commune !== commune) {
      return Response.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const updated = await base44.asServiceRole.entities.Dossier.update(dossierId, safe);
    // Audit trail — tracer chaque modification mairie
    await base44.asServiceRole.entities.DossierUpdate.create({
      dossier: dossierId,
      auteur: user.email,
      type_update: "statut",
      contenu: "Modification automatique : " + Object.entries(safe).map(([k, v]) => k + " → " + v).join(", "),
      visible_citoyen: false,
    }).catch(() => {}); // Ne pas bloquer si le log échoue

    // Notifier le citoyen du changement de statut (fire-and-forget)
    if (safe.statut && dossier.email_citoyen && dossier.email_citoyen !== 'supprimé' && safe.statut !== 'nouveau') {
      const statutLabels = { qualifie: 'pris en charge', en_cours: 'en cours de traitement', resolu: 'résolu', rejete: 'classé' };
      const label = statutLabels[safe.statut] || safe.statut;
      const tokens = await base44.asServiceRole.entities.SuiviPublicToken.filter({ dossier: dossierId, actif: true }).catch(() => []);
      const suiviUrl = tokens.length > 0 ? 'https://lapeveleaugmentee.fr/mon-suivi/' + tokens[0].token : null;
      base44.asServiceRole.functions.invoke('sendDossierEmails', {
        operation: 'status_update',
        email: dossier.email_citoyen,
        nom: dossier.nom_citoyen || 'Citoyen',
        titre: dossier.titre_public,
        statut: label,
        commune: dossier.commune,
        suivi_url: suiviUrl,
      }).catch(() => {});
    }

    return Response.json({ updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});