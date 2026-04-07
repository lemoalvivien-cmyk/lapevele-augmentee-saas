import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const APP_ID = '69c6b3f69a0c0e88e2529d4a';
const API_BASE = 'https://pevele-liens-proches.base44.app';

Deno.serve(async (req) => {
  const { token } = await req.json();

  if (!token) {
    return Response.json({ error: 'missing_token' }, { status: 400 });
  }

  // SuiviPublicToken has read: true — no auth needed
  const tokenQ = encodeURIComponent(JSON.stringify({ token, actif: true }));
  const tokenUrl = `${API_BASE}/api/apps/${APP_ID}/entities/SuiviPublicToken?q=${tokenQ}`;
  const tokenRes = await fetch(tokenUrl);

  if (!tokenRes.ok) {
    return Response.json({ error: 'token_fetch_failed', status: tokenRes.status }, { status: 500 });
  }

  const tokens = await tokenRes.json();

  if (!tokens || tokens.length === 0) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  const tokenRecord = tokens[0];
  const dossierId = tokenRecord.dossier;

  if (!dossierId) {
    return Response.json({ error: 'no_dossier_linked' }, { status: 404 });
  }

  // Use SDK with service role to bypass Dossier RLS
  const base44 = createClientFromRequest(req);
  let dossier = null;
  let dossierError = null;

  try {
    dossier = await base44.asServiceRole.entities.Dossier.get(dossierId);
  } catch (e1) {
    dossierError = String(e1);
    // Fallback: try without service role (works if user owns the dossier)
    try {
      dossier = await base44.entities.Dossier.get(dossierId);
    } catch (e2) {
      dossierError = dossierError + ' | fallback: ' + String(e2);
    }
  }

  if (!dossier) {
    return Response.json(
      { error: 'dossier_unavailable', dossierId, sdkError: dossierError },
      { status: 404 }
    );
  }

  const updatesQ = encodeURIComponent(JSON.stringify({ dossier: dossierId }));
  let updates = [];
  try {
    const updatesResult = await base44.asServiceRole.entities.DossierUpdate.filter({ dossier: dossierId });
    updates = updatesResult || [];
  } catch (_) {
    updates = [];
  }

  // Return only safe public fields — never expose email_citoyen or description_brute
  const safe = {
    id: dossier.id,
    titre_public: dossier.titre_public,
    description_resumee: dossier.description_resumee,
    statut: dossier.statut,
    type_action: dossier.type_action,
    commune: dossier.commune,
    service_assigne: dossier.service_assigne,
    photo_avant: dossier.photo_avant,
    photo_apres: dossier.photo_apres,
    note_satisfaction: dossier.note_satisfaction,
    created_date: dossier.created_date,
  };

  return Response.json({ dossier: safe, updates });
});
