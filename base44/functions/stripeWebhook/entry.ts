import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE WEBHOOK — Gestion des événements de paiement (CDC V4 §5)
// Gère: checkout.session.completed, invoice.paid, customer.subscription.*
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

    const { type: eventType, data } = body;
    const obj = data?.object || {};

    console.log(`[stripeWebhook] Event: ${eventType}`);

    switch (eventType) {

      // ── Checkout complété (nouveau client / nouvelle sub) ──────────────
      case 'checkout.session.completed': {
        const session = obj;
        const metadata = session.metadata || {};
        const commune = metadata.commune || session.customer_details?.name || 'inconnu';
        const plan = metadata.plan || 'essentiel';
        const montant = (session.amount_total || 0) / 100;
        const email = session.customer_details?.email || metadata.email || '';

        // Créer RevenueEvent
        await base44.asServiceRole.entities.RevenueEvent.create({
          type: 'subscription_created',
          montant,
          produit: `mairie_${plan}`,
          commune,
          source: 'stripe_webhook',
          stripe_ref: session.subscription || session.id,
          stripe_customer_id: session.customer,
          timestamp: new Date().toISOString(),
          metadata: JSON.stringify({ session_id: session.id, email }),
        }).catch((e: any) => console.error('[stripeWebhook] RevenueEvent create failed:', e.message));

        // Créer/mettre à jour SubscriptionSnapshot
        await base44.asServiceRole.entities.SubscriptionSnapshot.create({
          commune_id: metadata.commune_id || commune,
          commune_nom: commune,
          plan_tier: plan as any,
          stripe_sub_id: session.subscription || '',
          stripe_customer_id: session.customer || '',
          status: 'active',
          started_at: new Date().toISOString(),
          contact_email: email,
          montant_mensuel: montant,
        }).catch((e: any) => console.error('[stripeWebhook] SubscriptionSnapshot create failed:', e.message));

        console.log(`[stripeWebhook] New subscription: commune=${commune}, plan=${plan}, montant=${montant}€`);
        break;
      }

      // ── Facture payée (renouvellement mensuel) ─────────────────────────
      case 'invoice.paid': {
        const invoice = obj;
        if (invoice.billing_reason === 'subscription_cycle') {
          const montant = (invoice.amount_paid || 0) / 100;
          const metadata = invoice.metadata || {};
          const commune = metadata.commune || 'inconnu';

          await base44.asServiceRole.entities.RevenueEvent.create({
            type: 'subscription_renewed',
            montant,
            produit: metadata.plan ? `mairie_${metadata.plan}` : 'mairie_essentiel',
            commune,
            source: 'stripe_webhook',
            stripe_ref: invoice.subscription || invoice.id,
            stripe_customer_id: invoice.customer,
            timestamp: new Date().toISOString(),
            metadata: JSON.stringify({ invoice_id: invoice.id }),
          }).catch(() => {});
        }
        break;
      }

      // ── Abonnement annulé ──────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = obj;
        const metadata = sub.metadata || {};
        const commune = metadata.commune || 'inconnu';

        await base44.asServiceRole.entities.RevenueEvent.create({
          type: 'subscription_canceled',
          montant: 0,
          produit: metadata.plan ? `mairie_${metadata.plan}` : 'mairie_essentiel',
          commune,
          source: 'stripe_webhook',
          stripe_ref: sub.id,
          stripe_customer_id: sub.customer,
          timestamp: new Date().toISOString(),
          metadata: JSON.stringify({ reason: sub.cancellation_details?.reason }),
        }).catch(() => {});

        // Mettre à jour le statut
        try {
          const snaps = await base44.asServiceRole.entities.SubscriptionSnapshot.filter({
            stripe_sub_id: sub.id,
          });
          if (snaps.length > 0) {
            await base44.asServiceRole.entities.SubscriptionSnapshot.update(snaps[0].id, {
              status: 'canceled',
              ends_at: new Date().toISOString(),
            });
          }
        } catch {}
        break;
      }

      // ── Paiement sponsor (payment_intent.succeeded avec metadata type=sponsor) ──
      case 'payment_intent.succeeded': {
        const pi = obj;
        const metadata = pi.metadata || {};
        if (metadata.type === 'sponsor') {
          const montant = (pi.amount || 0) / 100;
          await base44.asServiceRole.entities.RevenueEvent.create({
            type: 'sponsor_payment',
            montant,
            produit: `sponsor_${metadata.plan || 'basic'}`,
            commune: metadata.commune || 'inconnu',
            source: 'stripe_webhook',
            stripe_ref: pi.id,
            stripe_customer_id: pi.customer || '',
            timestamp: new Date().toISOString(),
            metadata: JSON.stringify({ sponsor_id: metadata.sponsor_id, rubrique: metadata.rubrique }),
          }).catch(() => {});
        }
        break;
      }

      default:
        console.log(`[stripeWebhook] Unhandled event type: ${eventType}`);
    }

    return Response.json({ success: true, received: true, event: eventType });

  } catch (err: any) {
    console.error(`[stripeWebhook] Error: ${err.message}`);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
});
