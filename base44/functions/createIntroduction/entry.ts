/**
 * createIntroduction — Crée une mise en relation B2B WIINUP
 * Vérifie que le need est actif, crée l'Introduction en PENDING,
 * notifie l'offreur par email, incrémente nb_introductions sur le BusinessNeed.
 */
import { base44 } from "@base44/sdk";

export default async function handler(req: any) {
  const { need_id, offer_id, offreur_user_id, message_init } = req.body ?? {};

  if (!need_id || !offreur_user_id) {
    return { success: false, error: "need_id et offreur_user_id requis" };
  }

  const demandeur_user_id = req.user?.id;
  if (!demandeur_user_id) {
    return { success: false, error: "Authentification requise" };
  }

  try {
    // 1. Vérifier le besoin
    const needs = await base44.entities.BusinessNeed.filter({ id: need_id });
    const need = needs[0];
    if (!need) return { success: false, error: "Besoin introuvable" };
    if (need.statut !== "actif") return { success: false, error: "Besoin non actif" };

    // 2. Éviter les doublons
    const existing = await base44.entities.Introduction.filter({
      need_id,
      demandeur_user_id,
      offreur_user_id,
    });
    if (existing.length > 0) {
      return { success: false, error: "Une introduction existe déjà entre ces parties pour ce besoin" };
    }

    // 3. Créer l'introduction
    const intro = await base44.entities.Introduction.create({
      need_id,
      offer_id: offer_id ?? null,
      demandeur_user_id,
      offreur_user_id,
      statut: "PENDING",
      message_init: message_init ?? "",
      nb_relances: 0,
      last_action_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    // 4. Incrémenter le compteur du besoin
    await base44.entities.BusinessNeed.update(need_id, {
      nb_introductions: (need.nb_introductions ?? 0) + 1,
    });

    // 5. Email de notification (best-effort)
    try {
      await base44.functions.invoke("sendLeadEmail", {
        to: offreur_user_id,
        subject: "📬 Nouvelle mise en relation B2B sur Pévèle",
        body: `Une entreprise locale souhaite vous contacter via WIINUP.\n\nBesoin : ${need.titre}\n\nMessage : ${message_init ?? "(aucun message)"}\n\nConnectez-vous sur lapeveleaugmentee.fr/b2b/introductions pour répondre.`,
        template: "intro_notification",
      });
    } catch {
      // Non-bloquant
    }

    return {
      success: true,
      introduction_id: intro.id,
      statut: "PENDING",
      message: "Introduction créée. L'offreur va être notifié.",
    };
  } catch (err: any) {
    console.error("[createIntroduction]", err);
    return { success: false, error: err?.message ?? "Erreur interne" };
  }
}
