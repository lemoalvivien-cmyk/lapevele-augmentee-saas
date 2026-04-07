import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ═══════════════════════════════════════════════════════════════════════════
// MANAGE SPONSOR SLOT — CRUD placements sponsors + validation + stats
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

    const { operation = 'list', ...params } = body;

    // ── Opérations publiques (lecture seule, pas d'auth requise) ──────
    const PUBLIC_OPS = ['list_active', 'track_click'];

    // ── Auth gate pour toutes les opérations d'écriture et stats admin ─
    if (!PUBLIC_OPS.includes(operation)) {
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
    }

    // ── Lister les placements actifs (public) ─────────────────────────
    if (operation === 'list_active') {
      const { commune, rubrique } = params;
      const filter: any = { statut: 'actif' };
      if (commune) filter.commune = commune;
      if (rubrique) filter.rubrique = rubrique;

      const placements = await base44.asServiceRole.entities.SponsorPlacement.filter(filter);

      // Filtrer par date
      const now = new Date();
      const valid = placements.filter((p: any) => {
        if (p.date_debut && new Date(p.date_debut) > now) return false;
        if (p.date_fin && new Date(p.date_fin) < now) return false;
        return true;
      });

      // Incrémenter les impressions (non-bloquant)
      for (const p of valid) {
        base44.asServiceRole.entities.SponsorPlacement.update(p.id, {
          impressions: (p.impressions || 0) + 1,
        }).catch(() => {});
      }

      return Response.json({ success: true, data: { placements: valid } });
    }

    // ── Créer un placement (admin) ─────────────────────────────────────
    if (operation === 'create') {
      const { commune, rubrique, titre, contenu, cta_label, cta_url, logo_url,
        date_debut, date_fin, sponsor_id, sponsor_nom } = params;

      if (!commune || !rubrique || !titre) {
        return Response.json({ success: false, error: 'commune, rubrique et titre requis' }, { status: 400 });
      }

      const placement = await base44.asServiceRole.entities.SponsorPlacement.create({
        sponsor_id: sponsor_id || null,
        sponsor_nom: sponsor_nom || null,
        commune,
        rubrique,
        titre,
        contenu: contenu || null,
        cta_label: cta_label || null,
        cta_url: cta_url || null,
        logo_url: logo_url || null,
        date_debut: date_debut || null,
        date_fin: date_fin || null,
        statut: 'en_attente',
        impressions: 0,
        clics: 0,
      });

      return Response.json({ success: true, placement_id: placement.id, statut: 'en_attente' });
    }

    // ── Valider un placement (admin → actif) ───────────────────────────
    if (operation === 'validate') {
      const { placement_id } = params;
      if (!placement_id) {
        return Response.json({ success: false, error: 'placement_id requis' }, { status: 400 });
      }

      await base44.asServiceRole.entities.SponsorPlacement.update(placement_id, {
        statut: 'actif',
      });

      return Response.json({ success: true, message: 'Placement activé' });
    }

    // ── Suspendre un placement ─────────────────────────────────────────
    if (operation === 'suspend') {
      const { placement_id } = params;
      if (!placement_id) {
        return Response.json({ success: false, error: 'placement_id requis' }, { status: 400 });
      }

      await base44.asServiceRole.entities.SponsorPlacement.update(placement_id, {
        statut: 'suspendu',
      });

      return Response.json({ success: true, message: 'Placement suspendu' });
    }

    // ── Enregistrer un clic ────────────────────────────────────────────
    if (operation === 'track_click') {
      const { placement_id } = params;
      if (!placement_id) {
        return Response.json({ success: false, error: 'placement_id requis' }, { status: 400 });
      }

      const placements = await base44.asServiceRole.entities.SponsorPlacement.filter({ id: placement_id });
      if (placements.length > 0) {
        await base44.asServiceRole.entities.SponsorPlacement.update(placement_id, {
          clics: (placements[0].clics || 0) + 1,
        }).catch(() => {});

        // Log IntentSignal
        base44.asServiceRole.entities.IntentSignal.create({
          intent: 'sponsor',
          confidence: 1.0,
          source: 'page_visit',
          commune: placements[0].commune,
          cta_clicked: true,
          timestamp: new Date().toISOString(),
          suggestion_shown: placements[0].titre,
        }).catch(() => {});
      }

      return Response.json({ success: true, message: 'Clic enregistré' });
    }

    // ── Stats d'un placement ───────────────────────────────────────────
    if (operation === 'stats') {
      const { commune, sponsor_id } = params;
      const filter: any = {};
      if (commune) filter.commune = commune;
      if (sponsor_id) filter.sponsor_id = sponsor_id;

      const placements = await base44.asServiceRole.entities.SponsorPlacement.filter(filter);
      const stats = {
        total_placements: placements.length,
        actifs: placements.filter((p: any) => p.statut === 'actif').length,
        en_attente: placements.filter((p: any) => p.statut === 'en_attente').length,
        total_impressions: placements.reduce((s: number, p: any) => s + (p.impressions || 0), 0),
        total_clics: placements.reduce((s: number, p: any) => s + (p.clics || 0), 0),
        ctr: 0,
        by_rubrique: {} as Record<string, number>,
      };

      if (stats.total_impressions > 0) {
        stats.ctr = Math.round((stats.total_clics / stats.total_impressions) * 10000) / 100;
      }

      for (const p of placements) {
        const r = p.rubrique || 'autre';
        stats.by_rubrique[r] = (stats.by_rubrique[r] || 0) + 1;
      }

      return Response.json({ success: true, data: { stats, placements } });
    }

    return Response.json({ success: false, error: `operation inconnue: ${operation}` }, { status: 400 });

  } catch (err: any) {
    console.error(`[manageSponsorSlot] Error: ${err.message}`);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
});
