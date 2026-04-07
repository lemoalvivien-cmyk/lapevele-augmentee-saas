import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ═══════════════════════════════════════════════════════════════════════════
// TRACK REVENUE — Logger un RevenueEvent + calculer MRR en temps réel
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

    const { operation = 'log', ...params } = body;

    // ── Log un nouvel événement de revenu ──────────────────────────────
    if (operation === 'log') {
      const { type, montant, produit, commune, source, stripe_ref, stripe_customer_id, metadata } = params;

      if (!type || montant === undefined || !source) {
        return Response.json({ success: false, error: 'type, montant et source requis' }, { status: 400 });
      }

      const event = await base44.asServiceRole.entities.RevenueEvent.create({
        type,
        montant: parseFloat(montant),
        produit: produit || null,
        commune: commune || null,
        source,
        stripe_ref: stripe_ref || null,
        stripe_customer_id: stripe_customer_id || null,
        timestamp: new Date().toISOString(),
        metadata: metadata ? JSON.stringify(metadata) : null,
      });

      return Response.json({ success: true, event_id: event.id, montant });
    }

    // ── Calculer le MRR actuel ─────────────────────────────────────────
    if (operation === 'get_mrr') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Revenus récurrents du mois en cours
      const events = await base44.asServiceRole.entities.RevenueEvent.filter({
        timestamp: { $gte: startOfMonth },
        type: { $in: ['subscription_created', 'subscription_renewed', 'sponsor_payment'] },
      });

      const mrr = events.reduce((sum: number, e: any) => sum + (e.montant || 0), 0);

      // Compter par flux
      const byFlux: Record<string, number> = {};
      for (const e of events) {
        const produit = e.produit || 'autre';
        byFlux[produit] = (byFlux[produit] || 0) + (e.montant || 0);
      }

      // MRR des 12 derniers mois
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString();
      const yearEvents = await base44.asServiceRole.entities.RevenueEvent.filter({
        timestamp: { $gte: yearAgo },
      });

      // Grouper par mois
      const byMonth: Record<string, number> = {};
      for (const e of yearEvents) {
        if (!e.timestamp) continue;
        const month = e.timestamp.substring(0, 7); // YYYY-MM
        if (e.type !== 'subscription_canceled') {
          byMonth[month] = (byMonth[month] || 0) + (e.montant || 0);
        }
      }

      // Abonnements actifs
      const activeSubs = await base44.asServiceRole.entities.SubscriptionSnapshot.filter({
        status: 'active',
      });

      return Response.json({
        success: true,
        data: {
          mrr_current_month: Math.round(mrr * 100) / 100,
          arr_estimate: Math.round(mrr * 12 * 100) / 100,
          by_flux: byFlux,
          by_month: byMonth,
          active_subscriptions: activeSubs.length,
          events_this_month: events.length,
        },
      });
    }

    // ── Historique des événements ──────────────────────────────────────
    if (operation === 'get_history') {
      const { limit = 50, type_filter } = params;
      const filter: any = {};
      if (type_filter) filter.type = type_filter;

      const events = await base44.asServiceRole.entities.RevenueEvent.filter(filter);
      const sorted = events
        .sort((a: any, b: any) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
        .slice(0, Math.min(parseInt(limit), 200));

      return Response.json({ success: true, data: { events: sorted, total: events.length } });
    }

    return Response.json({ success: false, error: `operation inconnue: ${operation}` }, { status: 400 });

  } catch (err: any) {
    console.error(`[trackRevenue] Error: ${err.message}`);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
});
