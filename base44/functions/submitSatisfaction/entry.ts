import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, note, commentaire } = await req.json();

    if (!token) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const suivis = await base44.asServiceRole.entities.SuiviPublicToken.filter({ token, actif: true });
    if (!suivis || suivis.length === 0) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    const suivi = suivis[0];
    const dossierId = suivi.dossier;

    await base44.asServiceRole.entities.Dossier.update(dossierId, {
      note_satisfaction: note,
      commentaire_satisfaction: commentaire,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});