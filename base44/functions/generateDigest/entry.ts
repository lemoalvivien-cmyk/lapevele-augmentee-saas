import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE DIGEST — Cron hebdomadaire: digest IA personnalisé par commune
// ═══════════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    // Auth gate — génération IA coûteuse, réservée aux agents mairie et admins
    const user = await base44.auth.me().catch(() => null);
    const MAIRIE_ROLES = ["operator", "mayor", "deputy", "comms", "interco_admin"];
    const isAdmin = user?.role === 'admin';
    let isMairie = false;
    if (!isAdmin && user) {
      const profiles = await base44.asServiceRole.entities.UserProfile
        .filter({ email: user.email }).catch(() => []);
      isMairie = profiles.length > 0 && MAIRIE_ROLES.includes(profiles[0].role_local);
    }
    if (!user || (!isAdmin && !isMairie)) {
      return Response.json({ success: false, error: 'Accès refusé — réservé aux agents mairie et administrateurs' }, { status: 403 });
    }

    const { commune_id, commune_nom, force = false, period_days = 7 } = body;

    // Calculer la période
    const now = new Date();
    const startDate = new Date(now.getTime() - period_days * 24 * 3600 * 1000);
    const startIso = startDate.toISOString();

    // Récupérer les dossiers récents
    const dossiersFilter: any = { statut: { $ne: 'rejete' } };
    if (commune_id) dossiersFilter.commune = commune_id;

    const allDossiers = await base44.asServiceRole.entities.Dossier.filter(dossiersFilter);
    const recentDossiers = allDossiers.filter((d: any) => {
      const created = d.created_date || d.created_at;
      return created && new Date(created) >= startDate;
    });

    if (recentDossiers.length === 0 && !force) {
      return Response.json({
        success: true,
        message: 'Aucun dossier récent — digest non généré',
        data: null,
      });
    }

    // Préparer le résumé des dossiers
    const dossiersResume = recentDossiers.slice(0, 20).map((d: any) => ({
      titre: d.titre_public || d.titre || 'Sans titre',
      type: d.type_action || 'signalement',
      statut: d.statut || 'nouveau',
      categorie: d.categorie || 'autre',
      priorite: d.priorite || 'normale',
      commune: d.commune || commune_nom || '',
    }));

    // Stats globales
    const stats = {
      total: recentDossiers.length,
      nouveaux: recentDossiers.filter((d: any) => d.statut === 'nouveau').length,
      en_cours: recentDossiers.filter((d: any) => d.statut === 'en_cours').length,
      resolus: recentDossiers.filter((d: any) => d.statut === 'resolu').length,
      signalements: recentDossiers.filter((d: any) => d.type_action === 'signaler').length,
      propositions: recentDossiers.filter((d: any) => d.type_action === 'proposer').length,
      offres_aide: recentDossiers.filter((d: any) => d.type_action === 'aider').length,
    };

    // Préparer le prompt pour l'IA
    const inputText = `Période: ${period_days} jours — Commune: ${commune_nom || commune_id || 'Territoire'}

Statistiques:
- Total dossiers: ${stats.total}
- Nouveaux: ${stats.nouveaux}
- En cours: ${stats.en_cours}
- Résolus: ${stats.resolus}
- Signalements: ${stats.signalements}, Propositions: ${stats.propositions}, Offres aide: ${stats.offres_aide}

Dossiers récents (max 20):
${dossiersResume.map((d: any, i: number) => `${i + 1}. [${d.type}/${d.statut}] ${d.titre}`).join('\n')}`;

    // Appel AI Router (L2 pour qualité digest)
    let digestData: any;
    try {
      const aiResponse = await base44.asServiceRole.functions.invoke('aiRouter', {
        mode: 'generate_digest',
        user_input: inputText,
        commune_id,
      });
      digestData = aiResponse.data || {};
    } catch {
      // Fallback manuel si IA indisponible
      digestData = {
        contenu_court: `Cette semaine, ${stats.total} dossiers citoyens traités sur votre territoire. ${stats.resolus} résolutions confirmées.`,
        top_1: stats.resolus > 0 ? `${stats.resolus} dossier(s) résolu(s) cette semaine` : `${stats.nouveaux} nouveau(x) signalement(s)`,
        top_2: stats.en_cours > 0 ? `${stats.en_cours} dossier(s) en cours de traitement` : 'Activité citoyenne maintenue',
        top_3: `${stats.propositions} proposition(s) citoyenne(s) reçue(s)`,
        chiffre_cle: `${stats.total} dossiers`,
        tendance: stats.resolus > stats.nouveaux ? 'hausse_resolutions' : 'activite_stable',
      };
    }

    // Sauvegarder le digest
    const digestRecord = await base44.asServiceRole.entities.DailyDigest.create({
      commune_id: commune_id || null,
      commune_nom: commune_nom || null,
      contenu_court: digestData.contenu_court || '',
      top_1: digestData.top_1 || '',
      top_2: digestData.top_2 || '',
      top_3: digestData.top_3 || '',
      chiffre_cle: digestData.chiffre_cle || `${stats.total} dossiers`,
      periode_debut: startIso,
      periode_fin: now.toISOString(),
      nb_dossiers: stats.total,
      nb_resolus: stats.resolus,
      generated_at: now.toISOString(),
      ai_generated: true,
    }).catch((e: any) => {
      console.error('[generateDigest] Save failed:', e.message);
      return null;
    });

    return Response.json({
      success: true,
      data: {
        digest: digestData,
        stats,
        commune_id,
        commune_nom,
        period_days,
        generated_at: now.toISOString(),
        saved_id: digestRecord?.id || null,
      },
    });

  } catch (err: any) {
    console.error(`[generateDigest] Error: ${err.message}`);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
});
