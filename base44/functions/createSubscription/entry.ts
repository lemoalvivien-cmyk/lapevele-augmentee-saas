import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// ═══════════════════════════════════════════════════════════════════════════
// CREATE SUBSCRIPTION — Génère session Stripe Checkout pour Mairie+
// Plans: Essentiel 299€, Pro 599€, Territoire 999€
// ═══════════════════════════════════════════════════════════════════════════

const PLANS: Record<string, { nom: string; prix: number; stripe_price_env: string }> = {
  essentiel: { nom: 'Mairie+ Essentiel', prix: 299, stripe_price_env: 'STRIPE_PRICE_ESSENTIEL' },
  pro: { nom: 'Mairie+ Pro', prix: 599, stripe_price_env: 'STRIPE_PRICE_PRO' },
  territoire: { nom: 'Mairie+ Territoire', prix: 999, stripe_price_env: 'STRIPE_PRICE_TERRITOIRE' },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const { plan, commune, commune_id, email, nom_contact, success_url, cancel_url } = body;

    if (!plan || !PLANS[plan]) {
      return Response.json({
        success: false,
        error: `Plan invalide. Choisir: ${Object.keys(PLANS).join(', ')}`,
      }, { status: 400 });
    }

    if (!email) {
      return Response.json({ success: false, error: 'Email requis' }, { status: 400 });
    }

    const planConfig = PLANS[plan];

    // Récupérer la clé Stripe depuis les variables d'environnement
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      // Mode dégradé: créer le snapshot en pending sans Stripe
      await base44.asServiceRole.entities.SubscriptionSnapshot.create({
        commune_id: commune_id || commune || 'inconnu',
        commune_nom: commune || 'inconnu',
        plan_tier: plan as any,
        stripe_sub_id: '',
        stripe_customer_id: '',
        status: 'incomplete',
        started_at: new Date().toISOString(),
        contact_email: email,
        montant_mensuel: planConfig.prix,
      }).catch(() => {});

      return Response.json({
        success: false,
        error: 'Stripe non configuré — abonnement enregistré en attente',
        mode: 'degraded',
        plan: planConfig.nom,
        prix: planConfig.prix,
      }, { status: 503 });
    }

    // Récupérer le price_id Stripe
    const priceId = Deno.env.get(planConfig.stripe_price_env);
    if (!priceId) {
      return Response.json({
        success: false,
        error: `Price ID Stripe non configuré pour le plan ${plan}`,
      }, { status: 503 });
    }

    // Créer session Stripe Checkout
    const stripeParams = new URLSearchParams({
      'mode': 'subscription',
      'payment_method_types[]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'customer_email': email,
      'success_url': success_url || `${Deno.env.get('APP_BASE_URL') || 'https://lapeveleaugmentee.fr'}/mairie-plus?success=1`,
      'cancel_url': cancel_url || `${Deno.env.get('APP_BASE_URL') || 'https://lapeveleaugmentee.fr'}/mairie-plus?canceled=1`,
      'subscription_data[metadata][commune]': commune || '',
      'subscription_data[metadata][commune_id]': commune_id || '',
      'subscription_data[metadata][plan]': plan,
      'subscription_data[metadata][email]': email,
      'allow_promotion_codes': 'true',
      'billing_address_collection': 'required',
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeParams.toString(),
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.json();
      console.error('[createSubscription] Stripe error:', error);
      return Response.json({
        success: false,
        error: error.error?.message || 'Erreur Stripe lors de la création du checkout',
      }, { status: 400 });
    }

    const session = await stripeResponse.json();

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      plan: planConfig.nom,
      prix: planConfig.prix,
    });

  } catch (err: any) {
    console.error(`[createSubscription] Error: ${err.message}`);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
});
