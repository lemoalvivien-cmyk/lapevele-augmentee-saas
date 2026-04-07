import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MAIRIE_ROLES = ["operator", "mayor", "deputy", "comms", "interco_admin"];
const ALLOWED_FIELDS = ["message_bienvenue_public", "message_du_maire", "quartier_labels", "email_contact", "telephone_contact", "adresse_mairie", "photo_hero"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non authentifié" }, { status: 401 });

    const { updates } = await req.json();
    const isAdmin = user.role === "admin";
    let commune = null;

    if (!isAdmin) {
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ email: user.email });
      if (!profiles.length || !MAIRIE_ROLES.includes(profiles[0].role_local)) {
        return Response.json({ error: "Rôle insuffisant" }, { status: 403 });
      }
      commune = profiles[0].commune;
    }

    if (!commune && !isAdmin) return Response.json({ error: "Commune non définie" }, { status: 400 });

    const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => ALLOWED_FIELDS.includes(k)));
    if (!Object.keys(safe).length) return Response.json({ error: "Aucun champ autorisé" }, { status: 400 });

    const communes = commune
      ? await base44.asServiceRole.entities.Commune.filter({ slug: commune })
      : await base44.asServiceRole.entities.Commune.list();
    if (!communes.length) return Response.json({ error: "Commune introuvable" }, { status: 404 });

    await base44.asServiceRole.entities.Commune.update(communes[0].id, safe);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});