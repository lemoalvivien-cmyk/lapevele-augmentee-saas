import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const MAIRIE_ROLES = ["operator", "mayor", "deputy", "comms", "interco_admin"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Non authentifié" }, { status: 401 });

    const { dossierId, type_update, contenu, visible_citoyen } = await req.json();
    if (!dossierId || !contenu) return Response.json({ error: "dossierId et contenu requis" }, { status: 400 });

    const isAdmin = user.role === "admin";
    let commune = null;

    if (!isAdmin) {
      const profiles = await base44.asServiceRole.entities.UserProfile.filter({ email: user.email });
      if (!profiles.length || !MAIRIE_ROLES.includes(profiles[0].role_local)) {
        return Response.json({ error: "Rôle insuffisant" }, { status: 403 });
      }
      commune = profiles[0].commune;
    }

    const dossiers = await base44.asServiceRole.entities.Dossier.filter({ id: dossierId });
    if (!dossiers.length) return Response.json({ error: "Dossier introuvable" }, { status: 404 });
    if (!isAdmin && commune && dossiers[0].commune !== commune) {
      return Response.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    await base44.asServiceRole.entities.DossierUpdate.create({
      dossier: dossierId,
      auteur: user.email,
      type_update: type_update || "interne",
      contenu,
      visible_citoyen: !!visible_citoyen,
    });

    const updates = await base44.asServiceRole.entities.DossierUpdate.filter({ dossier: dossierId }, "created_date");
    return Response.json({ updates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});