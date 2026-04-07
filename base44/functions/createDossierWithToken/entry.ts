import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { dossierData, tokenData, emailData } = await req.json();

    if (!dossierData || !tokenData) {
      return Response.json({ error: "dossierData et tokenData requis" }, { status: 400 });
    }

    const sr = base44.asServiceRole;

    // 1. Sanitize description_brute et titre_public
    const allWarnings = [];

    const [descRes, titreRes] = await Promise.all([
      sr.functions.invoke('validateContent', { text: dossierData.description_brute || '', field_name: 'description_brute' }),
      sr.functions.invoke('validateContent', { text: dossierData.titre_public || '', field_name: 'titre_public' }),
    ]);

    if (descRes.clean_text !== undefined) {
      dossierData.description_brute = descRes.clean_text;
      if (descRes.warnings?.length) allWarnings.push(...descRes.warnings);
    }
    if (titreRes.clean_text !== undefined) {
      dossierData.titre_public = titreRes.clean_text;
      if (titreRes.warnings?.length) allWarnings.push(...titreRes.warnings);
    }

    if (allWarnings.length > 0) {
      dossierData.ai_needs_review = true;
    }

    // Validation email serveur
    if (dossierData.email_citoyen && dossierData.email_citoyen.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dossierData.email_citoyen)) {
        dossierData.email_citoyen = "";
      }
    }

    // Normalisation slug → nom complet de commune
    const COMMUNE_NAMES = {
      "pevele-carembault": "Pévèle Carembault",
      "pont-a-marcq": "Pont-à-Marcq",
      "templeuve-en-pevele": "Templeuve-en-Pévèle",
    };
    if (dossierData.commune && COMMUNE_NAMES[dossierData.commune]) {
      dossierData.commune = COMMUNE_NAMES[dossierData.commune];
    }

    // Turnstile token présent dans dossierData.captcha_token
    delete dossierData.captcha_token; // Ne pas persister le token CAPTCHA dans l'entité

    // 2. Créer le dossier
    const dossier = await sr.entities.Dossier.create(dossierData);

    // 2.5. Qualification IA — gouvernée par AI_MAIRIE_ENABLED (sync: lib/app-params.js AI_FLAGS)
    const AI_MAIRIE_ENABLED = true;
    if (AI_MAIRIE_ENABLED) {
      const qualifyPayload = {
        type_action: dossierData.type_action,
        description_brute: dossierData.description_brute || '',
        commune: dossierData.commune || '',
      };
      sr.functions.invoke('qwenAssist', {
        mode: 'qualify_dossier',
        user_input: `Type: ${qualifyPayload.type_action}\nDescription: ${qualifyPayload.description_brute}`,
      }).then(res => {
        if (res.data?.success && res.data?.data) {
          const qual = res.data.data;
          const updateData = {};
          if (qual.categorie) updateData.categorie = qual.categorie;
          if (qual.priorite) updateData.priorite = qual.priorite;
          if (Object.keys(updateData).length > 0) {
            sr.entities.Dossier.update(dossier.id, updateData).catch(() => {});
          }
        }
      }).catch(() => {});
    }

    // 3. Créer le token — rollback si échec
    let token;
    try {
      token = await sr.entities.SuiviPublicToken.create({
        ...tokenData,
        dossier: dossier.id,
      });
    } catch (tokenError) {
      // Rollback : supprimer le dossier orphelin
      await sr.entities.Dossier.delete(dossier.id).catch(() => {});
      return Response.json({ error: "Échec création token, dossier annulé : " + tokenError.message }, { status: 500 });
    }

    // 4. Emails en non-bloquant
    if (emailData) {
      base44.asServiceRole.functions.invoke('sendDossierEmails', {
        ...emailData,
        dossierId: dossier.id,
        token: tokenData.token,
      }).catch(() => {});
    }

    return Response.json({ dossierId: dossier.id, token: tokenData.token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});