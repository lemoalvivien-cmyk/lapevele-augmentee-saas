import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ADMIN_EMAIL = 'contact@vlmconsulting.fr';

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
    const { prenom, nom, commune, fonction, email, message } = await req.json();

    if (!email || !commune) {
      return Response.json({ error: 'missing_params' }, { status: 400 });
    }

    const adminResult = await sendEmail(base44, {
      to: ADMIN_EMAIL,
      subject: `🏛️ Nouvelle candidature mairie — ${commune}`,
      body: `Nouvelle demande de présentation reçue sur La Pévèle Augmentée.

Commune / collectivité : ${commune}
Contact : ${prenom} ${nom}
Fonction : ${fonction || 'Non renseignée'}
Email : ${email}

Besoin / message :
${message || 'Non renseigné'}

---
Répondez directement à ${email}`,
    });

    const confirmResult = await sendEmail(base44, {
      to: email,
      subject: `✅ Votre demande a bien été reçue — La Pévèle Augmentée`,
      body: `Bonjour ${prenom},

Merci pour votre intérêt pour La Pévèle Augmentée.

Votre demande concernant "${commune}" a bien été enregistrée. Notre équipe vous recontactera à cette adresse dans les meilleurs délais.

À bientôt,
L'équipe La Pévèle Augmentée`,
    });

    return Response.json({
      ok: true,
      admin: adminResult.ok,
      confirm: confirmResult.ok,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});