import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function sendEmail(base44, { to, subject, body }) {
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({ to, subject, body, from_name: 'La Pévèle Augmentée' });
    await base44.asServiceRole.entities.EmailLog.create({ to, subject, status: 'sent', retry_count: 0 });
    return { ok: true };
  } catch (e) {
    await base44.asServiceRole.entities.EmailLog.create({
      to, subject, status: 'failed', error_message: e?.message || 'unknown', retry_count: 0,
    });
    return { ok: false, error: e?.message };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { operation, email_citoyen, nom_citoyen, titre_public, commune, token, dossierId, email, nom, titre, statut, suivi_url } = await req.json();

    // Cas : notification de changement de statut
    if (operation === 'status_update') {
      if (!email || !titre || !statut || !commune) return Response.json({ error: 'email, titre, statut, commune requis' }, { status: 400 });
      const subject = 'Votre signalement a avancé — ' + titre;
      let body = 'Bonjour ' + (nom || 'Citoyen') + ',\n\n';
      body += 'Votre contribution "' + titre + '" à ' + commune + ' est maintenant : ' + statut + '.\n\n';
      if (suivi_url) body += 'Suivez l\'avancement ici : ' + suivi_url + '\n\n';
      body += 'Merci pour votre engagement.\nL\'équipe La Pévèle Augmentée';
      const r = await sendEmail(base44, { to: email, subject, body });
      return Response.json({ ok: true, result: r.ok ? 'sent' : 'failed', error: r.error });
    }

    // Cas : création initiale
    if (!titre_public || !commune) return Response.json({ error: 'titre_public et commune requis' }, { status: 400 });

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'lapeveleaugmentee.fr';
    const suiviUrl = `https://${host}/mon-suivi/${token}`;
    const ref = dossierId.slice(-8).toUpperCase();
    const prenom = nom_citoyen ? ` ${nom_citoyen}` : '';

    const results = [];

    // 1. Email citoyen avec lien de suivi
    if (email_citoyen && email_citoyen.includes('@')) {
      const r = await sendEmail(base44, {
        to: email_citoyen,
        subject: `✅ Votre contribution a bien été reçue — Réf. #${ref}`,
        body: `Bonjour${prenom},

Votre contribution a bien été transmise à votre commune.

📋 Référence : #${ref}
📝 Objet : ${titre_public}

Suivez l'avancement de votre demande à tout moment avec ce lien personnel :

${suiviUrl}

Conservez ce lien — il vous permettra de suivre le traitement et de donner votre avis une fois la demande résolue.

À bientôt,
La Pévèle Augmentée`,
      });
      results.push(r.ok ? 'citoyen_ok' : `citoyen_failed: ${r.error}`);
    }

    // 2. Notification mairie
    try {
      const communes = await base44.asServiceRole.entities.Commune.filter({ nom: commune });
      const c = communes[0];
      if (c?.email_contact) {
        const r = await sendEmail(base44, {
          to: c.email_contact,
          subject: `🔔 Nouveau dossier — ${c.nom} — #${ref}`,
          body: `Un nouveau dossier citoyen vient d'être déposé.

Commune : ${c.nom}
Référence : #${ref}
Objet : ${titre_public}
Citoyen : ${nom_citoyen || 'Anonyme'}${email_citoyen ? ` <${email_citoyen}>` : ''}

Connectez-vous à votre espace mairie pour le traiter :
https://${host}/mairie/dossiers`,
        });
        results.push(r.ok ? 'mairie_ok' : `mairie_failed: ${r.error}`);
      } else {
        results.push('mairie_no_email');
      }
    } catch (e) {
      results.push(`mairie_error: ${e.message}`);
    }

    return Response.json({ ok: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});