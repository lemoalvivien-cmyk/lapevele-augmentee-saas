import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { email } = await req.json();
  if (!email) return Response.json({ error: 'email requis' }, { status: 400 });

  const result = { profiles: 0, reactions: 0, participations: 0, dossiers_anonymises: 0, tokens_desactives: 0 };

  // Fetch all entity collections in parallel — independent queries
  const [profiles, reactions, parts, dossiers] = await Promise.all([
    base44.asServiceRole.entities.UserProfile.filter({ email }).catch(() => []),
    base44.asServiceRole.entities.VillageReaction.filter({ user_email: email }).catch(() => []),
    base44.asServiceRole.entities.ParticipationEvenement.filter({ email }).catch(() => []),
    base44.asServiceRole.entities.Dossier.filter({ email_citoyen: email }).catch(() => []),
  ]);

  // Supprimer UserProfile — parallel
  try {
    await Promise.all(profiles.map((p: any) =>
      base44.asServiceRole.entities.UserProfile.delete(p.id).catch((e: any) => console.error('UserProfile delete error:', e.message))
    ));
    result.profiles = profiles.length;
  } catch (e: any) { console.error('UserProfile batch error:', e.message); }

  // Supprimer VillageReaction — parallel
  try {
    await Promise.all(reactions.map((r: any) =>
      base44.asServiceRole.entities.VillageReaction.delete(r.id).catch((e: any) => console.error('VillageReaction delete error:', e.message))
    ));
    result.reactions = reactions.length;
  } catch (e: any) { console.error('VillageReaction batch error:', e.message); }

  // Supprimer ParticipationEvenement — parallel
  try {
    await Promise.all(parts.map((p: any) =>
      base44.asServiceRole.entities.ParticipationEvenement.delete(p.id).catch((e: any) => console.error('ParticipationEvenement delete error:', e.message))
    ));
    result.participations = parts.length;
  } catch (e: any) { console.error('ParticipationEvenement batch error:', e.message); }

  // Anonymiser Dossier + désactiver tokens liés — parallel per dossier, tokens fetched in parallel
  try {
    await Promise.all(dossiers.map(async (d: any) => {
      // Anonymiser le dossier
      await base44.asServiceRole.entities.Dossier.update(d.id, {
        email_citoyen: 'supprimé',
        nom_citoyen: 'Citoyen anonymisé',
      }).catch((e: any) => console.error('Dossier anonymise error:', e.message));
      result.dossiers_anonymises++;

      // Désactiver les tokens liés — parallel
      const tokens = await base44.asServiceRole.entities.SuiviPublicToken.filter({ dossier: d.id }).catch(() => []);
      await Promise.all(tokens.map((t: any) =>
        base44.asServiceRole.entities.SuiviPublicToken.update(t.id, { actif: false })
          .catch((e: any) => console.error('Token deactivate error:', e.message))
      ));
      result.tokens_desactives += tokens.length;
    }));
  } catch (e: any) { console.error('Dossier batch error:', e.message); }

  console.log(`Suppression RGPD pour ${email}:`, result);

  return Response.json({ success: true, email, result });
});
