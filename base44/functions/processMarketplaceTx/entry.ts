/**
 * processMarketplaceTx — Gestion des transactions marketplace Stripe Connect
 * Opérations :
 *   create_checkout(listing_id, buyer_email) → URL Stripe Checkout
 *   confirm(payment_intent_id) → enregistre MarketplaceTransaction
 *   refund(transaction_id) → rembourse via Stripe
 *   stats(seller_user_id) → stats vendeur
 */
import { base44 } from "@base44/sdk";

export default async function handler(req: any) {
  const { operation = "create_checkout", listing_id, buyer_email, payment_intent_id, transaction_id, seller_user_id } = req.body ?? {};

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

  if (operation === "create_checkout") {
    if (!listing_id) return { success: false, error: "listing_id requis" };

    const listings = await base44.entities.MarketplaceListing.filter({ id: listing_id }).catch(() => []);
    const listing = listings[0];
    if (!listing) return { success: false, error: "Annonce introuvable" };
    if (listing.statut !== "actif") return { success: false, error: "Annonce non disponible" };
    if (!listing.prix || listing.prix <= 0) return { success: false, error: "Annonce gratuite — pas de paiement requis" };

    // Incrémenter les vues
    await base44.entities.MarketplaceListing.update(listing_id, { nb_vues: (listing.nb_vues ?? 0) + 1 }).catch(() => {});

    if (!STRIPE_SECRET) {
      return {
        success: false,
        degraded: true,
        error: "Stripe non configuré. Contactez le vendeur directement.",
        listing,
      };
    }

    const commissionRate = listing.commission_rate ?? 8;
    const montantCentimes = Math.round(listing.prix * 100);
    const commissionCentimes = Math.round(montantCentimes * commissionRate / 100);

    // Récupérer le compte Stripe Connect du vendeur
    let connectAccount: string | null = null;
    if (listing.stripe_connect_account) {
      connectAccount = listing.stripe_connect_account;
    } else {
      const connectAccounts = await base44.entities.StripeConnectAccount.filter({
        user_id: listing.user_id, charges_enabled: true
      }).catch(() => []);
      if (connectAccounts[0]) connectAccount = connectAccounts[0].stripe_account_id;
    }

    try {
      const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "payment_method_types[]": "card",
          "line_items[0][price_data][currency]": "eur",
          "line_items[0][price_data][unit_amount]": String(montantCentimes),
          "line_items[0][price_data][product_data][name]": listing.titre,
          "line_items[0][quantity]": "1",
          mode: "payment",
          success_url: `${process.env.APP_URL ?? "https://lapeveleaugmentee.fr"}/marketplace/listing/${listing_id}?payment=success`,
          cancel_url: `${process.env.APP_URL ?? "https://lapeveleaugmentee.fr"}/marketplace/listing/${listing_id}?payment=canceled`,
          customer_email: buyer_email ?? "",
          "payment_intent_data[application_fee_amount]": String(commissionCentimes),
          ...(connectAccount ? { "payment_intent_data[transfer_data][destination]": connectAccount } : {}),
          "metadata[listing_id]": listing_id,
          "metadata[seller_user_id]": listing.user_id,
          "metadata[type]": "marketplace",
        }).toString(),
      });

      const session = await resp.json();
      if (!resp.ok) throw new Error(session.error?.message ?? "Stripe error");

      return { success: true, checkout_url: session.url, session_id: session.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (operation === "confirm") {
    if (!payment_intent_id) return { success: false, error: "payment_intent_id requis" };
    // Créé normalement via stripeWebhook — ici pour confirmation manuelle
    const txs = await base44.entities.MarketplaceTransaction.filter({ stripe_payment_intent: payment_intent_id }).catch(() => []);
    if (txs[0]) return { success: true, transaction: txs[0], already_confirmed: true };
    return { success: false, error: "Transaction non trouvée — attendre le webhook Stripe" };
  }

  if (operation === "stats") {
    // IDOR fix: le seller_user_id fourni doit correspondre à l'utilisateur connecté
    // sauf si c'est un admin qui consulte les stats d'un tiers
    const authenticatedUid = req.user?.id;
    const isAdmin = req.user?.role === "admin";
    const requestedUid = seller_user_id ?? authenticatedUid;
    if (!requestedUid) return { success: false, error: "seller_user_id requis" };
    if (!authenticatedUid) return { success: false, error: "Authentification requise" };
    if (!isAdmin && requestedUid !== authenticatedUid) {
      return { success: false, error: "Accès refusé — vous ne pouvez consulter que vos propres statistiques" };
    }
    const uid = requestedUid;
    const txs = await base44.entities.MarketplaceTransaction.filter({ seller_user_id: uid }).catch(() => []);
    const totalCA = txs.reduce((s: number, t: any) => s + (t.montant_vendeur ?? 0), 0);
    const totalCommission = txs.reduce((s: number, t: any) => s + (t.commission_plateforme ?? 0), 0);
    return { success: true, data: { nb_transactions: txs.length, ca_vendeur: totalCA, commission_plateforme: totalCommission } };
  }

  return { success: false, error: "operation invalide (create_checkout|confirm|stats)" };
}
